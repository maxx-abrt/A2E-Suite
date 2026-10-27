import {
  A2E_SUITE_HELP_PAGES,
  A2E_SUITE_IDENTITY,
} from 'twenty-shared/constants';
import { Injectable } from '@nestjs/common';

import { isAxiosError } from 'axios';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { SearchHelpCenterInputZodSchema } from 'src/engine/core-modules/tool/tools/search-help-center-tool/search-help-center-tool.schema';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class SearchHelpCenterTool implements Tool {
  description =
    'Search A2E Suite documentation and help center to find information about features, setup, usage, and troubleshooting.';
  inputSchema = SearchHelpCenterInputZodSchema;

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  async execute(
    parameters: ToolInput,
    _context: ToolExecutionContext,
  ): Promise<ToolOutput> {
    const { query } = this.inputSchema.parse(parameters);

    try {
      const MINTLIFY_API_KEY = this.twentyConfigService.get('MINTLIFY_API_KEY');
      const MINTLIFY_SUBDOMAIN =
        this.twentyConfigService.get('MINTLIFY_SUBDOMAIN');

      const useDirectApi = MINTLIFY_API_KEY && MINTLIFY_SUBDOMAIN;

      if (!useDirectApi) {
        const words = query
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 2);
        const pages = Object.values(A2E_SUITE_HELP_PAGES).filter((page) =>
          words.some((word) =>
            `${page.title} ${page.content}`.toLowerCase().includes(word),
          ),
        );
        const results = (
          pages.length > 0 ? pages : [A2E_SUITE_HELP_PAGES.gettingStarted]
        ).map((page) => ({
          title: page.title,
          content: page.content,
          url: `${A2E_SUITE_IDENTITY.publicUrl}${page.path}`,
        }));
        return {
          success: true,
          message: 'A2E Suite guides for this request',
          result: results,
        };
      }
      const endpoint = `https://api-dsc.mintlify.com/v1/search/${MINTLIFY_SUBDOMAIN}`;

      const headers = {
        'Content-Type': 'application/json',
        ...(useDirectApi && { Authorization: `Bearer ${MINTLIFY_API_KEY}` }),
      };

      const httpClient = this.secureHttpClientService.getHttpClient();

      const response = await httpClient.post(
        endpoint,
        { query, pageSize: 10 },
        { headers },
      );

      const results = response.data;

      if (results.length === 0) {
        return {
          success: true,
          message: `No help center articles found for "${query}"`,
          result: [],
        };
      }

      return {
        success: true,
        message: `Found ${results.length} relevant help center article${results.length === 1 ? '' : 's'} for "${query}"`,
        result: results,
      };
    } catch (error) {
      const errorDetail = isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error instanceof Error
          ? error.message
          : 'Help center search failed';

      return {
        success: false,
        message: `Failed to search help center for "${query}"`,
        error: errorDetail,
      };
    }
  }
}
