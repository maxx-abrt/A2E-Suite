// Notion exports colors as classes; the native parser reads inline span styles.
// These are source-format fallback values; UI theme colors would change the data.
// oxlint-disable twenty/no-hardcoded-colors
const NOTION_COLORS: Partial<
  Record<string, { text: string; background: string }>
> = {
  gray: { text: 'rgb(120, 119, 116)', background: 'rgb(241, 241, 239)' },
  brown: { text: 'rgb(159, 107, 83)', background: 'rgb(244, 238, 238)' },
  orange: { text: 'rgb(217, 115, 13)', background: 'rgb(251, 236, 221)' },
  yellow: { text: 'rgb(203, 145, 47)', background: 'rgb(251, 243, 219)' },
  teal: { text: 'rgb(68, 131, 97)', background: 'rgb(237, 243, 236)' },
  green: { text: 'rgb(68, 131, 97)', background: 'rgb(237, 243, 236)' },
  blue: { text: 'rgb(51, 126, 169)', background: 'rgb(231, 243, 248)' },
  purple: { text: 'rgb(144, 101, 176)', background: 'rgb(244, 240, 247)' },
  pink: { text: 'rgb(193, 76, 138)', background: 'rgb(249, 238, 243)' },
  red: { text: 'rgb(212, 76, 71)', background: 'rgb(253, 235, 236)' },
};
// oxlint-enable twenty/no-hardcoded-colors

export const preserveNotionFormatting = (document: Document) => {
  const exportStyles = [...document.querySelectorAll('style')]
    .map((element) => element.textContent ?? '')
    .join('\n');
  document
    .querySelectorAll<HTMLElement>(
      '[data-notion-highlight], [class*="highlight-"], [class*="block-color-"], [class*="select-value-color-"]',
    )
    .forEach((element) => {
      const token =
        element.getAttribute('data-notion-highlight') ??
        [...element.classList]
          .map(
            (name) =>
              /^(?:highlight-|block-color-|select-value-color-)(.+)$/.exec(
                name,
              )?.[1],
          )
          .find((value) => value !== undefined);
      if (!token) return;
      const isBackground =
        token.endsWith('_background') ||
        element.classList.contains(`select-value-color-${token}`);
      const color = NOTION_COLORS[token.replace(/_background$/, '')];
      if (!color) return;
      const className = [...element.classList].find((name) =>
        /^(?:highlight-|block-color-|select-value-color-)[a-z_]+$/.test(name),
      );
      const declarations = className
        ? new RegExp(`\\.${className}\\s*\\{([^}]+)\\}`).exec(exportStyles)?.[1]
        : undefined;
      const exportedColor = declarations
        ? /(?:^|;)\s*(?:color|background(?:-color)?)\s*:\s*([^;]+)/.exec(
            declarations,
          )?.[1]
        : undefined;
      if (isBackground)
        element.style.backgroundColor ||= exportedColor ?? color.background;
      else element.style.color ||= exportedColor ?? color.text;
    });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes: Node[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    if (!node.textContent?.trim()) continue;
    let element = node.parentElement;
    let textColor = '';
    let backgroundColor = '';
    while (element && element !== document.body) {
      textColor ||= element.style.color;
      backgroundColor ||= element.style.backgroundColor;
      element = element.parentElement;
    }
    if (!textColor && !backgroundColor) continue;
    if (
      node.parentElement?.tagName === 'SPAN' &&
      node.parentElement.style.color === textColor &&
      node.parentElement.style.backgroundColor === backgroundColor
    )
      continue;
    const span = document.createElement('span');
    if (textColor) span.style.color = textColor;
    if (backgroundColor) span.style.backgroundColor = backgroundColor;
    node.parentNode?.replaceChild(span, node);
    span.appendChild(node);
  }
  document.querySelectorAll<HTMLElement>('[data-emoji]').forEach((element) => {
    if (!element.textContent?.trim())
      element.textContent = element.dataset.emoji ?? '';
  });
  document
    .querySelectorAll('.property-icon, .status-dot')
    .forEach((element) => element.remove());
  document
    .querySelectorAll<HTMLElement>('[data-notion-equation]')
    .forEach((element) => {
      const code = document.createElement('code');
      code.textContent = element.dataset.notionEquation ?? '';
      if (element.tagName === 'FIGURE') {
        const pre = document.createElement('pre');
        code.className = 'language-latex';
        pre.appendChild(code);
        element.replaceWith(pre);
      } else element.replaceWith(code);
    });
};
