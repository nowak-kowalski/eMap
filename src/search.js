(function () {
  const wrap = document.getElementById('search-screen');
  const nav  = document.getElementById('ssNav');
  const tabs = nav.querySelectorAll('.ss-tab');

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
  window.addEventListener('resize', () => {
    const active = nav.querySelector('.ss-tab--active');
    if (active) applyWidths(active);
  });

  window.showSearchScreen = function () {
    wrap.classList.remove('ss-hidden');
    const active = nav.querySelector('.ss-tab--active');
    if (active) applyWidths(active);
    wrap.classList.add('ss-entering');
    wrap.addEventListener('animationend', () => wrap.classList.remove('ss-entering'), { once: true });
  };
})();
