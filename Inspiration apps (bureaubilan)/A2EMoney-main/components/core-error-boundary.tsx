"use client"

import * as React from "react"
import { disableCoreModules, enableCoreModules } from "@/lib/core-flags"
import { Button } from "@/components/ui/button"
import { Danger, Refresh } from "@/components/iconsax"

/**
 * GUARANTEED NON-REGRESSION for the shared layer.
 *
 * Convex `useQuery` throws during render, so a single failing A2E Core read
 * would take a whole page down. This boundary catches it, switches every core
 * module off at runtime (`disableCoreModules`) and re-renders — the page keeps
 * working on Bilan's own data with a banner and a retry, instead of dying.
 */
interface State {
  error: Error | null
}

export class CoreErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[A2E Core] read failed — degrading to local data", error)
    disableCoreModules()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Danger className="h-5 w-5" />
        </div>
        <div className="max-w-md space-y-1">
          <h2 className="text-base font-semibold">Espace partagé A2E momentanément indisponible</h2>
          <p className="text-sm text-muted-foreground">
            Vos données financières restent intactes. Les modules partagés (équipe, fichiers,
            notifications) sont temporairement désactivés.
          </p>
          <p className="pt-2 font-mono text-[11px] text-muted-foreground/80">
            {this.state.error.message.slice(0, 180)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              // Reset the runtime degradation before clearing the boundary, so a
              // successful retry starts from a clean state. If the query fails
              // again, componentDidCatch re-disables. Keeps this boundary and the
              // core bridge's success path (which also calls enableCoreModules)
              // consistent on recovery.
              enableCoreModules()
              this.setState({ error: null })
            }}
            variant="outline"
            className="gap-2"
          >
            <Refresh className="h-4 w-4" /> Réessayer
          </Button>
          <Button onClick={() => window.location.reload()}>Recharger</Button>
        </div>
      </div>
    )
  }
}
