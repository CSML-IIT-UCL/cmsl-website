export {};

function initPager(pager: HTMLElement): void {
  const scroller = pager.querySelector<HTMLElement>('[data-collab-scroll]');
  const prevBtn = pager.querySelector<HTMLButtonElement>('[data-collab-prev]');
  const nextBtn = pager.querySelector<HTMLButtonElement>('[data-collab-next]');
  if (!scroller) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const step = (): number => {
    const card = scroller.querySelector<HTMLElement>('.collab-card');
    return card ? card.getBoundingClientRect().width + 20 : scroller.clientWidth;
  };

  const updateControls = (): void => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    if (prevBtn) prevBtn.disabled = scroller.scrollLeft <= 0;
    if (nextBtn) nextBtn.disabled = scroller.scrollLeft >= max - 1;
  };

  prevBtn?.addEventListener('click', () => {
    scroller.scrollBy({ left: -step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
  nextBtn?.addEventListener('click', () => {
    scroller.scrollBy({ left: step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  let pending = false;
  scroller.addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      updateControls();
      pending = false;
    });
  });
  window.addEventListener('resize', updateControls);

  updateControls();
}

function init(): void {
  document.querySelectorAll<HTMLElement>('[data-collab-pager]').forEach(initPager);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
