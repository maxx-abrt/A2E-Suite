"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useWorkspace } from "@/lib/workspace-context"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/empty-state"
import { GlassCard } from "@/components/glass-card"
import { Plus, BookOpen, Trash2, Loader2, Lock, Sparkles } from "@/components/iconsax"
import { toast } from "sonner"
import { SheetIcon, SheetIconPicker, SHEET_COLORS } from "@/components/sheet-icon-picker"

/** Built-in starter templates — iconsax bulk based (no emojis). */
const TEMPLATES = [
  {
    id: "cashflow",
    iconKey: "Wallet2",
    color: "#22c55e",
    columns: [
      { id: "date", name: "Date", type: "date" },
      { id: "description", name: "Description", type: "text" },
      { id: "category", name: "Category", type: "select", options: ["Income", "Expense"] },
      { id: "amount", name: "Amount", type: "currency" },
      { id: "notes", name: "Notes", type: "text" },
    ],
  },
  {
    id: "donations",
    iconKey: "HeartTick",
    color: "#ec4899",
    columns: [
      { id: "date", name: "Date", type: "date" },
      { id: "donor", name: "Donor", type: "text" },
      { id: "amount", name: "Amount", type: "currency" },
      { id: "method", name: "Method", type: "select", options: ["Card", "Cash", "Bank transfer"] },
      { id: "receipt", name: "Receipt", type: "checkbox" },
    ],
  },
  {
    id: "grants",
    iconKey: "ScanBarcode",
    color: "#3b82f6",
    columns: [
      { id: "name", name: "Grant", type: "text" },
      { id: "funder", name: "Funder", type: "text" },
      { id: "amount", name: "Amount", type: "currency" },
      { id: "status", name: "Status", type: "select", options: ["Draft", "Submitted", "Approved", "Rejected"] },
      { id: "deadline", name: "Deadline", type: "date" },
    ],
  },
  {
    id: "custom",
    iconKey: "NoteText",
    color: "#a855f7",
    columns: [
      { id: "col1", name: "Column A", type: "text" },
      { id: "col2", name: "Column B", type: "text" },
    ],
  },
] as const

