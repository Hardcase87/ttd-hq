const navButtons = document.querySelectorAll('.bottom-nav button');
const moduleButtons = document.querySelectorAll('.module-card');

function goTo(target) {
  const section = document.getElementById(target);
  if (!section) return;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

navButtons.forEach(button => {
  button.addEventListener('click', () => {
    navButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    goTo(button.dataset.target);
  });
});

moduleButtons.forEach(button => {
  button.addEventListener('click', () => goTo(button.dataset.section));
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
