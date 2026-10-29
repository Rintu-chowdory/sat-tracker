import type { GroupKey } from './constants';

/** OMM / GP JSON record as returned by CelesTrak (gp.php?FORMAT=json). */
export interface OmmRecord {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  NORAD_CAT_ID: number;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
}

export interface SatMeta {
  noradId: number;
  name: string;
  group: GroupKey;
  inclinationDeg: number;
  periodMin: number;
  apogeeKm: number;
  perigeeKm: number;
  epochMs: number;
}

export type WorkerRequest =
  | { type: 'loadGroup'; group: GroupKey; records: OmmRecord[] }
  | { type: 'setGroups'; groups: GroupKey[] }
  | { type: 'tick'; t: number };

export type WorkerResponse =
  | { type: 'error'; message: string }
  | { type: 'loaded'; group: GroupKey; count: number; total: number }
  | { type: 'positions'; t: number; count: number; buffer: ArrayBuffer };
