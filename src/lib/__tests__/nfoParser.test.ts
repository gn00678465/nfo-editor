import { describe, it, expect } from 'vitest'
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseNfo, serializeNfo, emptyNfoData, type NfoData } from '../nfoParser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const FIXTURE_PATH = join(__dirname, 'FC2-4615505.nfo')

function loadFixture(): string {
  return readFileSync(FIXTURE_PATH, 'utf-8')
}

// Mirror of the scanDir logic in electron/main.ts
function scanNfoFiles(folderPath: string): string[] {
  const nfoFiles: string[] = []

  function scanDir(dir: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          scanDir(fullPath)
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.nfo')) {
          nfoFiles.push(fullPath)
        }
      }
    } catch {
      // Skip dirs we can't read
    }
  }

  scanDir(folderPath)
  return nfoFiles
}

// ---------------------------------------------------------------------------
// 1. String Field Parsing
// ---------------------------------------------------------------------------

describe('parseNfo - basic string fields', () => {
  it('parses title from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.title).toBe('FC2-4615505 【F】スレンダー巨乳あやかちゃんによる初撮り初心者 ゆいちゃんの手コキ講習から講習後のアフタープレイに発展')
  })

  it('parses originaltitle from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.originaltitle).toBe('FC2-4615505 【F】スレンダー巨乳あやかちゃんによる初撮り初心者 ゆいちゃんの手コキ講習から講習後のアフタープレイに発展')
  })

  it('parses sorttitle from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.sorttitle).toBe('FC2-4615505 【F】スレンダー巨乳あやかちゃんによる初撮り初心者 ゆいちゃんの手コキ講習から講習後のアフタープレイに発展')
  })

  it('parses year from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.year).toBe('2025')
  })

  it('parses premiered from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.premiered).toBe('2025-01-27')
  })

  it('parses releasedate from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.releasedate).toBe('2025-01-27')
  })

  it('parses release from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.release).toBe('2025-01-27')
  })

  it('parses runtime from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.runtime).toBe('30')
  })

  it('parses mpaa from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.mpaa).toBe('NC-17')
  })

  it('parses customrating from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.customrating).toBe('NC-17')
  })

  it('parses tagline from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.tagline).toBe('发行日期 2025-01-27')
  })

  it('parses num from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.num).toBe('FC2-4615505')
  })

  it('parses javdbsearchid from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.javdbsearchid).toBe('FC2-4615505')
  })

  it('parses maker from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.maker).toBe('東京美女通信（ハメ撮り通信）')
  })

  it('parses publisher from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.publisher).toBe('東京美女通信（ハメ撮り通信）')
  })

  it('parses label from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.label).toBe('東京美女通信（ハメ撮り通信）')
  })

  it('parses series from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.series).toBe('FC2系列')
  })

  it('parses poster URL from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.poster).toBe('https://fc2ppvdb.com/storage/images/article/004/61/fc2ppv-4615505.jpg')
  })

  it('parses cover URL from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.cover).toBe('https://fc2ppvdb.com/storage/images/article/004/61/fc2ppv-4615505.jpg')
  })

  it('parses trailer URL from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.trailer).toBe('https://adult.contents.fc2.com/embed/4615505?i=TXpreE5ERTFNRFU9')
  })
})

// ---------------------------------------------------------------------------
// 2. CDATA Field Parsing
// ---------------------------------------------------------------------------

describe('parseNfo - CDATA fields', () => {
  it('extracts plot text from CDATA wrapper', () => {
    const data = parseNfo(loadFixture())
    expect(data.plot).toBeDefined()
    expect(data.plot).toContain('こちらは以前2本組で販売していた動画のファイナルリメイク版です')
  })

  it('plot contains HTML content (br tags) from CDATA', () => {
    const data = parseNfo(loadFixture())
    expect(data.plot).toContain('<br>')
  })

  it('extracts outline text from CDATA wrapper', () => {
    const data = parseNfo(loadFixture())
    expect(data.outline).toBeDefined()
    expect(data.outline).toContain('こちらは以前2本組で販売していた動画のファイナルリメイク版です')
  })

  it('extracts originalplot text from CDATA wrapper', () => {
    const data = parseNfo(loadFixture())
    expect(data.originalplot).toBeDefined()
    expect(data.originalplot).toContain('こちらは以前2本組で販売していた動画のファイナルリメイク版です')
  })

  it('parses plain text plot (no CDATA) correctly', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <plot>Simple plot text</plot>
</movie>`
    const data = parseNfo(xml)
    expect(data.plot).toBe('Simple plot text')
  })

  it('parses CDATA plot with special characters', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <plot><![CDATA[Plot with <b>bold</b> & "quotes" and 'apostrophes']]></plot>
</movie>`
    const data = parseNfo(xml)
    expect(data.plot).toBe('Plot with <b>bold</b> & "quotes" and \'apostrophes\'')
  })
})

