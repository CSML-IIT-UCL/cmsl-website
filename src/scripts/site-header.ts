export {};

function init(): void {
  const header = document.querySelector<HTMLElement>('.site-header');
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!header || !hero) return;

  let lastY = window.scrollY;
  let pending = false;

  const update = () => {
    const y = window.scrollY;
    const heroBottom = hero.offsetTop + hero.offsetHeight;
    const pastHero = y > heroBottom;
    const scrollingUp = y < lastY;
    header.classList.toggle('header-hidden', pastHero && scrollingUp);
    lastY = y;
    pending = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
