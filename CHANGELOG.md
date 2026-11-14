# Changelog

All notable changes to `dsh-catalog` are recorded here.

## Unreleased

- **Compatibility fields refreshed from the published npm manifests (2026-11-14, DSH 0.2.2-rc.3 line).**
  All 152 `data/packages.json` rows now carry a regenerated `requires` block: `dsh` keeps the declared
  `engines.dsh` (falling back to the `@deepseek-ai/dsh` peer range) and adds the explicit
  `>=0.2.2-0 <0.3.0` clause (100 declared ranges were normalized; 1 package with no declaration
  falls back to the host range); `dshDeclared` keeps the verbatim declaration; `dshHost` and
  `nodeHost` state the DSH host floors (`>=0.2.2-0 <0.3.0` / `>=24.9.0`); `node` keeps the
  plugin's own `engines.node` (so "plugin floor vs host floor" is no longer conflated); `source`
  records whether the row came from the manifest or a catalog default. npm market data itself
  (`latest`, description, timestamps) was not hand-edited.
- `scripts/diff-kit-roster.mjs` now matches repositories by name (so a different-owner path such as
  `Phocinae/dsh-phocinae` is not reported as missing) and splits out-of-roster rows into PerryLink
  and third-party; `CATALOG-DIFF.md` regenerated (152 catalog rows, 99 kit roster entries, 0
  roster entries missing from the catalog).
- `data/roster-status.json` (`updatedAt` 2026-11-14, re-checked against the 99-entry kit roster) and
  `data/facets.json` (`lastReviewed` 2026-11-14) timestamps refreshed.
- `data/deferred-packages.json` `_comment` rewritten to the current state (152 npm-backed rows, 3
  deferred non-npm family repos; the obsolete `merge`/`snapshotAdditions` pipeline is gone).
- Bug-report issue template placeholder now targets the current line: Harness `0.2.2-rc.3`, Node `24.9.0`.
- Rebuilt `deploy/artifacts/v1/{plugins,display}.json` from the source data.
- Verified: `check:counts`, `validate`, `check-data`, `check-facets` all pass (152 packages, 100% facet coverage).

- Added the five 2026-11-10 research npm packages as catalog rows 148–152: `dsh-lit-harvest`,
  `dsh-zotero-bridge`, `dsh-rep-mcp`, `dsh-research-skills` and `@perrylink/dsh-research-suite`
  (snapshot, discovery manifests, facets, icons and search index rebuilt; 152/152 reviewed).
  They stay catalog-only — the research suite is not part of the `dsh-kit/plugins.txt` install roster.
- Added `dsh-sherlock` as the 147th package (snapshot, discovery, facets, icon and search index rebuilt);
  147/147 reviewed.
- Reviewed the 85 catalog-derived discovery manifests, normalized their limitations, and cleared
  the pending-review flag (146/146 reviewed).
- Documentation baseline: privacy, icon, security, contributing, changelog and diagram metadata.
