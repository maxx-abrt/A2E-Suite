/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _cryptoProbe from "../_cryptoProbe.js";
import type * as a2e_activity from "../a2e_activity.js";
import type * as a2e_attachments from "../a2e_attachments.js";
import type * as a2e_books from "../a2e_books.js";
import type * as a2e_budgets from "../a2e_budgets.js";
import type * as a2e_categories from "../a2e_categories.js";
import type * as a2e_expenses from "../a2e_expenses.js";
import type * as a2e_fiches from "../a2e_fiches.js";
import type * as a2e_grantReports from "../a2e_grantReports.js";
import type * as a2e_invoices from "../a2e_invoices.js";
import type * as a2e_org from "../a2e_org.js";
import type * as a2e_subventions from "../a2e_subventions.js";
import type * as coreSync from "../coreSync.js";
import type * as crons from "../crons.js";
import type * as directory from "../directory.js";
import type * as gdpr from "../gdpr.js";
import type * as http from "../http.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_defaultBook from "../lib/defaultBook.js";
import type * as lib_sources from "../lib/sources.js";
import type * as migrations from "../migrations.js";
import type * as projects from "../projects.js";
import type * as security from "../security.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _cryptoProbe: typeof _cryptoProbe;
  a2e_activity: typeof a2e_activity;
  a2e_attachments: typeof a2e_attachments;
  a2e_books: typeof a2e_books;
  a2e_budgets: typeof a2e_budgets;
  a2e_categories: typeof a2e_categories;
  a2e_expenses: typeof a2e_expenses;
  a2e_fiches: typeof a2e_fiches;
  a2e_grantReports: typeof a2e_grantReports;
  a2e_invoices: typeof a2e_invoices;
  a2e_org: typeof a2e_org;
  a2e_subventions: typeof a2e_subventions;
  coreSync: typeof coreSync;
  crons: typeof crons;
  directory: typeof directory;
  gdpr: typeof gdpr;
  http: typeof http;
  "lib/ai": typeof lib_ai;
  "lib/auth": typeof lib_auth;
  "lib/crypto": typeof lib_crypto;
  "lib/defaultBook": typeof lib_defaultBook;
  "lib/sources": typeof lib_sources;
  migrations: typeof migrations;
  projects: typeof projects;
  security: typeof security;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
