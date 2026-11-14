// Build the P2 facet/status sidecar for all 126 packages.
//
// The 1.0.0 catalog item keeps its single `categories` array (existing filters
// must not break); this sidecar adds the multi-value facets, the split
// subdomains for the four mixed groups, and the status model:
//
//   maintenance : active | frozen | retired | unknown   (roster ∪ catalog)
//   maturity    : experimental | preview | beta | stable | deprecated | retired
//   coverage    : lastReviewed + standards + jurisdictions + limitations
//   replacement : required for retired rows
//
// Usage: node scripts/build-facets.mjs
// Output: data/facets.json

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('..', import.meta.url))
/** @param {string} value */
const stripBom = (value) => value.replace(/^\uFEFF/, '')
/** @param {string} relative */
const readJson = async (relative) => JSON.parse(stripBom(await readFile(`${base}/${relative}`, 'utf8')))

const packages = await readJson('data/packages.json')
const snapshot = await readJson('data/npm-snapshot.json')
const discovery = await readJson('data/discovery.json')
const roster = await readJson('data/roster-status.json')
const snapByName = new Map(snapshot.map((/** @type {any} */ row) => [row.name, row]))
const discoveryByName = new Map(discovery.map((/** @type {any} */ row) => [row.name, row]))
const rosterStatus = roster.repos

/** category -> default domains. Overrides below win. @type {Record<string, string[]>} */
const CATEGORY_DOMAINS = {
  agent: ['agent'],
  construction: ['construction'],
  customs: ['customs', 'trade'],
  data: ['data'],
  dev: ['dev'],
  'developer-tools': ['dev'],
  documents: ['documents'],
  esg: ['esg', 'energy'],
  finance: ['finance'],
  gongwen: ['government'],
  governance: ['governance'],
  integration: ['dev_connectors'],
  interface: ['ux'],
  knowledge: ['research'],
  legal: ['legal'],
  logistics: ['logistics'],
  medical: ['medical'],
  memory: ['memory'],
  model: ['model_routing'],
  quality: ['quality'],
  research: ['research'],
  safety: ['ehs'],
  session: ['session'],
  tender: ['tender'],
  tools: ['tools'],
  trade: ['trade'],
  workflow: ['workflow'],
}

/** The 12+ misplacements and the four mixed groups, from DISCOVERABILITY §2.2/§2.3b. @type {Record<string, string[]>} */
const DOMAIN_OVERRIDES = {
  'dsh-railway-window': ['railway'],
  'dsh-forecast-penalty': ['energy'],
  'dsh-hs-candidate': ['customs', 'trade'],
  'dsh-aqua-input-check': ['food_safety'],
  'dsh-canteen-retention-check': ['food_safety'],
  'dsh-sop-sync-check': ['quality', 'manufacturing'],
  'dsh-review-reply-check': ['research'],
  'dsh-data-quality': ['data', 'quality'],
  'dsh-mask': ['security'],
  'dsh-permission-rules': ['security'],
  'dsh-defend': ['security'],
  'dsh-security-pack': ['security'],
  'dsh-auto-review': ['security'],
  'dsh-sherlock': ['security'],
  'dsh-ifc-qto': ['construction'],
  'dsh-excel-reconcile': ['finance'],
  'dsh-pipeline-check': ['investment_project'],
  'dsh-ota-review-check': ['hospitality'],
  'dsh-repair-order-qc': ['auto_aftermarket'],
  'dsh-warranty-calc': ['auto_aftermarket'],
  'dsh-check-pack': ['quality'],
  'dsh-autotier': ['model_routing'],
  'dsh-local-ai': ['model_routing'],
  'dsh-laya': ['model_routing', 'agent'],
  'dsh-translate': ['model_routing'],
  'dsh-dida': ['remote_comms'],
  'dsh-phone-inbox': ['remote_comms'],
  'dsh-reach': ['remote_comms'],
  'dsh-github-bot': ['dev_connectors'],
  'dsh-lsp-actions': ['dev_connectors'],
  'dsh-mcp-panel': ['dev_connectors'],
  'dsh-cert-mcp': ['dev_connectors'],
  'dsh-claude-move': ['dev_connectors'],
  'dsh-paper-doc-adapter': ['education'],
  'dsh-essay-rubric-check': ['education'],
  'dsh-learning-gap-check': ['education'],
  'dsh-policy-brief-draft': ['government'],
  'dsh-guard-plan-qc': ['ehs'],
  'dsh-hazplan-check': ['ehs'],
  'dsh-permit-report-check': ['government', 'construction'],
  'dsh-safety-brief-check': ['construction', 'ehs'],
  'dsh-soilwater-check': ['construction', 'ehs'],
  'dsh-safety-ledger-check': ['construction', 'ehs'],
  'dsh-ghg': ['energy', 'esg'],
  'dsh-qms-capa': ['quality', 'manufacturing'],
  'dsh-budget': ['finance'],
  'dsh-draw': ['design'],
  'dsh-click': ['desktop'],
  'dsh-talk': ['voice'],
  'dsh-fast': ['observability'],
  'dsh-observe': ['observability'],
  'dsh-composer-history': ['ux', 'session'],
  'dsh-rulefile-check': ['dev'],
}

