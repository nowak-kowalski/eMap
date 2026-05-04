(function () {
  const wrap = document.getElementById('search-screen');
  const nav  = document.getElementById('ssNav');
  const tabs = nav.querySelectorAll('.ss-tab');
  let enterTimer = null;

  function calcActiveWidth() {
    const innerW   = nav.clientWidth - 8;        // 4px padding × 2
    const gaps     = (tabs.length - 1) * 4;
    const inactive = (tabs.length - 1) * 49;
    return Math.max(80, innerW - gaps - inactive);
  }

  function applyWidths(activeTab) {
    const aw = calcActiveWidth();
    tabs.forEach(t => {
      t.style.width = t === activeTab ? aw + 'px' : '49px';
    });
  }

  function activate(tab) {
    const current = nav.querySelector('.ss-tab--active');
    if (current === tab) return;

    current && current.classList.remove('ss-tab--active');
    tab.classList.add('ss-tab--active');
    applyWidths(tab);

    if (tab.dataset.tab === 'map') {
      setTimeout(goToMap, 460);
    }
  }

  function goToMap() {
    wrap.classList.add('ss-exiting');
    wrap.addEventListener('animationend', () => {
      wrap.classList.add('ss-hidden');
      wrap.classList.remove('ss-exiting');
    }, { once: true });
  }

  tabs.forEach(tab => tab.addEventListener('click', () => activate(tab)));

  document.getElementById('mapMenuButton')?.addEventListener('click', event => {
    event.stopPropagation();
    window.showSearchScreen();
  });

  window.addEventListener('resize', () => {
    const active = nav.querySelector('.ss-tab--active');
    if (active) applyWidths(active);
  });

  window.showSearchScreen = function () {
    wrap.classList.remove('ss-hidden');
    const searchTab = nav.querySelector('[data-tab="search"]');
    tabs.forEach(tab => tab.classList.toggle('ss-tab--active', tab === searchTab));
    if (searchTab) applyWidths(searchTab);
    clearTimeout(enterTimer);
    wrap.classList.add('ss-entering');
    enterTimer = setTimeout(() => {
      wrap.classList.remove('ss-entering');
    }, 1750);
  };
})();
