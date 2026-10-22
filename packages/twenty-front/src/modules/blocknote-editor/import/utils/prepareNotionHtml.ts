import { getFileType } from '@/activities/files/utils/getFileType';
import { sanitizeImportedHtml } from '@/blocknote-editor/import/utils/sanitizeImportedHtml';
import { v4 } from 'uuid';

type PreparedNotionHtml = {
  html: string;
  restoreUrl: (url: string) => string;
};

export const sanitizeNotionHtml = (html: string): string => {
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html');

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
      const block = makeBlock('callout', { emoji });
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
