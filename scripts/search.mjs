// Chinese-aware search over the discovery sidecar index.
//
// Why not Desktop's `includes`: the catalog page search is one whole-string
// `includes` per field. A user typing "报关单品名和金额对不上怎么办" gets zero
// hits unless that exact sentence was stored. This module keeps the index
// sidecar and scores partial matches, so an unseen sentence still ranks by its
// domain terms (报关单 / 品名 / 金额 / 对不上).
//
// Usage (library):
//   import { search } from './search.mjs'
//   const { results, expansions } = search('HS编码')
//
// Usage (CLI):
//   node scripts/search.mjs "报关单品名对不上" --limit=5
//   node scripts/search.mjs "危化品" --domain=ehs --json

import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('..', import.meta.url))
const DEFAULT_INDEX = `${base}/deploy/artifacts/v1/search-index.json`
const FALLBACK_INDEX = `${base}/artifacts/v1/search-index.json`
const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u
const CJK_RUN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]+/gu

/** Domain synonyms / abbreviations. Groups expand in both directions. */
export const SYNONYM_GROUPS = [
  ['HS编码', 'HS Code', '商品编码', '海关编码', '税则号列', '商品归类', 'hs-code', 'tariff-classification'],
  ['危化品', '危险化学品', 'hazchem'],
  ['国自然', '国家自然科学基金', 'NSFC', '基金申请书'],
  ['数电票', '电子发票', 'OFD', '发票'],
  ['信用证', 'LC', 'Letter of Credit', 'UCP600'],
  ['病案首页', '住院病案首页', '病案', 'DRG'],
  ['护理记录', '护理文书', '护理记录单'],
  ['公文', '党政机关公文', '公文格式'],
  ['法条', '法律条文', '法条引用', 'legal citation'],
  ['RVC', '区域价值成分', '原产地规则'],
  ['FMEA', '失效模式', 'RPN'],
  ['滞箱费', '滞期费', 'demurrage', 'detention'],
  ['三单匹配', 'three-way match', '发票 PO GRN'],
  ['银行对账', '未达账项', '余额调节表', 'bank reconciliation'],
  ['差旅报销', '差旅对账', 'travel expense'],
  ['投标资格', '投标人资格', '资格审查', 'bid qualification'],
  ['环评', '环境影响评价', 'EIA'],
  ['H AZOP', 'HAZOP', '危险与可操作性'],
  ['SPC', '控制图', 'CPK', '过程能力'],
  ['PPAP', '生产件批准'],
  ['CAPA', '8D', '纠正措施'],
  ['碳排放', '范围二', 'Scope 2', 'GHG'],
  ['电子发票', '发票查重', '发票归档'],
  ['合同', '合同审查', 'contract'],
  ['证据', '证据清单', '举证'],
  ['监理日志', '旁站', '监理'],
  ['土壤', '地下水', '监测超标'],
  ['应急预案', '应急管理'],
  ['出口管制', '最终用途', '许可证'],
  ['招标', '投标', '评标', 'tender'],
]

/** @type {Map<string, string[]>} */
const expansionMap = new Map()
for (const group of SYNONYM_GROUPS) {
  const normalized = group.map((term) => term.toLocaleLowerCase('en-US'))
  for (const term of normalized) {
    const bucket = expansionMap.get(term) ?? []
    for (const other of normalized) if (other !== term && !bucket.includes(other)) bucket.push(other)
    expansionMap.set(term, bucket)
  }
}

/** @param {unknown} value */
const text = (value) => (typeof value === 'string' ? value : '')
/** @param {unknown} value */
export const normalize = (value) => text(value).toLocaleLowerCase('en-US')
/** Strip whitespace/punctuation so "HS 编码" and "HS编码" match the same way. @param {unknown} value */
export const compact = (value) => normalize(value).replace(/[\s\p{P}\p{S}]+/gu, '')

/** @param {string} value @returns {string[]} */
export function grams(value) {
  const out = new Set()
  for (const run of compact(value).match(CJK_RUN) ?? []) {
    for (let size = 2; size <= 3; size += 1) {
      for (let index = 0; index + size <= run.length; index += 1) out.add(run.slice(index, index + size))
    }
  }
  return [...out]
}

