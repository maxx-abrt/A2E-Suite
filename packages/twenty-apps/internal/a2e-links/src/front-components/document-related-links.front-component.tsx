import { defineFrontComponent } from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import { createRelatedLinksFrontComponent } from './related-links.front-component.factory.tsx';

// Related tab on the document record page (M11a-i3). The object is closed
// over here because the sandbox renders front components with empty props.
export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.documentRelatedLinks,
  name: 'document-related-links',
  description:
    'Panneau « Liens » du document : liens sortants et backlinks lus depuis la relation inverse a2eLink.',
  component: createRelatedLinksFrontComponent('document'),
});
