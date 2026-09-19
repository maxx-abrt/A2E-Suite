import { type ImportedStructuredRow } from '@/spreadsheet-import/types/SpreadsheetImportImportedStructuredRow';
import { type SpreadsheetImportImportValidationResult } from '@/spreadsheet-import/types/SpreadsheetImportImportValidationResult';
import { type ImportedStructuredRowMetadata } from '@/spreadsheet-import/steps/components/ValidationStep/types';
import { isDefined } from 'twenty-shared/utils';

export const partitionRowsByValidationErrors = (
  rows: (ImportedStructuredRow & ImportedStructuredRowMetadata)[],
): SpreadsheetImportImportValidationResult => {
  return rows.reduce<SpreadsheetImportImportValidationResult>(
    (accumulator, row) => {
      const { __index, __errors, ...values } = row;

      const hasError = isDefined(__errors)
        ? Object.values(__errors).some((error) => error.level === 'error')
        : false;

      if (hasError) {
        accumulator.invalidStructuredRows.push(
          values as unknown as ImportedStructuredRow,
        );
        return accumulator;
      }

      accumulator.validStructuredRows.push(
        values as unknown as ImportedStructuredRow,
      );
      return accumulator;
    },
    {
      validStructuredRows: [],
      invalidStructuredRows: [],
      allStructuredRows: rows,
    },
  );
};

export type SpreadsheetImportPartialResult<TRecord> = {
  createdRecords: TRecord[];
  createdCount: number;
  failedRecords: TRecord[];
  failedCount: number;
  isPartial: boolean;
};

// Batches are atomic server-side, so every row from the first failed batch on is
// reported as failed while the rows committed by earlier batches are kept.
export const partitionRowsByImportResult = <TRecord>({
  recordsToImport,
  createdRecordCount,
}: {
  recordsToImport: TRecord[];
  createdRecordCount: number;
}): SpreadsheetImportPartialResult<TRecord> => {
  const normalizedCreatedRecordCount = Math.min(
    Math.max(createdRecordCount, 0),
    recordsToImport.length,
  );

  const createdRecords = recordsToImport.slice(0, normalizedCreatedRecordCount);
  const failedRecords = recordsToImport.slice(normalizedCreatedRecordCount);

  return {
    createdRecords,
    createdCount: createdRecords.length,
    failedRecords,
    failedCount: failedRecords.length,
    isPartial: createdRecords.length > 0 && failedRecords.length > 0,
  };
};
