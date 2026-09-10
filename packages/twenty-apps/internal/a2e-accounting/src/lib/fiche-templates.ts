// FICHES — the eight official French documents Bilan can produce.
//
// A template is DATA: a key, a default title and a default payload whose shape
// the typed editor renders. Adding a template never touches the editor host, and
// a fiche created last year keeps rendering because its payload is stored as
// written. Legal references are quoted from the French sources (CGI art. 200 /
// 238 bis / 978, CERFA 12156, PCG classes 60-65 and 70-76).

export type FicheTemplateKey =
  | 'ASSO_FR'
  | 'BLANK'
  | 'RECU_DON'
  | 'BUDGET_EQUILIBRE'
  | 'DEMANDE_SUBVENTION'
  | 'CONVENTION_SUBVENTION'
  | 'RAPPORT_ACTIVITE'
  | 'ATTESTATION_HONNEUR';

export type FicheFieldKind =
  | 'text'
  | 'longText'
  | 'number'
  | 'money'
  | 'date'
  | 'boolean'
  | 'select'
  | 'checkboxes'
  | 'lineGrid'
  | 'repeater';

export type FicheField = {
  key: string;
  label: string;
  kind: FicheFieldKind;
  options?: { value: string; label: string }[];
  columns?: { key: string; label: string; kind: 'text' | 'money' | 'number' }[];
  help?: string;
};

export type FicheSection = {
  key: string;
  title: string;
  fields: FicheField[];
};

export type FicheTemplate = {
  key: FicheTemplateKey;
  label: string;
  defaultTitle: string;
  legalReference?: string;
  description: string;
  sections: FicheSection[];
  defaultData: Record<string, unknown>;
};

export const PCG_CHARGES = [
  { label: '60 — Achats (matières, fournitures)', amount: 0 },
  { label: '61 — Services extérieurs (locations, assurances)', amount: 0 },
  { label: '62 — Autres services extérieurs (honoraires, communication)', amount: 0 },
  { label: '63 — Impôts et taxes', amount: 0 },
  { label: '64 — Charges de personnel', amount: 0 },
  { label: '65 — Autres charges de gestion courante', amount: 0 },
];

export const PCG_PRODUITS = [
  { label: '70 — Ventes et prestations', amount: 0 },
  { label: "74 — Subventions d'exploitation", amount: 0 },
  { label: '75 — Cotisations, dons et legs', amount: 0 },
  { label: '76 — Produits financiers', amount: 0 },
];

const currentYear = (): string => String(new Date().getUTCFullYear());

const identitySection: FicheSection = {
  key: 'identity',
  title: "Identité de l'organisation",
  fields: [
    { key: 'legalName', label: 'Dénomination', kind: 'text' },
    { key: 'rna', label: 'Numéro RNA', kind: 'text', help: 'Format W123456789' },
    { key: 'siret', label: 'SIRET', kind: 'text' },
    { key: 'address', label: 'Adresse', kind: 'text' },
    { key: 'postalCode', label: 'Code postal', kind: 'text' },
    { key: 'city', label: 'Commune', kind: 'text' },
    { key: 'email', label: 'Courriel', kind: 'text' },
    { key: 'phone', label: 'Téléphone', kind: 'text' },
    { key: 'representativeName', label: 'Représentant légal', kind: 'text' },
    { key: 'representativeRole', label: 'Qualité', kind: 'text' },
  ],
};

const signatureSection: FicheSection = {
  key: 'signature',
  title: 'Signature',
  fields: [
    { key: 'signatureCity', label: 'Fait à', kind: 'text' },
    { key: 'signatureDate', label: 'Le', kind: 'date' },
    { key: 'signatoryName', label: 'Nom du signataire', kind: 'text' },
    { key: 'signatoryRole', label: 'Qualité du signataire', kind: 'text' },
  ],
};

