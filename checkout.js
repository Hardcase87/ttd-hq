
/* ============================================================
   TTD HQ // HARDCORE CHECKOUT ENGINE
   Browser-only cart + order-reference + payment handoff.
   No external network calls. No secrets. No hidden transmission.
   ============================================================ */
(() => {
  'use strict';

  const CATALOG = window.TTD_CHECKOUT_CATALOG || {};
  const CART_KEY = 'ttd_checkout_cart_v1';
  const BUYER_KEY = 'ttd_checkout_buyer_v1';
  const REF_KEY = 'ttd_checkout_ref_v1';
  const LAST_ORDER_KEY = 'ttd_checkout_last_order_v1';

  const $ = s => document.querySelector(s);
  const cartList = $('#cartList');
  const catalogMini = $('#catalogMini');
  const orderPreview = $('#orderPreview');
  const summaryLines = $('#summaryLines');
  const summaryTotal = $('#summaryTotal');
  const orderRefEl = $('#orderRef');
  const paymentHold = $('#paymentHold');
  const statusEl = $('#checkoutStatus');

  const safeJSON = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  let cart = safeJSON(localStorage.getItem(CART_KEY), []);
  if (!Array.isArray(cart)) cart = [];

  let orderRef = localStorage.getItem(REF_KEY) || makeReference();
  localStorage.setItem(REF_KEY, orderRef);

  function makeReference(){
    const d = new Date();
    const stamp = [
      String(d.getFullYear()).slice(-2),
      String(d.getMonth()+1).padStart(2,'0'),
      String(d.getDate()).padStart(2,'0')
    ].join('');
    const rand = Math.random().toString(36).slice(2,7).toUpperCase();
    return `TTD-${stamp}-${rand}`;
  }

  function money(n, currency='AUD'){
    if (typeof n !== 'number' || !Number.isFinite(n)) return 'TBA';
    return new Intl.NumberFormat('en-AU',{style:'currency',currency}).format(n);
  }

  function normalizeCart(){
    const map = new Map();
    cart.forEach(item => {
      if (!item || !CATALOG[item.id]) return;
      const qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
      const current = map.get(item.id) || 0;
      map.set(item.id, Math.min(99, current + qty));
    });
    cart = [...map.entries()].map(([id,qty]) => ({id,qty}));
  }

  function saveCart(){
    normalizeCart();
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function addProduct(id, qty=1){
    if (!CATALOG[id]) return;
    const existing = cart.find(x => x.id === id);
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else cart.push({id,qty:Math.max(1,qty)});
    saveCart();
    render();
    setStatus(`${CATALOG[id].name} added to manifest.`, 'ok');
  }

  function setQty(id, qty){
    const item = cart.find(x => x.id === id);
    if (!item) return;
    item.qty = Math.max(1,Math.min(99,qty));
    saveCart();
    render();
  }

  function removeProduct(id){
    cart = cart.filter(x => x.id !== id);
    saveCart();
    render();
  }

  function cartTotal(){
    let total = 0;
    let known = true;
    cart.forEach(item => {
      const p = CATALOG[item.id];
      if (!p || typeof p.price !== 'number') known = false;
      else total += p.price * item.qty;
    });
    return {known,total};
  }

  function getBuyer(){
    return {
      name: $('#buyerName')?.value.trim() || '',
      email: $('#buyerEmail')?.value.trim() || '',
      country: $('#country')?.value || '',
      postcode: $('#postcode')?.value.trim() || '',
      address: $('#address')?.value.trim() || '',
      payment: $('#paymentPreference')?.value || 'confirm-first',
      contact: $('#contactPreference')?.value || 'email',
      notes: $('#orderNotes')?.value.trim() || ''
    };
  }

  function saveBuyer(){
    localStorage.setItem(BUYER_KEY, JSON.stringify(getBuyer()));
  }

  function loadBuyer(){
    const b = safeJSON(localStorage.getItem(BUYER_KEY), {});
    const bind = {
      buyerName:'name', buyerEmail:'email', country:'country',
      postcode:'postcode', address:'address',
      paymentPreference:'payment', contactPreference:'contact',
      orderNotes:'notes'
    };
    Object.entries(bind).forEach(([id,key]) => {
      const el = document.getElementById(id);
      if (el && typeof b[key] === 'string') el.value = b[key];
    });
  }

  function itemLines(){
    if (!cart.length) return ['NO PRODUCTS SELECTED'];
    return cart.map(item => {
      const p = CATALOG[item.id];
      const unit = money(p.price,p.currency);
      return `${item.qty} × ${p.name} [${p.sku}] — ${unit}${unit==='TBA'?' / unit':''}`;
    });
  }

  function buildOrderText(){
    const b = getBuyer();
    const totals = cartTotal();
    const now = new Date();
    const itemText = itemLines().map(x => `- ${x}`).join('\n');

    return [
      'TACTICAL TERROR DIVISION // ORDER MANIFEST',
      '==========================================',
      `ORDER REF: ${orderRef}`,
      `CREATED: ${now.toLocaleString()}`,
      '',
      'PRODUCTS',
      '--------',
      itemText,
      '',
      `ESTIMATED PRODUCT TOTAL: ${totals.known ? money(totals.total,'AUD') : 'TBA / CONFIRM FIRST'}`,
      'SHIPPING: TBA / CONFIRM FIRST',
      '',
      'BUYER',
      '-----',
      `NAME: ${b.name || '[not entered]'}`,
      `EMAIL: ${b.email || '[not entered]'}`,
      `COUNTRY / REGION: ${b.country || '[not entered]'}`,
      `POSTCODE / ZIP: ${b.postcode || '[not entered]'}`,
      `DELIVERY ADDRESS: ${b.address || '[not entered]'}`,
      `PAYMENT PREFERENCE: ${b.payment}`,
      `CONTACT PREFERENCE: ${b.contact}`,
      '',
      'ORDER NOTES',
      '-----------',
      b.notes || '[none]',
      '',
      'STATUS',
      '------',
      totals.known
        ? 'PRODUCT PRICES LOADED. SHIPPING / AVAILABILITY MAY STILL REQUIRE CONFIRMATION.'
        : 'PRICE HOLD — DO NOT SEND PAYMENT UNTIL TTD HQ CONFIRMS FINAL TOTAL, SHIPPING AND AVAILABILITY.',
      '',
      'CONTACT: TTDHQ@proton.me',
      'SITE: tacticalterrordivision.com',
      '',
      'Never send card numbers, passwords, seed phrases or private keys by email.'
    ].join('\n');
  }

  function renderCart(){
    if (!cartList) return;
    cartList.innerHTML = '';
    if (!cart.length) {
      cartList.innerHTML = '<div class="cart-empty">NO LOOT SELECTED // ADD A DROP BELOW OR RETURN TO THE LOOT VAULT</div>';
      return;
    }

    cart.forEach(item => {
      const p = CATALOG[item.id];
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML = `
        <img src="${p.image}" alt="${p.name}">
        <div>
          <h3>${p.name}</h3>
          <div class="cart-sku">${p.sku} // ${p.status}</div>
          <div class="cart-price">${money(p.price,p.currency)}</div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" type="button" data-dec="${item.id}" aria-label="Decrease quantity">−</button>
          <span class="qty-count">${item.qty}</span>
          <button class="qty-btn" type="button" data-inc="${item.id}" aria-label="Increase quantity">+</button>
          <button class="remove-btn" type="button" data-remove="${item.id}">REMOVE</button>
        </div>
      `;
      cartList.appendChild(row);
    });

    cartList.querySelectorAll('[data-inc]').forEach(btn => btn.addEventListener('click',() => {
      const item = cart.find(x => x.id === btn.dataset.inc);
      if (item) setQty(item.id,item.qty+1);
    }));
    cartList.querySelectorAll('[data-dec]').forEach(btn => btn.addEventListener('click',() => {
      const item = cart.find(x => x.id === btn.dataset.dec);
      if (item) setQty(item.id,item.qty-1);
    }));
    cartList.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click',() => removeProduct(btn.dataset.remove)));
  }

  function renderCatalog(){
    if (!catalogMini) return;
    catalogMini.innerHTML = '';
    Object.entries(CATALOG).forEach(([id,p]) => {
      const div = document.createElement('div');
      div.className = 'catalog-item';
      div.innerHTML = `
        <b>${p.name}</b>
        <small>${p.sku} // ${money(p.price,p.currency)} // ${p.status}</small>
        <button class="add-btn" type="button" data-add="${id}">ADD TO ORDER →</button>
      `;
      catalogMini.appendChild(div);
    });
    catalogMini.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click',() => addProduct(btn.dataset.add)));
  }

  function renderSummary(){
    orderRefEl.textContent = orderRef;
    summaryLines.innerHTML = '';
    cart.forEach(item => {
      const p = CATALOG[item.id];
      const line = document.createElement('div');
      line.className = 'summary-line';
      line.innerHTML = `<span>${item.qty}× ${p.name}</span><span>${typeof p.price==='number' ? money(p.price*item.qty,p.currency) : 'TBA'}</span>`;
      summaryLines.appendChild(line);
    });

    if (!cart.length) {
      const line = document.createElement('div');
      line.className = 'summary-line';
      line.innerHTML = '<span>No products selected</span><span>—</span>';
      summaryLines.appendChild(line);
    }

    const totals = cartTotal();
    summaryTotal.textContent = totals.known ? money(totals.total,'AUD') : 'TBA';
    paymentHold.innerHTML = totals.known
      ? 'Product prices are loaded. Confirm shipping and availability before final payment unless the live product listing explicitly provides those terms.'
      : 'Drop 001 prices are not yet locked. Build the order now, but do not send payment until TTD HQ confirms the final total, shipping and availability.';
    orderPreview.textContent = buildOrderText();

    const email = getBuyer().email || '';
    const subject = encodeURIComponent(`TTD ORDER ${orderRef}`);
    const body = encodeURIComponent(buildOrderText());
    $('#emailOrder').href = `mailto:TTDHQ@proton.me?subject=${subject}&body=${body}`;
    $('#paymentGrid').href = `payments.html?order=${encodeURIComponent(orderRef)}&from=checkout`;
  }

  function render(){
    renderCart();
    renderCatalog();
    renderSummary();
  }

  function validate(){
    const required = ['buyerName','buyerEmail','country'];
    let ok = cart.length > 0;
    required.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const valid = el.value.trim() && (id !== 'buyerEmail' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.classList.toggle('invalid',!valid);
      if (!valid) ok = false;
    });

    const terms = $('#acceptTerms');
    if (!terms.checked) ok = false;

    if (!cart.length) setStatus('Add at least one product to the order.', 'bad');
    else if (!ok) setStatus('Complete the required buyer fields and acknowledge the price/availability hold.', 'bad');
    return ok;
  }

  function lockOrder(){
    saveBuyer();
    if (!validate()) return false;
    const payload = {
      ref:orderRef,
      created:new Date().toISOString(),
      cart,
      buyer:getBuyer(),
      text:buildOrderText()
    };
    localStorage.setItem(LAST_ORDER_KEY,JSON.stringify(payload));
    renderSummary();
    setStatus(`ORDER ${orderRef} LOCKED LOCALLY // ready to email or hand to payment grid.`, 'ok');
    return true;
  }

  function setStatus(msg,type=''){
    statusEl.textContent = msg;
    statusEl.className = `checkout-status ${type}`;
  }

  function parseInboundProduct(){
    const params = new URLSearchParams(location.search);
    const id = params.get('product');
    if (id && CATALOG[id]) {
      const seen = cart.some(x => x.id === id);
      if (!seen) addProduct(id,1);
    }
  }

  async function copyOrder(){
    const txt = buildOrderText();
    try {
      await navigator.clipboard.writeText(txt);
      setStatus('ORDER MANIFEST COPIED.', 'ok');
    } catch {
      setStatus('Clipboard blocked — select and copy the order manifest manually.', 'bad');
    }
  }

  function saveOrderFile(){
    const blob = new Blob([buildOrderText()],{type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${orderRef}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    setStatus('ORDER MANIFEST FILE CREATED.', 'ok');
  }

  function clearAll(){
    cart = [];
    localStorage.removeItem(CART_KEY);
    render();
    setStatus('CART CLEARED.', '');
  }

  function fullReset(){
    cart = [];
    orderRef = makeReference();
    localStorage.setItem(REF_KEY,orderRef);
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(BUYER_KEY);
    localStorage.removeItem(LAST_ORDER_KEY);
    $('#checkoutForm')?.reset();
    $('#acceptTerms').checked = false;
    render();
    setStatus('CHECKOUT RESET // new order reference generated.', '');
  }

  loadBuyer();
  parseInboundProduct();
  normalizeCart();
  saveCart();
  render();

  document.querySelectorAll('#checkoutForm input,#checkoutForm select,#checkoutForm textarea').forEach(el => {
    el.addEventListener('input',() => { saveBuyer(); renderSummary(); });
    el.addEventListener('change',() => { saveBuyer(); renderSummary(); });
  });

  $('#clearCart')?.addEventListener('click',clearAll);
  $('#lockOrder')?.addEventListener('click',lockOrder);
  $('#copyOrder')?.addEventListener('click',copyOrder);
  $('#saveOrderFile')?.addEventListener('click',saveOrderFile);
  $('#newReference')?.addEventListener('click',() => {
    orderRef = makeReference();
    localStorage.setItem(REF_KEY,orderRef);
    renderSummary();
    setStatus('NEW ORDER REFERENCE GENERATED.', 'ok');
  });
  $('#resetCheckout')?.addEventListener('click',fullReset);

  $('#emailOrder')?.addEventListener('click',e => {
    saveBuyer();
    if (!validate()) e.preventDefault();
    else lockOrder();
  });

  $('#paymentGrid')?.addEventListener('click',e => {
    saveBuyer();
    if (!validate()) {
      e.preventDefault();
      return;
    }
    lockOrder();
  });
})();
