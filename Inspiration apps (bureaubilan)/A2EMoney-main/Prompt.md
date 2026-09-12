# A2E Suite — Multi-App Shared Convex Backend

## Overview

You are building a new frontend app for the **A2E Suite**, a collection of interconnected web applications that share a single Convex backend deployment. Every app in the suite connects to the SAME Convex database. Auth, workspaces, projects, and tasks are shared. Each app has its own prefixed data tables.

## Critical Architecture Rules

1. **ONE SHARED CONVEX DEPLOYMENT.** This app must connect to the exact same Convex backend as all other suite apps.
2. **NO CUSTOM AUTH.** Do NOT build your own users, sessions, passwords, or JWT system. Auth is handled entirely by `convex-auth` in the shared backend. Use `useAuthActions` and `useConvexAuth` from `@convex-dev/auth/react`.
3. **NO PRISMA / NO POSTGRESQL / NO CUSTOM API ROUTES.** Do not install Prisma. Do not create `app/api/*` route handlers. Do not use PostgreSQL. All data operations go through Convex queries and mutations called directly from React components via `useQuery` / `useMutation`.
4. **SHARED TABLES ARE READ-ONLY FOR SCHEMA DEFINITION.** The following tables already exist in the shared backend. You may QUERY them but MUST NOT redefine them in schema:
   - `users` (managed by convex-auth)
   - [workspaces](cci:9://file:///Users/maxx.abrt/Dev/A2EMoney/app/api/workspaces:0:0-0:0)
   - `memberships`
   - `invitations`
   - [projects](cci:9://file:///Users/maxx.abrt/Dev/A2EMoney/app/api/projects:0:0-0:0)
   - `tasks`
   - `activities`
5. **APP TABLE PREFIXING — NON-NEGOTIABLE.** Every table that belongs to THIS app only must be prefixed with the app's slug + underscore. Example: if the app slug is `crm`, tables must be named `crm_contacts`, `crm_deals`, `crm_campaigns`. NEVER create tables without the prefix. NEVER touch tables belonging to other apps (e.g., `a2e_` tables).
6. **WORKSPACE ISOLATION.** Every query and mutation MUST include a `workspaceId` parameter and MUST verify the current user is a member of that workspace via the `memberships` table. No query may ever return data from multiple workspaces.
7. **SHARED REAL-TIME.** All apps see live updates from the same Convex backend. A project updated in App A is visible instantly in App B if both are connected.

## Existing Apps in the Suite (DO NOT TOUCH THEIR TABLES)

| App | Slug | Existing Prefixed Tables |
|-----|------|--------------------------|
| **A2EMoney** | `a2e` | `a2e_invoices`, `a2e_expenses`, `a2e_documents`, `a2e_bookSheets`, `a2e_bookEntries`, `a2e_budgets`, `a2e_projects` |

## Shared Backend Configuration

### Convex Deployment
CONVEX_URL=https://academic-stoat-784.eu-west-1.convex.cloud NEXT_PUBLIC_CONVEX_URL=https://academic-stoat-784.eu-west-1.convex.cloud




### Auth Providers (convex-auth)
AUTH_GOOGLE_ID=51222325755-REDACTED.apps.googleusercontent.com AUTH_GOOGLE_SECRET=GOCSPX-REDACTED AUTH_RESEND_KEY=re_REDACTED




### Deploy Key (for CI/CD)
prod:academic-stoat-784|REDACTED_CONVEX_DEPLOY_KEY




## Shared Schema (Already Defined — Do Not Redefine)

These tables exist in the shared Convex backend. Your app can read/write shared tables according to permissions, but must only ADD new prefixed tables.

```typescript
// ================================================================
// AUTH TABLES (managed by convex-auth — DO NOT DEFINE)
// ================================================================
// users, sessions, accounts, verificationCodes — handled by convex-auth

// ================================================================
// SHARED TABLES (used by ALL apps)
// ================================================================

workspaces: {
  _id: Id<<"workspaces">,
  name: string,
  slug: string,
  description?: string,
  avatar?: string,
  storageQuota: number,      // bytes, default 104857600 (100MB)
  ownerId: Id<<"users">,      // convex-auth user id
  createdAt: number,         // epoch ms
  updatedAt: number,
}
// indexes: by_slug, by_owner

memberships: {
  _id: Id<<"memberships">,
  userId: Id<<"users">,
  workspaceId: Id<<"workspaces">,
  role: "owner" | "admin" | "member" | "viewer",
  joinedAt: number,            // epoch ms
}
// indexes: by_user, by_workspace, by_user_workspace

invitations: {
  _id: Id<<"invitations">,
  email: string,
  workspaceId: Id<<"workspaces">,
  role: "owner" | "admin" | "member" | "viewer",
  token: string,
  status: "pending" | "accepted" | "revoked" | "expired",
  invitedBy: Id<<"users">,
  expiresAt: number,
  createdAt: number,
}
// indexes: by_workspace, by_email, by_token

projects: {
  _id: Id<<"projects">,
  workspaceId: Id<<"workspaces">,
  name: string,
  client: string,
  status: "planning" | "active" | "completed" | "on_hold",
  budget?: number,
  spent?: number,
  startDate?: number,          // epoch ms
  endDate?: number,
  description?: string,
  createdBy: Id<<"users">,
  createdAt: number,
  updatedAt: number,
}
// indexes: by_workspace, by_status

tasks: {
  _id: Id<<"tasks">,
  workspaceId: Id<<"workspaces">,
  projectId?: Id<<"projects">,
  title: string,
  description?: string,
  status: "todo" | "in_progress" | "done",
  assigneeId?: Id<<"users">,
  dueDate?: number,
  createdBy: Id<<"users">,
  createdAt: number,
  updatedAt: number,
}
// indexes: by_workspace, by_project, by_assignee

activities: {
  _id: Id<<"activities">,
  workspaceId: Id<<"workspaces">,
  actorId: Id<<"users">,
  action: string,              // e.g. "invoice.created", "task.completed"
  targetType: string,          // e.g. "invoice", "task"
  targetId: string,            // the prefixed table id, e.g. "a2e_invoice_xyz"
  metadata?: any,
  createdAt: number,
}
// indexes: by_workspace, by_actor, by_target
A2EMoney Existing Tables (Reference Only — Do Not Modify)
These exist for the financial app. Your new app must use DIFFERENT prefixes.



typescript
a2e_invoices, a2e_expenses, a2e_documents,
a2e_bookSheets, a2e_bookEntries, a2e_budgets,
a2e_projects
Environment Variables
Create .env.local in the app root:



bash
# Convex (same for ALL apps in the suite)
NEXT_PUBLIC_CONVEX_URL=https://academic-stoat-784.eu-west-1.convex.cloud

# Auth (same for ALL apps)
AUTH_GOOGLE_ID=51222325755-REDACTED.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-REDACTED
AUTH_RESEND_KEY=re_REDACTED
Required Dependencies
Install ONLY these. Do NOT install Prisma, @prisma/client, pg, @neondatabase/serverless, or any custom auth library.



bash
npm install next react react-dom convex @convex-dev/auth
npm install tailwindcss @tailwindcss/postcss postcss clsx tailwind-merge class-variance-authority
npm install lucide-react date-fns
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast
File Structure for Every New App


app/
├── layout.tsx           # Wrap with ConvexProvider + ConvexAuthProvider
├── providers.tsx        # Client providers (see pattern below)
├── (dashboard)/
│   ├── layout.tsx       # Workspace selector, sidebar, auth gate
│   └── page.tsx         # App-specific dashboard
├── auth/
│   └── page.tsx         # Sign in with Google + magic links
├── page.tsx             # Landing or redirect to dashboard
convex/
├── schema.ts            # ADD only your prefixed tables to existing schema
├── auth.ts              # convex-auth configuration (same as below)
├── lib/
│   ├── withAuth.ts      # Workspace isolation helpers
│   └── rbac.ts          # Role-based access control helpers
├── YOURSLUG_feature1.ts # Your app queries & mutations
├── YOURSLUG_feature2.ts
Convex Auth Configuration
convex/auth.ts


typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Resend } from "@convex-dev/auth/providers/Resend";
import { Google } from "@convex-dev/auth/providers/Google";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY!,
      from: "A2E Suite <auth@yourdomain.com>",
    }),
  ],
});
Workspace Isolation Pattern
Every Convex function MUST follow this pattern. No exceptions.



typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listMyItems = query({
  args: {
    workspaceId: v.id("workspaces"),
    // ... other args
  },
  handler: async (ctx, args) => {
    // 1. Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // 2. Verify workspace membership
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", identity.subject).eq("workspaceId", args.workspaceId)
      )
      .unique();

    if (!membership) throw new Error("Forbidden: not a workspace member");

    // 3. Query ONLY this workspace's data
    return ctx.db
      .query("YOURSLUG_items")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const createMyItem = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    // ... other args
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify membership (admin or member can create)
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_workspace", (q) =>
        q.eq("userId", identity.subject).eq("workspaceId", args.workspaceId)
      )
      .unique();

    if (!membership) throw new Error("Forbidden");

    // Insert with workspace isolation
    return ctx.db.insert("YOURSLUG_items", {
      workspaceId: args.workspaceId,
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // ... other fields
    });
  },
});
Role-Based Access Control Helpers
Create convex/lib/rbac.ts:



typescript
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function assertWorkspaceMember(
  ctx: QueryCtx | MutationCtx,
  workspaceId: string,
  userId: string
): Promise<{ role: "owner" | "admin" | "member" | "viewer" }> {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_workspace", (q) =>
      q.eq("userId", userId as any).eq("workspaceId", workspaceId as any)
    )
    .unique();

  if (!membership) {
    throw new Error("Forbidden: you are not a member of this workspace");
  }

  return { role: membership.role };
}

export async function assertWorkspaceAdmin(
  ctx: QueryCtx | MutationCtx,
  workspaceId: string,
  userId: string
): Promise<void> {
  const { role } = await assertWorkspaceMember(ctx, workspaceId, userId);
  if (role !== "owner" && role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
}
Frontend Provider Pattern
app/providers.tsx


tsx
"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ConvexAuthProvider>{children}</ConvexAuthProvider>
    </ConvexProvider>
  );
}
Auth UI Pattern


tsx
import { useAuthActions } from "@convex-dev/auth/react";

export function SignIn() {
  const { signIn } = useAuthActions();

  return (
    <div className="space-y-4">
      <button onClick={() => signIn("google")}>
        Sign in with Google
      </button>
      <MagicLinkForm />
    </div>
  );
}

function MagicLinkForm() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn("resend", { email, redirectTo: "/" });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
      />
      <button type="submit">Send Magic Link</button>
    </form>
  );
}
Workspace-Aware Data Fetching


tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function InvoiceList({ workspaceId }: { workspaceId: string }) {
  // This fetches from the shared Convex backend, scoped to the selected workspace
  const invoices = useQuery(api.a2e_invoices.list, { workspaceId });

  if (invoices === undefined) return <div>Loading...</div>;

  return (
    <ul>
      {invoices.map((inv) => (
        <li key={inv._id}>{inv.number} — {inv.client}</li>
      ))}
    </ul>
  );
}
Schema Rules for New Tables
When defining your app's tables in convex/schema.ts, you ADD to the existing schema. You do NOT replace it.



typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// This schema EXTENDS the existing shared schema.
// Only ADD your app's prefixed tables below.

export default defineSchema({
  // ========================================
  // SHARED TABLES (already exist — DO NOT REDEFINE)
  // ========================================
  // workspaces, memberships, invitations, projects, tasks, activities

  // ========================================
  // YOUR APP'S TABLES (prefix with YOUR_SLUG_)
  // ========================================
  // Example for a CRM app with slug "crm":
  //
  // crm_contacts: defineTable({ ... }).index("by_workspace", ["workspaceId"]),
  // crm_deals: defineTable({ ... }).index("by_workspace", ["workspaceId"]),
  // crm_campaigns: defineTable({ ... }).index("by_workspace", ["workspaceId"]),
});
Required Fields on Every App Table
Every table you create MUST include:

workspaceId: v.id("workspaces") — for isolation
createdBy: v.id("users") — for audit
createdAt: v.number() — epoch ms
updatedAt: v.number() — epoch ms
Every table MUST have an index: by_workspace: ["workspaceId"]

App Identity (Fill This In Before Prompting)
Replace the bracketed sections below and include them at the TOP of your prompt to the AI:



## NEW APP IDENTITY

- **App Name:** [e.g. "A2E CRM"]
- **App Slug:** [e.g. "crm"] — becomes table prefix
- **App Description:** [1-2 sentences describing what this app does]
- **Shared tables this app uses:** [e.g. workspaces, projects, tasks]
- **New tables to create:** [List with fields, e.g.]
  - `crm_contacts`: workspaceId, name, email, company, phone, status, notes, tags, createdBy, createdAt, updatedAt
  - `crm_deals`: workspaceId, contactId, title, value, stage, probability, expectedCloseDate, createdBy, createdAt, updatedAt
- **Features:** [e.g. contact management, deal pipeline, email integration]
- **Pages/Routes:** [e.g. dashboard, contacts, deals, pipeline, settings]

## DESIGN SYSTEM

- Use Tailwind CSS v4 with the following base:
  - Background: `bg-background`
  - Card: `bg-card rounded-xl border border-border`
  - Primary button: `bg-primary text-primary-foreground`
  - Use `lucide-react` for icons
  - Use `date-fns` for date formatting
- Use shadcn/ui patterns: Dialog, Dropdown, Table, Tabs, Toast, etc.
- Use `@radix-ui` primitives for custom components.
- The app should have a sidebar navigation with a workspace switcher at the top.
Critical Reminders for the AI
❌ Do NOT create API routes in app/api/. Convex replaces your entire backend.
❌ Do NOT install Prisma, PostgreSQL drivers, or any database ORM.
❌ Do NOT create your own auth system. Use convex-auth only.
❌ Do NOT create tables without the app slug prefix.
❌ Do NOT touch a2e_* tables or any other app's tables.
✅ Every query MUST verify workspace membership via memberships table.
✅ Every table MUST have workspaceId and by_workspace index.
✅ Use useQuery and useMutation from convex/react for all data.
✅ Use useConvexAuth for auth state.
✅ Use useAuthActions for sign in / sign out / magic links.
✅ Activities should be logged to the shared activities table when user performs actions.
✅ The app must have a workspace selector in the layout sidebar.
