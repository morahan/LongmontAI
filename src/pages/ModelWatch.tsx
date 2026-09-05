import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, Clock3, Radar } from 'lucide-react';
import { Link } from 'react-router-dom';
import modelWatchStatus from '../data/modelWatch.generated.json';
import {
  latestBriefingModelIds,
  modelWatchModels,
  modelWatchSnapshots,
} from '../data/modelWatch';
import {
  countDistinctModels,
  isModelWatchSnapshotStatus,
  type ModelWatchSnapshotStatus,
} from '../lib/modelWatchPresentation';

const ModelWatch: React.FC = () => {
  const [snapshotStatus, setSnapshotStatus] = useState<ModelWatchSnapshotStatus>(modelWatchStatus);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/model-watch', { signal: controller.signal })
      .then((response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
          throw new Error('Model Watch snapshot is unavailable.');
        }
        return response.json();
      })
      .then((status: unknown) => {
        if (isModelWatchSnapshotStatus(status)) setSnapshotStatus(status);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  const briefingModelIds = new Set<string>(latestBriefingModelIds);
  const briefingModels = latestBriefingModelIds
    .map((id) => modelWatchModels.find((model) => model.id === id))
    .filter((model): model is (typeof modelWatchModels)[number] => Boolean(model));
  const latestModels = [...modelWatchModels]
    .filter((model) => model.releaseDateSort && !briefingModelIds.has(model.id))
    .sort((a, b) => (b.releaseDateSort ?? '').localeCompare(a.releaseDateSort ?? ''))
    .slice(0, 8);
  const detectedModelCount = countDistinctModels([
    ...snapshotStatus.detectedModels,
    ...modelWatchModels.map((model) => model.name),
  ]);
  const checkedAt = new Date(snapshotStatus.checkedAt);
  const checkedLabel = Number.isNaN(checkedAt.getTime())
    ? 'Awaiting first check'
    : checkedAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

  return (
    <div className="model-watch">
      <section className="model-watch-hero" aria-labelledby="model-watch-title">
        <div>
          <div className="model-watch-eyebrow">
            <Activity size={16} />
            Model intelligence
          </div>
          <h1 id="model-watch-title">Model Watch</h1>
          <p>
            The latest consequential model releases, availability changes, and comparable benchmark results in one
            quiet view.
          </p>
        </div>
        <div className="model-watch-hero-actions">
          <Link to="/leaderboard">
            Leaderboard
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="model-watch-stats" aria-label="Model Watch coverage summary">
        <div>
          <span>{detectedModelCount}</span>
          <p>models detected</p>
        </div>
        <div>
          <span>{snapshotStatus.successfulSources}/{snapshotStatus.totalSources}</span>
          <p>sources captured</p>
        </div>
        <div>
          <span>Reviewed</span>
          <p>snapshot publication</p>
        </div>
        <div>
          <span>0</span>
          <p>AI credits used</p>
        </div>
      </section>

      <section className="model-watch-section" aria-labelledby="snapshot-heading">
        <div className="model-watch-section-header">
          <div>
            <div className="model-watch-eyebrow">
              <Clock3 size={16} />
              Reviewed snapshot {checkedLabel}
            </div>
            <h2 id="snapshot-heading">Latest Signals</h2>
          </div>
        </div>
        <div className="model-watch-snapshot-grid">
          {modelWatchSnapshots.slice(0, 6).map((item) => (
            <a
              key={`${item.company}-${item.model}-${item.date}-${item.url}`}
              className="model-watch-snapshot"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="model-watch-snapshot-identity">
                <span className="model-watch-snapshot-company">{item.company}</span>
                <h3 className="model-watch-snapshot-model">{item.model}</h3>
                <p className="model-watch-snapshot-date">{item.date}</p>
              </div>
              <p className="model-watch-snapshot-update">{item.update}</p>
              <p className="model-watch-snapshot-lane">{item.lane}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="model-watch-section" aria-labelledby="briefing-models-heading">
        <div className="model-watch-section-header">
          <div>
            <div className="model-watch-eyebrow">
              <Radar size={16} />
              August 19 briefing
            </div>
            <h2 id="briefing-models-heading">Models Covered in the Latest Edition</h2>
          </div>
        </div>
        <div className="model-watch-release-list model-watch-briefing-list">
          {briefingModels.map((model) => (
            <article key={model.id}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <div>
                <h3>
                  <a href={model.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {model.name}
                  </a>
                </h3>
                <p>{model.description ?? model.lane}</p>
              </div>
              <span>{model.provider}</span>
              <time dateTime={model.releaseDateSort}>{model.releaseDate}</time>
            </article>
          ))}
        </div>
      </section>

      <section className="model-watch-section" aria-labelledby="models-heading">
        <div className="model-watch-section-header">
          <div>
            <div className="model-watch-eyebrow">
              <Radar size={16} />
              Active watchlist
            </div>
            <h2 id="models-heading">Other Recent Releases</h2>
          </div>
        </div>
        <div className="model-watch-release-list">
          {latestModels.map((model) => (
            <article key={model.id}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <div>
                <h3>{model.name}</h3>
                <p>{model.description ?? model.lane}</p>
              </div>
              <span>{model.provider}</span>
              <time dateTime={model.releaseDateSort}>{model.releaseDate}</time>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ModelWatch;