/** Mixed-group subdomains (DISCOVERABILITY §2.2). @type {Record<string, string[]>} */
const SUBDOMAIN_OVERRIDES = {
  'dsh-mask': ['ai-security'], 'dsh-permission-rules': ['ai-security'], 'dsh-defend': ['ai-security'],
  'dsh-security-pack': ['ai-security'], 'dsh-auto-review': ['ai-security'],
  'dsh-sherlock': ['osint'],
  'dsh-emergency-plan': ['ehs'], 'dsh-hazchem-check': ['ehs'], 'dsh-hazplan-check': ['ehs'],
  'dsh-hidden-risk-map': ['ehs'], 'dsh-power-ticket-check': ['ehs'], 'dsh-safety-brief-check': ['ehs'],
  'dsh-drill-script-check': ['ehs'], 'dsh-guard-plan-qc': ['ehs'], 'dsh-permit-report-check': ['ehs'],
  'dsh-aqua-input-check': ['food-safety'], 'dsh-canteen-retention-check': ['food-safety'],
  'dsh-data-quality': ['data-quality'], 'dsh-score': ['dev-quality'], 'dsh-test-drive': ['dev-quality'], 'dsh-doublecheck': ['dev-quality'],
  'dsh-fmea-table-check': ['manufacturing-quality'], 'dsh-ppap-check': ['manufacturing-quality'],
  'dsh-spc-gbt-adapter': ['manufacturing-quality'], 'dsh-qms-capa': ['manufacturing-quality'], 'dsh-sop-sync-check': ['manufacturing-quality'],
  'dsh-ota-review-check': ['operations-quality'], 'dsh-repair-order-qc': ['operations-quality'],
  'dsh-warranty-calc': ['operations-quality'], 'dsh-review-reply-check': ['operations-quality'], 'dsh-pipeline-check': ['operations-quality'],
  'dsh-autotier': ['model-routing'], 'dsh-local-ai': ['model-routing'], 'dsh-laya': ['model-routing'], 'dsh-translate': ['model-routing'],
  'dsh-github-bot': ['dev-connectors'], 'dsh-lsp-actions': ['dev-connectors'], 'dsh-mcp-panel': ['dev-connectors'],
  'dsh-cert-mcp': ['dev-connectors'], 'dsh-claude-move': ['dev-connectors'],
  'dsh-dida': ['remote-comms'], 'dsh-phone-inbox': ['remote-comms'], 'dsh-reach': ['remote-comms'],
  'dsh-research-report': ['research'], 'dsh-industry-research': ['research'], 'dsh-fund-research': ['research'],
  'dsh-library': ['research'], 'dsh-nsfc-form-check': ['research'],
  'dsh-essay-rubric-check': ['education'], 'dsh-learning-gap-check': ['education'], 'dsh-paper-doc-adapter': ['education'],
  'dsh-phocinae': ['decision'], 'dsh-soe-decision-check': ['decision'],
}

