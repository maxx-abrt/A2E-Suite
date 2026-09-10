import { useLingui } from '@lingui/react/macro';
import { css } from '@linaria/core';
import { useEffect, useMemo } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type RemoteDocumentCursor } from '~/modules/blocknote-editor/co-editing/hooks/useDocumentCursors';

const CURSOR_COLOR_CYCLE = [
  themeCssVariables.color.blue,
  themeCssVariables.color.orange,
  themeCssVariables.color.purple,
  themeCssVariables.color.jade,
];

const remoteCursorColor = (userId: string): string => {
  let colorSum = 0;

  for (const character of userId) {
    colorSum += character.charCodeAt(0);
  }

  return CURSOR_COLOR_CYCLE[colorSum % CURSOR_COLOR_CYCLE.length];
};

// Pure-DOM markers must carry their styles via a compiled class: Linaria
// styled components only emit classes onto React-rendered elements.
const remoteCaretCss = css`
  border-left: 2px solid var(--remote-cursor-color);
  display: inline-block;
  height: 1.2em;
  margin-left: -1px;
  position: absolute;
  right: 0;
  top: 0;
  vertical-align: text-bottom;
  width: 0;
`;

const remoteCaretLabelCss = css`
  background: var(--remote-cursor-color);
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.background.primary};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  left: 2px;
  padding: 0 ${themeCssVariables.spacing[1]};
  position: absolute;
  top: -${themeCssVariables.font.size.xxs};
  white-space: nowrap;
`;

type BlockEditorRemoteCursorsEffectProps = {
  editorDomElement: HTMLElement | null;
  remoteCursors: RemoteDocumentCursor[];
  memberNameByUserId: Map<string, string>;
};

// Remote carets are appended INTO the caret block's DOM element (blocknote
// tags blocks with data-id), so browser layout positions them without any
// overlay math. Rerendering replaces the whole marker set; carets for blocks
// that scrolled out of the DOM simply re-appear when scrolled back.
export const BlockEditorRemoteCursorsEffect = ({
  editorDomElement,
  remoteCursors,
  memberNameByUserId,
}: BlockEditorRemoteCursorsEffectProps) => {
  const { t } = useLingui();

  const cursorsByBlockId = useMemo(() => {
    const cursorsByBlockId = new Map<
      string,
      { label: string; cursorColor: string }
    >();

    for (const remoteCursor of remoteCursors) {
      cursorsByBlockId.set(remoteCursor.blockId, {
        label: memberNameByUserId.get(remoteCursor.userId) ?? t`…`,
        cursorColor: remoteCursorColor(remoteCursor.userId),
      });
    }

    return cursorsByBlockId;
  }, [remoteCursors, memberNameByUserId, t]);

  useEffect(() => {
    if (editorDomElement === null) {
      return;
    }

    const markers: HTMLElement[] = [];
    const styledBlocks: HTMLElement[] = [];

    for (const [blockId, cursor] of cursorsByBlockId) {
      const caretBlockElement = editorDomElement.querySelector<HTMLElement>(
        `[data-id="${blockId}"]`,
      );

      if (caretBlockElement === null) {
        continue;
      }

      // Relative positioning lives on the inline style, not the shared
      // class: blocknote owns the block element's class list.
      caretBlockElement.style.position = 'relative';
      styledBlocks.push(caretBlockElement);

      const remoteCaret = document.createElement('span');
      remoteCaret.setAttribute('data-remote-cursor-marker', '');
      remoteCaret.className = remoteCaretCss;
      remoteCaret.style.setProperty(
        '--remote-cursor-color',
        cursor.cursorColor,
      );

      const remoteCaretLabel = document.createElement('span');
      remoteCaretLabel.textContent = cursor.label;
      remoteCaretLabel.className = remoteCaretLabelCss;

      remoteCaret.appendChild(remoteCaretLabel);
      caretBlockElement.appendChild(remoteCaret);

      markers.push(remoteCaret);
    }

    return () => {
      for (const marker of markers) {
        marker.remove();
      }

      for (const styledBlock of styledBlocks) {
        styledBlock.style.removeProperty('position');
      }
    };
  }, [cursorsByBlockId, editorDomElement]);

  return null;
};
