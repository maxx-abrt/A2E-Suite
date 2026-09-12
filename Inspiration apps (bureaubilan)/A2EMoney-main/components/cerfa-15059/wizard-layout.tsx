"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, ChevronLeft, ArrowRight } from "@/components/iconsax"

export const CERFA_STEPS = [
  { id: 1, label: "Bilan qualitatif" },
  { id: 2, label: "Charges" },
  { id: 3, label: "Produits" },
  { id: 4, label: "Annexe" },
  { id: 5, label: "Certification" },
] as const

export type CerfaStep = 1 | 2 | 3 | 4 | 5

interface WizardLayoutProps {
  step: CerfaStep
  onStepChange: (step: CerfaStep) => void
  children: React.ReactNode
  onSave?: () => void
  onExport?: () => void
  saving?: boolean
  saved?: boolean
  canExport?: boolean
}

export function WizardLayout({
  step,
  onStepChange,
  children,
  onSave,
  onExport,
  saving,
  saved,
  canExport,
}: WizardLayoutProps) {
  const currentIdx = CERFA_STEPS.findIndex((s) => s.id === step)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Step indicator */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {CERFA_STEPS.map((s, idx) => {
            const isActive = s.id === step
            const isPast = idx < currentIdx
            return (
              <button
                key={s.id}
                onClick={() => onStepChange(s.id as CerfaStep)}
                className={cn(
                  "group flex flex-col items-center gap-2 transition",
                  isActive ? "cursor-default" : "cursor-pointer",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : isPast
                        ? "border-border bg-[var(--brand-green)] text-[var(--brand-green-ink)]"
                        : "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {isPast ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
        {/* Progress bar */}
        <div className="absolute left-0 top-4 -z-10 h-0.5 w-full bg-muted">
          <div
            className="h-full bg-[var(--brand-green)] transition-all duration-300"
            style={{ width: `${(currentIdx / (CERFA_STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">{children}</div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <Button variant="outline" className="gap-1" onClick={() => onStepChange((step - 1) as CerfaStep)}>
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement...
            </span>
          ) : saved ? (
            <span className="flex items-center gap-1 text-xs text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré
            </span>
          ) : null}
          {onSave && (
            <Button variant="outline" onClick={onSave}>
              Enregistrer
            </Button>
          )}
          {canExport && onExport && (
            <Button variant="outline" onClick={onExport}>
              Exporter PDF
            </Button>
          )}
          {step < 5 ? (
            <Button className="gap-1" onClick={() => onStepChange((step + 1) as CerfaStep)}>
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onExport} className="gap-1">
              Exporter le CERFA (PDF)
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
