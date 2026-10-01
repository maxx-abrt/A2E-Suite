import { isNonEmptyString } from '@sniptt/guards';

// Markdown -> BlockNote block conversion for the Bureau import path.
//
// The mapping is deliberately an explicit table (`MARKDOWN_BLOCK_CONVERTERS`)
// keyed by the block kinds the editor can actually represent, so every
// supported construct is testable in isolation and anything outside the table
// degrades to a paragraph instead of being dropped silently. This is the
// markdown half of M8g; the Notion zip walker feeds each page's markdown back
// through this same conversion.

export type MarkdownBlockKind =
  | 'heading'
  | 'paragraph'
  | 'bulletListItem'
  | 'numberedListItem'
  | 'checkListItem'
  | 'codeBlock'
  | 'quote'
  | 'image'
  | 'divider';

export type MarkdownInlineText = {
  type: 'text';
  text: string;
  styles: Record<string, boolean>;
};

export type MarkdownInlineContent =
  | MarkdownInlineText
  | {
      type: 'link';
      href: string;
      content: MarkdownInlineText[];
    };

export type MarkdownImportedBlock = {
  type: string;
  props: Record<string, unknown>;
  content: MarkdownInlineContent[];
  children: MarkdownImportedBlock[];
};

export type MarkdownBlockDescriptor = {
  kind: MarkdownBlockKind;
  text: string;
  level?: number;
  checked?: boolean;
  language?: string;
  url?: string;
  caption?: string;
};

export type MarkdownBlockConverter = (
  descriptor: MarkdownBlockDescriptor,
) => MarkdownImportedBlock;

const textInline = (text: string): MarkdownInlineText => ({
  type: 'text',
  text,
  styles: {},
});

export const parseMarkdownInline = (text: string): MarkdownInlineContent[] => {
  const inlineContent: MarkdownInlineContent[] = [];
  // Earliest-match scan: code first so emphasis inside `` `code` `` is literal,
  // then links, then bold/italic/strike. Not a full CommonMark inline parser —
  // it covers the constructs Notion and hand-written markdown actually emit.
  const tokenPattern =
    /(`[^`]+`|\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|~~[^~]+~~)/;
  let remaining = text;

  while (remaining.length > 0) {
    const match = tokenPattern.exec(remaining);

    if (match === null) {
      inlineContent.push(textInline(remaining));
      break;
    }

    if (match.index > 0) {
      inlineContent.push(textInline(remaining.slice(0, match.index)));
    }

    const token = match[1];
    remaining = remaining.slice(match.index + token.length);

    if (token.startsWith('`')) {
      inlineContent.push({
        type: 'text',
        text: token.slice(1, -1),
        styles: { code: true },
      });
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]*)\]\(([^)]+)\)$/.exec(token);

      if (linkMatch === null) {
        inlineContent.push(textInline(token));
      } else {
        inlineContent.push({
          type: 'link',
          href: linkMatch[2],
          content: [textInline(linkMatch[1])],
        });
      }
    } else if (token.startsWith('**') || token.startsWith('__')) {
      inlineContent.push({
        type: 'text',
        text: token.slice(2, -2),
        styles: { bold: true },
      });
    } else if (token.startsWith('~~')) {
      inlineContent.push({
        type: 'text',
        text: token.slice(2, -2),
        styles: { strike: true },
      });
    } else {
      inlineContent.push({
        type: 'text',
        text: token.slice(1, -1),
        styles: { italic: true },
      });
    }
  }

  return inlineContent;
};

const buildBlock = (
  type: string,
  props: Record<string, unknown>,
  content: MarkdownInlineContent[],
  children: MarkdownImportedBlock[] = [],
): MarkdownImportedBlock => ({ type, props, content, children });

// One converter per supported kind. `satisfies` keeps the table total: adding a
// `MarkdownBlockKind` without a converter is a compile error, which is how the
// "explicit conversion table" stays honest over time.
export const MARKDOWN_BLOCK_CONVERTERS = {
  heading: ({ text, level }) =>
    buildBlock('heading', { level: level ?? 1 }, parseMarkdownInline(text)),
  paragraph: ({ text }) =>
    buildBlock('paragraph', {}, parseMarkdownInline(text)),
  bulletListItem: ({ text }) =>
    buildBlock('bulletListItem', {}, parseMarkdownInline(text)),
  numberedListItem: ({ text }) =>
    buildBlock('numberedListItem', {}, parseMarkdownInline(text)),
  checkListItem: ({ text, checked }) =>
    buildBlock(
      'checkListItem',
      { checked: checked === true },
      parseMarkdownInline(text),
    ),
  codeBlock: ({ text, language }) =>
    buildBlock(
      'codeBlock',
      { language: isNonEmptyString(language) ? language : 'text' },
      text === '' ? [] : [textInline(text)],
    ),
  quote: ({ text }) => buildBlock('quote', {}, parseMarkdownInline(text)),
  image: ({ url, caption }) => ({
    type: 'image',
    props: {
      url: url ?? '',
      caption: caption ?? '',
      name: caption ?? '',
    },
    content: [],
    children: [],
  }),
  divider: () => buildBlock('divider', {}, []),
} satisfies Record<MarkdownBlockKind, MarkdownBlockConverter>;

