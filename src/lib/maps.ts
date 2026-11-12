export type OverlayId =
  | 'data-centers'
  | 'autonomous-driving'
  | 'autonomous-delivery'
  | 'drone-delivery'
  | 'internet'
  | 'ai-usage'
  | 'starlink';

export interface MapSource {
  name: string;
  url: string;
}

export interface MapPoint {
  id: string;
  kind: string;
  name: string;
  operator?: string;
  lat: number;
  lon: number;
  place: string;
  country: string;
  status: string;
  detail?: string;
  source: string;
  mw?: number;
  mwBasis?: 'live' | 'planned';
  vehicle?: string;
  precision?: 'site' | 'town';
}

export interface MapRegion {
  level?: string;
  summary?: string;
  source?: string;
  fsd?: 'unsupervised' | 'supervised' | 'none';
  fixedMbps?: number;
  mobileMbps?: number;
  usersPct?: number;
  speedAsOf?: string;
  usersAsOf?: string;
  usedPct?: number;
  dailyPct?: number;
  weeklyPct?: number;
  awarePct?: number;
  helpPct?: number;
  betterLifePct?: number;
  surveyAsOf?: string;
  downMbps?: number;
  upMbps?: number;
  latencyMs?: number;
}

// One satellite on a circular orbit: inclination, ascending node and argument of latitude in degrees,
// mean motion in revolutions per day, half its daily change (the drag term CelesTrak publishes), and the
// seconds its own element epoch trails the shared one.
export type SatelliteElements = [
  inclination: number,
  node: number,
  argLatitude: number,
  meanMotion: number,
  meanMotionDot: number,
  lagSeconds: number,
];

export interface SatelliteSet {
  epoch: string;
  elements: SatelliteElements[];
}

export interface GrowthPoint {
  date: string;
  launched: number;
  inOrbit: number;
}

export interface OverlayData {
  sources: MapSource[];
  notes?: string;
  regions?: Record<string, MapRegion>;
  points?: MapPoint[];
  satellites?: SatelliteSet;
  growth?: GrowthPoint[];
}

export type MarkerShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'factory';

export interface MarkerStyle {
  label: string;
  color: string;
  shape: MarkerShape;
  hollow?: boolean;
}

export interface LevelStyle {
  label: string;
  color: string;
  hint: string;
}

export interface Metric {
  id: 'fixedMbps' | 'mobileMbps' | 'usersPct' | 'usedPct' | 'dailyPct' | 'awarePct' | 'helpPct';
  label: string;
  unit: string;
  asOf: 'speedAsOf' | 'usersAsOf' | 'surveyAsOf';
  // Lower bounds of each colour step after the first.
  stops: number[];
}

export interface OverlayDefinition {
  id: OverlayId;
  // Set on a layer that is offered beside its parent's metrics instead of in the overlay dropdown.
  parent?: OverlayId;
  label: string;
  blurb: string;
  levelTitle?: string;
  levels?: Record<string, LevelStyle>;
  markerTitle?: string;
  // Keyed `${kind}:${status}`. Data centers key on capacity tier instead, see markerKey.
  markers?: Record<string, MarkerStyle>;
  metrics?: Metric[];
  sizedByPower?: boolean;
}

const LIVE = '#19e6c1';
const PERMITTED = '#4d8dff';
const TRIAL = '#f5b54a';
const RESTRICTED = '#8f3358';
const PENDING = '#b6bcc8';

export const NO_DATA_FILL = '#1c1c22';
export const RAMP = ['#27215e', '#3d35a8', '#4f5bea', '#3b8ff6', '#12b8d6', '#5eead4', '#e4fffa'];

// One 0 to 100 scale for every survey share, so a colour means the same thing on each measure.
const PERCENT_STOPS = [15, 30, 45, 60, 75, 90];

