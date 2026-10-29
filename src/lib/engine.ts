import { GROUPS, type GroupKey } from './constants';
import { loadGroup, toMeta } from './celestrak';
import { useTrackerStore } from '../store/tracker';
import type { WorkerRequest, WorkerResponse } from './types';

const TICK_HZ = 5;

/**
 * Owns the worker and the simulation clock. React components read the current
 * instant through engine.now() inside useFrame, so a 60 Hz clock never re-renders
 * the UI tree.
 */
class TrackerEngine {
  private worker: Worker | null = null;
  private raf = 0;
  private lastFrame = 0;
  private lastTick = 0;
  private t = Date.now();
  private started = false;

  start() {
    if (this.started) return;
    this.started = true;

    this.worker = new Worker(new URL('../workers/propagate.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => this.onMessage(ev.data);
    this.worker.onerror = (ev) => useTrackerStore.getState().setError(ev.message || 'Propagation worker failed');

    this.t = Date.now();
    this.lastFrame = performance.now();
    for (const group of useTrackerStore.getState().enabled) void this.ensureGroup(group);
    this.loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.worker?.terminate();
    this.worker = null;
    this.started = false;
  }

  /** Current simulation instant in ms. */
  now() {
    return this.t;
  }

  private post(msg: WorkerRequest, transfer?: Transferable[]) {
    this.worker?.postMessage(msg, transfer ?? []);
  }

  private syncGroups() {
    this.post({ type: 'setGroups', groups: useTrackerStore.getState().enabled });
    this.requestTick();
  }

  private requestTick() {
    this.post({ type: 'tick', t: this.t });
  }

  private loop = () => {
    const perf = performance.now();
    const dt = perf - this.lastFrame;
    this.lastFrame = perf;

    const { paused, speed } = useTrackerStore.getState();
    if (!paused) this.t += dt * speed;

    if (perf - this.lastTick > 1000 / TICK_HZ) {
      this.lastTick = perf;
      this.requestTick();
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  private onMessage(msg: WorkerResponse) {
    const store = useTrackerStore.getState();

    if (msg.type === 'error') {
      store.setError(msg.message);
      return;
    }

    if (msg.type === 'loaded') {
      store.setTotalLoaded(msg.total);
      this.syncGroups();
      return;
    }

    if (msg.type === 'positions') {
      if (msg.count === 0) return;
      store.setPositions(new Float32Array(msg.buffer), msg.count);
    }
  }

  async ensureGroup(group: GroupKey) {
    const store = useTrackerStore.getState();
    if (store.metas[group] || store.loading.includes(group)) return;

    store.setLoading(group, true);
    try {
      const records = await loadGroup(group);
      const metas = records.map((r) => toMeta(r, group));
      useTrackerStore.getState().setGroupData(group, records, metas);
      this.post({ type: 'loadGroup', group, records });
      this.syncGroups();
    } catch (err) {
      useTrackerStore.getState().setError(err instanceof Error ? err.message : `Could not load ${group}`);
    } finally {
      useTrackerStore.getState().setLoading(group, false);
    }
  }

  toggleGroup(group: GroupKey) {
    const store = useTrackerStore.getState();
    const on = store.enabled.includes(group);
    const next = on
      ? store.enabled.filter((g) => g !== group)
      : GROUPS.map((g) => g.key).filter((k) => k === group || store.enabled.includes(k));

    store.setEnabled(next);
    if (!on) void this.ensureGroup(group);
    this.syncGroups();
  }
}

export const engine = new TrackerEngine();
