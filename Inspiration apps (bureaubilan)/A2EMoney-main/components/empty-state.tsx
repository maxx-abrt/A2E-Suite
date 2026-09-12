"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: { href?: string; label: string; onClick?: () => void }
  secondary?: { href?: string; label: string; onClick?: () => void }
}

export function EmptyState({ icon: Icon, title, description, action, secondary }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>}
      </div>
      {(action || secondary) && (
        <div className="mt-2 flex gap-2">
          {action && (
            action.href ? (
              <Button asChild size="sm"><Link href={action.href}>{action.label}</Link></Button>
            ) : (
              <Button size="sm" onClick={action.onClick}>{action.label}</Button>
            )
          )}
          {secondary && (
            secondary.href ? (
              <Button asChild size="sm" variant="outline"><Link href={secondary.href}>{secondary.label}</Link></Button>
            ) : (
              <Button size="sm" variant="outline" onClick={secondary.onClick}>{secondary.label}</Button>
            )
          )}
        </div>
      )}
    </div>
  )
}
