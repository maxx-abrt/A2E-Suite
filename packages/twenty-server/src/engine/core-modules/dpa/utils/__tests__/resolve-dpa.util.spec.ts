import { A2E_SUITE_IDENTITY } from 'twenty-shared/constants';
import { DPA_TEMPLATE_VERSION } from 'src/engine/core-modules/dpa/constants/dpa-template-version.constant';
import { DpaRegion } from 'src/engine/core-modules/dpa/enums/dpa-region.enum';
import { buildDpaAgreementRecord } from 'src/engine/core-modules/dpa/utils/build-dpa-agreement-record.util';
import { DpaAgreementType } from 'src/engine/core-modules/dpa/enums/dpa-agreement-type.enum';
import {
  findUnresolvedMergeFields,
  resolveDpa,
} from 'src/engine/core-modules/dpa/utils/resolve-dpa.util';

describe('A2E Suite processing terms', () => {
  it.each([DpaRegion.EU, DpaRegion.US])(
    'identifies the actual operator for %s deployments',
    (region) => {
      const document = resolveDpa({ region, mode: 'preview' });
      const text = JSON.stringify(document);
      expect(document.values.PROCESSOR_ENTITY).toBe(
        A2E_SUITE_IDENTITY.operator.legalName,
      );
      expect(text).toContain(A2E_SUITE_IDENTITY.operator.address);
      expect(text).toContain(A2E_SUITE_IDENTITY.operator.email);
      expect(text).toContain('994 936 789');
      expect(text).not.toMatch(
        /Twenty|Delaware|Frankfurt|Félix|SOC 2|Amazon Web Services/,
      );
      expect(document.sccSectionActive).toBe(false);
      expect(findUnresolvedMergeFields(document)).toEqual([]);
    },
  );

  it('does not invent an affiliate, hosting city or executed transfer mechanism', () => {
    const document = resolveDpa({ region: DpaRegion.EU, mode: 'preview' });
    expect(document.values.EU_AFFILIATE_ENTITY).toBe('');
    expect(document.values.HOSTING_REGION).toBe('European Union');
    expect(document.blocks.map((block) => block.text).join('\n')).toContain(
      'No standard contractual clauses, adequacy decision or framework certification are represented as already executed',
    );
  });

  it('records customer acceptance without generating an operator signature', () => {
    const context = {
      region: DpaRegion.EU,
      mode: 'signed' as const,
      customerLegalEntityName: 'Customer association',
      signatory: { name: 'Jane Doe', title: 'Representative' },
      executedAt: '2026-10-27T10:00:00.000Z',
    };
    const document = resolveDpa(context);
    const acceptance = document.blocks.find(
      (block) => block.label === 'Customer (Controller)',
    );
    expect(acceptance?.value).toContain('Customer association');
    expect(acceptance?.value).toContain('Jane Doe');
    expect(acceptance?.value).toContain('Representative');
    const operator = document.blocks.find((block) =>
      block.label?.startsWith('Processor —'),
    );
    expect(operator?.value).toContain('No operator signature is generated');
    expect(JSON.stringify(document)).not.toContain('pre-signed');
    expect(
      document.blocks.find((block) => block.label === 'Execution Date')?.value,
    ).toBe(context.executedAt);
    expect(
      document.blocks.find((block) => block.label === 'DPA template version')
        ?.value,
    ).toContain(DPA_TEMPLATE_VERSION);
  });

  it('keeps previews free of customer acceptance fields', () => {
    const document = resolveDpa({ region: DpaRegion.EU, mode: 'preview' });
    expect(
      document.blocks.some((block) => block.kind === 'signatureField'),
    ).toBe(false);
  });

  it('warns separately operated deployments to obtain their own agreement', () => {
    const document = resolveDpa({
      region: DpaRegion.EU,
      mode: 'preview',
      isSelfHosted: true,
    });
    expect(document.notice).toContain('NOT A VALID AGREEMENT');
    expect(document.notice).toContain('actual service operator');
    expect(
      resolveDpa({ region: DpaRegion.EU, mode: 'preview' }).notice,
    ).toBeUndefined();
  });

  it('snapshots the new operator and version for new acceptance records', () => {
    const record = buildDpaAgreementRecord({
      workspaceId: 'workspace',
      type: DpaAgreementType.CLICK_THROUGH,
      region: DpaRegion.EU,
      acceptedAt: new Date('2026-10-27T10:00:00.000Z'),
    });
    expect(record.processorEntity).toBe(A2E_SUITE_IDENTITY.operator.legalName);
    expect(record.templateVersion).toBe('2026-10-27');
  });
});
