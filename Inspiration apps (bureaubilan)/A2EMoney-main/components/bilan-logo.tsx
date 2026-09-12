"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Bilan brand mark — the A2E suite puzzle piece (lavender) with a Σ (sum /
 * balance) glyph. Used across the app shell, auth screens and marketing.
 */
export function BilanMark({
  className,
  size = 32,
  rounded = true,
}: {
  className?: string
  size?: number
  rounded?: boolean
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        rounded && "rounded-[28%]",
        className,
      )}
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(150deg, color-mix(in srgb, var(--primary) 96%, white) 0%, var(--primary) 100%)",
        boxShadow: "var(--elev-1)",
      }}
      aria-hidden
    >
      <svg
        width={size * 0.66}
        height={size * 0.66}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Puzzle piece silhouette (suite motif), subtle */}
        <path
          d="M10.5 3a1.5 1.5 0 0 1 3 0c0 .34-.11.66-.3.92-.13.19-.2.42-.2.66 0 .29.24.42.53.42H16a1 1 0 0 1 1 1v2.04c0 .29.13.53.42.53.24 0 .47-.07.66-.2.26-.19.58-.3.92-.3a1.5 1.5 0 0 1 0 3c-.34 0-.66-.11-.92-.3a1.16 1.16 0 0 0-.66-.2c-.29 0-.42.24-.42.53V17a1 1 0 0 1-1 1h-2.04c-.29 0-.53.13-.53.42 0 .24.07.47.2.66.19.26.3.58.3.92a1.5 1.5 0 0 1-3 0c0-.34.11-.66.3-.92.13-.19.2-.42.2-.66 0-.29-.24-.42-.53-.42H8a1 1 0 0 1-1-1v-2.04c0-.29-.13-.53-.42-.53-.24 0-.47.07-.66.2-.26.19-.58.3-.92.3a1.5 1.5 0 0 1 0-3c.34 0 .66.11.92.3.19.13.42.2.66.2.29 0 .42-.24.42-.53V6a1 1 0 0 1 1-1h2.04c.29 0 .53-.13.53-.42 0-.24-.07-.47-.2-.66A1.55 1.55 0 0 1 10.5 3Z"
          fill="rgba(255,255,255,0.16)"
        />
      </svg>
      {/* Σ balance glyph */}
      <span
        className="absolute font-heading font-extrabold text-white"
        style={{ fontSize: size * 0.44, lineHeight: 1, marginTop: -size * 0.02 }}
      >
        Σ
      </span>
    </span>
  )
}

export function BilanWordmark({
  className,
  size = 32,
  showText = true,
}: {
  className?: string
  size?: number
  showText?: boolean
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BilanMark size={size} />
      {showText && (
        <span className="text-[1.05rem] font-extrabold tracking-tight text-foreground">
          Bilan
        </span>
      )}
    </span>
  )
}

export default BilanMark
