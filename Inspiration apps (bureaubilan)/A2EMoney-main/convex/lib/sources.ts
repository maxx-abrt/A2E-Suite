/**
 * BILAN — subvention source adapters.
 *
 * Everything here is FREE, public and refreshable daily:
 *
 *  1. `aides-territoires` — the French state's own aid aggregator
 *     (aides-territoires.beta.gouv.fr, DGALN / beta.gouv.fr). ~3 000 live aids,
 *     including calls for projects, with eligibility, audiences, perimeter,
 *     deadlines and funding rates. Auth: a permanent `X-AUTH-TOKEN` is exchanged
 *     for a 24 h Bearer.
 *
 *  2. `curated` — the national schemes every association / small structure
 *     actually asks about, with their official application URL. They are stable
 *     programmes (FDVA, FONJEP, ANS, CROUS, ADEME, Bpifrance, CIR/CII, FSE+…)
 *     that either have no machine-readable feed or live behind a portal; keeping
 *     them as an explicit, versioned list beats scraping and never goes stale
 *     silently.
 *
 * Both are normalised into ONE shape (`NormalisedAid`) before storage, so the
 * catalogue, the filters and the AI ranker only ever see one vocabulary.
 */

export interface NormalisedAid {
  source: string
  sourceId: string
  slug?: string
  title: string
  shortTitle?: string
  description?: string
  eligibility?: string
  financers: string[]
  instructors?: string[]
  programs?: string[]
  audiences: string[]
  aidTypes: string[]
  categories: string[]
  perimeter?: string
  perimeterScale?: string
  region?: string
  isCallForProject?: boolean
  startDate?: number
  submissionDeadline?: number
  predepositDate?: number
  rateMin?: number
  rateMax?: number
  amountHint?: string
  url: string
  applicationUrl?: string
  contact?: string
  recurrence?: string
  european?: boolean
  isLive: boolean
}

const AT_BASE = "https://aides-territoires.beta.gouv.fr/api"

/** Exchanges the permanent API key for a 24 h Bearer token. */
export async function aidesTerritoiresToken(): Promise<string> {
  const key = process.env.AIDES_TERRITOIRES_KEY
  if (!key) throw new Error("AIDES_TERRITOIRES_KEY is not set on this deployment")
  const response = await fetch(`${AT_BASE}/connexion/`, {
    method: "POST",
    headers: { "X-AUTH-TOKEN": key, "Content-Type": "application/json" },
    body: "{}",
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body?.token) {
    throw new Error(`aides-territoires auth failed (${response.status})`)
  }
  return body.token as string
}

/** Maps Aides-territoires audience labels onto Bilan's normalised vocabulary. */
function normaliseAudiences(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map((r) => String(r).toLowerCase()) : []
  const out = new Set<string>()
  for (const item of list) {
    if (item.includes("association")) out.add("association")
    else if (
      item.includes("entreprise") ||
      item.includes("pme") ||
      item.includes("tpe") ||
      item.includes("commerçant") ||
      item.includes("artisan")
    )
      out.add("entreprise")
    else if (
      item.includes("commune") ||
      item.includes("epci") ||
      item.includes("collectivit") ||
      item.includes("intercommunalit") ||
      item.includes("syndicat") ||
      item.includes("département") ||
      item.includes("departement") ||
      item.includes("région") ||
      item.includes("region")
    )
      out.add("collectivite")
    else if (item.includes("public")) out.add("etablissement-public")
    else if (item.includes("particulier") || item.includes("habitant")) out.add("particulier")
    else if (item.includes("agricult") || item.includes("exploitant")) out.add("agriculteur")
    else if (item.includes("recherche") || item.includes("universit") || item.includes("enseignement"))
      out.add("recherche")
    // Anything outside the fixed vocabulary is intentionally dropped: filters
    // must stay a short, readable, translatable list.
  }
  return Array.from(out)
}

function ts(value: unknown): number | undefined {
  if (!value || typeof value !== "string") return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean) : []
}