export default function BookPage() {
  const t = useTranslations("pages.book")
  const tCommon = useTranslations("common")
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace?._id

  const sheets = useQuery(api.a2e_books.listSheets, wsId ? { workspaceId: wsId } : "skip")
  const createSheet = useMutation(api.a2e_books.createSheet)
  const removeSheet = useMutation(api.a2e_books.removeSheet)
  const ensureDefault = useMutation(api.a2e_books.ensureDefault)

  // The auto-journal exists from the first visit, even before any movement,
  // and back-fills anything recorded before it existed.
  React.useEffect(() => {
    if (!wsId || sheets === undefined) return
    const auto = sheets.find((s: any) => s.isDefault)
    if (!auto || (auto.autoCount ?? 0) === 0) {
      void ensureDefault({ workspaceId: wsId }).catch(() => {})
    }
  }, [wsId, sheets, ensureDefault])

  const [open, setOpen] = React.useState(false)
  const [tplIdx, setTplIdx] = React.useState(0)
  const [name, setName] = React.useState("")
  const [iconKey, setIconKey] = React.useState<string>(TEMPLATES[0].iconKey)
  const [color, setColor] = React.useState<string>(TEMPLATES[0].color)
  const [saving, setSaving] = React.useState(false)

  function selectTemplate(idx: number) {
    setTplIdx(idx)
    setIconKey(TEMPLATES[idx].iconKey)
    setColor(TEMPLATES[idx].color)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!wsId) return
    const tpl = TEMPLATES[tplIdx]
    try {
      setSaving(true)
      await createSheet({
        workspaceId: wsId,
        name: name.trim() || t(`templates.${tpl.id}`),
        icon: iconKey,
        color,
        columns: tpl.columns.map((c: any) => ({
          ...c,
          options: c.options ? [...c.options] : undefined,
        })),
      })
      toast.success(t("toasts.created"))
      setOpen(false)
      setName("")
      selectTemplate(0)
    } catch (err: any) {
      toast.error(err?.message || t("toasts.failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-full shadow-sm" data-testid="new-sheet-btn">
                <Plus size={16} variant="Bulk" /> {t("new")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{t("new")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className="space-y-5 px-1">
                  <div>
                    <Label className="text-xs uppercase tracking-wider">{t("startFromTemplate")}</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {TEMPLATES.map((tt, i) => (
                        <button
                          key={tt.id}
                          type="button"
                          onClick={() => selectTemplate(i)}
                          className={`rounded-xl border p-3 text-center transition ${
                            tplIdx === i
                              ? "border-foreground bg-foreground/5"
                              : "border-border hover:bg-muted"
                          }`}
                          data-testid={`template-${tt.id}`}
                        >
                          <div
                            className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg"
                            style={{ backgroundColor: tt.color + "20", color: tt.color }}
                          >
                            <SheetIcon iconKey={tt.iconKey} size={18} />
                          </div>
                          <div className="mt-1 text-xs font-medium">{t(`templates.${tt.id}`)}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Icon</Label>
                      <div className="mt-1">
                        <SheetIconPicker
                          value={iconKey}
                          color={color}
                          onChange={setIconKey}
                          onColorChange={setColor}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs uppercase tracking-wider">{t("sheetName")}</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t(`templates.${TEMPLATES[tplIdx].id}`)}
                        data-testid="sheet-name-input"
                      />
                    </div>
                  </div>
                </DialogBody>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={saving} data-testid="create-sheet-submit">
                    {saving ? <Loader2 size={16} variant="Bulk" className="animate-spin" /> : tCommon("create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {sheets === undefined ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} variant="Bulk" className="animate-spin text-muted-foreground" />
          </div>
        ) : sheets.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon={BookOpen}
              title={t("empty.title")}
              description={t("empty.description")}
              action={{ onClick: () => setOpen(true), label: t("new") }}
            />
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sheets.map((s: any, idx: number) => {
              const sheetColor = s.color || SHEET_COLORS[0]
              const isAuto = Boolean(s.isDefault)
              return (
                <motion.div
                  key={s._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * idx }}
                >
                  <Link href={`/dashboard/book/${s._id}`}>
                    <GlassCard
                      className={`group relative p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        isAuto ? "ring-1 ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]" : ""
                      }`}
                      data-testid={`sheet-card-${s._id}`}
                    >
                      {isAuto && (
                        <span
                          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--primary)_16%,var(--card))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary"
                          data-testid="default-book-badge"
                        >
                          <Sparkles size={10} variant="Bulk" /> {t("autoBadge")}
                        </span>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl"
                            style={{ backgroundColor: sheetColor + "20", color: sheetColor }}
                          >
                            <SheetIcon iconKey={s.icon} size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold">{s.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {t("rows", { count: s.entryCount ?? 0 })} ·{" "}
                              {t("columns", { count: (s.columns || []).length })}
                            </p>
                          </div>
                        </div>
                        {isAuto ? (
                          <span
                            className="mt-6 text-muted-foreground opacity-60"
                            title={t("autoLocked")}
                          >
                            <Lock size={14} variant="Bulk" />
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => {
                              e.preventDefault()
                              removeSheet({ sheetId: s._id }).catch((err: any) =>
                                toast.error(err?.message || t("toasts.failed")),
                              )
                            }}
                            data-testid={`sheet-delete-${s._id}`}
                          >
                            <Trash2 size={14} variant="Bulk" />
                          </Button>
                        )}
                      </div>
                      {isAuto ? (
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          {t("autoDescription", { proofs: s.proofCount ?? 0 })}
                        </p>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {t("updated", { when: formatDate(s.updatedAt) })}
                        </p>
                      )}
                    </GlassCard>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
