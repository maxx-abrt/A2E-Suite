import { isBlockedUrl } from '@/advanced-text-editor/utils/sanitizeHtmlPreview';

// Machine-readable import warnings, mirroring `exportFidelity`'s key approach:
// the UI maps these to localized strings so this util stays Lingui-free and
// trivially testable with `unknown` structural inputs.
export type HtmlImportWarningKind =
  | 'script-removed'
  | 'unsafe-embed-removed'
  | 'active-content-removed'
  | 'unsupported-element-removed'
  | 'unsafe-attribute-removed'
  | 'unsafe-url-removed'
  | 'attachment-unmapped'
  | 'link-unmapped';

export type HtmlImportWarning = {
  kind: HtmlImportWarningKind;
  element: string;
};

// Elements removed together with their subtree: they execute or embed code, so
// keeping their children would leave the payload behind.
export const SCRIPT_TAGS = new Set(['script']);

export const UNSAFE_EMBED_TAGS = new Set([
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
]);

export const ACTIVE_CONTENT_TAGS = new Set([
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'canvas',
  'keygen',
]);

// Readable but not representable as a BlockNote block; dropped explicitly
// rather than silently flattened into the surrounding paragraph.
export const UNSUPPORTED_STRUCTURE_TAGS = new Set([
  'style',
  'link',
  'meta',
  'base',
  'title',
  'noscript',
  'template',
  'svg',
  'math',
]);

export const URL_ATTRIBUTE_NAMES = new Set([
  'href',
  'src',
  'xlink:href',
  'action',
  'formaction',
  'poster',
  'data',
  'background',
  'dynsrc',
  'lowsrc',
]);

const REMOVED_TAGS = new Set([
  ...SCRIPT_TAGS,
  ...UNSAFE_EMBED_TAGS,
  ...ACTIVE_CONTENT_TAGS,
  ...UNSUPPORTED_STRUCTURE_TAGS,
]);

export const isRemovedHtmlImportTag = (tagName: string): boolean =>
  REMOVED_TAGS.has(tagName);

const warn = (
  warnings: HtmlImportWarning[],
  kind: HtmlImportWarningKind,
  element: string,
): void => {
  warnings.push({ kind, element });
};

export const collectHtmlImportWarnings = (
  html: string,
): HtmlImportWarning[] => {
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
  const warnings: HtmlImportWarning[] = [];

  // Whole document, not just the body: the parser hoists `script`/`style`/
  // `meta` into `head`, and those are exactly the payloads we must report.
  parsedDocument.querySelectorAll('*').forEach((element) => {
    const tagName = element.tagName.toLowerCase();

    if (SCRIPT_TAGS.has(tagName)) {
      warn(warnings, 'script-removed', tagName);
    } else if (UNSAFE_EMBED_TAGS.has(tagName)) {
      warn(warnings, 'unsafe-embed-removed', tagName);
    } else if (ACTIVE_CONTENT_TAGS.has(tagName)) {
      warn(warnings, 'active-content-removed', tagName);
    } else if (UNSUPPORTED_STRUCTURE_TAGS.has(tagName)) {
      warn(warnings, 'unsupported-element-removed', tagName);
    }

    for (const attribute of [...element.attributes]) {
      const attributeName = attribute.name.toLowerCase();

      if (attributeName.startsWith('on') || attributeName === 'srcdoc') {
        warn(warnings, 'unsafe-attribute-removed', attributeName);
        continue;
      }

      if (
        URL_ATTRIBUTE_NAMES.has(attributeName) &&
        isBlockedUrl(attributeName, attribute.value)
      ) {
        warn(warnings, 'unsafe-url-removed', tagName);
      }
    }
  });

  return warnings;
};

// Precise residue check for the pre-create gate: parses and inspects real
// elements/attributes, so a paragraph whose text merely mentions
// `javascript:` is not mistaken for an unsafe payload.
export const hasUnsafeHtmlImportMarkup = (html: string): boolean => {
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
  const unsafeTags = new Set([
    ...SCRIPT_TAGS,
    ...UNSAFE_EMBED_TAGS,
    ...ACTIVE_CONTENT_TAGS,
  ]);

  return [...parsedDocument.querySelectorAll('*')].some((element) => {
    if (unsafeTags.has(element.tagName.toLowerCase())) {
      return true;
    }

    return [...element.attributes].some((attribute) => {
      const attributeName = attribute.name.toLowerCase();

      if (attributeName.startsWith('on') || attributeName === 'srcdoc') {
        return true;
      }

      return (
        URL_ATTRIBUTE_NAMES.has(attributeName) &&
        isBlockedUrl(attributeName, attribute.value)
      );
    });
  });
};
