import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { CustomException } from 'src/utils/custom-exception';

export enum DocumentShareExceptionCode {
  DOCUMENT_SHARE_ALREADY_EXISTS = 'DOCUMENT_SHARE_ALREADY_EXISTS',
  DOCUMENT_SHARE_NOT_FOUND = 'DOCUMENT_SHARE_NOT_FOUND',
  DOCUMENT_SHARE_FORBIDDEN = 'DOCUMENT_SHARE_FORBIDDEN',
  DOCUMENT_SHARE_EXPIRED = 'DOCUMENT_SHARE_EXPIRED',
  DOCUMENT_SHARE_INVALID_INPUT = 'DOCUMENT_SHARE_INVALID_INPUT',
}

const getDocumentShareExceptionUserFriendlyMessage = (
  code: DocumentShareExceptionCode,
) => {
  switch (code) {
    case DocumentShareExceptionCode.DOCUMENT_SHARE_ALREADY_EXISTS:
      return msg`A share link already exists for this document.`;
    case DocumentShareExceptionCode.DOCUMENT_SHARE_NOT_FOUND:
      return msg`Share link not found.`;
    case DocumentShareExceptionCode.DOCUMENT_SHARE_FORBIDDEN:
      return msg`Access to this share link is forbidden.`;
    case DocumentShareExceptionCode.DOCUMENT_SHARE_EXPIRED:
      return msg`This share link has expired.`;
    case DocumentShareExceptionCode.DOCUMENT_SHARE_INVALID_INPUT:
      return msg`Invalid share link input.`;
    default:
      assertUnreachable(code);
  }
};

export class DocumentShareException extends CustomException<DocumentShareExceptionCode> {
  constructor(
    message: string,
    code: DocumentShareExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ??
        getDocumentShareExceptionUserFriendlyMessage(code),
    });
  }
}
