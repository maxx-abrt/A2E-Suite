// The single custom event every A2E lifecycle projection is published on. It
// reuses the existing WorkspaceEventEmitter, so the notification/inbox path can
// subscribe to one channel instead of wiring per object pair (C5).
export const CROSS_APP_LIFECYCLE_EVENT = 'cross_app_lifecycle';
