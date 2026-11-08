// Validate the P2 sidecars against the catalog source. Read-only.
//
// Usage: node scripts/check-facets.mjs
// Exit 1 on any drift; prints the maintenance/maturity distribution so a status
// change cannot land silently.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('..', import.meta.url))
/** @param {string} value */
const stripBom = (value) => value.replace(/^\uFEFF/, '')
/** @param {string} relative */
const readJson = async (relative) => JSON.parse(stripBom(await readFile(`${base}/${relative}`, 'utf8')))

const packages = await readJson('data/packages.json')
const facets = await readJson('data/facets.json')
const hubs = await readJson('data/hubs.json')
const discovery = await readJson('data/discovery.json')
/** @type {string[]} */
const failures = []

const MAINTENANCE = new Set(['active', 'frozen', 'retired', 'unknown'])
const MATURITY = new Set(['experimental', 'preview', 'beta', 'stable', 'deprecated', 'retired'])
const names = new Set(packages.map((/** @type {any} */ row) => row.npm))
const byName = new Map(packages.map((/** @type {any} */ row) => [row.npm, row]))

if (facets.plugins.length !== packages.length) failures.push(`facets: ${facets.plugins.length} records != ${packages.length} packages`)
const seen = new Set()
for (const record of facets.plugins) {
  if (!names.has(record.name)) failures.push(`facets: unknown plugin ${record.name}`)
  if (seen.has(record.name)) failures.push(`facets: duplicate ${record.name}`)
  seen.add(record.name)
  if (!MAINTENANCE.has(record.maintenance)) failures.push(`facets: bad maintenance ${record.name}=${record.maintenance}`)
  if (!MATURITY.has(record.maturity)) failures.push(`facets: bad maturity ${record.name}=${record.maturity}`)
  if (!Array.isArray(record.facets?.domains) || record.facets.domains.length === 0) failures.push(`facets: no domains ${record.name}`)
  if (!Array.isArray(record.facets?.tasks) || record.facets.tasks.length === 0) failures.push(`facets: no tasks ${record.name}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.coverage?.lastReviewed ?? '')) failures.push(`facets: bad lastReviewed ${record.name}`)
  if (!Array.isArray(record.facetCategories) || record.facetCategories.length === 0) failures.push(`facets: no facetCategories ${record.name}`)
  if (record.maintenance === 'retired' && !record.replacement) failures.push(`facets: retired without replacement ${record.name}`)
  const pkg = byName.get(record.name)
  const legacy = [...(pkg?.categories ?? [])].sort().join(',')
  const stored = [...(record.facets?.legacyCategories ?? [])].sort().join(',')
  if (legacy !== stored) failures.push(`facets: legacy categories drift ${record.name}: ${stored} != ${legacy}`)
}

const FROZEN_AT_BIRTH = ['dsh-docx-redline', 'dsh-freight-audit', 'dsh-ghg', 'dsh-hs-candidate', 'dsh-ifc-qto', 'dsh-pim-lint', 'dsh-qms-capa']
for (const name of FROZEN_AT_BIRTH) {
  const record = facets.plugins.find((/** @type {any} */ row) => row.name === name)
  if (!record) failures.push(`facets: frozen-at-birth missing ${name}`)
  else if (record.maturity !== 'preview') failures.push(`facets: frozen-at-birth ${name} should be preview, got ${record.maturity}`)
}

const count = (/** @type {string} */ value) => facets.plugins.filter((/** @type {any} */ record) => record.maintenance === value).length
const derived = { plugins: facets.plugins.length, active: count('active'), frozen: count('frozen'), retired: count('retired'), unknown: count('unknown') }
for (const [key, value] of Object.entries(derived)) if (facets.counts?.[key] !== value) failures.push(`facets: counts.${key} ${facets.counts?.[key]} != ${value}`)

for (const record of discovery) {
  if (!names.has(record.name)) failures.push(`discovery: unknown plugin ${record.name}`)
  if (record.schemaVersion !== 1) failures.push(`discovery: bad schemaVersion ${record.name}`)
  if (!MATURITY.has(record.maturity)) failures.push(`discovery: bad maturity ${record.name}`)
  if (!Array.isArray(record.aliases) || record.aliases.length < 3) failures.push(`discovery: aliases < 3 ${record.name}`)
  if (!Array.isArray(record.searchPhrases) || record.searchPhrases.length < 3) failures.push(`discovery: searchPhrases < 3 ${record.name}`)
  if (!Array.isArray(record.audience) || record.audience.length < 1) failures.push(`discovery: audience empty ${record.name}`)
}

const disagree = facets.plugins.filter((/** @type {any} */ record) => record.statusAgreement === 'disagree')
if (disagree.length > 0) failures.push(`facets: status disagreement: ${disagree.map((/** @type {any} */ row) => row.name).join(', ')}`)

if (hubs.hubs.length < 8 || hubs.hubs.length > 10) failures.push(`hubs: expected 8..10, got ${hubs.hubs.length}`)
const hubIds = new Set()
for (const hub of hubs.hubs) {
  if (hubIds.has(hub.id)) failures.push(`hubs: duplicate id ${hub.id}`)
  hubIds.add(hub.id)
  if (!Array.isArray(hub.queries) || hub.queries.length < 3) failures.push(`hubs: ${hub.id} needs >=3 queries`)
  if (!Array.isArray(hub.workflow) || hub.workflow.length < 3) failures.push(`hubs: ${hub.id} needs >=3 workflow plugins`)
  for (const name of hub.workflow) if (!names.has(name)) failures.push(`hubs: ${hub.id} references unknown ${name}`)
}

const coverage = facets.plugins.length === packages.length ? '100%' : `${facets.plugins.length}/${packages.length}`
if (failures.length) {
  console.error(`FAIL ${failures.length} facet checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`facets ok: ${derived.plugins} plugins, facet coverage ${coverage}; maintenance ${derived.active} active / ${derived.frozen} frozen / ${derived.retired} retired / ${derived.unknown} unknown`)
console.log(`hubs ok: ${hubs.hubs.length} hubs (${hubs.hubs.map((/** @type {any} */ hub) => hub.id).join(', ')})`)
console.log(`status sources: ${facets.plugins.filter((/** @type {any} */ row) => row.statusAgreement === 'both').length} both, ${facets.plugins.filter((/** @type {any} */ row) => row.statusAgreement === 'catalog-only').length} catalog-only, ${facets.plugins.filter((/** @type {any} */ row) => row.statusAgreement === 'roster-only').length} roster-only, ${facets.plugins.filter((/** @type {any} */ row) => row.statusAgreement === 'none').length} none`)