/** Frozen at birth: frozen, but not "abandoned" (DISCOVERABILITY §6 / P2-5). */
const FROZEN_AT_BIRTH = new Set(['dsh-docx-redline', 'dsh-freight-audit', 'dsh-ghg', 'dsh-hs-candidate', 'dsh-ifc-qto', 'dsh-pim-lint', 'dsh-qms-capa'])

/** Retired rows must point at what replaced them (official native features). @type {Record<string, string|null>} */
const REPLACEMENT = {
  'dsh-background-agents': 'dsh-base (official native continuable sub-agents)',
  'dsh-session-pin': 'dsh-client-ui-workspace (official native workspace/session pinning)',
  'dsh-team-rooms': 'dsh-experimental-agent-team (official native agent team)',
  'dsh-personal-directive': null,
}

const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u

/** @param {any} pkg */
const domainsOf = (pkg) => DOMAIN_OVERRIDES[pkg.npm]
  ?? (pkg.categories ?? []).flatMap((/** @type {string} */ category) => CATEGORY_DOMAINS[category] ?? [])
  ?? []

/** @param {any} pkg */
const subdomainsOf = (pkg) => SUBDOMAIN_OVERRIDES[pkg.npm] ?? []

/** @param {any} pkg */
function tasksOf(pkg) {
  const name = pkg.npm
  if (name === 'dsh-check-pack') return ['installer']
  if (/adapter$/.test(name)) return ['adapter', 'checker']
  if (/(check|qc|audit|lint|matrix|precheck|deadline)$/.test(name) || /-check$|-qc$/.test(name)) return ['checker']
  if (/calc$|budget$/.test(name)) return ['calculator']
  if (/ledger$|bankrec$|recon$|three-way$/.test(name)) return ['reconciliation', 'ledger']
  if (/extract$/.test(name)) return ['extractor']
  if (/report$|brief$|draft$/.test(name)) return ['drafting']
  if (/search$|library$/.test(name)) return ['search']
  if (/bridge$|inbox$|talk$|reach$|dida$/.test(name)) return ['bridge']
  if (/ingest$|table-/.test(name)) return ['parser', 'ingest']
  if (/suite$/.test(name)) return ['workflow']
  return ['tool']
}

/** @param {any} pkg @param {any} record */
function artifactsOf(pkg, record) {
  const blob = [pkg.summary ?? '', pkg.summaryZh ?? '', ...(pkg.keywords ?? []), ...(record?.searchPhrases ?? [])].join('\n').toLocaleLowerCase('en-US')
  /** @type {string[]} */
  const found = []
  const push = (/** @type {string} */ value) => { if (!found.includes(value)) found.push(value) }
  if (/\bofd\b/.test(blob)) push('ofd')
  if (/\bxml\b/.test(blob)) push('xml')
  if (/xlsx|excel|表格/.test(blob)) push('xlsx')
  if (/docx|word|文档/.test(blob)) push('docx')
  if (/\bpdf\b/.test(blob)) push('pdf')
  if (/\bifc\b/.test(blob)) push('ifc')
  if (/\bcsv\b/.test(blob)) push('csv')
  if (/\bjson\b/.test(blob)) push('json')
  if (/图片|image|照片/.test(blob)) push('image')
  return found
}

