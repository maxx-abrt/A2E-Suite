import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import { api, internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"
import { assertWorkspaceMember, logActivity, requireWorkosId } from "./lib/auth"
import { generateJson, sha256Hex, aiStatus, geminiModel } from "./lib/ai"
import { decryptOptional, encryptOptional } from "./lib/crypto"
import { CURATED_AIDS, aidesTerritoiresToken, fetchAidesPage, type NormalisedAid } from "./lib/sources"

/**
 * SUBVENTIONS \u2014 a live, daily-refreshed catalogue of French public funding, plus
 * an AI matcher that turns "voici mon projet" into a ranked, justified shortlist.
 *
 * COST DISCIPLINE (by design, not by luck):
 *  - the catalogue is ingested once a day, page by page, upserted by
 *    (source, sourceId) \u2014 no duplicates, no re-download of unchanged rows;
 *  - the AI never sees the catalogue: a deterministic search pass picks at most
 *    45 candidates, and only those (compacted to ~8 fields) reach the model;
 *  - both AI passes are content-hashed into `a2e_aiCache`, so an identical
 *    question costs exactly zero tokens, forever \u2014 the cache key embeds the
 *    catalogue version, so it self-invalidates when the data actually changes;
 *  - every run is persisted (`a2e_subventionRuns`) and re-openable for free.
 */

const FACET_KEY = "__facets__"
const MAX_AI_RUNS_PER_DAY = 40
const MAX_CANDIDATES = 45

// ---------------------------------------------------------------- ingestion

function searchTextOf(aid: NormalisedAid): string {
  return [
    aid.title,
    aid.shortTitle,
    aid.description?.slice(0, 900),
    aid.eligibility?.slice(0, 500),
    aid.financers.join(" "),
    aid.categories.join(" "),
    aid.programs?.join(" "),
    aid.audiences.join(" "),
  ]
    .filter(Boolean)
    .join(" \u00b7 ")
    .slice(0, 4000)
}

export const upsertBatch = internalMutation({
  args: { items: v.array(v.any()), runAt: v.number() },
  handler: async (ctx, { items, runAt }) => {
    let created = 0
    let updated = 0
    for (const raw of items as NormalisedAid[]) {
      const doc = {
        source: raw.source,
        sourceId: raw.sourceId,
        slug: raw.slug,
        title: raw.title.slice(0, 400),
        shortTitle: raw.shortTitle?.slice(0, 200),
        description: raw.description?.slice(0, 1500),
        eligibility: raw.eligibility?.slice(0, 1200),
        financers: raw.financers.slice(0, 12),
        instructors: raw.instructors?.slice(0, 12),
        programs: raw.programs?.slice(0, 12),
        audiences: raw.audiences.slice(0, 12),
        aidTypes: raw.aidTypes.slice(0, 12),
        categories: raw.categories.slice(0, 16),
        perimeter: raw.perimeter,
        perimeterScale: raw.perimeterScale,
        region: raw.region,
        isCallForProject: raw.isCallForProject,
        startDate: raw.startDate,
        submissionDeadline: raw.submissionDeadline,
        predepositDate: raw.predepositDate,
        rateMin: raw.rateMin,
        rateMax: raw.rateMax,
        amountHint: typeof raw.amountHint === "string" ? raw.amountHint.slice(0, 600) : undefined,
        url: raw.url,
        applicationUrl: raw.applicationUrl,
        contact: raw.contact?.slice(0, 500),
        recurrence: raw.recurrence,
        european: raw.european,
        isLive: raw.isLive,
        searchText: searchTextOf(raw),
        fetchedAt: runAt,
        hash: `${raw.sourceId}:${raw.title.length}:${raw.submissionDeadline ?? 0}`,
      }
      const existing = await ctx.db
        .query("a2e_subventions")
        .withIndex("by_source", (q) => q.eq("source", raw.source).eq("sourceId", raw.sourceId))
        .unique()
      if (existing) {
        await ctx.db.patch(existing._id, doc)
        updated++
      } else {
        await ctx.db.insert("a2e_subventions", doc)
        created++
      }
    }
    return { created, updated }
  },
})

export const finishSource = internalMutation({
  args: {
    key: v.string(),
    label: v.string(),
    url: v.optional(v.string()),
    status: v.string(),
    error: v.optional(v.string()),
    itemCount: v.optional(v.number()),
    runAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Anything not seen during this run is no longer published upstream.
    if (args.runAt && args.status === "ok") {
      const stale = await ctx.db
        .query("a2e_subventions")
        .withIndex("by_source_key", (q) => q.eq("source", args.key))
        .collect()
      for (const row of stale) {
        if (row.fetchedAt < args.runAt && row.isLive) {
          await ctx.db.patch(row._id, { isLive: false })
        }
      }
    }

    const existing = await ctx.db
      .query("a2e_subventionSources")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique()
    const patch = {
      label: args.label,
      url: args.url,
      lastRunAt: Date.now(),
      lastStatus: args.status,
      lastError: args.error,
      itemCount: args.itemCount,
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...patch,
        catalogVersion: existing.catalogVersion + (args.status === "ok" ? 1 : 0),
      })
    } else {
      await ctx.db.insert("a2e_subventionSources", { key: args.key, ...patch, catalogVersion: 1 })
    }
    return true
  },
})

