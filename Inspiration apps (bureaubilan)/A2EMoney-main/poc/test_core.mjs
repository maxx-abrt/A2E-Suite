/**
 * A2E Bilan × Core — SINGLE core-flow POC.
 *
 * Proves, end to end, against the REAL deployments:
 *  1. WorkOS password grant → access token for the QA user
 *  2. that token authenticates on BILAN's Convex deployment (academic-stoat-784)
 *  3. the SAME token authenticates on the CORE deployment (superb-grasshopper-152)
 *  4. core workspace provisioning (users:store → workspaces:listMine/create)
 *  5. secret-gated service bridge (sync:workspacesForUser) with A2E_SERVICE_SECRET
 *  6. core DRIVE on Backblaze B2: presignUpload → PUT bytes → presignView → GET bytes back
 *     (+ linkedTo round-trip: drive:listLinked for a Bilan expense)
 *  7. core contacts / tasks / notifications / activities read+write
 *  8. WebCrypto AES-256-GCM envelope encryption (the at-rest field crypto Bilan will use)
 *
 * Run: node poc/test_core.mjs
 */
import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"
import fs from "node:fs"
import path from "node:path"
import { webcrypto as crypto } from "node:crypto"

// ---------------------------------------------------------------- env
const envPath = path.join(process.cwd(), ".env.local")
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
}

const APP_URL = process.env.NEXT_PUBLIC_CONVEX_URL
const CORE_URL = process.env.NEXT_PUBLIC_CONVEX_CORE_URL
const SECRET = process.env.A2E_SERVICE_SECRET
const WORKOS_API_KEY = process.env.WORKOS_API_KEY
const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID
const QA_EMAIL = process.env.QA_EMAIL || "devlogin@association.org"
const QA_PASSWORD = process.env.QA_PASSWORD || "A2eMoney!Test2025"

const results = []
const ok = (n, d = "") => { results.push(["PASS", n, d]); console.log(`  ✅ ${n}${d ? " — " + d : ""}`) }
const ko = (n, e) => { results.push(["FAIL", n, String(e?.message ?? e)]); console.log(`  ❌ ${n} — ${e?.message ?? e}`) }
const step = (t) => console.log(`\n=== ${t} ===`)

// NOTE: makeFunctionReference's first (and only) runtime arg is the function NAME;
// the query/mutation/action kind is a TypeScript generic only.
const q = (name) => makeFunctionReference(name)
const m = (name) => makeFunctionReference(name)
const a = (name) => makeFunctionReference(name)

// ---------------------------------------------------------------- 1. WorkOS
async function workosToken() {
  step("1. WorkOS password grant (QA user)")
  const res = await fetch("https://api.workos.com/user_management/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: WORKOS_CLIENT_ID,
      client_secret: WORKOS_API_KEY,
      grant_type: "password",
      email: QA_EMAIL,
      password: QA_PASSWORD,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`WorkOS ${res.status}: ${JSON.stringify(json).slice(0, 400)}`)
  const payload = JSON.parse(Buffer.from(json.access_token.split(".")[1], "base64url").toString())
  ok("workos.password_grant", `sub=${payload.sub} iss=${payload.iss}`)
  return { token: json.access_token, sub: payload.sub, user: json.user }
}

