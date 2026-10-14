export {};

function applyFilter(list: HTMLElement, emptyState: HTMLElement | null, from: number, to: number): void {
  let visibleCount = 0;
  Array.from(list.children).forEach((child) => {
    const item = child as HTMLElement;
    const yearAttr = item.dataset.year;
    const year = yearAttr ? Number(yearAttr) : null;
    const visible = year == null || (year >= from && year <= to);
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  if (emptyState) emptyState.hidden = visibleCount > 0;
}

function initYearFilter(container: HTMLElement): void {
  const root = container.closest<HTMLElement>('[data-publications-root]') ?? container.parentElement;
  const list = root?.querySelector<HTMLElement>('[data-publication-list]');
  if (!list) return;
  const emptyState = root?.querySelector<HTMLElement>('[data-publication-list-empty]') ?? null;

  const fromInput = container.querySelector<HTMLInputElement>('[data-year-filter-from]');
  const toInput = container.querySelector<HTMLInputElement>('[data-year-filter-to]');
  const rangeFill = container.querySelector<HTMLElement>('[data-year-filter-range]');
  const fromLabel = container.querySelector<HTMLElement>('[data-year-filter-from-label]');
  const toLabel = container.querySelector<HTMLElement>('[data-year-filter-to-label]');
  if (!fromInput || !toInput) return;

  const min = Number(container.dataset.minYear);
  const max = Number(container.dataset.maxYear);

  const update = (): void => {
    let fromVal = Number(fromInput.value);
    let toVal = Number(toInput.value);
    if (fromVal > toVal) {
      [fromVal, toVal] = [toVal, fromVal];
      fromInput.value = String(fromVal);
      toInput.value = String(toVal);
    }
    if (fromLabel) fromLabel.textContent = String(fromVal);
    if (toLabel) toLabel.textContent = String(toVal);
    if (rangeFill && max > min) {
      const fromPct = ((fromVal - min) / (max - min)) * 100;
      const toPct = ((toVal - min) / (max - min)) * 100;
      rangeFill.style.left = `${fromPct}%`;
      rangeFill.style.right = `${100 - toPct}%`;
    }
    applyFilter(list, emptyState, fromVal, toVal);
  };

  fromInput.addEventListener('pointerdown', () => {
    fromInput.style.zIndex = '3';
    toInput.style.zIndex = '2';
  });
  toInput.addEventListener('pointerdown', () => {
    toInput.style.zIndex = '3';
    fromInput.style.zIndex = '2';
  });

  fromInput.addEventListener('input', update);
  toInput.addEventListener('input', update);

  update();
}

function init(): void {
  document.querySelectorAll<HTMLElement>('[data-year-filter]').forEach(initYearFilter);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
