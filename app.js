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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
