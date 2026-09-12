"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useWorkspace, useWorkspaceMutations } from "@a2e/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, HeartHandshake, UserIcon, Loader2, ShieldTick } from "@/components/iconsax"
import { BilanWordmark } from "@/components/bilan-logo"
import { useCoreBridge } from "@/lib/core-bridge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const TYPES = [
  { id: "individual", icon: UserIcon, key: "individual" },
  { id: "business", icon: Building2, key: "business" },
  { id: "association", icon: HeartHandshake, key: "association" },
] as const

/**
 * First-run workspace creation. The workspace is created in **A2E Core**, so it
 * is immediately available to every other app of the suite.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const t = useTranslations("onboarding")
  const { workspaces, setActiveWorkspaceId, isLoading } = useWorkspace()
  const { create, update } = useWorkspaceMutations()
  const { resync } = useCoreBridge()
  const [type, setType] = React.useState<(typeof TYPES)[number]["id"]>("association")
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [currency, setCurrency] = React.useState("EUR")
  const [loading, setLoading] = React.useState(false)

  // Core auto-provisions a personal workspace on first login; treat a single
  // untouched "…'s Workspace" as a blank slate the user can name here.
  const autoProvisioned = React.useMemo(
    () => (workspaces ?? []).find((w) => /'s Workspace$/.test(w.name)) ?? null,
    [workspaces],
  )
  const hasRealWorkspace = (workspaces ?? []).some((w) => !/'s Workspace$/.test(w.name))

  React.useEffect(() => {
    if (hasRealWorkspace) router.replace("/dashboard")
  }, [hasRealWorkspace, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      setLoading(true)
      let id: string
      if (autoProvisioned) {
        await update({
          workspaceId: autoProvisioned._id,
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          currency,
          locale: "fr",
        })
        id = autoProvisioned._id
      } else {
        id = await create({
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          currency,
          locale: "fr",
        })
      }
      setActiveWorkspaceId(id)
      await resync().catch(() => {})
      toast.success(t("toasts.created"))
      router.push("/dashboard")
    } catch (err: any) {
      toast.error(err?.message || t("toasts.failed"))
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || workspaces === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center border-b border-border/60 px-4 sm:px-6">
        <BilanWordmark size={30} />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xl space-y-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div>
            <Label className="mb-2 block">{t("typeLabel")}</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TYPES.map((opt) => {
                const Icon = opt.icon
                const active = type === opt.id
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setType(opt.id)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                      active
                        ? "border-foreground bg-foreground/5 ring-2 ring-foreground/10"
                        : "border-border bg-card hover:bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        active ? "bg-foreground text-background" : "bg-muted text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t(`types.${opt.key}.title`)}</div>
                      <div className="text-xs text-muted-foreground">{t(`types.${opt.key}.description`)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">{t("nameLabel")}</Label>
              <Input
                id="name"
                data-testid="onboarding-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">{t("currencyLabel")}</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="EUR">EUR &euro;</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP &pound;</option>
                <option value="CHF">CHF</option>
                <option value="CAD">CAD $</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t("descriptionLabel")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldTick className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p>{t("sharedNotice")}</p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !name.trim()}
            data-testid="onboarding-submit"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
          </Button>
        </form>
      </main>
    </div>
  )
}
