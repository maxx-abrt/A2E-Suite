// The declared linkable set: one morph leg per object in the a2e-links
// manifest (US-147). The junction cannot persist a link whose source or target
// object has no leg, so both the source gate and the target picker are bounded
// by this set.
export const A2E_LINK_LINKABLE_OBJECT_NAME_SINGULARS = ['document', 'task'];
