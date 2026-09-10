import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';

// LA SAISIE RAPIDE.
//
// Le geste le plus fréquent de Bilan est « je viens de payer X, le noter AVANT
// d'oublier ». Cette composante l'abaisse à trois champs : libellé, montant,
// catégorie — la TVA et la date sont pré-remplies depuis la catégorie, le
// journal est écrit par la logique `sync-finance-entry-to-ledger` comme pour
// toute saisie manuelle.

type CategoryOption = {
  id: string;
  name: string;
  categoryKind: string;
  defaultVatRate: number;
};

const theme = {
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
  spacing3: 'var(--t-spacing-3)',
  spacing4: 'var(--t-spacing-4)',
  spacing6: 'var(--t-spacing-6)',
  bgPrimary: 'var(--t-background-primary)',
  bgSecondary: 'var(--t-background-secondary)',
  bgTransparent: 'var(--t-background-transparent-light)',
  borderLight: 'var(--t-border-color-light)',
  borderMedium: 'var(--t-border-color-medium)',
  radiusSm: 'var(--t-border-radius-sm)',
  radiusMd: 'var(--t-border-radius-md)',
  fontPrimary: 'var(--t-font-color-primary)',
  fontSecondary: 'var(--t-font-color-secondary)',
  fontTertiary: 'var(--t-font-color-tertiary)',
  fontInverted: 'var(--t-font-color-inverted)',
  fontFamily: 'var(--t-font-family)',
  sizeXs: 'var(--t-font-size-xs)',
  sizeSm: 'var(--t-font-size-sm)',
  sizeLg: 'var(--t-font-size-lg)',
  weightMedium: 'var(--t-font-weight-medium)',
  weightSemiBold: 'var(--t-font-weight-semi-bold)',
  blue: 'var(--t-color-blue)',
  green: 'var(--t-color-green)',
  red: 'var(--t-color-red)',
};

