"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { formatDistanceToNowStrict } from "date-fns"
import { useNotificationMutations, useNotifications, useUnreadCount } from "@a2e/core"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Bell,
  BellOff,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Receipt,
  HardDrive,
  UserPlus,
  Users,
  X,
} from "@/components/iconsax"
import { cn } from "@/lib/utils"

/**
 * The SHARED bell: it reads A2E Core notifications, so events produced by any
 * suite app (Bilan, Bureau, Drive, …) show up here. Each `link` is the producing
 * app's absolute path; Bilan renders its own routes and opens the rest in place.
 */

// Types are namespaced "<app>.<event>" in core; legacy unprefixed keys still map.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  invoice_paid: FileText,
  invoice_overdue: FileText,
  budget_exceeded: AlertTriangle,
  budget_warning: AlertTriangle,
  expense_added: Receipt,
  storage_warning: HardDrive,
  invitation_received: UserPlus,
  invitation_accepted: UserPlus,
  member_joined: Users,
  member_left: Users,
}

const TONES: Record<string, string> = {
  info: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/15",
  error: "text-destructive bg-destructive/10",
  invoice_paid: "text-success bg-success/10",
  invoice_overdue: "text-destructive bg-destructive/10",
  budget_exceeded: "text-destructive bg-destructive/10",
  budget_warning: "text-warning bg-warning/15",
  expense_added: "text-primary bg-primary/10",
  storage_warning: "text-warning bg-warning/15",
  invitation_received: "text-primary bg-primary/10",
  invitation_accepted: "text-success bg-success/10",
  member_joined: "text-success bg-success/10",
  member_left: "text-muted-foreground bg-muted",
}

const APP_LABELS: Record<string, string> = {
  bilan: "Bilan",
  bureau: "Bureau",
  drive: "Drive",
  forms: "Forms",
  crm: "CRM",
  core: "A2E",
}

function shortType(type: string) {
  return type.includes(".") ? type.split(".").slice(1).join(".") : type
}

export function NotificationsDropdown() {
  const t = useTranslations("notifications")
  const [open, setOpen] = React.useState(false)
  const items = useNotifications({ limit: 50 })
  const unreadCount = useUnreadCount() ?? 0
  const { markRead, markAllRead, remove, clearAll } = useNotificationMutations()

  const list = items ?? []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("open")} className="relative" data-testid="notifications-bell">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-green)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-green)]" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[360px] rounded-xl border p-0 shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-sm font-semibold">{t("title")}</div>
            <div className="text-xs text-muted-foreground">
              {unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allRead")}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllRead({})} className="h-8 gap-1.5 text-xs">
              <CheckCheck className="h-3.5 w-3.5" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {items === undefined ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border border-primary border-t-transparent" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <BellOff className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium">{t("emptyTitle")}</div>
              <div className="text-xs text-muted-foreground">{t("emptyDescription")}</div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((n) => {
                const key = shortType(n.type)
                const Icon = ICONS[key] ?? Info
                const tone = TONES[key] ?? TONES.info
                const app = n.sourceApp ?? n.type.split(".")[0]
                const content = (
                  <div className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tone)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn("truncate text-sm", n.read ? "font-medium" : "font-semibold")}>{n.title}</p>
                        {!n.read && (
                          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-green)]" />
                        )}
                      </div>
                      {n.message && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                      )}
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {app && APP_LABELS[app] && (
                          <span className="rounded bg-muted px-1 py-0.5 font-medium">{APP_LABELS[app]}</span>
                        )}
                        {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        void remove({ notificationId: n._id })
                      }}
                      className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label={t("dismiss")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
                const onClick = () => {
                  if (!n.read) void markRead({ notificationId: n._id })
                  if (n.link) setOpen(false)
                }
                return (
                  <li key={n._id}>
                    {n.link ? (
                      <Link href={n.link} onClick={onClick} className="block">
                        {content}
                      </Link>
                    ) : (
                      <button type="button" onClick={onClick} className="block w-full">
                        {content}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {list.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <button
              type="button"
              onClick={() => clearAll({})}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("clearAll")}
            </button>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("preferences")}
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
