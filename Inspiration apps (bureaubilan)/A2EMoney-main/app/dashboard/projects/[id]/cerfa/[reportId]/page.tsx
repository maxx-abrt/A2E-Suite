"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useWorkspace } from "@/lib/workspace-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GlassCard } from "@/components/glass-card"
import { WizardLayout, CerfaStep } from "@/components/cerfa-15059/wizard-layout"
import { Cerfa15059Data } from "@/lib/cerfa-15059/types"
import { recalcAll } from "@/lib/cerfa-15059/calculations"
import { exportCerfaToPdf } from "@/lib/cerfa-15059/pdf"
import { validateStep } from "@/lib/cerfa-15059/validation"
import StepQualitative from "@/components/cerfa-15059/steps/step-qualitative"
import StepExpenses from "@/components/cerfa-15059/steps/step-expenses"
import StepIncome from "@/components/cerfa-15059/steps/step-income"
import StepAnnex from "@/components/cerfa-15059/steps/step-annex"
import StepReview from "@/components/cerfa-15059/steps/step-review"
import {
  ArrowLeft,
  Loader2,
  Save2,
  CheckCircle2,
  Download,
  Sparkles,
} from "@/components/iconsax"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { toast } from "sonner"

export default function CerfaEditorPage() {
  const params = useParams<{ id: string; reportId: string }>()
  const projectId = params?.id as Id<"projects">
  const reportId = params?.reportId as Id<"a2e_grantReports">
  const { activeWorkspace } = useWorkspace()

  const report = useQuery(api.a2e_grantReports.get, reportId ? { reportId } : "skip")
  const project = useQuery(api.projects.get, projectId ? { projectId } : "skip")
  const expenses = useQuery(api.a2e_expenses.listByProject, projectId ? { projectId } : "skip")
  const update = useMutation(api.a2e_grantReports.update)

  const [localData, setLocalData] = React.useState<Cerfa15059Data | null>(null)
  const [title, setTitle] = React.useState("")
  const [step, setStep] = React.useState<CerfaStep>(1)
  const [saved, setSaved] = React.useState<"idle" | "saving" | "saved">("idle")
  const saveTimer = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (report) {
      setLocalData(report.data as Cerfa15059Data)
      setTitle(report.title)
    }
  }, [report?._id])

  function scheduleSave(nextData: Cerfa15059Data, nextTitle?: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaved("saving")
    saveTimer.current = setTimeout(async () => {
      try {
        await update({
          reportId,
          data: nextData,
          title: nextTitle ?? title,
        })
        setSaved("saved")
        setTimeout(() => setSaved("idle"), 1500)
      } catch {
        setSaved("idle")
      }
    }, 800)
  }

  function handleDataChange(nextData: Cerfa15059Data) {
    const recalced = recalcAll(nextData)
    setLocalData(recalced)
    scheduleSave(recalced)
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    if (localData) scheduleSave(localData, value)
  }

  async function handleExport() {
    if (!localData || !report) return
    const validation = validateStep(5, localData)
    if (!validation.valid) {
      toast.error("Certains champs obligatoires sont manquants : " + validation.errors.join(", "))
      return
    }
    await exportCerfaToPdf({
      title: title || report.title,
      data: localData,
    })
    toast.success("PDF CERFA 15059 exporté")
  }

  async function importFromProject() {
    if (!localData || !expenses || !project) return
    const next: Cerfa15059Data = JSON.parse(JSON.stringify(localData))

    // Map project expenses to CERFA expense rows
    const projectExpenses = expenses.filter((e) => e.type === "expense")
    const projectIncome = expenses.filter((e) => e.type === "income")

    // Simple heuristic mapping by category keywords
    const categoryMap: Record<string, string> = {
      food: "60_1",
      transport: "62_3",
      housing: "61_1",
      office: "60_2",
      marketing: "62_2",
      software: "62_4",
      travel: "62_3",
      salaries: "64_1",
      taxes: "63_2",
      utilities: "61_2",
    }

    // Reset all realisation values first
    next.financial.expenseRows.forEach((r) => (r.realisation = 0))
    next.financial.incomeRows.forEach((r) => (r.realisation = 0))

    projectExpenses.forEach((e) => {
      const cat = e.category.toLowerCase()
      const code = Object.entries(categoryMap).find(([k]) => cat.includes(k))?.[1]
      if (code) {
        const row = next.financial.expenseRows.find((r) => r.code === code)
        if (row) row.realisation = Math.round(row.realisation + e.amount)
      } else {
        // Default to "Autres charges de gestion courante"
        const row = next.financial.expenseRows.find((r) => r.code === "65_1")
        if (row) row.realisation = Math.round(row.realisation + e.amount)
      }
    })

    projectIncome.forEach((e) => {
      const cat = e.category.toLowerCase()
      if (cat.includes("subvention") || cat.includes("grant")) {
        const row = next.financial.incomeRows.find((r) => r.code === "74_1")
        if (row) row.realisation = Math.round(row.realisation + e.amount)
      } else if (cat.includes("don") || cat.includes("cotisation")) {
        const row = next.financial.incomeRows.find((r) => r.code === "75_1")
        if (row) row.realisation = Math.round(row.realisation + e.amount)
      } else if (cat.includes("vente") || cat.includes("service")) {
        const row = next.financial.incomeRows.find((r) => r.code === "70_1")
        if (row) row.realisation = Math.round(row.realisation + e.amount)
      } else {
        const row = next.financial.incomeRows.find((r) => r.code === "75_1")
        if (row) row.realisation = Math.round(row.realisation + e.amount)
      }
    })

    // If project has budget, use it as prevision for matching rows
    if (project.budget) {
      // Simple heuristic: distribute budget proportionally to current realisation
      const totalRealisation = next.financial.expenseRows.reduce((s, r) => s + r.realisation, 0)
      if (totalRealisation > 0) {
        next.financial.expenseRows.forEach((r) => {
          if (r.realisation > 0) {
            r.prevision = Math.round((r.realisation / totalRealisation) * project.budget!)
          }
        })
      }
    }

    handleDataChange(next)
    toast.success("Données importées depuis le projet. Vous pouvez les modifier manuellement.")
  }

  if (!report || !localData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const stepValidation = validateStep(step, localData)

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Breadcrumbs
          crumbs={[
            { label: "Projects", href: `/dashboard/projects` },
            { label: project?.name || "Project", href: `/dashboard/projects/${projectId}` },
            { label: "CERFA", href: `/dashboard/projects/${projectId}/cerfa` },
            { label: title || report?.title || "Report" },
          ]}
        />
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={`/dashboard/projects/${projectId}/cerfa`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="max-w-md flex-1 border-none bg-transparent text-xl font-semibold shadow-none focus-visible:ring-1"
            placeholder="Titre du compte-rendu"
          />
          <div className="ml-auto flex items-center gap-2">
            {expenses && expenses.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1" onClick={importFromProject}>
                <Sparkles className="h-3.5 w-3.5" /> Importer du projet
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        </div>

        {saved === "saving" ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement...
          </span>
        ) : saved === "saved" ? (
          <span className="flex items-center gap-1 text-xs text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré
          </span>
        ) : null}

        {!stepValidation.valid && stepValidation.errors.length > 0 && (
          <GlassCard className="border-destructive/30 bg-destructive/5 p-4">
            <p className="text-xs text-destructive">
              Champs manquants à cette étape : {stepValidation.errors.join(", ")}
            </p>
          </GlassCard>
        )}

        <WizardLayout
          step={step}
          onStepChange={setStep}
          onSave={() => localData && scheduleSave(localData)}
          onExport={handleExport}
          saving={saved === "saving"}
          saved={saved === "saved"}
          canExport={step === 5}
        >
          {step === 1 && <StepQualitative data={localData} onChange={handleDataChange} />}
          {step === 2 && <StepExpenses data={localData} onChange={handleDataChange} />}
          {step === 3 && <StepIncome data={localData} onChange={handleDataChange} />}
          {step === 4 && <StepAnnex data={localData} onChange={handleDataChange} />}
          {step === 5 && <StepReview data={localData} onChange={handleDataChange} />}
        </WizardLayout>
      </div>
    </div>
  )
}