export const OVERLAYS: OverlayDefinition[] = [
  {
    id: 'data-centers',
    label: 'Data centers',
    blurb: 'Campuses of 25 MW and up. Circle area tracks power. Grey marks sites still being built or proposed.',
    markerTitle: 'Capacity',
    sizedByPower: true,
    markers: {
      'tier-1': { label: '25 to 99 MW', color: '#22d3ee', shape: 'circle' },
      'tier-2': { label: '100 to 499 MW', color: '#4d8dff', shape: 'circle' },
      'tier-3': { label: '500 to 999 MW', color: '#FF9E64', shape: 'circle' },
      'tier-4': { label: '1 GW and up', color: '#ff3d9a', shape: 'circle' },
      construction: { label: 'Under construction', color: PENDING, shape: 'circle' },
      proposed: { label: 'Proposed', color: PENDING, shape: 'circle', hollow: true },
    },
  },
  {
    id: 'autonomous-driving',
    label: 'Autonomous driving',
    blurb: 'Where the law lets a car drive itself, where robotaxis carry the public, and where the vehicles are built.',
    levelTitle: 'Legal position',
    levels: {
      'driverless-service': { label: 'Driverless service running', color: LIVE, hint: 'The public can ride with no human on board.' },
      'driverless-permitted': { label: 'Driverless permitted', color: PERMITTED, hint: 'Law or permits allow it. No public service yet.' },
      supervised: { label: 'Supervised only', color: TRIAL, hint: 'A driver or safety operator must stay responsible.' },
      restricted: { label: 'No framework', color: RESTRICTED, hint: 'No law allows it, or autonomous operation is barred.' },
    },
    markerTitle: 'On the ground',
    markers: {
      'robotaxi:driverless-public': { label: 'Robotaxi, driverless and public', color: '#ffffff', shape: 'circle' },
      'robotaxi:driverless-limited': { label: 'Robotaxi, driverless and limited', color: '#c4b5fd', shape: 'circle' },
      'robotaxi:safety-driver': { label: 'Robotaxi with safety driver', color: '#c4b5fd', shape: 'circle', hollow: true },
      'robotaxi:announced': { label: 'Robotaxi announced', color: PENDING, shape: 'circle', hollow: true },
      'factory:producing': { label: 'AV factory, producing', color: '#FF9E64', shape: 'factory' },
      'factory:construction': { label: 'AV factory, in build', color: PENDING, shape: 'factory' },
      'factory:announced': { label: 'AV factory, announced', color: PENDING, shape: 'factory', hollow: true },
    },
  },
  {
    id: 'autonomous-delivery',
    label: 'Autonomous delivery',
    blurb: 'Sidewalk robots and driverless delivery vehicles. Where they are legal and where they are working.',
    levelTitle: 'Legal position',
    levels: {
      commercial: { label: 'Commercial service', color: LIVE, hint: 'Robots deliver to paying customers.' },
      permitted: { label: 'Framework in force', color: PERMITTED, hint: 'Rules allow delivery robots.' },
      pilot: { label: 'Trials only', color: TRIAL, hint: 'Case-by-case pilots and exemptions.' },
      restricted: { label: 'Banned or no framework', color: RESTRICTED, hint: 'Not allowed on public ways.' },
    },
    markerTitle: 'Deployments',
    markers: {
      'sidewalk-robot:commercial': { label: 'Sidewalk robots, commercial', color: '#ffffff', shape: 'square' },
      'sidewalk-robot:pilot': { label: 'Sidewalk robots, pilot', color: '#ffffff', shape: 'square', hollow: true },
      'sidewalk-robot:announced': { label: 'Sidewalk robots, announced', color: PENDING, shape: 'square', hollow: true },
      'road-robot:commercial': { label: 'Road vehicles, commercial', color: '#FF9E64', shape: 'diamond' },
      'road-robot:pilot': { label: 'Road vehicles, pilot', color: '#FF9E64', shape: 'diamond', hollow: true },
      'road-robot:announced': { label: 'Road vehicles, announced', color: PENDING, shape: 'diamond', hollow: true },
    },
  },
  {
    id: 'drone-delivery',
    label: 'Drone delivery',
    blurb: 'Where drones may fly parcels beyond the pilot’s line of sight, and the hubs flying them today.',
    levelTitle: 'Legal position',
    levels: {
      commercial: { label: 'Routine commercial service', color: LIVE, hint: 'Drones deliver to the public every day.' },
      permitted: { label: 'Rules in force', color: PERMITTED, hint: 'Long-range delivery is legal. No routine service yet.' },
      pilot: { label: 'Trials and waivers', color: TRIAL, hint: 'Flights need one-off approval.' },
      restricted: { label: 'Banned or no framework', color: RESTRICTED, hint: 'Delivery flights are not allowed.' },
    },
    markerTitle: 'Delivery hubs',
    markers: {
      'drone-hub:commercial': { label: 'Commercial hub', color: '#ffffff', shape: 'triangle' },
      'drone-hub:pilot': { label: 'Pilot hub', color: '#ffffff', shape: 'triangle', hollow: true },
      'drone-hub:announced': { label: 'Announced', color: PENDING, shape: 'triangle', hollow: true },
    },
  },
  {
    id: 'internet',
    label: 'Internet speeds',
    blurb: 'Median download speed and the share of people online, country by country.',
    metrics: [
      { id: 'fixedMbps', label: 'Fixed broadband', unit: 'Mbps', asOf: 'speedAsOf', stops: [25, 50, 100, 150, 200, 300] },
      { id: 'mobileMbps', label: 'Mobile', unit: 'Mbps', asOf: 'speedAsOf', stops: [25, 50, 75, 100, 150, 250] },
      { id: 'usersPct', label: 'Population online', unit: '%', asOf: 'usersAsOf', stops: [20, 40, 60, 75, 85, 95] },
    ],
  },
  {
    id: 'ai-usage',
    label: 'AI usage and sentiment',
    blurb: 'How many adults have used AI, how often, and whether they expect it to help their country.',
    metrics: [
      { id: 'usedPct', label: 'Ever used AI', unit: '%', asOf: 'surveyAsOf', stops: PERCENT_STOPS },
      { id: 'dailyPct', label: 'Use AI daily', unit: '%', asOf: 'surveyAsOf', stops: PERCENT_STOPS },
      { id: 'awarePct', label: 'Aware of AI', unit: '%', asOf: 'surveyAsOf', stops: PERCENT_STOPS },
      { id: 'helpPct', label: 'Expect AI to help their country', unit: '%', asOf: 'surveyAsOf', stops: PERCENT_STOPS },
    ],
  },
  {
    id: 'starlink',
    parent: 'internet',
    label: 'Starlink',
    blurb: 'Where Starlink sells service, with every satellite in the constellation moving overhead.',
    levelTitle: 'Starlink service',
    levels: {
      available: { label: 'Available', color: LIVE, hint: 'Starlink sells service here.' },
      coming: { label: 'Coming soon', color: PERMITTED, hint: 'Starlink has announced service.' },
      pending: { label: 'Awaiting approval', color: TRIAL, hint: 'Waiting on the regulator.' },
      unavailable: { label: 'Not offered', color: RESTRICTED, hint: 'Starlink does not serve this market.' },
    },
  },
];

