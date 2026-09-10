import {
  AggregateOperations,
  definePageLayout,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  PAGE_LAYOUT_IDS,
} from '../constants/universal-identifiers.ts';

// Widget identifiers live in family 000a of the app-level namespace.
const widget = (index: string) => `b11a0000-000a-4000-8000-0000000000${index}`;

const CHART_BASE = {
  timezone: 'UTC',
  firstDayOfTheWeek: 1,
} as const;

const BAR_BASE = {
  ...CHART_BASE,
  layout: 'VERTICAL',
  primaryAxisOrderBy: 'FIELD_ASC',
  axisNameDisplay: 'NONE',
  color: 'auto',
} as const;

// The money answers a treasurer asks first: what came in, what went out,
// what is still owed, and what is coming up in the funding pipeline.
export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_IDS.dashboard,
  name: 'Bilan — tableau de bord',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: PAGE_LAYOUT_IDS.dashboardTabOverview,
      title: 'Vue générale',
      position: 0,
      icon: 'IconChartBar',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: widget('01'),
          title: 'Total facturé',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_IDS.invoice,
          position: {
            layoutMode: PageLayoutTabLayoutMode.GRID,
            row: 0,
            column: 0,
            rowSpan: 2,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              FIELD_IDS.invoice.amountTotal,
            aggregateOperation: AggregateOperations.SUM,
            displayDataLabel: true,
            ...CHART_BASE,
          },
        },
        {
          universalIdentifier: widget('02'),
          title: 'Encaissé',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_IDS.invoice,
          position: {
            layoutMode: PageLayoutTabLayoutMode.GRID,
            row: 0,
            column: 3,
            rowSpan: 2,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              FIELD_IDS.invoice.amountPaid,
            aggregateOperation: AggregateOperations.SUM,
            displayDataLabel: true,
            ...CHART_BASE,
          },
        },
        {
          universalIdentifier: widget('03'),
          title: 'Mouvements enregistrés',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_IDS.financeEntry,
          position: {
            layoutMode: PageLayoutTabLayoutMode.GRID,
            row: 0,
            column: 6,
            rowSpan: 2,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              FIELD_IDS.financeEntry.amount,
            aggregateOperation: AggregateOperations.SUM,
            displayDataLabel: true,
            ...CHART_BASE,
          },
        },
        {
          universalIdentifier: widget('04'),
          title: 'Aides au catalogue',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_IDS.subvention,
          position: {
            layoutMode: PageLayoutTabLayoutMode.GRID,
            row: 0,
            column: 9,
            rowSpan: 2,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              FIELD_IDS.subvention.title,
            aggregateOperation: AggregateOperations.COUNT,
            displayDataLabel: true,
            ...CHART_BASE,
          },
        },
        {
          universalIdentifier: widget('05'),
          title: 'Factures par statut',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_IDS.invoice,
          position: {
            layoutMode: PageLayoutTabLayoutMode.GRID,
            row: 2,
            column: 0,
            rowSpan: 5,
            columnSpan: 6,
          },
          configuration: {
            configurationType: 'PIE_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              FIELD_IDS.invoice.amountTotal,
            aggregateOperation: AggregateOperations.SUM,
            groupByFieldMetadataUniversalIdentifier: FIELD_IDS.invoice.status,
            displayLegend: true,
            ...CHART_BASE,
          },
        },
        {
          universalIdentifier: widget('06'),
          title: 'Dépenses et recettes par nature',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_IDS.financeEntry,
          position: {
            layoutMode: PageLayoutTabLayoutMode.GRID,
            row: 2,
            column: 6,
            rowSpan: 5,
            columnSpan: 6,
          },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              FIELD_IDS.financeEntry.amount,
            aggregateOperation: AggregateOperations.SUM,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              FIELD_IDS.financeEntry.entryType,
            ...BAR_BASE,
          },
        },
        {
          universalIdentifier: widget('07'),
          title: 'Budgets consommés',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_IDS.budget,
          position: {
            layoutMode: PageLayoutTabLayoutMode.GRID,
            row: 7,
            column: 0,
            rowSpan: 5,
            columnSpan: 6,
          },
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              FIELD_IDS.budget.spentAmount,
            aggregateOperation: AggregateOperations.SUM,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              FIELD_IDS.budget.name,
            ...BAR_BASE,
            primaryAxisOrderBy: 'VALUE_DESC',
          },
        },
        {
          universalIdentifier: widget('08'),
          title: 'Dossiers de subvention par statut',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_IDS.savedSubvention,
          position: {
            layoutMode: PageLayoutTabLayoutMode.GRID,
            row: 7,
            column: 6,
            rowSpan: 5,
            columnSpan: 6,
          },
          configuration: {
            configurationType: 'PIE_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              FIELD_IDS.savedSubvention.amountRequested,
            aggregateOperation: AggregateOperations.SUM,
            groupByFieldMetadataUniversalIdentifier:
              FIELD_IDS.savedSubvention.status,
            displayLegend: true,
            ...CHART_BASE,
          },
        },
      ],
    },
  ],
});
