<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-family-catalog-hero-en-dark.webp">
  <img src="docs/assets/dsh-family-catalog-hero-en-light.webp" width="100%" alt="dsh-family-catalog: un manifiesto v1 para la familia de 152 paquetes — data/packages.json tiene 152 filas (151 repositorios PerryLink + 1 paquete de terceros), deploy/artifacts/v1/plugins.json publica 152 elementos estrictos con page.total 152, y data/facets.json cubre 152/152 plugins en 10 hubs de dominio">
</picture>

# dsh-family-catalog

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-family-catalog)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-family-catalog?metric=downloads)](https://dshfind.com/plugins/PerryLink/dsh-family-catalog?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

Una **fuente de catálogo estándar** de [DSH Community Market](https://github.com/anywhere-labs/dsh-desktop/tree/main/dsh-community-market) para la familia de plugins PerryLink DeepSeek Harness, generada a partir del registro de npm y validada contra los esquemas públicos del contrato v1. El `displayName` de cada elemento es bilingüe (English — 中文) y su `summary` lleva la línea en chino, para que el chino siga visible y buscable dentro de los estrictos campos 1.0.0. El par puramente chino y los metadatos de display/status que el esquema público no permite viven en `display.json`.

- Manifest: `catalog-source.json` (generado; véase Despliegue)
- Página del proveedor: `artifacts/v1/plugins.json` (generada)
- Fuente de verdad: `data/packages.json` (nombre npm → repositorio → nombre visible → categorías) + `data/npm-snapshot.json` (instantánea del registro de npm)
- Generador / validador: `scripts/build-catalog.mjs`, `scripts/validate.mjs`, `scripts/check-counts.mjs`
- Despliegue: en vivo en `https://perrylink-dsh-catalog.perrylink.workers.dev` (Cloudflare Workers, automatizado mediante `deploy.yml`; alternativa estática de Vercel en `vercel.json`; unidad Deno `deploy/deno-worker.js` como alternativa manual)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-family-catalog-flow-v5-dark.svg">
  <img src="docs/assets/dsh-family-catalog-flow-v5-light.svg" width="100%" alt="Diagrama de estructura de dsh-family-catalog: la instantánea del registro de npm (152 filas) alimenta data/packages.json y scripts/build-catalog.mjs escribe deploy/catalog-source.json y deploy/artifacts/v1/plugins.json (152 elementos estrictos); check-data, check-counts y check-facets actúan como puertas; el sidecar añade GET /v1/search, GET /v1/plugin y las herramientas MCP plugin_search y plugin_get; el despliegue corre en Cloudflare Workers, Vercel o Deno sobre un único origen HTTPS">
</picture>

*Estructura: registro de npm → data/packages.json → artefactos de despliegue → puertas → sidecar de búsqueda. Las etiquetas del diagrama son nombres reales de scripts, rutas y endpoints, por eso una sola imagen sirve para los cinco idiomas.*

## Estado de mantenimiento: herramienta interna de la familia

![dsh-family-catalog: una ejecución real en terminal — check-counts informa 152 paquetes derivados de data/packages.json, check-facets informa cobertura 152/152 con 133 active / 15 frozen / 3 retired / 1 unknown en 10 hubs, y search.mjs resuelve el número de norma IATF 16949 a dsh-ppap-check y luego a dsh-sop-sync-check](docs/assets/dsh-family-catalog-demo.gif)

*Animación: las puertas de solo lectura y el CLI de búsqueda del propio repositorio, re-ejecutados el 2026-11-21 — node scripts/check-counts.mjs, node scripts/check-facets.mjs y node scripts/search.mjs "IATF 16949" --limit=3. stdout real, sin llamadas de red.*

> **Reclasificado el 2026-10-05 — deliberadamente NO retirado.** Una revisión de toda la
> familia de plugins frente al harness oficial y al ecosistema más amplio clasificó este
> repositorio como **herramienta interna de la familia** en lugar de un producto. Su tarea es
> inventariar esta familia para el DSH Desktop Community Market, así que no compite
> con los catálogos de terceros y no necesita retirarse. Sigue mantenido.

### Un roster, una fuente

El catálogo es la superficie de descubrimiento, no una proyección 1:1 del roster
familiar. Lleva registros npm en `data/packages.json` (incluidos los registros
de la comunidad y de terceros, y los nombres retirados que se conservan para instalaciones antiguas).
Cada README por plugin lleva el mismo roster plegado.

## Notas de cumplimiento

- Contrato: [catalog-provider-contract.md](https://github.com/anywhere-labs/dsh-desktop/blob/main/dsh-community-market/docs/catalog-provider-contract.md) (v1, `manifestVersion`/`schemaVersion` `1.0.0`). Los esquemas no están vendorizados en ninguna parte de este repositorio; `scripts/validate.mjs` reproduce las reglas estructurales de `catalog-source.schema.json` y `catalog-provider-page.schema.json`, además de las reglas entre campos (ids de elemento únicos, patrón de nombre npm, sin comandos de instalación en los elementos, URLs de repositorio HTTPS, forma de la página).
- El proveedor anuncia `query.supported = ["cursor","limit"]`, `defaultLimit = maxLimit = 100`, `sorts = []`. El endpoint sirve el catálogo completo de 152 elementos en páginas de cursor de hasta 100 elementos (dos peticiones), de modo que DSH Desktop escanea todo el catálogo sin superar el límite por página del entorno de ejecución. El espejo estático de Vercel sirve el JSON sin paginar de 152 elementos para navegar; usa el manifest de workers.dev para Desktop.
- Cada elemento lleva `package.registry = "npm"` + `package.name` y un `repository.url` canónico; nunca se emiten comandos de instalación, fragmentos de shell ni datos ejecutables.
- Cada elemento lleva además un `media.icon` del mismo origen (`/icons/<slug>.png`, generado de forma determinista por `scripts/build-icons.mjs`); el Worker sirve los PNG él mismo, así que los iconos permanecen en el origen del catálogo como exige la regla de medios del market.
- El endpoint del manifest y el manifest en sí deben compartir un único origen HTTPS (regla del market). El endpoint de marcador de posición generado `https://replace-with-deploy-origin.invalid/...` se sustituye por el origen real de despliegue en el momento del despliegue — no registres la URL de marcador de posición en DSH Desktop.

## Compilación

```sh
node scripts/build-catalog.mjs            # placeholder endpoint
node scripts/validate.mjs                 # structural checks
node scripts/build-catalog.mjs https://<your-project>.deno.dev   # real origin
```

`build-catalog.mjs` escribe el manifest y la página del proveedor en la raíz del repositorio **y** replica ambos en `deploy/`, de modo que `deploy/deno-worker.js` es una unidad Deno Deploy autocontenida (sus importaciones `./` siempre se resuelven).

`data/npm-snapshot.json` se refresca de forma segura para UTF-8 con:

```sh
node scripts/refresh-snapshot.mjs   # re-fetch every package from registry.npmjs.org
```

> Un workflow programado (`.github/workflows/refresh-catalog.yml`) lo ejecuta a diario
> y abre un solo PR en `chore/catalog-refresh` únicamente cuando el registro cambió.
> Ejecuta las puertas de datos/artefactos/tipos antes de abrir el PR; fusionar el PR
> dispara el workflow de despliegue. El comando manual anterior es para una actualización
> forzada.

### Mantenimiento de `data/`

`data/packages.json` y `data/npm-snapshot.json` son **una sola unidad**: un paquete nuevo o renombrado
necesita su fila de instantánea *en el mismo commit*. Dos despliegues consecutivos de `main` fallaron el
2026-09-09 exactamente así — primero una coma que faltaba en `data/packages.json`, luego un paquete
listado sin su fila de instantánea (`Error: npm snapshot missing for …`). Ambos se detectan localmente
con la puerta de pre-push; actívala una vez por clon:

```sh
git config core.hooksPath .githooks   # then every push runs node scripts/check-data.mjs
```

`scripts/check-data.mjs` es de solo lectura. **No** uses `node scripts/build-catalog.mjs` como
puerta: llamado sin argumento reescribe los artefactos de `deploy/` versionados con el
origen de marcador de posición.

El recuento de la familia **no** se mantiene a mano: `scripts/check-counts.mjs` lo deriva de
`data/packages.json` y sujeta a esa única fuente todos los lugares que lo enuncian — los resúmenes del README (EN + ZH), la
descripción del manifest, los `items`/`page.total` de la página publicada y el umbral de la prueba de humo en vivo del despliegue.
Ejecútalo para verificar, o `node scripts/check-counts.mjs --write` para reescribir
los puntos del README donde aparece el recuento a partir de la fuente. Existe porque el número se desvió de hecho: el README y el
manifest anunciaban una familia un paquete más grande que la página realmente publicaba (las cifras concretas y el commit que las corrigió están registrados en la cabecera de `scripts/check-counts.mjs`).

`.github/workflows/ci.yml` ejecuta `scripts/check-data.mjs`, `scripts/check-counts.mjs` y el
par build/validate en cada push a `main` y en cada pull request, así que el hook anterior es una
comodidad más que la única línea de defensa. `scripts/validate.mjs` resuelve primero los
espejos versionados de `deploy/` — la carga útil que realmente se publica, y la única copia que tiene un clon limpio —
y sujeta `page.total` a `items.length`. Después CI reconstruye para comprobar que el
`deploy/catalog-source.json` versionado sigue coincidiendo, lo que detecta un cambio en `data/` que nunca se
replicó en `deploy/`. Esa reconstrucción es el único lugar donde la forma sin argumento es segura: el
checkout del runner es desechable y el manifest no lleva marca de tiempo, así que es
reproducible byte a byte.

## Despliegue

**En vivo**: `https://perrylink-dsh-catalog.perrylink.workers.dev` (Cloudflare Workers, desplegado automáticamente por el workflow `deploy`).

Canales automatizados — el workflow reconstruye el manifest con el origen en vivo, valida y luego despliega; cada canal se omite con elegancia cuando falta su secreto de token:

- **Cloudflare Workers** (activo): `deploy/wrangler.toml` + `deploy/cloudflare-worker.js`. Requiere los secretos `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. Despliegue en dos pasadas: primero sube el worker con el origen de marcador de posición, lee la URL `*.workers.dev` asignada, reconstruye el manifest fijado a ese origen y vuelve a desplegar. Recurre a Cloudflare Pages (`.pages.dev`) cuando `workers.dev` no está disponible.
- **Vercel**: `vercel.json` reescribe `/v1/plugins` → `artifacts/v1/plugins.json`. Requiere `VERCEL_TOKEN`.
- **Deno Deploy** (manual): `deploy/deno-worker.js` autocontenido; reconstruye con `node scripts/build-catalog.mjs https://<your-project>.deno.dev` antes de desplegar.

El sitio sirve `GET /catalog-source.json` y `GET /v1/plugins` como `application/json` en un único origen HTTPS.

## Uso en DSH Desktop

Abre el Market integrado → **Sources** → añadir fuente → pega la URL del manifest `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` → selecciónala. La navegación es de solo lectura; la instalación de cualquier plugin listado pasa por la verificación de identidad npm y la confirmación del usuario del propio Market.

Un listado en este catálogo es metadatos, no una revisión de seguridad. Los mismos plugins también tienen registros de evidencia en [dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification) y acceso MCP mediante [dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp).

## Búsqueda de descubrimiento y MCP

La página de proveedor 1.0.0 es lo que lee DSH Desktop, y su búsqueda es un único `includes` sobre la cadena completa de `id/name/displayName/summary/description/publisher/keywords`. Eso pierde las palabras de dominio en chino que solo viven en `summaryZh`. El sidecar lo corrige sin cambiar el esquema de elemento 1.0.0:

- `data/discovery.json` — 152 manifests de descubrimiento válidos según el esquema (las 85 filas derivadas del catálogo se revisaron el 2026-11-09 y se normalizaron sus limitaciones) con alias, searchPhrases, audience, facets, maturity y coverage.
- `data/facets.json` — sidecar facet/status 152/152 (domains, subdomains, tasks, artifacts, standards, maintenance, maturity, coverage, replacement).
- `data/hubs.json` — 10 hubs de dominio (customs, tender, construction-ehs, medical, legal, finance, government, research, quality, data).
- `GET /v1/search?q=&domain=&task=&audience=&limit=` y `GET /v1/plugin?name=` en ambos workers.
- `mcp/plugin-search-server.mjs` — MCP stdio con `plugin_search` / `plugin_get`.

```sh
node scripts/build-discovery.mjs
node scripts/discovery-bench.mjs --source=index --fail-under=85
node scripts/worker-smoke.mjs
node scripts/mcp-smoke.mjs
```

Consulta [docs/search-api.md](docs/search-api.md) para la forma de la respuesta, la configuración MCP y las advertencias conocidas del contrato 1.0.0.

---

## Nota en chino

Fuente de catálogo estándar del [DSH Community Market](https://github.com/anywhere-labs/dsh-desktop/tree/main/dsh-community-market) para toda la familia PerryLink: 152 paquetes npm (151 repositorios PerryLink + el tercero `dsh-phocinae`, que solo se incluye en paralelo y no cuenta como obra de la familia), generados a partir del registro de npm y validados estructuralmente según el contrato público v1; el `displayName` de cada elemento es bilingüe (English — 中文), su `summary` lleva la frase en chino, de modo que el chino se muestra y se busca dentro de los estrictos campos 1.0.0; el par puramente chino y los metadatos fuera de esquema, como el estado, viven en el sidecar `display.json`. Ya está en línea en Cloudflare Workers (`perrylink-dsh-catalog.perrylink.workers.dev`, desplegado automáticamente por el workflow deploy; la reescritura estática de Vercel y Deno Deploy son canales alternativos). Cada elemento lleva además un icono `media.icon` del mismo origen (`/icons/*.png`, generado de forma determinista por `scripts/build-icons.mjs`). En DSH Desktop, añade la URL del manifest en Market → Sources para navegar (la navegación es de solo lectura; la instalación sigue pasando por la verificación de identidad npm y la confirmación del usuario del propio market). El dominio de marcador de posición `replace-with-deploy-origin.invalid` de los artefactos generados se sustituye al desplegar; no registres la dirección de marcador de posición. **Disciplina de mantenimiento**: `data/packages.json` y `data/npm-snapshot.json` deben actualizarse en pareja en el mismo commit (los dos despliegues consecutivos de `main` en rojo del 2026-09-09 vinieron de aquí: primero una coma olvidada, luego un paquete nuevo sin su fila de instantánea npm); tras ejecutar una vez `git config core.hooksPath .githooks`, cada push ejecuta la puerta de solo lectura `scripts/check-data.mjs`. No uses `node scripts/build-catalog.mjs` sin argumentos como puerta — reescribe los artefactos de `deploy/` ya versionados con el dominio de marcador de posición. **CI**: `.github/workflows/ci.yml` ejecuta `scripts/check-data.mjs`, `scripts/check-counts.mjs` y build+validate en cada push a `main` y en cada PR; `scripts/validate.mjs` lee por defecto los artefactos versionados de `deploy/` (la carga útil que realmente se publica, la única que existe en un clon limpio) y fija `page.total` a `items.length`; después reconstruye y comprueba que `deploy/catalog-source.json` no esté desactualizado, lo que detecta haber cambiado `data/` sin reconstruir `deploy/`; esa reconstrucción es segura en el checkout desechable de CI porque el manifest no lleva marca de tiempo y es reproducible byte a byte. **Fuente única del recuento**: el número de paquetes siempre se deriva de `data/packages.json` — `scripts/check-counts.mjs` verifica que README (EN+ZH)/manifest/artefactos/umbral de la prueba de humo del despliegue coincidan, y `--write` puede reescribir el recuento del README desde esa fuente; no se escribe a mano.

## Licencia

Apache-2.0. Los datos del catálogo derivan del registro de npm y de los repositorios de plugins de PerryLink.

**Línea de la familia DSH:** este repositorio pertenece a la **familia de plugins PerryLink DeepSeek Harness**, cuya línea actual es `dsh-v0.1.7-rc.2`.


## PerryLink DSH Plugin Family

Este proyecto forma parte de la familia de plugins de DeepSeek Harness de [PerryLink](https://github.com/PerryLink). El roster permanece plegado abajo para que cada README conserve una primera pantalla corta; expándelo para ver cada fila y su estado.

<details>
<summary>Expandir todos los plugins</summary>

| Plugin | Estado |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
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
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
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
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver el README del repositorio |

</details>
