import * as sat from 'satellite.js';

const r = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json');
const recs = await r.json();
const iss = recs.find(o => o.NORAD_CAT_ID === 25544);
console.log('ISS record keys sample:', Object.keys(iss).slice(0,8).join(','));

const satrec = sat.json2satrec(iss);
console.log('satrec.error:', satrec.error, 'inclo(rad):', satrec.inclo?.toFixed(4));

const now = new Date();
const pv = sat.propagate(satrec, now);
console.log('propagate keys:', Object.keys(pv).join(','));
const gmst = sat.gstime(now);
const gd = sat.eciToGeodetic(pv.position, gmst);
console.log('OURS  lat/lon/alt:', sat.degreesLat(gd.latitude).toFixed(3), sat.degreesLong(gd.longitude).toFixed(3), gd.height.toFixed(1));
const ecf = sat.eciToEcf(pv.position, gmst);
console.log('ecf vel km/s:', Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z).toFixed(3));

const w = await (await fetch('https://api.wheretheiss.at/v1/satellites/25544')).json();
console.log('WHERE lat/lon/alt:', w.latitude.toFixed(3), w.longitude.toFixed(3), w.altitude.toFixed(1), 'vel km/h', w.velocity);