const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const FENCE_PATTERN = /^```\s*([^\s`]*)\s*$/;
const DIVIDER_PATTERN = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const BULLET_PATTERN = /^[-*+]\s+(.*)$/;
const TASK_PATTERN = /^[-*+]\s+\[([ xX])\]\s+(.*)$/;
const NUMBERED_PATTERN = /^\d+[.)]\s+(.*)$/;
const QUOTE_PATTERN = /^>\s?(.*)$/;
const IMAGE_PATTERN = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;

const makeDescriptor = (
  kind: MarkdownBlockKind,
  text: string,
  extra: Partial<MarkdownBlockDescriptor> = {},
): MarkdownBlockDescriptor => ({ kind, text, ...extra });

// The paragraph converter is the designated fallback: any line that matches no
// supported construct still lands as readable paragraph text.
const paragraphDescriptor = (text: string): MarkdownBlockDescriptor => ({
  kind: 'paragraph',
  text,
});

export const markdownToImportedBlocks = (
  markdown: string,
): MarkdownImportedBlock[] => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownImportedBlock[] = [];
  const convert = (
    descriptor: MarkdownBlockDescriptor,
  ): MarkdownImportedBlock =>
    MARKDOWN_BLOCK_CONVERTERS[descriptor.kind](descriptor);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      continue;
    }

    const fenceMatch = FENCE_PATTERN.exec(trimmedLine);

    if (fenceMatch !== null) {
      const codeLines: string[] = [];

      index += 1;
      while (index < lines.length && !FENCE_PATTERN.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push(
        convert(
          makeDescriptor('codeBlock', codeLines.join('\n'), {
            language: fenceMatch[1],
          }),
        ),
      );
      continue;
    }

    const headingMatch = HEADING_PATTERN.exec(trimmedLine);

    if (headingMatch !== null) {
      blocks.push(
        convert(
          makeDescriptor('heading', headingMatch[2], {
            level: headingMatch[1].length,
          }),
        ),
      );
      continue;
    }

    if (DIVIDER_PATTERN.test(trimmedLine)) {
      blocks.push(convert(makeDescriptor('divider', '')));
      continue;
    }

    const imageMatch = IMAGE_PATTERN.exec(trimmedLine);

    if (imageMatch !== null) {
      blocks.push(
        convert(
          makeDescriptor('image', '', {
            url: imageMatch[2],
            caption: imageMatch[1],
          }),
        ),
      );
      continue;
    }

    const taskMatch = TASK_PATTERN.exec(trimmedLine);

    if (taskMatch !== null) {
      blocks.push(
        convert(
          makeDescriptor('checkListItem', taskMatch[2], {
            checked: taskMatch[1].toLowerCase() === 'x',
          }),
        ),
      );
      continue;
    }

    const bulletMatch = BULLET_PATTERN.exec(trimmedLine);

    if (bulletMatch !== null) {
      blocks.push(convert(makeDescriptor('bulletListItem', bulletMatch[1])));
      continue;
    }

    const numberedMatch = NUMBERED_PATTERN.exec(trimmedLine);

    if (numberedMatch !== null) {
      blocks.push(
        convert(makeDescriptor('numberedListItem', numberedMatch[1])),
      );
      continue;
    }

    const quoteMatch = QUOTE_PATTERN.exec(trimmedLine);

    if (quoteMatch !== null) {
      const quoteLines = [quoteMatch[1]];

      while (index + 1 < lines.length) {
        const nextQuoteMatch = QUOTE_PATTERN.exec(lines[index + 1].trim());

        if (nextQuoteMatch === null) {
          break;
        }

        quoteLines.push(nextQuoteMatch[1]);
        index += 1;
      }

      blocks.push(convert(makeDescriptor('quote', quoteLines.join('\n'))));
      continue;
    }

    blocks.push(convert(paragraphDescriptor(trimmedLine)));
  }

  return blocks;
};
