"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  eyebrow?: React.ReactNode
}

export function PageHeader({ title, description, actions, className, eyebrow }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        {eyebrow ? (
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{eyebrow}</div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

interface StatCardProps {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ReactNode
  trend?: { value: string; direction: "up" | "down" | "flat" }
  tone?: "default" | "accent" | "muted" | "success" | "destructive"
  className?: string
}

export function StatCard({ label, value, hint, icon, trend, tone = "default", className }: StatCardProps) {
  const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
    default: "bg-card text-card-foreground",
    accent: "bg-foreground text-background",
    muted: "bg-muted/60 text-foreground",
    success: "bg-accent/10 text-foreground",
    destructive: "bg-destructive/10 text-foreground",
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border p-5 shadow-xs transition-shadow hover:shadow-sm",
        toneClasses[tone],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-sm font-medium", tone === "accent" ? "text-background/70" : "text-muted-foreground")}>
          {label}
        </span>
        {icon ? (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone === "accent" ? "bg-background/10" : "bg-muted")}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight font-numeric sm:text-3xl">{value}</div>
      {hint || trend ? (
        <div className={cn("mt-2 flex items-center gap-2 text-xs", tone === "accent" ? "text-background/70" : "text-muted-foreground")}>
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
                trend.direction === "up" && "bg-accent/10 text-primary",
                trend.direction === "down" && "bg-destructive/10 text-destructive",
                trend.direction === "flat" && "bg-muted text-muted-foreground",
              )}
            >
              {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.value}
            </span>
          ) : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
