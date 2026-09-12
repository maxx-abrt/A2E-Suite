"use client"

/**
 * Iconsax wrapper + lucide-compatible aliases.
 *
 * 1) React 19 dropped `defaultProps` on forwardRef components, which means
 *    iconsax-react's built-in `color: "currentColor"` default is dropped and
 *    SVG paths render with `fill={undefined}` (invisible).
 *    => We re-wrap every icon to force `color="currentColor"` + `variant="Bulk"`.
 *
 * 2) We expose lucide-react-compatible names (Plus, Trash2, Loader2, Mail, …)
 *    aliased onto sensible iconsax counterparts so the rest of the codebase
 *    can `from "@/components/iconsax"` instead of `from "@/components/iconsax"` with
 *    minimal churn.
 *
 * Usage:
 *   import { Plus, Trash2 } from "@/components/iconsax"
 *   <Plus className="h-4 w-4" />     // works like lucide
 *   <Plus size={20} variant="Bold" /> // also accepts iconsax props
 */

import * as React from "react"
import * as Iconsax from "iconsax-react"

type IconProps = React.SVGAttributes<SVGElement> & {
  variant?: "Linear" | "Outline" | "Broken" | "Bold" | "Bulk" | "TwoTone"
  color?: string
  size?: string | number
}

type IconComponent = React.ComponentType<IconProps>

function wrap(name: string): IconComponent {
  const Comp = (Iconsax as unknown as Record<string, IconComponent>)[name]
  if (!Comp) {
    // Only warn for plausible icon names (PascalCase). Ignore JS/React/module
    // internals like `$$typeof`, `then`, `__esModule` that get probed by tooling.
    if (process.env.NODE_ENV !== "production" && /^[A-Z][A-Za-z0-9]*$/.test(name)) {
      // eslint-disable-next-line no-console
      console.warn(`[iconsax] Unknown icon: ${name}`)
    }
    return () => null
  }
  const Wrapped = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => {
    const { color = "currentColor", variant = "Bulk", size = 18, ...rest } = props
    return React.createElement(Comp, { ...rest, ref, color, variant, size } as IconProps)
  })
  Wrapped.displayName = `IS_${name}`
  return Wrapped as unknown as IconComponent
}

const cache = new Map<string, IconComponent>()
function get(name: string): IconComponent {
  let c = cache.get(name)
  if (!c) {
    c = wrap(name)
    cache.set(name, c)
  }
  return c
}

/* ─────────────────────────────────────────────────────────────────────────
   Native iconsax exports (use these when you control the import).
   ───────────────────────────────────────────────────────────────────────── */
export const ArrowRight = get("ArrowRight")
export const ArrowRight2 = get("ArrowRight2")
export const ArrowRight3 = get("ArrowRight3")
export const ArrowLeft2 = get("ArrowLeft2")
export const ArrowUp = get("ArrowUp")
export const ArrowDown = get("ArrowDown")
export const Flash = get("Flash")
export const RouteSquare = get("RouteSquare")
export const ChartSquare = get("ChartSquare")
export const Designtools = get("Designtools")
export const HeartTick = get("HeartTick")
export const TickCircle = get("TickCircle")
export const TickSquare = get("TickSquare")
export const Wallet2 = get("Wallet2")
export const Wallet3 = get("Wallet3")
export const Building4 = get("Building4")
export const MagicStar = get("MagicStar")
export const Star1 = get("Star1")
export const Element4 = get("Element4")
export const ReceiptText = get("ReceiptText")
export const DocumentText1 = get("DocumentText1")
export const ClipboardText = get("ClipboardText")
export const Book1 = get("Book1")
export const Folder2 = get("Folder2")
export const Chart2 = get("Chart2")
export const Chart = get("Chart")
export const Judge = get("Judge")
export const Setting2 = get("Setting2")
export const LogoutCurve = get("LogoutCurve")
export const HambergerMenu = get("HambergerMenu")
export const Sun1 = get("Sun1")
export const Save2 = get("Save2")
export const Danger = get("Danger")
export const DocumentDownload = get("DocumentDownload")
export const TrendUp = get("TrendUp")
export const TrendDown = get("TrendDown")
export const ReceiptItem = get("ReceiptItem")
export const Add = get("Add")
export const CloseCircle = get("CloseCircle")
export const Notification = get("Notification")
export const SearchNormal1 = get("SearchNormal1")
export const FilterSquare = get("FilterSquare")
export const Edit2 = get("Edit2")
export const Edit = get("Edit")
export const DocumentCopy = get("DocumentCopy")
export const ShieldTick = get("ShieldTick")
export const ShieldCross = get("ShieldCross")
export const ProfileTick = get("ProfileTick")
export const UserAdd = get("UserAdd")
export const UserRemove = get("UserRemove")
export const MoreCircle = get("MoreCircle")
export const More = get("More")
export const ArrowCircleUp2 = get("ArrowCircleUp2")
export const ArrowCircleDown2 = get("ArrowCircleDown2")
export const Calendar2 = get("Calendar2")
export const Calendar = get("Calendar")
export const Sms = get("Sms")
export const InfoCircle = get("InfoCircle")
export const Information = get("Information")
export const Refresh = get("Refresh")
export const Refresh2 = get("Refresh2")
export const DocumentUpload = get("DocumentUpload")
export const Image = get("Image")
export const Export = get("Export")
export const Buildings2 = get("Buildings2")
export const FolderOpen = get("FolderOpen")
export const Send2 = get("Send2")
export const Eye = get("Eye")
export const Lamp = get("Lamp")
export const LampOn = get("LampOn")
export const People = get("People")
export const Profile2User = get("Profile2User")
export const ClipboardTick = get("ClipboardTick")
export const ScanBarcode = get("ScanBarcode")
export const NoteText = get("NoteText")
export const ExportCurve = get("ExportCurve")
export const Trash = get("Trash")
export const Personalcard = get("Personalcard")
export const Hashtag = get("Hashtag")
export const HierarchySquare3 = get("HierarchySquare3")
export const Sort = get("Sort")
export const Receipt2 = get("Receipt2")
export const ReceiptDiscount = get("ReceiptDiscount")
export const Bag2 = get("Bag2")
export const Briefcase = get("Briefcase")
export const Document = get("Document")
export const DocumentText = get("DocumentText")
export const Paperclip = get("Paperclip")

