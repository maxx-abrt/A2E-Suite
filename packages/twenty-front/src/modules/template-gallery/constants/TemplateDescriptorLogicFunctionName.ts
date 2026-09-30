// The one well-known logic-function name every A2E content app exposes to
// describe its templates (US-117). The gallery discovers descriptor sources by
// matching this name on each installed application, so an app that does not
// ship it is simply absent instead of breaking the surface.
export const TEMPLATE_DESCRIPTOR_LOGIC_FUNCTION_NAME =
  'list-template-descriptors';
