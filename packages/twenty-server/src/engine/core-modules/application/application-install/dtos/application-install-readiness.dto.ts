import { Field, ObjectType } from '@nestjs/graphql';

// Read-only pre-install report: whether an app can be installed in this
// workspace right now. Mirrors the template-preview readiness fields and reads
// the same registration/compatibility sources as the install path.
@ObjectType()
export class ApplicationInstallReadinessDTO {
  @Field(() => String)
  universalIdentifier: string;

  @Field(() => Boolean)
  registered: boolean;

  @Field(() => Boolean)
  versionCompatible: boolean;

  @Field(() => Boolean)
  currentlyInstalled: boolean;

  @Field(() => Boolean)
  ready: boolean;

  @Field(() => String, { nullable: true })
  blockedReason: string | null;
}
