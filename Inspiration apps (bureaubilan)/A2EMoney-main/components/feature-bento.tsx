import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Book1,
  HeartTick,
  ReceiptText,
  DocumentText1,
  Wallet3,
  ClipboardText,
  Folder2,
  Chart,
  People,
  ShieldTick,
  Sparkles,
  Paperclip,
  TickCircle,
} from "@/components/iconsax"

/**
 * FEATURE BENTO — every major Bilan capability, one glance, mobile first.
 *
 * The grid is deliberately *variable*: 1 column on phones, 2 on tablets, 4 on
 * desktop, with two hero tiles (the auto-journal 2×2 and the grants finder 2×1)
 * breaking the rhythm so the eye lands on what makes Bilan different. Tile tones
 * alternate ink / lime / purple / white using the same `.tile-*` primitives as
 * the rest of the page, so nothing here is a one-off style.
 */
export async function FeatureBento() {
  const t = await getTranslations("landing.bento")

  return (
    <section id="features" className="relative border-y border-border/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("tag")}</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">{t("description")}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(180px,auto)]">
          {/* ── HERO 1 · auto journal (2 × 2) ───────────────────────────── */}
          <article
            className="tile-ink group relative flex flex-col overflow-hidden p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 sm:col-span-2 sm:p-6 lg:row-span-2"
            data-testid="bento-journal"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Book1 size={20} variant="Bulk" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                <Sparkles size={10} variant="Bulk" /> {t("items.journal.tagline")}
              </span>
            </div>
            <h3 className="mt-5 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
              {t("items.journal.title")}
            </h3>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed opacity-80">
              {t("items.journal.body")}
            </p>

            {/* mini ledger mock — visible from mobile up; pushes to bottom on larger tiles */}
            <div className="mt-5 overflow-hidden rounded-xl border border-white/15 bg-white/5 sm:mt-auto">
              <div className="grid grid-cols-[60px_1fr_80px_64px] gap-2 border-b border-white/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider opacity-60 sm:grid-cols-[76px_1fr_84px_72px]">
                <span>Date</span>
                <span>Libellé</span>
                <span className="text-right">Montant</span>
                <span>Pièce</span>
              </div>
              {[
                ["02/08", "Subvention FDVA 2", "+7 000,00", "arrêté.pdf"],
                ["31/07", "Ordinateurs atelier", "−1 400,00", "facture.pdf"],
                ["28/07", "Facture INV-2026-0004", "+960,00", "—"],
              ].map(([date, label, amount, proof]) => (
                <div
                  key={label}
                  className="grid grid-cols-[60px_1fr_80px_64px] items-center gap-2 border-b border-white/5 px-3 py-2 text-[11px] last:border-0 sm:grid-cols-[76px_1fr_84px_72px]"
                >
                  <span className="font-mono opacity-70">{date}</span>
                  <span className="truncate">{label}</span>
                  <span
                    className={`text-right font-mono ${
                      amount.startsWith("+") ? "text-[var(--brand-green)]" : "opacity-90"
                    }`}
                  >
                    {amount}
                  </span>
                  <span className="flex items-center gap-1 truncate text-[10px] opacity-60">
                    {proof !== "—" ? <Paperclip size={9} variant="Bulk" /> : null}
                    {proof}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* ── HERO 2 · subventions + IA (2 × 1) ───────────────────────── */}
          <article
            className="tile-lime group relative flex flex-col overflow-hidden p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 sm:col-span-2 sm:p-6"
            data-testid="bento-subventions"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
                <HeartTick size={20} variant="Bulk" />
              </span>
              <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                {t("items.subventions.tagline")}
              </span>
            </div>
            <h3 className="mt-4 text-balance text-lg font-semibold tracking-tight sm:text-xl">
              {t("items.subventions.title")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed opacity-80">
              {t("items.subventions.body")}
            </p>
          </article>

          {/* ── transactions ───────────────────────────────────────────── */}
          <BentoTile icon={ReceiptText} title={t("items.transactions.title")} body={t("items.transactions.body")} testId="bento-transactions" />

          {/* ── invoices ───────────────────────────────────────────────── */}
          <BentoTile icon={DocumentText1} title={t("items.invoices.title")} body={t("items.invoices.body")} testId="bento-invoices" />

          {/* ── drive (2 × 1) ──────────────────────────────────────────── */}
          <article
            className="tile-purple group relative flex flex-col overflow-hidden p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 sm:col-span-2 sm:p-6"
            data-testid="bento-drive"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Folder2 size={20} variant="Bulk" />
            </span>
            <h3 className="mt-4 text-balance text-lg font-semibold tracking-tight sm:text-xl">
              {t("items.drive.title")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed opacity-85">
              {t("items.drive.body")}
            </p>
          </article>

          {/* ── budget ─────────────────────────────────────────────────── */}
          <BentoTile icon={Wallet3} title={t("items.budget.title")} body={t("items.budget.body")} testId="bento-budget" />

          {/* ── projects & CERFA ───────────────────────────────────────── */}
          <BentoTile icon={ClipboardText} title={t("items.projects.title")} body={t("items.projects.body")} testId="bento-projects" />

          {/* ── reports ────────────────────────────────────────────────── */}
          <BentoTile icon={Chart} title={t("items.reports.title")} body={t("items.reports.body")} testId="bento-reports" />

          {/* ── team ───────────────────────────────────────────────────── */}
          <BentoTile icon={People} title={t("items.team.title")} body={t("items.team.body")} testId="bento-team" />

          {/* ── security (2 × 1) ───────────────────────────────────────── */}
          <article
            className="bento-tile group relative flex flex-col justify-between overflow-hidden p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 sm:col-span-2 sm:p-6"
            data-testid="bento-security"
          >
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_16%,var(--card))] text-primary">
                <ShieldTick size={20} variant="Bulk" />
              </span>
              <h3 className="mt-4 text-balance text-lg font-semibold tracking-tight">
                {t("items.security.title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("items.security.body")}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {["AES-256-GCM", "HKDF-SHA256", "EU eu-west-1", "RGPD"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild className="rounded-full" data-testid="bento-cta">
            <Link href="/auth">
              {t("cta")}
              <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function BentoTile({
  icon: Icon,
  title,
  body,
  testId,
}: {
  icon: React.ComponentType<{ size?: number | string; variant?: any; className?: string }>
  title: string
  body: string
  testId: string
}) {
  return (
    <article
      className="bento-tile group relative flex flex-col overflow-hidden p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_10px_0_-2px_var(--border)]"
      data-testid={testId}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-green)] text-[var(--brand-green-ink)] transition-transform duration-300 group-hover:scale-110">
        <Icon size={19} variant="Bulk" />
      </span>
      <h3 className="mt-4 text-balance text-[15px] font-semibold leading-tight tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      <TickCircle
        size={14}
        variant="Bulk"
        className="mt-auto hidden text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:block"
      />
    </article>
  )
}
