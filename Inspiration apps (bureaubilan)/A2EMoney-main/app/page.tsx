import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { LanguageSwitcher } from "@/components/language-switcher"
import { BilanWordmark, BilanMark } from "@/components/bilan-logo"
import { FeatureBento } from "@/components/feature-bento"
import {
  ArrowRight,
  ArrowRight3 as ArrowUpRight,
  Flash,
  TickCircle,
  Wallet2,
  Building4,
  People,
  Star1,
  ShieldTick,
  Lock,
  Folder2,
  Global,
} from "@/components/iconsax"

export default async function LandingPage() {
  const t = await getTranslations("landing")
  const nav = await getTranslations("nav")

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Decorative grain & blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 [mask-image:radial-gradient(70%_55%_at_50%_30%,black,transparent)]"
      >
        <div className="absolute left-[10%] top-32 h-72 w-72 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute right-[5%] top-10 h-80 w-80 rounded-full bg-[var(--brand-green)]/20 blur-[120px]" />
        <div className="absolute left-1/2 top-[60%] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-2.5" data-testid="brand-link">
            <BilanMark size={34} className="transition-transform duration-500 group-hover:rotate-6" />
            <span className="text-lg font-extrabold tracking-tight">Bilan</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "#features", label: nav("features") },
              { href: "#pricing", label: nav("pricing") },
              { href: "#testimonials", label: nav("testimonials") },
              { href: "#security", label: nav("security") },
              { href: "#faq", label: "FAQ" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex" data-testid="signin-btn">
              <Link href="/auth">{nav("signIn")}</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full" data-testid="getstarted-btn">
              <Link href="/auth">
                {nav("getStarted")}
                <ArrowRight size={14} className="ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
          {/* Pixel ribbon (no AI/promo badge) */}
          <div className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur-xl">
            <span className="grid grid-cols-3 gap-[2px]" aria-hidden>
              {Array.from({ length: 9 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-[3px] w-[3px] ${
                    [0, 4, 8, 2].includes(i) ? "bg-[var(--brand-green)]" : "bg-foreground/40"
                  }`}
                />
              ))}
            </span>
            <span>{t("badge")}</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-balance text-center text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
            {t("hero.title")}{" "}
            <span className="relative inline-flex items-baseline align-middle">
              <span className="relative inline-block text-primary">
                {t("hero.highlight")}
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 right-0 h-[8px] bg-[var(--brand-green)]"
                  style={{ clipPath: "polygon(0 0, 100% 0, 96% 100%, 4% 100%)" }}
                />
              </span>
            </span>{" "}
            {t("hero.tail")}.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("hero.description")}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="group rounded-full shadow-md" data-testid="hero-primary-cta">
              <Link href="/auth">
                {t("hero.primaryCta")}
                <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full" data-testid="hero-secondary-cta">
              <Link href="#features">{t("hero.secondaryCta")}</Link>
            </Button>
          </div>

          {/* Trust strip */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 items-center gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex -space-x-3">
                {["bg-primary", "bg-[var(--brand-green)]", "bg-foreground"].map((c, i) => (
                  <div
                    key={i}
                    className={`h-9 w-9 rounded-full border border-background ${c}`}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground sm:text-left">
                {t("hero.trustLine")}
              </p>
            </div>
            {(["teams", "uptime", "tx"] as const).map((k) => (
              <div key={k} className="text-center">
                <p className="font-numeric text-3xl font-semibold tracking-tight">
                  {t(`hero.stats.${k}.value`)}
                </p>
                <p className="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground">
                  {t(`hero.stats.${k}.label`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTUITIVE / EVOLVE (two split sections) */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("intuitive.title")}
            </h2>
            <p className="mt-4 text-muted-foreground">{t("intuitive.description")}</p>
            <ul className="mt-6 space-y-2.5">
              {(t.raw("intuitive.bullets") as string[]).map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <TickCircle size={16} variant="Bulk" className="text-primary" />
                  {b}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-7 rounded-full">
              <Link href="/auth">{t("intuitive.cta")}<ArrowUpRight size={14} className="ml-1.5" /></Link>
            </Button>
          </div>
          <DashboardMock />
        </div>

        <div className="mt-24 grid items-center gap-10 lg:grid-cols-2">
          <BookMock />
          <div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("evolve.title")}
            </h2>
            <p className="mt-4 text-muted-foreground">{t("evolve.description")}</p>
            <ul className="mt-6 space-y-2.5">
              {(t.raw("evolve.bullets") as string[]).map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <TickCircle size={16} variant="Bulk" className="text-primary" />
                  {b}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-7 rounded-full">
              <Link href="/auth">{t("evolve.cta")}<ArrowUpRight size={14} className="ml-1.5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* SECURITY AT A GLANCE */}
      <section id="security" className="relative border-y border-border/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <ShieldTick size={14} /> {t("security.badge")}
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("security.title")}
              </h2>
              <p className="mt-4 text-pretty text-base text-muted-foreground">{t("security.subtitle")}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild className="rounded-full" data-testid="trust-center-btn">
                  <Link href="/security">
                    {t("security.cta")}
                    <ArrowRight size={14} className="ml-1.5" />
                  </Link>
                </Button>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="font-mono text-[10px]">AES-256-GCM</Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">HKDF-SHA256</Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">EU eu-west-1</Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">RGPD</Badge>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["encryption", Lock],
                ["files", Folder2],
                ["gdpr", TickCircle],
                ["suite", Global],
              ] as const).map(([key, Icon]) => (
                <div
                  key={key}
                  className="rounded-2xl border border-border bg-card p-5 transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_16%,var(--card))] text-primary">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{t(`security.items.${key}.title`)}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t(`security.items.${key}.body`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — variable bento grid */}
      <FeatureBento />

      {/* PROFILES (Individual vs Business) */}
      <section id="pricing" className="border-b border-border/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="rounded-full bg-accent/10 text-primary">
              {t("profiles.title")}
            </Badge>
            <p className="mt-4 text-muted-foreground">{t("profiles.description")}</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
            {/* Individual */}
            <div className="group relative rounded-2xl border border-border/60 bg-card/70 p-8 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                <Wallet2 size={20} variant="Bulk" className="text-foreground" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">{t("profiles.individual.title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("profiles.individual.description")}</p>
              <ul className="mt-6 space-y-2.5">
                {(t.raw("profiles.individual.features") as string[]).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <TickCircle size={14} variant="Bulk" className="text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-7 w-full rounded-full">
                <Link href="/auth?type=individual">
                  {t("profiles.individual.cta")}
                  <ArrowUpRight size={14} className="ml-1.5" />
                </Link>
              </Button>
            </div>
            {/* Business */}
            <div className="group relative overflow-hidden rounded-2xl border border-foreground/30 bg-gradient-to-br from-foreground to-neutral-900 p-8 text-background shadow-xl">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
              <Badge className="relative z-10 bg-[var(--brand-green)] text-[var(--brand-green-ink)] border border-border">
                {t("profiles.business.badge")}
              </Badge>
              <div className="relative mt-5 flex h-11 w-11 items-center justify-center rounded-xl bg-background/10">
                <Building4 size={20} variant="Bulk" />
              </div>
              <h3 className="relative mt-6 text-xl font-semibold">{t("profiles.business.title")}</h3>
              <p className="relative mt-2 text-sm text-background/70">{t("profiles.business.description")}</p>
              <ul className="relative mt-6 space-y-2.5">
                {(t.raw("profiles.business.features") as string[]).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <TickCircle size={14} variant="Bulk" className="text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="relative mt-7 w-full rounded-full bg-background text-foreground hover:bg-background/90">
                <Link href="/auth?type=business">
                  {t("profiles.business.cta")}
                  <ArrowUpRight size={14} className="ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("testimonials.title")}</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("testimonials.description")}
            </h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {(t.raw("testimonials.items") as Array<{ quote: string; author: string; role: string }>).map((item) => (
              <figure
                key={item.author}
                className="group flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div>
                  <div className="flex gap-0.5 text-primary">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star1 key={i} size={14} variant="Bulk" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-sm leading-relaxed text-foreground">
                    “{item.quote}”
                  </blockquote>
                </div>
                <figcaption className="mt-6 border-t border-border/60 pt-4">
                  <div className="text-sm font-semibold">{item.author}</div>
                  <div className="text-xs text-muted-foreground">{item.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-border/40 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("faqs.tag")}
          </p>
          <h2 className="mt-3 text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("faqs.title")}
          </h2>
          <p className="mt-4 text-center text-muted-foreground">{t("faqs.description")}</p>
          <Accordion type="single" collapsible className="mt-10 space-y-2">
            {(t.raw("faqs.items") as { q: string; a: string }[]).map((item, idx) => (
              <AccordionItem
                key={item.q}
                value={`q-${idx}`}
                className="rounded-2xl border border-border/60 bg-card/70 px-5 backdrop-blur-xl"
              >
                <AccordionTrigger className="text-left text-sm font-medium">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-foreground py-20 text-background sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 opacity-50">
          <div className="absolute -left-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[var(--brand-green)]/30 blur-[120px]" />
          <div className="absolute -right-20 top-1/3 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/30 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-7 flex w-fit items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-primary">
              <Flash size={18} variant="Bulk" />
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/10">
              <People size={18} variant="Bulk" />
            </span>
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            {t("ctaFinal.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-background/70">{t("ctaFinal.description")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full bg-background text-foreground hover:bg-background/90">
              <Link href="/auth">
                {t("ctaFinal.primary")}
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background">
              <Link href="#why">{t("ctaFinal.secondary")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <BilanMark size={26} />
            <span className="text-sm font-bold">Bilan</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <Link href="/legal/privacy" className="transition-colors hover:text-foreground">
              {t("footer.privacy")}
            </Link>
            <Link href="/legal/terms" className="transition-colors hover:text-foreground">
              {t("footer.terms")}
            </Link>
            <Link href="/security" className="transition-colors hover:text-foreground">
              {nav("security")}
            </Link>
            <Link href="#" className="transition-colors hover:text-foreground">
              {t("footer.contact")}
            </Link>
            <span>© {t("footer.copyright")}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ---------- Decorative product mocks ---------- */

function DashboardMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-primary/15 via-transparent to-[var(--brand-green)]/12 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-xl ring-1 ring-foreground/5 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3">
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="ml-4 flex h-5 flex-1 items-center gap-1.5 rounded-md bg-background/50 px-2 text-[10px] text-muted-foreground">
            <span className="inline-block h-1 w-1 rounded-full bg-[var(--brand-green)]" /> app.bilan · a2e
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 p-5">
          <div className="col-span-2 rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total balance</p>
            <p className="font-numeric mt-1 text-2xl font-semibold">€12,480.50</p>
            <div className="mt-4 grid h-20 grid-cols-12 items-end gap-1">
              {[45, 60, 40, 75, 55, 80, 65, 90, 70, 85, 95, 100].map((h, i) => (
                <div
                  key={i}
                  className="rounded-sm bg-gradient-to-t from-primary/30 to-primary"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="rounded-xl border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] text-muted-foreground">Income</p>
              <p className="font-numeric mt-0.5 text-sm font-semibold">€5,240</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-3">
              <p className="text-[10px] text-muted-foreground">Expenses</p>
              <p className="font-numeric mt-0.5 text-sm font-semibold">€3,120</p>
            </div>
            <div className="rounded-xl bg-foreground p-3 text-background">
              <p className="text-[10px] text-background/60">Savings</p>
              <p className="font-numeric mt-0.5 text-sm font-semibold">€2,120</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BookMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-[var(--brand-green)]/14 via-transparent to-primary/14 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-xl ring-1 ring-foreground/5 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--brand-green)]" />
            finances-q4.book
          </span>
          <span>synced</span>
        </div>
        <div className="divide-y divide-border/60 font-numeric text-sm">
          <div className="grid grid-cols-4 gap-2 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span>Date</span><span>Description</span><span>Category</span><span className="text-right">Amount</span>
          </div>
          {[
            ["04 Oct", "Invoice #1082", "Income", "+€2,400.00", "text-primary"],
            ["02 Oct", "Office supplies", "Expense", "-€187.50", "text-foreground"],
            ["29 Sep", "Subscription", "Expense", "-€49.00", "text-foreground"],
            ["27 Sep", "Consulting", "Income", "+€1,200.00", "text-primary"],
            ["25 Sep", "Transport", "Expense", "-€72.40", "text-foreground"],
          ].map(([d, desc, cat, amt, color]) => (
            <div key={String(desc)} className="grid grid-cols-4 items-center gap-2 px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">{d}</span>
              <span className="truncate">{desc}</span>
              <span className="text-muted-foreground">{cat}</span>
              <span className={`text-right font-medium ${color}`}>{amt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
