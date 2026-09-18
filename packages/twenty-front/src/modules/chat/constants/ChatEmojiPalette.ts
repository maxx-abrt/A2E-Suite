// twenty-ui ships icons, not an emoji set. The chat picker and reaction row use
// this fixed, curated palette so a reaction always renders the same glyph for
// every member, and the set stays small enough to render without a virtualized
// picker package.
export const CHAT_EMOJI_PALETTE = [
  '👍',
  '❤️',
  '😂',
  '🎉',
  '🚀',
  '👀',
  '🙌',
  '✅',
  '🔥',
  '🙏',
  '😍',
  '😅',
] as const;

export type ChatEmoji = (typeof CHAT_EMOJI_PALETTE)[number];
