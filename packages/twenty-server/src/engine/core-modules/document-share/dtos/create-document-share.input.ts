import { InputType, Field } from '@nestjs/graphql';

import { UUIDScalarType, DateScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class CreateDocumentShareInput {
  @Field(() => UUIDScalarType)
  documentRecordId: string;

  @Field(() => String)
  titleSnapshot: string;

  @Field(() => String)
  bodySnapshot: string;

  // Passphrase-protected shares: the client encrypts the body snapshot with a
  // passphrase-derived AES-GCM key (Bureau pattern) and posts the ciphertext
  // triple. The passphrase itself is NEVER transmitted or stored.
  @Field(() => String, { nullable: true })
  encryptedBody?: string | null;

  @Field(() => String, { nullable: true })
  bodyIv?: string | null;

  @Field(() => String, { nullable: true })
  bodySalt?: string | null;

  // Explicit scalar type required: without it NestJS GraphQL fails schema
  // generation with UndefinedTypeError for this nullable Date input.
  @Field(() => DateScalarType, { nullable: true })
  expiresAt?: Date | null;
}
