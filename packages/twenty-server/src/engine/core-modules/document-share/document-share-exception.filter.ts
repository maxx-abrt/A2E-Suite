import { Catch, ExceptionFilter } from '@nestjs/common';

import { assertUnreachable } from 'twenty-shared/utils';

import { DocumentShareException } from 'src/engine/core-modules/document-share/document-share.exception';
import { DocumentShareExceptionCode } from 'src/engine/core-modules/document-share/document-share.exception';
import {
  NotFoundError,
  UserInputError,
} from 'src/engine/core-modules/graphql/utils/graphql-errors.util';

@Catch(DocumentShareException)
export class DocumentShareExceptionFilter implements ExceptionFilter {
  catch(exception: DocumentShareException) {
    switch (exception.code) {
      case DocumentShareExceptionCode.DOCUMENT_SHARE_ALREADY_EXISTS:
        throw new UserInputError(exception);
      case DocumentShareExceptionCode.DOCUMENT_SHARE_NOT_FOUND:
      case DocumentShareExceptionCode.DOCUMENT_SHARE_EXPIRED:
        throw new NotFoundError(exception);
      case DocumentShareExceptionCode.DOCUMENT_SHARE_FORBIDDEN:
        throw new UserInputError(exception);
      default:
        assertUnreachable(exception.code);
    }
  }
}