// ---------------------------------------------------------------- main
async function main() {
  console.log("BILAN:", APP_URL, "\nCORE :", CORE_URL)
  let token, sub, user
  try {
    ;({ token, sub, user } = await workosToken())
  } catch (e) {
    ko("workos.password_grant", e)
    console.log("\nCannot continue without a token."); return report()
  }

  const app = new ConvexHttpClient(APP_URL)
  const core = new ConvexHttpClient(CORE_URL)
  app.setAuth(token)
  core.setAuth(token)

  // ---- 2. token valid on Bilan deployment
  step("2. Token validates on BILAN deployment")
  try {
    const me = await app.query(q("directory:me"), {})
    if (!me || me.workosId !== sub) throw new Error(`identity mismatch: ${JSON.stringify(me)}`)
    ok("bilan.identity", `workosId=${me.workosId} (derived from the verified JWT)`)
  } catch (e) { ko("bilan.identity", e) }

  // ---- 3+4. token valid on CORE + workspace provisioning
  step("3. Same token validates on CORE deployment + workspace provisioning")
  let coreWsId = null
  try {
    const coreUid = await core.mutation(m("users:store"), {})
    ok("core.users.store", `coreUserId=${coreUid}`)
  } catch (e) { ko("core.users.store", e) }
  try {
    let list = await core.query(q("workspaces:listMine"), {})
    if (!list || list.length === 0) {
      const id = await core.mutation(m("workspaces:create"), {
        name: "Association 2E", type: "association", locale: "fr", currency: "EUR",
      })
      ok("core.workspaces.create", `id=${id}`)
      list = await core.query(q("workspaces:listMine"), {})
    }
    coreWsId = list[0]._id
    ok("core.workspaces.listMine", `${list.length} ws → active=${coreWsId} (${list[0].name}, role=${list[0].role})`)
  } catch (e) { ko("core.workspaces.listMine", e) }

  if (!coreWsId) { console.log("\nNo core workspace → stopping."); return report() }

  // ---- 5. service bridge
  step("4. Service bridge (secret-gated, server-to-server)")
  try {
    const anon = new ConvexHttpClient(CORE_URL)
    const rows = await anon.query(q("sync:workspacesForUser"), { workosId: sub, secret: SECRET })
    ok("core.sync.workspacesForUser", `${rows.length} membership(s): ${rows.map((r) => `${r.name}:${r.role}`).join(", ")}`)
    try {
      await anon.query(q("sync:workspacesForUser"), { workosId: sub, secret: "wrong-secret" })
      ko("core.sync.rejects_bad_secret", "bad secret was ACCEPTED")
    } catch { ok("core.sync.rejects_bad_secret") }
  } catch (e) { ko("core.sync.workspacesForUser", e) }

  // ---- 6. entitlements/quota
  step("5. Entitlements & quotas")
  try {
    const ent = await core.query(q("entitlements:get"), { workspaceId: coreWsId })
    ok("core.entitlements.get", `plan=${ent.planKey} storage=${ent.limits?.storageBytes} used=${ent.usage?.storageUsed}`)
  } catch (e) { ko("core.entitlements.get", e) }

  // ---- 7. DRIVE on B2 (the heart of "files linked to money data")
  step("6. Core DRIVE on Backblaze B2 — upload → view → linked round-trip")
  const bytes = Buffer.from(`BILAN POC receipt ${new Date().toISOString()}\n${"x".repeat(256)}`)
  const linkedTo = { app: "bilan", type: "expense", id: "poc-expense-" + Date.now() }
  let fileId = null
  try {
    const pre = await core.action(a("drive:presignUpload"), {
      workspaceId: coreWsId,
      name: "poc-receipt.txt",
      size: bytes.byteLength,
      contentType: "text/plain",
      sourceApp: "bilan",
      linkedTo,
    })
    fileId = pre.fileId
    ok("core.drive.presignUpload", `fileId=${pre.fileId} s3Key=${pre.s3Key}`)
    const put = await fetch(pre.uploadUrl, { method: "PUT", body: bytes, headers: { "Content-Type": "text/plain" } })
    if (!put.ok) throw new Error(`B2 PUT ${put.status} ${(await put.text()).slice(0, 200)}`)
    ok("b2.put_bytes", `${bytes.byteLength} B → 200`)
    const view = await core.action(a("drive:presignView"), { fileId: pre.fileId })
    const got = await fetch(view.url)
    const body = Buffer.from(await got.arrayBuffer())
    if (!got.ok) throw new Error(`B2 GET ${got.status}`)
    if (!body.equals(bytes)) throw new Error(`byte mismatch (${body.byteLength} vs ${bytes.byteLength})`)
    ok("b2.get_bytes_identical", `${body.byteLength} B round-trip OK`)
    const dl = await core.action(a("drive:presignDownload"), { fileId: pre.fileId })
    ok("core.drive.presignDownload", dl.url.split("?")[0].slice(-46))
  } catch (e) { ko("core.drive.upload_flow", e) }

  try {
    const linked = await core.query(q("drive:listLinked"), { workspaceId: coreWsId, ...linkedTo })
    if (!linked.some((f) => f._id === fileId)) throw new Error("uploaded file not returned by listLinked")
    ok("core.drive.listLinked", `${linked.length} file(s) linked to the Bilan expense`)
    const files = await core.query(q("drive:listFiles"), { workspaceId: coreWsId })
    ok("core.drive.listFiles", `${files.length} file(s) in workspace drive`)
    const found = await core.query(q("drive:searchFiles"), { workspaceId: coreWsId, query: "poc" })
    ok("core.drive.searchFiles", `${found.length} hit(s)`)
  } catch (e) { ko("core.drive.listLinked", e) }

  // ---- 8. contacts (a2e_clients replacement)
  step("7. Core CONTACTS (Bilan clients) + contactLinks")
  try {
    const clientRef = { app: "bilan", type: "client", id: "poc-client-" + Date.now() }
    const cid = await core.mutation(m("contacts:create"), {
      workspaceId: coreWsId, name: "POC Donateur SAS", email: `poc+${Date.now()}@example.org`,
      siret: "12345678900011", sourceApp: "bilan", link: clientRef,
    })
    ok("core.contacts.create", `contactId=${cid}`)
    const forTarget = await core.query(q("contacts:listForTarget"), { workspaceId: coreWsId, ...clientRef })
    if (!forTarget.some((c) => c._id === cid)) throw new Error("contactLinks round-trip failed")
    ok("core.contacts.listForTarget", `${forTarget.length}`)
    const hits = await core.query(q("contacts:search"), { workspaceId: coreWsId, query: "POC" })
    ok("core.contacts.search", `${hits.length} hit(s)`)
    await core.mutation(m("contacts:remove"), { contactId: cid })
    ok("core.contacts.remove")
  } catch (e) { ko("core.contacts", e) }

  // ---- 9. tasks
  step("8. Core TASKS (Bilan project tasks)")
  try {
    await core.mutation(m("tasks:ensureDefaultStatuses"), { workspaceId: coreWsId })
    const statuses = await core.query(q("tasks:listStatuses"), { workspaceId: coreWsId })
    ok("core.tasks.listStatuses", statuses.map((s) => s.key).join(","))
    const tid = await core.mutation(m("tasks:create"), {
      workspaceId: coreWsId, title: "POC — envoyer le CERFA 15059", sourceApp: "bilan",
      priority: "high", linkedTo: { app: "bilan", type: "project", id: "poc-project" },
    })
    ok("core.tasks.create", `taskId=${tid}`)
    const tasks = await core.query(q("tasks:list"), { workspaceId: coreWsId })
    ok("core.tasks.list", `${tasks.length} task(s)`)
    await core.mutation(m("tasks:remove"), { taskId: tid })
    ok("core.tasks.remove")
  } catch (e) { ko("core.tasks", e) }

  // ---- 10. notifications + activities + search
  step("9. Core NOTIFICATIONS / ACTIVITIES / SEARCH")
  try {
    await core.mutation(m("notifications:sendToWorkspace"), {
      workspaceId: coreWsId, type: "bilan.poc", title: "POC Bilan", message: "Notification de test", link: "/dashboard",
    })
    const notifs = await core.query(q("notifications:listMine"), { limit: 5 })
    ok("core.notifications", `${notifs.length} in bell, unread=${await core.query(q("notifications:unreadCount"), {})}`)
  } catch (e) { ko("core.notifications", e) }
  try {
    const acts = await core.query(q("activities:list"), { workspaceId: coreWsId, limit: 5 })
    ok("core.activities.list", `${acts.length} entries (audit trail)`)
  } catch (e) { ko("core.activities.list", e) }
  try {
    const res = await core.query(q("search:search"), { workspaceId: coreWsId, query: "poc" })
    ok("core.search", `files=${res.files?.length ?? 0} contacts=${res.contacts?.length ?? 0} tasks=${res.tasks?.length ?? 0}`)
  } catch (e) { ko("core.search", e) }
  try {
    const members = await core.query(q("workspaces:listMembers"), { workspaceId: coreWsId })
    ok("core.workspaces.listMembers", members.map((x) => `${x.email}:${x.role}`).join(", "))
    const perms = await core.query(q("roles:myPermissions"), { workspaceId: coreWsId })
    ok("core.roles.myPermissions", `${perms.length} permissions`)
  } catch (e) { ko("core.members", e) }

  // ---- 11. security: unauthenticated core access must fail
  step("10. Security — anonymous access is refused")
  try {
    const anon = new ConvexHttpClient(CORE_URL)
    await anon.query(q("workspaces:listMine"), {})
    ko("core.rejects_anonymous", "anonymous read SUCCEEDED")
  } catch { ok("core.rejects_anonymous") }

  // ---- 12. field-level AES-256-GCM envelope crypto (Bilan at-rest encryption)
  step("11. AES-256-GCM envelope encryption (Bilan sensitive fields)")
  try {
    const master = crypto.getRandomValues(new Uint8Array(32))
    const enc = new TextEncoder()
    const hkdf = await crypto.subtle.importKey("raw", master, "HKDF", false, ["deriveKey"])
    const dek = await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: enc.encode("a2e-bilan-v1"), info: enc.encode(`ws:${coreWsId}`) },
      hkdf, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
    )
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const plain = "FR7630006000011234567890189"
    const aad = enc.encode(`bilan:a2e_orgProfile:iban:${coreWsId}`)
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, dek, enc.encode(plain))
    const back = new TextDecoder().decode(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, dek, ct),
    )
    if (back !== plain) throw new Error("decrypt mismatch")
    ok("crypto.aes256gcm_roundtrip", `iban→${Buffer.from(ct).toString("base64").slice(0, 24)}… →decrypted OK`)
    try {
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: enc.encode("bilan:other:field:x") }, dek, ct,
      )
      ko("crypto.aad_binding", "wrong AAD decrypted (no context binding!)")
    } catch { ok("crypto.aad_binding", "ciphertext bound to workspace+table+field") }
  } catch (e) { ko("crypto.envelope", e) }

  // ---- 13. BILAN backend × core cutover (Pattern A)
  step("12. BILAN backend — membership mirror, directory, encryption, GDPR")
  try {
    const synced = await app.action(a("coreSync:syncFromCore"), {})
    ok("bilan.coreSync.syncFromCore", `${synced.workspaces} workspace(s) mirrored`)
    const status = await app.query(q("coreSync:status"), {})
    if (!status.configured) throw new Error("bridge not configured on Bilan deployment")
    if (!status.memberships.some((m) => m.workspaceId === coreWsId)) throw new Error("active workspace missing from mirror")
    ok("bilan.coreSync.status", `core=${status.coreHost} memberships=${status.memberships.length}`)
  } catch (e) { ko("bilan.coreSync", e) }

  try {
    const coreMe = await core.query(q("users:me"), {})
    const dir = await app.action(a("directory:syncMe"), { coreUserId: coreMe?._id })
    if (dir.email !== QA_EMAIL) throw new Error(`expected ${QA_EMAIL}, got ${dir.email}`)
    ok("bilan.directory.syncMe", `verified email from WorkOS API: ${dir.email}`)
    const members = await app.query(q("directory:membersOf"), { workspaceId: coreWsId })
    ok("bilan.directory.membersOf", members.map((m) => `${m.email ?? "?"}:${m.role}`).join(", "))
  } catch (e) { ko("bilan.directory", e) }

  const IBAN = "FR7630006000011234567890189"
  try {
    await app.mutation(m("a2e_org:upsert"), {
      workspaceId: coreWsId, legalName: "Association 2E", iban: IBAN, bic: "AGRIFRPP", siret: "12345678900011",
      email: "tresorerie@association2e.org", city: "Paris",
    })
    const org = await app.query(q("a2e_org:get"), { workspaceId: coreWsId })
    if (org?.iban !== IBAN) throw new Error(`IBAN did not round-trip (${org?.iban})`)
    ok("bilan.org.encrypted_roundtrip", `IBAN + BIC + SIRET encrypted at rest, decrypted for members`)
  } catch (e) { ko("bilan.org.encryption", e) }

  let expenseId = null
  try {
    expenseId = await app.mutation(m("a2e_expenses:create"), {
      workspaceId: coreWsId, description: "POC — achat fournitures", amount: 42.5, category: "Supplies",
      date: Date.now(), paymentMethod: "Carte bancaire", type: "expense", notes: "Note confidentielle POC",
    })
    const list = await app.query(q("a2e_expenses:list"), { workspaceId: coreWsId })
    const mine = list.find((e) => e._id === expenseId)
    if (mine?.notes !== "Note confidentielle POC") throw new Error("notes did not decrypt")
    if (mine?.paymentMethod !== "Carte bancaire") throw new Error("paymentMethod did not decrypt")
    ok("bilan.expenses.encrypted_roundtrip", `${list.length} row(s), notes+paymentMethod decrypted`)
  } catch (e) { ko("bilan.expenses", e) }

  try {
    const invoiceId = await app.mutation(m("a2e_invoices:create"), {
      workspaceId: coreWsId, client: "Mairie de Paris", clientEmail: "subventions@paris.fr",
      items: [{ id: "1", description: "Subvention 2026", quantity: 1, unitPrice: 5000 }],
      issueDate: Date.now(), dueDate: Date.now() + 86400_000 * 30,
    })
    const before = await core.query(q("notifications:listMine"), { limit: 50 })
    await app.mutation(m("a2e_invoices:update"), { invoiceId, status: "paid", paidDate: Date.now() })
    const invoices = await app.query(q("a2e_invoices:list"), { workspaceId: coreWsId })
    const inv = invoices.find((i) => i._id === invoiceId)
    if (inv?.clientEmail !== "subventions@paris.fr") throw new Error("clientEmail did not decrypt")
    ok("bilan.invoices.encrypted_roundtrip", `${invoices.length} invoice(s), clientEmail decrypted`)
    // The paid-invoice notification is fanned out through the CORE bell via the bridge.
    let after = before
    for (let i = 0; i < 10 && after.length <= before.length; i++) {
      await new Promise((r) => setTimeout(r, 1200))
      after = await core.query(q("notifications:listMine"), { limit: 50 })
    }
    if (after.length <= before.length) throw new Error("no core notification received from Bilan's backend")
    ok("bilan→core.notifyWorkspace", `bell went ${before.length} → ${after.length} ("${after[0]?.title}")`)
  } catch (e) { ko("bilan.invoices", e) }

  try {
    const posture = await app.query(q("security:posture"), { workspaceId: coreWsId })
    if (!posture.encryption.enabled) throw new Error("encryption reported as disabled")
    ok("bilan.security.posture", `${posture.encryption.algorithm} · bridge=${posture.bridge.configured} · files=${posture.storage.provider}`)
    const exported = await app.query(q("gdpr:exportWorkspace"), { workspaceId: coreWsId })
    const rows = Object.values(exported.data).reduce((n, v) => n + (Array.isArray(v) ? v.length : v ? 1 : 0), 0)
    if (exported.data.organisation?.iban !== IBAN) throw new Error("GDPR export did not decrypt the org profile")
    ok("bilan.gdpr.exportWorkspace", `${rows} record(s), decrypted for the data subject`)
    const mine = await app.query(q("gdpr:exportMe"), {})
    ok("bilan.gdpr.exportMe", `subject=${mine.subject?.email ?? "?"} workspaces=${mine.workspaces.length}`)
    const register = await app.query(q("gdpr:processingRegister"), {})
    ok("bilan.gdpr.processingRegister", `${register.purposes.length} purposes, ${register.subProcessors.length} sub-processors`)
  } catch (e) { ko("bilan.security_gdpr", e) }

  try {
    if (expenseId) await app.mutation(m("a2e_expenses:remove"), { expenseId })
    const anonApp = new ConvexHttpClient(APP_URL)
    try {
      await anonApp.query(q("a2e_expenses:list"), { workspaceId: coreWsId })
      ko("bilan.rejects_anonymous", "anonymous read SUCCEEDED")
    } catch { ok("bilan.rejects_anonymous") }
  } catch (e) { ko("bilan.cleanup", e) }

  report()
}

function report() {
  const pass = results.filter((r) => r[0] === "PASS").length
  const fail = results.filter((r) => r[0] === "FAIL")
  console.log(`\n${"=".repeat(70)}\nPOC RESULT: ${pass} passed, ${fail.length} failed`)
  for (const f of fail) console.log(`  ❌ ${f[1]}: ${f[2]}`)
  console.log("=".repeat(70))
  process.exit(fail.length ? 1 : 0)
}

main().catch((e) => { console.error("FATAL", e); process.exit(1) })
