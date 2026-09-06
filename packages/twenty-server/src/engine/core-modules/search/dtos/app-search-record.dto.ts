import { Field, ObjectType } from '@nestjs/graphql';

import { IsString, IsUUID } from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('AppSearchRecord')
export class AppSearchRecordDTO {
  @Field(() => UUIDScalarType)
  @IsUUID()
  recordId: string;

  @Field(() => String)
  @IsString()
  label: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  imageUrl?: string;

  // Stable deep link produced by the provider; the front resolves it against
  // its router (side panel or full page) without per-app URL logic.
  @Field(() => String)
  @IsString()
  path: string;
}
