# Research: Apify webhook payload contract & `apify-client` dataset reads

Grounds the Epic 1 ingestion design (`PRD.md` FR-1.3–FR-1.5, `/api/webhooks/apify`) in Apify's
primary-source docs and the exact `apify-client` release this repo pins (`^2.23.4`, confirmed as
`dist-tags.latest` on the npm registry at research time — `registry.npmjs.org/apify-client`).
Point-in-time snapshot; Apify's docs can change after this was written.

---

## Question 1 — Apify webhook payload contract

### Top-level shape and `eventType`

Yes, there is a top-level `eventType` field. Apify's **default payload template** for any webhook
is:

```json5
{
    "userId": {{userId}},
    "createdAt": {{createdAt}},
    "eventType": {{eventType}},
    "eventData": {{eventData}},
    "resource": {{resource}}
}
```

resolving to, e.g.:

```json5
{
    "userId": "abf6vtB2nvQZ4nJzo",
    "createdAt": "2019-01-09T15:59:56.408Z",
    "eventType": "ACTOR.RUN.SUCCEEDED",
    "eventData": { "actorId": "fW4MyDhgwtMLrB987", "actorRunId": "uPBN9qaKd2iLs5naZ" },
    "resource": { "id": "uPBN9qaKd2iLs5naZ", "actId": "fW4MyDhgwtMLrB987", "status": "SUCCEEDED", /* ...full Run object */ }
}
```

