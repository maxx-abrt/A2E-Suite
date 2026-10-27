import { getFileType } from '@/activities/files/utils/getFileType';
import { sanitizeImportedHtml } from '@/blocknote-editor/import/utils/sanitizeImportedHtml';
import { v4 } from 'uuid';
import { isNonEmptyString } from '@sniptt/guards';
import { preserveNotionFormatting } from '@/blocknote-editor/import/utils/preserveNotionFormatting';
import { decodeEntryTarget } from '@/blocknote-editor/import/utils/documentsTransferEntries';

type PreparedNotionHtml = {
  html: string;
  restoreUrl: (url: string) => string;
};

export const sanitizeNotionHtml = (html: string): string => {
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
  preserveNotionFormatting(parsedDocument);

  // An executable embed cannot become an editor block; retain its destination.
  parsedDocument.querySelectorAll('iframe[src]').forEach((frame) => {
    const link = parsedDocument.createElement('a');
    link.setAttribute('href', frame.getAttribute('src') ?? '');
    link.textContent = frame.getAttribute('title') || link.getAttribute('href');
    frame.replaceWith(link);
  });
  parsedDocument
    .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((checkbox) => {
      const marker = parsedDocument.createElement('span');
      marker.className = checkbox.hasAttribute('checked')
        ? 'checkbox checkbox-on'
        : 'checkbox checkbox-off';
      checkbox.replaceWith(marker);
    });

  return sanitizeImportedHtml(parsedDocument.body.innerHTML);
};