// ---------------------------------------------------------------------------
// 3. Multi-value Fields
// ---------------------------------------------------------------------------

describe('parseNfo - multi-value fields', () => {
  it('parses 6 tags from sample NFO as array', () => {
    const data = parseNfo(loadFixture())
    expect(data.tags).toHaveLength(6)
    expect(data.tags).toContain('FC2')
    expect(data.tags).toContain('東京美女通信')
    expect(data.tags).toContain('有碼')
    expect(data.tags).toContain('系列: FC2系列')
    expect(data.tags).toContain('片商: 東京美女通信（ハメ撮り通信）')
    expect(data.tags).toContain('發行: 東京美女通信（ハメ撮り通信）')
  })

  it('parses 6 genres from sample NFO as array', () => {
    const data = parseNfo(loadFixture())
    expect(data.genres).toHaveLength(6)
    expect(data.genres).toContain('FC2')
    expect(data.genres).toContain('東京美女通信')
    expect(data.genres).toContain('有碼')
  })

  it('parses studio as array', () => {
    const data = parseNfo(loadFixture())
    expect(data.studios).toHaveLength(1)
    expect(data.studios[0]).toBe('東京美女通信（ハメ撮り通信）')
  })

  it('parses multiple studios as array', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <studio>Studio A</studio>
  <studio>Studio B</studio>
  <studio>Studio C</studio>
</movie>`
    const data = parseNfo(xml)
    expect(data.studios).toHaveLength(3)
    expect(data.studios).toContain('Studio A')
    expect(data.studios).toContain('Studio B')
    expect(data.studios).toContain('Studio C')
  })

  it('parses multiple directors as array', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <director>Director One</director>
  <director>Director Two</director>
</movie>`
    const data = parseNfo(xml)
    expect(data.directors).toHaveLength(2)
    expect(data.directors).toContain('Director One')
    expect(data.directors).toContain('Director Two')
  })

  it('parses multiple writers from writer and credits tags', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <writer>Writer A</writer>
  <credits>Writer B</credits>
</movie>`
    const data = parseNfo(xml)
    expect(data.writers).toHaveLength(2)
    expect(data.writers).toContain('Writer A')
    expect(data.writers).toContain('Writer B')
  })

  it('returns empty arrays when array fields are absent', () => {
    const data = parseNfo('<movie></movie>')
    expect(data.genres).toEqual([])
    expect(data.tags).toEqual([])
    expect(data.directors).toEqual([])
    expect(data.writers).toEqual([])
    expect(data.actors).toEqual([])
    expect(data.studios).toEqual([])
    expect(data.uniqueids).toEqual([])
    expect(data.ratings).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 4. Actor Parsing
// ---------------------------------------------------------------------------

describe('parseNfo - actor parsing', () => {
  it('parses actor name and type from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.actors).toHaveLength(1)
    expect(data.actors[0].name).toBe('黒髪清楚系スジパイパン')
    expect(data.actors[0].type).toBe('Actor')
  })

  it('parses actor with all fields', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <actor>
    <name>Jane Doe</name>
    <role>Lead</role>
    <type>Actor</type>
    <thumb>https://example.com/thumb.jpg</thumb>
    <order>1</order>
  </actor>
</movie>`
    const data = parseNfo(xml)
    expect(data.actors).toHaveLength(1)
    const actor = data.actors[0]
    expect(actor.name).toBe('Jane Doe')
    expect(actor.role).toBe('Lead')
    expect(actor.type).toBe('Actor')
    expect(actor.thumb).toBe('https://example.com/thumb.jpg')
    expect(actor.order).toBe(1)
  })

  it('parses multiple actors as array', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <actor><name>Actor One</name></actor>
  <actor><name>Actor Two</name></actor>
  <actor><name>Actor Three</name></actor>
</movie>`
    const data = parseNfo(xml)
    expect(data.actors).toHaveLength(3)
    expect(data.actors.map(a => a.name)).toEqual(['Actor One', 'Actor Two', 'Actor Three'])
  })

  it('filters out actors with empty names', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <actor><name>Valid Actor</name></actor>
  <actor><name></name></actor>
</movie>`
    const data = parseNfo(xml)
    expect(data.actors).toHaveLength(1)
    expect(data.actors[0].name).toBe('Valid Actor')
  })

  it('parses optional actor fields as undefined when absent', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <actor><name>Simple Actor</name></actor>
</movie>`
    const data = parseNfo(xml)
    const actor = data.actors[0]
    expect(actor.role).toBeUndefined()
    expect(actor.type).toBeUndefined()
    expect(actor.thumb).toBeUndefined()
    expect(actor.order).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 5. UniqueID Parsing
// ---------------------------------------------------------------------------

describe('parseNfo - uniqueid parsing', () => {
  it('parses uniqueid with type attribute', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <uniqueid type="imdb">tt1234567</uniqueid>
</movie>`
    const data = parseNfo(xml)
    expect(data.uniqueids).toHaveLength(1)
    expect(data.uniqueids[0].type).toBe('imdb')
    expect(data.uniqueids[0].value).toBe('tt1234567')
  })

  it('parses uniqueid with default="true" attribute', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <uniqueid type="tmdb" default="true">12345</uniqueid>
</movie>`
    const data = parseNfo(xml)
    expect(data.uniqueids[0].default).toBe(true)
  })

  it('parses uniqueid without default attribute as false', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <uniqueid type="imdb">tt1234567</uniqueid>
</movie>`
    const data = parseNfo(xml)
    expect(data.uniqueids[0].default).toBe(false)
  })

  it('parses multiple uniqueids', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <uniqueid type="imdb" default="true">tt1234567</uniqueid>
  <uniqueid type="tmdb">99999</uniqueid>
</movie>`
    const data = parseNfo(xml)
    expect(data.uniqueids).toHaveLength(2)
    expect(data.uniqueids[0].type).toBe('imdb')
    expect(data.uniqueids[1].type).toBe('tmdb')
  })

  it('filters out uniqueids with empty values', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <uniqueid type="imdb">tt1234567</uniqueid>
  <uniqueid type="empty"></uniqueid>
</movie>`
    const data = parseNfo(xml)
    expect(data.uniqueids).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 6. Ratings Block Parsing
// ---------------------------------------------------------------------------

describe('parseNfo - ratings block', () => {
  it('parses single rating with name, value, votes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <ratings>
    <rating name="imdb" default="true">
      <value>7.5</value>
      <votes>1234</votes>
    </rating>
  </ratings>
</movie>`
    const data = parseNfo(xml)
    expect(data.ratings).toHaveLength(1)
    const rating = data.ratings[0]
    expect(rating.name).toBe('imdb')
    expect(rating.value).toBe('7.5')
    expect(rating.votes).toBe('1234')
    expect(rating.default).toBe(true)
  })

  it('parses multiple ratings', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <ratings>
    <rating name="imdb"><value>7.5</value></rating>
    <rating name="tmdb"><value>8.0</value></rating>
  </ratings>
</movie>`
    const data = parseNfo(xml)
    expect(data.ratings).toHaveLength(2)
    expect(data.ratings[0].name).toBe('imdb')
    expect(data.ratings[1].name).toBe('tmdb')
  })

  it('returns empty ratings array when ratings block absent', () => {
    const data = parseNfo('<movie><title>Test</title></movie>')
    expect(data.ratings).toEqual([])
  })

  it('parses rating without votes as undefined', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <ratings>
    <rating name="imdb"><value>7.5</value></rating>
  </ratings>
</movie>`
    const data = parseNfo(xml)
    expect(data.ratings[0].votes).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 7. Set/Collection Parsing
// ---------------------------------------------------------------------------

describe('parseNfo - set/collection', () => {
  it('parses set with name from sample NFO', () => {
    const data = parseNfo(loadFixture())
    expect(data.set).toBeDefined()
    expect(data.set?.name).toBe('FC2系列')
  })

  it('parses set with name and overview', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <set>
    <name>My Collection</name>
    <overview>A great series</overview>
  </set>
</movie>`
    const data = parseNfo(xml)
    expect(data.set?.name).toBe('My Collection')
    expect(data.set?.overview).toBe('A great series')
  })

  it('returns undefined set when absent', () => {
    const data = parseNfo('<movie><title>Test</title></movie>')
    expect(data.set).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 8. Boolean Field Parsing
// ---------------------------------------------------------------------------

describe('parseNfo - boolean fields', () => {
  it('parses lockdata="true" as true', () => {
    const data = parseNfo('<movie><lockdata>true</lockdata></movie>')
    expect(data.lockdata).toBe(true)
  })

  it('parses lockdata="false" as false', () => {
    const data = parseNfo('<movie><lockdata>false</lockdata></movie>')
    expect(data.lockdata).toBe(false)
  })

  it('parses lockdata="1" as true', () => {
    const data = parseNfo('<movie><lockdata>1</lockdata></movie>')
    expect(data.lockdata).toBe(true)
  })

  it('returns undefined for absent boolean fields', () => {
    const data = parseNfo('<movie></movie>')
    expect(data.lockdata).toBeUndefined()
    expect(data.watched).toBeUndefined()
    expect(data.locktitle).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 9. Edge Cases
// ---------------------------------------------------------------------------

describe('parseNfo - edge cases', () => {
  it('parses minimal valid NFO (<movie></movie>)', () => {
    const data = parseNfo('<movie></movie>')
    expect(data.title).toBeUndefined()
    expect(data.genres).toEqual([])
    expect(data.tags).toEqual([])
    expect(data.actors).toEqual([])
  })

  it('parses minimal NFO with just XML declaration', () => {
    const data = parseNfo('<?xml version="1.0" encoding="UTF-8"?><movie></movie>')
    expect(data.title).toBeUndefined()
    expect(data.genres).toEqual([])
  })

  it('handles missing optional fields gracefully returning undefined', () => {
    const data = parseNfo('<movie><title>Only Title</title></movie>')
    expect(data.title).toBe('Only Title')
    expect(data.year).toBeUndefined()
    expect(data.plot).toBeUndefined()
    expect(data.fanart).toBeUndefined()
  })

  it('handles empty string fields by returning undefined', () => {
    const data = parseNfo('<movie><title></title></movie>')
    expect(data.title).toBeUndefined()
  })

  it('handles malformed XML gracefully (does not throw)', () => {
    expect(() => parseNfo('<movie><unclosed>')).not.toThrow()
  })

  it('handles completely empty string input gracefully', () => {
    expect(() => parseNfo('')).not.toThrow()
  })

  it('handles non-movie root element (returns empty data)', () => {
    const data = parseNfo('<tvshow><title>My Show</title></tvshow>')
    expect(data.title).toBeUndefined()
    expect(data.genres).toEqual([])
  })

  it('emptyNfoData returns default empty structure', () => {
    const data = emptyNfoData()
    expect(data.genres).toEqual([])
    expect(data.tags).toEqual([])
    expect(data.actors).toEqual([])
    expect(data.directors).toEqual([])
    expect(data.writers).toEqual([])
    expect(data.studios).toEqual([])
    expect(data.uniqueids).toEqual([])
    expect(data.ratings).toEqual([])
    expect(data.countries).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 10. Fanart Parsing
// ---------------------------------------------------------------------------

describe('parseNfo - fanart field', () => {
  it('parses fanart as string when plain string', () => {
    const xml = '<movie><fanart>https://example.com/fanart.jpg</fanart></movie>'
    const data = parseNfo(xml)
    expect(data.fanart).toBe('https://example.com/fanart.jpg')
  })

  it('parses fanart from nested thumb element', () => {
    const xml = `<movie>
  <fanart>
    <thumb>https://example.com/fanart.jpg</thumb>
  </fanart>
</movie>`
    const data = parseNfo(xml)
    expect(data.fanart).toBe('https://example.com/fanart.jpg')
  })

  it('returns undefined fanart when absent', () => {
    const data = parseNfo('<movie><title>Test</title></movie>')
    expect(data.fanart).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 11. Serialization
// ---------------------------------------------------------------------------

describe('serializeNfo - XML output structure', () => {
  it('outputs XML declaration with correct encoding', () => {
    const data = emptyNfoData()
    const xml = serializeNfo(data)
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"/)
  })

  it('wraps output in <movie> root element', () => {
    const data = emptyNfoData()
    const xml = serializeNfo(data)
    expect(xml).toContain('<movie>')
  })

  it('serializes plot in CDATA wrapper', () => {
    const data: NfoData = { ...emptyNfoData(), plot: 'My plot text' }
    const xml = serializeNfo(data)
    expect(xml).toContain('<![CDATA[My plot text]]>')
  })

  it('serializes outline in CDATA wrapper', () => {
    const data: NfoData = { ...emptyNfoData(), outline: 'My outline' }
    const xml = serializeNfo(data)
    expect(xml).toContain('<![CDATA[My outline]]>')
  })

  it('serializes multiple genres as separate <genre> elements', () => {
    const data: NfoData = { ...emptyNfoData(), genres: ['Action', 'Drama', 'Comedy'] }
    const xml = serializeNfo(data)
    const matches = xml.match(/<genre>/g)
    expect(matches).toHaveLength(3)
    expect(xml).toContain('<genre>Action</genre>')
    expect(xml).toContain('<genre>Drama</genre>')
    expect(xml).toContain('<genre>Comedy</genre>')
  })

  it('serializes multiple tags as separate <tag> elements (not comma-separated)', () => {
    const data: NfoData = { ...emptyNfoData(), tags: ['Tag1', 'Tag2', 'Tag3'] }
    const xml = serializeNfo(data)
    const matches = xml.match(/<tag>/g)
    expect(matches).toHaveLength(3)
    expect(xml).not.toContain('Tag1,Tag2')
  })

  it('serializes multiple actors as separate <actor> elements', () => {
    const data: NfoData = {
      ...emptyNfoData(),
      actors: [
        { name: 'Actor A', role: 'Hero' },
        { name: 'Actor B', role: 'Villain' },
      ],
    }
    const xml = serializeNfo(data)
    const matches = xml.match(/<actor>/g)
    expect(matches).toHaveLength(2)
    expect(xml).toContain('<name>Actor A</name>')
    expect(xml).toContain('<name>Actor B</name>')
  })

  it('serializes uniqueid with type and default attributes', () => {
    const data: NfoData = {
      ...emptyNfoData(),
      uniqueids: [{ type: 'imdb', value: 'tt1234567', default: true }],
    }
    const xml = serializeNfo(data)
    expect(xml).toContain('type="imdb"')
    expect(xml).toContain('tt1234567')
    expect(xml).toContain('default="true"')
  })

  it('omits undefined string fields from output', () => {
    const data: NfoData = { ...emptyNfoData(), title: undefined, year: undefined }
    const xml = serializeNfo(data)
    expect(xml).not.toContain('<title>')
    expect(xml).not.toContain('<year>')
  })

  it('serializes boolean lockdata as string "true"/"false"', () => {
    const data: NfoData = { ...emptyNfoData(), lockdata: true, watched: false }
    const xml = serializeNfo(data)
    expect(xml).toContain('<lockdata>true</lockdata>')
    expect(xml).toContain('<watched>false</watched>')
  })

  it('serializes fanart as nested thumb element', () => {
    const data: NfoData = { ...emptyNfoData(), fanart: 'https://example.com/bg.jpg' }
    const xml = serializeNfo(data)
    expect(xml).toContain('<fanart>')
    expect(xml).toContain('<thumb>https://example.com/bg.jpg</thumb>')
  })

  it('serializes ratings block with name and default attributes', () => {
    const data: NfoData = {
      ...emptyNfoData(),
      ratings: [{ name: 'imdb', value: '7.5', votes: '1000', default: true }],
    }
    const xml = serializeNfo(data)
    expect(xml).toContain('<ratings>')
    expect(xml).toContain('name="imdb"')
    expect(xml).toContain('<value>7.5</value>')
    expect(xml).toContain('<votes>1000</votes>')
  })

  it('serializes set as nested name element', () => {
    const data: NfoData = { ...emptyNfoData(), set: { name: 'My Collection', overview: 'A great series' } }
    const xml = serializeNfo(data)
    expect(xml).toContain('<set>')
    expect(xml).toContain('<name>My Collection</name>')
    expect(xml).toContain('<overview>A great series</overview>')
  })
})

// ---------------------------------------------------------------------------
// 12. Roundtrip Test
// ---------------------------------------------------------------------------

describe('parse → serialize → parse roundtrip', () => {
  it('preserves all string fields after full roundtrip on sample NFO', () => {
    const original = parseNfo(loadFixture())
    const serialized = serializeNfo(original)
    const reparsed = parseNfo(serialized)

    expect(reparsed.title).toBe(original.title)
    expect(reparsed.originaltitle).toBe(original.originaltitle)
    expect(reparsed.sorttitle).toBe(original.sorttitle)
    expect(reparsed.year).toBe(original.year)
    expect(reparsed.premiered).toBe(original.premiered)
    expect(reparsed.releasedate).toBe(original.releasedate)
    expect(reparsed.release).toBe(original.release)
    expect(reparsed.runtime).toBe(original.runtime)
    expect(reparsed.mpaa).toBe(original.mpaa)
    expect(reparsed.customrating).toBe(original.customrating)
    expect(reparsed.tagline).toBe(original.tagline)
    expect(reparsed.num).toBe(original.num)
    expect(reparsed.javdbsearchid).toBe(original.javdbsearchid)
    expect(reparsed.maker).toBe(original.maker)
    expect(reparsed.publisher).toBe(original.publisher)
    expect(reparsed.label).toBe(original.label)
    expect(reparsed.series).toBe(original.series)
    expect(reparsed.poster).toBe(original.poster)
    expect(reparsed.cover).toBe(original.cover)
    expect(reparsed.trailer).toBe(original.trailer)
  })

  it('preserves CDATA plot content after roundtrip', () => {
    const original = parseNfo(loadFixture())
    const serialized = serializeNfo(original)
    const reparsed = parseNfo(serialized)

    expect(reparsed.plot).toBe(original.plot)
    expect(reparsed.outline).toBe(original.outline)
    expect(reparsed.originalplot).toBe(original.originalplot)
  })

  it('serialized XML contains CDATA wrapper for plot', () => {
    const original = parseNfo(loadFixture())
    const serialized = serializeNfo(original)

    expect(serialized).toContain('<![CDATA[')
    expect(serialized).toContain('こちらは以前2本組で販売していた動画のファイナルリメイク版です')
  })

  it('preserves tags array after roundtrip', () => {
    const original = parseNfo(loadFixture())
    const serialized = serializeNfo(original)
    const reparsed = parseNfo(serialized)

    expect(reparsed.tags).toHaveLength(original.tags.length)
    for (const tag of original.tags) {
      expect(reparsed.tags).toContain(tag)
    }
  })

  it('preserves genres array after roundtrip', () => {
    const original = parseNfo(loadFixture())
    const serialized = serializeNfo(original)
    const reparsed = parseNfo(serialized)

    expect(reparsed.genres).toHaveLength(original.genres.length)
    for (const genre of original.genres) {
      expect(reparsed.genres).toContain(genre)
    }
  })

  it('preserves actors after roundtrip', () => {
    const original = parseNfo(loadFixture())
    const serialized = serializeNfo(original)
    const reparsed = parseNfo(serialized)

    expect(reparsed.actors).toHaveLength(original.actors.length)
    for (let i = 0; i < original.actors.length; i++) {
      expect(reparsed.actors[i].name).toBe(original.actors[i].name)
      expect(reparsed.actors[i].type).toBe(original.actors[i].type)
    }
  })

  it('preserves set after roundtrip', () => {
    const original = parseNfo(loadFixture())
    const serialized = serializeNfo(original)
    const reparsed = parseNfo(serialized)

    expect(reparsed.set?.name).toBe(original.set?.name)
  })

  it('roundtrip preserves uniqueids', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <uniqueid type="imdb" default="true">tt1234567</uniqueid>
  <uniqueid type="tmdb">99999</uniqueid>
</movie>`
    const original = parseNfo(xml)
    const serialized = serializeNfo(original)
    const reparsed = parseNfo(serialized)

    expect(reparsed.uniqueids).toHaveLength(2)
    expect(reparsed.uniqueids[0].type).toBe('imdb')
    expect(reparsed.uniqueids[0].value).toBe('tt1234567')
    expect(reparsed.uniqueids[0].default).toBe(true)
    expect(reparsed.uniqueids[1].type).toBe('tmdb')
    expect(reparsed.uniqueids[1].value).toBe('99999')
  })

  it('roundtrip preserves ratings block', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <ratings>
    <rating name="imdb" default="true">
      <value>7.5</value>
      <votes>1234</votes>
    </rating>
  </ratings>
</movie>`
    const original = parseNfo(xml)
    const serialized = serializeNfo(original)
    const reparsed = parseNfo(serialized)

    expect(reparsed.ratings).toHaveLength(1)
    expect(reparsed.ratings[0].name).toBe('imdb')
    expect(reparsed.ratings[0].value).toBe('7.5')
    expect(reparsed.ratings[0].votes).toBe('1234')
    expect(reparsed.ratings[0].default).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 13. NFO File Discovery (scanDir logic)
// ---------------------------------------------------------------------------

describe('NFO file discovery - scanDir logic', () => {
  const tmpDir = join(__dirname, 'tmp-scan-test')

  function setupTmpDir() {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
    mkdirSync(join(tmpDir, 'sub1'), { recursive: true })
    mkdirSync(join(tmpDir, 'sub2', 'deep'), { recursive: true })

    writeFileSync(join(tmpDir, 'movie1.nfo'), '<movie><title>Movie 1</title></movie>')
    writeFileSync(join(tmpDir, 'movie2.NFO'), '<movie><title>Movie 2</title></movie>')
    writeFileSync(join(tmpDir, 'readme.txt'), 'not an nfo file')
    writeFileSync(join(tmpDir, 'sub1', 'movie3.nfo'), '<movie><title>Movie 3</title></movie>')
    writeFileSync(join(tmpDir, 'sub2', 'deep', 'movie4.nfo'), '<movie><title>Movie 4</title></movie>')
    writeFileSync(join(tmpDir, 'sub2', 'image.jpg'), 'fake image')
  }

  function cleanupTmpDir() {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  }

  it('discovers all .nfo files recursively', () => {
    setupTmpDir()
    try {
      const nfoFiles = scanNfoFiles(tmpDir)
      expect(nfoFiles).toHaveLength(4)
    } finally {
      cleanupTmpDir()
    }
  })

  it('excludes non-NFO files from discovery', () => {
    setupTmpDir()
    try {
      const nfoFiles = scanNfoFiles(tmpDir)
      const nonNfo = nfoFiles.filter(f => !f.toLowerCase().endsWith('.nfo'))
      expect(nonNfo).toHaveLength(0)
    } finally {
      cleanupTmpDir()
    }
  })

  it('returns empty array for folder with no NFO files', () => {
    setupTmpDir()
    try {
      const emptyOnlyDir = join(tmpDir, 'empty-only')
      mkdirSync(emptyOnlyDir, { recursive: true })
      writeFileSync(join(emptyOnlyDir, 'notes.txt'), 'no nfo here')
      writeFileSync(join(emptyOnlyDir, 'image.png'), 'fake png')

      const nfoFiles = scanNfoFiles(emptyOnlyDir)
      expect(nfoFiles).toHaveLength(0)
    } finally {
      cleanupTmpDir()
    }
  })

  it('handles non-existent directory gracefully', () => {
    expect(() => scanNfoFiles('/nonexistent/path/that/does/not/exist')).not.toThrow()
    expect(scanNfoFiles('/nonexistent/path/that/does/not/exist')).toEqual([])
  })

  it('matches .nfo extension case-insensitively (includes .NFO files)', () => {
    setupTmpDir()
    try {
      const nfoFiles = scanNfoFiles(tmpDir)
      const upperCaseNfo = nfoFiles.some(f => f.includes('movie2.NFO'))
      expect(upperCaseNfo).toBe(true)
    } finally {
      cleanupTmpDir()
    }
  })
})
