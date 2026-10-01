import { useCallback, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { type TemplateApplyResult } from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';

import {
  applyAgendaTemplateByKey,
  type AgendaCalendarEventInput,
  type AgendaTemplateApplyClient,
} from '@/calendar/utils/applyAgendaTemplate';
import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { type RecordGqlOperationFindManyResult } from '@/object-record/graphql/types/RecordGqlOperationFindManyResult';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useFindManyRecordsQuery } from '@/object-record/hooks/useFindManyRecordsQuery';

const CALENDAR_EVENT_GQL_FIELDS = { id: true, iCalUid: true };

// Host wiring for the Agenda template apply. The pure apply path (US-142) is
// client-injected; this hook supplies the real calendarEvent primitives: a
// record create through the standard record path (never a provider mutation)
// and an iCalUid lookup used only to make a re-applied operation idempotent.
export const useAgendaTemplateApply = () => {
  const { timeZone } = useDateTimeFormat();
  const apolloCoreClient = useApolloCoreClient();
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.CalendarEvent,
  });
  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.CalendarEvent,
    recordGqlFields: CALENDAR_EVENT_GQL_FIELDS,
  });
  const { findManyRecordsQuery } = useFindManyRecordsQuery({
    objectNameSingular: CoreObjectNameSingular.CalendarEvent,
    recordGqlFields: CALENDAR_EVENT_GQL_FIELDS,
  });
  const [isApplying, setIsApplying] = useState(false);

  const applyAgendaTemplateItem = useCallback(
    async (
      key: string,
      operationId: string | null,
    ): Promise<TemplateApplyResult | null> => {
      setIsApplying(true);

      const client: AgendaTemplateApplyClient = {
        findCalendarEventIdsByICalUid: async (iCalUids) => {
          const result =
            await apolloCoreClient.query<RecordGqlOperationFindManyResult>({
              query: findManyRecordsQuery,
              variables: {
                filter: { iCalUid: { in: iCalUids } },
                limit: iCalUids.length,
              },
              fetchPolicy: 'network-only',
            });

          const edges =
            result.data?.[objectMetadataItem.namePlural]?.edges ?? [];
          const existingIdByICalUid = new Map<string, string>();

          for (const edge of edges) {
            const iCalUid = edge.node.iCalUid;

            if (typeof iCalUid === 'string' && iCalUid.length > 0) {
              existingIdByICalUid.set(iCalUid, edge.node.id);
            }
          }

          return existingIdByICalUid;
        },
        createCalendarEvent: async (input: AgendaCalendarEventInput) => {
          const record = await createOneRecord({ ...input });

          return isDefined(record.id) ? String(record.id) : input.id;
        },
      };

      try {
        return await applyAgendaTemplateByKey(
          client,
          { key, operationId },
          { anchorDay: Temporal.Now.plainDateISO(timeZone), timeZone },
        );
      } catch {
        return null;
      } finally {
        setIsApplying(false);
      }
    },
    [
      apolloCoreClient,
      createOneRecord,
      findManyRecordsQuery,
      objectMetadataItem.namePlural,
      timeZone,
    ],
  );

  return { applyAgendaTemplateItem, isApplying };
};
