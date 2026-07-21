import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  ChevronRight,
  Cpu,
  FileText,
  FlaskConical,
  Layers3,
  Microscope,
  Network,
  Telescope,
  UnlockKeyhole,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  timelineCategories,
  timelineEvents,
  timelineOrganizations,
  type TimelineCategory,
  type TimelineEvent,
} from '../data/timeline';

type RangeId = 'all' | 'foundations' | 'deep-learning' | 'transformer' | 'frontier';
type View = 'timeline' | 'matrix';

const categoryLegend: Record<TimelineCategory, { icon: LucideIcon; description: string }> = {
  'Model release': { icon: Bot, description: 'A notable model became available.' },
  'Open weight': { icon: UnlockKeyhole, description: 'Weights were released for public use.' },
  'Research breakthrough': { icon: Microscope, description: 'A technique or result changed the field.' },
  Paper: { icon: FileText, description: 'A foundational or influential publication.' },
  Compute: { icon: Cpu, description: 'A hardware or training-scale step forward.' },
  'Scientific insight': { icon: FlaskConical, description: 'AI helped produce a meaningful new finding.' },
  Forecast: { icon: Telescope, description: 'A prediction or milestone-setting outlook.' },
};

const ranges: Array<{ id: RangeId; label: string; start: string; end: string; caption: string }> = [
  { id: 'all', label: 'All history', start: '1950-01-01', end: '2027-01-01', caption: '1950 to present' },
  { id: 'foundations', label: '1950-2005', start: '1950-01-01', end: '2006-01-01', caption: 'Foundations' },
  { id: 'deep-learning', label: '2006-2016', start: '2006-01-01', end: '2017-01-01', caption: 'Deep learning' },
  { id: 'transformer', label: '2017-2022', start: '2017-01-01', end: '2023-01-01', caption: 'Transformer era' },
  { id: 'frontier', label: '2023-now', start: '2023-01-01', end: '2027-01-01', caption: 'Frontier cadence' },
];

