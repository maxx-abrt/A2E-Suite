import { Wallet } from "@/components/iconsax"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background"><Wallet className="h-4 w-4" /></div>
            <span className="font-semibold">Bilan</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
        <h1>Terms of Service</h1>
        <p><em>Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</em></p>
        <h2>1. Service</h2>
        <p>Bilan is a money-management service designed for individuals, businesses and non-profit associations. It is part of the A2E Suite and shares its authentication and team layer with other A2E apps.</p>
        <h2>2. Accounts</h2>
        <p>You are responsible for the security of your account credentials. Sign-in is provided through Google OAuth or a single-use email code (magic link).</p>
        <h2>3. Acceptable use</h2>
        <p>You may not use the service to commit fraud, money laundering, or any activity that violates applicable law. We may suspend or terminate accounts at our discretion if these terms are breached.</p>
        <h2>4. Data ownership</h2>
        <p>You retain ownership of all data you input. We act as a processor under your control.</p>
        <h2>5. Liability</h2>
        <p>The service is provided "as is". To the maximum extent permitted by law, our liability is limited to the amount paid for the service in the 12 months preceding any claim.</p>
        <h2>6. Changes</h2>
        <p>We may update these terms occasionally. Significant changes will be announced in-app.</p>
      </main>
    </div>
  )
}