/* ─────────────────────────────────────────────────────────────────────────
   lucide-react compatibility aliases (drop-in replacements).
   These let us swap `from "@/components/iconsax"` → `from "@/components/iconsax"`
   across the codebase without rewriting every <Icon /> call site.
   ───────────────────────────────────────────────────────────────────────── */
export const Activity = get("Activity")
export const AlertCircle = get("InfoCircle")          // lucide AlertCircle
export const AlertTriangle = get("Danger")            // lucide AlertTriangle
export const ArrowDownRight = get("ArrowDown")
export const ArrowUpRight = get("ArrowRight3")
export const ArrowRightIcon = get("ArrowRight")
export const ArrowLeft = get("ArrowLeft2")
export const BarChart3 = get("Chart")
export const BookOpen = get("Book1")
export const Building2 = get("Building4")
export const Check = get("TickCircle")
export const CheckCircle2 = get("TickCircle")
export const ChevronLeft = get("ArrowLeft2")
export const ChevronsUpDown = get("Sort")
export const ClipboardList = get("ClipboardText")
export const Clock = get("Clock")
export const Copy = get("DocumentCopy")
export const Download = get("DocumentDownload")
export const ExternalLink = get("Export")
export const FileText = get("DocumentText1")
export const Gavel = get("Judge")
export const HardDrive = get("Folder2")
export const HeartHandshake = get("HeartTick")
export const ImageIcon = get("Image")
export const Info = get("InfoCircle")
export const LayoutDashboard = get("Element4")
export const Lightbulb = get("Lamp")
export const Link2 = get("Link21")
export const Loader2 = get("Refresh")
export const LogOut = get("LogoutCurve")
export const Mail = get("Sms")
export const Menu = get("HambergerMenu")
export const Moon = get("Moon")
export const MoreHorizontal = get("More")
export const PiggyBank = get("Wallet3")
export const Plus = get("Add")
export const Receipt = get("ReceiptText")
export const Scale = get("Judge")
export const Send = get("Send2")
export const Settings = get("Setting2")
export const Shield = get("ShieldTick")
export const ShieldAlert = get("Danger")
export const ShieldCheck = get("ShieldTick")
export const Sparkles = get("MagicStar")
export const Star = get("Star1")
export const Sun = get("Sun1")
export const Target = get("ScanBarcode")
export const Trash2 = get("Trash")
export const TrendingUp = get("TrendUp")
export const TrendingDown = get("TrendDown")
export const User = get("Profile2User")
export const UserCheck = get("ProfileTick")
export const UserIcon = get("Profile2User")
export const UserPlus = get("UserAdd")
export const Users = get("People")
export const Wallet = get("Wallet2")
export const X = get("CloseCircle")
export const XCircle = get("CloseCircle")
export const Layers = get("HierarchySquare3")
export const Link2Icon = get("Link21")
export const Globe = get("Global")
export const Languages = get("Translate")
export const Search = get("SearchNormal1")
export const FileImage = get("Image")
export const UploadCloud = get("DocumentUpload")
export const Bell = get("Notification")
export const BellOff = get("Notification")
export const CheckCheck = get("Check")
export const FilePlus2 = get("DocumentText1")
export const Save = get("Save2")
export const Lock = get("Lock")
export const Buildings = get("Buildings")
export const Lock1 = get("Lock1")
export const Global = get("Global")
export const Key = get("Key")
export const Fingerprint = get("Scan")
export const ShieldSearch = get("ShieldSearch")

// Generic proxy fallback: anything else still works via lazy lookup.
const proxy = new Proxy(
  {},
  {
    get(_t, key) {
      // Ignore symbols and JS/React/module-interop internals so they don't get
      // treated as icon names (e.g. React probing `$$typeof`, thenable checks, HMR).
      if (typeof key !== "string") return undefined
      if (
        key === "$$typeof" ||
        key === "then" ||
        key === "prototype" ||
        key === "toJSON" ||
        key === "displayName" ||
        key === "__esModule" ||
        key.startsWith("__")
      ) {
        return undefined
      }
      return get(key)
    },
  },
) as Record<string, IconComponent>

export default proxy
