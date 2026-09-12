"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useCoreAuthState, useInvitationByToken, useInvitationMutations, useWorkspace } from "@a2e/core"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, ShieldTick } from "@/components/iconsax"
import { BilanWordmark } from "@/components/bilan-logo"
import { useCoreBridge } from "@/lib/core-bridge"
import { toast } from "sonner"

/**
 * Invitation acceptance. Invitations live in A2E Core, so accepting here also
 * grants access in every other suite app — one workspace, one roster.
 */
export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const { token } = React.use(params)

  const { isAuthenticated, isLoading } = useCoreAuthState()
  const invitation = useInvitationByToken(token)
  const { accept } = useInvitationMutations()
  const { setActiveWorkspaceId } = useWorkspace()
  const { resync } = useCoreBridge()
  const [accepting, setAccepting] = React.useState(false)

  async function handleAccept() {
    try {
      setAccepting(true)
      const workspaceId = await accept({ token })
      setActiveWorkspaceId(workspaceId)
      // Mirror the new membership into Bilan before the dashboard queries run.
      await resync().catch(() => {})
      toast.success("Bienvenue dans l'espace partagé !")
      router.push("/dashboard")
    } catch (error: any) {
      toast.error(error?.message || "Impossible d'accepter l'invitation")
    } finally {
      setAccepting(false)
    }
  }

  if (isLoading || invitation === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center px-4 sm:px-6">
        <BilanWordmark size={30} />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">{children}</main>
    </div>
  )

  if (!invitation) {
    return shell(
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Invitation introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce lien n&apos;existe pas ou a été révoqué. Demandez un nouveau lien à l&apos;administrateur.
        </p>
        <Button asChild className="mt-6">
          <a href="/">Retour à l&apos;accueil</a>
        </Button>
      </div>,
    )
  }

  if (invitation.status !== "pending") {
    return shell(
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Invitation {invitation.status}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cette invitation n&apos;est plus valide.</p>
        <Button asChild className="mt-6">
          <a href="/dashboard">Aller au tableau de bord</a>
        </Button>
      </div>,
    )
  }

  return shell(
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,var(--card))] text-primary">
        <ShieldTick className="h-5 w-5" />
      </div>
      <h1 className="mt-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Invitation à rejoindre
      </h1>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{invitation.workspace?.name ?? "un espace de travail"}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        En tant que <strong>{invitation.role}</strong>, vous accéderez à cet espace dans Bilan et dans toute la suite
        A2E (fichiers, notifications, équipe).
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Invitation envoyée à {invitation.email}</p>
      {isAuthenticated ? (
        <Button onClick={handleAccept} disabled={accepting} className="mt-6 w-full gap-2" data-testid="accept-invite-btn">
          {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Accepter l&apos;invitation
        </Button>
      ) : (
        <Button asChild className="mt-6 w-full">
          <a href={`/sign-in?returnPathname=${encodeURIComponent(`/invite/${token}`)}`}>Se connecter pour accepter</a>
        </Button>
      )}
    </div>,
  )
}
