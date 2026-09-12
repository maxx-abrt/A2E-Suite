"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import {
  QuotaExceededError,
  useInvitationMutations,
  useInvitations,
  useMembers,
  useMyPermissions,
  useQuota,
  useRoleMutations,
  useRoles,
  useWorkspace,
  useWorkspaceMutations,
} from "@a2e/core"
import { api } from "@/convex/_generated/api"
import { useCoreBridge, useIdentity } from "@/lib/core-bridge"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/empty-state"
import { GlassCard } from "@/components/glass-card"
import {
  People as Users,
  UserAdd,
  Refresh as Loader2,
  MoreCircle as MoreHorizontal,
  Copy,
  ShieldTick as ShieldCheck,
  Eye,
  ProfileTick as UserCheck,
  CloseCircle as XCircle,
  Plus,
  Trash2,
  ShieldTick,
} from "@/components/iconsax"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const ROLES = ["admin", "member", "viewer"] as const
const UserPlus = UserAdd

const PERMISSIONS = [
  "workspace:manage",
  "members:manage",
  "roles:manage",
  "invites:manage",
  "drive:view",
  "drive:write",
  "drive:manage",
  "drive:share",
  "calendar:view",
  "calendar:manage",
  "tasks:view",
  "tasks:manage",
  "tasks:assign",
  "contacts:view",
  "contacts:manage",
  "activities:view",
  "entitlements:manage",
] as const

const ROLE_COLORS = ["#8590C8", "#3fa780", "#e0964e", "#c96a6a", "#6a9ec9", "#9a6ac9"]

/**
 * Team = the A2E Core workspace roster. Members, roles, permissions and
 * invitations all live in core, so a person invited here is a member in every
 * suite app. Emails come from Bilan's verified directory (WorkOS tokens carry no
 * email claim), never from client input.
 */