function iconForCategory(category: TimelineCategory) {
  return categoryLegend[category].icon;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function yearFor(date: string) {
  return Number(date.slice(0, 4));
}

function groupEvents(events: TimelineEvent[], range: RangeId) {
  const keyFor = (event: TimelineEvent) => {
    if (range === 'frontier') return event.date.slice(0, 7);
    if (range === 'transformer') return event.date.slice(0, 7);
    return event.date.slice(0, 4);
  };

  return Array.from(events.reduce((groups, event) => {
    const key = keyFor(event);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
    return groups;
  }, new Map<string, TimelineEvent[]>()).entries()).map(([key, eventsAtDate]) => ({
    key,
    events: eventsAtDate,
    firstDate: eventsAtDate[0].date,
  }));
}

export default function Timeline() {
  const [activeRange, setActiveRange] = useState<RangeId>('all');
  const [activeCategories, setActiveCategories] = useState<TimelineCategory[]>([]);
  const [organization, setOrganization] = useState('All organizations');
  const [view, setView] = useState<View>('timeline');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent>(timelineEvents[timelineEvents.length - 1]);

  const range = ranges.find((item) => item.id === activeRange) ?? ranges[0];
  const filteredEvents = useMemo(() => timelineEvents.filter((event) => (
    event.date >= range.start
    && event.date < range.end
    && (activeCategories.length === 0 || activeCategories.includes(event.category))
    && (organization === 'All organizations' || event.organization === organization)
  )), [activeCategories, organization, range]);
  const eventGroups = useMemo(() => groupEvents(filteredEvents, activeRange), [activeRange, filteredEvents]);
  const expandedEvents = eventGroups.find((group) => group.key === selectedGroup)?.events ?? [];
  const visibleYears = Math.max(1, yearFor(range.end) - yearFor(range.start));

  const toggleCategory = (category: TimelineCategory) => {
    setActiveCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]);
    setSelectedGroup(null);
  };

  const selectRange = (nextRange: RangeId) => {
    setActiveRange(nextRange);
    setSelectedGroup(null);
  };

  return (
    <div className="timeline-page">
      <section className="timeline-hero" aria-labelledby="timeline-title">
        <div>
          <div className="timeline-eyebrow"><CalendarDays size={16} /> Living reference</div>
          <h1 id="timeline-title">AI Timeline</h1>
          <p>
            A maintained map of the ideas, machines, papers, models and scientific results that changed what AI can do.
            Artificial intelligence is the umbrella; machine learning and deep learning are the methods that dominate much of this modern arc.
          </p>
        </div>
        <div className="timeline-hero-note">
          <strong>{timelineEvents.length}</strong>
          <span>events in the initial dataset</span>
          <p>Designed for regular additions: every entry has a date, category, source and concise reason it matters.</p>
        </div>
      </section>

      <section className="timeline-controls" aria-label="Timeline controls">
        <div className="timeline-control-group">
          <span>Range</span>
          <div className="timeline-segmented" role="group" aria-label="Date range">
            {ranges.map((item) => <button key={item.id} type="button" onClick={() => selectRange(item.id)} className={activeRange === item.id ? 'is-active' : ''}>{item.label}</button>)}
          </div>
        </div>
        <div className="timeline-control-group">
          <span>Focus</span>
          <div className="timeline-filter-row">
            {timelineCategories.map((category) => {
              const Icon = iconForCategory(category);
              return <button key={category} type="button" onClick={() => toggleCategory(category)} className={activeCategories.includes(category) ? 'is-active' : ''}><Icon size={13} aria-hidden="true" />{category}</button>;
            })}
          </div>
        </div>
        <label className="timeline-select-label">
          <span>Organization</span>
          <select value={organization} onChange={(event) => { setOrganization(event.target.value); setSelectedGroup(null); }}>
            <option>All organizations</option>
            {timelineOrganizations.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="timeline-view-switch" role="group" aria-label="Display mode">
          <button type="button" className={view === 'timeline' ? 'is-active' : ''} onClick={() => setView('timeline')}><Network size={15} /> Timeline</button>
          <button type="button" className={view === 'matrix' ? 'is-active' : ''} onClick={() => setView('matrix')}><Layers3 size={15} /> Matrix</button>
        </div>
      </section>

      <section className="timeline-legend" aria-labelledby="timeline-legend-title">
        <div className="timeline-legend-heading">
          <div className="timeline-eyebrow">Event key</div>
          <h2 id="timeline-legend-title">What each timeline icon means</h2>
        </div>
        <ul>
          {timelineCategories.map((category) => {
            const { description } = categoryLegend[category];
            const Icon = iconForCategory(category);
            const categoryClass = `category-${category.toLowerCase().replace(/[^a-z]+/g, '-')}`;
            return <li key={category}>
              <span className={`timeline-legend-symbol ${categoryClass}`}><Icon size={16} aria-hidden="true" /></span>
              <div><strong>{category}</strong><span>{description}</span></div>
            </li>;
          })}
        </ul>
      </section>

      <section className="timeline-workspace" aria-labelledby="timeline-workspace-title">
        <div className="timeline-workspace-header">
          <div>
            <div className="timeline-eyebrow">{range.caption}</div>
            <h2 id="timeline-workspace-title">{filteredEvents.length} events in view</h2>
          </div>
          <p>The x-axis is fixed to the selected time range. Dense periods collapse into count nodes; select one to inspect every event inside it.</p>
        </div>

        {view === 'timeline' ? (
          <div className="timeline-canvas-wrap" tabIndex={0} aria-label="Scrollable historical AI timeline">
            <div className="timeline-canvas" style={{ '--timeline-years': visibleYears + 1 } as CSSProperties}>
              <div className="timeline-year-ruler" aria-hidden="true">
                {Array.from({ length: visibleYears + 1 }, (_, index) => yearFor(range.start) + index).map((year) => <span key={year}>{year}</span>)}
              </div>
              <div className="timeline-axis" aria-hidden="true" />
              <div className="timeline-nodes">
                {eventGroups.map((group, index) => {
                  const position = ((Date.parse(`${group.firstDate}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / (Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`))) * 100;
                  const firstCategory = group.events[0].category;
                  const Icon = iconForCategory(firstCategory);
                  const isOpen = selectedGroup === group.key;
                  return (
                    <button
                      key={group.key}
                      type="button"
                      className={`timeline-node category-${firstCategory.toLowerCase().replace(/[^a-z]+/g, '-')}${isOpen ? ' is-active' : ''}`}
                      style={{ left: `${Math.max(0, Math.min(100, position))}%`, top: `${40 + (index % 4) * 34}px` }}
                      onClick={() => { setSelectedGroup(isOpen ? null : group.key); setSelectedEvent(group.events[0]); }}
                      aria-expanded={isOpen}
                      aria-label={`${group.events.length} event${group.events.length === 1 ? '' : 's'} in ${group.key}`}
                    >
                      {group.events.length === 1 ? <Icon size={13} aria-hidden="true" /> : <span>{group.events.length}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="timeline-range-labels" aria-hidden="true"><span>{formatDate(range.start)}</span><span>{formatDate(range.end)}</span></div>
            </div>
          </div>
        ) : (
          <div className="timeline-matrix-wrap">
            <table className="timeline-matrix">
              <caption>AI timeline event matrix</caption>
              <thead><tr><th>Date</th><th>Event</th><th>Organization</th><th>Type</th><th>Access</th></tr></thead>
              <tbody>{filteredEvents.map((event) => <tr key={event.id}>
                <td><time dateTime={event.date}>{formatDate(event.date)}</time></td>
                <td><button type="button" onClick={() => setSelectedEvent(event)}>{event.title}<ChevronRight size={14} /></button></td>
                <td>{event.organization}</td><td>{event.category}</td><td>{event.openWeight ? 'Open weight' : 'Hosted / research'}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      {expandedEvents.length > 0 && (
        <section className="timeline-expanded" aria-live="polite" aria-label={`Events in ${selectedGroup}`}>
          <div className="timeline-expanded-heading"><div><div className="timeline-eyebrow">Expanded cluster</div><h2>{expandedEvents.length} events in {selectedGroup}</h2></div><button type="button" onClick={() => setSelectedGroup(null)}>Close</button></div>
          <div className="timeline-expanded-list">
            {expandedEvents.map((event) => <button key={event.id} type="button" onClick={() => setSelectedEvent(event)} className={selectedEvent.id === event.id ? 'is-active' : ''}>
              <time dateTime={event.date}>{formatDate(event.date)}</time><strong>{event.title}</strong><span>{event.organization}</span>
            </button>)}
          </div>
        </section>
      )}

      <aside className="timeline-detail" aria-label="Selected event">
        <div className="timeline-detail-icon">{(() => { const Icon = iconForCategory(selectedEvent.category); return <Icon size={20} />; })()}</div>
        <div className="timeline-detail-copy"><div><span>{selectedEvent.category}</span><time dateTime={selectedEvent.date}>{formatDate(selectedEvent.date)}</time></div><h2>{selectedEvent.title}</h2><p>{selectedEvent.summary}</p><strong>{selectedEvent.organization}</strong></div>
        <div className="timeline-source"><span>Source: {selectedEvent.source}</span><a href={selectedEvent.sourceUrl} target="_blank" rel="noopener noreferrer">Link to Source<ArrowUpRight size={15} /></a></div>
      </aside>
    </div>
  );
}
