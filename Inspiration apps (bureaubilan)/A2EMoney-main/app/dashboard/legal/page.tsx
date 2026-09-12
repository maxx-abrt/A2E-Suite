"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Shield, Scale, ExternalLink } from "@/components/iconsax"
import { GlassCard } from "@/components/glass-card"

export default function LegalPage() {
  const t = useTranslations("pages.legal")
  const items = t.raw("residency.items") as string[]
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/legal/privacy">
            <GlassCard className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{t("privacyDesc").split(".")[0]}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("privacyDesc")}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-primary">{t("read")} <ExternalLink className="h-3 w-3" /></p>
            </GlassCard>
          </Link>
          <Link href="/legal/terms">
            <GlassCard className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{t("termsDesc").split(".")[0]}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("termsDesc")}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-primary">{t("read")} <ExternalLink className="h-3 w-3" /></p>
            </GlassCard>
          </Link>
        </div>
        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold">{t("residency.title")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {items.map((item, i) => (<li key={i}>• {item}</li>))}
          </ul>
        </GlassCard>
      </div>
    </div>
  )
}