/** Recomputes the facet counters used by the filter bar (single small doc). */
export const rebuildFacets = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("a2e_subventions")
      .withIndex("by_live", (q) => q.eq("isLive", true))
      .collect()
    // Counters are kept as ARRAYS of {key,count}: Convex object field names must
    // be plain ASCII, and French labels are not.
    const tally = new Map<string, Map<string, number>>()
    const bump = (facet: string, key?: string) => {
      if (!key) return
      const map = tally.get(facet) ?? new Map<string, number>()
      map.set(key, (map.get(key) ?? 0) + 1)
      tally.set(facet, map)
    }
    let callsForProject = 0
    let openNow = 0
    const now = Date.now()
    for (const row of rows) {
      row.audiences.forEach((a) => bump("audiences", a))
      row.aidTypes.forEach((a) => bump("aidTypes", a))
      row.categories.forEach((c) => bump("categories", c))
      bump("scales", row.perimeterScale)
      bump("sources", row.source)
      if (row.isCallForProject) callsForProject++
      if (!row.submissionDeadline || row.submissionDeadline > now) openNow++
    }
    const list = (facet: string, limit = 40) =>
      Array.from(tally.get(facet)?.entries() ?? [])
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)

    const facets = {
      total: rows.length,
      openNow,
      callsForProject,
      audiences: list("audiences", 20),
      aidTypes: list("aidTypes", 20),
      categories: list("categories", 30),
      scales: list("scales", 12),
      sources: list("sources", 12),
      builtAt: now,
    }
    const existing = await ctx.db
      .query("a2e_subventionSources")
      .withIndex("by_key", (q) => q.eq("key", FACET_KEY))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        label: JSON.stringify(facets),
        lastRunAt: now,
        lastStatus: "ok",
        itemCount: rows.length,
        catalogVersion: existing.catalogVersion + 1,
      })
    } else {
      await ctx.db.insert("a2e_subventionSources", {
        key: FACET_KEY,
        label: JSON.stringify(facets),
        lastRunAt: now,
        lastStatus: "ok",
        itemCount: rows.length,
        catalogVersion: 1,
      })
    }
    return facets
  },
})

/** Resumable page-by-page ingest of Aides-territoires. */
export const syncAidesPage = internalAction({
  args: { page: v.number(), bearer: v.string(), runAt: v.number(), ingested: v.number() },
  handler: async (ctx, args): Promise<null> => {
    try {
      const { items, hasNext, total } = await fetchAidesPage(args.bearer, args.page)
      await ctx.runMutation(internal.a2e_subventions.upsertBatch, { items, runAt: args.runAt })
      const ingested = args.ingested + items.length
      if (hasNext && args.page < 60) {
        await ctx.scheduler.runAfter(300, internal.a2e_subventions.syncAidesPage, {
          page: args.page + 1,
          bearer: args.bearer,
          runAt: args.runAt,
          ingested,
        })
      } else {
        await ctx.runMutation(internal.a2e_subventions.finishSource, {
          key: "aides-territoires",
          label: "Aides-territoires (\u00c9tat)",
          url: "https://aides-territoires.beta.gouv.fr",
          status: "ok",
          itemCount: ingested,
          runAt: args.runAt,
        })
        await ctx.runMutation(internal.a2e_subventions.rebuildFacets, {})
        console.log(`[subventions] aides-territoires done: ${ingested}/${total}`)
      }
    } catch (error) {
      await ctx.runMutation(internal.a2e_subventions.finishSource, {
        key: "aides-territoires",
        label: "Aides-territoires (\u00c9tat)",
        status: "error",
        error: (error as Error).message.slice(0, 300),
        itemCount: args.ingested,
      })
    }
    return null
  },
})

