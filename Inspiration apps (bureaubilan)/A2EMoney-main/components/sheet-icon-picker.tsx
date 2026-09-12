"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import iconsax, {
  Wallet2, HeartTick, ScanBarcode, NoteText, Book1, ReceiptText, Profile2User,
  ClipboardText, Building4, Chart, Calendar, Flash, ShieldTick, Star1, MagicStar,
  Briefcase, Bag2, Personalcard, DocumentText, Folder2,
} from "@/components/iconsax"

/** Iconsax keys safe to use as sheet icons (Bulk variant). */
export const SHEET_ICON_KEYS = [
  "Wallet2",
  "HeartTick",
  "ScanBarcode",
  "NoteText",
  "Book1",
  "ReceiptText",
  "Profile2User",
  "ClipboardText",
  "Building4",
  "Chart",
  "Calendar",
  "Flash",
  "ShieldTick",
  "Star1",
  "MagicStar",
  "Briefcase",
  "Bag2",
  "Personalcard",
  "DocumentText",
  "Folder2",
] as const

export const SHEET_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#84cc16",
]

/** Renders a Bulk iconsax icon by key, with safe fallback. */
export function SheetIcon({
  iconKey,
  size = 18,
  className,
}: {
  iconKey?: string | null
  size?: number
  className?: string
}) {
  const key =
    iconKey && SHEET_ICON_KEYS.includes(iconKey as any) ? (iconKey as string) : "Book1"
  const Icon = (iconsax as Record<string, React.ComponentType<any>>)[key]
  if (!Icon) return null
  return <Icon size={size} variant="Bulk" className={className} />
}

export function SheetIconPicker({
  value,
  color,
  onChange,
  onColorChange,
}: {
  value?: string | null
  color?: string | null
  onChange: (key: string) => void
  onColorChange?: (color: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const active = value || "Book1"
  const activeColor = color || SHEET_COLORS[0]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choose icon"
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 transition hover:bg-muted"
          style={{ backgroundColor: activeColor + "20", color: activeColor }}
          data-testid="sheet-icon-picker-trigger"
        >
          <SheetIcon iconKey={active} size={22} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Icon
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {SHEET_ICON_KEYS.map((k) => {
            const isActive = k === active
            return (
              <button
                key={k}
                type="button"
                onClick={() => onChange(k)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                  isActive ? "ring-2 ring-foreground" : "hover:bg-muted"
                }`}
                style={
                  isActive
                    ? { backgroundColor: activeColor + "25", color: activeColor }
                    : { color: "var(--foreground)" }
                }
                data-testid={`sheet-icon-${k}`}
              >
                <SheetIcon iconKey={k} size={18} />
              </button>
            )
          })}
        </div>
        {onColorChange && (
          <>
            <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Color
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SHEET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColorChange(c)}
                  className={`h-6 w-6 rounded-full border transition ${
                    c === activeColor ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