export function overlayById(id: string | null | undefined): OverlayDefinition {
  return OVERLAYS.find((overlay) => overlay.id === id) ?? OVERLAYS[0];
}

export function markerKey(overlay: OverlayDefinition, point: MapPoint): string {
  if (!overlay.sizedByPower) return `${point.kind}:${point.status}`;
  if (point.status !== 'operational') return point.status;
  const mw = point.mw ?? 0;
  if (mw >= 1000) return 'tier-4';
  if (mw >= 500) return 'tier-3';
  if (mw >= 100) return 'tier-2';
  return 'tier-1';
}

const UNKNOWN_MARKER: MarkerStyle = { label: 'Other', color: PENDING, shape: 'circle', hollow: true };

export function markerStyle(overlay: OverlayDefinition, point: MapPoint): MarkerStyle {
  return overlay.markers?.[markerKey(overlay, point)] ?? UNKNOWN_MARKER;
}

// Radius in base-map units. Area grows with power so a 1 GW campus reads as 10 times a 100 MW one.
export function markerRadius(overlay: OverlayDefinition, point: MapPoint): number {
  if (!overlay.sizedByPower) return point.kind === 'factory' ? 11 : 6.5;
  return 2 + Math.sqrt(point.mw ?? 25) * 0.3;
}

export function rampColor(metric: Metric, value: number): string {
  let step = 0;
  while (step < metric.stops.length && value >= metric.stops[step]) step += 1;
  return RAMP[step];
}

