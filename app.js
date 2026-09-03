document.querySelectorAll('[data-section]').forEach(el => {
  el.addEventListener('click', (e) => {
    const id = el.dataset.section;
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

document.querySelectorAll('[data-comic-reader]').forEach(reader => {
  const pages = JSON.parse(reader.dataset.pages || '[]');
  const image = reader.querySelector('[data-reader-image]');
  const currentLabels = reader.querySelectorAll('[data-reader-current]');
  let current = 0;

  const render = () => {
    if (!pages.length) return;
    image.src = pages[current];
    image.alt = `Comic page ${current + 1} of ${pages.length}`;
    currentLabels.forEach(el => el.textContent = String(current + 1));
    reader.querySelectorAll('[data-reader-prev]').forEach(b => b.disabled = current === 0);
    reader.querySelectorAll('[data-reader-next]').forEach(b => b.disabled = current === pages.length - 1);
    if (pages[current + 1]) {
      const preload = new Image();
      preload.src = pages[current + 1];
    }
  };

  reader.querySelectorAll('[data-reader-prev]').forEach(btn => btn.addEventListener('click', () => {
    if (current > 0) {
      current -= 1;
      render();
      reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }));

  reader.querySelectorAll('[data-reader-next]').forEach(btn => btn.addEventListener('click', () => {
    if (current < pages.length - 1) {
      current += 1;
      render();
      reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }));

  reader.querySelectorAll('[data-reader-top]').forEach(btn => btn.addEventListener('click', () => {
    reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  let startX = 0;
  image.addEventListener('touchstart', e => {
    startX = e.changedTouches[0].clientX;
  }, { passive: true });

  image.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientX - startX;
    if (Math.abs(delta) < 55) return;
    if (delta < 0 && current < pages.length - 1) current += 1;
    if (delta > 0 && current > 0) current -= 1;
    render();
    reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, { passive: true });

  render();
});

document.querySelectorAll('[data-open-reader]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('[data-comic-reader]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});


document.querySelectorAll('[data-reveal-payment]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.revealPayment;
    const panel = document.querySelector(`[data-payment-panel="${key}"]`);
    if (!panel) return;

    const willOpen = panel.hasAttribute('hidden');

    document.querySelectorAll('[data-payment-panel]').forEach(other => {
      other.setAttribute('hidden', '');
    });
    document.querySelectorAll('[data-reveal-payment]').forEach(otherBtn => {
      otherBtn.classList.remove('active');
    });

    if (willOpen) {
      panel.removeAttribute('hidden');
      btn.classList.add('active');
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
});

document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const value = btn.dataset.copy;
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(value);
      btn.textContent = 'COPIED ✓';
    } catch {
      btn.textContent = value;
    }
    setTimeout(() => { btn.textContent = original; }, 1800);
  });
});

/* ============================================================
   TTD HQ // SITE FINISH PACK
   Global commercial shell, nav normalization, Arcade Cabinet 05,
   runtime metadata, future analytics hooks and cache-update logic.
   ============================================================ */

(function TTDCommercialShell(){
  const DOMAIN = 'https://tacticalterrordivision.com';
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* Load shared commercial styling on every app.js page. */
  if (!document.querySelector('link[data-ttd-commercial-css]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'commercial.css?v=2';
    css.dataset.ttdCommercialCss = '1';
    document.head.appendChild(css);
  }

  /* Runtime metadata safety net.
     NOTE: static HTML metadata is still preferred for social crawlers. */
  const metadata = {
    'index.html': {
      title: 'TTD HQ // Tactical Terror Division',
      description: 'Enter Titan City through Tactical Terror Division HQ: free comics, five browser arcade games, dossiers, districts, TBN broadcasts and the Loot Vault.',
      image: '/assets/images/ttd-banner.png'
    },
    'arcade.html': {
      title: 'TTD Arcade // Tactical Terror Division',
      description: 'Six browser arcade cabinets live inside Titan City: Power Command, Death Circuit, Titan Ball 92, Titan Ball 94, REB Renal Failure and REB Renal Revenge.',
      image: '/assets/images/module-arcade.png'
    },
    'comics.html': {
      title: 'Titan City Comics // TTD HQ',
      description: 'Read the Titan City comic library from Tactical Terror Division. Issues 1 to 3 are currently free.',
      image: '/assets/images/titan-city-issue-1-cover.png'
    },
    'store.html': {
      title: 'TTD Store // Tactical Terror Division Loot Vault',
      description: 'Official Tactical Terror Division sticker packs, mutant art, posters, roster cards, digital drops and future physical loot.',
      image: '/assets/images/store/ttd-skull-pack.jpg'
    },
    'payments.html': {
      title: 'Payments // Tactical Terror Division',
      description: 'TTD HQ payment and support grid for Lightning, PayPal contact and future product drops.',
      image: '/assets/images/ttd-logo-app.png'
    }
  };

  const currentMeta = metadata[path] || {
    title: document.title || 'TTD HQ // Tactical Terror Division',
    description: 'Tactical Terror Division // Titan City Network.',
    image: '/assets/images/ttd-logo-app.png'
  };

  if (currentMeta.title) document.title = currentMeta.title;

  const setMeta = (selector, attrName, attrValue, content) => {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  if (!document.head.querySelector('meta[name="description"]')) {
    setMeta('meta[name="description"]', 'name', 'description', currentMeta.description);
  }

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = path === 'index.html' ? `${DOMAIN}/` : `${DOMAIN}/${path}`;

  setMeta('meta[property="og:site_name"]','property','og:site_name','Tactical Terror Division');
  setMeta('meta[property="og:type"]','property','og:type','website');
  setMeta('meta[property="og:title"]','property','og:title',currentMeta.title);
  setMeta('meta[property="og:description"]','property','og:description',currentMeta.description);
  setMeta('meta[property="og:url"]','property','og:url',canonical.href);
  setMeta('meta[property="og:image"]','property','og:image',`${DOMAIN}${currentMeta.image}`);
  setMeta('meta[name="twitter:card"]','name','twitter:card','summary_large_image');
  setMeta('meta[name="twitter:title"]','name','twitter:title',currentMeta.title);
  setMeta('meta[name="twitter:description"]','name','twitter:description',currentMeta.description);
  setMeta('meta[name="twitter:image"]','name','twitter:image',`${DOMAIN}${currentMeta.image}`);

  /* Standardize the primary mobile navigation across the network. */
  document.querySelectorAll('.bottom-nav').forEach(nav => {
    nav.setAttribute('aria-label','TTD HQ primary navigation');
    nav.innerHTML = `
      <a href="index.html">HQ</a>
      <a href="map.html">MAP</a>
      <a href="comics.html">COMICS</a>
      <a href="arcade.html">ARCADE</a>
      <a href="store.html">STORE</a>
    `;
    nav.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href').toLowerCase();
      if (href === path || (path === '' && href === 'index.html')) {
        a.setAttribute('aria-current','page');
      }
    });
  });

  /* Global commercial/legal footer.
     Injected once on every page that loads app.js. */
  if (!document.querySelector('.ttd-commercial-footer')) {
    const footer = document.createElement('footer');
    footer.className = 'ttd-commercial-footer';
    footer.innerHTML = `
      <div class="ttd-footer-brand">
        <strong>TACTICAL TERROR DIVISION</strong>
        <span>TITAN CITY NETWORK // TTD HQ</span>
        <a href="${DOMAIN}/">${DOMAIN.replace('https://','')}</a>
      </div>
      <nav class="ttd-footer-links" aria-label="Commercial and legal">
        <a href="contact.html">CONTACT</a>
        <a href="privacy.html">PRIVACY</a>
        <a href="terms.html">TERMS</a>
        <a href="shipping.html">SHIPPING</a>
        <a href="refunds.html">REFUNDS</a>
        <a href="payments.html">PAYMENTS</a>
      </nav>
      <p class="ttd-footer-note">Comics, games, art and mutant commerce from the Tactical Terror Division. No clean surfaces guaranteed.</p>
    `;
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) document.body.insertBefore(footer,bottomNav);
    else document.body.appendChild(footer);
  }

  /* Legacy Arcade completion patch. Current Arcade already ships Power Command. */
  const arcadeMarker = [...document.querySelectorAll('.network-strip *')]
    .some(el => (el.textContent || '').includes('ARCADE // TITAN CITY'));

  if ((path === 'arcade.html' || arcadeMarker) && !document.querySelector('a[href="power-command.html"]')) {
    document.querySelectorAll('.network-strip > div').forEach(el => {
      if ((el.textContent || '').includes('4 CABINETS ONLINE')) {
        el.textContent = '5 CABINETS ONLINE';
      }
    });

    const selector = document.querySelector('main > section.panel .issue-actions');
    if (selector && !selector.querySelector('a[href="power-command.html"]')) {
      const button = document.createElement('a');
      button.className = 'read-comic-btn';
      button.href = 'power-command.html';
      button.textContent = 'POWER COMMAND // V11.3 →';
      selector.prepend(button);
    }

    const firstCabinet = document.querySelector('.reb-cabinet-link');
    const card = document.createElement('a');
    card.className = 'panel reb-cabinet-link ttd-power-command-card';
    card.href = 'power-command.html';
    card.dataset.powerCommandCabinet = '1';
    card.setAttribute('aria-label','Play Power Command V11.3 Boss Beacon');
    card.innerHTML = `
      <img src="assets/images/module-arcade.png" alt="Power Command TTD Arcade cabinet art">
      <div class="reb-cabinet-copy">
        <span class="ttd-pc-badge">CABINET 05 // RELEASE BUILD</span>
        <p class="eyebrow">TTD POWER COMMAND // SIX-SECTOR WAR MACHINE</p>
        <h2>POWER COMMAND</h2>
        <p>Pilot the Mayhem Machine across six hostile sectors. DRRRRRT primary fire, missiles, Shield Burst, EMP Pulse, Rage, Command Point upgrades and the final Command Fortress assault.</p>
        <strong>PLAY V11.3 // BOSS BEACON // FINAL TARGET LOCKED →</strong>
      </div>
    `;
    if (firstCabinet) firstCabinet.parentNode.insertBefore(card,firstCabinet);
    else document.querySelector('main')?.appendChild(card);
  }

  /* Future analytics hook.
     This sends NOTHING by itself. If a privacy-friendly analytics provider
     exposes window.plausible later, these events start working automatically. */
  window.ttdTrack = window.ttdTrack || function(name, props = {}) {
    try {
      if (typeof window.plausible === 'function') {
        window.plausible(name,{props});
      }
    } catch (_) {}
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    let type = 'Navigation';
    if (/power-command|titanball|reb-renal|death-circuit/i.test(href)) type = 'Game Click';
    else if (/store\.html/i.test(href)) type = 'Store Click';
    else if (/payments\.html|mailto:/i.test(href)) type = 'Commerce Click';
    else if (/issue-|comics\.html/i.test(href)) type = 'Comic Click';
    window.ttdTrack(type,{href,from:path});
  }, {passive:true});
})();

/* Service worker update policy.
   updateViaCache:none + registration.update() reduces the old-build problem. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js?v=12', {
        updateViaCache: 'none'
      });
      await registration.update();
    } catch (_) {}
  });
}


/* ============================================================
   TTD HQ // HARDCORE CHECKOUT ASSET BRIDGE
   Loads store/payment commerce scripts only where needed.
   ============================================================ */
(() => {
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const loadScript = (src, marker) => {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.setAttribute(`data-${marker}`,'1');
    document.head.appendChild(s);
  };

  if (page === 'store.html') {
    if (!document.querySelector('link[data-ttd-checkout-css]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'checkout.css?v=1';
      css.dataset.ttdCheckoutCss = '1';
      document.head.appendChild(css);
    }
    loadScript('store-checkout-bridge.js?v=1','ttd-store-checkout');
  }

  if (page === 'payments.html') {
    loadScript('payment-order-bridge.js?v=1','ttd-payment-order');
  }
})();
