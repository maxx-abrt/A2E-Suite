#!/usr/bin/env node
/**
 * Refreshes the vendored `@a2e/core` package (packages/a2e-core) from A2E-Core.
 *
 *   A2E_CORE_PATH="../A2E Core" node scripts/sync-a2e-core.mjs
 *   GITHUB_TOKEN=ghp_xxx node scripts/sync-a2e-core.mjs --ref v0.3.0
 *
 * Copies `packages/core/{src,package.json,CHANGELOG.md}` verbatim and reports
 * what changed. Never touches VENDORED.md.
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const REPO = process.env.A2E_CORE_REPO ?? "maxx-abrt/A2E-Core"
const DEST = path.resolve("packages/a2e-core")
const refArg = process.argv.indexOf("--ref")
const ref = refArg > -1 ? process.argv[refArg + 1] : "main"

function fromLocal(localPath) {
  const source = path.join(localPath, "packages", "core")
  if (!fs.existsSync(source)) throw new Error(`No packages/core in ${localPath}`)
  return source
}

function fromGitHub() {
  const token = process.env.GITHUB_TOKEN
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "a2e-core-"))
  const auth = token ? `${token}@` : ""
  execSync(`git clone --depth 1 --branch ${ref} https://${auth}github.com/${REPO}.git "${tmp}"`, {
    stdio: "inherit",
  })
  return fromLocal(tmp)
}

const source = process.env.A2E_CORE_PATH ? fromLocal(process.env.A2E_CORE_PATH) : fromGitHub()

fs.rmSync(path.join(DEST, "src"), { recursive: true, force: true })
fs.cpSync(path.join(source, "src"), path.join(DEST, "src"), { recursive: true })
for (const file of ["package.json", "CHANGELOG.md", "tsconfig.json"]) {
  const from = path.join(source, file)
  if (fs.existsSync(from)) fs.cpSync(from, path.join(DEST, file))
}

const version = JSON.parse(fs.readFileSync(path.join(DEST, "package.json"), "utf8")).version
console.log(`\n@a2e/core vendored at version ${version} (ref: ${ref})`)
try {
  const diff = execSync("git status --porcelain packages/a2e-core", { encoding: "utf8" })
  console.log(diff.trim() ? `Changed files:\n${diff}` : "Already up to date.")
} catch {
  /* not a git checkout */
}
console.log("Next: pnpm install && pnpm typecheck")
