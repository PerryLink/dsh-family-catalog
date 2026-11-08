// Cursor pagination for the 1.0.0 provider page.
//
// The runtime scans with limit=100 and rejects a page whose items exceed the
// effective limit, so a 126-item catalog must be served as 100 + 26 with an
// opaque nextCursor. This module is runtime-neutral and is copied into deploy/
// by scripts/build-catalog.mjs (the workers and the Pages Function import it).

/**
 * @param {any} page full provider page ({schemaVersion, generatedAt, revision, items, page})
 * @param {URL} url request URL carrying optional `limit` and `cursor`
 * @returns {{ page?: any, error?: string }}
 */
export function sliceCatalogPage(page, url) {
  const total = page.items.length
  const rawLimit = Number(url.searchParams.get('limit') ?? '100')
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.trunc(rawLimit), 100)) : 100
  const rawCursor = url.searchParams.get('cursor')
  const offset = rawCursor === null || rawCursor === '' ? 0 : Number(rawCursor)
  if (!Number.isInteger(offset) || offset < 0 || offset > total) return { error: 'invalid cursor' }
  const items = page.items.slice(offset, offset + limit)
  const next = offset + limit < total ? String(offset + limit) : undefined
  return {
    page: {
      schemaVersion: page.schemaVersion,
      ...(page.generatedAt === undefined ? {} : { generatedAt: page.generatedAt }),
      ...(page.revision === undefined ? {} : { revision: page.revision }),
      items,
      page: { total, ...(next === undefined ? {} : { nextCursor: next }) },
    },
  }
}