/** Remove polite/filler words but keep domain words. */
const STOP_PHRASES = ['帮我', '请帮我', '麻烦', '请', '一下', '怎么办', '怎么样', '怎么', '如何', '查什么', '是什么', '对不对', '是否', '能不能']
/** @param {string} value */
export function cleanQuery(value) {
  let query = normalize(value).trim()
  for (const phrase of STOP_PHRASES) query = query.split(phrase).join('')
  return query.trim()
}

/** @param {string} query @returns {string[]} */
export function expand(query) {
  const normalized = normalize(query)
  const compacted = compact(query)
  const out = new Set()
  for (const [term, others] of expansionMap) {
    if (normalized.includes(term) || (term.length >= 2 && compacted.includes(compact(term)))) {
      for (const other of others) out.add(other)
    }
  }
  return [...out].slice(0, 12)
}

/** @param {string} haystack @param {string} needle */
const has = (haystack, needle) => needle.length >= 2 && haystack.includes(needle)

/**
 * @typedef {object} SearchIndexItem
 * @property {string} name
 * @property {string} displayName
 * @property {string} displayNameZh
 * @property {string} summary
 * @property {string} summaryZh
 * @property {string[]} aliases
 * @property {string[]} keywordsZh
 * @property {string[]} keywordsEn
 * @property {string[]} searchPhrases
 * @property {string[]} audience
 * @property {any} facets
 * @property {string} maturity
 * @property {any} coverage
 * @property {string[]} related
 * @property {string|null} demoPrompt
 * @property {string} searchText
 */

/** @param {SearchIndexItem} item */
function prepared(item) {
  const keywords = [...(item.keywordsZh ?? []), ...(item.keywordsEn ?? [])]
  const facets = item.facets ?? {}
  return {
    item,
    name: compact(item.name),
    displayName: compact(item.displayName),
    displayNameZh: compact(item.displayNameZh),
    aliases: (item.aliases ?? []).map(compact).filter(Boolean),
    keywords: keywords.map(compact).filter(Boolean),
    searchPhrases: (item.searchPhrases ?? []).map(compact).filter(Boolean),
    summary: compact(`${item.summary}\n${item.summaryZh}`),
    audience: (item.audience ?? []).map(compact).filter(Boolean),
    standards: ((facets.standards ?? [])).map(compact).filter(Boolean),
    domains: facets.domains ?? [],
    tasks: facets.tasks ?? [],
    full: compact(item.searchText),
  }
}

/**
 * @param {string} query
 * @param {{ index?: any, limit?: number, domain?: string, task?: string, audience?: string }} [options]
 */
export function search(query, options = {}) {
  const index = options.index ?? loadIndexSync()
  const limit = Math.max(1, Math.min(options.limit ?? 5, 20))
  const normalized = normalize(query)
  const cleaned = cleanQuery(query)
  const compacted = compact(query)
  const expansions = expand(query)
  const queryGrams = grams(query)
  const domain = options.domain === undefined ? undefined : normalize(options.domain)
  const task = options.task === undefined ? undefined : normalize(options.task)
  const audience = options.audience === undefined ? undefined : normalize(options.audience)

  const scored = []
  for (const item of index.items) {
    const row = prepared(item)
    if (domain !== undefined && !(row.domains ?? []).some((/** @type {any} */ value) => normalize(value) === domain)) continue
    if (task !== undefined && !(row.tasks ?? []).some((/** @type {any} */ value) => normalize(value) === task)) continue
    if (audience !== undefined && !(row.audience ?? []).some((/** @type {any} */ value) => value.includes(compact(audience)))) continue
    /** @type {string[]} */
    const matched = []
    let score = 0
    /** @param {string} field @param {number} weight @param {string} label */
    const check = (field, weight, label) => {
      const value = /** @type {any} */ (row)[field]
      if (typeof value === 'string') {
        if (value === compacted) { score += weight * 2; matched.push(`${label}:${query}`); return }
        if (has(value, compacted)) { score += weight; matched.push(label); return }
      }
      if (Array.isArray(value) && value.some((entry) => entry === compacted)) { score += weight * 1.5; matched.push(`${label}:${query}`); return }
      if (Array.isArray(value) && value.some((entry) => has(entry, compacted))) { score += weight; matched.push(label) }
    }
    check('aliases', 8, 'alias')
    check('searchPhrases', 5, 'searchPhrase')
    check('name', 6, 'name')
    check('displayNameZh', 5, 'displayNameZh')
    check('keywords', 4, 'keyword')
    check('summary', 2, 'summary')
    check('audience', 2, 'audience')
    check('standards', 2, 'standard')

    // Partial credit for unseen sentences: overlap of 2/3-char CJK grams.
    if (queryGrams.length > 0) {
      let overlap = 0
      for (const gram of queryGrams) if (row.full.includes(gram) || row.summary.includes(gram)) overlap += 1
      if (overlap > 0) {
        score += Math.min(10, overlap * 0.8)
        if (!matched.includes('ngram')) matched.push('ngram')
      }
    }
    // Synced synonyms get a smaller, separate contribution.
    for (const expansion of expansions) {
      const value = compact(expansion)
      if (value.length < 2) continue
      if (row.full.includes(value)) {
        score += 1.5
        if (!matched.includes('synonym')) matched.push('synonym')
      }
    }
    if (score <= 0) continue
    if (item.maturity === 'retired') score *= 0.4
    if (item.maturity === 'stable') score += 0.5
    scored.push({ item, score, matched })
  }

  scored.sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name))
  return {
    query,
    cleaned,
    expansions,
    total: scored.length,
    results: scored.slice(0, limit).map(({ item, score, matched }) => ({
      name: item.name,
      displayNameZh: item.displayNameZh,
      displayName: item.displayName,
      score: Number(score.toFixed(2)),
      matched_on: [...new Set(matched)],
      why: why(item, matched),
      maturity: item.maturity,
      coverage: item.coverage,
      facets: item.facets,
      install: `dsh plugin --profile web add ${item.name}`,
    })),
  }
}

