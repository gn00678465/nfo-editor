import type { Actor, NfoData } from './nfoParser'

export const PRESERVE_ROLES_SENTINEL = '\u200B' // zero-width space

export interface BatchActorOps {
  adds: Actor[]
  removals: string[]
  edits: Record<string, { name: string; role?: string }>
}

export interface ActorDiff {
  actor: Actor
  rolesDiffer: boolean
  fileCount: number
  totalFiles: number
}

export function isNoOpActorEdit(
  diff: ActorDiff,
  originalName: string,
  editDraft: { name: string; role: string },
  roleMode: 'preserve' | 'normalize',
): boolean {
  const nameUnchanged = editDraft.name.trim() === originalName.trim()
  const preservingRoles = roleMode === 'preserve'
  const roleUnchanged = editDraft.role === (diff.actor.role ?? '')

  return nameUnchanged && (preservingRoles || (roleUnchanged && !diff.rolesDiffer))
}

export interface ApplyResult {
  filePath: string
  success: boolean
  conflicts: string[]
  error?: string
}

function cloneActor(actor: Actor): Actor {
  return { ...actor }
}

function cloneNfoData(data: NfoData): NfoData {
  return {
    ...data,
    set: data.set ? { ...data.set } : undefined,
    genres: [...data.genres],
    tags: [...data.tags],
    countries: [...data.countries],
    directors: [...data.directors],
    writers: [...data.writers],
    actors: data.actors.map(cloneActor),
    studios: [...data.studios],
    uniqueids: data.uniqueids.map(uniqueid => ({ ...uniqueid })),
    ratings: data.ratings.map(rating => ({ ...rating })),
  }
}

export function diffActors(loadedData: Record<string, NfoData>): ActorDiff[] {
  const filePaths = Object.keys(loadedData)
  const totalFiles = filePaths.length
  if (totalFiles === 0) return []

  const actorMap = new Map<string, {
    actor: Actor
    fileCount: number
    roles: Set<string>
  }>()

  for (const filePath of filePaths) {
    const perFileActors = new Map<string, {
      actor: Actor
      roles: Set<string>
    }>()

    for (const actor of loadedData[filePath].actors) {
      if (!actor.name) continue
      const existing = perFileActors.get(actor.name)
      if (!existing) {
        perFileActors.set(actor.name, {
          actor: cloneActor(actor),
          roles: new Set([actor.role ?? '']),
        })
      } else {
        existing.roles.add(actor.role ?? '')
      }
    }

    for (const [name, entry] of perFileActors) {
      const existing = actorMap.get(name)
      if (!existing) {
        actorMap.set(name, {
          actor: entry.actor,
          fileCount: 1,
          roles: new Set(entry.roles),
        })
        continue
      }

      existing.fileCount += 1
      for (const role of entry.roles) {
        existing.roles.add(role)
      }
    }
  }

  return [...actorMap.entries()]
    .map(([name, entry]) => ({
      actor: entry.actor,
      fileCount: entry.fileCount,
      totalFiles,
      rolesDiffer: entry.roles.size > 1,
      _name: name,
    }))
    .sort((a, b) => {
      const aAll = a.fileCount === totalFiles
      const bAll = b.fileCount === totalFiles
      if (aAll !== bAll) return aAll ? -1 : 1
      return a._name.localeCompare(b._name)
    })
    .map(({ actor, fileCount, totalFiles: total, rolesDiffer }) => ({
      actor,
      fileCount,
      totalFiles: total,
      rolesDiffer,
    }))
}

export function applyBatchActorOps(
  data: NfoData,
  ops: BatchActorOps,
): { data: NfoData; conflicts: string[] } {
  const next = cloneNfoData(data)
  const conflicts: string[] = []

  const removeSet = new Set(ops.removals)
  next.actors = next.actors.filter(actor => !removeSet.has(actor.name))
  next.actors = next.actors.map((actor, index) => ({
    ...actor,
    order: index,
  }))

  // Fixpoint-based rename conflict detection:
  // Work per file, after removals. Treat each distinct present actor name as a source group.
  
  // Get all distinct actor names present in the file after removals
  const presentActorNames = new Set(next.actors.map(a => a.name))
  
  // Split edits into name-preserving (same-name) and changed-name renames
  const changedNameRenames = new Map<string, string>() // source -> target
  const sameNameEdits = new Map<string, { name: string; role?: string }>() // source -> edit
  
  for (const actorName of presentActorNames) {
    const edit = ops.edits[actorName]
    if (!edit) continue
    
    const targetName = edit.name.trim()
    if (targetName === actorName) {
      // Same-name edit (role-only or no-op) - these never vacate names
      sameNameEdits.set(actorName, edit)
    } else {
      // Changed-name rename - these are candidates for acceptance
      changedNameRenames.set(actorName, targetName)
    }
  }
  
  // Fixpoint iteration: start by assuming all changed-name renames are accepted
  let acceptedRenames = new Set(changedNameRenames.keys())
  let changed = true
  
  while (changed) {
    changed = false
    
    // Compute final names under current accepted set
    const finalNames = new Map<string, string>() // source -> final name
    for (const sourceName of presentActorNames) {
      if (acceptedRenames.has(sourceName)) {
        // This source group uses its target name
        finalNames.set(sourceName, changedNameRenames.get(sourceName)!)
      } else {
        // This source group keeps its original name
        finalNames.set(sourceName, sourceName)
      }
    }
    
    // Check for duplicate final names
    const finalNameToSources = new Map<string, string[]>()
    for (const [source, finalName] of finalNames.entries()) {
      if (!finalNameToSources.has(finalName)) {
        finalNameToSources.set(finalName, [])
      }
      finalNameToSources.get(finalName)!.push(source)
    }
    
    // Find conflicting final names (produced by 2+ source groups)
    const conflictingFinalNames = new Set<string>()
    for (const [finalName, sources] of finalNameToSources.entries()) {
      if (sources.length > 1) {
        conflictingFinalNames.add(finalName)
      }
    }
    
    // Remove all accepted changed-name renames that target a conflicting final name
    for (const source of acceptedRenames) {
      const targetName = changedNameRenames.get(source)!
      if (conflictingFinalNames.has(targetName)) {
        acceptedRenames.delete(source)
        changed = true
      }
    }
  }
  
  // Report rejected renames as conflicts
  for (const [source, _target] of changedNameRenames.entries()) {
    if (!acceptedRenames.has(source)) {
      conflicts.push(source)
    }
  }
  
  // Build update map: accepted changed-name renames + same-name edits
  const actorUpdates = new Map<string, { name: string; role?: string }>()
  
  for (const source of acceptedRenames) {
    const targetName = changedNameRenames.get(source)!
    const originalEdit = ops.edits[source]
    actorUpdates.set(source, {
      name: targetName,
      ...(originalEdit.role !== undefined && { role: originalEdit.role }),
    })
  }
  
  for (const [source, edit] of sameNameEdits.entries()) {
    actorUpdates.set(source, edit)
  }
  
  // Apply all accepted edits atomically
  next.actors = next.actors.map(actor => {
    const update = actorUpdates.get(actor.name)
    if (!update) return actor
    
    return {
      ...actor,
      name: update.name.trim(),
      ...(update.role !== undefined && { role: update.role }),
    }
  })

  for (const add of ops.adds) {
    if (next.actors.some(actor => actor.name === add.name)) {
      conflicts.push(add.name)
      continue
    }

    next.actors = [
      ...next.actors,
      {
        ...add,
        order: next.actors.length,
      },
    ]
  }

  return { data: next, conflicts }
}