export function regionFill(overlay: OverlayDefinition, region: MapRegion | undefined, metric?: Metric): string {
  if (!region) return NO_DATA_FILL;
  if (metric) {
    const value = region[metric.id];
    return typeof value === 'number' ? rampColor(metric, value) : NO_DATA_FILL;
  }
  return (region.level && overlay.levels?.[region.level]?.color) || NO_DATA_FILL;
}

export interface Projection {
  centralMeridian: number;
  scale: number;
  tx: number;
  ty: number;
}

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;

// Equal Earth forward projection, matching d3.geoEqualEarth so points land on the pre-projected base map.
export function project(projection: Projection, lon: number, lat: number): [number, number] {
  let lambda = lon - projection.centralMeridian;
  if (lambda < -180) lambda += 360;
  if (lambda > 180) lambda -= 360;
  const l = Math.asin(M * Math.sin((lat * Math.PI) / 180));
  const l2 = l * l;
  const l6 = l2 * l2 * l2;
  const x = ((lambda * Math.PI) / 180) * Math.cos(l) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)));
  const y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
  return [projection.tx + projection.scale * x, projection.ty - projection.scale * y];
}

const EARTH_RADIUS_KM = 6378.137;
const EARTH_MU = 398600.4418;
const J2 = 1.08262668e-3;
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const RAD = Math.PI / 180;

// Ground position of each satellite at `atMs`, as [lon, lat] in degrees. Circular orbits with the J2 drift
// of the node and perigee and a constant drag term. Within about 30 km of SGP4 for most satellites a fortnight
// out. Manoeuvres are not modelled, so a satellite that raises or lowers its orbit strays along its track.
export function satellitePositions(satellites: SatelliteSet, atMs: number): Array<[number, number]> {
  const sinceEpoch = (atMs - Date.parse(satellites.epoch)) / 1000;
  const days = (atMs - J2000_MS) / 86400000;
  const siderealAngle = ((280.46061837 + 360.98564736629 * days) % 360) * RAD;
  return satellites.elements.map(([inclination, node, argLatitude, meanMotion, meanMotionDot, lagSeconds]) => {
    const dt = sinceEpoch + lagSeconds;
    const n = (meanMotion * 2 * Math.PI) / 86400;
    const drift = 1.5 * J2 * (EARTH_RADIUS_KM / Math.cbrt(EARTH_MU / (n * n))) ** 2 * n;
    const cosI = Math.cos(inclination * RAD);
    const sinI = Math.sin(inclination * RAD);
    const u = argLatitude * RAD + (n + drift * (2 - 2.5 * sinI * sinI)) * dt + meanMotionDot * 2 * Math.PI * (dt / 86400) ** 2;
    const lon = Math.atan2(cosI * Math.sin(u), Math.cos(u)) + node * RAD - drift * cosI * dt - siderealAngle;
    return [((((lon / RAD) % 360) + 540) % 360) - 180, Math.asin(sinI * Math.sin(u)) / RAD];
  });
}

// A fortnight may refresh only some overlays. Each overlay shows its newest file at or before the chosen date.
export function resolveSnapshotDate(available: readonly string[], selected: string): string | undefined {
  return [...available].sort().reverse().find((date) => date <= selected);
}

export interface SnapshotChanges {
  newPoints: Set<string>;
  changedRegions: Set<string>;
}

export function diffSnapshots(previous: OverlayData | undefined, current: OverlayData): SnapshotChanges {
  const changes: SnapshotChanges = { newPoints: new Set(), changedRegions: new Set() };
  if (!previous) return changes;
  const before = new Map((previous.points ?? []).map((point) => [point.id, point.status]));
  for (const point of current.points ?? []) {
    if (before.get(point.id) !== point.status) changes.newPoints.add(point.id);
  }
  for (const [id, region] of Object.entries(current.regions ?? {})) {
    if (region.level && previous.regions?.[id]?.level !== region.level) changes.changedRegions.add(id);
  }
  return changes;
}

export function formatPower(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} GW`;
  return `${mw.toLocaleString('en-US', { maximumFractionDigits: 0 })} MW`;
}

export function formatSnapshotDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}