/** One page of `/api/aids/`, already normalised. */
export async function fetchAidesPage(
  bearer: string,
  page: number,
): Promise<{ items: NormalisedAid[]; hasNext: boolean; total: number }> {
  const response = await fetch(`${AT_BASE}/aids/?page=${page}&itemsPerPage=100`, {
    headers: { Authorization: `Bearer ${bearer}` },
  })
  if (!response.ok) throw new Error(`aides-territoires page ${page} → ${response.status}`)
  const body = await response.json()
  const results: any[] = body.results ?? body["hydra:member"] ?? []
  const items = results.map((aid) => {
    const url = aid.url
      ? `https://aides-territoires.beta.gouv.fr${aid.url}`
      : `https://aides-territoires.beta.gouv.fr/aides/${aid.slug ?? ""}`
    return {
      source: "aides-territoires",
      sourceId: String(aid.id),
      slug: aid.slug ?? undefined,
      title: String(aid.name ?? "").trim(),
      shortTitle: aid.short_title || undefined,
      description: stripHtml(aid.description),
      eligibility: stripHtml(aid.eligibility),
      financers: strings(aid.financers),
      instructors: strings(aid.instructors),
      programs: strings(aid.programs),
      audiences: normaliseAudiences(aid.targeted_audiences),
      aidTypes: strings(aid.aid_types).map((t) => t.toLowerCase()),
      categories: strings(aid.categories).map((c) => c.split("/").pop()!.trim()).filter(Boolean),
      perimeter: aid.perimeter || undefined,
      perimeterScale: (aid.perimeter_scale || undefined)?.toLowerCase(),
      region: aid.region || undefined,
      isCallForProject: Boolean(aid.is_call_for_project),
      startDate: ts(aid.start_date),
      submissionDeadline: ts(aid.submission_deadline),
      predepositDate: ts(aid.predeposit_date),
      rateMin: typeof aid.subvention_rate_lower_bound === "number" ? aid.subvention_rate_lower_bound : undefined,
      rateMax: typeof aid.subvention_rate_upper_bound === "number" ? aid.subvention_rate_upper_bound : undefined,
      amountHint: [aid.subvention_comment, aid.loan_amount, aid.recoverable_advance_amount]
        .map((value) => (value === null || value === undefined || value === "" ? "" : String(value)))
        .filter(Boolean)
        .join(" · ") || undefined,
      url,
      applicationUrl: aid.application_url || aid.origin_url || undefined,
      contact: stripHtml(aid.contact)?.slice(0, 500),
      recurrence: aid.recurrence || undefined,
      european: Boolean(aid.european_aid),
      isLive: aid.is_live !== false,
    } satisfies NormalisedAid
  })
  return {
    items: items.filter((i) => i.title.length > 2),
    hasNext: Boolean(body.next),
    total: Number(body.count ?? items.length),
  }
}

