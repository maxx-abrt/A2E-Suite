import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType, DateScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('DocumentShare')
export class DocumentShareDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field({ nullable: false })
  shareToken: string;

  @Field(() => UUIDScalarType)
  documentRecordId: string;

  // Explicit scalar type required: without it NestJS GraphQL fails schema
  // generation with UndefinedTypeError for this nullable Date output.
  @Field(() => DateScalarType, { nullable: true })
  expiresAt: Date | null;

  @Field({ nullable: false })
  isPassphraseProtected: boolean;

  @Field()
  createdAt: Date;
}
