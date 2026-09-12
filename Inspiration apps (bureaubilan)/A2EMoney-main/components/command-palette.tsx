"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { useCoreSearch, useWorkspace } from "@a2e/core"
import { api } from "@/convex/_generated/api"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Element4,
  Wallet3,
  ReceiptText,
  DocumentText1,
  FolderOpen,
  ClipboardText,
  Book1,
  Chart,
  People,
  Activity,
  Judge,
  Setting2,
  ArrowRight,
  HardDrive,
  ShieldTick,
  Calendar,
  ClipboardTick,
  HeartTick,
} from "@/components/iconsax"

const pages = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: Element4 },
  { key: "book", label: "Book", href: "/dashboard/book", icon: Book1 },
  { key: "subventions", label: "Grants", href: "/dashboard/subventions", icon: HeartTick },
  { key: "expenses", label: "Expenses", href: "/dashboard/expenses", icon: ReceiptText },
  { key: "projects", label: "Projects", href: "/dashboard/projects", icon: FolderOpen },
  { key: "budget", label: "Budget", href: "/dashboard/budget", icon: Wallet3 },
  { key: "fiches", label: "Project sheets", href: "/dashboard/fiches", icon: ClipboardText },
  { key: "invoices", label: "Invoices", href: "/dashboard/invoices", icon: DocumentText1 },
  { key: "clients", label: "Clients", href: "/dashboard/clients", icon: People },
  { key: "documents", label: "Documents", href: "/dashboard/documents", icon: HardDrive },
  { key: "reports", label: "Reports", href: "/dashboard/reports", icon: Chart },
  { key: "team", label: "Team", href: "/dashboard/team", icon: People },
  { key: "activity", label: "Activity", href: "/dashboard/activity", icon: Activity },
  { key: "legal", label: "Legal", href: "/dashboard/legal", icon: Judge },
  { key: "settings", label: "Settings", href: "/dashboard/settings", icon: Setting2 },
]

/**
 * Federated command palette (⌘K): Bilan's own records + the A2E Core suite
 * search (drive files, contacts, tasks, events, members) in one list. Core hits
 * carry an href produced by the `routes` map handed to `CoreProvider`.
 */
export function CommandPalette() {
  const router = useRouter()
  const t = useTranslations("nav")
  const { activeWorkspaceId } = useWorkspace()
  const wsId = activeWorkspaceId

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const enabled = Boolean(wsId) && query.trim().length > 1

  const expenses = useQuery(api.a2e_expenses.list, enabled ? { workspaceId: wsId! } : "skip")
  const invoices = useQuery(api.a2e_invoices.list, enabled ? { workspaceId: wsId! } : "skip")
  const projects = useQuery(api.projects.list, enabled ? { workspaceId: wsId! } : "skip")
  const { results: core } = useCoreSearch(wsId, query)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const q = query.trim().toLowerCase()
  const filter = <T,>(rows: T[] | undefined, match: (row: T) => boolean) =>
    q.length < 2 ? [] : (rows ?? []).filter(match).slice(0, 5)

  const filteredExpenses = filter(expenses, (e: any) => e.description.toLowerCase().includes(q))
  const filteredInvoices = filter(
    invoices,
    (i: any) => i.client.toLowerCase().includes(q) || i.number.toLowerCase().includes(q),
  )
  const filteredProjects = filter(projects, (p: any) => p.name.toLowerCase().includes(q))

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t("search")} value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {pages.map((p) => (
            <CommandItem key={p.href} onSelect={() => go(p.href)} className="gap-2">
              <p.icon className="h-4 w-4 text-muted-foreground" />
              <span>{t(p.key) || p.label}</span>
              <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        {filteredProjects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {filteredProjects.map((p: any) => (
                <CommandItem key={p._id} onSelect={() => go(`/dashboard/projects/${p._id}`)} className="gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredInvoices.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Invoices">
              {filteredInvoices.map((i: any) => (
                <CommandItem key={i._id} onSelect={() => go("/dashboard/invoices")} className="gap-2">
                  <DocumentText1 className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {i.number} — {i.client}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredExpenses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Transactions">
              {filteredExpenses.map((e: any) => (
                <CommandItem key={e._id} onSelect={() => go("/dashboard/expenses")} className="gap-2">
                  <ReceiptText className="h-4 w-4 text-muted-foreground" />
                  <span>{e.description}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{e.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* A2E Core — shared results from the whole suite */}
        {core.files.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="A2E Drive">
              {core.files.slice(0, 5).map((hit) => (
                <CommandItem
                  key={hit.id}
                  onSelect={() => go(hit.href ?? `/dashboard/documents?file=${hit.id}`)}
                  className="gap-2"
                >
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>{hit.title}</span>
                  {hit.subtitle && <span className="ml-auto text-xs text-muted-foreground">{hit.subtitle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {core.contacts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="A2E People">
              {core.contacts.slice(0, 5).map((hit) => (
                <CommandItem key={hit.id} onSelect={() => go(hit.href ?? "/dashboard/clients")} className="gap-2">
                  <People className="h-4 w-4 text-muted-foreground" />
                  <span>{hit.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {core.tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="A2E Tasks">
              {core.tasks.slice(0, 5).map((hit) => (
                <CommandItem key={hit.id} onSelect={() => go(hit.href ?? "/dashboard/projects")} className="gap-2">
                  <ClipboardTick className="h-4 w-4 text-muted-foreground" />
                  <span>{hit.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {core.events.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="A2E Calendar">
              {core.events.slice(0, 5).map((hit) => (
                <CommandItem key={hit.id} onSelect={() => go(hit.href ?? "/dashboard")} className="gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{hit.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {core.members.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="A2E Team">
              {core.members.slice(0, 5).map((hit) => (
                <CommandItem key={hit.id} onSelect={() => go(hit.href ?? "/dashboard/team")} className="gap-2">
                  <ShieldTick className="h-4 w-4 text-muted-foreground" />
                  <span>{hit.title}</span>
                  {hit.subtitle && <span className="ml-auto text-xs text-muted-foreground">{hit.subtitle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
