import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { TodoTaskView } from '@/blocknote-editor/blocks/views/TodoTaskView';
import { buildTaskFromTodoBlockInput } from '@/blocknote-editor/utils/buildTaskFromTodoBlockInput';
import { getInlineContentPlainText } from '@/blocknote-editor/utils/getInlineContentPlainText';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { v4 } from 'uuid';

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
    <TodoTaskView
      checked={checked}
      title={taskTitle}
      taskId={taskId}
      isConverting={isConverting}
      onToggleChecked={handleToggleChecked}
      onConvertToTask={handleConvertToTask}
      contentRef={contentRef}
    />
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
