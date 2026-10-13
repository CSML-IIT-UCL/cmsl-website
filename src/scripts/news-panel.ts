export {};

const DESKTOP_QUERY = '(min-width: 701px)';

function sizeList(el: HTMLElement): void {
  if (!window.matchMedia(DESKTOP_QUERY).matches) {
    el.style.removeProperty('max-height');
    return;
  }
  const items = Array.from(el.querySelectorAll(':scope > .news-item')) as HTMLElement[];
  if (items.length <= 2) {
    el.style.maxHeight = 'none';
    return;
  }
  const top = el.getBoundingClientRect().top;
  const secondItemBottom = items[1].getBoundingClientRect().bottom;
  el.style.maxHeight = `${Math.ceil(secondItemBottom - top)}px`;
}

function sizeAllLists(): void {
  document.querySelectorAll<HTMLElement>('[data-news-list]').forEach(sizeList);
}

function init(): void {
  if (!document.querySelector('[data-news-list]')) return;
  sizeAllLists();

  let pending = false;
  const scheduleResize = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      sizeAllLists();
      pending = false;
    });
  };

  window.addEventListener('load', sizeAllLists);
  window.addEventListener('resize', scheduleResize);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
