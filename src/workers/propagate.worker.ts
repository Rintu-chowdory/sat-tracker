/// <reference lib="webworker" />
import { gstime, json2satrec, propagate } from 'satellite.js';
import { GROUPS, SCALE, type GroupKey } from '../lib/constants';
import type { WorkerRequest } from '../lib/types';

type SatRec = ReturnType<typeof json2satrec>;

/** satrecs per group, plus the flattened render order (GROUPS order, enabled only). */
const byGroup = new Map<GroupKey, SatRec[]>();
let order: GroupKey[] = ['stations'];
let flat: SatRec[] = [];

function rebuildOrder() {
  const next: SatRec[] = [];
  for (const g of GROUPS) {
    if (!order.includes(g.key)) continue;
    const list = byGroup.get(g.key);
    if (list) next.push(...list);
  }
  flat = next;
}

function post(message: unknown, transfer?: Transferable[]) {
  (self as unknown as Worker).postMessage(message, transfer ?? []);
}

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;

  if (msg.type === 'loadGroup') {
    const satrecs: SatRec[] = [];
    for (const record of msg.records) {
      try {
        const rec = json2satrec(record as never);
        // error 0 means a healthy element set; a bad one would poison every tick
        if (rec && rec.error === 0) satrecs.push(rec);
      } catch {
        /* skip unparseable element sets */
      }
    }
    byGroup.set(msg.group, satrecs);
    rebuildOrder();
    let total = 0;
    for (const list of byGroup.values()) total += list.length;
    post({ type: 'loaded', group: msg.group, count: satrecs.length, total });
    return;
  }

  if (msg.type === 'setGroups') {
    order = msg.groups;
    rebuildOrder();
    return;
  }

  if (msg.type === 'tick') {
    const count = flat.length;
    if (count === 0) {
      post({ type: 'positions', t: msg.t, count: 0, buffer: new ArrayBuffer(0) });
      return;
    }

    const date = new Date(msg.t);
    // One GMST per tick: every satellite in the batch shares this instant.
    const gmst = gstime(date);
    const c = Math.cos(gmst);
    const s = Math.sin(gmst);

    const out = new Float32Array(count * 3);
    let written = 0;

    for (let i = 0; i < count; i++) {
      const pv = propagate(flat[i], date);
      if (!pv || !pv.position) continue;
      const { x, y, z } = pv.position;

      // ECI -> ECEF is a rotation about Z by -GMST, written out to stay allocation-free.
      const ex = x * c + y * s;
      const ey = -x * s + y * c;

      // ECEF -> three.js world space: (x, z, -y) * scale, Earth radius = 1 unit
      out[written * 3] = ex * SCALE;
      out[written * 3 + 1] = z * SCALE;
      out[written * 3 + 2] = -ey * SCALE;
      written++;
    }

    const buffer = written * 3 === out.length ? out.buffer : out.buffer.slice(0, written * 3 * 4);
    post({ type: 'positions', t: msg.t, count: written, buffer }, [buffer as ArrayBuffer]);
  }
};
