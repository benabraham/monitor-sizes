import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { formatSeedJson, parseSnapshot } from '../../scripts/import-sheet.js'

/*
 * Validates the committed built-in seed (src/data/seed.json).
 *
 * The seed is the source of truth after the one-off sheet import (PRD: Data source and
 * maintenance), so contributors add and refine displays by hand. These tests therefore
 * check the rules every entry must follow, plus one historical guarantee: the 51 imported
 * rows keep their exact inputs (diagonal, width, height). Names and tags of the imported
 * rows may be refined, and new displays may be added.
 */

const HERE = dirname(fileURLToPath(import.meta.url))

const SEED_TEXT = readFileSync(join(HERE, 'seed.json'), 'utf8')
const seed = JSON.parse(SEED_TEXT)
const snapshot = JSON.parse(
  readFileSync(
    join(HERE, '..', '..', 'data', 'sheet-snapshot', 'monitory.values.json'),
    'utf8',
  ),
)

const FIELDS = ['diagonal', 'height', 'id', 'name', 'tag', 'width']
const TAGS = ['laptop', 'monitor', 'ultrawide']

/** Identity of a display's inputs. */
const inputKeyOf = ({ diagonal, width, height }) => `${diagonal}|${width}|${height}`

/** Pixels per inch, used only to check the sort order. */
const ppiOf = ({ width, height, diagonal }) => Math.hypot(width, height) / diagonal

describe('src/data/seed.json', () => {
  it('is an array with at least the 51 imported displays', () => {
    expect(Array.isArray(seed)).toBe(true)
    expect(seed.length).toBeGreaterThanOrEqual(51)
  })

  it('has exactly the input fields on every entry, and no derived metrics', () => {
    seed.forEach((display) => {
      expect(Object.keys(display).sort()).toEqual(FIELDS)
    })
  })

  it('has string ids and names, with names trimmed and non-empty', () => {
    seed.forEach((display) => {
      expect(typeof display.id).toBe('string')
      expect(display.id).toMatch(/^\d+(-\d+)?-\d+x\d+$/)
      expect(typeof display.name).toBe('string')
      expect(display.name).not.toBe('')
      expect(display.name).toBe(display.name.trim())
    })
  })

  it('has finite positive numbers for diagonal, width and height, with whole pixels', () => {
    seed.forEach((display) => {
      expect(Number.isFinite(display.diagonal)).toBe(true)
      expect(display.diagonal).toBeGreaterThan(0)
      expect(Number.isInteger(display.width)).toBe(true)
      expect(display.width).toBeGreaterThan(0)
      expect(Number.isInteger(display.height)).toBe(true)
      expect(display.height).toBeGreaterThan(0)
    })
  })

  it('has a tag from the laptop | monitor | ultrawide enum on every entry', () => {
    seed.forEach((display) => {
      expect(TAGS).toContain(display.tag)
    })
  })

  it('has unique ids', () => {
    const ids = seed.map((display) => display.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is sorted by PPI, highest first', () => {
    const ppis = seed.map(ppiOf)
    expect(ppis).toEqual([...ppis].sort((a, b) => b - a))
  })

  it('keeps the inputs of every imported sheet row, identical', () => {
    const seedKeys = new Set(seed.map(inputKeyOf))
    const missing = parseSnapshot(snapshot)
      .map(inputKeyOf)
      .filter((key) => !seedKeys.has(key))
    expect(missing).toEqual([])
  })

  it('is formatted the way the generator writes it (2-space JSON, trailing newline)', () => {
    expect(SEED_TEXT).toBe(formatSeedJson(seed))
  })
})
