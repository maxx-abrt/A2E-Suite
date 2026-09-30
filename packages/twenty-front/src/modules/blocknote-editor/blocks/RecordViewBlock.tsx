import { createReactBlockSpec } from '@blocknote/react';
import { isNonEmptyString } from '@sniptt/guards';

import { RecordViewEmbedHost } from '@/blocknote-editor/components/RecordViewEmbedHost';
import { getRecordViewEmbedExportText } from '@/blocknote-editor/utils/getRecordViewEmbedExportText';

// A live native view (table/kanban/calendar/list) of any object, embedded in a
// page. Read-only first: the host renders the shared record-table widget stack.
export const RecordViewBlock = createReactBlockSpec(
  {
    type: 'recordView',
    propSchema: {
      viewId: { default: '' },
      viewName: { default: '' },
      objectMetadataId: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <RecordViewEmbedHost
        blockId={block.id}
        viewId={block.props.viewId}
        viewName={block.props.viewName}
        objectMetadataId={block.props.objectMetadataId}
        onSelectView={(selection) =>
          editor.updateBlock(block.id, { props: selection })
        }
      />
    ),
    toExternalHTML: ({ block }) => {
      const exportText = getRecordViewEmbedExportText(block.props.viewName);

      return isNonEmptyString(exportText) ? <p>{exportText}</p> : <p />;
    },
  },
);
