import type { ModelBenchmarkDefinition, ModelWatchModel } from '../data/modelWatch';

export function rankBenchmarkModels(models: ModelWatchModel[], benchmark: ModelBenchmarkDefinition) {
  const value = (model: ModelWatchModel) => {
    const score = model.benchmarks[benchmark.key]?.value;
    return benchmark.rankable !== false && Number.isFinite(score) ? score : undefined;
  };
  const sorted = [...models].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === undefined || bv === undefined) {
      return av === bv ? a.name.localeCompare(b.name) : av === undefined ? 1 : -1;
    }
    return (benchmark.higherIsBetter ? bv - av : av - bv) || a.name.localeCompare(b.name);
  });
  let rank: number | null = null;
  let previous: number | undefined;
  return sorted.map((model, index) => {
    const score = value(model);
    if (score === undefined) return { model, rank: null };
    if (score !== previous) rank = index + 1;
    previous = score;
    return { model, rank };
  });
}

/** Empty ranges have no domain; equal ranges plot at the midpoint. */
export function benchmarkRange(values: number[]) {
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
}

export function benchmarkPosition(value: number, min: number, max: number) {
  return max === min ? 0.5 : (value - min) / (max - min);
}
