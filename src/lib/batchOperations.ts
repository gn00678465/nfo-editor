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
  const nameUnchanged = editDraft.name.trim() === originalName
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

  // Build atomic view: what names exist after removals but before edits
  const existingNames = new Set(next.actors.map(a => a.name))
  
  // Build mapping of source -> target for all edits
  const editSources = new Set(Object.keys(ops.edits))
  
  // Count how many sources target each destination name
  const targetCounts = new Map<string, string[]>()
  for (const [originalName, update] of Object.entries(ops.edits)) {
    const targetName = update.name
    if (targetName === originalName) continue // Skip self-renames
    
    if (!targetCounts.has(targetName)) {
      targetCounts.set(targetName, [])
    }
    targetCounts.get(targetName)!.push(originalName)
  }
  
  // Detect conflicts: an edit conflicts if:
  // 1. Its target name exists and is NOT being renamed away (would collide with existing)
  // 2. Multiple sources target the same destination (many-to-one collision)
  const conflictingEdits = new Set<string>()
  
  // Check for collisions with existing names
  for (const [originalName, update] of Object.entries(ops.edits)) {
    const targetName = update.name
    if (targetName === originalName) continue
    
    if (existingNames.has(targetName) && !editSources.has(targetName)) {
      conflictingEdits.add(originalName)
    }
  }
  
  // Check for many-to-one collisions
  for (const [targetName, sources] of targetCounts.entries()) {
    if (sources.length > 1) {
      // Multiple sources trying to rename to the same target
      for (const source of sources) {
        conflictingEdits.add(source)
      }
    }
  }
  
  // Build a map of original actor identity -> new name/role for atomic application
  // We track actors by their original identity (name at start) to avoid cascading renames
  const actorUpdates = new Map<string, { name: string; role?: string }>()
  for (const [originalName, update] of Object.entries(ops.edits)) {
    if (!conflictingEdits.has(originalName)) {
      actorUpdates.set(originalName, update)
    } else {
      conflicts.push(originalName)
    }
  }
  
  // Apply all non-conflicting edits atomically
  // Each actor is updated based on its original name, preventing cascading renames
  next.actors = next.actors.map(actor => {
    const update = actorUpdates.get(actor.name)
    if (!update) return actor
    
    return {
      ...actor,
      name: update.name,
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