/** @type {any[]} */
const plugins = packages.map((/** @type {any} */ pkg) => {
  const record = discoveryByName.get(pkg.npm)
  const catalogStatus = pkg.status ?? null
  const rosterRow = rosterStatus[pkg.npm] ?? null
  let maintenance
  if (catalogStatus === 'retired' || rosterRow === 'retired') maintenance = 'retired'
  else if (catalogStatus === 'frozen' || rosterRow === 'frozen') maintenance = 'frozen'
  else if (catalogStatus === 'active' || rosterRow === 'active') maintenance = 'active'
  else maintenance = 'unknown'
  const version = snapByName.get(pkg.npm)?.latest ?? ''
  const major = Number(version.split('.')[0])
  const maturity = maintenance === 'retired' ? 'retired'
    : FROZEN_AT_BIRTH.has(pkg.npm) || maintenance === 'frozen' ? 'preview'
      : Number.isFinite(major) && major >= 1 ? 'stable' : 'beta'
  const standards = Array.isArray(pkg.normativeBasis) ? pkg.normativeBasis : []
  const checker = tasksOf(pkg).includes('checker')
  const limitations = record?.coverage?.limitations ?? [checker
    ? '只核对用户导入材料内部的差异，不判断材料真实性；标准文本以用户导入版本为准。'
    : '只处理用户导入的数据；不替代人工复核。']
  return {
    name: pkg.npm,
    maintenance,
    maturity,
    facets: {
      domains: [...new Set(domainsOf(pkg))],
      subdomains: [...new Set(subdomainsOf(pkg))],
      tasks: [...new Set(tasksOf(pkg))],
      artifacts: artifactsOf(pkg, record),
      jurisdictions: ['CN'],
      standards,
      legacyCategories: pkg.categories ?? [],
    },
    // P2 migration target for the 1.0.0 `categories` array: facet IDs first,
    // legacy slugs kept as aliases so existing filters do not break.
    facetCategories: [...new Set([
      ...domainsOf(pkg).map((/** @type {string} */ value) => `domain.${value}`),
      ...subdomainsOf(pkg).map((/** @type {string} */ value) => `subdomain.${value}`),
      ...tasksOf(pkg).map((/** @type {string} */ value) => `task.${value}`),
      ...artifactsOf(pkg, record).map((/** @type {string} */ value) => `artifact.${value}`),
      'jurisdiction.CN',
    ])],
    coverage: {
      lastReviewed: '2026-11-11',
      ...(standards.length ? { standards } : {}),
      jurisdictions: ['CN'],
      limitations,
    },
    replacement: maintenance === 'retired' ? REPLACEMENT[pkg.npm] ?? null : null,
    frozenAtBirth: FROZEN_AT_BIRTH.has(pkg.npm),
    statusSources: { catalog: catalogStatus, roster: rosterRow },
    statusAgreement: catalogStatus !== null && rosterRow !== null
      ? (catalogStatus === rosterRow ? 'both' : 'disagree')
      : catalogStatus !== null ? 'catalog-only' : rosterRow !== null ? 'roster-only' : 'none',
  }
})

for (const record of plugins) {
  if (record.facets.domains.length === 0) throw new Error(`no domains: ${record.name}`)
  if (record.maintenance === 'retired' && !record.replacement) throw new Error(`retired without replacement: ${record.name}`)
}
const count = (/** @type {string} */ value) => plugins.filter((/** @type {any} */ record) => record.maintenance === value).length
const counts = { plugins: plugins.length, active: count('active'), frozen: count('frozen'), retired: count('retired'), unknown: count('unknown') }
const out = {
  schemaVersion: 1,
  lastReviewed: '2026-11-14',
  sources: { packages: 'data/packages.json', discovery: 'data/discovery.json', roster: roster.source },
  counts,
  plugins,
}
await writeFile(`${base}/data/facets.json`, `${JSON.stringify(out, null, 2)}\n`)
console.log(`wrote data/facets.json: ${plugins.length} plugins`, counts)
console.log('domains:', [...new Set(plugins.flatMap((/** @type {any} */ record) => record.facets.domains))].sort().join(','))
