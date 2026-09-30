import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { buildTaskFromTodoBlockInput } from '@/blocknote-editor/utils/buildTaskFromTodoBlockInput';
import { getInlineContentPlainText } from '@/blocknote-editor/utils/getInlineContentPlainText';
import { MentionRecordChip } from '@/mention/components/MentionRecordChip';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { createReactBlockSpec } from '@blocknote/react';
import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconCheck } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { v4 } from 'uuid';

const StyledTodoTaskLine = styled.div<{ $checked: boolean }>`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  opacity: ${({ $checked }) => ($checked ? 0.6 : 1)};
  width: 100%;
`;

const StyledCheckbox = styled.button`
  align-items: center;
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  height: 14px;
  justify-content: center;
  padding: 0;
  width: 14px;
`;

const StyledContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const StyledActions = styled.div`
  display: flex;
  flex-shrink: 0;
`;

type TodoTaskRenderProps = {
  editor: typeof BLOCK_SCHEMA.BlockNoteEditor;
  blockId: string;
  checked: boolean;
  taskId: string;
  content: unknown;
  contentRef: (element: HTMLElement | null) => void;
};

const TodoTaskRender = ({
  editor,
  blockId,
  checked,
  taskId,
  content,
  contentRef,
}: TodoTaskRenderProps) => {
  const [isConverting, setIsConverting] = useState(false);

  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.Task,
    recordGqlFields: { id: true, title: true, status: true },
  });

  const taskTitle = getInlineContentPlainText(content);
  const hasTask = isNonEmptyString(taskId);

  const handleToggleChecked = () => {
    editor.updateBlock(blockId, { props: { checked: !checked } });
  };

  const handleConvertToTask = async () => {
    const taskInput = buildTaskFromTodoBlockInput({
      taskId: v4(),
      title: taskTitle,
    });

    if (!isDefined(taskInput)) {
      return;
    }

    setIsConverting(true);

    try {
      await createOneRecord(taskInput);

      editor.updateBlock(blockId, { props: { taskId: taskInput.id } });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <StyledTodoTaskLine $checked={checked}>
      <StyledCheckbox
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={t`Toggle to-do`}
        onClick={handleToggleChecked}
      >
        {checked ? <IconCheck size={10} /> : null}
      </StyledCheckbox>
      <StyledContent ref={contentRef} />
      {hasTask ? (
        <MentionRecordChip
          recordId={taskId}
          objectNameSingular={CoreObjectNameSingular.Task}
          label={taskTitle}
          imageUrl=""
        />
      ) : (
        <StyledActions>
          <Button
            title={t`Convert to task`}
            size="small"
            disabled={isConverting || taskTitle.length === 0}
            onClick={handleConvertToTask}
          />
        </StyledActions>
      )}
    </StyledTodoTaskLine>
  );
};

export const TodoTaskBlock = createReactBlockSpec(
  {
    type: 'todoTask',
    propSchema: {
      checked: {
        default: false,
      },
      taskId: {
        default: '',
      },
    },
    content: 'inline',
  },
  {
    render: ({ block, editor, contentRef }) => (
      <TodoTaskRender
        editor={editor as unknown as typeof BLOCK_SCHEMA.BlockNoteEditor}
        blockId={block.id}
        checked={block.props.checked}
        taskId={block.props.taskId}
        content={block.content}
        contentRef={contentRef}
      />
    ),
    // Markdown/DOCX receive a GFM checkbox when still open; a converted to-do
    // falls back to plain text so the exported page never shows a dangling id.
    toExternalHTML: ({ block, contentRef }) => (
      <ul>
        <li>
          <span>{block.props.checked ? '☑ ' : '☐ '}</span>
          <span ref={contentRef} />
        </li>
      </ul>
    ),
  },
);