export const syncCurated = internalAction({
  args: { runAt: v.number() },
  handler: async (ctx, { runAt }): Promise<null> => {
    await ctx.runMutation(internal.a2e_subventions.upsertBatch, { items: CURATED_AIDS, runAt })
    await ctx.runMutation(internal.a2e_subventions.finishSource, {
      key: "curated",
      label: "Dispositifs nationaux (s\u00e9lection Bilan)",
      status: "ok",
      itemCount: CURATED_AIDS.length,
      runAt,
    })
    return null
  },
})

/** Entry point: cron (daily) and the manual "Actualiser" button. */
export const refreshAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ startedAt: number }> => {
    const runAt = Date.now()
    await ctx.runAction(internal.a2e_subventions.syncCurated, { runAt })
    try {
      const bearer = await aidesTerritoiresToken()
      await ctx.scheduler.runAfter(0, internal.a2e_subventions.syncAidesPage, {
        page: 1,
        bearer,
        runAt,
        ingested: 0,
      })
    } catch (error) {
      await ctx.runMutation(internal.a2e_subventions.finishSource, {
        key: "aides-territoires",
        label: "Aides-territoires (\u00c9tat)",
        status: "error",
        error: (error as Error).message.slice(0, 300),
      })
    }
    await ctx.runMutation(internal.a2e_subventions.rebuildFacets, {})
    return { startedAt: runAt }
  },
})

/** Member-triggered refresh (admin only, at most once an hour). */
export const refreshNow = action({
  args: { workspaceId: v.string() },
  handler: async (ctx, args): Promise<{ started: boolean; reason?: string }> => {
    await ctx.runQuery(internal.a2e_subventions.assertAdmin, { workspaceId: args.workspaceId })
    const sources = await ctx.runQuery(api.a2e_subventions.sources, {})
    const last = Math.max(0, ...sources.map((s: any) => s.lastRunAt ?? 0))
    if (Date.now() - last < 60 * 60 * 1000) {
      return { started: false, reason: "Catalogue d\u00e9j\u00e0 actualis\u00e9 il y a moins d'une heure." }
    }
    await ctx.runAction(internal.a2e_subventions.refreshAll, {})
    return { started: true }
  },
})

// ------------------------------------------------------------------ reading

export const assertAdmin = internalQuery({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => await assertWorkspaceMember(ctx, args.workspaceId, "admin"),
})

export const assertMember = internalQuery({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => await assertWorkspaceMember(ctx, args.workspaceId),
})

export const sources = query({
  args: {},
  handler: async (ctx) => {
    await requireWorkosId(ctx)
    const rows = await ctx.db.query("a2e_subventionSources").collect()
    return rows.filter((r) => r.key !== FACET_KEY)
  },
})

export const facets = query({
  args: {},
  handler: async (ctx) => {
    await requireWorkosId(ctx)
    const row = await ctx.db
      .query("a2e_subventionSources")
      .withIndex("by_key", (q) => q.eq("key", FACET_KEY))
      .unique()
    if (!row) return null
    try {
      return { ...JSON.parse(row.label), catalogVersion: row.catalogVersion }
    } catch {
      return null
    }
  },
})

/** Version stamp mixed into every AI cache key. */
export const catalogVersion = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("a2e_subventionSources").collect()
    return rows.reduce((sum, r) => sum + r.catalogVersion, 0)
  },
})

const filterArgs = {
  search: v.optional(v.string()),
  audience: v.optional(v.string()),
  aidType: v.optional(v.string()),
  perimeterScale: v.optional(v.string()),
  source: v.optional(v.string()),
  category: v.optional(v.string()),
  callForProject: v.optional(v.boolean()),
  openOnly: v.optional(v.boolean()),
}

