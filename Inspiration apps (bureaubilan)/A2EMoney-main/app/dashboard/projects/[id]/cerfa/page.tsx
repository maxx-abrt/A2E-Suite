"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
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
import { createEmptyCerfaData } from "@/lib/cerfa-15059/template"
import {
  ArrowLeft,
  Plus,
  Loader2,
  FileText,
  Trash2,
  Download,
} from "@/components/iconsax"
import { toast } from "sonner"

export default function ProjectCerfaPage() {
  const tCommon = useTranslations("common")
  const params = useParams<{ id: string }>()
  const projectId = params?.id as Id<"projects">
  const router = useRouter()
  const { activeWorkspace } = useWorkspace()

  const project = useQuery(api.projects.get, projectId ? { projectId } : "skip")
  const reports = useQuery(
    api.a2e_grantReports.listByProject,
    projectId ? { projectId } : "skip",
  )
  const create = useMutation(api.a2e_grantReports.create)
  const remove = useMutation(api.a2e_grantReports.remove)

  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspace?._id) return
    try {
      setCreating(true)
      const id = await create({
        workspaceId: activeWorkspace._id,
        projectId,
        title: title.trim() || `Compte-rendu ${project?.name || ""} — ${new Date().getFullYear()}`,
        data: createEmptyCerfaData(),
      })
      toast.success("Compte-rendu créé")
      router.push(`/dashboard/projects/${projectId}/cerfa/${id}`)
    } catch (err: any) {
      toast.error(err?.message || tCommon("errorOccurred"))
    } finally {
      setCreating(false)
      setOpen(false)
      setTitle("")
    }
  }

  async function handleDelete(reportId: Id<"a2e_grantReports">) {
    if (!confirm("Supprimer ce compte-rendu ?")) return
    try {
      await remove({ reportId })
      toast.success("Compte-rendu supprimé")
    } catch (err: any) {
      toast.error(err?.message || tCommon("errorOccurred"))
    }
  }

  if (!project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href={`/dashboard/projects/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">CERFA 15059</h1>
              <p className="text-sm text-muted-foreground">Compte-rendu financier de subvention — {project.name}</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-full shadow-sm">
                <Plus className="h-4 w-4" /> Nouveau compte-rendu
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Nouveau compte-rendu CERFA 15059</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className="space-y-5 px-1">
                  <div>
                    <Label>Titre du compte-rendu</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={`Compte-rendu ${project.name} — ${new Date().getFullYear()}`}
                    />
                  </div>
                </DialogBody>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon("create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {reports === undefined ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon={FileText}
              title="Aucun compte-rendu"
              description="Créez votre premier compte-rendu financier de subvention pour ce projet."
              action={{ onClick: () => setOpen(true), label: "Nouveau compte-rendu" }}
            />
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r, idx) => (
              <motion.div
                key={r._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * idx }}
              >
                <GlassCard className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/dashboard/projects/${projectId}/cerfa/${r._id}`} className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold hover:underline">{r.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.status === "draft" ? "Brouillon" : r.status === "submitted" ? "Soumis" : r.status === "approved" ? "Approuvé" : "Archivé"}
                        {" · "}{formatDate(r.updatedAt)}
                      </p>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(r._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
