// Structural validation of the generated artifacts against the public
// DSH Community Market v1 contracts (catalog-source.schema.json and
// catalog-provider-page.schema.json, vendored in ../schemas with attribution).
// Usage: node scripts/validate.mjs
//
// Which files it reads: the committed `deploy/` mirrors first — that is the
// payload that actually ships, and a fresh clone has no repository-root copies
// (both root paths are gitignored). The root copies are used only as a fallback
// for the historical "build to the root, then validate" flow.

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('..', import.meta.url))
/** @type {string[]} */
const failures = []
/** @param {boolean} ok @param {string} message */
const check = (ok, message) => { if (!ok) failures.push(message) }

/** @param {string} value */
const stripBom = (value) => value.replace(/^\uFEFF/, '')

/** @param {string} deployRelative @param {string} rootRelative */
const resolveArtifact = (deployRelative, rootRelative) => {
  if (existsSync(`${base}/${deployRelative}`)) return { path: `${base}/${deployRelative}`, face: deployRelative }
  if (existsSync(`${base}/${rootRelative}`)) return { path: `${base}/${rootRelative}`, face: `${rootRelative} (repo root fallback)` }
  throw new Error(`missing artifact: neither ${deployRelative} nor ${rootRelative} exists in ${base}`)
}

const manifestFile = resolveArtifact('deploy/catalog-source.json', 'catalog-source.json')
const pageFile = resolveArtifact('deploy/artifacts/v1/plugins.json', 'artifacts/v1/plugins.json')
const manifest = JSON.parse(stripBom(await readFile(manifestFile.path, 'utf8')))
const page = JSON.parse(stripBom(await readFile(pageFile.path, 'utf8')))
const displayFile = resolveArtifact('deploy/artifacts/v1/display.json', 'artifacts/v1/display.json')
const display = JSON.parse(stripBom(await readFile(displayFile.path, 'utf8')))

// The public 1.0.0 item schema is additionalProperties:false. Any extra key here
// makes the runtime reject the whole page (verified with Ajv strict against the
// upstream schema), so this is a hard gate rather than a mirror-rule warning.
const ALLOWED_ITEM_FIELDS = new Set([
  'id', 'name', 'displayName', 'summary', 'description', 'homepage', 'latestVersion',
  'license', 'categories', 'keywords', 'repository', 'installSource', 'package',
  'publisher', 'media', 'capabilities', 'compatibility', 'updatedAt',
])

// catalog-source.schema.json mirrors
check(manifest.manifestVersion === '1.0.0', 'manifestVersion must be 1.0.0')
check(/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(manifest.providerId), 'providerId pattern')
check(typeof manifest.name === 'string' && manifest.name.length >= 1 && manifest.name.length <= 120, 'manifest name bounds')
check(typeof manifest.attribution?.name === 'string' && /^https:\/\//.test(manifest.attribution.url), 'attribution required')
check(manifest.transport?.kind === 'https-json', 'transport kind')
check(manifest.transport?.method === 'GET', 'transport method GET')
check(/^https:\/\/(?![^/?#]*@)(?![^/?#]*:)[^/?#\s]+(?:[^/?#\s]*)?\/v1\/plugins$/.test(manifest.transport?.endpoint ?? ''), 'endpoint must be https and end /v1/plugins')
check(Array.isArray(manifest.query?.supported), 'query.supported array')
check(manifest.query.defaultLimit >= 1 && manifest.query.defaultLimit <= 200, 'defaultLimit bounds')
check(manifest.query.maxLimit >= 1 && manifest.query.maxLimit <= 200, 'maxLimit bounds')
check(manifest.query.defaultLimit <= manifest.query.maxLimit, 'defaultLimit <= maxLimit')
check(Array.isArray(manifest.query.sorts), 'query.sorts array')

// catalog-provider-page.schema.json mirrors
check(page.schemaVersion === '1.0.0', 'schemaVersion must be 1.0.0')
check(Array.isArray(page.items) && page.items.length <= 200, 'items array <= 200')
const ids = new Set()
for (const item of page.items) {
  check(/^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$/.test(item.id), `id pattern: ${item.id}`)
  check(!ids.has(item.id), `duplicate id: ${item.id}`)
  ids.add(item.id)
  check(typeof item.name === 'string' && item.name.length >= 1 && item.name.length <= 160, `name bounds: ${item.id}`)
  check(typeof item.displayName === 'string' && item.displayName.length >= 1 && item.displayName.length <= 120, `displayName bounds: ${item.id}`)
  check(typeof item.summary === 'string' && item.summary.length >= 1 && item.summary.length <= 1000, `summary bounds: ${item.id}`)
  for (const key of Object.keys(item)) check(ALLOWED_ITEM_FIELDS.has(key), `field outside the 1.0.0 item schema: ${key} on ${item.id}`)
  // Chinese lives in schema-valid fields now: displayName is bilingual and the
  // summary carries the Chinese line. A Latin-only display name would regress the
  // Chinese reader, so require at least one CJK ideograph here.
  check(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u.test(item.displayName ?? ''), `displayName has no CJK character: ${item.id}`)
  check(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u.test(item.summary ?? ''), `summary has no CJK character: ${item.id}`)
  check(!/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/.test(item.name + item.displayName + item.summary), `control characters: ${item.id}`)
  check(!/#/.test(item.homepage ?? ''), `homepage must not carry a fragment: ${item.id}`)
  check(item.repository !== undefined || item.package !== undefined, `repository or package identity: ${item.id}`)
  if (item.package) {
    check(item.package.registry === 'npm', `package registry: ${item.id}`)
    check(/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(item.package.name), `package name pattern: ${item.id}`)
  }
  if (item.repository) check(/^https:\/\/(?![^/?#]*@)(?![^/?#]*:)/.test(item.repository.url), `repository url: ${item.id}`)
  if (item.media?.icon) {
    check(typeof item.media.icon.url === 'string' && /^https:\/\/[^/?#]+\/icons\/[A-Za-z0-9][A-Za-z0-9._-]*\.png$/.test(item.media.icon.url), `icon url shape: ${item.id}`)
    check(item.media.icon.alt === undefined || (typeof item.media.icon.alt === 'string' && item.media.icon.alt.length >= 1 && item.media.icon.alt.length <= 120), `icon alt bounds: ${item.id}`)
    const endpointHost = new URL(manifest.transport.endpoint).host
    check(new URL(item.media.icon.url).host === endpointHost, `icon same-origin as endpoint: ${item.id}`)
  }
  const joined = JSON.stringify(item)
  check(!/dsh\s+plugin\s+--profile|pnpm\s+(add|install)|npm\s+(i|install)/.test(joined), `no install commands: ${item.id}`)
}
check(page.page !== undefined, 'page field required')
if (page.page !== undefined) {
  check(Number.isInteger(page.page.total) && page.page.total >= 0, 'page.total must be a non-negative integer')
  // Self-consistency lock: the page must never advertise a total its own items
  // contradict. This repo shipped exactly that drift once (README/manifest said
  // 44 while the page carried 43), so the two numbers are held together here.
  check(
    page.page.total === page.items.length,
    `page.total (${page.page.total}) must equal items.length (${page.items.length})`,
  )
}

if (failures.length) {
  console.error(`FAIL ${failures.length} checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(
  `validate ok: manifest (${manifestFile.face}) + ${page.items.length} strict provider items (${pageFile.face}) + ${display.items.length} display rows (${displayFile.face})`,
)
