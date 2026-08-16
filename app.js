const navButtons = document.querySelectorAll('.bottom-nav button');
const moduleButtons = document.querySelectorAll('.module-card button');

navButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    navButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const targets = ['top', 'map', 'comics', 'dossiers', 'tbn'];
    const target = targets[index];

    if (target === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const section = document.getElementById(target);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

moduleButtons.forEach(button => {
  button.addEventListener('click', () => {
    const section = document.getElementById(button.dataset.section);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