/** @param {SearchIndexItem} item @param {string[]} matched */
function why(item, matched) {
  const parts = []
  if (matched.some((value) => value.startsWith('alias'))) parts.push('别名命中')
  if (matched.some((value) => value.startsWith('searchPhrase'))) parts.push('用户问法命中')
  if (matched.includes('keyword')) parts.push('关键词命中')
  if (matched.includes('displayNameZh')) parts.push('中文名命中')
  if (matched.includes('summary')) parts.push('摘要命中')
  if (matched.includes('audience')) parts.push('岗位命中')
  if (matched.includes('standard')) parts.push('标准号命中')
  if (matched.includes('ngram')) parts.push('中文片段重合')
  if (matched.includes('synonym')) parts.push('同义词扩展')
  const domains = item.facets?.domains ?? []
  if (domains.length) parts.push(`领域：${domains.join('/')}`)
  return parts.join('；') || '匹配'
}

/** @type {any} */
let cachedIndex
export function loadIndexSync() {
  if (cachedIndex !== undefined) return cachedIndex
  const file = existsSync(DEFAULT_INDEX) ? DEFAULT_INDEX : FALLBACK_INDEX
  cachedIndex = JSON.parse(readFileSync(file, 'utf8'))
  return cachedIndex
}

/** Async loader used by the API/MCP entry points. */
export async function loadIndex(file = DEFAULT_INDEX) {
  const target = existsSync(file) ? file : FALLBACK_INDEX
  cachedIndex = JSON.parse(await readFile(target, 'utf8'))
  return cachedIndex
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('search.mjs')) {
  const args = process.argv.slice(2)
  const query = args.find((value) => !value.startsWith('--')) ?? ''
  const limit = Number(args.find((value) => value.startsWith('--limit='))?.slice('--limit='.length) ?? 5)
  const domain = args.find((value) => value.startsWith('--domain='))?.slice('--domain='.length)
  const task = args.find((value) => value.startsWith('--task='))?.slice('--task='.length)
  const audience = args.find((value) => value.startsWith('--audience='))?.slice('--audience='.length)
  const asJson = args.includes('--json')
  const result = search(query, { limit, domain, task, audience })
  if (asJson) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`query: ${result.query}${result.expansions.length ? `  expansions: ${result.expansions.join(', ')}` : ''}`)
    for (const [position, hit] of result.results.entries()) {
      console.log(`${position + 1}. ${hit.name} (${hit.score}) — ${hit.displayNameZh}`)
      console.log(`   ${hit.why}`)
      console.log(`   ${hit.install}`)
    }
    if (result.results.length === 0) console.log('(no match)')
  }
}
