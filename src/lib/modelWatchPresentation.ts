export interface ModelWatchSnapshotStatus {
  checkedAt: string;
  successfulSources: number;
  totalSources: number;
  detectedModels: string[];
}

export function isModelWatchSnapshotStatus(value: unknown): value is ModelWatchSnapshotStatus {
  if (!value || typeof value !== 'object') return false;
  const status = value as Partial<ModelWatchSnapshotStatus>;
  return typeof status.checkedAt === 'string'
    && Number.isFinite(Date.parse(status.checkedAt))
    && Number.isInteger(status.successfulSources)
    && (status.successfulSources ?? -1) >= 0
    && Number.isInteger(status.totalSources)
    && (status.totalSources ?? -1) >= (status.successfulSources ?? 0)
    && Array.isArray(status.detectedModels)
    && status.detectedModels.length <= 2_000
    && status.detectedModels.every((name) => typeof name === 'string' && name.length > 0 && name.length <= 200);
}

export function modelIdentityKey(name: string): string {
  return name
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[\s_\-\u2010-\u2015]+/g, ' ')
    .trim();
}

export function countDistinctModels(names: readonly string[]): number {
  return new Set(names.map(modelIdentityKey).filter(Boolean)).size;
}
