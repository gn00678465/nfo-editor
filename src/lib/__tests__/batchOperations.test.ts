import { describe, it, expect } from 'vitest'
import { diffActors, applyBatchActorOps } from '../batchOperations'
import type { NfoData } from '../nfoParser'

function makeNfoData(actors: { name: string; role?: string; thumb?: string; order?: number; tmdbid?: string; type?: string; profile?: string }[]): NfoData {
  return {
    genres: [],
    tags: [],
    countries: [],
    directors: [],
    writers: [],
    actors: actors.map(actor => ({ ...actor })),
    studios: [],
    uniqueids: [],
    ratings: [],
  }
}

describe('diffActors', () => {
  it('returns empty array for empty selection', () => {
    expect(diffActors({})).toEqual([])
  })

  it('marks actor as in all files when present in every file', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
    }

    const result = diffActors(data)

    expect(result).toHaveLength(1)
    expect(result[0].actor.name).toBe('Alice')
    expect(result[0].fileCount).toBe(2)
    expect(result[0].totalFiles).toBe(2)
    expect(result[0].rolesDiffer).toBe(false)
  })

  it('marks actor as in some files when not in all files', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice' }]),
      'b.nfo': makeNfoData([{ name: 'Bob' }]),
    }

    const result = diffActors(data)

    expect(result).toHaveLength(2)
    const alice = result.find(item => item.actor.name === 'Alice')
    expect(alice).toMatchObject({ fileCount: 1, totalFiles: 2 })
  })

  it('sets rolesDiffer=true when same name has different roles across files', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Support' }]),
    }

    const result = diffActors(data)

    expect(result[0].rolesDiffer).toBe(true)
  })

  it('uses first-file data for display actor', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice', role: 'First', thumb: 'a.jpg', tmdbid: '1' }]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Second', thumb: 'b.jpg', tmdbid: '2' }]),
    }

    const result = diffActors(data)

    expect(result[0].actor).toMatchObject({ role: 'First', thumb: 'a.jpg', tmdbid: '1' })
  })

  it('sorts in-all-files actors first, then in-some-files', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice' }, { name: 'Bob' }]),
      'b.nfo': makeNfoData([{ name: 'Alice' }]),
    }

    const result = diffActors(data)

    expect(result[0].actor.name).toBe('Alice')
    expect(result[1].actor.name).toBe('Bob')
  })

  it('ignores duplicate actor entries within the same file when computing role differences', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }, { name: 'Alice', role: 'Support' }]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
    }

    const result = diffActors(data)

    expect(result[0].rolesDiffer).toBe(false)
  })
})

describe('applyBatchActorOps', () => {
  it('adds new actor and assigns order based on existing actor count', () => {
    const data = makeNfoData([{ name: 'Alice' }])
    const ops = { adds: [{ name: 'Bob', role: 'Support' }], removals: [], edits: {} }

    const { data: result, conflicts } = applyBatchActorOps(data, ops)

    expect(result.actors).toHaveLength(2)
    expect(result.actors[1]).toMatchObject({ name: 'Bob', role: 'Support', order: 1 })
    expect(conflicts).toEqual([])
  })

  it('assigns sequential order values for multiple adds', () => {
    const data = makeNfoData([{ name: 'Alice' }])
    const ops = { adds: [{ name: 'Bob' }, { name: 'Charlie' }], removals: [], edits: {} }

    const { data: result } = applyBatchActorOps(data, ops)

    expect(result.actors[1]).toMatchObject({ name: 'Bob', order: 1 })
    expect(result.actors[2]).toMatchObject({ name: 'Charlie', order: 2 })
  })

  it('skips duplicate add and reports conflict', () => {
    const data = makeNfoData([{ name: 'Alice' }])
    const ops = { adds: [{ name: 'Alice', role: 'Other' }], removals: [], edits: {} }

    const { data: result, conflicts } = applyBatchActorOps(data, ops)

    expect(result.actors).toHaveLength(1)
    expect(conflicts).toContain('Alice')
  })

  it('removes actor by name', () => {
    const data = makeNfoData([{ name: 'Alice' }, { name: 'Bob' }])
    const ops = { adds: [], removals: ['Bob'], edits: {} }

    const { data: result } = applyBatchActorOps(data, ops)

    expect(result.actors).toHaveLength(1)
    expect(result.actors[0].name).toBe('Alice')
  })

  it('skips missing removal with no conflict', () => {
    const data = makeNfoData([{ name: 'Alice' }])
    const ops = { adds: [], removals: ['Bob'], edits: {} }

    const { data: result, conflicts } = applyBatchActorOps(data, ops)

    expect(result.actors).toHaveLength(1)
    expect(conflicts).toEqual([])
  })

  it('edits actor name and role while preserving other fields', () => {
    const data = makeNfoData([{ name: 'Alice', role: 'Lead', thumb: 'http://img', order: 0, tmdbid: '123', profile: 'profile' }])
    const ops = { adds: [], removals: [], edits: { Alice: { name: 'Alicia', role: 'Star' } } }

    const { data: result } = applyBatchActorOps(data, ops)

    expect(result.actors[0]).toMatchObject({
      name: 'Alicia',
      role: 'Star',
      thumb: 'http://img',
      order: 0,
      tmdbid: '123',
      profile: 'profile',
    })
  })

  it('keeps existing role when edit omits role', () => {
    const data = makeNfoData([{ name: 'Alice', role: 'Lead' }])
    const ops = { adds: [], removals: [], edits: { Alice: { name: 'Alicia' } as { name: string; role?: string } } }

    const { data: result } = applyBatchActorOps(data, ops)

    expect(result.actors[0].role).toBe('Lead')
  })

  it('allows remove and re-add of the same name in one batch', () => {
    const data = makeNfoData([{ name: 'Alice' }])
    const ops = { adds: [{ name: 'Alice', role: 'New' }], removals: ['Alice'], edits: {} }

    const { data: result, conflicts } = applyBatchActorOps(data, ops)

    expect(result.actors).toHaveLength(1)
    expect(result.actors[0]).toMatchObject({ name: 'Alice', role: 'New', order: 0 })
    expect(conflicts).toEqual([])
  })

  it('reports conflict when edit target name already exists', () => {
    const data = makeNfoData([{ name: 'Alice' }, { name: 'Alicia' }])
    const ops = { adds: [], removals: [], edits: { Alice: { name: 'Alicia', role: 'Star' } } }

    const { data: result, conflicts } = applyBatchActorOps(data, ops)

    expect(result.actors[0].name).toBe('Alice')
    expect(conflicts).toContain('Alice')
  })

  it('does not mutate the input NfoData', () => {
    const data = makeNfoData([{ name: 'Alice', role: 'Lead', thumb: 'img' }])
    const original = JSON.stringify(data)
    const ops = { adds: [{ name: 'Bob' }], removals: [], edits: {} }

    applyBatchActorOps(data, ops)

    expect(JSON.stringify(data)).toBe(original)
  })
})
