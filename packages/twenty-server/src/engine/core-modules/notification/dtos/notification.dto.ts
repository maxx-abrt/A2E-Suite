import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

import {
  DateScalarType,
  UUIDScalarType,
} from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('Notification')
export class NotificationDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field()
  type: string;

  // Free-form producer payload (channel/record ids, snippet). JSON is
  // registered globally on the core schema (graphql-config.service.ts), so the
  // scalar needs no local registration.
  @Field(() => GraphQLJSON, { nullable: true })
  payload: Record<string, unknown> | null;

  @Field(() => DateScalarType)
  createdAt: Date;

  @Field(() => DateScalarType, { nullable: true })
  readAt: Date | null;

  @Field(() => DateScalarType, { nullable: true })
  archivedAt: Date | null;
}
