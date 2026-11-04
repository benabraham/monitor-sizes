import { expect, test } from '@playwright/test'

const APP_PATH = '/monitor-sizes/'
const APP_TITLE = 'Pixely a monitory'

/**
 * Resolves the manifest URL from the page's <link rel="manifest"> and fetches it.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ url: string, manifest: Record<string, unknown> }>}
 */
const fetchManifest = async (page) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const url = new URL(href, page.url()).href
  const response = await page.request.get(url)
  return { url, manifest: await response.json() }
}

/**
 * Reports whether the page is controlled by a service worker. Waits for the
 * registration first, so the answer is not racing the install.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
const hasServiceWorkerController = (page) =>
  page.evaluate(async () => {
    await navigator.serviceWorker.ready
    return navigator.serviceWorker.controller !== null
  })

/**
 * Makes sure the service worker controls the page. A first visit installs the worker
 * without claiming the open page, so one reload hands control over.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
const ensureServiceWorkerController = async (page) => {
  if (await hasServiceWorkerController(page)) {
    return
  }
  await page.reload()
  await expect.poll(() => hasServiceWorkerController(page)).toBe(true)
}

test.describe('web app manifest', () => {
  test('describes an installable standalone app under the base path', async ({
    page,
  }) => {
    await page.goto(APP_PATH)
    const { manifest } = await fetchManifest(page)

    expect(manifest.name).toBe(APP_TITLE)
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe(APP_PATH)
    expect(manifest.scope).toBe(APP_PATH)
  })

  test('lists a maskable 512 icon and serves every icon as PNG', async ({
    page,
    request,
  }) => {
    await page.goto(APP_PATH)
    const { url, manifest } = await fetchManifest(page)
    const icons = manifest.icons ?? []

    const maskable512 = icons.find(
      ({ sizes, purpose = '' }) =>
        sizes === '512x512' && purpose.split(' ').includes('maskable'),
    )
    expect(maskable512).toBeDefined()

    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) {
      const iconUrl = new URL(icon.src, url).href
      const response = await request.get(iconUrl)
      expect(response.status(), iconUrl).toBe(200)
      expect(response.headers()['content-type'], iconUrl).toContain('image/png')
    }
  })
})

test.describe('service worker', () => {
  test('registers with a scope under the base path', async ({ page }) => {
    await page.goto(APP_PATH)

    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      return registration.scope
    })

    expect(new URL(scope).pathname).toBe(APP_PATH)
  })
})

test.describe('offline', () => {
  test('reloads the app shell with no network', async ({ page, context }) => {
    await page.goto(APP_PATH)
    await ensureServiceWorkerController(page)

    await context.setOffline(true)
    await page.reload()

    await expect(page).toHaveTitle(APP_TITLE)
    await expect(page.locator('#app')).not.toBeEmpty()
  })
})
