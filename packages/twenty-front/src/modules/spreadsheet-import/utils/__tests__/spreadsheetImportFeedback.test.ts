import { type ImportedStructuredRow } from '@/spreadsheet-import/types/SpreadsheetImportImportedStructuredRow';
import { type ImportedStructuredRowMetadata } from '@/spreadsheet-import/steps/components/ValidationStep/types';
import {
  partitionRowsByImportResult,
  partitionRowsByValidationErrors,
} from '@/spreadsheet-import/utils/spreadsheetImportFeedback';

type TestRow = ImportedStructuredRow & ImportedStructuredRowMetadata;

const buildRow = ({
  index,
  errors,
  name = 'Example',
}: {
  index: string;
  errors?: ImportedStructuredRowMetadata['__errors'];
  name?: string;
}): TestRow =>
  ({
    __index: index,
    ...(errors !== undefined ? { __errors: errors } : {}),
    name,
  }) as unknown as TestRow;

describe('partitionRowsByValidationErrors', () => {
  it('should classify a row without errors as valid and strip its metadata', () => {
    const result = partitionRowsByValidationErrors([
      buildRow({ index: 'row-1' }),
    ]);

    expect(result.validStructuredRows).toEqual([{ name: 'Example' }]);
    expect(result.invalidStructuredRows).toEqual([]);
  });

  it('should classify a row with an error-level entry as invalid', () => {
    const result = partitionRowsByValidationErrors([
      buildRow({
        index: 'row-1',
        errors: { name: { level: 'error', message: 'Field is required' } },
      }),
    ]);

    expect(result.validStructuredRows).toEqual([]);
    expect(result.invalidStructuredRows).toEqual([{ name: 'Example' }]);
  });

  it('should keep a row with only warning/info entries as valid', () => {
    const result = partitionRowsByValidationErrors([
      buildRow({
        index: 'row-1',
        errors: { name: { level: 'warning', message: 'Looks unusual' } },
      }),
    ]);

    expect(result.validStructuredRows).toEqual([{ name: 'Example' }]);
    expect(result.invalidStructuredRows).toEqual([]);
  });

  it('should partition mixed rows and preserve allStructuredRows', () => {
    const rows = [
      buildRow({ index: 'row-1', name: 'Valid' }),
      buildRow({
        index: 'row-2',
        name: 'Invalid',
        errors: { name: { level: 'error', message: 'Field is required' } },
      }),
    ];

    const result = partitionRowsByValidationErrors(rows);

    expect(result.validStructuredRows).toEqual([{ name: 'Valid' }]);
    expect(result.invalidStructuredRows).toEqual([{ name: 'Invalid' }]);
    expect(result.allStructuredRows).toEqual(rows);
  });

  it('should not silently commit invalid rows alongside valid ones', () => {
    const result = partitionRowsByValidationErrors([
      buildRow({ index: 'row-1', name: 'Valid' }),
      buildRow({
        index: 'row-2',
        name: 'Invalid',
        errors: { name: { level: 'error', message: 'Field is required' } },
      }),
    ]);

    expect(result.validStructuredRows).toHaveLength(1);
    expect(result.invalidStructuredRows).toHaveLength(1);
    expect(
      result.validStructuredRows.length + result.invalidStructuredRows.length,
    ).toBe(result.allStructuredRows.length);
  });
});

describe('partitionRowsByImportResult', () => {
  const recordsToImport = [{ id: '1' }, { id: '2' }, { id: '3' }];

  it('should keep every record when all were created', () => {
    const result = partitionRowsByImportResult({
      recordsToImport,
      createdRecordCount: 3,
    });

    expect(result.createdRecords).toEqual(recordsToImport);
    expect(result.createdCount).toBe(3);
    expect(result.failedRecords).toEqual([]);
    expect(result.failedCount).toBe(0);
    expect(result.isPartial).toBe(false);
  });

  it('should report every record as failed when none was created', () => {
    const result = partitionRowsByImportResult({
      recordsToImport,
      createdRecordCount: 0,
    });

    expect(result.createdRecords).toEqual([]);
    expect(result.failedRecords).toEqual(recordsToImport);
    expect(result.failedCount).toBe(3);
    expect(result.isPartial).toBe(false);
  });

  it('should keep successful rows and report the failed ones on partial failure', () => {
    const result = partitionRowsByImportResult({
      recordsToImport,
      createdRecordCount: 2,
    });

    expect(result.createdRecords).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.createdCount).toBe(2);
    expect(result.failedRecords).toEqual([{ id: '3' }]);
    expect(result.failedCount).toBe(1);
    expect(result.isPartial).toBe(true);
  });

  it('should clamp an out-of-range created count', () => {
    const tooMany = partitionRowsByImportResult({
      recordsToImport,
      createdRecordCount: 10,
    });
    const negative = partitionRowsByImportResult({
      recordsToImport,
      createdRecordCount: -1,
    });

    expect(tooMany.createdCount).toBe(3);
    expect(tooMany.failedCount).toBe(0);
    expect(negative.createdCount).toBe(0);
    expect(negative.failedCount).toBe(3);
  });
});
