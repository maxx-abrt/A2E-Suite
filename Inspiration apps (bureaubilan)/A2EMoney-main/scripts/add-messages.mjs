#!/usr/bin/env node
/**
 * Merges the new Bilan message keys (subventions + auto-journal) into
 * messages/fr.json and messages/en.json without touching anything else.
 * Idempotent: re-running it only fills what is missing.
 */
import fs from "node:fs"

const additions = {
  fr: {
    nav: { subventions: "Subventions" },
    pages: {
      book: {
        autoBadge: "Auto",
        autoLocked: "Journal automatique — non supprimable",
        autoDescription:
          "Alimenté automatiquement par vos recettes et dépenses · {proofs} justificatif(s) liés",
      },
      subventions: {
        title: "Subventions",
        description:
          "Toutes les aides publiques françaises au même endroit — mises à jour chaque jour — et un assistant qui trouve celles qui correspondent vraiment à votre projet.",
        refresh: "Actualiser",
        save: "Suivre",
        saved: "Suivi",
        stats: {
          total: "{count} aides référencées",
          updated: "Mis à jour {when}",
        },
        toasts: {
          saved: "Ajoutée à votre suivi",
          refreshing: "Actualisation du catalogue lancée",
          converted: "Recette créée et inscrite au journal",
        },
        ai: {
          title: "Décrivez votre projet",
          subtitle:
            "L'assistant lit votre description, cible les aides compatibles et explique pourquoi. Chaque recherche est mise en cache : la relancer ne coûte rien.",
          placeholder:
            "Ex. : Notre association ouvre un tiers-lieu à Lyon pour l'insertion numérique des 16-25 ans. 3 salariés, budget 120 000 €, besoin de financer un poste et l'équipement informatique.",
          cta: "Trouver mes aides",
          running: "Analyse en cours…",
          fit: "de correspondance",
          resultCount: "{count} aide(s) pertinente(s)",
          scanned: "{count} aides analysées",
          cached: "Résultat en cache",
          history: "Recherches précédentes",
          tooShort: "Décrivez votre projet en quelques phrases (20 caractères minimum).",
          noMatch:
            "Aucune aide suffisamment pertinente. Précisez votre territoire, votre public et votre besoin.",
          failed: "L'analyse a échoué. Réessayez dans un instant.",
          notConfigured:
            "Assistant IA non configuré sur ce déploiement (clé Gemini manquante). Le catalogue reste consultable.",
          examples: {
            assoJeunes:
              "Association d'éducation populaire en Seine-Saint-Denis, accompagnement scolaire de 80 collégiens, besoin de financer un poste de coordinateur.",
            tiersLieu:
              "Tiers-lieu rural en Occitanie : coworking, réparation de vélos et ateliers numériques, besoin d'investir dans l'aménagement du local.",
            startup:
              "Startup de 4 personnes développant un logiciel de mesure de l'empreinte carbone, phase de R&D, recherche subventions et crédits d'impôt.",
          },
        },
        track: {
          title: "Mon suivi de dossiers",
          count: "{count} dossier(s)",
          noProject: "Sans projet",
          markGranted: "Marquer obtenue",
          booked: "au journal",
          deadline: "Dépôt avant le {when}",
          removedSource: "Aide retirée du catalogue",
          amountRequired: "Indiquez le montant obtenu.",
          grantTitle: "Subvention obtenue",
          grantHelp:
            "Le montant est enregistré comme recette et apparaît immédiatement dans le journal automatique, avec le financeur en référence.",
          grantAmount: "Montant obtenu ({currency})",
          grantConfirm: "Enregistrer la recette",
          status: {
            shortlisted: "Repérée",
            preparing: "En préparation",
            submitted: "Déposée",
            granted: "Obtenue",
            rejected: "Refusée",
            abandoned: "Abandonnée",
          },
        },
        catalogue: {
          title: "Catalogue des aides",
          searchPlaceholder: "Rechercher une aide, un financeur, un thème…",
          filters: "Filtres",
          all: "Toutes",
          audience: "Bénéficiaire",
          scale: "Échelle",
          aidType: "Type d'aide",
          openOnly: "Candidatures ouvertes uniquement",
          callsOnly: "Appels à projets uniquement",
          callBadge: "Appel à projets",
          open: "Ouvrir",
          loadMore: "Voir plus d'aides",
          sourcesLabel: "Sources :",
          empty: {
            title: "Aucune aide ne correspond",
            description:
              "Élargissez vos filtres, ou lancez l'assistant IA avec une description de votre projet.",
          },
        },
      },
    },
  },
  en: {
    nav: { subventions: "Grants" },
    pages: {
      book: {
        autoBadge: "Auto",
        autoLocked: "Automatic journal — cannot be deleted",
        autoDescription:
          "Filled automatically from your income and expenses · {proofs} linked proof(s)",
      },
      subventions: {
        title: "Grants",
        description:
          "Every French public funding scheme in one place — refreshed daily — plus an assistant that finds the ones that actually fit your project.",
        refresh: "Refresh",
        save: "Track",
        saved: "Tracked",
        stats: { total: "{count} schemes indexed", updated: "Updated {when}" },
        toasts: {
          saved: "Added to your pipeline",
          refreshing: "Catalogue refresh started",
          converted: "Income created and posted to the journal",
        },
        ai: {
          title: "Describe your project",
          subtitle:
            "The assistant reads your description, targets compatible schemes and explains why. Every search is cached — re-running one is free.",
          placeholder:
            "E.g. Our non-profit is opening a community workspace in Lyon for digital inclusion of 16-25 year olds. 3 staff, €120,000 budget, we need to fund a role and IT equipment.",
          cta: "Find my grants",
          running: "Analysing…",
          fit: "fit",
          resultCount: "{count} relevant scheme(s)",
          scanned: "{count} schemes analysed",
          cached: "Cached result",
          history: "Previous searches",
          tooShort: "Describe your project in a few sentences (20 characters minimum).",
          noMatch: "No sufficiently relevant scheme. Add your territory, audience and need.",
          failed: "The analysis failed. Please try again shortly.",
          notConfigured:
            "AI assistant not configured on this deployment (missing Gemini key). The catalogue is still browsable.",
          examples: {
            assoJeunes:
              "Community education non-profit in Seine-Saint-Denis, tutoring 80 secondary pupils, needs to fund a coordinator role.",
            tiersLieu:
              "Rural community hub in Occitanie: coworking, bike repair and digital workshops, needs to invest in fitting out the premises.",
            startup:
              "4-person startup building carbon-footprint measurement software, R&D stage, looking for grants and tax credits.",
          },
        },
        track: {
          title: "My applications",
          count: "{count} application(s)",
          noProject: "No project",
          markGranted: "Mark as granted",
          booked: "in journal",
          deadline: "Apply before {when}",
          removedSource: "Scheme removed from catalogue",
          amountRequired: "Enter the granted amount.",
          grantTitle: "Grant awarded",
          grantHelp:
            "The amount is recorded as income and appears immediately in the automatic journal, with the funder as reference.",
          grantAmount: "Granted amount ({currency})",
          grantConfirm: "Record the income",
          status: {
            shortlisted: "Shortlisted",
            preparing: "Preparing",
            submitted: "Submitted",
            granted: "Granted",
            rejected: "Rejected",
            abandoned: "Abandoned",
          },
        },
        catalogue: {
          title: "Grant catalogue",
          searchPlaceholder: "Search a scheme, a funder, a theme…",
          filters: "Filters",
          all: "All",
          audience: "Beneficiary",
          scale: "Scale",
          aidType: "Aid type",
          openOnly: "Open applications only",
          callsOnly: "Calls for projects only",
          callBadge: "Call for projects",
          open: "Open",
          loadMore: "Show more schemes",
          sourcesLabel: "Sources:",
          empty: {
            title: "No scheme matches",
            description: "Widen your filters, or run the AI assistant with a project description.",
          },
        },
      },
    },
  },
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") target[key] = {}
      deepMerge(target[key], value)
    } else if (target[key] === undefined) {
      target[key] = value
    }
  }
  return target
}

for (const locale of ["fr", "en"]) {
  const path = `messages/${locale}.json`
  const json = JSON.parse(fs.readFileSync(path, "utf8"))
  deepMerge(json, additions[locale])
  fs.writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`)
  console.log(`✓ ${path}`)
}
