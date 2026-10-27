import { type Attachment } from '@/activities/files/types/Attachment';
import { type AttachmentUploadSession } from '@/activities/files/types/AttachmentUploadSession';
import { type ActivityTargetableObject } from '@/activities/types/ActivityTargetableEntity';
import { getActivityTargetObjectFieldIdName } from '@/activities/utils/getActivityTargetObjectFieldIdName';
import { useDirectFileUpload } from '@/file/hooks/useDirectFileUpload';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useFindOneRecordQuery } from '@/object-record/hooks/useFindOneRecordQuery';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { t } from '@lingui/core/macro';
import { assertIsDefinedOrThrow, isDefined } from 'twenty-shared/utils';
import { FieldMetadataType, FileFolder } from '~/generated-metadata/graphql';

export const useUploadAttachmentFile = () => {
  const apolloCoreClient = useApolloCoreClient();
  const { findOneRecordQuery } = useFindOneRecordQuery({
    objectNameSingular: CoreObjectNameSingular.Attachment,
    recordGqlFields: { id: true, name: true, file: true },
  });
  const { uploadFile: directUploadFile } = useDirectFileUpload();
  const { objectMetadataItem: attachmentMetadata } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.Attachment,
  });

  const filesFieldMetadataId = attachmentMetadata.fields.find(
    (field) => field.type === FieldMetadataType.FILES && field.name === 'file',
  )?.id;

  const { createOneRecord: createOneAttachment } =
    useCreateOneRecord<Attachment>({
      objectNameSingular: CoreObjectNameSingular.Attachment,
      shouldMatchRootQueryFilter: true,
    });

  const uploadAttachmentFile = async (
    file: File,
    targetableObject: ActivityTargetableObject,
    options?: {
      assertCanContinue?: () => void;
      session?: AttachmentUploadSession;
    },
  ) => {
    options?.assertCanContinue?.();
    assertIsDefinedOrThrow(
      filesFieldMetadataId,
      new Error(t`File field not found for attachment object`),
    );

    const uploadedFile =
      options?.session?.uploadedFile ??
      (await directUploadFile(file, {
        fileFolder: FileFolder.FilesField,
        fieldMetadataId: filesFieldMetadataId,
        assertCanContinue: options?.assertCanContinue,
      }));
    options?.assertCanContinue?.();

    if (!isDefined(uploadedFile)) {
      throw new Error("Couldn't upload the attachment.");
    }
    if (options?.session) options.session.uploadedFile = uploadedFile;

    const targetableObjectFieldIdName = getActivityTargetObjectFieldIdName({
      nameSingular: targetableObject.targetObjectNameSingular,
    });

    const attachmentToCreate = {
      ...(options?.session ? { id: options.session.attachmentId } : {}),
      name: file.name,
      [targetableObjectFieldIdName]: targetableObject.id,
      file: [
        {
          fileId: uploadedFile.id,
          label: file.name,
        },
      ],
    } as Partial<Attachment>;

    if (!options?.session?.isAttached) {
      try {
        await createOneAttachment(attachmentToCreate);
      } catch (error) {
        options?.assertCanContinue?.();
        if (!options?.session) throw error;
        // A committed attachment can outlive its response. Recover only this
        // session's identity and file, never a same-name attachment.
        const result = await apolloCoreClient.query<{
          attachment: Attachment | null;
        }>({
          query: findOneRecordQuery,
          variables: { objectRecordId: options.session.attachmentId },
          fetchPolicy: 'network-only',
        });
        options.assertCanContinue?.();
        const attachment = result.data?.attachment;
        if (
          attachment?.id !== options.session.attachmentId ||
          attachment.name !== file.name ||
          attachment.file?.length !== 1 ||
          attachment.file[0].fileId !== uploadedFile.id
        )
          throw error;
      }
      if (options?.session) options.session.isAttached = true;
    }
    options?.assertCanContinue?.();

    return {
      attachmentAbsoluteURL: uploadedFile.url,
      attachmentFileId: uploadedFile.id,
    };
  };

  return { uploadAttachmentFile };
};
