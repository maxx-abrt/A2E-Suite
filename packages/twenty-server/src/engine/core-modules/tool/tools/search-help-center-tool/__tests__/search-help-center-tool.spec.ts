import { Test } from '@nestjs/testing';
import { SearchHelpCenterTool } from 'src/engine/core-modules/tool/tools/search-help-center-tool/search-help-center-tool';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';

describe('A2E Suite help search', () => {
  const post = jest.fn();
  const configuration: Record<string, string | undefined> = {};
  let tool: SearchHelpCenterTool;

  beforeEach(async () => {
    post.mockReset();
    delete configuration.MINTLIFY_API_KEY;
    delete configuration.MINTLIFY_SUBDOMAIN;
    const module = await Test.createTestingModule({
      providers: [
        SearchHelpCenterTool,
        {
          provide: TwentyConfigService,
          useValue: { get: (key: string) => configuration[key] },
        },
        {
          provide: SecureHttpClientService,
          useValue: { getHttpClient: () => ({ post }) },
        },
      ],
    }).compile();
    tool = module.get(SearchHelpCenterTool);
  });

  it('finds suite guides without contacting upstream search', async () => {
    const output = await tool.execute(
      { query: 'Bilan invoices' },
      {} as ToolExecutionContext,
    );
    expect(output.success).toBe(true);
    expect(output.result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Bilan',
          url: 'https://a2esuite.com/apps/bilan',
        }),
      ]),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('offers a public starting point when the query has no match', async () => {
    const output = await tool.execute(
      { query: 'xyzxyz' },
      {} as ToolExecutionContext,
    );
    expect(output.result).toEqual([
      expect.objectContaining({ url: 'https://a2esuite.com/getting-started' }),
    ]);
    expect(post).not.toHaveBeenCalled();
  });

  it('preserves an explicitly configured documentation provider', async () => {
    configuration.MINTLIFY_API_KEY = 'test-key';
    configuration.MINTLIFY_SUBDOMAIN = 'a2e-suite';
    post.mockResolvedValue({ data: [{ title: 'Configured guide' }] });
    const output = await tool.execute(
      { query: 'setup' },
      {} as ToolExecutionContext,
    );
    expect(post).toHaveBeenCalledWith(
      'https://api-dsc.mintlify.com/v1/search/a2e-suite',
      { query: 'setup', pageSize: 10 },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
    expect(output.success).toBe(true);
  });
});
