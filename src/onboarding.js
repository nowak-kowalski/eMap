(function () {
  const wrap    = document.getElementById('onboarding');
  const slides  = document.getElementById('obSlides');
  const dots    = document.querySelectorAll('.ob-dot');
  const arrow   = document.getElementById('obArrow');
  const dotsBox = document.getElementById('obDots');
  const TOTAL   = 4;
  let cur = 0;
  let startX = 0;

  const ALWAYS_SHOW_ONBOARDING = true;

  // Временно всегда показываем онбординг, чтобы удобнее было дорабатывать дизайн.
  if (!ALWAYS_SHOW_ONBOARDING && localStorage.getItem('ob_done')) {
    wrap.classList.add('hidden');
    return;
  }

  function goTo(n) {
    cur = Math.max(0, Math.min(TOTAL - 1, n));
    slides.style.transform = `translate3d(calc(-${cur * 100}% - ${cur}px), 0, 0)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
    dotsBox.classList.toggle('is-hidden', cur === TOTAL - 1);
    arrow.setAttribute('aria-label', cur === TOTAL - 1 ? 'Начать' : 'Дальше');
  }

  // Свайп
  wrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) goTo(cur + (dx < 0 ? 1 : -1));
  });

  // Клик по слайду (кроме кнопки)
  slides.addEventListener('click', e => {
    if (e.target === arrow || arrow.contains(e.target)) return;
    if (cur < TOTAL - 1) goTo(cur + 1);
  });

  // Кнопка вперед / завершить
  arrow.addEventListener('click', () => {
    if (cur < TOTAL - 1) {
      goTo(cur + 1);
      return;
    }

    if (!ALWAYS_SHOW_ONBOARDING) localStorage.setItem('ob_done', '1');
    wrap.classList.add('hidden');
    window.showSearchScreen && window.showSearchScreen();
  });

  goTo(0);
})();
