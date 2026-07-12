import React from 'react';
import { Activity, ArrowRight, CheckCircle2, Clock3, Radar } from 'lucide-react';
import { Link } from 'react-router-dom';
import modelWatchStatus from '../data/modelWatch.generated.json';
import {
  modelWatchModels,
  modelWatchSnapshots,
} from '../data/modelWatch';

const ModelWatch: React.FC = () => {
  const latestModels = [...modelWatchModels]
    .filter((model) => model.releaseDateSort)
    .sort((a, b) => (b.releaseDateSort ?? '').localeCompare(a.releaseDateSort ?? ''))
    .slice(0, 8);
  const detectedModelCount = new Set([
    ...modelWatchStatus.detectedModels,
    ...modelWatchModels.map((model) => model.name),
  ]).size;
  const checkedAt = new Date(modelWatchStatus.checkedAt);
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
          <span>{modelWatchStatus.successfulSources}/{modelWatchStatus.totalSources}</span>
          <p>sources healthy</p>
        </div>
        <div>
          <span>Daily</span>
          <p>autonomous check</p>
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
              Last checked {checkedLabel}
            </div>
            <h2 id="snapshot-heading">Latest Signals</h2>
          </div>
        </div>
        <div className="model-watch-snapshot-grid">
          {modelWatchSnapshots.slice(0, 6).map((item) => (
            <a
              key={`${item.company}-${item.update}`}
              className="model-watch-snapshot"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div>
                <span>{item.company}</span>
                <strong>{item.date}</strong>
              </div>
              <h3>{item.update}</h3>
              <p>{item.lane}</p>
            </a>
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
            <h2 id="models-heading">Recently Released</h2>
          </div>
        </div>
        <div className="model-watch-release-list">
          {latestModels.map((model) => (
            <article key={model.id}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <div>
                <h3>{model.name}</h3>
                <p>{model.lane}</p>
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
