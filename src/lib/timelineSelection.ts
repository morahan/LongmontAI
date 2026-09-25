export interface SelectableEvent {
  id: string;
}

export function reconcileVisibleSelection<T extends SelectableEvent>(
  selected: T | null,
  visible: readonly T[],
): T | null {
  return (selected && visible.find((event) => event.id === selected.id)) || visible[0] || null;
}