export const catalogue = query({
  args: { paginationOpts: paginationOptsValidator, ...filterArgs },
  handler: async (ctx, args) => {
    await requireWorkosId(ctx)
    const now = Date.now()
    const matches = (row: Doc<"a2e_subventions">) => {
      if (args.audience && !row.audiences.includes(args.audience)) return false
      if (args.aidType && !row.aidTypes.some((t) => t.toLowerCase().includes(args.aidType!.toLowerCase())))
        return false
      if (args.perimeterScale && row.perimeterScale !== args.perimeterScale) return false
      if (args.source && row.source !== args.source) return false
      if (args.category && !row.categories.includes(args.category)) return false
      if (args.callForProject && !row.isCallForProject) return false
      if (args.openOnly && row.submissionDeadline && row.submissionDeadline < now) return false
      return true
    }

    const term = args.search?.trim()
    if (term && term.length >= 2) {
      const page = await ctx.db
        .query("a2e_subventions")
        .withSearchIndex("search_text", (q) => q.search("searchText", term).eq("isLive", true))
        .paginate(args.paginationOpts)
      return { ...page, page: page.page.filter(matches) }
    }

    const page = await ctx.db
      .query("a2e_subventions")
      .withIndex("by_live", (q) => q.eq("isLive", true))
      .order("desc")
      .paginate(args.paginationOpts)
    return { ...page, page: page.page.filter(matches) }
  },
})

export const get = query({
  args: { subventionId: v.id("a2e_subventions") },
  handler: async (ctx, args) => {
    await requireWorkosId(ctx)
    return await ctx.db.get(args.subventionId)
  },
})

export const byIds = internalQuery({
  args: { ids: v.array(v.id("a2e_subventions")) },
  handler: async (ctx, args) => {
    const rows = await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    return rows.filter(Boolean) as Doc<"a2e_subventions">[]
  },
})

export const hydrate = query({
  args: { ids: v.array(v.id("a2e_subventions")) },
  handler: async (ctx, args) => {
    await requireWorkosId(ctx)
    const rows = await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    return rows.filter(Boolean)
  },
})

// -------------------------------------------------------------- AI matching

interface AiProfile {
  structureKind: string
  sectors: string[]
  audiencesServed: string[]
  territory: string
  needs: string[]
  amountNeeded?: number
  keywords: string[]
}

const PROFILE_SCHEMA = {
  type: "OBJECT",
  properties: {
    structureKind: { type: "STRING" },
    sectors: { type: "ARRAY", items: { type: "STRING" } },
    audiencesServed: { type: "ARRAY", items: { type: "STRING" } },
    territory: { type: "STRING" },
    needs: { type: "ARRAY", items: { type: "STRING" } },
    amountNeeded: { type: "NUMBER" },
    keywords: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["structureKind", "sectors", "territory", "needs", "keywords"],
}

const RANK_SCHEMA = {
  type: "OBJECT",
  properties: {
    matches: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          ref: { type: "STRING" },
          score: { type: "NUMBER" },
          reason: { type: "STRING" },
          nextStep: { type: "STRING" },
        },
        required: ["ref", "score", "reason"],
      },
    },
    summary: { type: "STRING" },
  },
  required: ["matches"],
}

