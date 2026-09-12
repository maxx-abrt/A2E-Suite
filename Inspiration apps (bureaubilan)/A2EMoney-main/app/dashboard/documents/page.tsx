"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  QuotaExceededError,
  coreApi,
  useCoreAction,
  useDriveMutations,
  useEntitlement,
  useFileSearch,
  useFiles,
  useFolders,
  useQuota,
  useTrash,
  useUpload,
  useWorkspace,
} from "@a2e/core"
import { useFilePreview } from "@/components/file-preview-provider"
import { formatBytes, formatDate, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { GlassCard } from "@/components/glass-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  FileText,
  HardDrive,
  Trash2,
  Loader2,
  Download,
  Image as ImageIcon,
  Eye,
  UploadCloud,
  Search,
  Plus,
  Folder2,
  ShieldTick,
  Refresh,
  Link2,
} from "@/components/iconsax"
import { toast } from "sonner"

/** Where a Bilan-linked file points back to — closes the file ↔ money loop. */
const LINK_ROUTES: Record<string, { href: string; label: string }> = {
  expense: { href: "/dashboard/expenses", label: "Transaction" },
  invoice: { href: "/dashboard/invoices", label: "Facture" },
  project: { href: "/dashboard/projects", label: "Projet" },
  fiche: { href: "/dashboard/fiches", label: "Fiche" },
  grant_report: { href: "/dashboard/projects", label: "Compte-rendu" },
  book_entry: { href: "/dashboard/book", label: "Journal" },
}

const APP_LABELS: Record<string, string> = {
  bilan: "Bilan",
  bureau: "Bureau",
  drive: "Drive",
  forms: "Forms",
  crm: "CRM",
  core: "A2E",
}

/**
 * A2E DRIVE inside Bilan.
 *
 * Every file lives in the shared core drive on Backblaze B2 (private bucket,
 * presigned URLs only). Files uploaded by other suite apps show up here, and the
 * receipts Bilan links to an expense/invoice are visible from the Drive app —
 * one storage, one quota, no copies.
 */
