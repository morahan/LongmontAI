import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Globe2, Minus, Plus, RotateCcw, Search } from 'lucide-react';
import world from '../data/maps/world.json';
import {
  OVERLAYS,
  RAMP,
  NO_DATA_FILL,
  diffSnapshots,
  formatPower,
  formatSnapshotDate,
  markerKey,
  markerRadius,
  markerStyle,
  overlayById,
  project,
  regionFill,
  resolveSnapshotDate,
  satellitePositions,
} from '../lib/maps';
import type {
  GrowthPoint,
  MapPoint,
  MapRegion,
  MarkerStyle,
  Metric,
  OverlayData,
  OverlayDefinition,
  OverlayId,
  SatelliteSet,
  SnapshotChanges,
} from '../lib/maps';

const snapshotLoaders = import.meta.glob<{ default: OverlayData }>('../data/maps/snapshots/*/*.json');

const datesByOverlay = new Map<string, string[]>();
for (const path of Object.keys(snapshotLoaders)) {
  const [, date, overlay] = /snapshots\/([^/]+)\/([^/]+)\.json$/.exec(path) ?? [];
  if (date && overlay) datesByOverlay.set(overlay, [...(datesByOverlay.get(overlay) ?? []), date]);
}
const snapshotDates = [...new Set([...datesByOverlay.values()].flat())].sort();

const loaded = new Map<string, Promise<OverlayData>>();
function loadSnapshot(overlay: OverlayId, date: string): Promise<OverlayData> {
  const path = `../data/maps/snapshots/${date}/${overlay}.json`;
  let pending = loaded.get(path);
  if (!pending) {
    pending = snapshotLoaders[path]().then((module) => module.default);
    loaded.set(path, pending);
  }
  return pending;
}

const WIDTH = world.width;
const HEIGHT = world.height;
const MAX_ZOOM = 16;
const FORTNIGHT_MS = 14 * 24 * 60 * 60 * 1000;
const LIST_LIMIT = 150;
const SATELLITE_TICK_MS = 1000;
const FACTORY_GLYPH = 'M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z';

const regionNames = new Map<string, string>(
  [...world.countries, ...world.states].map((shape) => [shape.id, shape.name]),
);

function regionName(id: string): string {
  return regionNames.get(id) ?? id;
}

interface View {
  k: number;
  x: number;
  y: number;
}

const HOME: View = { k: 1, x: 0, y: 0 };
const EMPTY = new Set<string>();
const NO_POINTS: MapPoint[] = [];

function clampView({ k, x, y }: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, k));
  return {
    k: zoom,
    x: Math.min(0, Math.max(WIDTH - WIDTH * zoom, x)),
    y: Math.min(0, Math.max(HEIGHT - HEIGHT * zoom, y)),
  };
}

function zoomAround(view: View, factor: number, cx: number, cy: number): View {
  const k = Math.min(MAX_ZOOM, Math.max(1, view.k * factor));
  const ratio = k / view.k;
  return clampView({ k, x: cx - (cx - view.x) * ratio, y: cy - (cy - view.y) * ratio });
}

function centredOn(x: number, y: number, k: number): View {
  return clampView({ k, x: WIDTH / 2 - x * k, y: HEIGHT / 2 - y * k });
}

type Target = { type: 'point'; id: string } | { type: 'region'; id: string };

interface Hover {
  target: Target;
  left: number;
  top: number;
}

function Marker({ style, radius }: { style: MarkerStyle; radius: number }) {
  const paint = {
    fill: style.hollow ? 'rgba(9, 9, 11, 0.55)' : style.color,
    stroke: style.color,
    strokeDasharray: style.hollow ? '3 2.4' : undefined,
  };
  switch (style.shape) {
    case 'square':
      return <rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx={radius * 0.3} {...paint} />;
    case 'diamond':
      return <rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx={radius * 0.2} transform="rotate(45) scale(0.82)" {...paint} />;
    case 'triangle':
      return <polygon points={`0,${-radius * 1.2} ${radius * 1.1},${radius * 0.8} ${-radius * 1.1},${radius * 0.8}`} strokeLinejoin="round" {...paint} />;
    case 'factory':
      return (
        <>
          <circle r={radius} fill="rgba(9, 9, 11, 0.82)" stroke={style.color} strokeDasharray={paint.strokeDasharray} />
          <path
            d={FACTORY_GLYPH}
            transform={`scale(${(radius * 1.2) / 24}) translate(-12 -12.5)`}
            fill={style.hollow ? 'none' : style.color}
            stroke={style.color}
            strokeWidth={style.hollow ? 2 : 0}
          />
        </>
      );
    default:
      return <circle r={radius} {...paint} />;
  }
}

interface RegionLayerProps {
  overlay: OverlayDefinition;
  regions: Record<string, MapRegion> | undefined;
  metric: Metric | undefined;
  changed: Set<string>;
}

