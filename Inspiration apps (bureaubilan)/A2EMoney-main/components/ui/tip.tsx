"use client"

import * as React from "react"
import { X, Lightbulb, Sparkles, Info } from "@/components/iconsax"
import { cn } from "@/lib/utils"

type TipVariant = "tip" | "info" | "ai"

interface TipProps {
  /** Unique key; used to persist dismissal in localStorage. */
  id: string
  title?: React.ReactNode
  children: React.ReactNode
  variant?: TipVariant
  action?: React.ReactNode
  className?: string
  /** If false, tip cannot be dismissed. */
  dismissable?: boolean
}

const iconMap: Record<TipVariant, React.ComponentType<{ className?: string }>> = {
  tip: Lightbulb,
  info: Info,
  ai: Sparkles,
}

export function Tip({
  id,
  title,
  children,
  variant = "tip",
  action,
  className,
  dismissable = true,
}: TipProps) {
  const [dismissed, setDismissed] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(`bilan_tip_${id}`)
      if (stored === "1") setDismissed(true)
    } catch {
      // ignore
    }
  }, [id])

  if (!mounted || dismissed) return null

  const Icon = iconMap[variant]

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(`bilan_tip_${id}`, "1")
    } catch {
      // ignore
    }
  }

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          variant === "ai"
            ? "bg-accent/10 text-primary"
            : variant === "info"
              ? "bg-muted text-muted-foreground"
              : "bg-accent/10 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1 pr-4">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        <div className="text-muted-foreground leading-relaxed">{children}</div>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
      {dismissable ? (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
