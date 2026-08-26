
/* =========================================================
   TTD STORE // CHECKOUT BRIDGE
   Converts the current Loot Vault CTAs into product-aware
   checkout links without requiring a total store.html rewrite.
   ========================================================= */
(() => {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'store.html') return;

  const map = [
    {match:'SKULL PACK', id:'skull-pack'},
    {match:'DRRRRT!', id:'drrrrt'},
    {match:'SKULL JUICE', id:'skull-juice'},
    {match:'MASS EXTINCTION M60', id:'mass-extinction'},
    {match:'THE DRRRRRT PACK', id:'drrrrt-pack'},
    {match:'THE FULL MUTATION', id:'full-mutation'}
  ];

  const cards = [
    ...document.querySelectorAll('.featured-drop,.product-card,.bundle-card')
  ];

  cards.forEach(card => {
    const text = (card.textContent || '').toUpperCase();
    const hit = map.find(x => text.includes(x.match));
    if (!hit) return;

    let actions = card.querySelector('.product-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'product-actions';
      card.appendChild(actions);
    }

    const oldPrimary = [...actions.querySelectorAll('a,button')]
      .find(el => /REGISTER INTEREST|PAYMENT GRID|ORDER|BUNDLE PRICE/i.test(el.textContent || ''));

    const checkout = document.createElement('a');
    checkout.className = 'store-checkout-btn';
    checkout.href = `checkout.html?product=${encodeURIComponent(hit.id)}`;
    checkout.textContent = 'BUILD ORDER →';
    checkout.setAttribute('data-checkout-product',hit.id);

    if (oldPrimary) oldPrimary.replaceWith(checkout);
    else actions.prepend(checkout);
  });

  const heroActions = document.querySelector('.store-hero-actions');
  if (heroActions && !heroActions.querySelector('a[href^="checkout.html"]')) {
    const a = document.createElement('a');
    a.className = 'store-primary';
    a.href = 'checkout.html';
    a.textContent = 'OPEN CHECKOUT →';
    heroActions.insertBefore(a,heroActions.children[1] || null);
  }
})();