const budgetGridSection = (title: string): FicheSection => ({
  key: 'budget',
  title,
  fields: [
    {
      key: 'charges',
      label: 'Charges',
      kind: 'lineGrid',
      columns: [
        { key: 'label', label: 'Poste', kind: 'text' },
        { key: 'amount', label: 'Montant', kind: 'money' },
      ],
    },
    {
      key: 'produits',
      label: 'Produits',
      kind: 'lineGrid',
      columns: [
        { key: 'label', label: 'Poste', kind: 'text' },
        { key: 'amount', label: 'Montant', kind: 'money' },
      ],
    },
  ],
});

export const FICHE_TEMPLATES: Record<FicheTemplateKey, FicheTemplate> = {
  ASSO_FR: {
    key: 'ASSO_FR',
    label: 'Fiche projet associatif',
    defaultTitle: 'Fiche projet associatif',
    description:
      "Présentation structurée d'un projet associatif : contexte, publics, objectifs, actions, moyens, partenaires et évaluation. Le format attendu par la plupart des financeurs locaux.",
    sections: [
      {
        key: 'project',
        title: 'Le projet',
        fields: [
          { key: 'ficheTitle', label: 'Intitulé du projet', kind: 'text' },
          { key: 'thematic', label: 'Thématique', kind: 'text' },
          { key: 'context', label: 'Contexte', kind: 'longText' },
          { key: 'origin', label: 'Origine du projet', kind: 'longText' },
          { key: 'generalObjective', label: 'Objectif général', kind: 'longText' },
          {
            key: 'specificObjectives',
            label: 'Objectifs spécifiques',
            kind: 'repeater',
          },
        ],
      },
      {
        key: 'audience',
        title: 'Publics et territoire',
        fields: [
          { key: 'audience', label: 'Public visé', kind: 'text' },
          { key: 'ageProfile', label: 'Tranches d’âge', kind: 'text' },
          {
            key: 'estimatedParticipants',
            label: 'Participants estimés',
            kind: 'number',
          },
          { key: 'geographicArea', label: 'Territoire', kind: 'text' },
          {
            key: 'needs',
            label: 'Besoins identifiés',
            kind: 'checkboxes',
            options: [
              { value: 'isolation', label: 'Isolement' },
              { value: 'economic', label: 'Difficultés économiques' },
              { value: 'culturalAccess', label: 'Accès à la culture' },
              { value: 'educational', label: 'Besoins éducatifs' },
              { value: 'other', label: 'Autre' },
            ],
          },
        ],
      },
      {
        key: 'actions',
        title: 'Actions',
        fields: [
          {
            key: 'actions',
            label: 'Actions prévues',
            kind: 'lineGrid',
            columns: [
              { key: 'description', label: 'Description', kind: 'text' },
              { key: 'audience', label: 'Public', kind: 'text' },
              { key: 'frequency', label: 'Fréquence', kind: 'text' },
              { key: 'period', label: 'Période', kind: 'text' },
            ],
          },
        ],
      },
      {
        key: 'means',
        title: 'Moyens',
        fields: [
          { key: 'volunteers', label: 'Bénévoles mobilisés', kind: 'number' },
          { key: 'employees', label: 'Salariés mobilisés', kind: 'number' },
          {
            key: 'externalContributors',
            label: 'Intervenants extérieurs',
            kind: 'text',
          },
          { key: 'materialResources', label: 'Moyens matériels', kind: 'longText' },
        ],
      },
      {
        key: 'evaluation',
        title: 'Évaluation',
        fields: [
          { key: 'targetParticipants', label: 'Participation cible', kind: 'text' },
          {
            key: 'qualitativeIndicators',
            label: 'Indicateurs qualitatifs',
            kind: 'longText',
          },
          {
            key: 'trackingTools',
            label: 'Outils de suivi',
            kind: 'checkboxes',
            options: [
              { value: 'attendance', label: 'Feuilles de présence' },
              { value: 'satisfaction', label: 'Questionnaires de satisfaction' },
              { value: 'collective', label: 'Bilan collectif' },
              { value: 'report', label: "Rapport d'activité" },
              { value: 'other', label: 'Autre' },
            ],
          },
          { key: 'perspectives', label: 'Perspectives', kind: 'longText' },
        ],
      },
      signatureSection,
    ],
    defaultData: {
      ficheTitle: '',
      thematic: '',
      context: '',
      origin: '',
      generalObjective: '',
      specificObjectives: ['', '', ''],
      audience: '',
      ageProfile: '',
      estimatedParticipants: 0,
      geographicArea: '',
      needs: {},
      actions: [
        { description: '', audience: '', frequency: '', period: '' },
        { description: '', audience: '', frequency: '', period: '' },
      ],
      volunteers: 0,
      employees: 0,
      externalContributors: '',
      materialResources: '',
      targetParticipants: '',
      qualitativeIndicators: '',
      trackingTools: {},
      perspectives: '',
      signatureCity: '',
      signatureDate: '',
      signatoryName: '',
      signatoryRole: 'Président(e)',
    },
  },
  BLANK: {
    key: 'BLANK',
    label: 'Page libre',
    defaultTitle: 'Page libre',
    description:
      'Une page vierge titrée, utile pour une annexe ou une note libre à joindre à un dossier.',
    sections: [
      {
        key: 'content',
        title: 'Contenu',
        fields: [{ key: 'content', label: 'Contenu', kind: 'longText' }],
      },
    ],
    defaultData: { content: '' },
  },
  RECU_DON: {
    key: 'RECU_DON',
    label: 'Reçu fiscal de dons',
    defaultTitle: 'Reçu fiscal de dons',
    legalReference: 'CGI art. 200, 238 bis et 978 — CERFA 11580',
    description:
      "Reçu au titre des dons ouvrant droit à réduction d'impôt. Le régime coché détermine la mention légale imprimée.",
    sections: [
      {
        key: 'receipt',
        title: 'Reçu',
        fields: [
          { key: 'receiptNumber', label: 'Numéro du reçu', kind: 'text' },
          {
            key: 'regime',
            label: 'Régime fiscal',
            kind: 'checkboxes',
            options: [
              { value: 'art200', label: 'Article 200 du CGI (particuliers)' },
              { value: 'art238bis', label: 'Article 238 bis du CGI (entreprises)' },
              { value: 'art978', label: 'Article 978 du CGI (IFI)' },
            ],
          },
          { key: 'orgCategory', label: "Catégorie de l'organisme", kind: 'text' },
        ],
      },
      {
        key: 'donor',
        title: 'Donateur',
        fields: [
          { key: 'donorCivility', label: 'Civilité', kind: 'text' },
          { key: 'donorName', label: 'Nom et prénom', kind: 'text' },
          { key: 'donorAddress', label: 'Adresse', kind: 'text' },
        ],
      },
      {
        key: 'donation',
        title: 'Don',
        fields: [
          { key: 'amount', label: 'Montant du don', kind: 'money' },
          { key: 'donDate', label: 'Date du don', kind: 'date' },
          {
            key: 'forme',
            label: 'Forme du don',
            kind: 'select',
            options: [
              { value: 'don_manuel', label: 'Don manuel' },
              { value: 'cotisation', label: 'Cotisation' },
              { value: 'abandon_revenus', label: 'Abandon de revenus ou de produits' },
              { value: 'frais_benevoles', label: 'Frais de bénévoles non remboursés' },
            ],
          },
          {
            key: 'nature',
            label: 'Nature du don',
            kind: 'select',
            options: [
              { value: 'numeraire', label: 'Numéraire' },
              { value: 'titres', label: 'Titres de sociétés cotées' },
              { value: 'nature', label: 'Don en nature' },
            ],
          },
          {
            key: 'modeVersement',
            label: 'Mode de versement',
            kind: 'select',
            options: [
              { value: 'virement', label: 'Virement, prélèvement ou carte bancaire' },
              { value: 'cheque', label: 'Chèque' },
              { value: 'especes', label: 'Espèces' },
            ],
          },
        ],
      },
      signatureSection,
    ],
    defaultData: {
      receiptNumber: '',
      orgCategory: "Œuvre ou organisme d'intérêt général",
      regime: { art200: true },
      donorCivility: '',
      donorName: '',
      donorAddress: '',
      amount: 0,
      donDate: '',
      forme: 'don_manuel',
      nature: 'numeraire',
      modeVersement: 'virement',
      signatureCity: '',
      signatureDate: '',
      signatoryName: '',
      signatoryRole: 'Président(e)',
    },
  },
  BUDGET_EQUILIBRE: {
    key: 'BUDGET_EQUILIBRE',
    label: "Budget prévisionnel à l'équilibre",
    defaultTitle: "Budget prévisionnel à l'équilibre",
    legalReference: 'Plan comptable général — classes 60 à 65 et 70 à 76',
    description:
      "Le budget que tout financeur réclame : charges et produits par compte PCG, totaux et indicateur d'équilibre. Préremplissable depuis les dépenses et recettes réelles de l'exercice.",
    sections: [
      {
        key: 'header',
        title: 'En-tête',
        fields: [
          { key: 'association', label: 'Organisation', kind: 'text' },
          { key: 'scope', label: 'Périmètre', kind: 'text' },
          { key: 'year', label: 'Exercice', kind: 'text' },
        ],
      },
      budgetGridSection('Charges et produits'),
      {
        key: 'notes',
        title: 'Notes',
        fields: [{ key: 'notes', label: 'Notes', kind: 'longText' }],
      },
    ],
    defaultData: {
      association: '',
      scope: 'Budget prévisionnel annuel',
      year: currentYear(),
      charges: PCG_CHARGES,
      produits: PCG_PRODUITS,
      notes: '',
    },
  },
  DEMANDE_SUBVENTION: {
    key: 'DEMANDE_SUBVENTION',
    label: 'Demande de subvention (CERFA 12156)',
    defaultTitle: 'Demande de subvention',
    legalReference: 'CERFA 12156 — demande de subvention associative',
    description:
      "Le dossier unique de demande de subvention : identité, agréments, aides publiques des trois derniers exercices, budget et présentation du projet.",
    sections: [
      {
        key: 'request',
        title: 'Demande',
        fields: [
          { key: 'fundingBody', label: 'Financeur sollicité', kind: 'text' },
          {
            key: 'requestType',
            label: 'Objet de la demande',
            kind: 'select',
            options: [
              { value: 'projet', label: 'Financement de projet' },
              { value: 'fonctionnement', label: 'Fonctionnement global' },
              { value: 'investissement', label: 'Investissement' },
            ],
          },
          { key: 'amountRequested', label: 'Montant demandé', kind: 'money' },
          { key: 'year', label: 'Exercice', kind: 'text' },
        ],
      },
      identitySection,
      {
        key: 'compliance',
        title: 'Agréments et régime',
        fields: [
          { key: 'agrements', label: 'Agréments obtenus', kind: 'longText' },
          {
            key: 'rupRecognized',
            label: "Reconnue d'utilité publique",
            kind: 'boolean',
          },
          { key: 'fiscalRegime', label: 'Régime fiscal', kind: 'text' },
          {
            key: 'aidesPubliques3ans',
            label: 'Aides publiques des 3 derniers exercices',
            kind: 'longText',
          },
        ],
      },
      {
        key: 'means',
        title: 'Moyens humains',
        fields: [
          { key: 'volunteers', label: 'Bénévoles', kind: 'number' },
          { key: 'employees', label: 'Salariés', kind: 'number' },
          { key: 'etp', label: 'Équivalents temps plein', kind: 'number' },
          { key: 'members', label: 'Adhérents', kind: 'number' },
        ],
      },
      budgetGridSection('Budget du projet'),
      {
        key: 'project',
        title: 'Projet',
        fields: [
          { key: 'projectTitle', label: 'Intitulé', kind: 'text' },
          { key: 'objectives', label: 'Objectifs', kind: 'longText' },
          { key: 'description', label: 'Description', kind: 'longText' },
          { key: 'beneficiaries', label: 'Bénéficiaires', kind: 'longText' },
          { key: 'territory', label: 'Territoire', kind: 'text' },
          { key: 'calendar', label: 'Calendrier', kind: 'longText' },
          { key: 'means', label: 'Moyens mis en œuvre', kind: 'longText' },
          { key: 'evaluation', label: 'Évaluation prévue', kind: 'longText' },
        ],
      },
      signatureSection,
    ],
    defaultData: {
      fundingBody: '',
      requestType: 'projet',
      amountRequested: 0,
      year: currentYear(),
      legalName: '',
      rna: '',
      siret: '',
      address: '',
      postalCode: '',
      city: '',
      email: '',
      phone: '',
      representativeName: '',
      representativeRole: 'Président(e)',
      agrements: '',
      rupRecognized: false,
      fiscalRegime: 'Non assujettie aux impôts commerciaux',
      aidesPubliques3ans: '',
      volunteers: 0,
      employees: 0,
      etp: 0,
      members: 0,
      charges: PCG_CHARGES,
      produits: PCG_PRODUITS,
      projectTitle: '',
      objectives: '',
      description: '',
      beneficiaries: '',
      territory: '',
      calendar: '',
      means: '',
      evaluation: '',
      signatureCity: '',
      signatureDate: '',
      signatoryName: '',
      signatoryRole: 'Président(e)',
    },
  },
  CONVENTION_SUBVENTION: {
    key: 'CONVENTION_SUBVENTION',
    label: 'Convention de subvention',
    defaultTitle: 'Convention de subvention',
    description:
      "La convention signée entre le financeur et le bénéficiaire : objet, montant, modalités de versement, durée et affectation.",
    sections: [
      {
        key: 'parties',
        title: 'Parties',
        fields: [
          { key: 'reference', label: 'Référence', kind: 'text' },
          { key: 'financeur', label: 'Financeur', kind: 'text' },
          { key: 'financeurRep', label: 'Représenté par', kind: 'text' },
          { key: 'financeurRole', label: 'Qualité', kind: 'text' },
          { key: 'financeurAddress', label: 'Adresse du financeur', kind: 'text' },
        ],
      },
      identitySection,
      {
        key: 'terms',
        title: 'Objet et modalités',
        fields: [
          { key: 'objet', label: 'Objet de la subvention', kind: 'longText' },
          { key: 'amount', label: 'Montant accordé', kind: 'money' },
          { key: 'exercice', label: 'Exercice', kind: 'text' },
          { key: 'paymentTerms', label: 'Modalités de versement', kind: 'longText' },
          { key: 'duration', label: 'Durée', kind: 'longText' },
          { key: 'affectation', label: 'Affectation', kind: 'longText' },
        ],
      },
      signatureSection,
    ],
    defaultData: {
      reference: '',
      financeur: '',
      financeurRep: '',
      financeurRole: '',
      financeurAddress: '',
      legalName: '',
      rna: '',
      siret: '',
      address: '',
      representativeName: '',
      representativeRole: 'Président(e)',
      objet: '',
      amount: 0,
      exercice: currentYear(),
      paymentTerms:
        "La subvention est versée en une seule fois à la signature de la présente convention, par virement sur le compte bancaire du bénéficiaire.",
      duration:
        "La présente convention est conclue pour l'exercice en cours. Elle prend effet à sa signature.",
      affectation: '',
      signatureCity: '',
      signatureDate: '',
      signatoryName: '',
      signatoryRole: 'Président(e)',
    },
  },
  RAPPORT_ACTIVITE: {
    key: 'RAPPORT_ACTIVITE',
    label: "Rapport annuel d'activité",
    defaultTitle: "Rapport annuel d'activité",
    description:
      "Le rapport présenté en assemblée générale et joint à chaque demande de subvention : gouvernance, activités réalisées, résultats et perspectives.",
    sections: [
      {
        key: 'header',
        title: 'En-tête',
        fields: [
          { key: 'legalName', label: 'Organisation', kind: 'text' },
          { key: 'year', label: 'Exercice', kind: 'text' },
        ],
      },
      {
        key: 'governance',
        title: 'Gouvernance et moyens',
        fields: [
          { key: 'presidentWord', label: 'Mot du président', kind: 'longText' },
          { key: 'governance', label: 'Gouvernance', kind: 'longText' },
          { key: 'members', label: 'Adhérents', kind: 'number' },
          { key: 'volunteers', label: 'Bénévoles', kind: 'number' },
          { key: 'employees', label: 'Salariés', kind: 'number' },
        ],
      },
      {
        key: 'activities',
        title: 'Activités',
        fields: [
          {
            key: 'activities',
            label: 'Activités réalisées',
            kind: 'lineGrid',
            columns: [
              { key: 'title', label: 'Intitulé', kind: 'text' },
              { key: 'description', label: 'Description', kind: 'text' },
              { key: 'beneficiaries', label: 'Bénéficiaires', kind: 'text' },
              { key: 'period', label: 'Période', kind: 'text' },
            ],
          },
        ],
      },
      {
        key: 'results',
        title: 'Résultats',
        fields: [
          { key: 'results', label: 'Résultats', kind: 'longText' },
          { key: 'financialSummary', label: 'Synthèse financière', kind: 'longText' },
          { key: 'perspectives', label: 'Perspectives', kind: 'longText' },
        ],
      },
      signatureSection,
    ],
    defaultData: {
      legalName: '',
      year: String(new Date().getUTCFullYear() - 1),
      presidentWord: '',
      governance: '',
      members: 0,
      volunteers: 0,
      employees: 0,
      activities: [{ title: '', description: '', beneficiaries: '', period: '' }],
      results: '',
      financialSummary: '',
      perspectives: '',
      signatureCity: '',
      signatureDate: '',
      signatoryName: '',
      signatoryRole: 'Président(e)',
    },
  },
  ATTESTATION_HONNEUR: {
    key: 'ATTESTATION_HONNEUR',
    label: "Attestation sur l'honneur",
    defaultTitle: "Attestation sur l'honneur",
    legalReference: 'Pièce obligatoire du dossier CERFA 12156',
    description:
      "L'attestation que le représentant légal signe pour certifier l'exactitude du dossier et la régularité de la structure.",
    sections: [
      identitySection,
      {
        key: 'request',
        title: 'Demande concernée',
        fields: [
          { key: 'fundingBody', label: 'Financeur sollicité', kind: 'text' },
          { key: 'amountRequested', label: 'Montant demandé', kind: 'money' },
        ],
      },
      {
        key: 'declarations',
        title: 'Déclarations',
        fields: [
          {
            key: 'declarations',
            label: 'Je certifie',
            kind: 'checkboxes',
            options: [
              { value: 'decExact', label: "l'exactitude des informations du dossier" },
              {
                value: 'decObligations',
                label: 'que la structure est à jour de ses obligations sociales et fiscales',
              },
              {
                value: 'decCer',
                label: 'que le compte emploi ressources sera transmis si demandé',
              },
              {
                value: 'decNoDistribution',
                label: 'que la gestion est désintéressée et sans distribution de bénéfices',
              },
              {
                value: 'decRegular',
                label: 'que la structure fonctionne de manière régulière et démocratique',
              },
            ],
          },
        ],
      },
      signatureSection,
    ],
    defaultData: {
      legalName: '',
      rna: '',
      siret: '',
      address: '',
      representativeName: '',
      representativeRole: 'Président(e)',
      fundingBody: '',
      amountRequested: 0,
      declarations: {
        decExact: true,
        decObligations: true,
        decCer: true,
        decNoDistribution: true,
        decRegular: true,
      },
      signatureCity: '',
      signatureDate: '',
      signatoryName: '',
      signatoryRole: 'Président(e)',
    },
  },
};

export const FICHE_TEMPLATE_KEYS = Object.keys(
  FICHE_TEMPLATES,
) as FicheTemplateKey[];

export const getFicheTemplate = (
  key: string,
): FicheTemplate | undefined =>
  FICHE_TEMPLATES[key as FicheTemplateKey];

// A fiche stored last year keeps its own payload; missing keys are backfilled
// from the template so a new field never renders as undefined.
export const withTemplateDefaults = (
  key: string,
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> => {
  const template = getFicheTemplate(key);

  if (template === undefined) {
    return data ?? {};
  }

  return { ...structuredClone(template.defaultData), ...(data ?? {}) };
};
