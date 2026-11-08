# Top-20 repo metadata sync (package.json / README first screen)

Status: **prepared and verified on a throwaway copy; not applied to the live
checker repos** (2026-11-08).

## Why it is not applied

All 17 local checker repos for the top-20 list are on branch `reconcile-yaml`
with three uncommitted files each (`README-zh.md`, `src/shared/render.ts`,
`src/shared/report.ts`). The workspace rule is that uncommitted changes belong to
their author; committing or overwriting them would mix our metadata change into
someone else's in-flight branch. The three remaining top-20 plugins
(`dsh-einvoice`, `dsh-ifc-qto`, `dsh-qms-capa`) are catalog-only and have no
canonical checkout in `checkers/`.

`scripts/apply-repo-sync.mjs` refuses a dirty work tree by design; its dry-run
on 2026-11-08 reported `planned 0, skipped 20`.

## What the patch does

Source of truth: `data/top20-repo-sync.json` (generated from `discovery.json`).

For each repo:
1. `package.json` — merge the discovery aliases into `keywords` (deduped, max
   30) and replace `dsh.demo.prompt` with the plugin-specific prompt.
2. `README.md` — insert one `> 你会搜的词：…` blockquote after the first H1.
3. Nothing else; no commit, no push.

Run:

```sh
node scripts/apply-repo-sync.mjs --root=/mnt/d/Projects/dsh/checkers          # dry-run
node scripts/apply-repo-sync.mjs --root=/mnt/d/Projects/dsh/checkers --apply  # only when clean
```

## Verification on a copy

`dsh-hs-classify` was copied to `/tmp/repo-sync-test` (without `.git`, with the
original `node_modules` symlinked), the script applied, and its own gates run:

- `package.json` parsed, 20 keywords, demo prompt replaced;
- README search line present;
- `npm run check:readmes` → `readme-sync: all 5 READMEs share 13 sections…` (exit 0);
- `npm run typecheck` → exit 0.

So the patch is executable as soon as the `reconcile-yaml` WIP clears; no code
change is outstanding on our side.
