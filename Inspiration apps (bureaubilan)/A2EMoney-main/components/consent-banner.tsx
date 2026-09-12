"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { useConvexAuth } from "convex/react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { ShieldTick } from "@/components/iconsax"

const CONSENT_VERSION = "2026-08-01"
const LOCAL_KEY = "bilan_consent_v1"

/**
 * GDPR consent banner. Bilan ships no third-party trackers, so the only optional
 * purpose is product analytics — off until explicitly accepted, and the decision
 * is recorded server-side (art. 7.1: provable, versioned consent).
 */
export function ConsentBanner() {
  const t = useTranslations("consent")
  const { isAuthenticated } = useConvexAuth()
  const consents = useQuery(api.gdpr.consents, isAuthenticated ? {} : "skip")
  const setConsent = useMutation(api.gdpr.setConsent)
  const [dismissed, setDismissed] = React.useState(true)

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(LOCAL_KEY) === CONSENT_VERSION)
    } catch {
      setDismissed(false)
    }
  }, [])

  const recorded = (consents ?? []).some((c) => c.purpose === "analytics" && c.version === CONSENT_VERSION)
  if (dismissed || recorded || !isAuthenticated) return null

  async function decide(granted: boolean) {
    try {
      await setConsent({ purpose: "analytics", granted, version: CONSENT_VERSION })
    } catch {
      /* keep the UI responsive even if the write fails */
    }
    try {
      window.localStorage.setItem(LOCAL_KEY, CONSENT_VERSION)
    } catch {
      /* private mode */
    }
    setDismissed(true)
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-border bg-card p-4 shadow-lg sm:inset-x-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <ShieldTick className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{t("title")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("body")}{" "}
              <Link href="/security" className="underline hover:text-foreground">
                {t("learnMore")}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => decide(false)} data-testid="consent-refuse">
            {t("refuse")}
          </Button>
          <Button size="sm" onClick={() => decide(true)} data-testid="consent-accept">
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  )
}
