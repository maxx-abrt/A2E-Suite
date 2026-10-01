// The A2E cross-app object families (C5). A family is the stable product-level
// identity shared by recipes and Inbox notifications; it is deliberately
// decoupled from the underlying workspace object name so `file` can ride the
// standard `attachment` object without leaking that implementation detail.
export type CrossAppEventObjectFamily =
  | 'document'
  | 'task'
  | 'calendarEvent'
  | 'file'
  | 'invoice'
  | 'mention';
