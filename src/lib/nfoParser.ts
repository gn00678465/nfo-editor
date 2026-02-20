import { XMLParser, XMLBuilder } from 'fast-xml-parser'

export interface Actor {
  name: string
  role?: string
  type?: string
  thumb?: string
  profile?: string
  tmdbid?: string
  order?: number
}

export interface UniqueId {
  type: string
  value: string
  default?: boolean
}

export interface RatingEntry {
  name: string
  value: string
  votes?: string
  default?: boolean
}

export interface MovieSet {
  name: string
  overview?: string
}

export interface NfoData {
  // Core Info
  title?: string
  originaltitle?: string
  sorttitle?: string
  year?: string
  premiered?: string
  releasedate?: string
  release?: string
  runtime?: string
  mpaa?: string
  tagline?: string

  // Plot
  plot?: string
  outline?: string
  originalplot?: string

  // Classification
  genres: string[]
  tags: string[]
  countries: string[]

  // Credits
  directors: string[]
  writers: string[]
  actors: Actor[]

  // Production
  studios: string[]
  maker?: string
  publisher?: string
  label?: string

  // Collection / Series
  set?: MovieSet
  series?: string

  // Identifiers
  num?: string
  javdbsearchid?: string
  uniqueids: UniqueId[]

  // Media
  poster?: string
  cover?: string
  fanart?: string
  thumb?: string
  trailer?: string

  // Advanced
  lockdata?: boolean
  locktitle?: boolean
  watched?: boolean
  playcount?: string
  dateadded?: string
  lastplayed?: string
  userrating?: string
  criticrating?: string
  customrating?: string
  ratings: RatingEntry[]
}

const KNOWN_ARRAY_FIELDS = new Set([
  'tag', 'genre', 'actor', 'uniqueid', 'director', 'writer', 'credits', 'studio',
])

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  isArray: (tagName: string) => KNOWN_ARRAY_FIELDS.has(tagName),
}

function getString(val: unknown): string | undefined {
  if (val === undefined || val === null || val === '') return undefined
  if (typeof val === 'object' && val !== null && '__cdata' in (val as Record<string, unknown>)) {
    return String((val as Record<string, unknown>).__cdata)
  }
  return String(val)
}

function getBool(val: unknown): boolean | undefined {
  if (val === undefined || val === null || val === '') return undefined
  const s = String(val).toLowerCase()
  return s === 'true' || s === '1'
}

function toStringArray(arr: unknown[]): string[] {
  return arr
    .map(v => getString(v))
    .filter((v): v is string => v !== undefined && v.trim() !== '')
}

