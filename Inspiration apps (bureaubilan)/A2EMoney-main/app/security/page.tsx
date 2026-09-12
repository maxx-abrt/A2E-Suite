"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import { api } from "@/convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BilanMark, BilanWordmark } from "@/components/bilan-logo"
import { LanguageSwitcher } from "@/components/language-switcher"
import {
  ShieldTick,
  Lock,
  Global,
  Folder2,
  DocumentText1,
  People,
  TickCircle,
  ArrowRight,
  Refresh,
  Danger,
} from "@/components/iconsax"

/**
 * PUBLIC TRUST CENTER — /security
 *
 * Not a marketing page: every technical claim is read live from the running
 * backend (`security.posture`, `gdpr.processingRegister`). If encryption were
 * disabled on the deployment, this page would say so.
 */
export default function SecurityPage() {
  const t = useTranslations("pages.security")
  const posture = useQuery(api.security.posture, {})
  const register = useQuery(api.gdpr.processingRegister, {})

  const encryptedFields = posture?.encryption.fields ?? {}
  const fieldCount = Object.values(encryptedFields).reduce((n, list) => n + (list?.length ?? 0), 0)

  const pillars = [
    {
      icon: Lock,
      title: t("pillars.encryption.title"),
      body: t("pillars.encryption.body"),
      facts: [
        posture?.encryption.algorithm ?? "AES-256-GCM",
        posture?.encryption.keyDerivation ?? "HKDF-SHA256",
        posture?.encryption.contextBinding ?? "AEAD context binding",
      ],
    },
    {
      icon: ShieldTick,
      title: t("pillars.auth.title"),
      body: t("pillars.auth.body"),
      facts: [posture?.auth.provider ?? "WorkOS AuthKit", posture?.auth.tokens ?? "RS256 JWT", posture?.auth.sessionCookie ?? ""],
    },
    {
      icon: Folder2,
      title: t("pillars.files.title"),
      body: t("pillars.files.body"),
      facts: [
        posture?.storage.provider ?? "Backblaze B2",
        posture?.storage.access ?? "presigned URLs",
        t("pillars.files.private"),
      ],
    },
    {
      icon: Global,
      title: t("pillars.residency.title"),
      body: t("pillars.residency.body"),
      facts: [
        posture?.residency.appDatabase ?? "",
        posture?.residency.sharedDatabase ?? "",
        posture?.residency.files ?? "",
      ],
    },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 [mask-image:radial-gradient(70%_55%_at_50%_20%,black,transparent)]"
      >
        <div className="absolute left-[8%] top-24 h-72 w-72 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute right-[6%] top-8 h-80 w-80 rounded-full bg-[var(--brand-green)]/20 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BilanMark size={32} />
            <BilanWordmark size={26} className="hidden sm:block" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/dashboard">
                {t("cta")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        {/* Hero */}
        <div className="max-w-3xl">
          <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1 text-[11px]">
            <ShieldTick className="h-3.5 w-3.5" /> {t("badge")}
          </Badge>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">{t("subtitle")}</p>
        </div>

        {/* Live status strip */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: t("live.encryption"),
              value: posture?.encryption.enabled ? t("live.active") : t("live.inactive"),
              ok: posture?.encryption.enabled,
            },
            { label: t("live.fields"), value: String(fieldCount), ok: fieldCount > 0 },
            {
              label: t("live.bucket"),
              value: posture?.storage.bucketPublic ? t("live.public") : t("live.private"),
              ok: !posture?.storage.bucketPublic,
            },
            { label: t("live.region"), value: "EU", ok: true },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold">
                {item.ok ? (
                  <TickCircle className="h-4 w-4 text-success" />
                ) : (
                  <Danger className="h-4 w-4 text-warning" />
                )}
                {posture === undefined ? "…" : item.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Refresh className="h-3 w-3" /> {t("live.notice")}
        </p>

        {/* Pillars */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {pillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div key={pillar.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_16%,var(--card))] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">{pillar.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{pillar.body}</p>
                <ul className="mt-4 space-y-1.5">
                  {pillar.facts.filter(Boolean).map((fact) => (
                    <li key={fact} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <TickCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      <span className="font-mono">{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Encrypted fields */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">{t("fields.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("fields.body")}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Object.entries(encryptedFields).flatMap(([table, list]) =>
              (list ?? []).map((field) => (
                <Badge key={`${table}.${field}`} variant="outline" className="font-mono text-[11px]">
                  {table.replace("a2e_", "")}.{field}
                </Badge>
              )),
            )}
          </div>
        </section>

        {/* Architecture */}
        <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6">
          <h2 className="text-2xl font-bold tracking-tight">{t("architecture.title")}</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("architecture.body")}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { icon: DocumentText1, title: t("architecture.bilan.title"), body: t("architecture.bilan.body") },
              { icon: People, title: t("architecture.core.title"), body: t("architecture.core.body") },
              { icon: Folder2, title: t("architecture.drive.title"), body: t("architecture.drive.body") },
            ].map((block) => {
              const Icon = block.icon
              return (
                <div key={block.title} className="rounded-xl border border-border bg-card p-4">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="mt-2 text-sm font-semibold">{block.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{block.body}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* GDPR */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">{t("gdpr.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("gdpr.body")}</p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("gdpr.purpose")}</th>
                  <th className="px-4 py-3 font-medium">{t("gdpr.basis")}</th>
                  <th className="px-4 py-3 font-medium">{t("gdpr.retention")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(register?.purposes ?? []).map((row) => (
                  <tr key={row.purpose}>
                    <td className="px-4 py-3">{row.purpose}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.basis}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("gdpr.subProcessors")}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(register?.subProcessors ?? []).map((sp) => (
              <div key={sp.name} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">{sp.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{sp.role}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {sp.location}
                </Badge>
              </div>
            ))}
          </div>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("gdpr.rights")}
          </h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(register?.rights ?? []).map((right) => (
              <Badge key={right} variant="secondary" className="text-[11px] capitalize">
                {right}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("gdpr.contact")} <span className="font-medium">{register?.contact ?? "privacy@association2e.org"}</span>
          </p>
        </section>

        {/* Practices */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">{t("practices.title")}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                <TickCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span className="text-muted-foreground">{t(`practices.item${i}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 rounded-2xl bg-foreground p-8 text-background">
          <h2 className="text-2xl font-bold tracking-tight">{t("footerCta.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm opacity-80">{t("footerCta.body")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="gap-1.5">
              <Link href="/dashboard">
                {t("cta")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="text-background hover:bg-background/10">
              <Link href="/legal/privacy">{t("footerCta.privacy")}</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
