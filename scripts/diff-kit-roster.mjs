// Compare the catalog's package rows with dsh-plugin-kit's machine-readable
// roster. The catalog is a superset by design: it carries PerryLink packages
// that the kit does not install yet, plus third-party entries. This report names
// the exact difference instead of letting readers infer it from two
// hand-maintained counts.
//
// Matching is by repository NAME (last path segment), not `owner/name`: the same
// repository can be catalogued under a different owner path (e.g. the third-party
// fork `Phocinae/dsh-phocinae` matches the roster entry `dsh-phocinae`).
//
// Usage: node scripts/diff-kit-roster.mjs [--write]
//   DSH_KIT_REPOS=<path to dsh-kit/data/repos.json> overrides the default.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const kitPath = process.env.DSH_KIT_REPOS ?? '/mnt/d/Projects/dsh/plugins/dsh-plugin-kit/data/repos.json'
const packages = /** @type {Array<{ npm: string, repo: string }>} */ (JSON.parse(await readFile(`${root}/data/packages.json`, 'utf8')))
const kit = JSON.parse(await readFile(kitPath, 'utf8'))
const rows = /** @type {Array<{ name: string }>} */ (Array.isArray(kit) ? kit : kit.repos)

/** Repository name: the last path segment of a GitHub URL or of `owner/name`. */
const ofRepo = (/** @type {string} */ value) =>
  String(value)
    .replace(/^.*github\.com\//u, '')
    .replace(/\.git$/u, '')
    .replace(/\/$/u, '')
    .split('/')
    .pop()

const catalog = new Map(packages.map((row) => [ofRepo(row.repo), row]))
const roster = new Map(rows.map((row) => [row.name, row]))
const missing = [...roster.keys()].filter((name) => !catalog.has(name)).sort()
const outside = [...catalog.keys()].filter((name) => !roster.has(name)).sort()
const outsideFamily = outside.filter((name) => String(catalog.get(name).repo).startsWith('PerryLink/'))
const outsideThirdParty = outside.filter((name) => !outsideFamily.includes(name))

const lines = [
  '# Catalog vs dsh-plugin-kit roster',
  '',
  `Generated: ${new Date().toISOString()}`,
  `- catalog rows: ${packages.length}`,
  `- kit roster entries: ${rows.length}`,
  `- kit entries missing from catalog: ${missing.length}`,
  `- catalog entries outside the kit roster: ${outside.length} (${outsideFamily.length} PerryLink + ${outsideThirdParty.length} third-party)`,
  '',
  '> The catalog is a superset by design. A row here that is not in the kit roster is',
  '> catalogued but not installed by dsh-kit; a roster entry missing from the catalog is',
  '> a real gap to fix in data/packages.json.',
  '',
  '## Missing from the catalog',
  '',
  ...(missing.length ? missing.map((name) => `- \`${name}\``) : ['- none']),
  '',
  '## Outside the kit roster',
  '',
  ...(outside.length
    ? [
        `### PerryLink packages catalogued but not in the kit roster (${outsideFamily.length})`,
        '',
        ...outsideFamily.map((name) => `- \`${name}\``),
        '',
        `### Third-party rows (${outsideThirdParty.length})`,
        '',
        ...(outsideThirdParty.length ? outsideThirdParty.map((name) => `- \`${name}\` — third-party, not installed by dsh-kit`) : ['- none']),
      ]
    : ['- none']),
  '',
]
const report = `${lines.join('\n')}\n`
if (process.argv.includes('--write')) {
  await writeFile(`${root}/CATALOG-DIFF.md`, report, 'utf8')
  console.log('wrote CATALOG-DIFF.md')
} else {
  process.stdout.write(report)
}