export default function TeamPage() {
  const t = useTranslations("team")
  const tCommon = useTranslations("common")
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()
  const members = useMembers(activeWorkspaceId)
  const invitations = useInvitations(activeWorkspaceId)
  const roles = useRoles(activeWorkspaceId)
  const permissions = useMyPermissions(activeWorkspaceId)
  const seats = useQuota(activeWorkspaceId, "maxMembers")
  const directory = useQuery(
    api.directory.membersOf,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  )
  const { invite, revoke } = useInvitationMutations()
  const { updateMemberRole, removeMember } = useWorkspaceMutations()
  const roleMutations = useRoleMutations()
  const { resync } = useCoreBridge()
  const me = useIdentity()

  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<(typeof ROLES)[number]>("member")
  const [inviting, setInviting] = React.useState(false)
  const [roleOpen, setRoleOpen] = React.useState(false)
  const [roleName, setRoleName] = React.useState("")
  const [rolePerms, setRolePerms] = React.useState<string[]>(["drive:view", "tasks:view"])

  const canManage = permissions?.includes("members:manage") ?? activeWorkspace?.role === "owner"
  const canManageRoles = permissions?.includes("roles:manage") ?? false

  const emailFor = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const row of directory ?? []) {
      if (row.coreUserId && row.email) map.set(row.coreUserId, row.email)
    }
    return map
  }, [directory])

  const nameFor = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const row of directory ?? []) {
      if (row.coreUserId && row.name) map.set(row.coreUserId, row.name)
    }
    return map
  }, [directory])

  function displayEmail(userId: string, fallback?: string | null) {
    const resolved = emailFor.get(userId)
    if (resolved) return resolved
    if (fallback && fallback !== "unknown@example.com") return fallback
    return "—"
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspaceId || !email.trim()) return
    try {
      setInviting(true)
      const res = await invite({ workspaceId: activeWorkspaceId, email: email.trim(), role })
      const link = `${window.location.origin}/invite/${res.token}`
      await navigator.clipboard.writeText(link).catch(() => {})
      toast.success(t("toasts.invitationSent", { email: email.trim() }), { description: link })
      setEmail("")
      setInviteOpen(false)
    } catch (err: any) {
      if (err instanceof QuotaExceededError) {
        toast.error(t("seatsExceeded", { limit: err.limit }))
      } else {
        toast.error(err?.message || "Could not send invitation")
      }
    } finally {
      setInviting(false)
    }
  }

  async function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(link)
    toast.success(t("toasts.linkCopied"))
  }

  async function changeRole(userId: string, next: (typeof ROLES)[number]) {
    if (!activeWorkspaceId) return
    try {
      await updateMemberRole({ workspaceId: activeWorkspaceId, userId, role: next })
      await resync().catch(() => {})
      toast.success(t("toasts.roleUpdated"))
    } catch (err: any) {
      toast.error(err?.message || "Could not update role")
    }
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspaceId || !roleName.trim()) return
    try {
      await roleMutations.create({
        workspaceId: activeWorkspaceId,
        name: roleName.trim(),
        color: ROLE_COLORS[(roles?.length ?? 0) % ROLE_COLORS.length],
        permissions: rolePerms,
        order: (roles?.length ?? 0) + 1,
      })
      toast.success(t("toasts.roleCreated"))
      setRoleOpen(false)
      setRoleName("")
    } catch (err: any) {
      if (err instanceof QuotaExceededError) toast.error(t("rolesExceeded", { limit: err.limit }))
      else toast.error(err?.message || "Could not create role")
    }
  }

  const pending = (invitations ?? []).filter((i) => i.status === "pending")

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          {canManage && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="invite-btn">
                  <UserPlus className="h-4 w-4" /> {t("invite")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("inviteMember")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInvite} className="flex min-h-0 flex-1 flex-col">
                  <DialogBody className="space-y-4 px-1">
                    <div>
                      <Label>{t("email")}</Label>
                      <Input
                        type="email"
                        data-testid="invite-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>{t("role")}</Label>
                      <select
                        value={role}
                        data-testid="invite-role"
                        onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(`roles.${r}`)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-muted-foreground">{t(`roleHint.${role}`)}</p>
                    </div>
                    <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      {t("sharedInviteNotice")}
                    </p>
                  </DialogBody>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                      {tCommon("cancel")}
                    </Button>
                    <Button type="submit" disabled={inviting || !email.trim()} data-testid="send-invite">
                      {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sendInvitation")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {seats && seats.limit > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldTick className="h-3.5 w-3.5 text-success" />
            {t("seats", { used: members?.length ?? 0, limit: seats.limit })}
          </div>
        )}

        {/* Members */}
        <GlassCard>
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">{t("members")}</h2>
          </div>
          {members === undefined ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyDescription")} />
          ) : (
            <ul className="divide-y divide-border" data-testid="members-list">
              {members.map((m) => {
                const isMe = me.coreUserId === m.userId
                const name = nameFor.get(m.userId) ?? m.user?.name ?? null
                const mail = displayEmail(m.userId, m.user?.email)
                const initials = (name || mail || "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
                return (
                  <li key={m._id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,var(--card))] text-sm font-medium text-primary">
                      {m.user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.user.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {name || mail}
                        {isMe && <span className="ml-1 text-xs text-muted-foreground">({t("you")})</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{mail}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {t(`roles.${m.role}`)}
                    </Badge>
                    {canManage && !isMe && m.role !== "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => changeRole(m.userId, "admin")}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> {t("makeAdmin")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeRole(m.userId, "member")}>
                            <UserCheck className="mr-2 h-4 w-4" /> {t("makeMember")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeRole(m.userId, "viewer")}>
                            <Eye className="mr-2 h-4 w-4" /> {t("makeViewer")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={async () => {
                              if (!activeWorkspaceId) return
                              if (!confirm(t("confirmRemoveMember"))) return
                              await removeMember({ workspaceId: activeWorkspaceId, userId: m.userId })
                              await resync().catch(() => {})
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> {t("remove")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </GlassCard>

        {/* Invitations */}
        {canManage && (
          <GlassCard>
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">{t("pendingInvitations")}</h2>
            </div>
            {pending.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">{t("noInvitationsTitle")}</div>
            ) : (
              <ul className="divide-y divide-border" data-testid="invitations-list">
                {pending.map((inv) => (
                  <li key={inv._id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("invitationExpiresAt", { date: formatDate(inv.expiresAt) })}
                      </p>
                    </div>
                    <Badge variant="secondary">{t(`roles.${inv.role}`)}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)} className="gap-1">
                      <Copy className="h-3.5 w-3.5" /> {t("copyInviteLink")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => revoke({ invitationId: inv._id })}
                    >
                      {t("revoke")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        )}

        {/* Custom roles */}
        {canManageRoles && (
          <GlassCard>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">{t("customRoles")}</h2>
                <p className="text-xs text-muted-foreground">{t("customRolesDescription")}</p>
              </div>
              <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> {t("newRole")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t("newRole")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateRole} className="flex min-h-0 flex-1 flex-col">
                    <DialogBody className="space-y-4 px-1">
                      <div>
                        <Label>{tCommon("name")}</Label>
                        <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} required />
                      </div>
                      <div>
                        <Label className="mb-2 block">{t("permissions")}</Label>
                        <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                          {PERMISSIONS.map((perm) => {
                            const on = rolePerms.includes(perm)
                            return (
                              <button
                                key={perm}
                                type="button"
                                onClick={() =>
                                  setRolePerms((prev) =>
                                    prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
                                  )
                                }
                                className={cn(
                                  "rounded-md border px-2 py-1.5 text-left font-mono text-[11px] transition",
                                  on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground",
                                )}
                              >
                                {perm}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </DialogBody>
                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setRoleOpen(false)}>
                        {tCommon("cancel")}
                      </Button>
                      <Button type="submit" disabled={!roleName.trim()}>
                        {tCommon("create")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {(roles ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">{t("noRoles")}</div>
            ) : (
              <ul className="divide-y divide-border">
                {(roles ?? []).map((r) => (
                  <li key={r._id} className="flex items-center gap-3 px-5 py-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {r.permissions.join(" · ")}
                      </p>
                    </div>
                    {!r.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => roleMutations.remove({ roleId: r._id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        )}

        <GlassCard className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldTick className="h-4 w-4 text-success" /> {t("gdprTitle")}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">{t("gdprDescription")}</p>
        </GlassCard>
      </div>
    </div>
  )
}
