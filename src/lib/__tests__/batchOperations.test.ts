import { describe, it, expect } from 'vitest'
import { diffActors, applyBatchActorOps, isNoOpActorEdit } from '../batchOperations'
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

  it('counts each file once even when the same actor appears multiple times in one file', () => {
    const data = {
      'a.nfo': makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Alice', role: 'Support' },
      ]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
    }

    const result = diffActors(data)

    expect(result[0]).toMatchObject({ fileCount: 2, totalFiles: 2 })
  })

  it('detects differing roles between files without intra-file duplicates', () => {
    const data = {
      'a.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Support' }]),
    }

    const result = diffActors(data)

    expect(result[0]).toMatchObject({ fileCount: 2, rolesDiffer: true })
  })

  it('detects differing roles across duplicate entries regardless of order within a file', () => {
    const leadFirst = diffActors({
      'a.nfo': makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Alice', role: 'Support' },
      ]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
    })
    const supportFirst = diffActors({
      'a.nfo': makeNfoData([
        { name: 'Alice', role: 'Support' },
        { name: 'Alice', role: 'Lead' },
      ]),
      'b.nfo': makeNfoData([{ name: 'Alice', role: 'Lead' }]),
    })

    expect(leadFirst[0].rolesDiffer).toBe(true)
    expect(supportFirst[0].rolesDiffer).toBe(true)
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

  it('normalizes order after removals before assigning adds', () => {
    const data = makeNfoData([
      { name: 'Alice', order: 0 },
      { name: 'Bob', order: 1 },
      { name: 'Charlie', order: 2 },
    ])
    const ops = { adds: [{ name: 'Dave' }], removals: ['Bob'], edits: {} }

    const { data: result } = applyBatchActorOps(data, ops)

    expect(result.actors.map(actor => actor.order)).toEqual([0, 1, 2])
    expect(result.actors.map(actor => actor.name)).toEqual(['Alice', 'Charlie', 'Dave'])
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
    const ops = { adds: [], removals: [], edits: { Alice: { name: 'Alicia' } } }

    const { data: result } = applyBatchActorOps(data, ops)

    expect(result.actors[0].role).toBe('Lead')
  })

  it('preserves each file role when edit omits role field', () => {
    const data = makeNfoData([{ name: 'Alice', role: 'Original Role' }])
    const ops = { adds: [], removals: [], edits: { Alice: { name: 'Alice' } } }

    const { data: result } = applyBatchActorOps(data, ops)

    expect(result.actors[0].role).toBe('Original Role')
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

  it('edits all duplicate actors with the same name in a single file', () => {
    const data = makeNfoData([
      { name: 'Alice', role: 'Lead' },
      { name: 'Bob', role: 'Support' },
      { name: 'Alice', role: 'Cameo' },
    ])
    const ops = { adds: [], removals: [], edits: { Alice: { name: 'Alicia', role: 'Star' } } }

    const { data: result } = applyBatchActorOps(data, ops)

    expect(result.actors).toHaveLength(3)
    expect(result.actors[0]).toMatchObject({ name: 'Alicia', role: 'Star' })
    expect(result.actors[1]).toMatchObject({ name: 'Bob', role: 'Support' })
    expect(result.actors[2]).toMatchObject({ name: 'Alicia', role: 'Star' })
  })

  it('edits all duplicate actors when only changing name', () => {
    const data = makeNfoData([
      { name: 'Alice', role: 'Lead' },
      { name: 'Alice', role: 'Support' },
    ])
    const ops = { adds: [], removals: [], edits: { Alice: { name: 'Alicia' } } }

    const { data: result } = applyBatchActorOps(data, ops)

    expect(result.actors).toHaveLength(2)
    expect(result.actors[0]).toMatchObject({ name: 'Alicia', role: 'Lead' })
    expect(result.actors[1]).toMatchObject({ name: 'Alicia', role: 'Support' })
  })

  describe('atomic rename conflict detection', () => {
    it('allows two-actor name swap (Bob -> Alice, Alice -> Carol) without conflicts', () => {
      const data = makeNfoData([
        { name: 'Bob', role: 'Lead' },
        { name: 'Alice', role: 'Support' },
      ])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Bob: { name: 'Alice' },
          Alice: { name: 'Carol' },
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toEqual([])
      expect(result.actors).toHaveLength(2)
      expect(result.actors[0]).toMatchObject({ name: 'Alice', role: 'Lead' })
      expect(result.actors[1]).toMatchObject({ name: 'Carol', role: 'Support' })
    })

    it('allows three-actor circular rename (A->B, B->C, C->A)', () => {
      const data = makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Bob', role: 'Support' },
        { name: 'Carol', role: 'Cameo' },
      ])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Alice: { name: 'Bob' },
          Bob: { name: 'Carol' },
          Carol: { name: 'Alice' },
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toEqual([])
      expect(result.actors).toHaveLength(3)
      expect(result.actors[0]).toMatchObject({ name: 'Bob', role: 'Lead' })
      expect(result.actors[1]).toMatchObject({ name: 'Carol', role: 'Support' })
      expect(result.actors[2]).toMatchObject({ name: 'Alice', role: 'Cameo' })
    })

    it('rejects rename to name that exists and is not being renamed away', () => {
      const data = makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Bob', role: 'Support' },
        { name: 'Carol', role: 'Cameo' },
      ])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Alice: { name: 'Carol' }, // Carol exists and is NOT being renamed
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toContain('Alice')
      expect(result.actors[0]).toMatchObject({ name: 'Alice', role: 'Lead' }) // unchanged
      expect(result.actors[1]).toMatchObject({ name: 'Bob', role: 'Support' })
      expect(result.actors[2]).toMatchObject({ name: 'Carol', role: 'Cameo' })
    })

    it('allows rename to name that will be removed in same batch', () => {
      const data = makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Bob', role: 'Support' },
      ])
      const ops = {
        adds: [],
        removals: ['Bob'],
        edits: {
          Alice: { name: 'Bob' }, // Bob will be removed, so this is OK
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toEqual([])
      expect(result.actors).toHaveLength(1)
      expect(result.actors[0]).toMatchObject({ name: 'Bob', role: 'Lead' })
    })

    it('rejects rename to same-name role-only edit target because it does not vacate the name', () => {
      const data = makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Bob', role: 'Support' },
      ])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Alice: { name: 'Bob' },
          Bob: { name: 'Bob', role: 'Featured' },
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toContain('Alice')
      expect(conflicts).not.toContain('Bob')
      expect(result.actors[0]).toMatchObject({ name: 'Alice', role: 'Lead' })
      expect(result.actors[1]).toMatchObject({ name: 'Bob', role: 'Featured' })
    })

    it('rejects multiple sources targeting same non-renamed destination', () => {
      const data = makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Bob', role: 'Support' },
        { name: 'Carol', role: 'Cameo' },
        { name: 'Dave', role: 'Extra' },
      ])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Alice: { name: 'Dave' }, // Dave exists and is not being renamed
          Bob: { name: 'Dave' },   // Same conflict
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toContain('Alice')
      expect(conflicts).toContain('Bob')
      expect(result.actors[0]).toMatchObject({ name: 'Alice', role: 'Lead' })
      expect(result.actors[1]).toMatchObject({ name: 'Bob', role: 'Support' })
      expect(result.actors[2]).toMatchObject({ name: 'Carol', role: 'Cameo' })
      expect(result.actors[3]).toMatchObject({ name: 'Dave', role: 'Extra' })
    })

    it('rejects many-to-one collision to brand-new name', () => {
      const data = makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Bob', role: 'Support' },
      ])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Alice: { name: 'Zoe' }, // Both trying to rename to Zoe (new name)
          Bob: { name: 'Zoe' },
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toContain('Alice')
      expect(conflicts).toContain('Bob')
      expect(result.actors[0]).toMatchObject({ name: 'Alice', role: 'Lead' })
      expect(result.actors[1]).toMatchObject({ name: 'Bob', role: 'Support' })
    })

    it('rejects many-to-one collision to name being renamed away', () => {
      const data = makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Bob', role: 'Support' },
        { name: 'Carol', role: 'Cameo' },
      ])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Alice: { name: 'Bob' },  // Multiple sources targeting Bob
          Carol: { name: 'Bob' },  // Bob is also being renamed to Dave
          Bob: { name: 'Dave' },   // This should not make Bob available as a target
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toContain('Alice')
      expect(conflicts).toContain('Carol')
      expect(result.actors[0]).toMatchObject({ name: 'Alice', role: 'Lead' })
      expect(result.actors[1]).toMatchObject({ name: 'Dave', role: 'Support' }) // Bob → Dave succeeds
      expect(result.actors[2]).toMatchObject({ name: 'Carol', role: 'Cameo' })
    })
  })

  describe('per-file collision detection', () => {
    it('allows disjoint sources from different files to rename to same destination', () => {
      // File A has only Alice, File B has only Bob
      // Batch ops include Alice → Zoe and Bob → Zoe
      // This should succeed per file because no single file has both Alice and Bob
      
      // Simulating File A: only Alice
      const dataFileA = makeNfoData([{ name: 'Alice', role: 'Lead' }])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Alice: { name: 'Zoe' },
          Bob: { name: 'Zoe' },  // Bob doesn't exist in this file
        },
      }

      const { data: resultA, conflicts: conflictsA } = applyBatchActorOps(dataFileA, ops)

      expect(conflictsA).toEqual([])
      expect(resultA.actors).toHaveLength(1)
      expect(resultA.actors[0]).toMatchObject({ name: 'Zoe', role: 'Lead' })

      // Simulating File B: only Bob
      const dataFileB = makeNfoData([{ name: 'Bob', role: 'Support' }])
      
      const { data: resultB, conflicts: conflictsB } = applyBatchActorOps(dataFileB, ops)

      expect(conflictsB).toEqual([])
      expect(resultB.actors).toHaveLength(1)
      expect(resultB.actors[0]).toMatchObject({ name: 'Zoe', role: 'Support' })
    })

    it('rejects same-file many-to-one collision even if other edits target same destination', () => {
      // File has both Alice and Bob
      // Both trying to rename to Zoe
      // Should fail because within THIS file, it's a many-to-one collision
      
      const data = makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Bob', role: 'Support' },
      ])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Alice: { name: 'Zoe' },
          Bob: { name: 'Zoe' },
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toContain('Alice')
      expect(conflicts).toContain('Bob')
      expect(result.actors[0]).toMatchObject({ name: 'Alice', role: 'Lead' })
      expect(result.actors[1]).toMatchObject({ name: 'Bob', role: 'Support' })
    })

    it('allows rename when only one source from batch ops exists in file', () => {
      // File has Alice, Carol, Dave
      // Batch ops include Alice → Zoe and Bob → Zoe
      // Since Bob doesn't exist in this file, only Alice → Zoe is relevant
      // Should succeed
      
      const data = makeNfoData([
        { name: 'Alice', role: 'Lead' },
        { name: 'Carol', role: 'Cameo' },
        { name: 'Dave', role: 'Extra' },
      ])
      const ops = {
        adds: [],
        removals: [],
        edits: {
          Alice: { name: 'Zoe' },
          Bob: { name: 'Zoe' },  // Bob doesn't exist in this file
        },
      }

      const { data: result, conflicts } = applyBatchActorOps(data, ops)

      expect(conflicts).toEqual([])
      expect(result.actors).toHaveLength(3)
      expect(result.actors[0]).toMatchObject({ name: 'Zoe', role: 'Lead' })
      expect(result.actors[1]).toMatchObject({ name: 'Carol', role: 'Cameo' })
      expect(result.actors[2]).toMatchObject({ name: 'Dave', role: 'Extra' })
    })
  })
})

describe('isNoOpActorEdit', () => {
  it('treats mixed-role normalize edits as changes even when the role matches the representative role', () => {
    expect(
      isNoOpActorEdit(
        { actor: { name: 'Alice', role: 'Lead' }, rolesDiffer: true, fileCount: 2, totalFiles: 2 },
        'Alice',
        { name: 'Alice', role: 'Lead' },
        'normalize',
      ),
    ).toBe(false)
  })
})
