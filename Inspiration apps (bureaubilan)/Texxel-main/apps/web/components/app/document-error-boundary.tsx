"use client";

import * as React from "react";
import { EmptyState, btnGhost } from "@/components/app/common";
import { CloseCircle, Refresh2 } from "iconsax-reactjs";
import { useTranslations } from "next-intl";

/**
 * Recovery boundary around the document view. A corrupt document payload, a
 * BlockNote schema mismatch, or a render-time throw used to leave a frozen or
 * blank page with no escape; here it degrades to an actionable error card.
 */
export class DocumentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[bureau] document view failed to render", error);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return <DocumentErrorCard onRetry={this.reset} error={this.state.error} />;
  }
}

function DocumentErrorCard({ onRetry, error }: { onRetry: () => void; error: Error }) {
  const t = useTranslations("editor");
  return (
    <div className="mx-auto max-w-[860px] px-6 py-20" data-testid="document-error-boundary">
      <EmptyState
        icon={CloseCircle}
        title={t("loadFailedTitle")}
        description={t("loadFailedDesc")}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.reload()} className={btnGhost} data-testid="document-error-reload">
              <Refresh2 variant="Bulk" size={16} /> {t("reload")}
            </button>
            <button onClick={onRetry} className={btnGhost} data-testid="document-error-retry">
              <CloseCircle variant="Bulk" size={16} /> {t("retryRender")}
            </button>
          </div>
        }
      />
      <p className="mt-6 text-center text-xs text-muted-foreground/60">{String(error?.message ?? error)}</p>
    </div>
  );
}
