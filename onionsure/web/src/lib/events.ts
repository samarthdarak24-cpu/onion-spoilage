/**
 * Canonical real-time event names emitted by the server.
 * Use these with `useLiveData({ events })` so pages refetch only when
 * something they actually display has changed.
 */

/** Anything that can move dashboard numbers. */
export const EV_DASHBOARD = [
  'db:lots',
  'db:inspection_sessions',
  'db:fusion_results',
  'db:quality_certificates',
  'db:config',
];

/** Certificate-centric views. */
export const EV_CERTIFICATES = ['db:quality_certificates', 'db:fusion_results', 'db:inspection_sessions'];

/** Inspection history / results lists. */
export const EV_INSPECTIONS = [
  'db:inspection_sessions',
  'db:quality_certificates',
  'db:fusion_results',
  'db:lots',
];

/** Live sensor + IoT views. */
export const EV_SENSOR = ['db:sensor_readings', 'db:inspection_sessions'];

/** Lots / procurement centre views. */
export const EV_LOTS = ['db:lots', 'db:procurement_centers'];

/** Analytics. */
export const EV_ANALYTICS = EV_DASHBOARD;
