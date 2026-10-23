import { RecordQuickCreateForm } from '@/object-record/record-create/components/RecordQuickCreateForm';
import { RecordTableActionRow } from '@/object-record/record-table/record-table-row/components/RecordTableActionRow';
import { useLingui } from '@lingui/react/macro';
import { useRef, useState } from 'react';
import { IconPlus } from 'twenty-ui/icon';

type RecordTableInlineCreateRowProps = {
  objectNameSingular: string;
  onCreate: (title: string) => Promise<unknown>;
};

export const RecordTableInlineCreateRow = ({
  objectNameSingular,
  onCreate,
}: RecordTableInlineCreateRowProps) => {
  const { t } = useLingui();
  const [isEditing, setIsEditing] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);
  const label = objectNameSingular === 'task' ? t`Add task` : t`Add project`;

  return (
    <RecordTableActionRow
      LeftIcon={IconPlus}
      text={label}
      actionRef={actionRef}
      onClick={isEditing ? undefined : () => setIsEditing(true)}
    >
      {isEditing ? (
        <RecordQuickCreateForm
          label={label}
          onCreate={onCreate}
          onCancel={() => {
            actionRef.current?.focus();
            setIsEditing(false);
          }}
        />
      ) : undefined}
    </RecordTableActionRow>
  );
};
