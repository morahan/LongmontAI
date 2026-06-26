import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ExternalLink, SlidersHorizontal, Trophy } from 'lucide-react';
import {
  modelBenchmarkDefinitions,
  modelWatchModels,
} from '../data/modelWatch';
import type {
  ModelBenchmarkDefinition,
  ModelBenchmarkKey,
  ModelBenchmarkScore,
  ModelWatchModel,
} from '../data/modelWatch';

const defaultBenchmarkKey: ModelBenchmarkKey = 'sweBenchVerified';

const getBenchmarkDefinition = (key: ModelBenchmarkKey) =>
  modelBenchmarkDefinitions.find((benchmark) => benchmark.key === key) ?? modelBenchmarkDefinitions[0];

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  value.toLocaleString('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });

const formatMoney = (value: number) =>
  `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatBenchmarkScore = (
  score: ModelBenchmarkScore | undefined,
  benchmark: ModelBenchmarkDefinition,
) => {
  if (!score) {
    return 'N/A';
  }

  if (benchmark.unit === '%') {
    return `${formatNumber(score.value)}%`;
  }

  if (benchmark.unit === '$/task') {
    return formatMoney(score.value);
  }

  if (benchmark.unit === '$/M tokens') {
    return `${formatMoney(score.value)}/M`;
  }

  return formatNumber(score.value);
};

const getScoreValue = (model: ModelWatchModel, benchmarkKey: ModelBenchmarkKey) =>
  model.benchmarks[benchmarkKey]?.value;

const parseReleaseTimestamp = (model: ModelWatchModel) => {
  if (!model.releaseDateSort || !/^\d{4}-\d{2}-\d{2}$/.test(model.releaseDateSort)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = model.releaseDateSort.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
};

const formatReleaseDate = (timestamp: number) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));

interface LeaderboardChartPoint {
  model: ModelWatchModel;
  score: ModelBenchmarkScore;
  rank: number;
  releaseTimestamp: number;
  x: number;
  y: number;
}

interface LeaderboardChart {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  minValue: number;
  maxValue: number;
  minTimestamp: number;
  maxTimestamp: number;
  points: LeaderboardChartPoint[];
}

const SourceLink: React.FC<{ model: ModelWatchModel }> = ({ model }) => {
  const isExternal = model.sourceUrl.startsWith('http');

  if (isExternal) {
    return (
      <a href={model.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${model.name} source`}>
        {model.sourceLabel}
        <ExternalLink size={13} />
      </a>
    );
  }

  return (
    <Link to={model.sourceUrl} aria-label={`${model.name} source`}>
      {model.sourceLabel}
    </Link>
  );
};

