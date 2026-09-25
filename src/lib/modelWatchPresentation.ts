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
