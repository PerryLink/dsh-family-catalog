# External sync payload (dshfind / awesome-dsh)

Status: **prepared, not submitted**. (2026-11-08 check: awesome-dsh-plugin already lists **77** PerryLink entries; 13 of the top-20 discovery targets are missing.) The catalog side (`PLUGINS.md`, `data/hubs.json`,
`data/discovery.json`, `data/facets.json`) is the source of truth; this file lists
what an external submission should say so the three listings do not drift.

## dshfind

dshfind indexes PerryLink rows with technical categories (tools / memory / agent /
resource / channel) and has no domain taxonomy. Do not invent a new dshfind
category. Instead, put the domain words in the row description and keep the
existing technical category.

For each of the 10 hubs, the proposed row text is the hub's `queries` joined by
` · ` plus the first three workflow plugin names. Example:

```
报关与关务: 报关单品名金额不一致 · HS编码归类 · 信用证不符点 · 原产地RVC
(dsh-customs-doc-check, dsh-hs-classify, dsh-lc-doc-check)
```

Source: `data/hubs.json` (`id`, `nameZh`, `queries`, `workflow`).

## awesome-dsh

Add a single "Domain compliance & operations" section (do not scatter the 53
checkers across the existing technical sections). One line per hub, install
command pointing at the npm names, not the GitHub suite:

```md
### Domain compliance & operations

- [报关与关务](https://github.com/PerryLink/dsh-customs-doc-check) — 报关单/HS编码/信用证/原产地/出口管制: `dsh plugin --profile web add dsh-customs-doc-check dsh-hs-classify dsh-lc-doc-check`
- [招投标](https://github.com/PerryLink/dsh-bid-ca-precheck) — 符合性预检/资格/评分矩阵/质疑投诉: `dsh plugin --profile web add dsh-bid-ca-precheck dsh-bid-qual-check dsh-tender-matrix`
- [工程建设与 EHS](https://github.com/PerryLink/dsh-eia-guide-check) — 环评/监理/土壤地下水/HAZOP/应急: `dsh plugin --profile web add dsh-eia-guide-check dsh-site-log-check dsh-soilwater-check`
- [医疗病案](https://github.com/PerryLink/dsh-medrec-qc) — 病案首页/ICD/护理记录: `dsh plugin --profile web add dsh-medrec-qc dsh-icd-rule-check dsh-nurse-record-check`
- [法律与法务](https://github.com/PerryLink/dsh-evidence-check) — 证据清单/法条引用/起诉状: `dsh plugin --profile web add dsh-evidence-check dsh-lawcite-adapter dsh-pleading-draft`
- [财务运营](https://github.com/PerryLink/dsh-einvoice) — 电子发票/发票台账/银行对账/三单匹配: `dsh plugin --profile web add dsh-einvoice dsh-invoice-ledger dsh-bankrec dsh-ap-three-way`
- [公文与政务](https://github.com/PerryLink/dsh-gongwen-word-check) — 公文格式/流转时限/档案: `dsh plugin --profile web add dsh-gongwen-word-check dsh-gongwen-flow-check dsh-archive-check`
- [科研与教育](https://github.com/PerryLink/dsh-nsfc-form-check) — 国自然/文献库/开题: `dsh plugin --profile web add dsh-nsfc-form-check dsh-library dsh-essay-rubric-check`
- [质量管理](https://github.com/PerryLink/dsh-fmea-table-check) — FMEA/PPAP/SPC/CAPA: `dsh plugin --profile web add dsh-fmea-table-check dsh-ppap-check dsh-spc-gbt-adapter dsh-qms-capa`
- [数据与开发质量](https://github.com/PerryLink/dsh-table-ingest) — 表格入库/画像清洗/对账: `dsh plugin --profile web add dsh-table-ingest dsh-data-quality dsh-excel-reconcile`
```

## Checklist before submitting

1. Re-read the target repo's `CONTRIBUTING.md`; one PR per target.
2. Use the current `data/hubs.json`, not this static snapshot.
3. Do not claim the whole 53-checker suite is one install on a page that lists a
   single package; use the `dsh-check-pack` npm name for the suite.
4. Link the catalog search docs (`dsh-catalog/docs/search-api.md`) only if the
   target repo allows links to the author's own repos.

## awesome-dsh-plugin: what is actually missing (2026-11-08)

`awesome-dsh-plugin/awesome-dsh-plugin` stores one YAML per plugin in
`data/plugins/<owner>__<repo>.yml`; the READMEs are generated. A GitHub code
search for `PerryLink` returns **77** entries, including the old repo names
(`PerryLink__dsh-plugin-kit.yml`, `__dsh-plugin-doctor`, `__dsh-ticktick`,
`__dsh-github`, `__dsh-skill-pack-security`). Of the top-20 discovery targets,
these 13 are **not** listed:

```
dsh-hs-classify  dsh-nsfc-form-check  dsh-spc-gbt-adapter  dsh-lc-doc-check
dsh-ppap-check   dsh-eia-guide-check  dsh-hazplan-check    dsh-lawcite-adapter
dsh-ota-review-check  dsh-repair-order-qc  dsh-pipeline-check
dsh-ifc-qto      dsh-qms-capa
```

One entry, for reference (`data/plugins/PerryLink__dsh-einvoice.yml` shape):

```yaml
url: https://github.com/PerryLink/dsh-hs-classify
name: PerryLink/dsh-hs-classify
category: tools
description:
  en: 'HS code classification consistency check: chapter, heading, subheading and code hierarchy.'
  zh: 'HS 编码归类层级一致性核对：章、品目、子目与商品编号层级。'
```

Category must be one of the repo's list; do not invent one. Their contributing
guide asks for **one file per PR** and says the README is generated, so submit
individually or ask the maintainers before sending a 13-file PR. This repo's
`data/discovery.json` is the source for the descriptions.
