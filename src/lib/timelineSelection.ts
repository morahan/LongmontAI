export interface SelectableEvent {
  id: string;
}

export function reconcileVisibleSelection<T extends SelectableEvent>(
  selected: T | null,
  visible: readonly T[],
): T | null {
  if (selected && visible.some((event) => event.id === selected.id)) {
    return selected;
  }
  return visible[0] ?? null;
}
