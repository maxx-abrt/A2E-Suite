import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('DocumentShare')
export class DocumentShareDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field({ nullable: false })
  shareToken: string;

  @Field(() => UUIDScalarType)
  documentRecordId: string;

  @Field({ nullable: true })
  expiresAt: Date | null;

  @Field({ nullable: false })
  isPassphraseProtected: boolean;

  @Field()
  createdAt: Date;
}
