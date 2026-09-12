"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { useAuth } from "@workos-inc/authkit-nextjs/components"
import { useConvexAuth } from "convex/react"
import { useQuota, useWorkspace } from "@a2e/core"
import { useCoreBridge, useIdentity } from "@/lib/core-bridge"
import { formatBytes } from "@/lib/utils"
import { CommandPalette } from "@/components/command-palette"
import { ConsentBanner } from "@/components/consent-banner"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet as SheetComponent,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  Element4,
  Wallet3,
  ReceiptText,
  DocumentText1,
  FolderOpen,
  ClipboardText,
  Book1,
  Folder2,
  Chart,
  People,
  Activity as ActivityIcon,
  Judge,
  Setting2,
  LogoutCurve,
  HambergerMenu,
  Sun1,
  Moon,
  ArrowLeft2,
  Wallet,
  HeartTick,
  Danger,
  Refresh,
} from "@/components/iconsax"
import { cn } from "@/lib/utils"
import { BilanWordmark, BilanMark } from "@/components/bilan-logo"

type IconProps = { className?: string; size?: number }

const iconAdapter = (Comp: any) =>
  function Adapted({ className, size = 18 }: IconProps) {
    return <Comp className={className} size={size} variant="Bulk" />
  }

const LayoutDashboard = iconAdapter(Element4)
const PiggyBank = iconAdapter(Wallet3)
const Receipt = iconAdapter(ReceiptText)
const FileText = iconAdapter(DocumentText1)
const FolderOpenIcon = iconAdapter(FolderOpen)
const ClipboardList = iconAdapter(ClipboardText)
const BookOpen = iconAdapter(Book1)
const HardDrive = iconAdapter(Folder2)
const BarChart3 = iconAdapter(Chart)
const Users = iconAdapter(People)
const Activity = iconAdapter(ActivityIcon)
const Gavel = iconAdapter(Judge)
const Settings = iconAdapter(Setting2)
const LogOut = iconAdapter(LogoutCurve)
const Menu = iconAdapter(HambergerMenu)
const Sun = iconAdapter(Sun1)
const MoonIcon = iconAdapter(Moon)
const ChevronLeft = iconAdapter(ArrowLeft2)
const WalletIcon = iconAdapter(Wallet)
const SubventionsIcon = iconAdapter(HeartTick)

interface NavItem {
  key: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  group: "main" | "secondary"
  businessOnly?: boolean
}