// Translate Notion's export markup into the existing schema's HTML contract.
// Rich text, tables, lists and toggles still go through BlockNote's parser.
export const prepareNotionHtml = (html: string): PreparedNotionHtml => {
  const sanitizedDocument = new DOMParser().parseFromString(
    sanitizeNotionHtml(html),
    'text/html',
  );

  sanitizedDocument
    .querySelectorAll<HTMLElement>('.column-list')
    .forEach((list) => {
      const columns = [...list.children].filter((child) =>
        child.classList.contains('column'),
      );
      if (columns.length < 2) return;
      list.setAttribute('data-node-type', 'columnList');
      columns.forEach((column) => {
        column.setAttribute('data-node-type', 'column');
        const width = parseFloat((column as HTMLElement).style.width);
        column.setAttribute(
          'data-width',
          Number.isFinite(width) && width > 0 ? String(width) : '1',
        );
        if (column.childNodes.length === 0)
          column.appendChild(sanitizedDocument.createElement('p'));
      });
    });

  const makeBlock = (type: string, props: Record<string, string>) => {
    const block = sanitizedDocument.createElement('div');
    block.setAttribute('data-content-type', type);
    Object.entries(props).forEach(([name, value]) =>
      block.setAttribute(`data-${name}`, value),
    );
    return block;
  };

  // The schema has a native table-of-contents block; anchors cannot jump to
  // anything once the page is a serialized editor document, so the nav converts
  // and its anchor links disappear with it.
  sanitizedDocument
    .querySelectorAll('nav[data-notion-toc], nav.table_of_contents')
    .forEach((nav) => {
      const block = sanitizedDocument.createElement('div');
      block.setAttribute('data-content-type', 'tableOfContents');
      nav.replaceWith(block);
    });

  // BlockNote cannot represent in-page jump targets, and the rich-text API
  // rejects `#` hrefs. The link text stays; only the dead protocol is removed.
  sanitizedDocument.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    const parent = anchor.parentElement;
    if (!parent) return;
    const children = [...anchor.childNodes];
    anchor.replaceWith(...children);
    parent.normalize();
  });

  // Inside table cells a page link is a relation; Notion renders it as a chip.
  // The native schema's inline mention carries the same placeholder contract as
  // the page-link block, so the runner resolves both to real record ids.
  sanitizedDocument
    .querySelectorAll('td a[href], th a[href]')
    .forEach((anchor) => {
      const pageId = anchor.getAttribute('data-notion-page-id');
      const href = anchor.getAttribute('href') ?? '';
      const labelSource = anchor.cloneNode(true) as HTMLElement;
      labelSource
        .querySelectorAll<HTMLElement>('.icon, .page-symbol, img')
        .forEach((icon) => icon.remove());
      const label =
        labelSource.textContent?.replace(/\s+/g, ' ').trim() ??
        anchor.getAttribute('title') ??
        '';
      const hasPageTarget =
        isNonEmptyString(pageId ?? undefined) ||
        (!/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) &&
          /\.html?$/i.test(decodeEntryTarget(href.split(/[?#]/)[0])));
      if (label === '' || !hasPageTarget) return;
      const mention = sanitizedDocument.createElement('span');
      mention.setAttribute('data-content-type', 'mention');
      mention.setAttribute(
        'data-record-id',
        isNonEmptyString(pageId ?? undefined) ? `notion:${pageId}` : href,
      );
      mention.setAttribute('data-object-name-singular', 'document');
      mention.setAttribute('data-label', label);
      anchor.replaceWith(mention);
    });

  // Native page links render as the schema's own chip instead of a plain URL
  // link. The target travels as a placeholder; the import runner resolves it to
  // the created record id once every page exists. The exported chip keeps the
  // page icon inside its label, mirroring Notion's icon+title rendering.
  sanitizedDocument
    .querySelectorAll('figure.link-to-page')
    .forEach((figure) => {
      const anchor = figure.querySelector('a[href]');
      if (!anchor) return;
      const target =
        anchor.getAttribute('data-notion-page-id') ??
        anchor.getAttribute('href');
      if (!target) return;
      const icon = figure.querySelector<HTMLElement>('a > .icon');
      const iconText = icon?.dataset.emoji || icon?.textContent?.trim() || '';
      const labelSource = anchor.cloneNode(true) as HTMLElement;
      labelSource
        .querySelectorAll<HTMLElement>('.icon, .page-symbol')
        .forEach((icon) => icon.remove());
      const title =
        `${iconText ? `${iconText} ` : ''}${
          labelSource.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        }`.trim() ?? '';
      const targetKind = anchor.getAttribute('data-notion-page-id')
        ? `notion:${anchor.getAttribute('data-notion-page-id')}`
        : (anchor.getAttribute('href') ?? '');
      const block = sanitizedDocument.createElement('div');
      block.setAttribute('data-content-type', 'pageLink');
      block.setAttribute('data-document-id', targetKind);
      block.setAttribute('data-title', title);
      figure.replaceWith(block);
    });

  // BlockNote reads column widths from per-cell `colwidth` attributes, while the
  // export declares them once in `<colgroup>`. Copying them preserves the
  // exported column proportions in the editable table.
  sanitizedDocument.querySelectorAll('table').forEach((table) => {
    const columns = [...table.querySelectorAll(':scope > colgroup > col')].map(
      (col) => {
        const width = /^\s*(?:width\s*:\s*)?([\d.]+)(px|%)/i.exec(
          col.getAttribute('style') ?? '',
        );
        if (!width) return null;
        const value = parseFloat(width[1]);
        if (!Number.isFinite(value) || value <= 0) return null;
        return Math.round(width[2].toLowerCase() === 'px' ? value : value * 10);
      },
    );
    if (columns.every((value) => value === null)) return;
    const rows = [...table.querySelectorAll('tr')].filter(
      (row) => row.closest('table') === table,
    );
    rows.forEach((row) => {
      let columnIndex = 0;
      row.querySelectorAll(':scope > td, :scope > th').forEach((cell) => {
        const span = Math.max(
          1,
          parseInt(cell.getAttribute('colspan') ?? '1', 10) || 1,
        );
        const widths = columns.slice(columnIndex, columnIndex + span);
        if (widths.length === span && widths.every((width) => width !== null))
          cell.setAttribute('colwidth', widths.join(','));
        columnIndex += span;
      });
    });
  });

  // Native media captions are plain strings. Keep rich caption links and marks
  // in an adjacent editable paragraph rather than flattening that information.
  sanitizedDocument
    .querySelectorAll('figure > figcaption')
    .forEach((caption) => {
      if (
        !caption.querySelector('a, strong, em, b, i, u, s, mark, span[style]')
      )
        return;
      const paragraph = sanitizedDocument.createElement('p');
      paragraph.append(...caption.childNodes);
      caption.parentElement?.after(paragraph);
      caption.remove();
    });

  [...sanitizedDocument.querySelectorAll<HTMLElement>('aside, figure.callout')]
    .reverse()
    .forEach((callout) => {
      const icon = callout.querySelector('.icon');
      const emoji = icon?.textContent?.trim() || '💡';
      if (icon?.parentElement?.childNodes.length === 1)
        icon.parentElement.remove();
      else icon?.remove();
      const content =
        callout.children.length === 1 &&
        callout.firstElementChild?.tagName === 'DIV'
          ? callout.firstElementChild
          : callout;
      const container = sanitizedDocument.createElement('div');
      container.setAttribute('data-node-type', 'blockContainer');
      const block = makeBlock('callout', {
        emoji,
        'background-color': callout.style.backgroundColor || 'default',
        'text-color': callout.style.color || 'default',
      });
      const inline = sanitizedDocument.createElement('span');
      inline.className = 'bn-inline-content';
      const firstElement = content.firstElementChild;
      if (firstElement?.matches('p, h1, h2, h3, h4, h5, h6')) {
        inline.append(...firstElement.childNodes);
        firstElement.remove();
      } else {
        while (
          content.firstChild &&
          (content.firstChild.nodeType === Node.TEXT_NODE ||
            (content.firstChild instanceof Element &&
              content.firstChild.matches(
                'span, a, strong, em, b, i, u, s, code, br',
              )))
        ) {
          inline.appendChild(content.firstChild);
        }
      }
      block.appendChild(inline);
      container.appendChild(block);
      if (content.childNodes.length > 0) {
        const children = sanitizedDocument.createElement('div');
        children.setAttribute('data-node-type', 'blockGroup');
        children.append(...content.childNodes);
        container.appendChild(children);
      }
      callout.replaceWith(container);
    });

  sanitizedDocument.querySelectorAll<HTMLElement>('li').forEach((item) => {
    const checkbox = item.querySelector(
      ':scope > .checkbox, :scope > .checkbox-on, :scope > .checkbox-off',
    );
    if (!checkbox) return;
    item.setAttribute('data-content-type', 'checkListItem');
    item.setAttribute(
      'data-checked',
      String(checkbox.classList.contains('checkbox-on')),
    );
    checkbox.remove();
    const inline = sanitizedDocument.createElement('span');
    inline.className = 'bn-inline-content';
    [...item.childNodes]
      .filter((node) => !(node instanceof Element && node.matches('ul, ol')))
      .forEach((node) => inline.appendChild(node));
    item.prepend(inline);
  });

  sanitizedDocument.querySelectorAll('video, audio').forEach((media) => {
    if (!media.getAttribute('src')) {
      const source = media.querySelector('source[src]');
      if (source) media.setAttribute('src', source.getAttribute('src') ?? '');
    }
  });

  sanitizedDocument
    .querySelectorAll<HTMLElement>('figure.file, figure.pdf')
    .forEach((figure) => {
      const link = figure.querySelector('a[href]');
      if (!link) return;
      const url = link.getAttribute('href') ?? '';
      const name =
        link.textContent?.trim() || url.split('/').pop() || 'Attachment';
      const block = makeBlock('file', {
        url,
        name,
        'file-category': getFileType(url.split(/[?#]/)[0]),
      });
      const caption = figure.querySelector('figcaption');
      figure.replaceWith(block);
      if (caption?.textContent?.trim()) {
        const paragraph = sanitizedDocument.createElement('p');
        paragraph.append(...caption.childNodes);
        block.after(paragraph);
      }
    });

  // Native media parsers use element.src, which resolves relative paths against
  // the app URL. Temporary absolute URLs preserve the archive reference exactly.
  const originalUrls = new Map<string, string>();
  const prefix = `https://bureau-import.invalid/${v4()}/`;
  sanitizedDocument
    .querySelectorAll('[href], [src], [data-url]')
    .forEach((element) => {
      for (const attribute of ['href', 'src', 'data-url']) {
        const url = element.getAttribute(attribute);
        if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
        const placeholder = `${prefix}${originalUrls.size}`;
        originalUrls.set(placeholder, url);
        element.setAttribute(attribute, placeholder);
      }
    });

  return {
    html: sanitizedDocument.body.innerHTML,
    restoreUrl: (url) => originalUrls.get(url) ?? url,
  };
};
