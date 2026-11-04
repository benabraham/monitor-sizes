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

/**
 * Regression guard for the sticky visualization (PRD F11: the visualization is always on
 * screen). jsdom does not lay out CSS, so these tests read the stylesheets and check the
 * rules the layout depends on. The real check is the scrolled-page assertion in
 * tests/e2e/compare.spec.js, which runs in Chromium at both viewports.
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

describe('compare view layout', () => {
  it('makes the visual column a sticky panel on desktop, scrolling inside itself when tall', () => {
    const blocks = declarationsOf({ css: compareView, selector: '.compare-view__visual' })
    const sticky = blocks.find((body) => /position:\s*sticky/.test(body))

    expect(sticky).toBeDefined()
    expect(sticky).toMatch(/top:\s*var\(--compare-visual-sticky-top/)
    expect(sticky).toMatch(/overflow-y:\s*auto/)
  })

  it('flattens the visual wrappers on phones so the pinned drawing sticks for the whole view', () => {
    const [flatVisual] = declarationsOf({ css: compareView, selector: '.compare-view__visual' }).filter(
      (body) => /display:\s*contents/.test(body),
    )
    const [flatVisualBlock] = declarationsOf({ css: compareVisual, selector: '.compare-visual' }).filter(
      (body) => /display:\s*contents/.test(body),
    )
    const [stack] = declarationsOf({ css: compareView, selector: '.compare-view' }).filter((body) =>
      /flex-direction:\s*column/.test(body),
    )

    expect(flatVisual).toBeDefined()
    expect(flatVisualBlock).toBeDefined()
    expect(stack).toMatch(/display:\s*flex/)
  })

  it('keeps the pinned drawing sticky on phones', () => {
    const [pinned] = declarationsOf({ css: compareVisual, selector: '.compare-visual__pinned' })
    expect(pinned).toMatch(/position:\s*sticky/)
  })
})
