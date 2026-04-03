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

  // Build final-mapping-based conflict detection:
  // After removals, determine distinct source actor-name groups present in this file.
  // For each source group, compute its final target name.
  // If two or more distinct source groups map to the same final name → conflict.
  
  // Get all distinct actor names present in the file after removals
  const presentActorNames = new Set(next.actors.map(a => a.name))
  
  // Build source-group → final-name mapping
  // A source group is a distinct actor name currently in the file
  const sourceGroupToFinalName = new Map<string, string>()
  
  for (const actorName of presentActorNames) {
    // Check if there's an edit for this source group
    const edit = ops.edits[actorName]
    if (edit && edit.name.trim() !== actorName) {
      // This source group will be renamed to edit.name
      sourceGroupToFinalName.set(actorName, edit.name.trim())
    } else {
      // No edit or self-rename → final name is the original name
      sourceGroupToFinalName.set(actorName, actorName)
    }
  }
  
  // Validate the final mapping: check if any final name appears more than once
  const finalNameToSourceGroups = new Map<string, string[]>()
  for (const [sourceGroup, finalName] of sourceGroupToFinalName.entries()) {
    if (!finalNameToSourceGroups.has(finalName)) {
      finalNameToSourceGroups.set(finalName, [])
    }
    finalNameToSourceGroups.get(finalName)!.push(sourceGroup)
  }
  
  // Detect conflicts: any final name with multiple source groups is a conflict
  const conflictingEdits = new Set<string>()
  for (const [finalName, sourceGroups] of finalNameToSourceGroups.entries()) {
    if (sourceGroups.length > 1) {
      // Multiple source groups map to the same final name → conflict
      // Mark all source groups that have edits (non-identity mappings) as conflicting
      for (const sourceGroup of sourceGroups) {
        if (sourceGroupToFinalName.get(sourceGroup) !== sourceGroup) {
          conflictingEdits.add(sourceGroup)
        }
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
