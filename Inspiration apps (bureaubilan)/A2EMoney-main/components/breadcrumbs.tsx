"use client"

import Link from "next/link"
import { ChevronLeft } from "@/components/iconsax"
import { cn } from "@/lib/utils"

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  return (
    <nav className={cn("flex items-center gap-1.5 text-sm", className)}>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
          {crumb.href ? (
            <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
