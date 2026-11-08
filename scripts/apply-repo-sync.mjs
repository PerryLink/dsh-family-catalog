// Apply data/top20-repo-sync.json to the top-20 plugin repos.
//
// Dry-run by default. Refuses to modify a repo that has uncommitted changes:
// the workspace rule is that uncommitted changes belong to their author, and on
// 2026-11-08 all 17 local checker repos were on branch reconcile-yaml with 3
// dirty files each, so this script could not be applied then.
//
// Usage:
//   node scripts/apply-repo-sync.mjs --root=/mnt/d/Projects/dsh/checkers
//   node scripts/apply-repo-sync.mjs --root=... --apply
//
// It changes only package.json (keywords + dsh.demo.prompt) and README.md (one
// search-words blockquote after the first H1). It does not commit or push.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const base = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const root = args.find((value) => value.startsWith('--root='))?.slice('--root='.length)
const apply = args.includes('--apply')
if (!root) {
  console.error('usage: node scripts/apply-repo-sync.mjs --root=<plugins-root> [--apply]')
  process.exit(2)
}
const sync = JSON.parse((await readFile(`${base}/data/top20-repo-sync.json`, 'utf8')).replace(/^\uFEFF/, ''))

/** @param {string} dir */
const dirty = (dir) => {
  try {
    return execSync('git status --porcelain', { cwd: dir, encoding: 'utf8' }).trim().length > 0
  } catch {
    return true
  }
}

let planned = 0
let applied = 0
let skipped = 0
for (const repo of sync.repos) {
  const dir = join(root, repo.name)
  if (!existsSync(dir)) {
    console.log(`SKIP ${repo.name}: not found under ${root}`)
    skipped += 1
    continue
  }
  if (dirty(dir)) {
    console.log(`SKIP ${repo.name}: dirty working tree (author WIP)`)
    skipped += 1
    continue
  }
  planned += 1
  console.log(`${apply ? 'APPLY' : 'PLAN'} ${repo.name}: ${repo.keywords.length} keywords, demo prompt, README search line`)
  if (!apply) continue

  const pkgPath = join(dir, 'package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  pkg.keywords = [...new Set([...(pkg.keywords ?? []), ...repo.keywords])].slice(0, 30)
  pkg.dsh = { ...(pkg.dsh ?? {}), demo: { ...(pkg.dsh?.demo ?? {}), prompt: repo.demoPrompt } }
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

  const readmePath = join(dir, 'README.md')
  const readme = await readFile(readmePath, 'utf8')
  if (!readme.includes(repo.readmeSearchLine)) {
    const lines = readme.split('\n')
    const heading = lines.findIndex((line) => line.startsWith('# '))
    const block = ['', `> ${repo.readmeSearchLine}`]
    lines.splice(heading + 1, 0, ...block)
    await writeFile(readmePath, lines.join('\n'))
  }
  applied += 1
}
console.log(`repo sync: ${apply ? `applied ${applied}` : `planned ${planned}`}, skipped ${skipped}`)
console.log(sync.blockedBy)
