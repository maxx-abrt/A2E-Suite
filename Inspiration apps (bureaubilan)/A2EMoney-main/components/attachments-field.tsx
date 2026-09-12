"use client"

import { useCallback, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useMutation } from "convex/react"
import {
  QuotaExceededError,
  coreApi,
  useCoreAction,
  useDriveMutations,
  useLinkedFiles,
  useUpload,
  useWorkspace,
} from "@a2e/core"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { useFilePreview } from "@/components/file-preview-provider"
import { formatBytes, cn } from "@/lib/utils"
import { Download, FileImage, FileText, Loader2, Trash2, UploadCloud } from "@/components/iconsax"

/**
 * Attachments on any Bilan record — backed by the **A2E Core drive** (Backblaze
 * B2, private bucket, presigned URLs only).
 *
 * Files are stamped `sourceApp: "bilan"` and linked with
 * `linkedTo: { app: "bilan", type, id }`, which is exactly how the Drive app (and
 * any other suite app) finds "the receipts of this expense" — live, no copies.
 */
interface AttachmentsFieldProps {
  linkedTo: {
    type: "expense" | "invoice" | "book_entry" | "project" | "fiche" | "grant_report"
    id?: string
  }
  /** Kept for API compatibility with the pre-core component (unused server-side). */
  documentType?: "receipt" | "invoice" | "certificate" | "contract" | "other"
  max?: number
  className?: string
  compact?: boolean
  onUploaded?: (fileId: string) => void
}

const MAX_FILE_SIZE = 25 * 1024 * 1024

function fileIcon(type: string) {
  return type.startsWith("image/") ? FileImage : FileText
}

export function AttachmentsField({
  linkedTo,
  max = 10,
  className,
  compact = false,
  onUploaded,
}: AttachmentsFieldProps) {
  const t = useTranslations("attachments")
  const { activeWorkspaceId } = useWorkspace()
  const target = linkedTo.id ? { app: "bilan", type: linkedTo.type, id: linkedTo.id } : null
  const files = useLinkedFiles(activeWorkspaceId, target)
  const { preview } = useFilePreview()

  const [pct, setPct] = useState(0)
  const { upload, isUploading } = useUpload({ onProgress: setPct })
  const { removeFile } = useDriveMutations()
  const presignDownload = useCoreAction(coreApi.drive.presignDownload)
  const linkInBilan = useMutation(api.a2e_attachments.link)
  const unlinkInBilan = useMutation(api.a2e_attachments.unlink)
  /** Movements & invoices mirror their proofs into Bilan so the auto-journal can name them. */
  const bilanEntity =
    linkedTo.id && (linkedTo.type === "expense" || linkedTo.type === "invoice")
      ? ({ entityType: linkedTo.type, entityId: linkedTo.id } as const)
      : null

  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const list = files ?? []

  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      if (!activeWorkspaceId) {
        toast.error("Select a workspace first")
        return
      }
      const arr = Array.from(incoming)
      if (!arr.length) return
      if (list.length + arr.length > max) {
        toast.error(t("tooMany", { max }))
        return
      }
      for (const file of arr) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(t("fileTooLarge", { name: file.name }))
          continue
        }
        try {
          const { fileId } = await upload({
            workspaceId: activeWorkspaceId,
            file,
            sourceApp: "bilan",
            linkedTo: target ?? undefined,
          })
          if (bilanEntity) {
            // Reference (never the bytes) lands in Bilan → the ledger line and
            // any export can now name this justificatif.
            await linkInBilan({
              ...bilanEntity,
              file: {
                fileId,
                name: file.name,
                contentType: file.type || undefined,
                size: file.size,
              },
            }).catch(() => {})
          }
          onUploaded?.(fileId)
        } catch (error: any) {
          if (error instanceof QuotaExceededError) {
            toast.error(t("quotaExceeded"), {
              description: `${error.domain} — ${error.used ?? "?"} / ${error.limit ?? "?"}`,
            })
          } else {
            toast.error(error?.message || t("uploadFailed"))
          }
        }
      }
      setPct(0)
    },
    [activeWorkspaceId, bilanEntity, linkInBilan, list.length, max, onUploaded, t, target, upload],
  )

  async function handleDownload(fileId: string) {
    try {
      const { url } = await presignDownload({ fileId })
      window.open(url, "_blank")
    } catch (error: any) {
      toast.error(error?.message || "Download failed")
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        data-testid="attachments-dropzone"
        onClick={() => inputRef.current?.click()}
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
          "flex w-full items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-3 text-left text-sm transition-colors",
          dragOver ? "border-foreground bg-muted/60" : "border-border hover:bg-muted/50",
          compact && "py-2",
        )}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <UploadCloud className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="flex-1">
          <span className="font-medium">{isUploading ? `${t("uploading")} ${pct}%` : t("cta")}</span>
          <span className="ml-2 text-xs text-muted-foreground">{t("hint")}</span>
        </span>
        {list.length > 0 && (
          <span className="text-xs text-muted-foreground">{t("countLabel", { count: list.length })}</span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        data-testid="attachments-input"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
      {isUploading && (
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {list.length > 0 && (
        <ul className="space-y-1">
          {list.map((file) => {
            const Icon = fileIcon(file.contentType || "")
            return (
              <li
                key={file._id}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left hover:underline"
                  onClick={() =>
                    preview({
                      _id: file._id,
                      name: file.name,
                      contentType: file.contentType,
                      size: file.size,
                    })
                  }
                >
                  {file.name}
                </button>
                <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  type="button"
                  onClick={() => handleDownload(file._id)}
                  aria-label={t("download")}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  type="button"
                  onClick={async () => {
                    await removeFile({ fileId: file._id })
                    if (bilanEntity) {
                      await unlinkInBilan({ ...bilanEntity, fileId: file._id }).catch(() => {})
                    }
                  }}
                  aria-label={t("remove")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