function stripHtml(value: unknown): string | undefined {
  if (!value || typeof value !== "string") return undefined
  const text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<li>/gi, "\u2022 ")
    .replace(/<[^>]+>/g, "")
    // Numeric entities first (&#039; &#x27; …), then the named ones.
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&(euro|eacute|egrave|agrave|ccedil);/g, (_, name) =>
      ({ euro: "€", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç" })[name as string] ?? "",
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text.length ? text.slice(0, 4000) : undefined
}

/**
 * Hand-curated national schemes with their official application entry point.
 * Kept deliberately factual and short — the AI ranker reads these fields.
 */
export const CURATED_AIDS: NormalisedAid[] = [
  {
    source: "curated",
    sourceId: "fdva-2",
    title: "FDVA 2 — Fonctionnement et innovation (Fonds pour le développement de la vie associative)",
    description:
      "Soutien au fonctionnement global ou aux projets innovants des associations, quel que soit leur secteur. Instruit chaque année au niveau départemental/régional via Le Compte Asso. Montant courant : 1 000 – 15 000 €.",
    eligibility:
      "Association loi 1901 déclarée depuis au moins 1 an, avec un numéro RNA et SIRET, hors associations sportives affiliées à une fédération agréée (voir ANS).",
    financers: ["État — Ministère chargé de la Vie associative"],
    audiences: ["association"],
    aidTypes: ["subvention"],
    categories: ["Vie associative", "Fonctionnement"],
    perimeterScale: "national",
    url: "https://www.associations.gouv.fr/FDVA.html",
    applicationUrl: "https://lecompteasso.associations.gouv.fr/",
    recurrence: "annuelle",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "fonjep",
    title: "Poste FONJEP — Fonds de coopération de la jeunesse et de l'éducation populaire",
    description:
      "Cofinancement pluriannuel d'un poste salarié permanent (environ 7 000 €/an pendant 3 ans, renouvelable) dans une association d'éducation populaire, de jeunesse, de cohésion sociale ou d'insertion.",
    eligibility:
      "Association employeuse, projet associatif structuré, demande déposée auprès des services déconcentrés de l'État (DRAJES / DDETS).",
    financers: ["État", "FONJEP"],
    audiences: ["association"],
    aidTypes: ["subvention", "aide à l'emploi"],
    categories: ["Emploi", "Jeunesse", "Éducation populaire"],
    perimeterScale: "national",
    url: "https://www.fonjep.org/",
    applicationUrl: "https://lecompteasso.associations.gouv.fr/",
    recurrence: "annuelle",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "ans-psf",
    title: "Agence nationale du Sport — Projet Sportif Fédéral (PSF)",
    description:
      "Subventions de fonctionnement et de projet pour les clubs et comités affiliés, instruites par leur fédération (part territoriale). Inclut l'emploi sportif et l'Aisance aquatique.",
    eligibility: "Association sportive affiliée à une fédération agréée, à jour de ses obligations.",
    financers: ["Agence nationale du Sport"],
    audiences: ["association"],
    aidTypes: ["subvention"],
    categories: ["Sport"],
    perimeterScale: "national",
    url: "https://www.agencedusport.fr/",
    applicationUrl: "https://lecompteasso.associations.gouv.fr/",
    recurrence: "annuelle",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "crous-culture-actions",
    title: "CROUS — Culture-ActionS (projets étudiants)",
    description:
      "Financement de projets portés par des étudiants ou des associations étudiantes : culture, solidarité, sport, environnement, engagement citoyen. Jusqu'à quelques milliers d'euros par projet, plusieurs commissions par an.",
    eligibility: "Étudiant(e) inscrit(e) dans un établissement d'enseignement supérieur ou association étudiante.",
    financers: ["CNOUS / CROUS"],
    audiences: ["association", "particulier"],
    aidTypes: ["subvention"],
    categories: ["Culture", "Vie étudiante", "Engagement"],
    perimeterScale: "national",
    url: "https://www.etudiant.gouv.fr/fr/culture-actions-1370",
    applicationUrl: "https://www.messervices.etudiant.gouv.fr/",
    recurrence: "plusieurs commissions par an",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "fse-plus",
    title: "FSE+ — Fonds social européen plus",
    description:
      "Cofinancement européen (souvent 40 – 60 %) de projets d'insertion professionnelle, de formation, de lutte contre la pauvreté et d'inclusion. Appels à projets régionaux et nationaux via Ma Démarche FSE+.",
    eligibility:
      "Structure porteuse d'un projet d'inclusion / emploi / formation, capable d'avancer la trésorerie et de tenir une comptabilité analytique.",
    financers: ["Union européenne", "État"],
    audiences: ["association", "entreprise", "collectivite"],
    aidTypes: ["subvention"],
    categories: ["Emploi", "Insertion", "Formation"],
    perimeterScale: "europeen",
    european: true,
    isCallForProject: true,
    url: "https://www.fse.gouv.fr/",
    applicationUrl: "https://ma-demarche-fse.fr/",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "erasmus-plus-jeunesse",
    title: "Erasmus+ — Jeunesse et Sport",
    description:
      "Financement de mobilités, échanges de jeunes, partenariats de coopération et projets de participation des jeunes. Forfaits européens (frais de voyage + coûts organisationnels).",
    eligibility: "Association, collectivité ou organisme actif dans le champ de la jeunesse ou du sport.",
    financers: ["Union européenne", "Agence Erasmus+ France Jeunesse & Sport"],
    audiences: ["association", "collectivite"],
    aidTypes: ["subvention"],
    categories: ["Jeunesse", "Mobilité", "Sport"],
    perimeterScale: "europeen",
    european: true,
    isCallForProject: true,
    url: "https://www.erasmusplus-jeunesse.fr/",
    applicationUrl: "https://www.erasmusplus-jeunesse.fr/deposer-un-projet",
    recurrence: "3 à 4 dates limites par an",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "service-civique-agrement",
    title: "Service Civique — Agrément et prise en charge des volontaires",
    description:
      "L'État prend en charge l'indemnité du volontaire (environ 500 €/mois) et la protection sociale ; la structure verse une prestation complémentaire (environ 114 €/mois). Levier RH majeur pour une petite structure.",
    eligibility: "Association, collectivité ou établissement public agréé par l'Agence du Service Civique.",
    financers: ["Agence du Service Civique"],
    audiences: ["association", "collectivite"],
    aidTypes: ["aide à l'emploi"],
    categories: ["Emploi", "Jeunesse", "Engagement"],
    perimeterScale: "national",
    url: "https://www.service-civique.gouv.fr/",
    applicationUrl: "https://www.service-civique.gouv.fr/organismes",
    recurrence: "en continu",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "ademe-appels-projets",
    title: "ADEME — Aides à la transition écologique et appels à projets",
    description:
      "Diagnostics, études, investissements et animation sur l'énergie, les déchets, l'économie circulaire, la mobilité et l'alimentation durable. Taux d'aide fréquents : 30 – 70 % selon la nature et la taille de la structure.",
    eligibility: "Association, entreprise ou collectivité portant un projet de transition écologique.",
    financers: ["ADEME"],
    audiences: ["association", "entreprise", "collectivite"],
    aidTypes: ["subvention", "ingénierie"],
    categories: ["Environnement", "Énergie", "Économie circulaire"],
    perimeterScale: "national",
    isCallForProject: true,
    url: "https://agirpourlatransition.ademe.fr/entreprises/aides-financieres",
    applicationUrl: "https://agirpourlatransition.ademe.fr/entreprises/aides-financieres",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "bpifrance-aides",
    title: "Bpifrance — Subventions, avances récupérables et prêts d'amorçage",
    description:
      "Financement de l'innovation et de la croissance : Bourse French Tech, aide au développement deep tech, prêt d'amorçage, diagnostics. Cumulable avec le CIR.",
    eligibility: "PME ou startup immatriculée en France, projet d'innovation caractérisé.",
    financers: ["Bpifrance"],
    audiences: ["entreprise"],
    aidTypes: ["subvention", "avance récupérable", "prêt"],
    categories: ["Innovation", "Création d'entreprise"],
    perimeterScale: "national",
    url: "https://www.bpifrance.fr/catalogue-offres",
    applicationUrl: "https://mon.bpifrance.fr/",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "cir-cii",
    title: "CIR / CII — Crédit d'impôt recherche et innovation",
    description:
      "30 % des dépenses de R&D éligibles (CIR) et 20 % des dépenses de conception de prototypes/installations pilotes pour les PME (CII). Remboursable immédiatement pour les PME.",
    eligibility: "Entreprise soumise à l'IS ou à l'IR engageant des dépenses de R&D ou d'innovation en France.",
    financers: ["État — Direction générale des Finances publiques"],
    audiences: ["entreprise"],
    aidTypes: ["crédit d'impôt"],
    categories: ["Innovation", "Recherche", "Fiscalité"],
    perimeterScale: "national",
    url: "https://www.entreprises.gouv.fr/fr/innovation/credit-d-impot-recherche",
    applicationUrl: "https://www.impots.gouv.fr/",
    recurrence: "annuelle (avec la liasse fiscale)",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "jei",
    title: "JEI — Statut Jeune Entreprise Innovante",
    description:
      "Exonérations de cotisations patronales sur les personnels de R&D et allégements fiscaux locaux pour les entreprises de moins de 8 ans consacrant au moins 15 % de leurs charges à la R&D.",
    eligibility: "PME de moins de 8 ans, indépendante, avec au moins 15 % de dépenses de R&D.",
    financers: ["État", "URSSAF"],
    audiences: ["entreprise"],
    aidTypes: ["exonération"],
    categories: ["Innovation", "Création d'entreprise"],
    perimeterScale: "national",
    url: "https://entreprendre.service-public.fr/vosdroits/F31188",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "apprentissage-aide-embauche",
    title: "Aide unique à l'embauche d'un apprenti",
    description:
      "Aide de l'État versée mensuellement la première année du contrat d'apprentissage, pour les employeurs privés (associations incluses).",
    eligibility: "Employeur privé signant un contrat d'apprentissage éligible.",
    financers: ["État", "ASP"],
    audiences: ["association", "entreprise"],
    aidTypes: ["aide à l'emploi"],
    categories: ["Emploi", "Formation"],
    perimeterScale: "national",
    url: "https://www.alternance.emploi.gouv.fr/",
    applicationUrl: "https://sylae.asp-public.fr/",
    recurrence: "en continu",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "parcours-emploi-competences",
    title: "Parcours emploi compétences (PEC / CUI-CAE)",
    description:
      "Prise en charge d'une partie du salaire (souvent 30 – 60 %) pour l'embauche d'une personne éloignée de l'emploi, dans le secteur non marchand.",
    eligibility: "Association ou collectivité recrutant un public prescrit par France Travail / mission locale.",
    financers: ["État", "France Travail"],
    audiences: ["association", "collectivite"],
    aidTypes: ["aide à l'emploi"],
    categories: ["Emploi", "Insertion"],
    perimeterScale: "national",
    url: "https://www.francetravail.fr/employeur/aides-aux-recrutements/les-aides-a-lembauche/parcours-emploi-competences.html",
    recurrence: "en continu",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "fondation-de-france",
    title: "Fondation de France — Appels à projets",
    description:
      "Une vingtaine d'appels à projets annuels : santé, grande précarité, environnement, culture, éducation, recherche. Financements de 5 000 à 100 000 €.",
    eligibility: "Association d'intérêt général, fondation ou structure à but non lucratif.",
    financers: ["Fondation de France"],
    audiences: ["association"],
    aidTypes: ["subvention"],
    categories: ["Solidarité", "Santé", "Culture", "Environnement"],
    perimeterScale: "national",
    isCallForProject: true,
    url: "https://www.fondationdefrance.org/fr/trouver-une-subvention",
    applicationUrl: "https://www.fondationdefrance.org/fr/trouver-une-subvention",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "fondation-orange-numerique",
    title: "Fondation Orange — Numérique solidaire et éducation",
    description:
      "Soutien aux projets d'inclusion numérique, d'éducation et d'insertion des jeunes, en France et à l'international. Dotations et mécénat de compétences.",
    eligibility: "Association d'intérêt général, projet structuré et évaluable.",
    financers: ["Fondation Orange"],
    audiences: ["association"],
    aidTypes: ["subvention", "mécénat"],
    categories: ["Numérique", "Éducation", "Insertion"],
    perimeterScale: "national",
    url: "https://www.fondationorange.com/",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "caf-fonds-publics-territoires",
    title: "CAF — Fonds publics et territoires / Prestation de service",
    description:
      "Cofinancement des accueils de loisirs, actions parentalité, handicap, jeunesse et accès aux droits, sur la base d'un projet et d'un budget prévisionnel.",
    eligibility: "Association gestionnaire d'un équipement ou d'une action jeunesse / famille conventionnée.",
    financers: ["CNAF", "Caisses d'allocations familiales"],
    audiences: ["association", "collectivite"],
    aidTypes: ["subvention", "prestation de service"],
    categories: ["Famille", "Jeunesse", "Handicap"],
    perimeterScale: "departemental",
    url: "https://www.caf.fr/partenaires/caf-des-partenaires",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "anct-fonds-quartiers",
    title: "ANCT — Contrat de ville / Politique de la ville",
    description:
      "Crédits spécifiques pour les actions menées dans les quartiers prioritaires (QPV) : éducation, emploi, santé, lien social, citoyenneté.",
    eligibility: "Structure intervenant dans un quartier prioritaire de la politique de la ville.",
    financers: ["Agence nationale de la cohésion des territoires"],
    audiences: ["association", "collectivite"],
    aidTypes: ["subvention"],
    categories: ["Cohésion sociale", "Politique de la ville"],
    perimeterScale: "national",
    url: "https://agence-cohesion-territoires.gouv.fr/",
    applicationUrl: "https://lecompteasso.associations.gouv.fr/",
    recurrence: "annuelle",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "drac-aide-culture",
    title: "DRAC — Aides à la création et à la diffusion culturelle",
    description:
      "Aides déconcentrées du ministère de la Culture : création, résidences, éducation artistique et culturelle, patrimoine, livre et lecture.",
    eligibility: "Association, compagnie ou opérateur culturel implanté dans la région.",
    financers: ["Ministère de la Culture — DRAC"],
    audiences: ["association", "entreprise"],
    aidTypes: ["subvention"],
    categories: ["Culture", "Patrimoine", "Spectacle vivant"],
    perimeterScale: "regional",
    url: "https://www.culture.gouv.fr/Aides-demarches/Subventions",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "leader-feader",
    title: "LEADER (FEADER) — Développement local rural",
    description:
      "Cofinancement européen de projets de développement local portés en territoire rural, sélectionnés par le GAL (Groupe d'action locale) du territoire.",
    eligibility: "Porteur de projet situé sur un territoire couvert par un GAL LEADER.",
    financers: ["Union européenne", "Régions"],
    audiences: ["association", "entreprise", "collectivite"],
    aidTypes: ["subvention"],
    categories: ["Développement local", "Ruralité"],
    perimeterScale: "regional",
    european: true,
    url: "https://www.reseaurural.fr/leader",
    isLive: true,
  },
  {
    source: "curated",
    sourceId: "dispositif-local-accompagnement",
    title: "DLA — Dispositif local d'accompagnement",
    description:
      "Accompagnement gratuit (diagnostic + jours de conseil financés) pour consolider le modèle économique et l'emploi d'une structure de l'ESS.",
    eligibility: "Association employeuse, structure de l'ESS, en phase de consolidation ou de développement.",
    financers: ["État", "Banque des Territoires", "Avise"],
    audiences: ["association"],
    aidTypes: ["ingénierie"],
    categories: ["Accompagnement", "ESS"],
    perimeterScale: "departemental",
    url: "https://www.info-dla.fr/",
    recurrence: "en continu",
    isLive: true,
  },
]