const styles: Record<string, CSSProperties> = {
  panel: {
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    color: theme.fontPrimary,
    background: theme.bgPrimary,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing4,
    padding: theme.spacing6,
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'auto',
  },
  title: {
    fontSize: theme.sizeLg,
    fontWeight: theme.weightSemiBold,
    margin: 0,
  },
  subtitle: {
    color: theme.fontTertiary,
    fontSize: theme.sizeXs,
    margin: 0,
  },
  typeRow: {
    display: 'flex',
    gap: theme.spacing2,
  },
  typeButton: {
    flex: 1,
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    background: theme.bgSecondary,
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    cursor: 'pointer',
  },
  typeButtonActiveExpense: {
    background: theme.red,
    borderColor: theme.red,
    color: theme.fontInverted,
  },
  typeButtonActiveIncome: {
    background: theme.green,
    borderColor: theme.green,
    color: theme.fontInverted,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing1,
  },
  label: {
    color: theme.fontSecondary,
    fontSize: theme.sizeXs,
    fontWeight: theme.weightMedium,
  },
  input: {
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    background: theme.bgPrimary,
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
  },
  select: {
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    background: theme.bgPrimary,
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
  },
  row: {
    display: 'flex',
    gap: theme.spacing3,
  },
  rowChild: {
    flex: 1,
  },
  hint: {
    color: theme.fontTertiary,
    fontSize: theme.sizeXs,
    margin: 0,
  },
  submitButton: {
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.blue}`,
    borderRadius: theme.radiusSm,
    background: theme.blue,
    color: theme.fontInverted,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    cursor: 'pointer',
  },
  submitButtonBusy: {
    opacity: 0.6,
    cursor: 'wait',
  },
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const QuickEntry = () => {
  const [entryType, setEntryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [vatRate, setVatRate] = useState('0');
  const [entryDate, setEntryDate] = useState(() => toIsoDate(new Date()));
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);

    try {
      const client = new CoreApiClient();
      const result = (await client.query({
        financeCategories: {
          __args: {
            filter: { isArchived: { eq: false } },
            orderBy: [{ name: 'AscNullsFirst' }],
            first: 100,
          },
          edges: {
            node: {
              id: true,
              name: true,
              categoryKind: true,
              defaultVatRate: true,
            },
          },
        },
      } as never)) as {
        financeCategories?: { edges?: { node: CategoryOption }[] };
      };

      setCategories(
        (result?.financeCategories?.edges ?? []).map((edge) => edge.node),
      );
    } catch {
      void enqueueSnackbar({
        message: 'Impossible de charger les catégories',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const visibleCategories = categories.filter((category) =>
    entryType === 'EXPENSE'
      ? category.categoryKind !== 'INCOME'
      : category.categoryKind !== 'EXPENSE',
  );

  const onCategoryChange = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);

    const category = categories.find((c) => c.id === nextCategoryId);

    if (category) {
      setVatRate(String(category.defaultVatRate ?? 0));
    }
  };

  const onSubmit = useCallback(async () => {
    const parsedAmount = Number.parseFloat(amount.replace(',', '.'));

    if (!label.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      void enqueueSnackbar({
        message: 'Libellé et montant sont obligatoires',
        variant: 'error',
      });

      return;
    }

    setSubmitting(true);

    try {
      const client = new CoreApiClient();

      await client.mutation({
        createFinanceEntryFromQuickEntry: {
          __args: {
            data: {
              label: label.trim(),
              entryType,
              amountMicros: Math.round(parsedAmount * 1_000_000),
              entryDate,
              paymentMethod,
              vatRate: Number.parseFloat(vatRate.replace(',', '.')) || 0,
              ...(categoryId ? { category: { id: categoryId } } : {}),
            },
          },
          id: true,
        },
      } as never);

      void enqueueSnackbar({
        message:
          entryType === 'EXPENSE'
            ? 'Dépense enregistrée'
            : 'Recette enregistrée',
        variant: 'success',
      });
      setLabel('');
      setAmount('');
    } catch {
      void enqueueSnackbar({
        message: "Échec de l'enregistrement",
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }, [amount, categoryId, entryDate, entryType, label, paymentMethod, vatRate]);

  return (
    <div style={styles.panel}>
      <div>
        <h1 style={styles.title}>Saisie rapide</h1>
        <p style={styles.subtitle}>
          Noter une dépense ou une recette en trois champs. La TVA est
          pré-remplie depuis la catégorie ; le journal est mis à jour
          automatiquement.
        </p>
      </div>

      <div style={styles.typeRow}>
        <button
          type="button"
          style={{
            ...styles.typeButton,
            ...(entryType === 'EXPENSE' ? styles.typeButtonActiveExpense : {}),
          }}
          onClick={() => {
            setEntryType('EXPENSE');
            setCategoryId('');
          }}
          data-testid="quick-entry-type-expense"
        >
          Dépense
        </button>
        <button
          type="button"
          style={{
            ...styles.typeButton,
            ...(entryType === 'INCOME' ? styles.typeButtonActiveIncome : {}),
          }}
          onClick={() => {
            setEntryType('INCOME');
            setCategoryId('');
          }}
          data-testid="quick-entry-type-income"
        >
          Recette
        </button>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label} htmlFor="quick-entry-label">
          Libellé
        </label>
        <input
          id="quick-entry-label"
          style={styles.input}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ex : Frais de mission, don BNP…"
          data-testid="quick-entry-label-input"
        />
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.fieldGroup, ...styles.rowChild }}>
          <label style={styles.label} htmlFor="quick-entry-amount">
            Montant (€)
          </label>
          <input
            id="quick-entry-amount"
            style={styles.input}
            value={amount}
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            data-testid="quick-entry-amount-input"
          />
        </div>
        <div style={{ ...styles.fieldGroup, ...styles.rowChild }}>
          <label style={styles.label} htmlFor="quick-entry-vat">
            TVA (%)
          </label>
          <input
            id="quick-entry-vat"
            style={styles.input}
            value={vatRate}
            inputMode="decimal"
            onChange={(event) => setVatRate(event.target.value)}
            data-testid="quick-entry-vat-input"
          />
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label} htmlFor="quick-entry-category">
          Catégorie
        </label>
        <select
          id="quick-entry-category"
          style={styles.select}
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          disabled={loading}
          data-testid="quick-entry-category-select"
        >
          <option value="">
            {loading ? 'Chargement…' : '— Sans catégorie —'}
          </option>
          {visibleCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <p style={styles.hint}>
          La TVA par défaut de la catégorie est appliquée automatiquement.
        </p>
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.fieldGroup, ...styles.rowChild }}>
          <label style={styles.label} htmlFor="quick-entry-date">
            Date
          </label>
          <input
            id="quick-entry-date"
            style={styles.input}
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            data-testid="quick-entry-date-input"
          />
        </div>
        <div style={{ ...styles.fieldGroup, ...styles.rowChild }}>
          <label style={styles.label} htmlFor="quick-entry-payment">
            Paiement
          </label>
          <select
            id="quick-entry-payment"
            style={styles.select}
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            data-testid="quick-entry-payment-select"
          >
            <option value="BANK_TRANSFER">Virement</option>
            <option value="CARD">Carte bancaire</option>
            <option value="CASH">Espèces</option>
            <option value="CHECK">Chèque</option>
            <option value="DIRECT_DEBIT">Prélèvement</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        style={{
          ...styles.submitButton,
          ...(submitting ? styles.submitButtonBusy : {}),
        }}
        disabled={submitting}
        onClick={() => void onSubmit()}
        data-testid="quick-entry-submit"
      >
        {submitting ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.quickEntry,
  name: 'quick-entry',
  description:
    'Saisie rapide d’une dépense ou recette : libellé, montant, catégorie — TVA pré-remplie et journal automatique.',
  component: QuickEntry,
});