const RegionLayer = memo(function RegionLayer({ overlay, regions, metric, changed }: RegionLayerProps) {
  const showStates = Object.keys(regions ?? {}).some((id) => id.startsWith('US-'));
  const shape = ({ id, d }: { id: string; d: string }) => {
    // With the state layer up, the nation stays blank so unlisted states do not inherit its colour.
    const region = showStates && id === 'USA' ? undefined : regions?.[id];
    const fill = regionFill(overlay, region, metric);
    return (
      <path
        key={id}
        d={d}
        data-region={id}
        className={`maps-region${fill === NO_DATA_FILL ? ' is-empty' : ''}${changed.has(id) ? ' is-changed' : ''}`}
        fill={fill}
      />
    );
  };
  return (
    <g>
      {world.countries.map(shape)}
      {showStates && <g className="maps-states">{world.states.map(shape)}</g>}
    </g>
  );
});

interface PlacedMarker {
  point: MapPoint;
  at: [number, number];
  radius: number;
  style: MarkerStyle;
  fan: string;
}

function placeMarkers(overlay: OverlayDefinition, points: MapPoint[]): PlacedMarker[] {
  const stacked = new Map<string, number>();
  return points
    .map((point) => ({
      point,
      at: project(world.projection, point.lon, point.lat),
      radius: markerRadius(overlay, point),
      style: markerStyle(overlay, point),
    }))
    .sort((a, b) => b.radius - a.radius)
    .map((marker) => {
      // Town-level records share a coordinate. Later ones fan out on a spiral that opens as the view zooms.
      const key = marker.at.map((value) => value.toFixed(1)).join();
      const nth = stacked.get(key) ?? 0;
      stacked.set(key, nth + 1);
      const reach = nth && (marker.radius + 3) * Math.sqrt(nth);
      return { ...marker, fan: `${(reach * Math.cos(nth * 2.4)).toFixed(1)} ${(reach * Math.sin(nth * 2.4)).toFixed(1)}` };
    });
}

// Markers shrink in map units as the view zooms, yet still grow on screen so dense clusters open up.
function markerTransform({ at, fan }: PlacedMarker, zoom: number): string {
  return `translate(${at[0].toFixed(1)} ${at[1].toFixed(1)}) scale(${(1 / zoom ** 0.6).toFixed(4)}) translate(${fan})`;
}

interface PointLayerProps {
  sized: boolean;
  markers: PlacedMarker[];
  zoom: number;
  fresh: Set<string>;
}

const PointLayer = memo(function PointLayer({ sized, markers, zoom, fresh }: PointLayerProps) {
  return (
    <g className={`maps-points${sized ? ' is-sized' : ''}`}>
      {markers.map((marker) => (
        <g
          key={marker.point.id}
          data-point={marker.point.id}
          className={`maps-point${marker.style.hollow ? ' is-hollow' : ''}`}
          transform={markerTransform(marker, zoom)}
        >
          {fresh.has(marker.point.id) && <circle className="maps-point-pulse" r={marker.radius + 5} stroke={marker.style.color} />}
          <Marker style={marker.style} radius={marker.radius} />
        </g>
      ))}
    </g>
  );
});

// Thousands of dots redrawn every second, so they share one path and skip React.
function SatelliteLayer({ satellites, zoom }: { satellites: SatelliteSet; zoom: number }) {
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const draw = () => {
      let d = '';
      for (const [lon, lat] of satellitePositions(satellites, Date.now())) {
        const [x, y] = project(world.projection, lon, lat);
        d += `M${x.toFixed(1)} ${y.toFixed(1)}h0`;
      }
      pathRef.current?.setAttribute('d', d);
    };
    draw();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(draw, SATELLITE_TICK_MS);
    return () => window.clearInterval(timer);
  }, [satellites]);

  return <path ref={pathRef} className="maps-satellites" style={{ '--maps-satellite-zoom': Math.sqrt(zoom) } as CSSProperties} />;
}

function useOverlayData(overlay: OverlayId, selectedDate: string) {
  const dates = datesByOverlay.get(overlay) ?? [];
  const date = resolveSnapshotDate(dates, selectedDate);
  const previousDate = date ? resolveSnapshotDate(dates.filter((other) => other < date), date) : undefined;
  const key = `${overlay}@${date}`;
  const [state, setState] = useState<{ key: string; data: OverlayData; changes: SnapshotChanges } | null>(null);

  useEffect(() => {
    if (!date) return undefined;
    let current = true;
    Promise.all([loadSnapshot(overlay, date), previousDate ? loadSnapshot(overlay, previousDate) : undefined])
      .then(([data, previous]) => {
        if (current) setState({ key, data, changes: diffSnapshots(previous, data) });
      });
    return () => {
      current = false;
    };
  }, [overlay, date, previousDate, key]);

  return { date, previousDate, ...(state?.key === key ? state : { data: undefined, changes: undefined }) };
}

