import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { chineseModelProviders, chineseModelReleases, ChineseModelProvider } from './chinese-model-releases';

const timelineStart = Date.parse('2023-01-01T00:00:00Z');
const timelineEnd = Date.parse('2027-01-01T00:00:00Z');
const years = [2023, 2024, 2025, 2026];

function dateLabel(date: string) {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function datePosition(date: string) {
    return ((Date.parse(`${date}T00:00:00Z`) - timelineStart) / (timelineEnd - timelineStart)) * 100;
}

export default function ChineseModelReleaseWidgets() {
    const [provider, setProvider] = useState<ChineseModelProvider | 'all'>('all');
    const [dark, setDark] = useState(true);
    const [selected, setSelected] = useState(chineseModelReleases[chineseModelReleases.length - 1]);
    const filtered = useMemo(
        () => provider === 'all' ? chineseModelReleases : chineseModelReleases.filter(item => item.provider === provider),
        [provider],
    );
    const selectProvider = (nextProvider: ChineseModelProvider) => {
        setProvider(nextProvider);
        const firstRelease = chineseModelReleases.find(item => item.provider === nextProvider);
        if (firstRelease) setSelected(firstRelease);
    };

    return (
        <section className={`release-widgets ${dark ? 'release-widgets-dark' : 'release-widgets-light'}`} aria-labelledby="release-cadence-heading">
            <div className="release-atlas">
                <div className="release-atlas-hero">
                    <div>
                        <p className="release-eyebrow">Chinese frontier model lineage</p>
                        <h2 id="release-cadence-heading">Release atlas for key Chinese model families</h2>
                        <p>An interactive artifact covering six providers and notable model-family releases, rather than every minor checkpoint.</p>
                    </div>
                    <div className="release-stats" aria-label="Atlas summary">
                        <div><strong>6</strong><span>Providers tracked</span></div>
                        <div><strong>{chineseModelReleases.length}</strong><span>Major releases</span></div>
                        <div><strong>2023</strong><span>Earliest release</span></div>
                        <div><strong>2026</strong><span>Latest release</span></div>
                    </div>
                </div>

                <div className="release-toolbar" aria-label="Release atlas filters">
                    {chineseModelProviders.map(item => (
                        <button key={item} type="button" className={provider === item ? 'release-chip active' : 'release-chip'} onClick={() => selectProvider(item)} aria-pressed={provider === item}>{item}</button>
                    ))}
                    <button type="button" className="release-toggle" onClick={() => setProvider('all')}>Show all</button>
                    <button type="button" className="release-toggle" onClick={() => setDark(value => !value)}>{dark ? 'Light theme' : 'Dark theme'}</button>
                </div>

                <div className="release-atlas-grid">
                    <aside className="release-note">
                        <p className="release-eyebrow">How to read</p>
                        <p>Dates combine official release notes with timeline aggregators and reference summaries. Month-level dates are normalized to the first day of the month.</p>
                    </aside>
                    <div className="release-table-wrap">
                        <table>
                            <caption>Chinese model family releases</caption>
                            <thead><tr><th>Date</th><th>Organization</th><th>Release</th><th>Source note</th></tr></thead>
                            <tbody>{filtered.map(item => (
                                <tr key={`${item.date}-${item.provider}-${item.release}`}>
                                    <td>{item.date}</td><td>{item.provider}</td><td>{item.release}</td><td>{item.source}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="release-cadence">
                <div className="release-cadence-heading">
                    <div><p className="release-eyebrow">Same dataset, shared x-axis</p><h2>Release cadence of Chinese openweight models</h2></div>
                    <p>{filtered.length} release{filtered.length === 1 ? '' : 's'} shown. Scroll horizontally to inspect the full 2023-2026 span.</p>
                </div>
                <div className="release-timeline-scroll" tabIndex={0} aria-label="Horizontally scrollable release timeline">
                    <div className="release-timeline" style={{ '--timeline-columns': years.length } as CSSProperties}>
                        <div className="release-year-grid" aria-hidden="true">{years.map(year => <span key={year}>{year}</span>)}</div>
                        <div className="release-axis" aria-hidden="true" />
                        <div className="release-timeline-dots">
                            {filtered.map((item, index) => (
                                <button key={`${item.date}-${item.provider}-${item.release}`} type="button" className={`release-dot provider-${chineseModelProviders.indexOf(item.provider)}`} style={{ left: `${datePosition(item.date)}%`, top: `${28 + (index % 6) * 30}px` }} onClick={() => setSelected(item)} aria-label={`${item.release}, ${item.provider}, ${dateLabel(item.date)}`} title={`${item.release} - ${dateLabel(item.date)}`} />
                            ))}
                        </div>
                        <div className="release-timeline-labels" aria-hidden="true"><span>Jan 2023</span><span>Jan 2024</span><span>Jan 2025</span><span>Jan 2026</span><span>Jan 2027</span></div>
                    </div>
                </div>
                <div className="release-detail" aria-live="polite"><span className={`release-dot provider-${chineseModelProviders.indexOf(selected.provider)}`} /><div><strong>{selected.release}</strong><span>{selected.provider} · {dateLabel(selected.date)} · {selected.source}</span></div></div>
            </div>
        </section>
    );
}
