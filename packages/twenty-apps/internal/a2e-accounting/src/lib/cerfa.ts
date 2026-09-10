// CERFA helpers.
//
// Bilan does not re-implement the administration's forms: it fills them. Each
// helper turns Bilan data (org profile + fiche payload) into the exact field
// list of the official form, so the user can print, attach, or copy into the
// online service without retyping anything.
//
//  - CERFA 12156*06 — Demande de subvention (association)
//  - CERFA 15059*03 — Reçu au titre des dons à certains organismes d'intérêt
//    général (CGI art. 200, 238 bis, 978)

export type CerfaFormKey = 'CERFA_12156' | 'CERFA_15059';

export type CerfaField = {
  code: string;
  label: string;
  value: string;
  isMissing: boolean;
};

export type CerfaSection = { title: string; fields: CerfaField[] };

export type CerfaForm = {
  key: CerfaFormKey;
  reference: string;
  title: string;
  officialUrl: string;
  sections: CerfaSection[];
  missingFieldCodes: string[];
};

export const CERFA_CATALOG: Record<
  CerfaFormKey,
  { reference: string; title: string; officialUrl: string; notice: string }
> = {
  CERFA_12156: {
    reference: '12156*06',
    title: 'Demande de subvention — association',
    officialUrl: 'https://www.service-public.fr/associations/vosdroits/R1271',
    notice:
      "Dossier unique de demande de subvention. À déposer sur Le Compte Asso ou auprès du service instructeur, accompagné du budget prévisionnel et de l'attestation sur l'honneur.",
  },
  CERFA_15059: {
    reference: '15059*03',
    title: "Reçu au titre des dons à certains organismes d'intérêt général",
    officialUrl: 'https://www.impots.gouv.fr/formulaire/15059/recu-dons-organismes-interet-general',
    notice:
      "Reçu à remettre au donateur. L'organisme conserve un exemplaire et récapitule les reçus émis dans sa comptabilité.",
  },
};

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim();

const field = (code: string, label: string, value: unknown): CerfaField => {
  const resolved = text(value);

  return { code, label, value: resolved, isMissing: resolved.length === 0 };
};