const navItems: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, group: "main" },
  { key: "budget", href: "/dashboard/budget", icon: PiggyBank, group: "main" },
  { key: "expenses", href: "/dashboard/expenses", icon: Receipt, group: "main" },
  { key: "invoices", href: "/dashboard/invoices", icon: FileText, group: "main" },
  { key: "projects", href: "/dashboard/projects", icon: FolderOpenIcon, group: "main" },
  { key: "fiches", href: "/dashboard/fiches", icon: ClipboardList, group: "main" },
  { key: "book", href: "/dashboard/book", icon: BookOpen, group: "main" },
  { key: "subventions", href: "/dashboard/subventions", icon: SubventionsIcon, group: "main" },
  { key: "documents", href: "/dashboard/documents", icon: HardDrive, group: "main" },
  { key: "reports", href: "/dashboard/reports", icon: BarChart3, group: "secondary" },
  { key: "team", href: "/dashboard/team", icon: Users, group: "secondary" },
  { key: "activity", href: "/dashboard/activity", icon: Activity, group: "secondary" },
  { key: "legal", href: "/dashboard/legal", icon: Gavel, group: "secondary" },
  { key: "settings", href: "/dashboard/settings", icon: Settings, group: "secondary" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user: workosUser, loading: workosLoading } = useAuth()
  const signOut = React.useCallback(() => {
    window.location.href = "/session/signout"
  }, [])
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const [convexAuthStuck, setConvexAuthStuck] = useState(false)
  const me = useIdentity()
  const { workspaces, activeWorkspace, activeWorkspaceId, isLoading: wsLoading } = useWorkspace()
  const storage = useQuota(activeWorkspaceId, "storageBytes")
  const bridge = useCoreBridge()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const t = useTranslations("nav")
  const tSections = useTranslations("pages.sections")
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Persist collapsed state
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("a2e_sidebar_collapsed") : null
    if (stored === "1") setCollapsed(true)
  }, [])
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("a2e_sidebar_collapsed", collapsed ? "1" : "0")
  }, [collapsed])

  // Redirect to WorkOS hosted login ONLY when WorkOS itself has no session.
  // We must NOT redirect based on Convex auth alone: if WorkOS is authenticated
  // but Convex rejects the token (e.g. an auth.config issuer mismatch), bouncing
  // to /sign-in creates an infinite /dashboard→/sign-in→/callback loop.
  // Use window.location for external OAuth hand-off; router.replace would
  // trigger an RSC fetch that follows the 307 to api.workos.com and fails CORS.
  useEffect(() => {
    if (workosLoading) return
    if (!workosUser && typeof window !== "undefined") {
      const search = window.location.search
      const next = pathname + search
      window.location.href = `/sign-in?returnPathname=${encodeURIComponent(next)}`
    }
  }, [workosLoading, workosUser, pathname])

  // Detect the "WorkOS authenticated but Convex never authenticates" case and
  // surface an actionable error instead of spinning forever.
  useEffect(() => {
    if (workosLoading || authLoading) return
    if (workosUser && !isAuthenticated) {
      const timer = setTimeout(() => setConvexAuthStuck(true), 8000)
      return () => clearTimeout(timer)
    }
    setConvexAuthStuck(false)
  }, [workosLoading, authLoading, workosUser, isAuthenticated])

  // Redirect to onboarding if authenticated and no workspaces
  useEffect(() => {
    if (authLoading || wsLoading) return
    if (!isAuthenticated) return
    if (workspaces && workspaces.length === 0 && pathname !== "/onboarding") {
      router.replace("/onboarding")
    }
  }, [authLoading, wsLoading, isAuthenticated, workspaces, pathname, router])

  const storagePercent = Math.min(100, storage.percent)

  // WorkOS is authenticated but Convex never accepted the token — show an
  // actionable error instead of an infinite spinner/redirect loop.
  if (convexAuthStuck && workosUser && !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-lg font-semibold">Session verification failed</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You&apos;re signed in with WorkOS, but the backend couldn&apos;t validate
          your session. This usually clears up after a moment — try again, or sign
          out and back in.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Retry</Button>
          <Button variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  // Wait while auth resolves, the shared workspace list loads, or the core
  // membership mirror is still syncing its first result. The sync only fires
  // AFTER the workspace list loads (the bridge depends on the workspace
  // signature), so we must hold the spinner here until `bridge.ready` flips —
  // otherwise workspace-scoped queries throw WORKSPACE_NOT_SYNCED and trip the
  // CoreErrorBoundary. `bridge.failed` short-circuits the wait so we surface a
  // clear failure screen instead of spinning forever on a broken bridge.
  const syncPending = isAuthenticated && !bridge.ready && !bridge.failed
  if (authLoading || !isAuthenticated || (isAuthenticated && wsLoading) || syncPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border border-accent border-t-transparent" />
        <pre data-testid="auth-debug" className="text-[10px] text-muted-foreground">{JSON.stringify({ authLoading, isAuthenticated, wsLoading, syncPending, workosUser: Boolean(workosUser), bridgeReady: bridge.ready, bridgeFailed: bridge.failed, bridgeErr: bridge.error, wsCount: workspaces?.length ?? null })}</pre>
      </div>
    )
  }

  // Core bridge failed to mirror memberships (e.g. CONVEX_CORE_URL /
  // A2E_SERVICE_SECRET missing on the Bilan Convex deployment). Show an
  // actionable failure screen with the real error + retry, instead of letting
  // every workspace-scoped query crash into the cryptic CoreErrorBoundary.
  if (bridge.failed && !bridge.syncing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Danger className="h-5 w-5" />
        </div>
        <div className="max-w-md space-y-1">
          <h2 className="text-base font-semibold">Espace partagé A2E indisponible</h2>
          <p className="text-sm text-muted-foreground">
            La synchronisation avec la base partagée a échoué. Vos données
            financières restent intactes — réessayez dans un instant.
          </p>
          {bridge.error && (
            <p className="pt-2 font-mono text-[11px] text-muted-foreground/80">
              {bridge.error.slice(0, 220)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => bridge.resync()} variant="outline" className="gap-2">
            <Refresh className="h-4 w-4" /> Réessayer
          </Button>
          <Button onClick={() => window.location.reload()}>Recharger</Button>
        </div>
      </div>
    )
  }

  const renderNavLink = (item: NavItem, forceExpanded = false) => {
    const Icon = item.icon
    const active =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
    const showLabel = forceExpanded || !collapsed
    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
          active
            ? "bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
        title={collapsed && !forceExpanded ? t(item.key) : undefined}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
            aria-hidden
          />
        )}
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            active
              ? "text-primary"
              : "text-muted-foreground group-hover:scale-110 group-hover:text-foreground",
          )}
        />
        {showLabel ? <span className="truncate">{t(item.key)}</span> : null}
      </Link>
    )
  }

  const mainNav = navItems.filter((i) => i.group === "main")
  const secondaryNav = navItems.filter((i) => i.group === "secondary")

  const sidebar = (forceExpanded = false) => (
    <div
      className={cn(
        "flex h-full flex-col transition-[width] duration-300 ease-in-out",
        forceExpanded ? "" : collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border px-4",
          collapsed && !forceExpanded ? "justify-center" : "justify-between",
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          {(!collapsed || forceExpanded) ? (
            <BilanWordmark size={30} />
          ) : (
            <BilanMark size={30} />
          )}
        </Link>
        {!forceExpanded && !collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Workspace switcher */}
      <div className="border-b border-border px-3 py-3">
        <WorkspaceSwitcher collapsed={collapsed && !forceExpanded} />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {(!collapsed || forceExpanded) && (
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {tSections("workspace")}
            </p>
          )}
          {mainNav.map((item) => renderNavLink(item, forceExpanded))}
        </div>
        <div className="space-y-1">
          {(!collapsed || forceExpanded) && (
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {tSections("manage")}
            </p>
          )}
          {secondaryNav.map((item) => renderNavLink(item, forceExpanded))}
        </div>
      </nav>

      {/* Storage + Logout */}
      <div className="border-t border-border p-3">
        {(!collapsed || forceExpanded) && storage.limit !== 0 && (
          <div className="mb-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{t("storage")}</span>
              <span className="text-muted-foreground">
                {Math.round(storagePercent)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[var(--brand-green)]"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              {formatBytes(storage.used)} / {storage.limit < 0 ? "\u221e" : formatBytes(storage.limit)}
            </div>
          </div>
        )}
        {collapsed && !forceExpanded ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("signOut")}</span>
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen border-r border-border bg-card md:block">
          {sidebar(false)}
        </aside>

        {/* Mobile sidebar */}
        <SheetComponent open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <VisuallyHidden>
              <SheetTitle>Navigation</SheetTitle>
            </VisuallyHidden>
            {sidebar(true)}
          </SheetContent>
        </SheetComponent>

        {/* Main area */}
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </Button>
              <LanguageSwitcher />
              <NotificationsDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 flex h-9 items-center gap-2 rounded-full border border-border bg-card px-2 pr-3 transition-colors hover:bg-muted">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_20%,var(--card))] text-xs font-semibold text-primary">
                      {(me.name || me.email || "?")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span className="hidden text-sm font-medium sm:inline">
                      {(me.name || me.email || "").split(" ")[0]}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-medium">{me.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{me.email ?? ""}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings className="mr-2 h-4 w-4" /> {t("settings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {bridge.error && (
            <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning sm:px-6">
              Espace partagé A2E : {bridge.error}{" "}
              <button type="button" onClick={() => bridge.resync()} className="underline">
                réessayer
              </button>
            </div>
          )}
          <main className="flex-1 animate-fade-in">{children}</main>
          <CommandPalette />
          <ConsentBanner />
        </div>
      </div>
    </div>
  )
}