/**
 * Key-order-independent JSON — the AI cache must hit even when the model emits
 * the same profile with its fields in a different order.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
}

export const cacheGet = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("a2e_aiCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique()
  },
})

export const cachePut = internalMutation({
  args: {
    key: v.string(),
    kind: v.string(),
    model: v.string(),
    result: v.any(),
    tokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("a2e_aiCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { hits: existing.hits + 1, lastHitAt: Date.now() })
      return existing._id
    }
    return await ctx.db.insert("a2e_aiCache", {
      key: args.key,
      kind: args.kind,
      model: args.model,
      result: args.result,
      tokens: args.tokens,
      hits: 0,
      createdAt: Date.now(),
    })
  },
})

export const cacheHit = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("a2e_aiCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique()
    if (row) await ctx.db.patch(row._id, { hits: row.hits + 1, lastHitAt: Date.now() })
    return true
  },
})

/** Deterministic candidate retrieval \u2014 the AI only ever ranks these. */
export const searchCandidates = internalQuery({
  args: { keywords: v.array(v.string()), audience: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now()
    const seen = new Map<string, Doc<"a2e_subventions">>()
    for (const keyword of args.keywords.slice(0, 5)) {
      const term = keyword.trim()
      if (term.length < 3) continue
      const rows = await ctx.db
        .query("a2e_subventions")
        .withSearchIndex("search_text", (q) => q.search("searchText", term).eq("isLive", true))
        .take(25)
      for (const row of rows) seen.set(String(row._id), row)
    }
    // Always consider the curated national schemes: they are the ones a small
    // structure is most likely to be eligible for, and they are few.
    const curated = await ctx.db
      .query("a2e_subventions")
      .withIndex("by_source_key", (q) => q.eq("source", "curated"))
      .take(40)
    for (const row of curated) if (row.isLive) seen.set(String(row._id), row)

    const scored = Array.from(seen.values())
      .filter((row) => !row.submissionDeadline || row.submissionDeadline > now)
      .filter((row) => !args.audience || row.audiences.length === 0 || row.audiences.includes(args.audience))
      .sort((a, b) => {
        // Deterministic order (curated first, then nearest deadline, then id):
        // the AI cache key embeds this list, so it MUST be stable across runs.
        if (a.source !== b.source) return a.source === "curated" ? -1 : 1
        const da = a.submissionDeadline ?? Number.MAX_SAFE_INTEGER
        const db = b.submissionDeadline ?? Number.MAX_SAFE_INTEGER
        if (da !== db) return da - db
        return String(a._id).localeCompare(String(b._id))
      })
      .slice(0, MAX_CANDIDATES)
    return scored
  },
})

export const runsToday = internalQuery({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const since = Date.now() - 24 * 60 * 60 * 1000
    const rows = await ctx.db
      .query("a2e_subventionRuns")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId).gt("createdAt", since))
      .collect()
    return rows.length
  },
})

export const recordRun = internalMutation({
  args: {
    workspaceId: v.string(),
    prompt: v.string(),
    profile: v.optional(v.any()),
    results: v.any(),
    model: v.optional(v.string()),
    cacheKey: v.string(),
    candidates: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("a2e_subventionRuns", { ...args, createdAt: Date.now() })
  },
})

export const runs = query({
  args: { workspaceId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertWorkspaceMember(ctx, args.workspaceId)
    return await ctx.db
      .query("a2e_subventionRuns")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(args.limit ?? 8)
  },
})

/**
 * "D\u00e9crivez votre projet" \u2192 ranked, justified subventions.
 *
 * Pass 1 turns free text into a structured profile (cached by prompt).
 * A deterministic search then selects \u2264 45 real candidates.
 * Pass 2 ranks ONLY those, and is told explicitly never to invent an aid \u2014 the
 * answer is keyed by `ref` (the candidate index), so a hallucinated id is simply
 * dropped server-side.
 */