export function parseNfo(xmlContent: string): NfoData {
  const parser = new XMLParser(parserOptions)
  const parsed = parser.parse(xmlContent)
  const movie = parsed.movie || {}

  const g = (k: string) => getString(movie[k])

  // Parse actors
  const actors: Actor[] = ((movie.actor || []) as Record<string, unknown>[]).map(a => ({
    name: a.name ? String(a.name) : '',
    role: a.role ? String(a.role) : undefined,
    type: a.type ? String(a.type) : undefined,
    thumb: a.thumb ? String(a.thumb) : undefined,
    profile: a.profile ? String(a.profile) : undefined,
    tmdbid: a.tmdbid ? String(a.tmdbid) : undefined,
    order: a.order !== undefined ? Number(a.order) : undefined,
  })).filter(a => a.name.trim() !== '')

  // Parse uniqueids
  const uniqueids: UniqueId[] = ((movie.uniqueid || []) as Record<string, unknown>[]).map(u => ({
    type: u['@_type'] ? String(u['@_type']) : 'custom',
    value: u['#text'] ? String(u['#text']) : (u.__cdata ? String(u.__cdata) : ''),
    default: u['@_default'] === 'true' || u['@_default'] === true,
  })).filter(u => u.value !== '')

  // Parse ratings block
  const ratings: RatingEntry[] = []
  if (movie.ratings) {
    const ratingsList = Array.isArray(movie.ratings.rating)
      ? movie.ratings.rating
      : movie.ratings.rating ? [movie.ratings.rating] : []
    for (const r of ratingsList as Record<string, unknown>[]) {
      ratings.push({
        name: r['@_name'] ? String(r['@_name']) : '',
        value: r.value ? String(r.value) : '',
        votes: r.votes ? String(r.votes) : undefined,
        default: r['@_default'] === 'true' || r['@_default'] === true,
      })
    }
  }

  // Parse set
  let set: MovieSet | undefined
  if (movie.set) {
    if (typeof movie.set === 'object') {
      set = {
        name: movie.set.name ? String(movie.set.name) : '',
        overview: movie.set.overview ? String(movie.set.overview) : undefined,
      }
    } else {
      set = { name: String(movie.set) }
    }
  }

  // Parse country
  const countriesRaw = movie.country
    ? (Array.isArray(movie.country) ? movie.country : [movie.country])
    : []

  // Parse directors/writers
  const directorsRaw = [
    ...(movie.director || []) as unknown[],
  ]
  const writersRaw = [
    ...(movie.writer || []) as unknown[],
    ...(movie.credits || []) as unknown[],
  ]

  // Parse studios — could be single string or array
  const studiosRaw = Array.isArray(movie.studio) ? movie.studio : (movie.studio ? [movie.studio] : [])

  // Fanart extraction
  let fanart: string | undefined
  if (movie.fanart) {
    if (typeof movie.fanart === 'string') {
      fanart = movie.fanart
    } else if (typeof movie.fanart === 'object') {
      const ft = (movie.fanart as Record<string, unknown>).thumb
      if (ft) {
        fanart = typeof ft === 'object' ? getString(ft) : String(ft)
      }
    }
  }

  return {
    title: g('title'),
    originaltitle: g('originaltitle'),
    sorttitle: g('sorttitle'),
    year: g('year'),
    premiered: g('premiered'),
    releasedate: g('releasedate'),
    release: g('release'),
    runtime: g('runtime'),
    mpaa: g('mpaa'),
    tagline: g('tagline'),
    plot: g('plot'),
    outline: g('outline'),
    originalplot: g('originalplot'),
    genres: toStringArray(movie.genre || []),
    tags: toStringArray(movie.tag || []),
    countries: toStringArray(countriesRaw),
    directors: toStringArray(directorsRaw),
    writers: toStringArray(writersRaw),
    actors,
    studios: toStringArray(studiosRaw),
    maker: g('maker'),
    publisher: g('publisher'),
    label: g('label'),
    set,
    series: g('series'),
    num: g('num'),
    javdbsearchid: g('javdbsearchid'),
    uniqueids,
    poster: g('poster'),
    cover: g('cover'),
    fanart,
    thumb: g('thumb'),
    trailer: g('trailer'),
    lockdata: getBool(movie.lockdata),
    locktitle: getBool(movie.locktitle),
    watched: getBool(movie.watched),
    playcount: g('playcount'),
    dateadded: g('dateadded'),
    lastplayed: g('lastplayed'),
    userrating: g('userrating'),
    criticrating: g('criticrating'),
    customrating: g('customrating'),
    ratings,
  }
}

function cdata(val: string): Record<string, unknown> {
  return { __cdata: val }
}

function setIfDef(obj: Record<string, unknown>, key: string, val: string | undefined) {
  if (val !== undefined && val !== '') obj[key] = val
}

