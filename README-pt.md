<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-family-catalog-hero-en-dark.webp">
  <img src="docs/assets/dsh-family-catalog-hero-en-light.webp" width="100%" alt="dsh-family-catalog: um manifesto v1 para a família de 152 pacotes — data/packages.json tem 152 linhas (151 repositórios PerryLink + 1 pacote de terceiros), deploy/artifacts/v1/plugins.json publica 152 itens estritos com page.total 152, e data/facets.json cobre 152/152 plugins em 10 hubs de domínio">
</picture>

# dsh-family-catalog

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-family-catalog)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-family-catalog?metric=downloads)](https://dshfind.com/plugins/PerryLink/dsh-family-catalog?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

Uma **fonte de catálogo padrão** do [DSH Community Market](https://github.com/anywhere-labs/dsh-desktop/tree/main/dsh-community-market) para a família de plugins PerryLink DeepSeek Harness, gerada a partir do registry do npm e validada contra os esquemas públicos do contrato v1. O `displayName` de cada item é bilíngue (English — 中文) e seu `summary` carrega a linha em chinês, para que o chinês permaneça visível e pesquisável dentro dos estritos campos 1.0.0. O par puramente chinês e os metadados de display/status que o esquema público não permite ficam em `display.json`.

- Manifest: `catalog-source.json` (gerado; veja Implantação)
- Página do provedor: `artifacts/v1/plugins.json` (gerada)
- Fonte da verdade: `data/packages.json` (nome npm → repositório → nome de exibição → categorias) + `data/npm-snapshot.json` (snapshot do registry do npm)
- Gerador / validador: `scripts/build-catalog.mjs`, `scripts/validate.mjs`, `scripts/check-counts.mjs`
- Implantação: no ar em `https://perrylink-dsh-catalog.perrylink.workers.dev` (Cloudflare Workers, automatizado via `deploy.yml`; alternativa estática no Vercel em `vercel.json`; unidade Deno `deploy/deno-worker.js` como alternativa manual)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-family-catalog-flow-v5-dark.svg">
  <img src="docs/assets/dsh-family-catalog-flow-v5-light.svg" width="100%" alt="Diagrama de estrutura do dsh-family-catalog: o snapshot do registry do npm (152 linhas) alimenta data/packages.json e scripts/build-catalog.mjs grava deploy/catalog-source.json e deploy/artifacts/v1/plugins.json (152 itens estritos); check-data, check-counts e check-facets atuam como portões; o sidecar acrescenta GET /v1/search, GET /v1/plugin e as ferramentas MCP plugin_search e plugin_get; a implantação roda em Cloudflare Workers, Vercel ou Deno em uma única origem HTTPS">
</picture>

*Estrutura: registry do npm → data/packages.json → artefatos de implantação → portões → sidecar de busca. Os rótulos do diagrama são nomes reais de script, caminhos e endpoints, então uma única imagem serve aos cinco idiomas.*

## Estado de manutenção: ferramenta interna da família

![dsh-family-catalog: execução real em terminal — check-counts informa 152 pacotes derivados de data/packages.json, check-facets informa cobertura 152/152 com 133 active / 15 frozen / 3 retired / 1 unknown em 10 hubs, e search.mjs resolve o número de norma IATF 16949 para dsh-ppap-check e depois para dsh-sop-sync-check](docs/assets/dsh-family-catalog-demo.gif)

*Animação: os portões somente leitura e o CLI de busca do próprio repositório, reexecutados em 2026-11-21 — node scripts/check-counts.mjs, node scripts/check-facets.mjs e node scripts/search.mjs "IATF 16949" --limit=3. stdout real, sem chamadas de rede.*

> **Reclassificado em 2026-10-05 — deliberadamente NÃO aposentado.** Uma revisão de toda a
> família de plugins frente ao harness oficial e ao ecossistema mais amplo classificou este
> repositório como **ferramenta interna da família** em vez de produto. Seu trabalho é
> inventariar esta família para o DSH Desktop Community Market, então ele não compete
> com catálogos de terceiros e não precisa ser aposentado. Continua mantido.

### Um roster, uma fonte

O catálogo é a superfície de descoberta, não uma projeção 1:1 do roster
da família. Ele carrega registros npm em `data/packages.json` (incluindo registros
da comunidade e de terceiros, e os nomes aposentados mantidos para instalações antigas).
Cada README por plugin carrega o mesmo roster recolhido.

## Notas de conformidade

- Contrato: [catalog-provider-contract.md](https://github.com/anywhere-labs/dsh-desktop/blob/main/dsh-community-market/docs/catalog-provider-contract.md) (v1, `manifestVersion`/`schemaVersion` `1.0.0`). Os esquemas não são vendorizados em lugar nenhum deste repositório; `scripts/validate.mjs` espelha as regras estruturais de `catalog-source.schema.json` e `catalog-provider-page.schema.json` e as regras entre campos (ids de item únicos, padrão de nome npm, sem comandos de instalação nos itens, URLs de repositório HTTPS, formato da página).
- O provedor anuncia `query.supported = ["cursor","limit"]`, `defaultLimit = maxLimit = 100`, `sorts = []`. O endpoint serve o catálogo completo de 152 itens em páginas de cursor de até 100 itens (duas requisições), de modo que o DSH Desktop varre o catálogo inteiro sem exceder o limite por página do runtime. O espelho estático do Vercel serve o JSON sem paginação de 152 itens para navegação; use o manifest do workers.dev para o Desktop.
- Cada item carrega `package.registry = "npm"` + `package.name` e um `repository.url` canônico; nenhum comando de instalação, fragmento de shell ou dado executável é emitido.
- Cada item também carrega um `media.icon` da mesma origem (`/icons/<slug>.png`, gerado deterministicamente por `scripts/build-icons.mjs`); o Worker serve os PNGs ele mesmo, então os ícones permanecem na origem do catálogo como a regra de mídia do market exige.
- O endpoint do manifest e o próprio manifest devem compartilhar uma única origem HTTPS (regra do market). O endpoint de placeholder gerado `https://replace-with-deploy-origin.invalid/...` é substituído pela origem real de implantação no momento do deploy — não registre a URL de placeholder no DSH Desktop.

## Build

```sh
node scripts/build-catalog.mjs            # placeholder endpoint
node scripts/validate.mjs                 # structural checks
node scripts/build-catalog.mjs https://<your-project>.deno.dev   # real origin
```

`build-catalog.mjs` grava o manifest e a página do provedor na raiz do repositório **e** espelha ambos em `deploy/`, então `deploy/deno-worker.js` é uma unidade Deno Deploy autocontida (seus imports `./` sempre resolvem).

`data/npm-snapshot.json` é atualizado com segurança para UTF-8 com:

```sh
node scripts/refresh-snapshot.mjs   # re-fetch every package from registry.npmjs.org
```

> Um workflow agendado (`.github/workflows/refresh-catalog.yml`) executa isso diariamente
> e abre um único PR em `chore/catalog-refresh` somente quando o registry mudou.
> Ele roda os portões de dados/artefatos/tipos antes de abrir o PR; o merge do PR
> dispara o workflow de deploy. O comando manual acima é para uma atualização
> forçada.

### Manutenção de `data/`

`data/packages.json` e `data/npm-snapshot.json` são **uma só unidade**: um pacote novo ou renomeado
precisa de sua linha de snapshot *no mesmo commit*. Dois deploys consecutivos de `main` ficaram vermelhos em
2026-09-09 exatamente assim — primeiro uma vírgula faltando em `data/packages.json`, depois um pacote
listado sem sua linha de snapshot (`Error: npm snapshot missing for …`). Ambos são pegos localmente
pelo portão de pré-push; habilite-o uma vez por clone:

```sh
git config core.hooksPath .githooks   # then every push runs node scripts/check-data.mjs
```

`scripts/check-data.mjs` é somente leitura. **Não** use `node scripts/build-catalog.mjs` como
portão: chamado sem argumento, ele reescreve os artefatos de `deploy/` versionados com a
origem de placeholder.

A contagem da família **não** é mantida à mão: `scripts/check-counts.mjs` a deriva de
`data/packages.json` e prende a essa única fonte todos os lugares que a declaram — os resumos do README (EN + ZH), a
descrição do manifest, os `items`/`page.total` da página publicada e o piso do live-smoke de deploy.
Execute-o para verificar, ou `node scripts/check-counts.mjs --write` para reescrever
os pontos do README que declaram a contagem a partir da fonte. Ele existe porque o número de fato derivou: o README e o
manifest anunciavam uma família um pacote maior do que a página realmente publicava (os números concretos e o commit que os corrigiu estão registrados no cabeçalho de `scripts/check-counts.mjs`).

`.github/workflows/ci.yml` executa `scripts/check-data.mjs`, `scripts/check-counts.mjs` e o
par build/validate em cada push para `main` e em cada pull request, então o hook acima é uma
conveniência mais do que a única linha de defesa. `scripts/validate.mjs` resolve primeiro os
espelhos versionados de `deploy/` — o payload que realmente é publicado, e a única cópia que um clone limpo tem —
e prende `page.total` a `items.length`. Em seguida a CI recompila para verificar que o
`deploy/catalog-source.json` versionado ainda corresponde, o que pega uma mudança em `data/` que nunca foi
espelhada em `deploy/`. Essa recompilação é o único lugar em que a forma sem argumento é segura: o
checkout do runner é descartável e o manifest não carrega timestamp, então ele é
reprodutível byte a byte.

## Implantação

**No ar**: `https://perrylink-dsh-catalog.perrylink.workers.dev` (Cloudflare Workers, implantado automaticamente pelo workflow `deploy`).

Canais automatizados — o workflow recompila o manifest com a origem no ar, valida e então implanta; cada canal é ignorado com elegância quando seu segredo de token está ausente:

- **Cloudflare Workers** (ativo): `deploy/wrangler.toml` + `deploy/cloudflare-worker.js`. Requer os segredos `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. Deploy em duas passadas: primeiro envia o worker com a origem de placeholder, lê a URL `*.workers.dev` atribuída, recompila o manifest fixado nessa origem e reimplanta. Recorre ao Cloudflare Pages (`.pages.dev`) quando `workers.dev` não está disponível.
- **Vercel**: `vercel.json` reescreve `/v1/plugins` → `artifacts/v1/plugins.json`. Requer `VERCEL_TOKEN`.
- **Deno Deploy** (manual): `deploy/deno-worker.js` autocontido; recompile com `node scripts/build-catalog.mjs https://<your-project>.deno.dev` antes de implantar.

O site serve `GET /catalog-source.json` e `GET /v1/plugins` como `application/json` em uma única origem HTTPS.

## Uso no DSH Desktop

Abra o Market integrado → **Sources** → adicionar fonte → cole a URL do manifest `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` → selecione-a. A navegação é somente leitura; a instalação de qualquer plugin listado passa pela verificação de identidade npm e pela confirmação do usuário do próprio Market.

Uma listagem neste catálogo é metadado, não uma revisão de segurança. Os mesmos plugins também têm registros de evidência em [dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification) e acesso MCP via [dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp).

## Busca de descoberta e MCP

A página de provedor 1.0.0 é o que o DSH Desktop lê, e sua busca é um único `includes` sobre a string inteira de `id/name/displayName/summary/description/publisher/keywords`. Isso perde as palavras de domínio em chinês que só vivem em `summaryZh`. O sidecar corrige isso sem alterar o esquema de item 1.0.0:

- `data/discovery.json` — 152 manifests de descoberta válidos pelo esquema (as 85 linhas derivadas do catálogo foram revisadas em 2026-11-09 e suas limitações normalizadas) com aliases, searchPhrases, audience, facets, maturity e coverage.
- `data/facets.json` — sidecar facet/status 152/152 (domains, subdomains, tasks, artifacts, standards, maintenance, maturity, coverage, replacement).
- `data/hubs.json` — 10 hubs de domínio (customs, tender, construction-ehs, medical, legal, finance, government, research, quality, data).
- `GET /v1/search?q=&domain=&task=&audience=&limit=` e `GET /v1/plugin?name=` nos dois workers.
- `mcp/plugin-search-server.mjs` — MCP stdio com `plugin_search` / `plugin_get`.

```sh
node scripts/build-discovery.mjs
node scripts/discovery-bench.mjs --source=index --fail-under=85
node scripts/worker-smoke.mjs
node scripts/mcp-smoke.mjs
```

Veja [docs/search-api.md](docs/search-api.md) para o formato da resposta, a configuração MCP e as ressalvas conhecidas do contrato 1.0.0.

---

## Nota em chinês

Fonte de catálogo padrão do [DSH Community Market](https://github.com/anywhere-labs/dsh-desktop/tree/main/dsh-community-market) para toda a família PerryLink: 152 pacotes npm (151 repositórios PerryLink + o terceiro `dsh-phocinae`, que é apenas incluído lado a lado e não conta como obra da família), gerados a partir do registry do npm e validados estruturalmente segundo o contrato público v1; o `displayName` de cada item é bilíngue (English — 中文), seu `summary` carrega a frase em chinês, de modo que o chinês aparece e é pesquisável dentro dos estritos campos 1.0.0; o par puramente chinês e os metadados fora do esquema, como o status, ficam no sidecar `display.json`. Já está no ar no Cloudflare Workers (`perrylink-dsh-catalog.perrylink.workers.dev`, implantado automaticamente pelo workflow deploy; a reescrita estática do Vercel e o Deno Deploy são canais alternativos). Cada item também carrega um ícone `media.icon` da mesma origem (`/icons/*.png`, gerado deterministicamente por `scripts/build-icons.mjs`). No DSH Desktop, adicione a URL do manifest em Market → Sources para navegar (a navegação é somente leitura; a instalação continua passando pela verificação de identidade npm e pela confirmação do usuário do próprio market). O domínio de placeholder `replace-with-deploy-origin.invalid` dos artefatos gerados é substituído no deploy; não registre o endereço de placeholder. **Disciplina de manutenção**: `data/packages.json` e `data/npm-snapshot.json` devem ser atualizados em par no mesmo commit (os dois deploys consecutivos de `main` vermelhos em 2026-09-09 vieram daqui: primeiro uma vírgula esquecida, depois um pacote novo sem sua linha de snapshot npm); depois de executar uma vez `git config core.hooksPath .githooks`, cada push roda o portão somente leitura `scripts/check-data.mjs`. Não use `node scripts/build-catalog.mjs` sem argumentos como portão — ele reescreve os artefatos de `deploy/` já versionados com o domínio de placeholder. **CI**: `.github/workflows/ci.yml` roda `scripts/check-data.mjs`, `scripts/check-counts.mjs` e build+validate em cada push para `main` e em cada PR; `scripts/validate.mjs` lê por padrão os artefatos versionados de `deploy/` (o payload que realmente é publicado, a única cópia que existe em um clone limpo) e prende `page.total` a `items.length`; em seguida recompila e verifica que `deploy/catalog-source.json` não esteja desatualizado, o que detecta ter mudado `data/` sem recompilar `deploy/`; essa recompilação é segura no checkout descartável da CI porque o manifest não carrega timestamp e é reprodutível byte a byte. **Fonte única da contagem**: o número de pacotes é sempre derivado de `data/packages.json` — `scripts/check-counts.mjs` verifica que README (EN+ZH)/manifest/artefatos/piso do smoke de deploy coincidam, e `--write` pode reescrever a contagem do README a partir dessa fonte; não se escreve à mão.

## Licença

Apache-2.0. Os dados do catálogo derivam do registry do npm e dos repositórios de plugins da PerryLink.

**Linha da família DSH:** este repositório pertence à **família de plugins PerryLink DeepSeek Harness**, cuja linha atual é `dsh-v0.1.7-rc.2`.


## PerryLink DSH Plugin Family

Este projeto faz parte da família de plugins do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O roster fica recolhido abaixo para que cada README mantenha uma primeira tela curta; expanda-o para ver cada linha e seu status.

<details>
<summary>Expandir todos os plugins</summary>

| Plugin | Status |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-check-pack](https://github.com/PerryLink/dsh-check-pack)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-clinic](https://github.com/PerryLink/dsh-clinic)** |  |
| **[dsh-codemod](https://github.com/PerryLink/dsh-codemod)** |  |
| **[dsh-community-bench](https://github.com/PerryLink/dsh-community-bench)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-dida](https://github.com/PerryLink/dsh-dida)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github-bot](https://github.com/PerryLink/dsh-github-bot)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-param-repair](https://github.com/PerryLink/dsh-param-repair)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-phocinae](https://github.com/PerryLink/dsh-phocinae)** |  |
| **[dsh-phone-inbox](https://github.com/PerryLink/dsh-phone-inbox)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-primer](https://github.com/PerryLink/dsh-primer)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-scaffold](https://github.com/PerryLink/dsh-scaffold)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-security-pack](https://github.com/PerryLink/dsh-security-pack)** |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |

</details>