const money = (value: unknown, locale = 'fr-FR'): string => {
  const amount = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(amount) || amount === 0) {
    return '';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const frenchDate = (value: unknown, locale = 'fr-FR'): string => {
  const raw = text(value);

  if (raw.length === 0) {
    return '';
  }

  const parsed = Date.parse(raw);

  return Number.isNaN(parsed)
    ? raw
    : new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(parsed);
};

const collect = (sections: CerfaSection[]): CerfaForm['missingFieldCodes'] =>
  sections
    .flatMap((section) => section.fields)
    .filter((formField) => formField.isMissing)
    .map((formField) => formField.code);

export type CerfaOrgProfile = {
  legalName?: string;
  shortName?: string;
  objet?: string;
  rna?: string;
  siret?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  email?: string;
  phone?: string;
  website?: string;
  representativeName?: string;
  representativeRole?: string;
  rupRecognized?: boolean;
  fiscalRegime?: string;
};

export const buildCerfa12156 = (
  profile: CerfaOrgProfile,
  ficheData: Record<string, unknown>,
): CerfaForm => {
  const catalog = CERFA_CATALOG.CERFA_12156;

  const sections: CerfaSection[] = [
    {
      title: '1 — Identification de l’association',
      fields: [
        field('1.1', 'Dénomination', ficheData.legalName ?? profile.legalName),
        field('1.2', 'Sigle', profile.shortName),
        field('1.3', 'Objet', profile.objet),
        field('1.4', 'Numéro RNA', ficheData.rna ?? profile.rna),
        field('1.5', 'Numéro SIRET', ficheData.siret ?? profile.siret),
        field(
          '1.6',
          'Adresse du siège',
          [
            text(ficheData.address ?? profile.addressLine),
            text(ficheData.postalCode ?? profile.postalCode),
            text(ficheData.city ?? profile.city),
          ]
            .filter(Boolean)
            .join(' '),
        ),
        field('1.7', 'Courriel', ficheData.email ?? profile.email),
        field('1.8', 'Téléphone', ficheData.phone ?? profile.phone),
        field('1.9', 'Site internet', profile.website),
      ],
    },
    {
      title: '2 — Représentant légal',
      fields: [
        field(
          '2.1',
          'Nom et prénom',
          ficheData.representativeName ?? profile.representativeName,
        ),
        field(
          '2.2',
          'Qualité',
          ficheData.representativeRole ?? profile.representativeRole,
        ),
      ],
    },
    {
      title: '3 — Situation administrative',
      fields: [
        field('3.1', 'Agréments obtenus', ficheData.agrements),
        field(
          '3.2',
          "Reconnue d'utilité publique",
          (ficheData.rupRecognized ?? profile.rupRecognized) === true
            ? 'Oui'
            : 'Non',
        ),
        field(
          '3.3',
          'Régime fiscal',
          ficheData.fiscalRegime ?? profile.fiscalRegime,
        ),
        field(
          '3.4',
          'Aides publiques des 3 derniers exercices',
          ficheData.aidesPubliques3ans,
        ),
      ],
    },
    {
      title: '4 — Moyens humains',
      fields: [
        field('4.1', 'Adhérents', ficheData.members),
        field('4.2', 'Bénévoles', ficheData.volunteers),
        field('4.3', 'Salariés', ficheData.employees),
        field('4.4', 'Équivalents temps plein', ficheData.etp),
      ],
    },
    {
      title: '5 — Demande',
      fields: [
        field('5.1', 'Financeur sollicité', ficheData.fundingBody),
        field('5.2', 'Objet de la demande', ficheData.requestType),
        field('5.3', 'Montant demandé', money(ficheData.amountRequested)),
        field('5.4', 'Exercice concerné', ficheData.year),
      ],
    },
    {
      title: '6 — Projet',
      fields: [
        field('6.1', 'Intitulé', ficheData.projectTitle),
        field('6.2', 'Objectifs', ficheData.objectives),
        field('6.3', 'Description', ficheData.description),
        field('6.4', 'Bénéficiaires', ficheData.beneficiaries),
        field('6.5', 'Territoire', ficheData.territory),
        field('6.6', 'Calendrier', ficheData.calendar),
        field('6.7', 'Moyens mis en œuvre', ficheData.means),
        field('6.8', 'Évaluation prévue', ficheData.evaluation),
      ],
    },
    {
      title: '7 — Attestation',
      fields: [
        field('7.1', 'Fait à', ficheData.signatureCity),
        field('7.2', 'Le', frenchDate(ficheData.signatureDate)),
        field('7.3', 'Signataire', ficheData.signatoryName),
        field('7.4', 'Qualité', ficheData.signatoryRole),
      ],
    },
  ];

  return {
    key: 'CERFA_12156',
    reference: catalog.reference,
    title: catalog.title,
    officialUrl: catalog.officialUrl,
    sections,
    missingFieldCodes: collect(sections),
  };
};

const REGIME_LABELS: Record<string, string> = {
  art200: 'Article 200 du CGI — particuliers',
  art238bis: 'Article 238 bis du CGI — entreprises',
  art978: 'Article 978 du CGI — IFI',
};

const FORME_LABELS: Record<string, string> = {
  don_manuel: 'Don manuel',
  cotisation: 'Cotisation',
  abandon_revenus: 'Abandon de revenus ou de produits',
  frais_benevoles: 'Frais de bénévoles non remboursés',
};

const NATURE_LABELS: Record<string, string> = {
  numeraire: 'Numéraire',
  titres: 'Titres de sociétés cotées',
  nature: 'Don en nature',
};

const VERSEMENT_LABELS: Record<string, string> = {
  virement: 'Virement, prélèvement ou carte bancaire',
  cheque: 'Chèque',
  especes: 'Espèces',
};

export const buildCerfa15059 = (
  profile: CerfaOrgProfile,
  ficheData: Record<string, unknown>,
): CerfaForm => {
  const catalog = CERFA_CATALOG.CERFA_15059;
  const regime = (ficheData.regime ?? {}) as Record<string, boolean>;
  const activeRegimes = Object.entries(regime)
    .filter(([, isActive]) => isActive === true)
    .map(([key]) => REGIME_LABELS[key] ?? key);

  const sections: CerfaSection[] = [
    {
      title: '1 — Bénéficiaire du don',
      fields: [
        field('1.1', 'Numéro du reçu', ficheData.receiptNumber),
        field('1.2', 'Dénomination', ficheData.orgName ?? profile.legalName),
        field(
          '1.3',
          'Adresse',
          [
            text(ficheData.orgAddress ?? profile.addressLine),
            text(profile.postalCode),
            text(profile.city),
          ]
            .filter(Boolean)
            .join(' '),
        ),
        field('1.4', 'Objet', ficheData.orgObject ?? profile.objet),
        field('1.5', "Catégorie de l'organisme", ficheData.orgCategory),
        field('1.6', 'Régime applicable', activeRegimes.join(' · ')),
      ],
    },
    {
      title: '2 — Donateur',
      fields: [
        field('2.1', 'Civilité', ficheData.donorCivility),
        field('2.2', 'Nom et prénom', ficheData.donorName),
        field('2.3', 'Adresse', ficheData.donorAddress),
      ],
    },
    {
      title: '3 — Don',
      fields: [
        field('3.1', 'Montant du don', money(ficheData.amount)),
        field('3.2', 'Date du don', frenchDate(ficheData.donDate)),
        field(
          '3.3',
          'Forme du don',
          FORME_LABELS[text(ficheData.forme)] ?? ficheData.forme,
        ),
        field(
          '3.4',
          'Nature du don',
          NATURE_LABELS[text(ficheData.nature)] ?? ficheData.nature,
        ),
        field(
          '3.5',
          'Mode de versement',
          VERSEMENT_LABELS[text(ficheData.modeVersement)] ??
            ficheData.modeVersement,
        ),
      ],
    },
    {
      title: '4 — Signature',
      fields: [
        field('4.1', 'Fait à', ficheData.signatureCity),
        field('4.2', 'Le', frenchDate(ficheData.signatureDate)),
        field(
          '4.3',
          'Signataire',
          ficheData.signatoryName ?? profile.representativeName,
        ),
        field(
          '4.4',
          'Qualité',
          ficheData.signatoryRole ?? profile.representativeRole,
        ),
      ],
    },
  ];

  return {
    key: 'CERFA_15059',
    reference: catalog.reference,
    title: catalog.title,
    officialUrl: catalog.officialUrl,
    sections,
    missingFieldCodes: collect(sections),
  };
};

export const buildCerfaForm = (
  key: CerfaFormKey,
  profile: CerfaOrgProfile,
  ficheData: Record<string, unknown>,
): CerfaForm =>
  key === 'CERFA_12156'
    ? buildCerfa12156(profile, ficheData)
    : buildCerfa15059(profile, ficheData);

export const cerfaCompletionPercent = (form: CerfaForm): number => {
  const total = form.sections.reduce(
    (count, section) => count + section.fields.length,
    0,
  );

  if (total === 0) {
    return 100;
  }

  return Math.round(((total - form.missingFieldCodes.length) / total) * 100);
};
