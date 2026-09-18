import { type MentionTarget } from 'src/modules/mention/types/mention.type';

// Keeps only targets whose access check resolved true. The check is injected so
// the suppression rule stays pure and unit-testable, while the service wires the
// real record/channel ACL.
export const filterPermittedMentionTargets = async ({
  targets,
  canTargetRead,
}: {
  targets: MentionTarget[];
  canTargetRead: (target: MentionTarget) => Promise<boolean>;
}): Promise<MentionTarget[]> => {
  const decisions = await Promise.all(
    targets.map(async (target) => ({
      target,
      permitted: await canTargetRead(target),
    })),
  );

  return decisions
    .filter((decision) => decision.permitted)
    .map((decision) => decision.target);
};
