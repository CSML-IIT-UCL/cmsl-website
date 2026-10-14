export type PublicationSortKey = 'date' | 'citations';

interface SortableItem {
  dateRank: number;
  citations: number | null;
}

// Date order is the server-rendered order (newest first). Citation order is
// descending, with unknown counts last and date order breaking ties.
export function compareItems(key: PublicationSortKey, a: SortableItem, b: SortableItem): number {
  if (key === 'citations') {
    const difference = (b.citations ?? -1) - (a.citations ?? -1);
    if (difference !== 0) return difference;
  }
  return a.dateRank - b.dateRank;
}

function readItem(element: HTMLElement): SortableItem {
  const citations = element.dataset.citations;
  return {
    dateRank: Number(element.dataset.dateRank),
    citations: citations ? Number(citations) : null,
  };
}

function initSort(control: HTMLElement): void {
  const root = control.closest<HTMLElement>('[data-publications-root]') ?? control.parentElement;
  const list = root?.querySelector<HTMLElement>('[data-publication-list]');
  if (!list) return;
  const buttons = Array.from(control.querySelectorAll<HTMLButtonElement>('button[data-sort]'));

  const apply = (key: PublicationSortKey): void => {
    const items = Array.from(list.children) as HTMLElement[];
    items
      .map((element) => ({ element, item: readItem(element) }))
      .sort((a, b) => compareItems(key, a.item, b.item))
      .forEach(({ element }) => list.appendChild(element));
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.sort === key));
  };

  for (const button of buttons) {
    button.addEventListener('click', () => apply(button.dataset.sort === 'citations' ? 'citations' : 'date'));
  }
  control.hidden = false;
}

function init(): void {
  document.querySelectorAll<HTMLElement>('[data-publication-sort]').forEach(initSort);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
