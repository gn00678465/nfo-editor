import type { Actor, NfoData } from './nfoParser'

export interface BatchActorOps {
  adds: Actor[]
  removals: string[]
  edits: Record<string, Pick<Actor, 'name' | 'role'>>
}

export interface ActorDiff {
  actor: Actor
  rolesDiffer: boolean
  fileCount: number
  totalFiles: number
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
    const seenInFile = new Set<string>()
    for (const actor of loadedData[filePath].actors) {
      if (!actor.name) continue
      const existing = actorMap.get(actor.name)
      if (!existing) {
        actorMap.set(actor.name, {
          actor: cloneActor(actor),
          fileCount: 1,
          roles: new Set([actor.role ?? '']),
        })
        seenInFile.add(actor.name)
        continue
      }

      if (!seenInFile.has(actor.name)) {
        existing.fileCount += 1
        existing.roles.add(actor.role ?? '')
        seenInFile.add(actor.name)
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

  for (const [originalName, update] of Object.entries(ops.edits)) {
    const index = next.actors.findIndex(actor => actor.name === originalName)
    if (index === -1) continue

    const targetName = update.name
    const nameTaken = targetName !== originalName && next.actors.some(actor => actor.name === targetName)
    if (nameTaken) {
      conflicts.push(originalName)
      continue
    }

    const current = next.actors[index]
    next.actors[index] = {
      ...current,
      name: targetName,
      role: update.role ?? current.role,
    }
  }

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
