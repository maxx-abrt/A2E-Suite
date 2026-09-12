"use client"

/**
 * Global Intl guard.
 *
 * Some runtime environments expose an invalid default locale (e.g. the POSIX/C
 * system locale resolves to "en-US@posix"), which makes bare Intl / toLocale*
 * calls throw `RangeError: Invalid language tag`. Third-party libraries (charts,
 * date pickers) call these without an explicit locale, so we harden the global
 * APIs to fall back to the app's French locale when the locale is missing or
 * invalid. This runs once, client-side, on import.
 */
const FALLBACK = "fr-FR"

function isValidLocale(loc: unknown): boolean {
  try {
    // @ts-ignore
    Intl.getCanonicalLocales(loc as any)
    return true
  } catch {
    return false
  }
}

function fixLocale(locales: any): any {
  if (locales == null) return FALLBACK
  if (typeof locales === "string") {
    const cleaned = locales.split("@")[0].replace("_", "-")
    return isValidLocale(cleaned) ? cleaned : FALLBACK
  }
  if (Array.isArray(locales)) {
    const cleaned = locales
      .map((l) => (typeof l === "string" ? l.split("@")[0].replace("_", "-") : l))
      .filter(isValidLocale)
    return cleaned.length ? cleaned : FALLBACK
  }
  return FALLBACK
}

function wrapIntlCtor<T extends Function>(Orig: T): T {
  const handler: ProxyHandler<any> = {
    construct(target, args) {
      const a = args.slice()
      a[0] = fixLocale(a[0])
      return new (target as any)(...a)
    },
    apply(target, thisArg, args) {
      const a = args.slice()
      a[0] = fixLocale(a[0])
      return (target as any).apply(thisArg, a)
    },
  }
  return new Proxy(Orig, handler) as unknown as T
}

if (typeof window !== "undefined" && !(window as any).__intlGuardInstalled) {
  ;(window as any).__intlGuardInstalled = true
  try {
    // Always normalize: third-party libs (reaviz/d3) pass navigator.language
    // explicitly, which can be an invalid tag like "en-US@posix".
    // Patch Intl constructors (Proxy preserves statics, prototype, instanceof).
    Intl.DateTimeFormat = wrapIntlCtor(Intl.DateTimeFormat)
    Intl.NumberFormat = wrapIntlCtor(Intl.NumberFormat)
    if ((Intl as any).RelativeTimeFormat) {
      ;(Intl as any).RelativeTimeFormat = wrapIntlCtor((Intl as any).RelativeTimeFormat)
    }

    // Patch bare prototype methods that use the default locale internally.
    const dDate = Date.prototype.toLocaleDateString
    Date.prototype.toLocaleDateString = function (l?: any, o?: any) {
      return dDate.call(this, fixLocale(l), o)
    }
    const dTime = Date.prototype.toLocaleTimeString
    Date.prototype.toLocaleTimeString = function (l?: any, o?: any) {
      return dTime.call(this, fixLocale(l), o)
    }
    const dStr = Date.prototype.toLocaleString
    Date.prototype.toLocaleString = function (l?: any, o?: any) {
      return dStr.call(this, fixLocale(l), o)
    }
    const nStr = Number.prototype.toLocaleString
    Number.prototype.toLocaleString = function (l?: any, o?: any) {
      return nStr.call(this, fixLocale(l), o)
    }
  } catch {
    /* never block rendering on the guard */
  }
}

export {}
