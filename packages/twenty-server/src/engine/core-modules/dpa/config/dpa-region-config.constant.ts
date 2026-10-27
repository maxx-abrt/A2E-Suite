import { A2E_SUITE_IDENTITY } from 'twenty-shared/constants';
import { DpaRegion } from 'src/engine/core-modules/dpa/enums/dpa-region.enum';
import { type DpaRegionConfig } from 'src/engine/core-modules/dpa/types/dpa.types';

export const DEFAULT_DPA_REGION: DpaRegion = DpaRegion.EU;

const DPA_COMMON_VALUES = {
  PROCESSOR_ENTITY: A2E_SUITE_IDENTITY.operator.legalName,
  PROCESSOR_LEGAL_FORM: A2E_SUITE_IDENTITY.operator.legalForm,
  PROCESSOR_ADDRESS: A2E_SUITE_IDENTITY.operator.address,
  EU_AFFILIATE_ENTITY: '',
  EU_AFFILIATE_LEGAL_FORM: '',
  EU_AFFILIATE_ADDRESS: '',
  GOVERNING_LAW: 'France, subject to mandatory applicable data protection law',
  DPO_NAME_AND_CONTACT: A2E_SUITE_IDENTITY.operator.email,
};

export const DPA_REGION_CONFIGS: Record<DpaRegion, DpaRegionConfig> = {
  [DpaRegion.EU]: {
    region: DpaRegion.EU,
    sccSectionActive: false,
    values: {
      ...DPA_COMMON_VALUES,
      HOSTING_REGION: 'European Union',
    },
  },
  [DpaRegion.US]: {
    region: DpaRegion.US,
    sccSectionActive: false,
    values: {
      ...DPA_COMMON_VALUES,
      HOSTING_REGION: 'United States',
    },
  },
};

export const getDpaRegionConfig = (region: DpaRegion): DpaRegionConfig =>
  DPA_REGION_CONFIGS[region] ?? DPA_REGION_CONFIGS[DEFAULT_DPA_REGION];
