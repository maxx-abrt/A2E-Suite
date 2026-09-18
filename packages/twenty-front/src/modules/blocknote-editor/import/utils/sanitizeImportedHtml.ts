import { isBlockedUrl } from '@/advanced-text-editor/utils/sanitizeHtmlPreview';

import {
  URL_ATTRIBUTE_NAMES,
  isRemovedHtmlImportTag,
} from '@/blocknote-editor/import/utils/htmlImportWarnings';

// Import-specific sanitizer: shares the URL scheme policy with
// `sanitizeHtmlPreview` but removes a wider element set (active content and
// non-representable structure) so the BlockNote parser only ever sees markup
// it can turn into blocks.
export const sanitizeImportedHtml = (html: string): string => {
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html');

  parsedDocument.querySelectorAll('*').forEach((element) => {
    if (isRemovedHtmlImportTag(element.tagName.toLowerCase())) {
      element.remove();
    }
  });

  parsedDocument.body.querySelectorAll('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const attributeName = attribute.name.toLowerCase();

      if (attributeName.startsWith('on') || attributeName === 'srcdoc') {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (
        URL_ATTRIBUTE_NAMES.has(attributeName) &&
        isBlockedUrl(attributeName, attribute.value)
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  return parsedDocument.body.innerHTML;
};
