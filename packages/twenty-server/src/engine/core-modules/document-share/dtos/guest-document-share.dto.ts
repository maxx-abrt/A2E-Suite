import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('GuestDocumentShare')
export class GuestDocumentShareDTO {
  @Field(() => String)
  documentRecordId: string;

  @Field(() => String)
  titleSnapshot: string;

  @Field(() => String, { nullable: true })
  bodySnapshot: string | null;

  // Present only when the share is passphrase-protected; guests decrypt
  // client-side with the passphrase-derived AES-GCM key.
  @Field(() => String, { nullable: true })
  encryptedBody: string | null;

  @Field(() => String, { nullable: true })
  bodyIv: string | null;

  @Field(() => String, { nullable: true })
  bodySalt: string | null;

  @Field({ nullable: false })
  isPassphraseProtected: boolean;
}
