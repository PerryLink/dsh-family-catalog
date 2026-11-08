# Naming review (P4): `dsh-paper-doc-adapter`, `dsh-pipeline-check`

Status: **decided 2026-11-08 — do not rename.**

## Evidence

| Package | Old wrong domain (GitHub description) | Actual domain | Name problem |
|---|---|---|---|
| `dsh-paper-doc-adapter` | 论文投稿材料核对 | 试卷结构核对 | `paper` reads as “论文”, while the plugin parses exam papers |
| `dsh-pipeline-check` | 管道检验记录核对 | 项目文件完整性/项目文件链条核对 | `pipeline` reads as “管道/流水线”, while the plugin checks a project document chain |

Both wrong descriptions were fixed on GitHub in P0 (verified with `GET` after
`PATCH`), and the catalog now carries the right bilingual `displayName`
(“试卷结构核对”, “项目文件链条核对”) plus aliases/related terms.

## Why no rename

1. **The name was not the discovery blocker.** The search bench reaches both
   plugins through aliases (`试卷`, `项目文件链条`) without a rename; the broken
   field was the description, not the package name.
2. **Renaming breaks the install surface**: npm identity, provenance, existing
   `dsh plugin add <name>` commands, README links, catalog `package.name`, and
   the historical npm versions all point at the current name. The workspace rule
   is “不改包名” for P0–P3.
3. **No usage evidence** says the name is the limiting factor. Stars/downloads
   are not a maturity signal (the audit already rejected 0-star as a quality
   proxy), so there is no metric that would justify the breakage.
4. The seven old/new name drifts (`plugin-kit→scaffold`, …) are different: those
   packages were **already renamed**, and the catalog/PLUGINS just had to catch
   up. These two have never been renamed.

## Revisit trigger

Re-open only if, after the search index has run for a quarter, a query that
clearly targets the plugin still returns it below top 3 **and** the miss is
attributed to the package name (not a missing alias/phrase). The bench’s
`matched_on`/`why` fields are the attribution mechanism; a miss must name the
missing term before a rename is considered.