export const aiMatch = action({
  args: { workspaceId: v.string(), prompt: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    profile: AiProfile
    matches: Array<{
      subventionId: string
      score: number
      reason: string
      nextStep?: string
      subvention: Doc<"a2e_subventions">
    }>
    summary?: string
    model: string
    cached: boolean
    candidates: number
  }> => {
    await ctx.runQuery(internal.a2e_subventions.assertMember, { workspaceId: args.workspaceId })
    const workosId = await ctx.runQuery(internal.a2e_subventions.whoAmI, {})

    const prompt = args.prompt.trim().slice(0, 2000)
    if (prompt.length < 20) {
      throw new ConvexError("D\u00e9crivez votre projet en quelques phrases (au moins 20 caract\u00e8res).")
    }
    const used = await ctx.runQuery(internal.a2e_subventions.runsToday, {
      workspaceId: args.workspaceId,
    })
    if (used >= MAX_AI_RUNS_PER_DAY) {
      throw new ConvexError(
        `Limite de ${MAX_AI_RUNS_PER_DAY} recherches IA par jour atteinte pour cet espace. Rouvrez une recherche pr\u00e9c\u00e9dente : elle est gratuite.`,
      )
    }

    const model = geminiModel()
    const version = await ctx.runQuery(internal.a2e_subventions.catalogVersion, {})

    // ---- pass 1: structured profile (cached on the prompt alone) ----
    const profileKey = `sub.profile.v2:${await sha256Hex(`${model}|${prompt.toLowerCase()}`)}`
    let profile: AiProfile
    let cached = true
    const cachedProfile = await ctx.runQuery(internal.a2e_subventions.cacheGet, { key: profileKey })
    if (cachedProfile) {
      profile = cachedProfile.result as AiProfile
      await ctx.runMutation(internal.a2e_subventions.cacheHit, { key: profileKey })
    } else {
      cached = false
      const result = await generateJson<AiProfile>({
        system:
          "Tu es analyste du financement public fran\u00e7ais. \u00c0 partir de la description d'un projet, tu extrais un profil structur\u00e9 exploitable pour rechercher des aides. " +
          "structureKind \u2208 {association, entreprise, collectivite, particulier, recherche, autre}. " +
          "keywords : 3 \u00e0 5 mots-cl\u00e9s courts en fran\u00e7ais, sans article, qui serviront de requ\u00eates plein texte (ex: 'insertion num\u00e9rique', 'tiers-lieu', 'emploi jeunes'). " +
          "N'invente aucune information absente du texte : laisse une liste vide plut\u00f4t que de deviner.",
        user: prompt,
        schema: PROFILE_SCHEMA,
        maxOutputTokens: 1200,
      })
      profile = result.data
      await ctx.runMutation(internal.a2e_subventions.cachePut, {
        key: profileKey,
        kind: "sub.profile",
        model: result.model,
        result: profile,
        tokens: result.tokens,
      })
    }

    // ---- deterministic candidate retrieval ----
    const audienceMap: Record<string, string> = {
      association: "association",
      entreprise: "entreprise",
      collectivite: "collectivite",
      particulier: "particulier",
      recherche: "recherche",
    }
    const candidates = await ctx.runQuery(internal.a2e_subventions.searchCandidates, {
      keywords: [...(profile.keywords ?? []), ...(profile.sectors ?? [])].slice(0, 5),
      audience: audienceMap[profile.structureKind] ?? undefined,
    })
    if (candidates.length === 0) {
      return { profile, matches: [], model, cached, candidates: 0 }
    }

    // ---- pass 2: ranking (cached on profile + candidate set + catalogue version) ----
    const compact = candidates.map((row, index) => ({
      ref: `c${index}`,
      title: row.title.slice(0, 180),
      who: row.audiences.join("/") || "non pr\u00e9cis\u00e9",
      types: row.aidTypes.join("/") || "subvention",
      scope: row.perimeterScale ?? row.perimeter ?? "national",
      themes: row.categories.slice(0, 5).join("/"),
      deadline: row.submissionDeadline
        ? new Date(row.submissionDeadline).toISOString().slice(0, 10)
        : "en continu",
      rate: row.rateMax ? `${row.rateMin ?? 0}-${row.rateMax}%` : undefined,
      about: (row.description ?? "").slice(0, 300),
    }))
    const rankKey = `sub.rank.v3:${await sha256Hex(
      `${model}|${version}|${stableStringify(profile)}|${candidates
        .map((c) => String(c._id))
        .sort()
        .join(",")}`,
    )}`
    let ranked: { matches: Array<{ ref: string; score: number; reason: string; nextStep?: string }>; summary?: string }
    const cachedRank = await ctx.runQuery(internal.a2e_subventions.cacheGet, { key: rankKey })
    if (cachedRank) {
      ranked = cachedRank.result as typeof ranked
      await ctx.runMutation(internal.a2e_subventions.cacheHit, { key: rankKey })
    } else {
      cached = false
      const result = await generateJson<typeof ranked>({
        system:
          "Tu es expert des aides publiques fran\u00e7aises. On te donne un projet et une LISTE FERM\u00c9E d'aides candidates. " +
          "R\u00e8gles absolues : (1) tu ne cites QUE des `ref` pr\u00e9sents dans la liste ; (2) tu n'inventes jamais une aide, un montant ou une date ; " +
          "(3) tu \u00e9cartes toute aide dont le public cible est incompatible avec la structure ; (4) score entre 0 et 1 (0.9+ = \u00e9vident, 0.5 = plausible, <0.4 = \u00e0 \u00e9carter) ; " +
          "(5) `reason` : 1 \u00e0 2 phrases en fran\u00e7ais, concr\u00e8tes, qui expliquent l'ad\u00e9quation ou la r\u00e9serve ; (6) `nextStep` : la prochaine action utile. " +
          "Retourne au maximum 12 aides, tri\u00e9es par score d\u00e9croissant, et ignore celles sous 0.35. `summary` : 1 phrase de synth\u00e8se.",
        user: `PROJET:\n${prompt}\n\nPROFIL:\n${JSON.stringify(profile)}\n\nAIDES CANDIDATES:\n${JSON.stringify(compact)}`,
        schema: RANK_SCHEMA,
        maxOutputTokens: 4500,
      })
      ranked = result.data
      await ctx.runMutation(internal.a2e_subventions.cachePut, {
        key: rankKey,
        kind: "sub.rank",
        model: result.model,
        result: ranked,
        tokens: result.tokens,
      })
    }

    const byRef = new Map(candidates.map((row, index) => [`c${index}`, row]))
    /**
     * Resolves a model-returned `ref` back to a REAL candidate. Accepts `c3`,
     * `C3`, `3`, `#3`; anything else is a hallucination and is dropped, so a
     * fabricated aid can never reach the user.
     */
    const resolveRef = (ref: unknown) => {
      const raw = String(ref ?? "").trim().toLowerCase()
      const direct = byRef.get(raw)
      if (direct) return direct
      const digits = raw.match(/(\d+)/)
      if (digits) return byRef.get(`c${Number(digits[1])}`)
      return undefined
    }
    let dropped = 0
    const resolved = (ranked.matches ?? [])
      .map((m) => {
        const row = resolveRef(m.ref)
        if (!row) {
          dropped++
          return null
        }
        const rawScore = Number(m.score) || 0
        return {
          subventionId: String(row._id),
          score: Math.max(0, Math.min(1, rawScore > 1 ? rawScore / 100 : rawScore)),
          reason: String(m.reason ?? "").slice(0, 600),
          nextStep: m.nextStep ? String(m.nextStep).slice(0, 300) : undefined,
          subvention: row,
        }
      })
      .filter(Boolean) as Array<{
      subventionId: string
      score: number
      reason: string
      nextStep?: string
      subvention: Doc<"a2e_subventions">
    }>
    if (dropped > 0) console.warn(`[subventions] dropped ${dropped} unresolvable ref(s)`)
    const seenIds = new Set<string>()
    const matches = resolved.filter((m) => {
      if (seenIds.has(m.subventionId)) return false
      seenIds.add(m.subventionId)
      return true
    })
    matches.sort((a, b) => b.score - a.score)

    await ctx.runMutation(internal.a2e_subventions.recordRun, {
      workspaceId: args.workspaceId,
      prompt,
      profile,
      results: matches.map((m) => ({
        subventionId: m.subventionId,
        score: m.score,
        reason: m.reason,
        nextStep: m.nextStep,
      })),
      model,
      cacheKey: rankKey,
      candidates: candidates.length,
      createdBy: workosId,
    })

    return { profile, matches, summary: ranked.summary, model, cached, candidates: candidates.length }
  },
})

