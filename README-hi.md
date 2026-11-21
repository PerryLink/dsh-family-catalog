<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-family-catalog-hero-en-dark.webp">
  <img src="docs/assets/dsh-family-catalog-hero-en-light.webp" width="100%" alt="dsh-family-catalog: 152 पैकेजों के परिवार के लिए एक v1 मैनिफ़ेस्ट — data/packages.json में 152 पंक्तियाँ (151 PerryLink रिपॉज़िटरी + 1 तृतीय-पक्ष पैकेज), deploy/artifacts/v1/plugins.json में page.total 152 के साथ 152 सख्त आइटम, और data/facets.json 10 डोमेन hub में 152/152 प्लगइन कवर करता है">
</picture>

# dsh-family-catalog

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-family-catalog)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-family-catalog?metric=downloads)](https://dshfind.com/plugins/PerryLink/dsh-family-catalog?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

PerryLink DeepSeek Harness प्लगइन परिवार के लिए [DSH Community Market](https://github.com/anywhere-labs/dsh-desktop/tree/main/dsh-community-market) का एक **मानक कैटलॉग स्रोत**, जो npm registry से बनाया जाता है और सार्वजनिक v1 अनुबंध स्कीमाओं के विरुद्ध सत्यापित होता है। हर आइटम का `displayName` द्विभाषी है (English — 中文) और उसका `summary` चीनी पंक्ति लेकर चलता है, ताकि सख्त 1.0.0 फ़ील्ड के भीतर चीनी दिखती और खोजी जा सके रहे। केवल-चीनी जोड़ी और display/status मेटाडेटा, जिसे सार्वजनिक स्कीमा अनुमति नहीं देता, `display.json` में रहते हैं।

- Manifest: `catalog-source.json` (जनरेट किया गया; डिप्लॉय देखें)
- Provider पेज: `artifacts/v1/plugins.json` (जनरेट किया गया)
- सत्य का स्रोत: `data/packages.json` (npm नाम → रिपॉज़िटरी → प्रदर्शित नाम → श्रेणियाँ) + `data/npm-snapshot.json` (npm registry स्नैपशॉट)
- जनरेटर / वैलिडेटर: `scripts/build-catalog.mjs`, `scripts/validate.mjs`, `scripts/check-counts.mjs`
- डिप्लॉय: `https://perrylink-dsh-catalog.perrylink.workers.dev` पर लाइव (Cloudflare Workers, `deploy.yml` से स्वचालित; Vercel स्थिर विकल्प `vercel.json` में; Deno यूनिट `deploy/deno-worker.js` मैनुअल विकल्प के रूप में)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-family-catalog-flow-v5-dark.svg">
  <img src="docs/assets/dsh-family-catalog-flow-v5-light.svg" width="100%" alt="dsh-family-catalog का संरचना चित्र: npm registry स्नैपशॉट (152 पंक्तियाँ) data/packages.json को खिलाता है और scripts/build-catalog.mjs deploy/catalog-source.json तथा deploy/artifacts/v1/plugins.json (152 सख्त आइटम) लिखता है; check-data, check-counts और check-facets परिणाम पर गेट हैं; साइडकार GET /v1/search, GET /v1/plugin और plugin_search तथा plugin_get MCP टूल जोड़ता है; डिप्लॉयमेंट Cloudflare Workers, Vercel या Deno पर एक ही HTTPS origin से चलता है">
</picture>

*संरचना: npm registry → data/packages.json → डिप्लॉय आर्टिफ़ैक्ट → गेट → सर्च साइडकार। चित्र के लेबल असली स्क्रिप्ट नाम, पथ और endpoint हैं, इसलिए एक ही चित्र पाँचों भाषाओं के लिए है।*

## रखरखाव स्थिति: परिवार-आंतरिक उपकरण

![dsh-family-catalog: असली टर्मिनल रन — check-counts बताता है कि data/packages.json से 152 पैकेज निकले, check-facets 10 hubs में 133 active / 15 frozen / 3 retired / 1 unknown के साथ 152/152 facet कवरेज बताता है, और search.mjs मानक संख्या IATF 16949 को dsh-ppap-check फिर dsh-sop-sync-check पर ले जाता है](docs/assets/dsh-family-catalog-demo.gif)

*एनिमेशन: रिपॉज़िटरी के अपने केवल-पठन गेट और सर्च CLI का 2026-11-21 को दोबारा रन — node scripts/check-counts.mjs, node scripts/check-facets.mjs और node scripts/search.mjs "IATF 16949" --limit=3। असली stdout, कोई नेटवर्क कॉल नहीं।*

> **2026-10-05 को पुनर्वर्गीकृत — जानबूझकर सेवानिवृत्त नहीं।** पूरे
> प्लगइन परिवार की आधिकारिक harness और व्यापक पारिस्थितिकी के विरुद्ध समीक्षा ने इस
> रिपॉज़िटरी को उत्पाद के बजाय **परिवार-आंतरिक टूलिंग** के रूप में वर्गीकृत किया। इसका काम
> इसका काम DSH Desktop Community Market के लिए इस परिवार की सूची बनाना है, इसलिए यह तीसरे-पक्ष
> कैटलॉग से प्रतिस्पर्धा नहीं करता और इसे सेवानिवृत्ति की ज़रूरत नहीं। यह अनुरक्षित बना रहता है।

### एक रोस्टर, एक स्रोत

कैटलॉग खोज-सतह (discoverability surface) है, परिवार के रोस्टर का 1:1 प्रक्षेपण नहीं। यह npm रिकॉर्ड
`data/packages.json` में रखता है (सामुदायिक/तृतीय-पक्ष रिकॉर्ड और पुराने इंस्टॉल के लिए
रखे गए सेवानिवृत्त नाम भी शामिल हैं)। हर प्रति-प्लगइन README वही संकुचित (collapsed) रोस्टर लेकर चलता है।

## अनुपालन नोट्स

- अनुबंध: [catalog-provider-contract.md](https://github.com/anywhere-labs/dsh-desktop/blob/main/dsh-community-market/docs/catalog-provider-contract.md) (v1, `manifestVersion`/`schemaVersion` `1.0.0`)। स्कीमाएँ इस रिपॉज़िटरी में कहीं भी vendor नहीं की गईं; `scripts/validate.mjs` `catalog-source.schema.json` और `catalog-provider-page.schema.json` के संरचनात्मक नियमों तथा क्रॉस-फ़ील्ड नियमों (अद्वितीय आइटम ids, npm नाम पैटर्न, आइटम में कोई इंस्टॉल कमांड नहीं, HTTPS रिपॉज़िटरी URLs, पेज का आकार) को दर्शाता है।
- Provider `query.supported = ["cursor","limit"]`, `defaultLimit = maxLimit = 100`, `sorts = []` घोषित करता है। Endpoint पूरा 152-आइटम कैटलॉग अधिकतम 100 आइटम के cursor पेजों में परोसता है (दो अनुरोध), इसलिए DSH Desktop runtime की प्रति-पेज सीमा से अधिक हुए बिना पूरा कैटलॉग स्कैन करता है। Vercel स्थिर मिरर ब्राउज़िंग के लिए बिना पेजिंग वाला 152-आइटम JSON परोसता है; Desktop के लिए workers.dev manifest इस्तेमाल करें।
- हर आइटम में `package.registry = "npm"` + `package.name` और कैनोनिकल `repository.url` होता है; कोई इंस्टॉल कमांड, shell फ़्रैगमेंट या निष्पादन-योग्य डेटा कभी नहीं भेजा जाता।
- हर आइटम में उसी origin का `media.icon` भी होता है (`/icons/<slug>.png`, जिसे `scripts/build-icons.mjs` नियतात्मक रूप से बनाता है); Worker PNGs स्वयं परोसता है, इसलिए आइकन कैटलॉग origin पर ही रहते हैं जैसा market की मीडिया नियम माँगती है।
- Manifest endpoint और manifest स्वयं एक ही HTTPS origin साझा करने चाहिए (market नियम)। जनरेट किया गया placeholder endpoint `https://replace-with-deploy-origin.invalid/...` डिप्लॉय के समय असली deploy origin से बदल दिया जाता है — placeholder URL को DSH Desktop में पंजीकृत न करें।

## बिल्ड

```sh
node scripts/build-catalog.mjs            # placeholder endpoint
node scripts/validate.mjs                 # structural checks
node scripts/build-catalog.mjs https://<your-project>.deno.dev   # real origin
```

`build-catalog.mjs` manifest और provider पेज को repo root में लिखता है **और** दोनों को `deploy/` में भी मिरर करता है, इसलिए `deploy/deno-worker.js` एक आत्म-निहित Deno Deploy यूनिट है (उसके `./` imports हमेशा resolve होते हैं)।

`data/npm-snapshot.json` UTF-8-सुरक्षित तरीके से इससे रीफ़्रेश होता है:

```sh
node scripts/refresh-snapshot.mjs   # re-fetch every package from registry.npmjs.org
```

> एक निर्धारित workflow (`.github/workflows/refresh-catalog.yml`) इसे रोज़ चलाता है
> और registry बदलने पर ही `chore/catalog-refresh` पर एक PR खोलता है।
> PR खोलने से पहले यह data/artifact/type गेट चलाता है; PR मर्ज होने पर
> deploy workflow शुरू होता है। ऊपर का मैनुअल कमांड ज़बरदस्ती रीफ़्रेश के लिए है।

### `data/` का रखरखाव

`data/packages.json` और `data/npm-snapshot.json` **एक ही इकाई** हैं: नए या नाम-बदले पैकेज को अपनी snapshot पंक्ति
*उसी commit में* चाहिए। 2026-09-09 को लगातार दो `main` deploy बिल्कुल इसी वजह से लाल हुए — पहले
`data/packages.json` में गायब कॉमा, फिर बिना snapshot पंक्ति के सूचीबद्ध पैकेज
(`Error: npm snapshot missing for …`)। दोनों को प्री-पुश गेट स्थानीय रूप से पकड़ लेता है;
इसे प्रति clone एक बार सक्षम करें:

```sh
git config core.hooksPath .githooks   # then every push runs node scripts/check-data.mjs
```

`scripts/check-data.mjs` केवल-पठन है। `node scripts/build-catalog.mjs` को गेट के रूप में
**न** इस्तेमाल करें: बिना argument के बुलाने पर यह कमिट किए गए `deploy/` आर्टिफ़ैक्ट को
placeholder origin के साथ फिर से लिख देता है।

परिवार की गिनती **हाथ से** नहीं रखी जाती: `scripts/check-counts.mjs` उसे
`data/packages.json` से निकालता है और उसे बताने वाली हर जगह को उसी एक स्रोत से बाँधता है — README सारांश (EN + ZH),
manifest विवरण, शिप किए गए पेज के `items`/`page.total` और deploy live-smoke का न्यूनतम —
जाँचने के लिए इसे चलाएँ, या README के गिनती-स्थलों को स्रोत से फिर लिखने के लिए `node scripts/check-counts.mjs --write` चलाएँ।
यह इसलिए मौजूद है क्योंकि संख्या वास्तव में भटकी थी: README और manifest ने परिवार को पेज के वास्तव में शिप हुए
से एक पैकेज बड़ा बताया था (ठोस आँकड़े और उन्हें ठीक करने वाला commit `scripts/check-counts.mjs` के हेडर में दर्ज हैं)।

`.github/workflows/ci.yml` हर `main` push और हर pull request पर `scripts/check-data.mjs`,
`scripts/check-counts.mjs` तथा build/validate की जोड़ी चलाता है, इसलिए ऊपर का hook
अकेली रक्षा-पंक्ति नहीं, बल्कि एक सुविधा है। `scripts/validate.mjs` पहले कमिट किए गए
`deploy/` मिरर resolve करता है — वह payload जो वास्तव में शिप होता है, और जो किसी ताज़ा clone के पास होता ही है —
और `page.total` को `items.length` पर बाँधता है। इसके बाद CI फिर से build करके सत्यापित करता है कि कमिट किया गया
`deploy/catalog-source.json` अभी भी मेल खाता है, जिससे वह `data/` बदलाव पकड़ा जाता है जो कभी `deploy/` में
मिरर नहीं हुआ। वह rebuild एकमात्र जगह है जहाँ बिना-argument रूप सुरक्षित है: runner का checkout
अस्थायी (throwaway) है, और manifest में कोई timestamp नहीं होता, इसलिए यह
byte-दर-byte पुनरुत्पाद्य है।

## डिप्लॉय

**लाइव**: `https://perrylink-dsh-catalog.perrylink.workers.dev` (Cloudflare Workers, `deploy` workflow द्वारा स्वतः डिप्लॉय)।

स्वचालित चैनल — workflow लाइव origin के साथ manifest फिर से बनाता है, सत्यापित करता है, फिर डिप्लॉय करता है; हर चैनल अपना token secret न होने पर चुपचाप छूट जाता है:

- **Cloudflare Workers** (सक्रिय): `deploy/wrangler.toml` + `deploy/cloudflare-worker.js`। `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets चाहिए। दो-पास डिप्लॉय: पहले placeholder-origin worker अपलोड करता है, आवंटित `*.workers.dev` URL पढ़ता है, उस origin पर पिन किया manifest फिर बनाता है और दोबारा डिप्लॉय करता है। `workers.dev` उपलब्ध न होने पर Cloudflare Pages (`.pages.dev`) पर लौट आता है।
- **Vercel**: `vercel.json` `/v1/plugins` → `artifacts/v1/plugins.json` रीराइट करता है। `VERCEL_TOKEN` चाहिए।
- **Deno Deploy** (मैनुअल): आत्म-निहित `deploy/deno-worker.js`; डिप्लॉय करने से पहले `node scripts/build-catalog.mjs https://<your-project>.deno.dev` से फिर बनाएँ।

साइट एक ही HTTPS origin पर `GET /catalog-source.json` और `GET /v1/plugins` को `application/json` के रूप में परोसती है।

## DSH Desktop में उपयोग

अंतर्निहित Market खोलें → **Sources** → source जोड़ें → manifest URL `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` चिपकाएँ → उसे चुनें। ब्राउज़िंग केवल-पठन है; सूचीबद्ध किसी भी प्लगइन का इंस्टॉल Market की अपनी npm-identity जाँच और उपयोगकर्ता पुष्टि से होता है।

इस कैटलॉग में सूचीबद्ध होना मेटाडेटा है, सुरक्षा समीक्षा नहीं। इन्हीं प्लगइनों के साक्ष्य रिकॉर्ड [dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification) में और MCP एक्सेस [dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp) से भी हैं।

## डिस्कवरी सर्च और MCP

1.0.0 provider पेज वही है जो DSH Desktop पढ़ता है, और उसकी खोज `id/name/displayName/summary/description/publisher/keywords` पर एक पूरी-स्ट्रिंग `includes` है। इससे वे चीनी डोमेन शब्द छूट जाते हैं जो केवल `summaryZh` में रहते हैं। साइडकार 1.0.0 आइटम स्कीमा बदले बिना इसे ठीक करता है:

- `data/discovery.json` — 152 स्कीमा-वैध discovery manifests (85 कैटलॉग-व्युत्पन्न पंक्तियों की 2026-11-09 को समीक्षा हुई और उनकी सीमाएँ सामान्यीकृत हुईं), जिनमें aliases, searchPhrases, audience, facets, maturity और coverage हैं।
- `data/facets.json` — 152/152 facet/status साइडकार (domains, subdomains, tasks, artifacts, standards, maintenance, maturity, coverage, replacement)।
- `data/hubs.json` — 10 डोमेन hubs (customs, tender, construction-ehs, medical, legal, finance, government, research, quality, data)।
- दोनों workers पर `GET /v1/search?q=&domain=&task=&audience=&limit=` और `GET /v1/plugin?name=`।
- `mcp/plugin-search-server.mjs` — `plugin_search` / `plugin_get` वाला stdio MCP।

```sh
node scripts/build-discovery.mjs
node scripts/discovery-bench.mjs --source=index --fail-under=85
node scripts/worker-smoke.mjs
node scripts/mcp-smoke.mjs
```

response का आकार, MCP कॉन्फ़िग और 1.0.0 अनुबंध की ज्ञात चेतावनियों के लिए [docs/search-api.md](docs/search-api.md) देखें।

---

## चीनी नोट

पूरे PerryLink परिवार के लिए [DSH Community Market](https://github.com/anywhere-labs/dsh-desktop/tree/main/dsh-community-market) का मानक कैटलॉग स्रोत: 152 npm पैकेज (151 PerryLink रिपॉज़िटरी + तृतीय-पक्ष `dsh-phocinae`, जो केवल साथ में सूचीबद्ध है, परिवार का काम नहीं गिना जाता), npm registry से जनरेट और सार्वजनिक v1 अनुबंध के अनुसार संरचनात्मक रूप से सत्यापित; हर आइटम का `displayName` द्विभाषी (English — 中文) है, उसका `summary` चीनी वाक्य लेकर चलता है, इसलिए सख्त 1.0.0 फ़ील्ड के भीतर चीनी दिखती और खोजी जा सकती है; केवल-चीनी जोड़ी और स्कीमा-बाहरी मेटाडेटा, जैसे स्थिति, `display.json` साइडकार में रहते हैं। यह Cloudflare Workers पर पहले से लाइव है (`perrylink-dsh-catalog.perrylink.workers.dev`, deploy workflow से स्वचालित डिप्लॉय; Vercel स्थिर रीराइट और Deno Deploy वैकल्पिक चैनल हैं)। हर आइटम में उसी origin का `media.icon` आइकन भी है (`/icons/*.png`, जिसे `scripts/build-icons.mjs` नियतात्मक रूप से बनाता है)। DSH Desktop में Market → Sources में manifest URL जोड़कर ब्राउज़ करें (ब्राउज़िंग केवल-पठन है; इंस्टॉल अब भी market की अपनी npm पहचान जाँच और उपयोगकर्ता पुष्टि से होता है)। जनरेट किए गए आर्टिफ़ैक्ट में placeholder डोमेन `replace-with-deploy-origin.invalid` डिप्लॉय के समय बदला जाता है; placeholder पता सीधे पंजीकृत न करें। **रखरखाव अनुशासन**: `data/packages.json` और `data/npm-snapshot.json` को एक ही commit में जोड़े में अपडेट करना होगा (2026-09-09 को लगातार दो `main` deploy लाल होने की जड़ यही थी: पहले छूटा कॉमा, फिर नए पैकेज की npm snapshot पंक्ति गायब); एक बार `git config core.hooksPath .githooks` चलाने के बाद हर push केवल-पठन गेट `scripts/check-data.mjs` चलाता है। बिना argument वाले `node scripts/build-catalog.mjs` को गेट मत बनाइए — यह पहले से कमिट किए `deploy/` आर्टिफ़ैक्ट को placeholder डोमेन के साथ फिर से लिख देता है। **CI**: `.github/workflows/ci.yml` हर `main` push और हर PR पर `scripts/check-data.mjs`, `scripts/check-counts.mjs` तथा build+validate चलाता है; `scripts/validate.mjs` डिफ़ॉल्ट रूप से कमिट किए `deploy/` आर्टिफ़ैक्ट पढ़ता है (वह payload जो वास्तव में शिप होता है, ताज़ा clone में केवल वही मौजूद), और `page.total` को `items.length` पर बाँधता है; फिर rebuild करके जाँचता है कि `deploy/catalog-source.json` पुराना नहीं पड़ा, जिससे वह पकड़ा जाता है कि `data/` बदला गया पर `deploy/` rebuild नहीं हुआ; वह rebuild CI के एक-बार-के checkout में सुरक्षित है क्योंकि manifest में कोई timestamp नहीं और यह byte-दर-byte पुनरुत्पाद्य है। **गिनती का एकमात्र स्रोत**: पैकेजों की संख्या हमेशा `data/packages.json` से निकलती है — `scripts/check-counts.mjs` जाँचता है कि README (EN+ZH)/manifest/आर्टिफ़ैक्ट/deploy smoke का न्यूनतम सब मेल खाते हैं, और `--write` उस स्रोत से README की गिनती फिर लिख सकता है, हाथ से लिखना मना है।

## लाइसेंस

Apache-2.0। कैटलॉग डेटा npm registry और PerryLink प्लगइन रिपॉज़िटरी से आता है।

**DSH परिवार लाइन:** यह रिपॉज़िटरी **PerryLink DeepSeek Harness प्लगइन परिवार** की सदस्य है, जिसकी वर्तमान लाइन `dsh-v0.1.7-rc.2` है।


## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) के DeepSeek Harness प्लगइन परिवार का हिस्सा है। रोस्टर नीचे सिकुड़ा रहता है ताकि हर README की पहली स्क्रीन छोटी रहे; हर पंक्ति और उसकी स्थिति देखने के लिए इसे खोलें।

<details>
<summary>सभी प्लगइन खोलें</summary>

| प्लगइन | स्थिति |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
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
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |

</details>
