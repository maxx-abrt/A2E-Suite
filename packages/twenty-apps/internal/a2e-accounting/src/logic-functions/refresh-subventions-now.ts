import {
  defineLogicFunction,
  HTTPMethod,
  type RoutePayload,
} from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { refreshSubventions } from './handlers/refresh-subventions-handler.ts';

// The same refresh as the nightly cron, on demand: the catalogue page calls
// this so a treasurer never has to wait until tomorrow to see today's calls.
const handler = async (event: RoutePayload): Promise<Response> => {
  const body = event.body as { sources?: string[] } | null;

  try {
    const summary = await refreshSubventions({ sources: body?.sources });

    return new Response(JSON.stringify({ success: true, ...summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.refreshSubventionsNow,
  name: 'refresh-subventions-now',
  description:
    'Rafraîchit le catalogue de subventions à la demande, depuis la page Subventions.',
  timeoutSeconds: 300,
  httpRouteTriggerSettings: {
    path: '/subventions/refresh',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