export const whoAmI = internalQuery({
  args: {},
  handler: async (ctx) => await requireWorkosId(ctx),
})

export const aiHealth = query({
  args: {},
  handler: async (ctx) => {
    await requireWorkosId(ctx)
    return aiStatus()
  },
})

// -------------------------------------------------------------- tracking

const savedStatus = v.union(
  v.literal("shortlisted"),
  v.literal("preparing"),
  v.literal("submitted"),
  v.literal("granted"),
  v.literal("rejected"),
  v.literal("abandoned"),
)

export const listSaved = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await assertWorkspaceMember(ctx, args.workspaceId)
    const rows = await ctx.db
      .query("a2e_subventionSaved")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect()
    return await Promise.all(
      rows.map(async (row) => ({
        ...row,
        notes: await decryptOptional(row.workspaceId, "a2e_subventionSaved", "notes", row.notes),
        subvention: await ctx.db.get(row.subventionId),
      })),
    )
  },
})

export const save = mutation({
  args: {
    workspaceId: v.string(),
    subventionId: v.id("a2e_subventions"),
    status: v.optional(savedStatus),
    aiScore: v.optional(v.number()),
    aiReason: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertWorkspaceMember(ctx, args.workspaceId, "member")
    const existing = await ctx.db
      .query("a2e_subventionSaved")
      .withIndex("by_workspace_subvention", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("subventionId", args.subventionId),
      )
      .unique()
    const subvention = await ctx.db.get(args.subventionId)
    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status ?? existing.status,
        aiScore: args.aiScore ?? existing.aiScore,
        aiReason: args.aiReason ?? existing.aiReason,
        projectId: args.projectId ?? existing.projectId,
        updatedAt: now,
      })
      return existing._id
    }
    const id = await ctx.db.insert("a2e_subventionSaved", {
      workspaceId: args.workspaceId,
      subventionId: args.subventionId,
      status: args.status ?? "shortlisted",
      projectId: args.projectId,
      deadline: subvention?.submissionDeadline,
      aiScore: args.aiScore,
      aiReason: args.aiReason,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    await logActivity(ctx, {
      workspaceId: args.workspaceId,
      actorId: userId,
      action: "subvention.saved",
      targetType: "subvention",
      targetId: id,
      metadata: { title: subvention?.title },
    })
    return id
  },
})

