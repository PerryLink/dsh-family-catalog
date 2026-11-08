# Discovery search API and MCP server

The catalog's 1.0.0 provider page stays exactly as it is (it is what DSH Desktop
reads). This document describes the **sidecar** discovery layer built on top of
it: a search index, a search core, two worker endpoints and a stdio MCP server.

## Data flow

```
data/packages.json (126)  ─┐
data/discovery.json (40)  ─┼─> scripts/build-discovery.mjs ─> artifacts/v1/search-index.json
data/npm-snapshot.json    ─┘                                   deploy/artifacts/v1/search-index.json

lib/search-core.mjs (no fs) ─> scripts/search.mjs (Node + CLI)
                            ├─> deploy/deno-worker.js        GET /v1/search, /v1/plugin
                            ├─> deploy/cloudflare-worker.js  GET /v1/search, /v1/plugin
                            └─> mcp/plugin-search-server.mjs  plugin_search, plugin_get
```

The 40 rows in `data/discovery.json` are schema-valid discovery manifests
(aliases, searchPhrases, audience, facets, maturity, coverage, related,
demoPrompt). The other 86 rows are indexed from their catalog fields so search
does not regress for them. The index is a sidecar: none of these fields enter the
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
node scripts/check-facets.mjs             # 126/126 coverage, hubs, status counts
node scripts/discovery-bench.mjs --source=index --fail-under=85
node scripts/worker-smoke.mjs             # 10/10 routes
node scripts/mcp-smoke.mjs                # 9/9 MCP calls
```

Current bench (2026-11-08): 50 queries, top3 50/50 (100%), zero-result 0/50,
MRR@5 0.987. Desktop's whole-string `includes` replay over the same 50 queries:
top3 35/50 (70%), zero-result 15/50.

## Known limits

1. **The 1.0.0 page is still what Desktop fetches.** The current payload carries
   display-only fields the public schema rejects (`displayNameZh`, `summaryZh`,
   `status`, `group`, `requires`, `difficulty`, `conflicts`) and one page of 126
   items exceeds the runtime's `defaultLimit` check. Until the market confirms
   an extension or the provider implements pagination, this API/MCP path is the
   usable search surface; the page remains unchanged.
2. 40/126 rows have the rich discovery metadata. The rest are indexed from
   catalog fields; extending them is P4 work.
3. Scores are deliberately simple (field weights + IDF-weighted CJK n-grams),
   not a learned ranker. `matched_on`/`why` are there so a wrong hit can be
   attributed.
