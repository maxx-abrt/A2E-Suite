import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { isDefined } from 'twenty-shared/utils';

import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { CreateDocumentShareInput } from 'src/engine/core-modules/document-share/dtos/create-document-share.input';
import { DocumentShareDTO } from 'src/engine/core-modules/document-share/dtos/document-share.dto';
import { GuestDocumentShareDTO } from 'src/engine/core-modules/document-share/dtos/guest-document-share.dto';
import { DocumentShareExceptionFilter } from 'src/engine/core-modules/document-share/document-share-exception.filter';
import { DocumentShareService } from 'src/engine/core-modules/document-share/document-share.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@UsePipes(ResolverValidationPipe)
@UseFilters(
  DocumentShareExceptionFilter,
  PreventNestToAutoLogGraphqlErrorsFilter,
)
export class DocumentShareResolver {
  constructor(private readonly documentShareService: DocumentShareService) {}

  @Query(() => [DocumentShareDTO])
  async findManyDocumentShares(
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
  ): Promise<DocumentShareDTO[]> {
    return this.documentShareService.findManyDocumentShares(
      currentWorkspace.id,
    );
  }

  @Mutation(() => DocumentShareDTO)
  async createDocumentShare(
    @Args('createDocumentShareInput')
    createDocumentShareInput: CreateDocumentShareInput,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
  ): Promise<DocumentShareDTO> {
    return this.documentShareService.createDocumentShare({
      documentRecordId: createDocumentShareInput.documentRecordId,
      titleSnapshot: createDocumentShareInput.titleSnapshot,
      bodySnapshot: createDocumentShareInput.bodySnapshot,
      encryptedBody: createDocumentShareInput.encryptedBody ?? null,
      bodyIv: createDocumentShareInput.bodyIv ?? null,
      bodySalt: createDocumentShareInput.bodySalt ?? null,
      expiresAt: createDocumentShareInput.expiresAt ?? null,
      // Author attribution arrives with the P8 activity stream; the column
      // exists so no migration is needed later.
      workspace: currentWorkspace,
    });
  }

  @Mutation(() => Boolean)
  async deleteDocumentShare(
    @Args('shareToken') shareToken: string,
    @AuthWorkspace() currentWorkspace: WorkspaceEntity,
  ): Promise<boolean> {
    await this.documentShareService.deleteDocumentShare({
      shareToken,
      workspace: currentWorkspace,
    });

    return true;
  }

  // Guest surface: reachable without any authentication (same pattern as
  // getPublicWorkspaceDataByDomain) — the share token is the only credential.
  @Query(() => GuestDocumentShareDTO)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  @UseFilters(
    DocumentShareExceptionFilter,
    PreventNestToAutoLogGraphqlErrorsFilter,
  )
  async getGuestDocumentShare(
    @Args('shareToken') shareToken: string,
  ): Promise<GuestDocumentShareDTO> {
    const share = await this.documentShareService.getShareForGuest(shareToken);

    if (!isDefined(share)) {
      throw new Error('Guest share not found');
    }

    return share;
  }
}