This is only the **default** `payloadTemplate` — it's a per-webhook, user-editable string (Console
UI or `POST /v2/webhooks`'s `payloadTemplate` field), so a differently-configured webhook could
send different JSON. Out of the box, this is what a new Actor/Task webhook sends.
[Webhook actions — Payload template](https://docs.apify.com/platform/integrations/webhooks/actions)

Full list of `eventType` values (Actor run + Actor build events; no other categories exist today):

- `ACTOR.RUN.CREATED`, `ACTOR.RUN.SUCCEEDED`, `ACTOR.RUN.FAILED`, `ACTOR.RUN.ABORTED`,
  `ACTOR.RUN.TIMED_OUT`, `ACTOR.RUN.RESURRECTED`
- `ACTOR.BUILD.CREATED`, `ACTOR.BUILD.SUCCEEDED`, `ACTOR.BUILD.FAILED`, `ACTOR.BUILD.ABORTED`,
  `ACTOR.BUILD.TIMED_OUT`

[Events types for webhooks](https://docs.apify.com/platform/integrations/webhooks/events)

### Where the dataset id lives — exact field path

**`resource.defaultDatasetId`** (top-level property of the `resource` object — not nested
further).

Chain of evidence:
1. For an `ACTOR.RUN.*` event, "the `resource` variable ... will be replaced by the `Object` that
   you would receive as a response from ... the [Get Actor run](https://docs.apify.com/api/v2/actor-run-get)
   API endpoint." — [Webhook actions — Resource](https://docs.apify.com/platform/integrations/webhooks/actions)
2. The **Get Actor run** API reference documents a top-level required field on that Run object:
   `defaultDatasetId` (string) — "ID of the default dataset for this run", example
   `"wmKPijuyDnPZAPRMk"`. — [Get run — API reference](https://docs.apify.com/api/v2/actor-run-get)

Note `eventData` (the smaller companion object, also present at the top level) only carries
`actorId` / `actorTaskId` / `actorRunId` — **not** the dataset id. The doc's own suggested
alternative for readers who only have `eventData` is to call
`GET /v2/actor-runs/{actorRunId}/dataset/items` yourself
([Events types for webhooks](https://docs.apify.com/platform/integrations/webhooks/events)), but
with the default payload template `resource.defaultDatasetId` is already present for free — no
extra round-trip needed, which matches this repo's FR-1.4 plan (webhook carries only the id; items
are pulled server-to-server after).

### Verifying the request came from Apify

Apify supports **two** mechanisms, both documented, neither is HMAC-based:

1. **Secret token in the webhook URL** — Apify's own headlined recommendation: "For security
   reasons, include a secret token in the webhook URL to ensure that only Apify can invoke it."
2. **Custom HTTP headers via `headersTemplate`** — explicitly cross-referenced in the same section
   ("You can also use Headers template for this purpose") and configurable both from the Console
   UI and via the API (`POST /v2/webhooks`'s `headersTemplate` field). Apify's **own official API
   example** for this field uses exactly the bearer-header pattern this repo's PRD assumes:
   `"headersTemplate": "{\n \"Authorization\": \"Bearer ...\"}"`.

   — [Webhook actions — Security considerations](https://docs.apify.com/platform/integrations/webhooks/actions),
   [Create webhook — API reference](https://docs.apify.com/api/v2/webhooks-post)

A fixed set of headers is always rewritten by the platform regardless of `headersTemplate`
content — `Host`, `Content-Type`, `X-Apify-Webhook`, `X-Apify-Webhook-Dispatch-Id`,
`X-Apify-Request-Origin` — but `Authorization` is **not** in that reserved list, so a custom bearer
header survives untouched.
[Webhook actions — Headers template](https://docs.apify.com/platform/integrations/webhooks/actions)

**Conclusion:** this repo's design (`APIFY_WEBHOOK_SECRET` verified via a bearer header, per
`PRD.md` §5 and `CLAUDE.md`) is a real, fully-supported Apify mechanism — it's just the *second*
option Apify's docs mention, not the one they foreground first (secret-in-URL is). Apify does not
offer or require HMAC request signing.

---

## Question 2 — `apify-client` (^2.23.4) dataset reads

Verified directly against the published package contents for the exact pinned version — `latest`
on the npm registry is `2.23.4`, matching this repo's pin exactly (`registry.npmjs.org/apify-client`,
`unpkg.com/apify-client@2.23.4/dist/resource_clients/dataset.d.ts` and `.js`, cross-checked against
the published reference page).

### `listItems()` vs `downloadItems()` vs manual pagination

```ts
listItems(options?: DatasetClientListItemOptions): PaginatedIterator<Data>
downloadItems(format: DownloadItemsFormat, options?: DatasetClientDownloadItemsOptions): Promise<Buffer>
```

The SDK's own doc comment states the distinction directly: *"Unlike `listItems` which returns a
`PaginatedList` with an array of individual dataset items, [`downloadItems`] returns the items
serialized to the provided format (JSON, CSV, Excel, etc.) as a Buffer."* `downloadItems` is for
exporting to a file format, not for programmatic access to parsed objects — not the right call for
feeding a Prisma `upsert` loop.

For a **one-shot full read**, the SDK's own recommendation is simply:

```ts
const { items, total } = await client.dataset(datasetId).listItems();
```

`options.limit`'s doc comment says "Default is all items", confirmed by the runtime
implementation (`dist/base/api_client.js`, `_listPaginatedFromCallback`): when neither `limit` nor
`chunkSize` is passed, the resolved `limit` sent to the underlying `GET /v2/datasets/{id}/items`
request is `undefined` — i.e. **one** HTTP request, no limit param, returns everything. Manual
offset/limit pagination is redundant for this case — it's what plain `await listItems()` already
does internally in a single call.

For huge datasets where you don't want everything in memory at once, the *same* return value also
implements `Symbol.asyncIterator` (see return-type shape below), so
`for await (const item of client.dataset(datasetId).listItems({ chunkSize: 1000 }))` auto-paginates
page-by-page — confirmed directly in the `asyncGenerator()` implementation inside
`_listPaginatedFromCallback`. That's the SDK's built-in alternative to writing your own
offset/limit loop.

Sources: [DatasetClient — API reference](https://docs.apify.com/api/client/js/reference/class/DatasetClient),
`unpkg.com/apify-client@2.23.4/dist/resource_clients/dataset.{d.ts,js}`,
`unpkg.com/apify-client@2.23.4/dist/base/api_client.js`.

### Return value shape

Bare arrays are never returned. `listItems()`'s full type is:

```ts
type PaginatedIterator<T> = Promise<PaginatedList<T>> & AsyncIterable<T>;

interface PaginatedResponse<Data> { total: number; items: Data[] }
interface PaginatedList<Data> extends PaginatedResponse<Data> {
  count: number; offset: number; limit: number; desc: boolean;
}
```

So `await`-ing it resolves to `{ items: Data[], total, count, offset, limit, desc }` — a wrapper
object with the items array plus full pagination metadata — while the *same* expression can also be
`for await`-iterated per-item. Exported type name is **`PaginatedList`**
(`unpkg.com/apify-client@2.23.4/dist/utils.d.ts`); the SDK's own README prose informally calls this
"PaginationList" in one sentence but links that mention to the `PaginatedList` reference page, so
`PaginatedList` is the actual exported symbol to import/reference.
[apify-client-js README — Pagination](https://github.com/apify/apify-client-js#pagination)

### Next.js Route Handler runtime caveats

`apify-client` ships two builds — confirmed via its own `package.json`
(`main: dist/index.js`, `module: dist/index.mjs` vs `browser: dist/bundle.js`, `unpkg: dist/bundle.js`)
and its README's "Bundled environments" section:

> "The package includes a pre-built browser bundle that is automatically resolved by bundlers
> targeting browser environments... For edge runtimes like Cloudflare Workers, you may need to
> enable Node compatibility (e.g. `node_compat = true` in `wrangler.toml`). Note that some
> Node-specific features (streaming, proxy support) are not available in the bundle."
> — [apify-client-js README — Bundled environments](https://github.com/apify/apify-client-js#bundled-environments)

Supporting evidence the Node build is the "real" one: `dist/utils.d.ts` imports `Readable` from
`node:stream` (a Node core module, unavailable outside Node.js), and `downloadItems()` resolves to
`Promise<Buffer>` (a Node global).

**Practical implication for `/api/webhooks/apify`:** Next.js Route Handlers default to the Node.js
runtime, so no action is needed as long as the route does **not** add
`export const runtime = 'edge'`. If it did, bundlers would resolve `apify-client`'s browser bundle
instead, which per the SDK's own README lacks "some Node-specific features (streaming, proxy
support)" — and Next.js has no equivalent of Cloudflare's `node_compat` toggle to work around that.

**Unconfirmed, flagged explicitly:** a web search surfaced a claim that `apify-client` requires
"Node.js 16 or higher," but this could not be verified against any primary source — the package's
`package.json` has **no `engines` field** at all (checked both at the pinned `2.23.4` tag via
`registry.npmjs.org/apify-client/2.23.4` and current `master` via
`raw.githubusercontent.com/apify/apify-client-js/master/package.json`), and neither the README nor
the "Getting started" docs page state a minimum Node version. Treat any specific version number for
this as unsupported until found in a primary source.

---

## Question 3 — LinkedIn Jobs actor selection

No Actor is configured yet. This section picks one from Apify Store for FR-1.1/FR-1.2.

### Recommendation: `curious_coder/linkedin-jobs-scraper`

Compared four candidate LinkedIn Jobs actors on the Store using both their listing pages and
Apify's own public actor-metadata API (`GET https://api.apify.com/v2/acts/{username}~{actor-name}`,
undocumented as a "docs page" but it's Apify's own live API — queried at research time,
2026-07-15):

| Actor slug | `modifiedAt` | total users | users (30d) | total runs | rating (reviews) | bookmarks |
|---|---|---|---|---|---|---|
| **`curious_coder/linkedin-jobs-scraper`** | 2026-06-16 | 116,378 | 12,226 | 2,892,976 | 4.43 (102) | 1,060 |
| `bebity/linkedin-jobs-scraper` | 2026-05-06 | 34,608 | 377 | 3,813,494 | 4.33 (61) | 653 |
| `valig/linkedin-jobs-scraper` | 2026-07-10 | 9,211 | 2,494 | 328,341 | 4.32 (13) | 95 |
| `logical_scrapers/linkedin-jobs-scraper` | 2026-05-31 | 440 | 31 | 3,203 | 4.00 (1) | 5 |

`curious_coder` wins on essentially every "still exists and works reliably" signal the coordinator
asked for: by far the largest and most active user base (12k monthly users vs. the runner-up's
2.5k), a 30-day success rate of ~98.8% (395,412 succeeded / 400,220 total runs), a recent code
update (2026-06-16), and — unlike the others — multiple semver-tagged stable builds
(`stable-v1` … `stable-v4`), which signals an actor maintained with real backward-compatibility
discipline rather than a single rolling `latest`. `bebity` is a reasonable runner-up (also
large-scale, slightly older update); `valig` is the most recently touched and has a cleaner output
schema (see below) but at 30–100x less usage/proof. Apify's public actor-metadata API is the
primary source for every number in this table (queried directly, not scraped from rendered HTML);
the Store listing pages themselves are the source for input/output schema below.
[`curious_coder/linkedin-jobs-scraper` — Store listing](https://apify.com/curious_coder/linkedin-jobs-scraper)

### Input schema (fits FR-1.2)

Confirmed against the actor's **generated OpenAPI input schema**, itself a primary source served
directly by Apify's API (`https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/builds/default/openapi.json`,
`components.schemas.inputSchema`):

- **`urls`** (`string[]`, required) — *"Go to linkedin jobs search page on incognito window (to
  access public version), search with required filters and once you are done, copy the full URL
  from address bar and pass it here. You can pass multiple search URLs."*
- `scrapeCompany` (boolean, default `true`) — fetch extra per-job company detail (slower).
- `count` (integer, min `10`) — cap on jobs scraped.
- `splitByLocation` (boolean, default `false`) + `splitCountry` (enum of country codes) — splits
  one search across a country's cities to route around LinkedIn's ~1000-results-per-search-URL cap.

This takes a **raw LinkedIn search URL**, not discrete `title`/`location` fields — a direct fit for
FR-1.2's "customized LinkedIn Search URL filtering jobs matching specific titles, location, and
posted within the Last 24 Hours": all of that filtering (title, location, `f_TPR=r86400` for last
24h, etc.) is expressed in the URL itself via LinkedIn's own search UI, and passed through
unmodified — no per-field translation layer needed in this repo's cron/trigger code. (`bebity` and
`valig`, by contrast, take separate `title`/`location`/etc. fields rather than a URL — a viable but
different shape not what FR-1.2 as worded describes.)

### Output dataset shape → `JobOffer` mapping

The Store page's own "Sample output data" section gives this verbatim example item. **Flagging
explicitly per the sourcing instructions: this example is stale** — `postedAt: "2023-08-16"` and
the Facebook/Meta job content date it to 2023, so it reads as an older cached doc snippet the actor
author hasn't refreshed, not a live run captured today. Field *names* are still the current
contract (cross-checked field-by-field against the page's rendered schema description), but treat
concrete values as illustrative only:

```json
{
  "id": "3692563200",
  "link": "https://www.linkedin.com/jobs/view/english-data-labeling-analyst-at-facebook-3692563200?...",
  "title": "English Data Labeling Analyst",
  "companyName": "Facebook",
  "companyLinkedinUrl": "https://www.linkedin.com/company/facebook?...",
  "companyLogo": "https://media.licdn.com/...",
  "location": "Los Angeles Metropolitan Area",
  "salaryInfo": ["$17.00", "$19.00"],
  "postedAt": "2023-08-16",
  "benefits": ["Actively Hiring"],
  "descriptionHtml": "<p>APPROVED REMOTE LOCATIONS:</p>...",
  "descriptionText": "APPROVED REMOTE LOCATIONS:Los Angeles, CA...",
  "applicantsCount": "200",
  "applyUrl": "",
  "jobPosterName": "Andrea Cowan",
  "jobPosterTitle": "Technical Recruiter at Meta",
  "jobPosterProfileUrl": "https://ca.linkedin.com/in/...",
  "seniorityLevel": "Associate",
  "employmentType": "Contract",
  "jobFunction": "Other",
  "industries": "Retail Office Equipment",
  "companyDescription": "The Facebook company is now Meta...",
  "companyWebsite": "https://www.meta.com",
  "companyEmployeesCount": 36275
}
```
[`curious_coder/linkedin-jobs-scraper` — Sample output data](https://apify.com/curious_coder/linkedin-jobs-scraper)

Mapping onto this repo's `JobOffer` model (`PRD.md` §4):

| `JobOffer` field | Source field | Notes |
|---|---|---|
| `jobId` (unique) | `id` | LinkedIn's own numeric job id — good unique key for the `upsert` in FR-1.5. |
| `title` | `title` | Direct. |
| `linkedinUrl` | `link` | Direct (`applyUrl` is a separate, often-empty field — not the same thing). |
| `description` | `descriptionText` | Plain text; `descriptionHtml` also available if rich rendering is ever wanted. |
| `salary` | `salaryInfo` | **Needs transformation** — it's `string[]` (e.g. a min/max pair), not a scalar; must be joined/formatted to fit `salary: String?`. |
| `format` (Remote/Hybrid/On-site) | *(none)* | **Gap — not a field this actor emits.** No `workplaceType`/`remote`/`workType` field appears anywhere in the schema or example; the only hint is free text inside `descriptionHtml`/`descriptionText` (e.g. "APPROVED REMOTE LOCATIONS..." in the example above). This will need either text-derivation logic or sourcing the value from the search URL's own `f_WT` filter instead of the item. |
| `requirements: String[]` | *(none)* | **Gap — not structured data.** Requirements/skills show up only as prose inside `descriptionText` (e.g. a "Skills:" section in free text) — this repo's Epic 2 LLM grading step is the natural place to extract a `requirements` array, not the scraper. |

**Not independently verified beyond the above:** I did not execute a live test run of this actor
(out of scope for "no code changes / pure research"), so I can't confirm the *current* live output
byte-for-byte — only that the field names match what the actor's own Store page documents today,
and that the specific example values are old. Recommend a one-off manual test run before wiring
FR-1.4 to confirm live shape, particularly for the `format`/`requirements` gaps above.
[`curious_coder/linkedin-jobs-scraper` — Store listing](https://apify.com/curious_coder/linkedin-jobs-scraper),
[Apify actor metadata API](https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper)