export function serializeNfo(data: NfoData): string {
  const movie: Record<string, unknown> = {}

  // CDATA fields
  if (data.plot) movie.plot = cdata(data.plot)
  if (data.outline) movie.outline = cdata(data.outline)
  if (data.originalplot) movie.originalplot = cdata(data.originalplot)

  setIfDef(movie, 'tagline', data.tagline)
  setIfDef(movie, 'premiered', data.premiered)
  setIfDef(movie, 'releasedate', data.releasedate)
  setIfDef(movie, 'release', data.release)
  setIfDef(movie, 'num', data.num)
  setIfDef(movie, 'title', data.title)
  setIfDef(movie, 'originaltitle', data.originaltitle)
  setIfDef(movie, 'sorttitle', data.sorttitle)
  setIfDef(movie, 'mpaa', data.mpaa)
  setIfDef(movie, 'customrating', data.customrating)

  // Actors
  if (data.actors.length > 0) {
    movie.actor = data.actors.map(a => {
      const obj: Record<string, unknown> = { name: a.name }
      if (a.role) obj.role = a.role
      if (a.type) obj.type = a.type
      if (a.order !== undefined) obj.order = a.order
      if (a.thumb) obj.thumb = a.thumb
      if (a.profile) obj.profile = a.profile
      if (a.tmdbid) obj.tmdbid = a.tmdbid
      return obj
    })
  }

  setIfDef(movie, 'year', data.year)
  setIfDef(movie, 'runtime', data.runtime)

  // Set
  if (data.set?.name) {
    const setObj: Record<string, unknown> = { name: data.set.name }
    if (data.set.overview) setObj.overview = data.set.overview
    movie.set = setObj
  }

  setIfDef(movie, 'series', data.series)

  // Studios
  if (data.studios.length > 0) movie.studio = data.studios
  setIfDef(movie, 'maker', data.maker)
  setIfDef(movie, 'publisher', data.publisher)
  setIfDef(movie, 'label', data.label)

  // Tags
  if (data.tags.length > 0) movie.tag = data.tags

  // Genres
  if (data.genres.length > 0) movie.genre = data.genres

  // Countries
  if (data.countries.length > 0) movie.country = data.countries

  // Directors
  if (data.directors.length > 0) movie.director = data.directors

  // Writers
  if (data.writers.length > 0) movie.writer = data.writers

  // UniqueIds
  if (data.uniqueids.length > 0) {
    movie.uniqueid = data.uniqueids.map(u => ({
      '@_type': u.type,
      '@_default': u.default ? 'true' : undefined,
      '#text': u.value,
    }))
  }

  setIfDef(movie, 'poster', data.poster)
  setIfDef(movie, 'cover', data.cover)
  setIfDef(movie, 'trailer', data.trailer)
  if (data.thumb) setIfDef(movie, 'thumb', data.thumb)

  if (data.fanart) {
    movie.fanart = { thumb: data.fanart }
  }

  setIfDef(movie, 'javdbsearchid', data.javdbsearchid)

  // Advanced
  if (data.lockdata !== undefined) movie.lockdata = data.lockdata ? 'true' : 'false'
  if (data.locktitle !== undefined) movie.locktitle = data.locktitle ? 'true' : 'false'
  if (data.watched !== undefined) movie.watched = data.watched ? 'true' : 'false'
  setIfDef(movie, 'playcount', data.playcount)
  setIfDef(movie, 'dateadded', data.dateadded)
  setIfDef(movie, 'lastplayed', data.lastplayed)
  setIfDef(movie, 'userrating', data.userrating)
  setIfDef(movie, 'criticrating', data.criticrating)

  // Ratings block
  if (data.ratings.length > 0) {
    movie.ratings = {
      rating: data.ratings.map(r => ({
        '@_name': r.name,
        '@_default': r.default ? 'true' : undefined,
        value: r.value,
        votes: r.votes,
      })),
    }
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '__cdata',
    format: true,
    indentBy: '  ',
    suppressBooleanAttributes: false,
  })

  const xml = builder.build({ movie })
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`
}

export function emptyNfoData(): NfoData {
  return {
    genres: [],
    tags: [],
    countries: [],
    directors: [],
    writers: [],
    actors: [],
    studios: [],
    uniqueids: [],
    ratings: [],
  }
}
