import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { withAuth } from "@workos-inc/authkit-nextjs"
import "./globals.css"
import { Providers, type InitialAuth } from "@/components/providers"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Bilan — La gestion financière et les CERFA, enfin simples",
  description:
    "Bilan, l'app finances de la suite A2E : trésorerie, budget à l'équilibre, feuilles intelligentes, factures, projets et documents légaux (CERFA) — clairs, conformes et exportables en PDF.",
  generator: "A2E Suite",
  keywords: [
    "association",
    "CERFA",
    "reçu de dons",
    "compte-rendu financier",
    "budget",
    "trésorerie",
    "factures",
    "comptabilité association",
    "bilan",
    "a2e suite",
  ],
  authors: [{ name: "A2E Suite" }],
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1b21" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  // Resolve auth on the server and hand it to AuthKitProvider so the client
  // doesn't need to fire a server action on first paint.
  let initialAuth: InitialAuth | undefined
  try {
    const { accessToken, ...auth } = await withAuth()
    initialAuth = auth as InitialAuth
  } catch {
    // If middleware hasn't run or the session is unreadable, let the client
    // resolve auth itself. The error is surfaced in Vercel logs via middleware debug.
  }

  return (
    <html
      lang={locale}
      className={`${jakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <Providers initialAuth={initialAuth}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
