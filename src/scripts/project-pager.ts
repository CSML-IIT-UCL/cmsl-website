export {};

function initPager(pager: HTMLElement): void {
  const scroller = pager.querySelector<HTMLElement>('[data-project-scroll]');
  const prevBtn = pager.querySelector<HTMLButtonElement>('[data-project-prev]');
  const nextBtn = pager.querySelector<HTMLButtonElement>('[data-project-next]');
  const dots = Array.from(pager.querySelectorAll<HTMLButtonElement>('[data-project-dot]'));
  if (!scroller) return;

  const pageCount = scroller.children.length;

  const currentPage = (): number => {
    if (scroller.clientWidth === 0) return 0;
    return Math.round(scroller.scrollLeft / scroller.clientWidth);
  };

  const updateControls = (): void => {
    const page = currentPage();
    if (prevBtn) prevBtn.disabled = page <= 0;
    if (nextBtn) nextBtn.disabled = page >= pageCount - 1;
    dots.forEach((dot, index) => dot.setAttribute('aria-selected', String(index === page)));
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const scrollToPage = (page: number): void => {
    const clamped = Math.max(0, Math.min(pageCount - 1, page));
    scroller.scrollTo({ left: clamped * scroller.clientWidth, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  };

  prevBtn?.addEventListener('click', () => scrollToPage(currentPage() - 1));
  nextBtn?.addEventListener('click', () => scrollToPage(currentPage() + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => scrollToPage(index)));

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
  document.querySelectorAll<HTMLElement>('[data-project-pager]').forEach(initPager);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
