import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('VersionInfo')
export class VersionInfoDTO {
  @Field(() => String, { nullable: true })
  currentVersion?: string;

  @Field(() => String, { nullable: true })
  latestVersion?: string | null;

  @Field(() => String, { nullable: true })
  currentRevision?: string;

  @Field(() => String, { nullable: true })
  currentBuildId?: string;

  @Field(() => String, { nullable: true })
  builtAt?: string;

  @Field(() => String, { nullable: true })
  sourceRevision?: string;

  @Field(() => String, { nullable: true })
  latestRevision?: string;

  @Field(() => String, { nullable: true })
  latestBuildId?: string;

  @Field(() => String)
  repositoryUrl: string;

  @Field(() => String, { nullable: true })
  latestBuildUrl?: string;

  @Field(() => String)
  checkedAt: string;

  @Field(() => String)
  synchronizationStatus:
    | 'CURRENT'
    | 'BUILD_MISMATCH'
    | 'UPDATE_AVAILABLE'
    | 'AHEAD'
    | 'DIVERGED'
    | 'DEVELOPMENT'
    | 'UNKNOWN';
}