interface Stat {
  value: string;
  label: string;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function statsFor(overlay: OverlayDefinition, data: OverlayData, metric: Metric | undefined): Stat[] {
  const points = data.points ?? [];
  const regions = Object.entries(data.regions ?? {});
  if (overlay.sizedByPower) {
    const tally = (status: string, label: string): Stat => {
      const sites = points.filter((point) => point.status === status);
      const power = sites.reduce((sum, point) => sum + (point.mw ?? 0), 0);
      return { value: `${sites.length}`, label: `${label} · ${formatPower(power)}` };
    };
    return [
      tally('operational', 'Operational'),
      tally('construction', 'Under construction'),
      tally('proposed', 'Proposed'),
      { value: `${new Set(points.map((point) => point.country)).size}`, label: 'Countries' },
    ];
  }
  if (metric) {
    const values = regions
      .map(([id, region]) => ({ id, value: region[metric.id] }))
      .filter((entry): entry is { id: string; value: number } => typeof entry.value === 'number')
      .sort((a, b) => b.value - a.value);
    if (!values.length) return [];
    const last = values[values.length - 1];
    const show = (value: number) => `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${metric.unit}`;
    return [
      { value: `${values.length}`, label: 'Countries measured' },
      { value: show(values[0].value), label: `Highest · ${regionName(values[0].id)}` },
      { value: show(median(values.map((entry) => entry.value))), label: 'Median country' },
      { value: show(last.value), label: `Lowest · ${regionName(last.id)}` },
    ];
  }
  const levelStats = Object.entries(overlay.levels ?? {}).slice(0, 2).map(([level, style]) => ({
    value: `${regions.filter(([, region]) => region.level === level).length}`,
    label: style.label,
  }));
  const downloads = regions.map(([, region]) => region.downMbps).filter((value): value is number => typeof value === 'number');
  const starlinkStats: Stat[] = data.satellites
    ? [
      { value: data.satellites.elements.length.toLocaleString('en-US'), label: 'Satellites in orbit' },
      { value: `${Math.round(median(downloads))} Mbps`, label: 'Median country download' },
    ]
    : [];
  const kinds = [...new Set(points.map((point) => point.kind))];
  const kindLabel: Record<string, string> = {
    robotaxi: 'Robotaxi cities',
    factory: 'AV factories',
    'sidewalk-robot': 'Sidewalk robot sites',
    'road-robot': 'Road robot sites',
    'drone-hub': 'Drone hubs',
  };
  return [
    ...levelStats,
    ...starlinkStats,
    ...kinds.slice(0, 2).map((kind) => ({
      value: `${points.filter((point) => point.kind === kind).length}`,
      label: kindLabel[kind] ?? kind,
    })),
  ];
}

const FSD_LABEL = { unsupervised: 'Unsupervised', supervised: 'Supervised only', none: 'Not available' } as const;

function metricText(region: MapRegion, metric: Metric): string {
  const value = region[metric.id];
  if (typeof value !== 'number') return 'No data';
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${metric.unit}`;
}

function Facts({ rows }: { rows: Array<[string, ReactNode] | false | undefined> }) {
  return (
    <dl className="maps-facts">
      {rows.filter((row): row is [string, ReactNode] => Boolean(row)).map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PointSummary({ overlay, point, full }: { overlay: OverlayDefinition; point: MapPoint; full?: boolean }) {
  const style = markerStyle(overlay, point);
  return (
    <>
      <p className="maps-card-kicker" style={{ color: style.color }}>{style.label}</p>
      <h3>{point.name}</h3>
      <p className="maps-card-place">{point.place} · {regionName(point.country)}</p>
      <Facts
        rows={[
          point.operator ? ['Operator', point.operator] : undefined,
          typeof point.mw === 'number' && ['Power', `${formatPower(point.mw)}${point.mwBasis === 'planned' ? ' planned' : ''}`],
          point.vehicle ? ['Builds', point.vehicle] : undefined,
        ]}
      />
      {full && point.detail && <p className="maps-card-detail">{point.detail}</p>}
    </>
  );
}

function RegionSummary({ overlay, id, region, full }: { overlay: OverlayDefinition; id: string; region: MapRegion | undefined; full?: boolean }) {
  const level = region?.level ? overlay.levels?.[region.level] : undefined;
  return (
    <>
      {level && <p className="maps-card-kicker" style={{ color: level.color }}>{level.label}</p>}
      <h3>{regionName(id)}</h3>
      {!region && <p className="maps-card-place">No data for this map yet.</p>}
      {region?.summary && <p className="maps-card-detail">{region.summary}</p>}
      {region && (
        <Facts
          rows={[
            region.fsd && ['Tesla FSD', FSD_LABEL[region.fsd]],
            typeof region.downMbps === 'number' && ['Median download', `${region.downMbps} Mbps`],
            typeof region.upMbps === 'number' && ['Median upload', `${region.upMbps} Mbps`],
            typeof region.latencyMs === 'number' && ['Median latency', `${region.latencyMs} ms`],
            ...(overlay.metrics ?? []).map((metric): [string, ReactNode] => [
              metric.label,
              `${metricText(region, metric)}${full && region[metric.asOf] ? ` (${region[metric.asOf]})` : ''}`,
            ]),
            typeof region.weeklyPct === 'number' && ['Use AI at least weekly', `${region.weeklyPct} %`],
            typeof region.betterLifePct === 'number' && ['Expect a better daily life', `${region.betterLifePct} %`],
          ]}
        />
      )}
    </>
  );
}

function SourceLink({ href }: { href: string | undefined }) {
  if (!href) return null;
  let host = href;
  try {
    host = new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  return (
    <a className="maps-source-link" href={href} target="_blank" rel="noopener noreferrer">
      Source: {host} <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}

function Legend({ overlay, metric, data }: { overlay: OverlayDefinition; metric: Metric | undefined; data: OverlayData | undefined }) {
  const present = new Set((data?.points ?? []).map((point) => markerKey(overlay, point)));
  const markers = Object.entries(overlay.markers ?? {}).filter(([key]) => present.has(key));
  return (
    <div className="maps-legend" aria-label="Map legend">
      {overlay.levels && (
        <div className="maps-legend-group">
          <h3>{overlay.levelTitle}</h3>
          <ul>
            {Object.entries(overlay.levels).map(([key, level]) => (
              <li key={key} title={level.hint}>
                <span className="maps-swatch" style={{ background: level.color }} />
                {level.label}
              </li>
            ))}
            <li><span className="maps-swatch" style={{ background: NO_DATA_FILL }} />No data</li>
          </ul>
        </div>
      )}
      {metric && (
        <div className="maps-legend-group">
          <h3>{metric.label} · {metric.unit}</h3>
          <div className="maps-ramp">
            {RAMP.map((color, step) => (
              <span key={color}>
                <i style={{ background: color }} />
                {step === 0 ? `<${metric.stops[0]}` : `${metric.stops[step - 1]}${step === RAMP.length - 1 ? '+' : ''}`}
              </span>
            ))}
          </div>
        </div>
      )}
      {data?.satellites && (
        <div className="maps-legend-group">
          <h3>In orbit now</h3>
          <ul>
            <li>
              <span className="maps-swatch maps-swatch-satellite" />
              Satellite, from {formatSnapshotDate(data.satellites.epoch.slice(0, 10))} orbits
            </li>
          </ul>
        </div>
      )}
      {markers.length > 0 && (
        <div className="maps-legend-group">
          <h3>{overlay.markerTitle}</h3>
          <ul>
            {markers.map(([key, style]) => (
              <li key={key}>
                <svg viewBox="-9 -9 18 18" width="16" height="16" aria-hidden="true" className="maps-legend-marker">
                  <Marker style={style} radius={style.shape === 'factory' ? 8 : 6} />
                </svg>
                {style.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface TimelineProps {
  dates: string[];
  selected: string;
  onSelect: (date: string) => void;
}

function SnapshotTimeline({ dates, selected, onSelect }: TimelineProps) {
  const index = dates.indexOf(selected);
  const latest = dates[dates.length - 1];
  const next = new Date(new Date(`${latest}T00:00:00Z`).getTime() + FORTNIGHT_MS).toISOString().slice(0, 10);
  return (
    <nav className="maps-timeline" aria-label="Map history by fortnight">
      <button
        type="button"
        className="maps-timeline-step"
        onClick={() => onSelect(dates[index - 1])}
        disabled={index <= 0}
        aria-label="Previous fortnight"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <ol>
        {dates.map((date) => (
          <li key={date}>
            <button
              type="button"
              className={`maps-timeline-stop${date === selected ? ' is-active' : ''}`}
              aria-pressed={date === selected}
              onClick={() => onSelect(date)}
            >
              <span className="maps-timeline-dot" aria-hidden="true" />
              <span>{formatSnapshotDate(date)}</span>
            </button>
          </li>
        ))}
        <li className="maps-timeline-upcoming">
          <span className="maps-timeline-dot" aria-hidden="true" />
          <span>Next update {formatSnapshotDate(next)}</span>
        </li>
      </ol>
      <button
        type="button"
        className="maps-timeline-step"
        onClick={() => onSelect(dates[index + 1])}
        disabled={index >= dates.length - 1}
        aria-label="Next fortnight"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}

const GROWTH_SERIES = [
  { key: 'launched', label: 'Launched', color: '#e0703a' },
  { key: 'inOrbit', label: 'In orbit', color: '#4d8dff' },
] as const;
const CHART_HEIGHT = 320;
const CHART_MARGIN = { top: 16, right: 20, bottom: 30, left: 46 };

function niceStep(max: number, ticks: number): number {
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return magnitude * ([1, 2, 5, 10].find((multiple) => multiple * magnitude >= raw) ?? 10);
}

function GrowthChart({ growth }: { growth: GrowthPoint[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const times = useMemo(() => growth.map((point) => Date.parse(`${point.date}T00:00:00Z`)), [growth]);
  const latest = growth[growth.length - 1];
  const step = niceStep(latest.launched, 3);
  const top = Math.ceil(latest.launched / step) * step;
  const plotWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const baseline = CHART_MARGIN.top + plotHeight;
  const x = (time: number) => CHART_MARGIN.left + ((time - times[0]) / (times[times.length - 1] - times[0])) * plotWidth;
  const y = (value: number) => baseline - (value / top) * plotHeight;
  const line = (key: 'launched' | 'inOrbit') => growth.map((point, index) => `${index ? 'L' : 'M'}${x(times[index]).toFixed(1)} ${y(point[key]).toFixed(1)}`).join('');

  const firstYear = new Date(times[0]).getUTCFullYear() + 1;
  const lastYear = new Date(times[times.length - 1]).getUTCFullYear();
  const yearEvery = plotWidth / (lastYear - firstYear + 1) < 44 ? 2 : 1;
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index)
    .filter((year) => (lastYear - year) % yearEvery === 0);

  const nearest = (clientX: number) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return null;
    const time = times[0] + ((clientX - box.left - CHART_MARGIN.left) / plotWidth) * (times[times.length - 1] - times[0]);
    let best = 0;
    for (let index = 1; index < times.length; index += 1) {
      if (Math.abs(times[index] - time) < Math.abs(times[best] - time)) best = index;
    }
    return best;
  };

  const onKeyDown = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    const move = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!move) return;
    event.preventDefault();
    setActive((current) => Math.min(growth.length - 1, Math.max(0, (current ?? growth.length - 1) + move)));
  };

  const shown = active === null ? undefined : growth[active];
  const shownX = active === null ? 0 : x(times[active]);
  const yearEnds = growth.filter((point, index) => point.date.endsWith('-12-31') || index === growth.length - 1);

  return (
    <section className="maps-growth" aria-label="Starlink constellation growth">
      <h2>Constellation growth</h2>
      <p className="maps-growth-sub">
        Starlink satellites launched, and how many are still in orbit, month by month. The gap is satellites that have
        come back down.
      </p>
      <ul className="maps-growth-legend">
        {GROWTH_SERIES.map((series) => (
          <li key={series.key}>
            <i style={{ background: series.color }} />
            {series.label}
            <strong>{latest[series.key].toLocaleString('en-US')}</strong>
          </li>
        ))}
      </ul>
      <div className="maps-growth-plot" ref={wrapRef}>
        <svg
          width={width}
          height={CHART_HEIGHT}
          role="img"
          tabIndex={0}
          aria-label={`Line chart. ${latest.launched.toLocaleString('en-US')} Starlink satellites launched and ${latest.inOrbit.toLocaleString('en-US')} in orbit as of ${formatSnapshotDate(latest.date)}. Use the arrow keys to step through months.`}
          onPointerMove={(event) => setActive(nearest(event.clientX))}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          {Array.from({ length: top / step + 1 }, (_, index) => index * step).map((tick) => (
            <g key={tick}>
              <line className={tick ? 'maps-growth-grid' : 'maps-growth-axis'} x1={CHART_MARGIN.left} x2={width - CHART_MARGIN.right} y1={y(tick)} y2={y(tick)} />
              <text className="maps-growth-tick" x={CHART_MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                {tick >= 1000 ? `${tick / 1000}k` : tick}
              </text>
            </g>
          ))}
          {years.map((year) => (
            <text key={year} className="maps-growth-tick" x={x(Date.UTC(year, 0, 1))} y={baseline + 20} textAnchor="middle">{year}</text>
          ))}
          <path d={`${line('inOrbit')}L${x(times[times.length - 1]).toFixed(1)} ${baseline}L${x(times[0]).toFixed(1)} ${baseline}Z`} fill={GROWTH_SERIES[1].color} opacity="0.12" />
          {GROWTH_SERIES.map((series) => (
            <path key={series.key} d={line(series.key)} className="maps-growth-line" stroke={series.color} />
          ))}
          {shown && <line className="maps-growth-crosshair" x1={shownX} x2={shownX} y1={CHART_MARGIN.top} y2={baseline} />}
          {GROWTH_SERIES.map((series) => (
            <circle
              key={series.key}
              className="maps-growth-dot"
              cx={shown ? shownX : x(times[times.length - 1])}
              cy={y((shown ?? latest)[series.key])}
              r="4"
              fill={series.color}
            />
          ))}
        </svg>
        {shown && (
          <div className={`maps-tooltip${shownX > width * 0.45 ? ' is-left' : ''}`} style={{ left: shownX, top: CHART_MARGIN.top }} role="presentation">
            <p className="maps-card-place">{formatSnapshotDate(shown.date)}</p>
            <dl className="maps-growth-readout">
              {GROWTH_SERIES.map((series) => (
                <div key={series.key}>
                  <dt><i style={{ background: series.color }} />{series.label}</dt>
                  <dd>{shown[series.key].toLocaleString('en-US')}</dd>
                </div>
              ))}
              <div>
                <dt>Deorbited</dt>
                <dd>{(shown.launched - shown.inOrbit).toLocaleString('en-US')}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
      <details className="maps-growth-table">
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr><th scope="col">As of</th><th scope="col">Launched</th><th scope="col">In orbit</th><th scope="col">Deorbited</th></tr>
          </thead>
          <tbody>
            {yearEnds.map((point) => (
              <tr key={point.date}>
                <th scope="row">{formatSnapshotDate(point.date)}</th>
                <td>{point.launched.toLocaleString('en-US')}</td>
                <td>{point.inOrbit.toLocaleString('en-US')}</td>
                <td>{(point.launched - point.inOrbit).toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="maps-growth-credit">
        Counted from the CelesTrak satellite catalog. For a live 3D view of every satellite, see{' '}
        <a href="https://satellitemap.space/" target="_blank" rel="noopener noreferrer">satellitemap.space</a>. For launch-by-launch
        tracking, see <a href="https://orbitalradar.com/starlink-tracker" target="_blank" rel="noopener noreferrer">orbitalradar.com</a>.
      </p>
    </section>
  );
}

export default function Maps() {
  const [params, setParams] = useSearchParams();
  const requested = overlayById(params.get('map'));
  const base = requested.parent ? overlayById(requested.parent) : requested;
  const layers = OVERLAYS.filter((candidate) => candidate.parent === base.id);
  const layer = requested.parent ? requested : layers.find((candidate) => candidate.id === params.get('metric'));
  const overlay = layer ?? base;
  const requestedDate = params.get('date');
  const selectedDate = requestedDate && snapshotDates.includes(requestedDate)
    ? requestedDate
    : snapshotDates[snapshotDates.length - 1];
  const metric = layer ? undefined : base.metrics?.find((candidate) => candidate.id === params.get('metric')) ?? base.metrics?.[0];

  const { data, date, previousDate, changes } = useOverlayData(overlay.id, selectedDate);
  const [view, setView] = useState<View>(HOME);
  const [hover, setHover] = useState<Hover | null>(null);
  const [selection, setSelection] = useState<Target | null>(null);
  const [query, setQuery] = useState('');

  const frameRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);

  const markers = useMemo(() => placeMarkers(overlay, data?.points ?? NO_POINTS), [overlay, data]);
  const pointsById = useMemo(() => new Map(markers.map((marker) => [marker.point.id, marker.point])), [markers]);
  const stats = useMemo(() => (data ? statsFor(overlay, data, metric) : []), [overlay, data, metric]);

  const update = (changesToApply: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changesToApply)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const chooseOverlay = (id: string) => {
    setSelection(null);
    setHover(null);
    setQuery('');
    update({ map: id, metric: null });
  };

  const toMap = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return [WIDTH / 2, HEIGHT / 2];
    const at = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return [at.x, at.y];
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    // React registers wheel listeners as passive, and a pinch has to cancel the browser's page zoom.
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const [cx, cy] = toMap(event.clientX, event.clientY);
      setView((current) => zoomAround(current, Math.exp(-event.deltaY * 0.012), cx, cy));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [toMap]);

  const targetOf = (element: EventTarget | null): Target | null => {
    if (!(element instanceof Element)) return null;
    const point = element.closest('[data-point]');
    if (point) return { type: 'point', id: point.getAttribute('data-point') ?? '' };
    const region = element.closest('[data-region]');
    if (region) return { type: 'region', id: region.getAttribute('data-region') ?? '' };
    return null;
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragged.current = false;
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const held = pointers.current.get(event.pointerId);
    if (held) {
      const others = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId);
      const [fromX, fromY] = toMap(held.x, held.y);
      const [toX, toY] = toMap(event.clientX, event.clientY);
      if (Math.hypot(event.clientX - held.x, event.clientY - held.y) > 3) dragged.current = true;
      if (others.length) {
        const other = others[0][1];
        const before = Math.hypot(held.x - other.x, held.y - other.y);
        const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        const [cx, cy] = toMap((event.clientX + other.x) / 2, (event.clientY + other.y) / 2);
        if (before > 0) setView((current) => zoomAround(current, after / before, cx, cy));
      } else if (dragged.current) {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
        setView((current) => clampView({ ...current, x: current.x + toX - fromX, y: current.y + toY - fromY }));
      }
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (dragged.current) {
        setHover(null);
        return;
      }
    }
    if (event.pointerType === 'touch') return;
    const target = targetOf(event.target);
    const frame = frameRef.current?.getBoundingClientRect();
    if (!target || !frame) {
      setHover(null);
      return;
    }
    setHover({ target, left: event.clientX - frame.left, top: event.clientY - frame.top });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const wasHeld = pointers.current.delete(event.pointerId);
    if (wasHeld && !dragged.current) setSelection(targetOf(event.target));
  };

  const focusTarget = (target: Target) => {
    setSelection(target);
    if (target.type === 'point') {
      const point = pointsById.get(target.id);
      if (point) setView(centredOn(...project(world.projection, point.lon, point.lat), Math.max(view.k, 5)));
    } else {
      const shape = svgRef.current?.querySelector<SVGGraphicsElement>(`[data-region="${target.id}"]`);
      if (shape) {
        const box = shape.getBBox();
        const fit = Math.min(WIDTH / (box.width * 1.8), HEIGHT / (box.height * 1.8));
        setView(centredOn(box.x + box.width / 2, box.y + box.height / 2, fit));
      }
    }
    frameRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const zoomBy = (factor: number) => setView((current) => zoomAround(current, factor, WIDTH / 2, HEIGHT / 2));

  const describe = (target: Target, full: boolean) => {
    if (target.type === 'point') {
      const point = pointsById.get(target.id);
      return point ? <PointSummary overlay={overlay} point={point} full={full} /> : null;
    }
    return <RegionSummary overlay={overlay} id={target.id} region={data?.regions?.[target.id]} full={full} />;
  };

  const selectedSource = selection?.type === 'point'
    ? pointsById.get(selection.id)?.source
    : selection && data?.regions?.[selection.id]?.source;

  const highlight = hover?.target ?? selection;
  const highlightMarker = highlight?.type === 'point' ? markers.find((marker) => marker.point.id === highlight.id) : undefined;
  const highlightShape = highlight?.type === 'region'
    ? [...world.states, ...world.countries].find((shape) => shape.id === highlight.id)
    : undefined;

  const needle = query.trim().toLowerCase();
  const listedPoints = useMemo(() => {
    const points = [...(data?.points ?? [])].sort((a, b) => (b.mw ?? 0) - (a.mw ?? 0) || a.name.localeCompare(b.name));
    if (!needle) return points;
    return points.filter((point) => [point.name, point.operator, point.place, regionName(point.country), point.vehicle]
      .some((field) => field?.toLowerCase().includes(needle)));
  }, [data, needle]);
  const listedRegions = useMemo(() => {
    const regions = Object.entries(data?.regions ?? {}).filter(([id]) => regionNames.has(id));
    const levelOrder = Object.keys(overlay.levels ?? {});
    regions.sort(([aId, a], [bId, b]) => (metric
      ? (b[metric.id] ?? -1) - (a[metric.id] ?? -1)
      : levelOrder.indexOf(a.level ?? '') - levelOrder.indexOf(b.level ?? '')) || regionName(aId).localeCompare(regionName(bId)));
    if (!needle) return regions;
    return regions.filter(([id, region]) => `${regionName(id)} ${region.summary ?? ''}`.toLowerCase().includes(needle));
  }, [data, overlay, metric, needle]);

  const changeCount = (changes?.newPoints.size ?? 0) + (changes?.changedRegions.size ?? 0);

  return (
    <div className="maps-page">
      <header className="maps-hero">
        <div className="model-watch-eyebrow"><Globe2 size={14} aria-hidden="true" /> Maps</div>
        <h1>The AI buildout, mapped</h1>
        <p>
          Where the compute is going in, where machines are allowed to drive, deliver and fly, and how fast the
          world can reach any of it. Redrawn every two weeks.
        </p>
      </header>

      <section className="maps-controls" aria-label="Map controls">
        <label className="maps-select">
          <span>Map overlay</span>
          <select value={base.id} onChange={(event) => chooseOverlay(event.target.value)}>
            {OVERLAYS.filter((option) => !option.parent).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <p className="maps-blurb">{overlay.blurb}</p>
        <p className="maps-updated">
          <span>Last updated</span>
          <time dateTime={date}>{date ? formatSnapshotDate(date) : 'Not yet published'}</time>
        </p>
      </section>

      {base.metrics && (
        <div className="maps-metrics" role="group" aria-label="Measure">
          {[...base.metrics, ...layers].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === (layer ?? metric)?.id}
              className={option.id === (layer ?? metric)?.id ? 'is-active' : ''}
              onClick={() => update({ map: base.id, metric: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="maps-frame" ref={frameRef} data-zoomed={view.k > 1 ? 'true' : undefined}>
        <svg
          ref={svgRef}
          className="maps-canvas"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`World map: ${overlay.label}${date ? `, updated ${formatSnapshotDate(date)}` : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={(event) => pointers.current.delete(event.pointerId)}
          onPointerLeave={() => setHover(null)}
          onDoubleClick={(event) => {
            const [cx, cy] = toMap(event.clientX, event.clientY);
            setView((current) => zoomAround(current, 2, cx, cy));
          }}
        >
          <defs>
            <radialGradient id="maps-ocean" cx="50%" cy="42%" r="75%">
              <stop offset="0%" stopColor="#101a33" />
              <stop offset="100%" stopColor="#070a14" />
            </radialGradient>
            <clipPath id="maps-sphere-clip"><path d={world.sphere} /></clipPath>
          </defs>
          <path d={world.sphere} className="maps-sphere" fill="url(#maps-ocean)" />
          <g clipPath="url(#maps-sphere-clip)">
            <g transform={`translate(${view.x.toFixed(2)} ${view.y.toFixed(2)}) scale(${view.k.toFixed(4)})`}>
              <path d={world.graticule} className="maps-graticule" />
              <RegionLayer overlay={overlay} regions={data?.regions} metric={metric} changed={changes?.changedRegions ?? EMPTY} />
              {highlightShape && <path d={highlightShape.d} className="maps-region-highlight" />}
              <PointLayer sized={Boolean(overlay.sizedByPower)} markers={markers} zoom={view.k} fresh={changes?.newPoints ?? EMPTY} />
              {data?.satellites && <SatelliteLayer satellites={data.satellites} zoom={view.k} />}
              {highlightMarker && (
                <circle
                  className="maps-point-highlight"
                  r={highlightMarker.radius + 4}
                  transform={markerTransform(highlightMarker, view.k)}
                />
              )}
            </g>
          </g>
        </svg>

        <div className="maps-zoom">
          <button type="button" onClick={() => zoomBy(1.8)} aria-label="Zoom in" disabled={view.k >= MAX_ZOOM}><Plus size={16} aria-hidden="true" /></button>
          <button type="button" onClick={() => zoomBy(1 / 1.8)} aria-label="Zoom out" disabled={view.k <= 1}><Minus size={16} aria-hidden="true" /></button>
          <button type="button" onClick={() => setView(HOME)} aria-label="Reset view" disabled={view.k === 1}><RotateCcw size={15} aria-hidden="true" /></button>
        </div>

        {!data && <p className="maps-loading" role="status">{date ? 'Loading map…' : 'No data published for this map yet.'}</p>}

        {hover && (
          <div
            className={`maps-tooltip${hover.left > (frameRef.current?.clientWidth ?? 0) * 0.62 ? ' is-left' : ''}`}
            style={{ left: hover.left, top: hover.top }}
            role="presentation"
          >
            {describe(hover.target, false)}
          </div>
        )}
      </div>

      <Legend overlay={overlay} metric={metric} data={data} />

      <SnapshotTimeline dates={snapshotDates} selected={selectedDate} onSelect={(next) => update({ date: next === snapshotDates[snapshotDates.length - 1] ? null : next })} />
      <p className="maps-timeline-note">
        {previousDate
          ? `${changeCount} change${changeCount === 1 ? '' : 's'} since ${formatSnapshotDate(previousDate)}. New and changed places pulse on the map.`
          : 'First edition. Each fortnight adds a stop here, so you can step back and watch the map fill in.'}
      </p>

      {stats.length > 0 && (
        <div className="maps-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <span>{stat.value}</span>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {data?.growth && <GrowthChart growth={data.growth} />}

      <div className="maps-explore">
        <section className="maps-detail" aria-live="polite" aria-label="Selected place">
          {selection && describe(selection, true)}
          {selection && <SourceLink href={selectedSource || undefined} />}
          {!selection && (
            <p className="maps-detail-empty">
              Hover the map for a quick read. Click a place, or pick one from the list, to pin its details and source here.
              Drag to pan. Pinch, double-click or use the buttons to zoom.
            </p>
          )}
        </section>

        <section className="maps-browse" aria-label="Browse this map">
          <label className="maps-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search this map</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${overlay.label.toLowerCase()}`}
            />
          </label>
          <div className="maps-browse-scroll">
            {listedPoints.length > 0 && (
              <ul className="maps-list">
                {listedPoints.slice(0, LIST_LIMIT).map((point) => {
                  const style = markerStyle(overlay, point);
                  return (
                    <li key={point.id}>
                      <button
                        type="button"
                        aria-pressed={selection?.type === 'point' && selection.id === point.id}
                        onClick={() => focusTarget({ type: 'point', id: point.id })}
                      >
                        <span className="maps-swatch" style={{ background: style.hollow ? 'transparent' : style.color, borderColor: style.color }} />
                        <span className="maps-list-name">{point.name}</span>
                        <span className="maps-list-meta">
                          {typeof point.mw === 'number' ? `${formatPower(point.mw)} · ` : ''}{point.place}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {listedPoints.length > LIST_LIMIT && (
              <p className="maps-list-more">Showing {LIST_LIMIT} of {listedPoints.length}. Search to narrow the list.</p>
            )}
            {listedRegions.length > 0 && (
              <>
                {listedPoints.length > 0 && <h3 className="maps-list-heading">Jurisdictions</h3>}
                <ul className="maps-list">
                  {listedRegions.map(([id, region]) => (
                    <li key={id}>
                      <button
                        type="button"
                        aria-pressed={selection?.type === 'region' && selection.id === id}
                        onClick={() => focusTarget({ type: 'region', id })}
                      >
                        <span className="maps-swatch" style={{ background: regionFill(overlay, region, metric) }} />
                        <span className="maps-list-name">{regionName(id)}</span>
                        <span className="maps-list-meta">
                          {metric ? metricText(region, metric) : overlay.levels?.[region.level ?? '']?.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {data && listedPoints.length === 0 && listedRegions.length === 0 && (
              <p className="maps-list-more" role="status">Nothing matches that search.</p>
            )}
          </div>
        </section>
      </div>

      {data && (
        <footer className="maps-sources">
          <h2>Sources and method</h2>
          {data.notes && <p>{data.notes}</p>}
          <ul>
            {data.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>
              </li>
            ))}
          </ul>
          <p>Every marker and jurisdiction links to its own source when selected. Base map: Natural Earth, Equal Earth projection.</p>
        </footer>
      )}
    </div>
  );
}
