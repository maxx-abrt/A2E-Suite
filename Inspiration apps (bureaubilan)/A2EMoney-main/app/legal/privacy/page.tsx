import { Wallet } from "@/components/iconsax"
import Link from "next/link"

export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p><em>Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</em></p>
        <h2>1. Data we collect</h2>
        <p>Bilan collects only the data you explicitly provide: your name, email, workspace information, and financial records you input (invoices, expenses, documents, etc.). We do not collect tracking cookies or sell your data to third parties.</p>
        <h2>2. Storage</h2>
        <p>All data is stored on the A2E shared Convex backend (EU - Paris region). Document uploads are stored on AWS S3 (Paris). All data in transit is encrypted via TLS.</p>
        <h2>3. Workspace isolation</h2>
        <p>Every read and write is scoped to a workspace you are a member of. Cross-workspace access is enforced server-side and cannot be bypassed.</p>
        <h2>4. Data retention</h2>
        <p>You can delete your workspace and all related data at any time. Deletion is permanent.</p>
        <h2>5. Your GDPR rights</h2>
        <p>You may request access, rectification, or deletion of your data. Workspace owners can export all workspace data as JSON from the Settings page.</p>
        <h2>6. Contact</h2>
        <p>For any privacy-related question, contact us at <code>privacy@a2e.example</code>.</p>
      </main>
    </div>
  )
}
