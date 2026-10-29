export const EARTH_RADIUS_KM = 6378.137;
export const EARTH_MU = 398600.4418; // km^3/s^2
export const SCALE = 1 / EARTH_RADIUS_KM; // 1 world unit = 1 Earth radius
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export type GroupKey = 'stations' | 'starlink' | 'gps' | 'weather' | 'active';

export interface GroupDef {
  key: GroupKey;
  label: string;
  /** CelesTrak GROUP query parameter */
  query: string;
  color: string;
  defaultOn: boolean;
}

/** Order matters: the worker concatenates positions in this order. */
export const GROUPS: GroupDef[] = [
  { key: 'stations', label: 'Stations', query: 'stations', color: '#5ee9ff', defaultOn: true },
  { key: 'starlink', label: 'Starlink', query: 'starlink', color: '#8b9dff', defaultOn: true },
  { key: 'gps', label: 'GPS', query: 'gps-ops', color: '#7ef0a8', defaultOn: false },
  { key: 'weather', label: 'Weather', query: 'weather', color: '#ffd166', defaultOn: false },
  { key: 'active', label: 'All active', query: 'active', color: '#9aa4b2', defaultOn: false },
];

export const ISS_NORAD = 25544;
export const DEFAULT_OBSERVER = { name: 'Aachen', lat: 50.7753, lon: 6.0839 };
