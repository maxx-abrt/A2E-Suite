import {
  collectHtmlImportWarnings,
  type HtmlImportWarning,
} from '@/blocknote-editor/import/utils/htmlImportWarnings';
import {
  mapImportedAttachmentsAndLinks,
  type ImportedBlock,
  type ImportedUrlResolvers,
} from '@/blocknote-editor/import/utils/mapImportedAttachmentsAndLinks';
import { runHtmlImportWithRetry } from '@/blocknote-editor/import/utils/runHtmlImportWithRetry';
import { sanitizeImportedHtml } from '@/blocknote-editor/import/utils/sanitizeImportedHtml';
import {
  validateHtmlImportForCreate,
  type HtmlImportRejectionReason,
} from '@/blocknote-editor/import/utils/validateHtmlImportForCreate';

export type HtmlImportStep =
  | 'sanitizing'
  | 'parsing'
  | 'mapping'
  | 'validating';

export type HtmlImportProgress = {
  step: HtmlImportStep;
  attempt: number;
};

export type ImportHtmlToDocumentOptions = ImportedUrlResolvers & {
  html: string;
  // The BlockNote parser is injected so this orchestrator stays free of the
  // editor runtime and unit-testable; the browser wires the real adapter.
  parseHtml: (
    sanitizedHtml: string,
  ) => readonly unknown[] | Promise<readonly unknown[]>;
  maxAttempts?: number;
  retryDelayMs?: number;
  sleep?: (durationMs: number) => Promise<void>;
  onProgress?: (progress: HtmlImportProgress) => void;
};

export type HtmlImportResult =
  | {
      status: 'imported';
      blocks: ImportedBlock[];
      warnings: HtmlImportWarning[];
      attempts: number;
    }
  | {
      status: 'rejected';
      reasons: HtmlImportRejectionReason[];
      warnings: HtmlImportWarning[];
      attempts: number;
    };

// Pure orchestration of the HTML import pipeline: sanitize -> parse (retrying)
// -> map attachments/links -> validate. It never creates a record itself; a
// `rejected` result is the caller's signal to stop before persisting.
export const importHtmlToDocument = async (
  options: ImportHtmlToDocumentOptions,
): Promise<HtmlImportResult> => {
  const { html, parseHtml, onProgress } = options;

  onProgress?.({ step: 'sanitizing', attempt: 1 });
  const sanitizeWarnings = collectHtmlImportWarnings(html);
  const sanitizedHtml = sanitizeImportedHtml(html);

  let attempts = 0;

  const parsedBlocks = await runHtmlImportWithRetry<readonly unknown[]>({
    run: async (attempt) => {
      attempts = attempt;
      onProgress?.({ step: 'parsing', attempt });

      return parseHtml(sanitizedHtml);
    },
    maxAttempts: options.maxAttempts,
    retryDelayMs: options.retryDelayMs,
    sleep: options.sleep,
  });

  onProgress?.({ step: 'mapping', attempt: attempts });
  const { blocks, warnings: mappingWarnings } = mapImportedAttachmentsAndLinks(
    parsedBlocks,
    {
      resolveAttachmentUrl: options.resolveAttachmentUrl,
      resolveLinkUrl: options.resolveLinkUrl,
    },
  );

  onProgress?.({ step: 'validating', attempt: attempts });
  const { valid, reasons } = validateHtmlImportForCreate({
    sanitizedHtml,
    blocks,
  });

  const warnings = [...sanitizeWarnings, ...mappingWarnings];

  if (!valid) {
    return { status: 'rejected', reasons, warnings, attempts };
  }

  return { status: 'imported', blocks, warnings, attempts };
};
