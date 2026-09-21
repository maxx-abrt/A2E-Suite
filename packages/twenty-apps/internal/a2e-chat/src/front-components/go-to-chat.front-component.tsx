import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, navigate } from 'twenty-sdk/front-component';

import { CHAT_DISCUSSIONS_PATH } from '../lib/chat-navigation.ts';

// GO TO CHAT (anatomy rule: every app pins "Go to <app>").
export const GO_TO_CHAT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31c0000-0013-4000-8000-000000000002';

const GoToChatCommand = () => {
  const execute = async (): Promise<void> => {
    await navigate(CHAT_DISCUSSIONS_PATH);
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: GO_TO_CHAT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'go-to-chat-command',
  description: 'Ouvre la page des discussions.',
  component: GoToChatCommand,
});
