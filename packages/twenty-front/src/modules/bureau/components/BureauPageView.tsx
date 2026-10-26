import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { BureauBreadcrumbs } from '@/bureau/components/BureauBreadcrumbs';
import { BureauCoverPicker } from '@/bureau/components/BureauCoverPicker';
import { BureauIconPicker } from '@/bureau/components/BureauIconPicker';
import { BureauPageActionsDropdown } from '@/bureau/components/BureauPageActionsDropdown';
import { BureauPageIcon } from '@/bureau/components/BureauPageIcon';
import { LinkToRecordButton } from '@/a2e-links/components/LinkToRecordButton';
import { BUREAU_PAGE_RECORD_GQL_FIELDS } from '@/bureau/constants/BureauPageRecordGqlFields';
import { useBureauTextInputFocus } from '@/bureau/hooks/useBureauTextInputFocus';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { type BureauPageRecord } from '@/bureau/types/BureauPageRecord';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useIsRecordFieldReadOnly } from '@/object-record/read-only/hooks/useIsRecordFieldReadOnly';
import { useRecordSeededDraft } from '@/object-record/record-seeded-draft/hooks/useRecordSeededDraft';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { AppPath } from 'twenty-shared/types';
import { IconPhoto, IconStar } from 'twenty-ui/icon';
import { Button, LightIconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const RichTextFieldEditor = lazy(() =>
  import('@/object-record/record-field/ui/meta-types/input/components/RichTextFieldEditor').then(
    (module) => ({ default: module.RichTextFieldEditor }),
  ),
);

const StyledPage = styled.article`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
`;

const StyledTopBar = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  @media print {
    display: none;
  }
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledScroll = styled.div`
  flex: 1;
  overflow: auto;
  @media print {
    overflow: visible;
  }
`;

const StyledCover = styled.div`
  height: 200px;
  overflow: hidden;
  width: 100%;
  img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }
  @media (max-width: 600px) {
    height: 120px;
  }
`;

const StyledBody = styled.div`
  box-sizing: border-box;
  margin: 0 auto;
  max-width: 840px;
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[10]};
  width: 100%;
  &[data-full-width='true'] {
    max-width: none;
  }
  .bn-container .editor {
    font-size: ${themeCssVariables.font.size.lg};
  }
  &[data-small-text='true'] .bn-container .editor {
    font-size: ${themeCssVariables.font.size.md};
  }
  @media (max-width: 600px) {
    padding: ${themeCssVariables.spacing[6]};
  }
`;

const StyledTitle = styled(TextareaAutosize)`
  background: transparent;
  border: none;
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  display: block;
  font-family: inherit;
  font-size: 36px;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  line-height: 1.25;
  margin: ${themeCssVariables.spacing[4]} 0;
  outline: none;
  padding: 0;
  resize: none;
  width: 100%;
  &::placeholder {
    color: ${themeCssVariables.font.color.light};
  }
`;

const StyledStatus = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  padding: ${themeCssVariables.spacing[6]};
`;

type BureauPageViewProps = { documentId: string };

export const BureauPageView = ({ documentId }: BureauPageViewProps) => {
  const { t } = useLingui();
  const { openTrash } = useBureauWorkspace();
  const { record, loading, error, refetch } =
    useFindOneRecord<BureauPageRecord>({
      objectNameSingular: 'document',
      objectRecordId: documentId,
      recordGqlFields: BUREAU_PAGE_RECORD_GQL_FIELDS,
    });
  const { upsertRecordsInStore } = useUpsertRecordsInStore();
  const [seededDocumentId, setSeededDocumentId] = useState<string | null>(null);

  // The uncontrolled editor reads its initial body from the record store once.
  useEffect(() => {
    if (record && record.id === documentId) {
      upsertRecordsInStore({ partialRecords: [record] });
      setSeededDocumentId(record.id);
    }
  }, [documentId, record, upsertRecordsInStore]);

  if (error)
    return (
      <StyledStatus role="alert">
        <p>{t`Could not load this page.`}</p>
        <Button
          title={t`Retry`}
          onClick={() => {
            void refetch();
          }}
        />
      </StyledStatus>
    );

  if (loading && !record)
    return <StyledStatus role="status">{t`Loading page…`}</StyledStatus>;

  if (!record || record.deletedAt)
    return (
      <StyledStatus>
        <p>{t`This page is unavailable. It may have been moved to the trash, or you may not have access.`}</p>
        <Button title={t`Back to Bureau`} to={AppPath.Bureau} />
        <Button title={t`Open trash`} onClick={openTrash} variant="secondary" />
      </StyledStatus>
    );

  if (seededDocumentId !== documentId)
    return <StyledStatus role="status">{t`Loading page…`}</StyledStatus>;

  return <BureauPageViewContent key={documentId} page={record} />;
};

const BureauPageViewContent = ({ page }: { page: BureauPageRecord }) => {
  const { t } = useLingui();
  const { actions, favoriteDocumentIds, toggleFavorite } = useBureauWorkspace();
  // The title hands focus to the existing imperative editor instance.
  // oxlint-disable-next-line twenty/no-state-useref
  const editorRef = useRef<typeof BLOCK_SCHEMA.BlockNoteEditor | null>(null);
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: 'document',
  });
  const isTitleReadOnly = useIsRecordFieldReadOnly({
    recordId: page.id,
    objectMetadataId: objectMetadataItem.id,
    fieldMetadataId:
      objectMetadataItem.fields.find((field) => field.name === 'title')?.id ??
      '',
  });
  const [hasTitleSaveError, setHasTitleSaveError] = useState(false);
  const { handleFocus, handleBlur } = useBureauTextInputFocus(
    `bureau-title-${page.id}`,
  );
  const saveTitle = async (title: string) => {
    const didSave = await actions.updatePage(page.id, { title });
    setHasTitleSaveError(!didSave);
  };
  const { draft, updateDraft, flush } = useRecordSeededDraft({
    upstreamDraft: { title: page.title ?? '' },
    onPersist: ({ title }) => {
      void saveTitle(title);
    },
  });
  const isReadOnly = isTitleReadOnly || page.isLocked === true;
  const hasCoverImageField = objectMetadataItem.fields.some(
    (field) => field.name === 'coverImage',
  );
  const hasReadingControlFields = ['isFullWidth', 'isSmallText'].every((name) =>
    objectMetadataItem.fields.some((field) => field.name === name),
  );

  return (
    <StyledPage data-testid="bureau-document">
      <PageTitle
        title={`${page.title?.trim() || t`Untitled`} — ${t`Bureau`}`}
      />
      <StyledTopBar>
        <BureauBreadcrumbs page={page} />
        <StyledActions>
          <LinkToRecordButton
            sourceObjectNameSingular="document"
            sourceRecordId={page.id}
          />
          <LightIconButton
            Icon={IconStar}
            aria-label={
              favoriteDocumentIds.has(page.id)
                ? t`Remove from favorites`
                : t`Add to favorites`
            }
            onClick={() => {
              void toggleFavorite(page.id);
            }}
          />
          <BureauPageActionsDropdown
            page={page}
            dropdownId={`bureau-page-menu-${page.id}`}
            readingControls={
              !isReadOnly && hasReadingControlFields
                ? {
                    isFullWidth: page.isFullWidth === true,
                    isSmallText: page.isSmallText === true,
                    onFullWidthChange: (isFullWidth) => {
                      void actions.updatePage(page.id, { isFullWidth });
                    },
                    onSmallTextChange: (isSmallText) => {
                      void actions.updatePage(page.id, { isSmallText });
                    },
                  }
                : undefined
            }
          />
        </StyledActions>
      </StyledTopBar>
      <StyledScroll>
        {(page.coverColor || page.coverImage) && (
          <StyledCover
            style={{ backgroundColor: page.coverColor ?? undefined }}
          >
            {page.coverImage && /^https?:\/\//i.test(page.coverImage) && (
              <img src={page.coverImage} alt="" referrerPolicy="no-referrer" />
            )}
          </StyledCover>
        )}
        <StyledBody
          data-full-width={page.isFullWidth === true}
          data-small-text={page.isSmallText === true}
        >
          <StyledActions>
            {!isReadOnly ? (
              <>
                <BureauIconPicker
                  dropdownId={`bureau-icon-${page.id}`}
                  currentIcon={page.icon}
                  onSelect={(icon) => {
                    void actions.updatePage(page.id, { icon });
                  }}
                  clickableComponent={
                    <Button
                      title={page.icon?.trim() || t`Add icon`}
                      variant="tertiary"
                    />
                  }
                />
                {hasCoverImageField && (
                  <BureauCoverPicker
                    dropdownId={`bureau-cover-${page.id}`}
                    coverColor={page.coverColor}
                    coverImage={page.coverImage}
                    onChange={(cover) => {
                      void actions.updatePage(page.id, cover);
                    }}
                    clickableComponent={
                      <Button
                        Icon={IconPhoto}
                        title={
                          page.coverColor || page.coverImage
                            ? t`Change cover`
                            : t`Add cover`
                        }
                        variant="tertiary"
                      />
                    }
                  />
                )}
              </>
            ) : (
              <BureauPageIcon icon={page.icon} size="large" />
            )}
          </StyledActions>
          <StyledTitle
            aria-label={t`Page title`}
            placeholder={t`Untitled`}
            value={draft.title}
            readOnly={isReadOnly}
            onChange={(event) => updateDraft({ title: event.target.value })}
            onFocus={handleFocus}
            onBlur={() => {
              flush();
              handleBlur();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                flush();
                editorRef.current?.focus();
              }
            }}
          />
          {hasTitleSaveError && (
            <div role="alert">
              <Button
                title={t`Retry saving title`}
                ariaLabel={t`Retry saving title`}
                onClick={() => {
                  void saveTitle(draft.title);
                }}
              />
            </div>
          )}
          {page.isLocked && (
            <p>{t`This page is locked. Unlock it from the record page to edit.`}</p>
          )}
          <Suspense
            fallback={
              <StyledStatus role="status">{t`Loading editor…`}</StyledStatus>
            }
          >
            <RichTextFieldEditor
              recordId={page.id}
              objectNameSingular="document"
              fieldName="content"
              editorRef={editorRef}
              isReadOnly={page.isLocked === true}
            />
          </Suspense>
        </StyledBody>
      </StyledScroll>
    </StyledPage>
  );
};
