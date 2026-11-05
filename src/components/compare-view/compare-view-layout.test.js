import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Reads a stylesheet next to this file. Vitest does not expose CSS as text, so the test
 * reads the file itself.
 *
 * @param {string} relativePath Path relative to this file.
 * @returns {string}
 */
const readCss = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

const compareView = readCss('./compare-view.css')
const compareVisual = readCss('../compare-visual/compare-visual.css')
const appCss = readCss('../../app.css')

/**
 * Regression guard for the layout of Compare. jsdom does not lay out CSS, so these tests read
 * the stylesheets and check the rules the layout depends on. The real checks are the
 * scrolled-page and bounding-box assertions in tests/e2e/compare.spec.js, which run in
 * Chromium at both viewports.
 */

/**
 * Every declaration block written for a selector, in file order. A selector can appear in
 * more than one media query, so all of them are returned.
 *
 * @param {object} params
 * @param {string} params.css Stylesheet text.
 * @param {string} params.selector Selector, written exactly as in the file.
 * @returns {string[]} Declaration text for each block, without the braces.
 *
 * @example
 * declarationsOf({ css: '.a { top: 0 }', selector: '.a' }) // ['top: 0 ']
 */
const declarationsOf = ({ css, selector }) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))].map(
    ([, body]) => body,
  )
}

/**
 * The stylesheet text inside a media query, found by its condition.
 *
 * @param {object} params
 * @param {string} params.css Stylesheet text.
 * @param {string} params.condition Media condition, for example `min-width: 900px`.
 * @returns {string} The text of the rules inside the query, or '' when there is none.
 */
const mediaBlockOf = ({ css, condition }) => {
  const start = css.indexOf(`@media (${condition})`)
  if (start === -1) return ''
  const open = css.indexOf('{', start)
  let depth = 0
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') depth -= 1
    if (depth === 0) return css.slice(open + 1, index)
  }
  return ''
}

describe('compare view layout: preview', () => {
  it('makes the preview sticky under the app header, on the surface background', () => {
    const [preview] = declarationsOf({
      css: compareVisual,
      selector: '.compare-visual__preview',
    })
    expect(preview).toMatch(/position:\s*sticky/)
    expect(preview).toMatch(/top:\s*var\(--compare-visual-sticky-top/)
    expect(preview).toMatch(/background-color:\s*var\(--color-surface\)/)
  })

  it('caps the preview (mode switch and drawing together) at 60 % of the viewport height', () => {
    const [preview] = declarationsOf({
      css: compareVisual,
      selector: '.compare-visual__preview',
    })
    expect(preview).toMatch(/max-block-size:\s*60dvh/)
  })

  it('keeps the drawing inside that cap, and centred', () => {
    const [drawing] = declarationsOf({
      css: compareVisual,
      selector: '.compare-visual__preview .visualization__svg',
    })
    expect(drawing).toMatch(/max-block-size:\s*calc\(60dvh - var\(--compare-preview-chrome\)\)/)
    expect(drawing).toMatch(/inline-size:\s*min\(\s*100%/)
    expect(drawing).toMatch(/margin-inline:\s*auto/)
  })

  it('takes its drawing ratio from the frame, so the cap does not distort the drawing', () => {
    const [drawing] = declarationsOf({
      css: compareVisual,
      selector: '.compare-visual__preview .visualization__svg',
    })
    expect(drawing).toMatch(/var\(--ratio-w\)\s*\/\s*var\(--ratio-h\)/)
    const visualCss = readCss('../compare-visual/visualization.css')
    expect(visualCss).toMatch(/aspect-ratio:\s*var\(--ratio-w\)\s*\/\s*var\(--ratio-h\)/)
  })
})

describe('compare view layout: structure', () => {
  it('is a flex column, so the sticky preview is held by the whole view', () => {
    const [stack] = declarationsOf({ css: compareView, selector: '.compare-view' })
    expect(stack).toMatch(/display:\s*flex/)
    expect(stack).toMatch(/flex-direction:\s*column/)
  })

  it('places controls and membership side by side from 900 px, stacked below', () => {
    const [body] = declarationsOf({ css: compareView, selector: '.compare-view__body' })
    expect(body).toMatch(/display:\s*grid/)
    const wide = mediaBlockOf({ css: compareView, condition: 'min-width: 900px' })
    expect(wide).toMatch(/\.compare-view__body\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)/)
  })

  it('no longer has the old two-column sticky-left block', () => {
    expect(compareView).not.toMatch(/\.compare-view__visual\b/)
    expect(compareView).not.toMatch(/\.compare-visual__pinned/)
    expect(compareVisual).not.toMatch(/\.compare-visual__pinned/)
    expect(compareVisual).not.toMatch(/display:\s*contents/)
  })
})

describe('layout width', () => {
  it('does not cap the app main column, so the layout uses the full window width', () => {
    const [main] = declarationsOf({ css: appCss, selector: '.app-main' })
    expect(main).not.toMatch(/max-inline-size/)
    expect(main).not.toMatch(/max-width/)
  })

  it('does not cap the Compare view or its columns', () => {
    expect(compareView).not.toMatch(/max-inline-size:\s*\d+rem/)
    expect(compareView).not.toMatch(/max-width:\s*\d+/)
  })
})
