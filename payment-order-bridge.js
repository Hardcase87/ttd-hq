
/* TTD PAYMENTS // ORDER REFERENCE HANDOFF */
(() => {
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  if (path !== 'payments.html') return;

  const params = new URLSearchParams(location.search);
  const ref = params.get('order') || '';
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('ttd_checkout_last_order_v1') || 'null'); } catch {}

  const effectiveRef = ref || saved?.ref || '';
  if (!effectiveRef) return;

  const main = document.querySelector('main');
  const anchor = main?.querySelector('.payment-grid,.live-payment-grid');
  if (!main || !anchor) return;

  const box = document.createElement('section');
  box.className = 'panel';
  box.style.marginTop = '1rem';
  box.style.borderColor = 'rgba(138,255,43,.28)';
  box.innerHTML = `
    <p class="eyebrow">CHECKOUT HANDOFF // ORDER REFERENCE</p>
    <h2 style="font-family:'Barlow Condensed',sans-serif;font-size:2.4rem;margin:.1rem 0">ORDER ${effectiveRef}</h2>
    <p>Use this reference in any payment note/message so TTD HQ can match the payment to the order manifest.</p>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.7rem">
      <button class="copy-payment-btn" type="button" data-copy="${effectiveRef}">COPY ORDER REFERENCE</button>
      <a class="action-link" href="checkout.html">← RETURN TO CHECKOUT</a>
    </div>
    ${saved?.text ? '<p style="margin-top:.75rem;color:var(--muted);font-size:.76rem">A locked order manifest is saved in this browser. Payment does not transmit that manifest automatically.</p>' : ''}
  `;
  anchor.parentNode.insertBefore(box,anchor);
})();