export default function DocumentsPage() {
  const t = useTranslations("pages.documents")
  const tCommon = useTranslations("common")
  const { activeWorkspaceId } = useWorkspace()
  const [folderId, setFolderId] = React.useState<string | undefined>(undefined)
  const [query, setQuery] = React.useState("")

  const files = useFiles(activeWorkspaceId, folderId as any)
  const folders = useFolders(activeWorkspaceId, folderId as any)
  const rootFolders = useFolders(activeWorkspaceId)
  const trash = useTrash(activeWorkspaceId)
  const searchHits = useFileSearch(activeWorkspaceId, query)
  const storage = useQuota(activeWorkspaceId, "storageBytes")
  const fileCount = useQuota(activeWorkspaceId, "maxDriveFiles")
  const entitlement = useEntitlement(activeWorkspaceId)
  const { preview } = useFilePreview()

  const [pct, setPct] = React.useState(0)
  const { upload, isUploading } = useUpload({ onProgress: setPct })
  const { removeFile, restoreFile, emptyTrash, createFolder, renameFile } = useDriveMutations()
  const presignDownload = useCoreAction(coreApi.drive.presignDownload)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = React.useState(false)

  const shown = query.trim().length >= 2 ? searchHits : files
  const activeFolder = (rootFolders ?? []).find((f) => f._id === folderId)

  async function handleFiles(list: FileList | File[]) {
    if (!activeWorkspaceId) return
    for (const file of Array.from(list)) {
      try {
        await upload({
          workspaceId: activeWorkspaceId,
          file,
          sourceApp: "bilan",
          folderId: folderId as any,
        })
        toast.success(t("uploaded", { name: file.name }))
      } catch (error: any) {
        if (error instanceof QuotaExceededError) {
          toast.error(t("quotaExceeded"), { description: `${error.domain}: ${error.used}/${error.limit}` })
        } else {
          toast.error(error?.message || "Upload failed")
        }
      }
    }
    setPct(0)
  }

  async function handleDownload(fileId: string) {
    try {
      const { url } = await presignDownload({ fileId })
      window.open(url, "_blank")
    } catch (error: any) {
      toast.error(error?.message || "Download failed")
    }
  }

  async function handleNewFolder() {
    if (!activeWorkspaceId) return
    const name = window.prompt(t("folderNamePrompt"))
    if (!name?.trim()) return
    await createFolder({
      workspaceId: activeWorkspaceId,
      name: name.trim(),
      parentId: folderId as any,
      sourceApp: "bilan",
    })
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleNewFolder}>
              <Plus className="h-4 w-4" /> {t("newFolder")}
            </Button>
            <Button className="gap-2" onClick={() => inputRef.current?.click()} data-testid="drive-upload-btn">
              <UploadCloud className="h-4 w-4" /> {t("upload")}
            </Button>
          </div>
        </div>

        {/* Storage / quota */}
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <ShieldTick className="h-4 w-4 text-success" />
              {t("storage.used")}
            </span>
            <span className="text-muted-foreground">
              {formatBytes(storage.used)} / {storage.limit < 0 ? "∞" : formatBytes(storage.limit)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, storage.percent)}%` }}
              transition={{ duration: 0.6 }}
              className={cn(
                "h-full rounded-full",
                storage.percent > 90 ? "bg-destructive" : "bg-[var(--brand-green)]",
              )}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("storage.files", { count: fileCount.used })} · {Math.round(storage.percent)}% ·{" "}
            {t("storage.plan", { plan: entitlement?.planKey ?? "free" })} · {t("storage.encrypted")}
          </p>
        </GlassCard>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          data-testid="drive-file-input"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files)
            e.target.value = ""
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            "rounded-2xl border border-dashed p-3 text-center text-xs transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border text-muted-foreground",
          )}
        >
          {isUploading ? `${t("uploading")} ${pct}%` : t("dropHint")}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            data-testid="drive-search"
          />
        </div>

        <Tabs defaultValue="files">
          <TabsList>
            <TabsTrigger value="files">{t("tabs.files")}</TabsTrigger>
            <TabsTrigger value="trash">{t("tabs.trash")}</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-4 space-y-4">
            {/* Folder breadcrumb + list */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFolderId(undefined)}
                className={cn(
                  "rounded-full border px-3 py-1 transition",
                  !folderId ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
                )}
              >
                {t("allFiles")}
              </button>
              {(rootFolders ?? []).map((f) => (
                <button
                  key={f._id}
                  type="button"
                  onClick={() => setFolderId(f._id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 transition",
                    folderId === f._id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <Folder2 className="h-3 w-3" />
                  {f.name}
                </button>
              ))}
            </div>
            {activeFolder && (
              <p className="text-xs text-muted-foreground">
                {t("inFolder", { name: activeFolder.name })}
                {(folders ?? []).length > 0 ? ` · ${(folders ?? []).length} ${t("subfolders")}` : ""}
              </p>
            )}

            <GlassCard>
              {shown === undefined ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : shown.length === 0 ? (
                <EmptyState icon={HardDrive} title={t("empty.title")} description={t("empty.description")} />
              ) : (
                <ul className="divide-y divide-border/60" data-testid="drive-files">
                  {shown.map((d, idx) => {
                    const isImage = d.contentType?.startsWith("image/")
                    const Icon = isImage ? ImageIcon : FileText
                    return (
                      <motion.li
                        key={d._id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(0.3, 0.015 * idx) }}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            preview({ _id: d._id, name: d.name, contentType: d.contentType, size: d.size })
                          }
                          className="flex flex-1 items-center gap-3 text-left"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{d.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(d.size)} · {formatDate(d.createdAt)}
                            </p>
                          </div>
                        </button>
                        {d.linkedTo && LINK_ROUTES[d.linkedTo.type] ? (
                          <Link
                            href={LINK_ROUTES[d.linkedTo.type].href}
                            className="hidden shrink-0 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] px-2.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_22%,var(--card))] sm:inline-flex"
                            title={`${LINK_ROUTES[d.linkedTo.type].label} liée`}
                            data-testid={`file-link-${d._id}`}
                          >
                            <Link2 className="h-3 w-3" />
                            {LINK_ROUTES[d.linkedTo.type].label}
                          </Link>
                        ) : null}
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {APP_LABELS[d.sourceApp] ?? d.sourceApp}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            preview({ _id: d._id, name: d.name, contentType: d.contentType, size: d.size })
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(d._id)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={async () => {
                            const name = window.prompt(t("renamePrompt"), d.name)
                            if (name?.trim()) await renameFile({ fileId: d._id, name: name.trim() })
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFile({ fileId: d._id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </motion.li>
                    )
                  })}
                </ul>
              )}
            </GlassCard>
          </TabsContent>

          <TabsContent value="trash" className="mt-4">
            <GlassCard>
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <p className="text-xs text-muted-foreground">{t("trashNotice")}</p>
                {(trash ?? []).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={async () => {
                      if (!activeWorkspaceId) return
                      if (!confirm(t("confirmEmptyTrash"))) return
                      const n = await emptyTrash({ workspaceId: activeWorkspaceId })
                      toast.success(t("trashEmptied", { count: n }))
                    }}
                  >
                    {t("emptyTrash")}
                  </Button>
                )}
              </div>
              {trash === undefined ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : trash.length === 0 ? (
                <div className="px-5 py-10 text-center text-xs text-muted-foreground">{t("trashEmpty")}</div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {trash.map((d) => (
                    <li key={d._id} className="flex items-center gap-3 px-5 py-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(d.size)}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => restoreFile({ fileId: d._id })}>
                        <Refresh className="h-3.5 w-3.5" /> {tCommon("restore")}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
