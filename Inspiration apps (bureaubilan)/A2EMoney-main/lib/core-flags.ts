"use client"

/**
 * A2E Core module flags.
 *
 * Every shared module defaults to **ON** (core is the source of truth). Each read
 * is a live getter, which is what lets `CoreErrorBoundary` call
 * `disableCoreModules()` at runtime and degrade the page to Bilan-only data
 * instead of dying — no refactor, no reload.
 *
 * Force a module off for one environment with `NEXT_PUBLIC_A2E_CORE_<MODULE>=0`.
 */

const off = (value?: string) => value === "0" || value === "false"

let runtimeDisabled = false
const listeners = new Set<() => void>()

const env = {
  workspaces: process.env.NEXT_PUBLIC_A2E_CORE_WORKSPACES,
  members: process.env.NEXT_PUBLIC_A2E_CORE_MEMBERS,
  drive: process.env.NEXT_PUBLIC_A2E_DRIVE,
  notifications: process.env.NEXT_PUBLIC_A2E_CORE_NOTIFICATIONS,
  activities: process.env.NEXT_PUBLIC_A2E_CORE_ACTIVITIES,
  contacts: process.env.NEXT_PUBLIC_A2E_CORE_CONTACTS,
  tasks: process.env.NEXT_PUBLIC_A2E_CORE_TASKS,
  search: process.env.NEXT_PUBLIC_A2E_CORE_SEARCH,
  quotas: process.env.NEXT_PUBLIC_A2E_CORE_QUOTAS,
}

export const coreFlags = {
  get workspaces() {
    return !runtimeDisabled && !off(env.workspaces)
  },
  get members() {
    return !runtimeDisabled && !off(env.members)
  },
  get drive() {
    return !runtimeDisabled && !off(env.drive)
  },
  get notifications() {
    return !runtimeDisabled && !off(env.notifications)
  },
  get activities() {
    return !runtimeDisabled && !off(env.activities)
  },
  get contacts() {
    return !runtimeDisabled && !off(env.contacts)
  },
  get tasks() {
    return !runtimeDisabled && !off(env.tasks)
  },
  get search() {
    return !runtimeDisabled && !off(env.search)
  },
  get quotas() {
    return !runtimeDisabled && !off(env.quotas)
  },
  get degraded() {
    return runtimeDisabled
  },
}

/** Called by the core error boundary: keep the app alive on Bilan-only data. */
export function disableCoreModules() {
  if (runtimeDisabled) return
  runtimeDisabled = true
  listeners.forEach((fn) => fn())
}

export function enableCoreModules() {
  if (!runtimeDisabled) return
  runtimeDisabled = false
  listeners.forEach((fn) => fn())
}

export function onCoreFlagsChange(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
