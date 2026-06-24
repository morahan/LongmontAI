import React from 'react';
import { Activity, Database, ExternalLink, Filter, Globe2, Rss, ShieldCheck } from 'lucide-react';
import {
  coreSourceCount,
  modelWatchPipeline,
  modelWatchSnapshots,
  modelWatchSources,
  modelWatchUpdateTypes,
  openWeightSourceCount,
  regionCount,
} from '../data/modelWatch';

const ModelWatch: React.FC = () => {
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
            A minimal tracker for the model releases, open-weight drops, API availability changes, and retirements
            that matter across frontier labs and global open model builders.
          </p>
        </div>
        <div className="model-watch-hero-actions" aria-label="Primary source links">
          <a href="https://openai.com/news/rss.xml" target="_blank" rel="noopener noreferrer">
            <Rss size={16} />
            OpenAI RSS
          </a>
          <a href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer">
            <Database size={16} />
            Model Hub
          </a>
        </div>
      </section>

      <section className="model-watch-stats" aria-label="Model Watch coverage summary">
        <div>
          <span>{modelWatchSources.length}</span>
          <p>source families</p>
        </div>
        <div>
          <span>{coreSourceCount}</span>
          <p>frontier labs</p>
        </div>
        <div>
          <span>{openWeightSourceCount}</span>
          <p>open-weight lanes</p>
        </div>
        <div>
          <span>{regionCount}</span>
          <p>regions</p>
        </div>
      </section>

      <section className="model-watch-section" aria-labelledby="snapshot-heading">
        <div className="model-watch-section-header">
          <div>
            <div className="model-watch-eyebrow">
              <ShieldCheck size={16} />
              Seeded signals
            </div>
            <h2 id="snapshot-heading">Current Source Examples</h2>
          </div>
        </div>
        <div className="model-watch-snapshot-grid">
          {modelWatchSnapshots.map((item) => (
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

      <section className="model-watch-grid" aria-label="Model Watch collection plan">
        <div className="model-watch-panel">
          <div className="model-watch-panel-title">
            <Filter size={18} />
            <h2>Update Filters</h2>
          </div>
          <div className="model-watch-filter-list">
            {modelWatchUpdateTypes.map((type) => (
              <article key={type.label}>
                <h3>{type.label}</h3>
                <p>{type.description}</p>
                <div>
                  {type.keywords.map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="model-watch-panel">
          <div className="model-watch-panel-title">
            <Globe2 size={18} />
            <h2>Collector Pipeline</h2>
          </div>
          <ol className="model-watch-pipeline">
            {modelWatchPipeline.map((step) => (
              <li key={step.label}>
                <span>{step.label}</span>
                <p>{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="model-watch-section" aria-labelledby="sources-heading">
        <div className="model-watch-section-header">
          <div>
            <div className="model-watch-eyebrow">
              <Database size={16} />
              Source directory
            </div>
            <h2 id="sources-heading">Labs To Monitor</h2>
          </div>
        </div>
        <div className="model-watch-table-wrap">
          <table className="model-watch-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Region</th>
                <th>Lane</th>
                <th>Method</th>
                <th>Signals</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {modelWatchSources.map((source) => (
                <tr key={source.company}>
                  <td>
                    <strong>{source.company}</strong>
                    <span>{source.priority}</span>
                  </td>
                  <td>{source.region}</td>
                  <td>{source.lane}</td>
                  <td>{source.method}</td>
                  <td>{source.signals.join(' / ')}</td>
                  <td>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.company} source`}>
                      Open
                      <ExternalLink size={13} />
                    </a>
                    {source.backupUrl && (
                      <a
                        href={source.backupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${source.company} backup source`}
                      >
                        Backup
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ModelWatch;
