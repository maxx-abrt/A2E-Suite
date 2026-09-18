// Installing A2E Chat must leave a workspace with a usable default channel,
// so a member can post immediately. Seeds are data + a pure idempotency diff
// (the a2e-projects starter-projects pattern): reinstalling an app must never
// duplicate a channel a member already renamed or customized.

export type StarterChannelTemplate = {
  name: string;
  kind: 'WORKSPACE' | 'PROJECT' | 'CUSTOM';
  visibility: 'PUBLIC' | 'PRIVATE';
  topic: string;
  postingRoles: string[];
};

export const DEFAULT_STARTER_CHANNELS: StarterChannelTemplate[] = [
  {
    name: 'Général',
    kind: 'WORKSPACE',
    visibility: 'PUBLIC',
    topic: 'Discussion générale de l’espace de travail',
    postingRoles: ['MEMBER', 'ADMIN'],
  },
  {
    name: 'Annonces',
    kind: 'WORKSPACE',
    visibility: 'PUBLIC',
    topic: 'Annonces réservées aux administrateurs',
    postingRoles: ['ADMIN'],
  },
];

const normalizeChannelName = (name: string): string =>
  name.trim().toLowerCase();

export const findMissingStarterChannels = (
  existingNames: string[],
): StarterChannelTemplate[] => {
  const existing = new Set(existingNames.map(normalizeChannelName));

  return DEFAULT_STARTER_CHANNELS.filter(
    (channel) => !existing.has(normalizeChannelName(channel.name)),
  );
};
