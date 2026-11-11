# Discovery search API and MCP server

The catalog's 1.0.0 provider page stays exactly as it is (it is what DSH Desktop
reads). This document describes the **sidecar** discovery layer built on top of
it: a search index, a search core, two worker endpoints and a stdio MCP server.

## Data flow

```
data/packages.json (152)  ─┐
data/discovery.json (40)  ─┼─> scripts/build-discovery.mjs ─> artifacts/v1/search-index.json
data/npm-snapshot.json    ─┘                                   deploy/artifacts/v1/search-index.json

lib/search-core.mjs (no fs) ─> scripts/search.mjs (Node + CLI)
                            ├─> deploy/deno-worker.js        GET /v1/search, /v1/plugin
                            ├─> deploy/cloudflare-worker.js  GET /v1/search, /v1/plugin
                            └─> mcp/plugin-search-server.mjs  plugin_search, plugin_get
```

The 152 rows in `data/discovery.json` are schema-valid discovery manifests
(aliases, searchPhrases, audience, facets, maturity, coverage, related,
demoPrompt): all 152 are reviewed — the five research packages added on 2026-11-11
are the most recent — the 85 catalog-derived rows had their limitations
normalized, and the pending-review flag was cleared. The index is a sidecar: none of these fields enter the
1.0.0 item schema.

## HTTP endpoints

Both workers serve the same routes.

### `GET /v1/search?q=<query>&domain=&task=&audience=&limit=5`

- `q` is required; a missing/blank query returns HTTP 400.
- `domain` / `task` / `audience` are optional facet filters.
- `limit` is 1..20 (default 5).

```sh
curl -s 'https://perrylink-dsh-catalog.perrylink.workers.dev/v1/search?q=HS%E7%BC%96%E7%A0%81&limit=3'
```

```json
{
  "query": "HS编码",
  "cleaned": "hs编码",
  "expansions": ["hs code", "商品编码", "海关编码", "税则号列", "商品归类"],
  "total": 1,
  "results": [
    {
      "name": "dsh-hs-classify",
      "displayNameZh": "商品归类层级核对",
      "score": 24.5,
      "matched_on": ["alias:HS编码", "keyword", "searchPhrase"],
      "why": "别名命中；用户问法命中；关键词命中；领域：customs/trade",
      "maturity": "beta",
      "coverage": { "lastReviewed": "2026-11-08" },
      "facets": { "domains": ["customs", "trade"], "tasks": ["checker", "classifier"] },
      "install": "dsh plugin --profile web add dsh-hs-classify"
    }
  ]
}
```

### `GET /v1/plugin?name=<npm name>`

Returns the full index record for one plugin, or HTTP 404.

### `GET /v1/hubs`

Returns the 10 domain hubs (id, Chinese name, audience, example queries, ordered workflow, standards). Source: `data/hubs.json`.

### Existing routes

`GET /catalog-source.json`, `GET /v1/plugins`, `GET /icons/*.png` are unchanged.

## MCP server

```sh
node mcp/plugin-search-server.mjs
```

Example client config (stdio):

```json
{
  "mcpServers": {
    "dsh-plugin-search": {
      "command": "node",
      "args": ["D:/Projects/dsh/plugins/dsh-catalog/mcp/plugin-search-server.mjs"]
    }
  }
}
```

Tools:

| Tool | Input | Output |
|---|---|---|
| `plugin_search` | `query` (required), `domain?`, `task?`, `audience?`, `limit?` | ranked `results` with `matched_on`, `why`, `install` |
| `plugin_get` | `name` | full index record |

The `plugin_search` description carries six Chinese example questions so an
agent has concrete query shapes before it calls the tool.

## Rebuild and checks

```sh
node scripts/build-discovery.mjs          # index + deploy/search-core.mjs
node scripts/build-facets.mjs             # P2 facet/status sidecar
node scripts/check-facets.mjs             # 152/152 coverage, hubs, status counts
node scripts/discovery-bench.mjs --source=index --fail-under=85
node scripts/worker-smoke.mjs             # 11/11 routes
node scripts/mcp-smoke.mjs                # 9/9 MCP calls
```

Current bench (2026-11-08): 58 queries, top1 57/58, top3 58/58 (100%), zero-result 0/58,
MRR@5 0.991. Desktop's whole-string `includes` replay over the same 58 queries:
top3 38/58 (65.5%), zero-result 20/58.

Held-out bench (20 phrasings never written into any metadata, measured once):
top1 17/20, top3 19/20 (95%), zero-result 0/20, MRR@5 0.900. The single top3 miss is
`来源原文支持这条断言吗` (claim-check); it is recorded, not tuned away.

## Known limits

1. **The 1.0.0 page is now strict.** Extra fields moved to `display.json`; the
   Chinese name is embedded in `displayName` and the Chinese line in `summary`.
   The page is served as 100 + 47 cursor pages (`supported=[cursor,limit]`,
   `defaultLimit=maxLimit=100`), and the full page passes Ajv strict against the
   upstream schema. The Vercel static mirror is not paginated; register the
   workers.dev manifest, not the Vercel one.
2. 152/152 rows have reviewed discovery metadata; the 85 catalog-derived rows
   were reviewed on 2026-11-09 and their limitations normalized.
3. Scores are deliberately simple (field weights + IDF-weighted CJK n-grams),
   not a learned ranker. `matched_on`/`why` are there so a wrong hit can be
   attributed.