const Leaderboard: React.FC = () => {
  const [selectedBenchmarkKey, setSelectedBenchmarkKey] = useState<ModelBenchmarkKey>(defaultBenchmarkKey);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const selectedBenchmark = getBenchmarkDefinition(selectedBenchmarkKey);

  const rankedModels = useMemo(() => {
    return [...modelWatchModels].sort((a, b) => {
      const aValue = getScoreValue(a, selectedBenchmarkKey);
      const bValue = getScoreValue(b, selectedBenchmarkKey);

      if (aValue === undefined && bValue === undefined) {
        return a.name.localeCompare(b.name);
      }

      if (aValue === undefined) {
        return 1;
      }

      if (bValue === undefined) {
        return -1;
      }

      const scoreDelta = selectedBenchmark.higherIsBetter ? bValue - aValue : aValue - bValue;
      return scoreDelta || a.name.localeCompare(b.name);
    });
  }, [selectedBenchmark.higherIsBetter, selectedBenchmarkKey]);

  const scoredModels = useMemo(
    () => rankedModels.filter((model) => model.benchmarks[selectedBenchmarkKey]),
    [rankedModels, selectedBenchmarkKey],
  );

  const leaderboardChart = useMemo<LeaderboardChart | null>(() => {
    const scoredEntries = scoredModels
      .map((model) => {
        const score = model.benchmarks[selectedBenchmarkKey];
        const releaseTimestamp = parseReleaseTimestamp(model);

        return score && releaseTimestamp !== null ? { model, score, releaseTimestamp } : null;
      })
      .filter((entry): entry is {
        model: ModelWatchModel;
        score: ModelBenchmarkScore;
        releaseTimestamp: number;
      } => entry !== null);

    if (scoredEntries.length === 0) {
      return null;
    }

    const rankedChartEntries = scoredEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
    const values = rankedChartEntries.map((entry) => entry.score.value);
    const timestamps = rankedChartEntries.map((entry) => entry.releaseTimestamp);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const width = 960;
    const height = 430;
    const plotLeft = 92;
    const plotRight = 48;
    const plotTop = 42;
    const plotBottom = 352;
    const plotWidth = width - plotLeft - plotRight;
    const plotHeight = plotBottom - plotTop;
    const valueRange = maxValue - minValue;
    const timeRange = maxTimestamp - minTimestamp;

    const points = rankedChartEntries.map((entry) => {
      const x = timeRange === 0
        ? plotLeft + plotWidth / 2
        : plotLeft + ((entry.releaseTimestamp - minTimestamp) / timeRange) * plotWidth;
      const y = valueRange === 0
        ? plotTop + plotHeight / 2
        : plotBottom - ((entry.score.value - minValue) / valueRange) * plotHeight;

      return {
        ...entry,
        x,
        y,
      };
    });

    return {
      width,
      height,
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      minValue,
      maxValue,
      minTimestamp,
      maxTimestamp,
      points,
    };
  }, [scoredModels, selectedBenchmarkKey]);

  const selectedChartPoint = leaderboardChart?.points.find((point) => point.model.id === selectedModelId)
    ?? leaderboardChart?.points[0];
  const scoredModelCount = scoredModels.length;
  const plottedModelCount = leaderboardChart?.points.length ?? 0;

  return (
    <div className="model-leaderboard">
      <section className="model-watch-hero leaderboard-hero" aria-labelledby="leaderboard-title">
        <div>
          <div className="model-watch-eyebrow">
            <Trophy size={16} />
            Model leaderboard
          </div>
          <h1 id="leaderboard-title">Leaderboard</h1>
          <p>
            Models surfaced by Model Watch, ranked by the benchmark you select. The chart only plots models with an
            exact release date and a reported score.
          </p>
        </div>
        <div className="model-watch-hero-actions" aria-label="Leaderboard links">
          <Link to="/model-watch">
            <Activity size={16} />
            Model Watch
          </Link>
        </div>
      </section>

      <section className="leaderboard-controls" aria-labelledby="benchmark-control-heading">
        <div>
          <div className="model-watch-eyebrow">
            <SlidersHorizontal size={16} />
            Sort metric
          </div>
          <h2 id="benchmark-control-heading">Benchmark</h2>
          <p>{selectedBenchmark.description}</p>
        </div>
        <label className="leaderboard-select-label" htmlFor="leaderboard-benchmark">
          <span>Select benchmark</span>
          <select
            id="leaderboard-benchmark"
            value={selectedBenchmarkKey}
            onChange={(event) => {
              setSelectedBenchmarkKey(event.target.value as ModelBenchmarkKey);
              setSelectedModelId(null);
            }}
          >
            {modelBenchmarkDefinitions.map((benchmark) => (
              <option key={benchmark.key} value={benchmark.key}>
                {benchmark.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="leaderboard-meta" aria-label="Leaderboard summary">
        <div>
          <span>{modelWatchModels.length}</span>
          <p>models tracked</p>
        </div>
        <div>
          <span>{scoredModelCount}</span>
          <p>with selected score</p>
        </div>
        <div>
          <span>{plottedModelCount}</span>
          <p>exact release dates</p>
        </div>
      </section>

      {leaderboardChart && (
        <section className="leaderboard-chart-section" aria-labelledby="leaderboard-chart-heading">
          <div className="model-watch-section-header">
            <div>
              <div className="model-watch-eyebrow">
                <Trophy size={16} />
                Metric plot
              </div>
              <h2 id="leaderboard-chart-heading">{selectedBenchmark.label}</h2>
            </div>
          </div>

          <div className="leaderboard-chart-layout">
            <div className="leaderboard-chart-wrap">
              <svg
                className="leaderboard-chart"
                viewBox={`0 0 ${leaderboardChart.width} ${leaderboardChart.height}`}
                role="img"
                aria-labelledby="leaderboard-chart-title leaderboard-chart-description"
              >
                <title id="leaderboard-chart-title">{selectedBenchmark.label} ranking</title>
                <desc id="leaderboard-chart-description">
                  {plottedModelCount} scored models with exact release dates plotted by release date and {selectedBenchmark.label}.
                </desc>
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                  const x = leaderboardChart.plotLeft
                    + tick * (leaderboardChart.width - leaderboardChart.plotLeft - leaderboardChart.plotRight);
                  const timestamp = leaderboardChart.minTimestamp
                    + tick * (leaderboardChart.maxTimestamp - leaderboardChart.minTimestamp);

                  return (
                    <g key={`x-${tick}`}>
                      <line
                        className="leaderboard-chart-grid"
                        x1={x}
                        x2={x}
                        y1={leaderboardChart.plotTop}
                        y2={leaderboardChart.plotBottom}
                      />
                      <text
                        className="leaderboard-chart-axis-label"
                        x={x}
                        y={leaderboardChart.plotBottom + 30}
                        textAnchor="middle"
                      >
                        {formatReleaseDate(timestamp)}
                      </text>
                    </g>
                  );
                })}
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                  const y = leaderboardChart.plotBottom
                    - tick * (leaderboardChart.plotBottom - leaderboardChart.plotTop);
                  const value = leaderboardChart.minValue
                    + tick * (leaderboardChart.maxValue - leaderboardChart.minValue);

                  return (
                    <g key={`y-${tick}`}>
                      <line
                        className="leaderboard-chart-row"
                        x1={leaderboardChart.plotLeft}
                        x2={leaderboardChart.width - leaderboardChart.plotRight}
                        y1={y}
                        y2={y}
                      />
                      <text
                        className="leaderboard-chart-axis-label"
                        x={leaderboardChart.plotLeft - 12}
                        y={y + 4}
                        textAnchor="end"
                      >
                        {formatBenchmarkScore({ value }, selectedBenchmark)}
                      </text>
                    </g>
                  );
                })}
                <line
                  className="leaderboard-chart-axis"
                  x1={leaderboardChart.plotLeft}
                  x2={leaderboardChart.width - leaderboardChart.plotRight}
                  y1={leaderboardChart.plotBottom}
                  y2={leaderboardChart.plotBottom}
                />
                <line
                  className="leaderboard-chart-axis"
                  x1={leaderboardChart.plotLeft}
                  x2={leaderboardChart.plotLeft}
                  y1={leaderboardChart.plotTop}
                  y2={leaderboardChart.plotBottom}
                />
                {leaderboardChart.points.map((point) => {
                  const isSelected = selectedChartPoint?.model.id === point.model.id;
                  const isTopThree = point.rank <= 3;
                  const labelToLeft = point.x > leaderboardChart.width - 260;

                  return (
                    <g key={point.model.id}>
                      <g
                        className={`leaderboard-chart-point ${isSelected ? 'is-selected' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`${point.model.name}, ${formatBenchmarkScore(point.score, selectedBenchmark)}, ${point.model.releaseDate}`}
                        onClick={() => setSelectedModelId(point.model.id)}
                        onFocus={() => setSelectedModelId(point.model.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedModelId(point.model.id);
                          }
                        }}
                      >
                        <circle cx={point.x} cy={point.y} r={isSelected ? 8 : 6} />
                      </g>
                      {isTopThree && (
                        <text
                          className="leaderboard-chart-label"
                          x={point.x + (labelToLeft ? -14 : 14)}
                          y={point.y + 4}
                          textAnchor={labelToLeft ? 'end' : 'start'}
                        >
                          {point.rank}. {point.model.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {selectedChartPoint && (
              <aside className="leaderboard-chart-detail" aria-label="Selected model">
                <span>#{selectedChartPoint.rank}</span>
                <h3>{selectedChartPoint.model.name}</h3>
                <strong>{formatBenchmarkScore(selectedChartPoint.score, selectedBenchmark)}</strong>
                <p>{selectedChartPoint.model.provider} - {selectedChartPoint.model.releaseDate}</p>
              </aside>
            )}
          </div>
        </section>
      )}

      {!leaderboardChart && scoredModelCount > 0 && (
        <section className="leaderboard-chart-empty" aria-label="Metric plot unavailable">
          <strong>No exact release dates for this benchmark yet.</strong>
          <span>Models remain ranked in the table below.</span>
        </section>
      )}

      <section className="model-watch-section" aria-labelledby="leaderboard-table-heading">
        <div className="model-watch-section-header">
          <div>
            <div className="model-watch-eyebrow">
              <Trophy size={16} />
              Ranked table
            </div>
            <h2 id="leaderboard-table-heading">{selectedBenchmark.label}</h2>
          </div>
        </div>

        <div className="model-watch-table-wrap">
          <table className="model-watch-table leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Model</th>
                <th>Provider</th>
                <th>{selectedBenchmark.label}</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rankedModels.map((model, index) => {
                const selectedScore = model.benchmarks[selectedBenchmarkKey];
                const rank = selectedScore ? `#${index + 1}` : 'N/A';

                return (
                  <tr key={model.id}>
                    <td className="leaderboard-rank-cell">
                      <span>{rank}</span>
                    </td>
                    <td className="leaderboard-model-cell">
                      <strong>{model.name}</strong>
                      <span>{model.lane}</span>
                    </td>
                    <td>
                      <strong>{model.provider}</strong>
                      <span>{model.releaseDate}</span>
                    </td>
                    <td>
                      <span className={`leaderboard-score ${selectedScore ? '' : 'is-empty'}`}>
                        {formatBenchmarkScore(selectedScore, selectedBenchmark)}
                      </span>
                      {selectedScore?.note && <small>{selectedScore.note}</small>}
                    </td>
                    <td>
                      <SourceLink model={model} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Leaderboard;