export const updateSaved = mutation({
  args: {
    savedId: v.id("a2e_subventionSaved"),
    status: v.optional(savedStatus),
    projectId: v.optional(v.id("projects")),
    amountRequested: v.optional(v.number()),
    amountGranted: v.optional(v.number()),
    deadline: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.savedId)
    if (!row) throw new Error("Not found")
    const { userId } = await assertWorkspaceMember(ctx, row.workspaceId, "member")
    const patch: Record<string, any> = { updatedAt: Date.now() }
    if (args.status !== undefined) {
      patch.status = args.status
      if (args.status === "submitted" && !row.submittedAt) patch.submittedAt = Date.now()
      if (args.status === "granted" || args.status === "rejected") patch.decisionAt = Date.now()
    }
    if (args.projectId !== undefined) patch.projectId = args.projectId
    if (args.amountRequested !== undefined) patch.amountRequested = args.amountRequested
    if (args.amountGranted !== undefined) patch.amountGranted = args.amountGranted
    if (args.deadline !== undefined) patch.deadline = args.deadline
    if (args.notes !== undefined) {
      patch.notes = await encryptOptional(row.workspaceId, "a2e_subventionSaved", "notes", args.notes)
    }
    await ctx.db.patch(args.savedId, patch)
    await logActivity(ctx, {
      workspaceId: row.workspaceId,
      actorId: userId,
      action: "subvention.updated",
      targetType: "subvention",
      targetId: args.savedId,
      metadata: { status: patch.status },
    })
    return args.savedId
  },
})

export const removeSaved = mutation({
  args: { savedId: v.id("a2e_subventionSaved") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.savedId)
    if (!row) return true
    await assertWorkspaceMember(ctx, row.workspaceId, "member")
    await ctx.db.delete(args.savedId)
    return true
  },
})

/**
 * A granted subvention is real money: this turns it into an income movement,
 * which \u2014 through the auto-journal \u2014 immediately appears as a line in the
 * default book, with the funder as reference.
 */
export const convertGrantedToIncome = mutation({
  args: {
    savedId: v.id("a2e_subventionSaved"),
    amount: v.number(),
    date: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"a2e_expenses">> => {
    const row = await ctx.db.get(args.savedId)
    if (!row) throw new Error("Not found")
    await assertWorkspaceMember(ctx, row.workspaceId, "member")
    if (row.incomeExpenseId) {
      const existing = await ctx.db.get(row.incomeExpenseId)
      if (existing) return row.incomeExpenseId
    }
    const subvention = await ctx.db.get(row.subventionId)
    const expenseId: Id<"a2e_expenses"> = await ctx.runMutation(api.a2e_expenses.create, {
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      description: `Subvention \u2014 ${subvention?.title?.slice(0, 120) ?? "aide publique"}`,
      amount: args.amount,
      category: "Subventions",
      date: args.date ?? Date.now(),
      paymentMethod: args.paymentMethod ?? "Bank transfer",
      type: "income",
      notes: subvention?.financers?.length ? `Financeur : ${subvention.financers.join(", ")}` : undefined,
    })
    await ctx.db.patch(args.savedId, {
      status: "granted",
      amountGranted: args.amount,
      decisionAt: Date.now(),
      incomeExpenseId: expenseId,
      updatedAt: Date.now(),
    })
    await ctx.db.patch(expenseId, { linkedSubventionSavedId: args.savedId })
    return expenseId
  },
})
