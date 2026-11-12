#!/usr/bin/env node
// Regenerates src/data/maps/world.json, the pre-projected base map shared by every overlay.
// Borders rarely change, so the atlas packages are not project dependencies. Before running:
//   npm i --no-save d3-geo@3 topojson-client@3 topojson-simplify@3 world-atlas@2 us-atlas@3
//   node scripts/maps/build-world.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { presimplify, quantile, simplify } from 'topojson-simplify';

const require = createRequire(import.meta.url);
const ISO_TABLE_URL = 'https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json';
const OUTPUT = new URL('../../src/data/maps/world.json', import.meta.url);

const WIDTH = 2000;
const HEIGHT = 974;
const CENTRAL_MERIDIAN = 11;
// Share of arc points kept. Tuned so the file stays near 500 KB while coasts hold up at 12x zoom.
const COUNTRY_DETAIL = 0.35;
const STATE_DETAIL = 0.15;

const UNCODED = {
  Kosovo: 'XKX',
  Somaliland: 'XSL',
  'N. Cyprus': 'XNC',
  'Siachen Glacier': 'XSG',
  'Indian Ocean Ter.': 'IOT',
};

const STATE_POSTAL = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
  '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
  '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM',
  '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY',
};

function load(specifier) {
  return JSON.parse(readFileSync(require.resolve(specifier), 'utf8'));
}

function simplified(topology, keepShare) {
  const weighted = presimplify(topology);
  return simplify(weighted, quantile(weighted, keepShare));
}

const isoRows = await (await fetch(ISO_TABLE_URL)).json();
const alpha3ByNumeric = new Map(isoRows.map((row) => [row['country-code'], row['alpha-3']]));

const world = simplified(load('world-atlas/countries-50m.json'), COUNTRY_DETAIL);
const usa = simplified(load('us-atlas/states-10m.json'), STATE_DETAIL);

const projection = geoEqualEarth()
  .rotate([-CENTRAL_MERIDIAN, 0])
  .fitExtent([[4, 4], [WIDTH - 4, HEIGHT - 4]], { type: 'Sphere' });
// Adaptive resampling triples the point count and straight segments are invisible at this detail.
const outline = { sphere: geoPath(projection).digits(1)({ type: 'Sphere' }), graticule: geoPath(projection).digits(1)(geoGraticule10()) };
projection.precision(0);
const path = geoPath(projection).digits(1);

// Dependencies that share their sovereign's code (Ashmore and Cartier with Australia) fold into one shape.
function shapes(collection, idFor) {
  const byId = new Map();
  for (const shape of collection.features) {
    const id = idFor(shape);
    const d = path(shape);
    if (!id || !d) continue;
    const known = byId.get(id);
    if (!known) byId.set(id, { id, name: shape.properties.name, d });
    else if (d.length > known.d.length) byId.set(id, { id, name: shape.properties.name, d: d + known.d });
    else known.d += d;
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const countries = shapes(feature(world, world.objects.countries), (shape) => {
  const id = alpha3ByNumeric.get(shape.id) ?? UNCODED[shape.properties.name];
  if (!id) throw new Error(`No ISO alpha-3 code for ${shape.properties.name} (${shape.id})`);
  return id;
}).filter((shape) => shape.id !== 'ATA');

const states = shapes(feature(usa, usa.objects.states), (shape) => {
  const postal = STATE_POSTAL[shape.id];
  return postal ? `US-${postal}` : null;
});

const [tx, ty] = projection.translate();
const referencePoints = [[-105.1, 40.17], [0, 0], [151.2, -33.87], [-170, 65], [179, -17]];

writeFileSync(OUTPUT, `${JSON.stringify({
  width: WIDTH,
  height: HEIGHT,
  projection: { name: 'equal-earth', centralMeridian: CENTRAL_MERIDIAN, scale: projection.scale(), tx, ty },
  // Lets the dependency-free runtime projection be tested against d3-geo.
  reference: referencePoints.map(([lon, lat]) => {
    const [x, y] = projection([lon, lat]);
    return { lon, lat, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }),
  ...outline,
  countries,
  states,
})}\n`);

console.log(`world.json: ${countries.length} countries, ${states.length} states`);
