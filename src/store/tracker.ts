import { create } from 'zustand';
import { GROUPS, type GroupKey } from '../lib/constants';
import type { OmmRecord, SatMeta } from '../lib/types';

interface TrackerState {
  /** simulation clock is owned by the engine; this mirrors it for the UI */
  paused: boolean;
  speed: number;

  enabled: GroupKey[];
  loading: GroupKey[];
  metas: Partial<Record<GroupKey, SatMeta[]>>;
  records: Partial<Record<GroupKey, OmmRecord[]>>;

  positions: Float32Array | null;
  pointCount: number;
  totalLoaded: number;
  error: string | null;
  updatedAt: number;

  setPaused: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  setEnabled: (enabled: GroupKey[]) => void;
  setLoading: (group: GroupKey, loading: boolean) => void;
  setGroupData: (group: GroupKey, records: OmmRecord[], metas: SatMeta[]) => void;
  setPositions: (positions: Float32Array, count: number) => void;
  setTotalLoaded: (total: number) => void;
  setError: (error: string | null) => void;
}

export const useTrackerStore = create<TrackerState>((set) => ({
  paused: false,
  speed: 1,

  enabled: GROUPS.filter((g) => g.defaultOn).map((g) => g.key),
  loading: [],
  metas: {},
  records: {},

  positions: null,
  pointCount: 0,
  totalLoaded: 0,
  error: null,
  updatedAt: 0,

  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
  setEnabled: (enabled) => set({ enabled }),
  setLoading: (group, loading) =>
    set((s) => ({
      loading: loading ? [...s.loading.filter((g) => g !== group), group] : s.loading.filter((g) => g !== group),
    })),
  setGroupData: (group, records, metas) =>
    set((s) => ({ records: { ...s.records, [group]: records }, metas: { ...s.metas, [group]: metas } })),
  setPositions: (positions, pointCount) => set({ positions, pointCount, updatedAt: Date.now() }),
  setTotalLoaded: (totalLoaded) => set({ totalLoaded }),
  setError: (error) => set({ error }),
}));
