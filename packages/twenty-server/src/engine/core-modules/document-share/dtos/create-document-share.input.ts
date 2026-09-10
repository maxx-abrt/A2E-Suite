import { InputType, Field } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

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

  @Field({ nullable: true })
  expiresAt?: Date | null;
}
