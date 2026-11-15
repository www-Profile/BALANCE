/* =========================================================
   BALANCE — логика (v2, современный дизайн)
   ========================================================= */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const STORAGE_KEY = 'balance_state_v1';

const state = {
  screen: 'home',
  plate: { size: 'M', garnish: null, protein: null, veg: null },
  activeSection: 'garnish',
  cart: [],
  orders: [],
  favorites: ['d1', 'd3'],
  prefs: [],
  category: 'all',
  search: '',
  filter: 'all',
  delivery: 'delivery',
  address: 'Москва, Красная площадь, 1',
  coords: [55.753544, 37.621202],
  addresses: [],              // ← добавили
  selectedAddressId: null,    // ← добавили
    user: { firstName: '', lastName: '', email: '' },   // ← добавили
  settings: { notifications: true, email: false },
  editingAddressId: null,     // ← добавили
    confirmAction: null,     // ← добавили
};

const round  = n => Math.round(n);
const round1 = n => Math.round(n * 10) / 10;
const fmt    = n => n.toLocaleString('ru-RU');

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Расчёты ---------- */
function calcSection(ing, grams) {
  if (!ing) return { grams: 0, kcal: 0, p: 0, f: 0, c: 0, price: 0 };
  const k = grams / 100;
  return {
    grams,
    kcal: ing.kcal * k, p: ing.p * k, f: ing.f * k, c: ing.c * k,
    price: ing.price * k
  };
}

function calcComposition(comp) {
  const size = DB.sizes.find(s => s.id === comp.size) || DB.sizes[1];
  const g = DB.garnishes.find(x => x.id === comp.garnish);
  const p = DB.proteins.find(x => x.id === comp.protein);
  const v = DB.vegetables.find(x => x.id === comp.veg);

  const gs = calcSection(g, size.grams * 0.5);
  const ps = calcSection(p, size.grams * 0.25);
  const vs = calcSection(v, size.grams * 0.25);

  const weight = gs.grams + ps.grams + vs.grams;
  const rawPrice = gs.price + ps.price + vs.price;
  const price = Math.round(rawPrice / 5) * 5;

  return {
    weight,
    kcal: gs.kcal + ps.kcal + vs.kcal,
    p: gs.p + ps.p + vs.p,
    f: gs.f + ps.f + vs.f,
    c: gs.c + ps.c + vs.c,
    price,
    complete: !!(g && p && v),
    sections: {
      garnish: { ing: g, ...gs },
      protein: { ing: p, ...ps },
      veg:     { ing: v, ...vs }
    }
  };
}

/* ---------- Тарелка SVG (секции с фото) ---------- */
function plateSVG(comp, uid = 'p1') {
  const r = calcComposition(comp);
  const EMPTY = '#E9E6DC';
  const s = r.sections;

  // Цвета-заливки для пустых секций (или для секций без фото)
  const cG = 'url(#gG-' + uid + ')';
  const cP = 'url(#gP-' + uid + ')';
  const cV = 'url(#gV-' + uid + ')';

  // Геометрия секторов (viewBox 260×260, центр 130,130, радиус 100)
  // garnish: от 90° до 270° (левая половина)
  // protein: от 270° до 360° (верх-право)
  // veg:     от 0° до 90°   (низ-право)
  const paths = {
    garnish: 'M130 30 A100 100 0 0 0 130 230 L130 130 Z',
    protein: 'M130 30 A100 100 0 0 1 230 130 L130 130 Z',
    veg:     'M230 130 A100 100 0 0 1 130 230 L130 130 Z'
  };

  // Возвращает содержимое сектора: фото (если есть) или цвет
  function sectionContent(key, ing, fill) {
    if (!ing) {
      // Пустая секция — заливка цветом
      return `<path data-sec="${key}" d="${paths[key]}" fill="${fill}"/>`;
    }
    if (ing.photo) {
      // Есть фото — используем clipPath + image
      return `
        <g data-sec="${key}" style="cursor:pointer">
          <clipPath id="clip-${key}-${uid}">
            <path d="${paths[key]}"/>
          </clipPath>
          <image
            href="${ing.photo}"
            x="0" y="0" width="260" height="260"
            preserveAspectRatio="xMidYMid slice"
            clip-path="url(#clip-${key}-${uid})"
            style="pointer-events:none"
          />
        </g>
      `;
    }
    // Есть ингредиент, но без фото — заливка цветом
    return `<path data-sec="${key}" d="${paths[key]}" fill="${fill}"/>`;
  }

  return `
    <svg class="plate-svg" viewBox="0 0 260 260" role="img" aria-label="Тарелка">
      <defs>
        <filter id="psh-${uid}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#172B3A" flood-opacity="0.18"/>
        </filter>
        <linearGradient id="gG-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#C6EC80"/>
          <stop offset="100%" stop-color="#A8D858"/>
        </linearGradient>
        <linearGradient id="gP-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFB87A"/>
          <stop offset="100%" stop-color="#E8934A"/>
        </linearGradient>
        <linearGradient id="gV-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7DCDA8"/>
          <stop offset="100%" stop-color="#56A984"/>
        </linearGradient>
      </defs>

      <circle cx="130" cy="130" r="118" fill="#FFFFFF" filter="url(#psh-${uid})"/>
      <circle cx="130" cy="130" r="103" fill="#F7F6F0"/>

      <!-- Секции: пустые — цветом, с ингредиентом — фото -->
      ${sectionContent('garnish', s.garnish.ing, cG)}
      ${sectionContent('protein', s.protein.ing, cP)}
      ${sectionContent('veg',     s.veg.ing,     cV)}

      <!-- Разделители секторов -->
      <g stroke="#F7F6F0" stroke-width="4" stroke-linejoin="round" fill="none" style="pointer-events:none">
        <path d="M130 30 L130 230"/>
        <path d="M130 130 L230 130"/>
      </g>

      <!-- Центральная точка -->
      <circle cx="130" cy="130" r="5" fill="#FFFFFF" opacity="0.9" style="pointer-events:none"/>
    </svg>
  `;
}

/* ---------- Хранилище ---------- */
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cart: state.cart, orders: state.orders, favorites: state.favorites,
      prefs: state.prefs, settings: state.settings,
      addresses: state.addresses,
      selectedAddressId: state.selectedAddressId,
      user: state.user
    }));
  } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.cart) state.cart = d.cart;
    if (d.orders) state.orders = d.orders;
    if (d.favorites) state.favorites = d.favorites;
    if (d.prefs) state.prefs = d.prefs;
    if (d.settings) state.settings = { ...state.settings, ...d.settings };
    if (d.addresses) state.addresses = d.addresses;
    if (d.selectedAddressId) state.selectedAddressId = d.selectedAddressId;
    if (d.user) state.user = { ...state.user, ...d.user };
  } catch (e) {}
}

/* ---------- Корзина ---------- */
const compKey = c => `${c.size}|${c.garnish}|${c.protein}|${c.veg}`;

function addToCart(name, comp) {
  const key = `${name}::${compKey(comp)}`;
  const existing = state.cart.find(i => i.key === key);
  if (existing) existing.qty++;
  else state.cart.push({ key, name, comp: { ...comp }, qty: 1 });
  save(); updateCartBadge(); toast('Добавлено в корзину');
}

function addDishToCart(dishId) {
  const d = DB.dishes.find(x => x.id === dishId);
  if (!d) return;
  addToCart(d.name, { size: d.size, garnish: d.garnish, protein: d.protein, veg: d.veg });
}

function updateCartBadge() {
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  const badge = $('#cart-badge');
  if (!badge) return;
  badge.textContent = count > 99 ? '99+' : count;
  badge.hidden = count === 0;
}

/* ---------- Навигация ---------- */
function showScreen(name) {
  state.screen = name;
    // Если уходим с экрана адреса — сбрасываем режим редактирования
  if (name !== 'address') state.editingAddressId = null;
    document.body.classList.toggle('address-screen', name === 'address');
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
  $$('.nav-btn').forEach(b => {
    const isActive = b.dataset.nav === name || (name === 'address' && b.dataset.nav === 'orders');
    b.classList.toggle('active', isActive);
  });
  window.scrollTo({ top: 0, behavior: 'instant' });

  // уничтожаем карту адресов при уходе с экрана
  if (name !== 'address' && typeof _addressMap !== 'undefined' && _addressMap) {
    try { _addressMap.destroy(); } catch (e) {}
    _addressMap = null;
    _addressMarker = null;
  }

  if (name === 'menu')    renderMenu();
  if (name === 'build')   renderBuild();
  if (name === 'orders')  renderCart();
  if (name === 'profile') renderProfile();
  if (name === 'address') renderAddressForm();
}

/* ---------- Главная ---------- */
function renderHome() {
  // Горизонтальная лента популярных блюд
  const six = DB.dishes.slice(0, 6);
  $('#popular-list').innerHTML = six.map(d => dishCardHTML(d)).join('');

  // Категории — редакционный список с номерами
  $('#home-categories').innerHTML = DB.categories
    .filter(c => c.id !== 'all')
    .map((c, i) => `
      <button class="cat-row" data-goto-cat="${c.id}">
        <span class="cat-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="cat-emoji">${c.emoji}</span>
        <span class="cat-name">${c.name}</span>
        <svg class="cat-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    `).join('');
}

/* ---------- Bento-карточка ---------- */
function bentoCardHTML(d, large = false) {
  const c = calcComposition(d);
  if (large) {
    return `
      <article class="bento-item bento-item--lg" data-dish="${d.id}">
        <img class="bento-img" src="${d.photo}" alt="${d.name}" loading="lazy" onerror="this.style.display='none'">
        <div class="bento-shade"></div>
        <div class="bento-content">
          ${d.tag ? `<span class="bento-tag">${d.tag}</span>` : ''}
          <h3>${d.name}</h3>
          <div class="bento-meta">
            <span>${round(c.weight)} г · ${round(c.kcal)} ккал</span>
            <span class="bento-price">${c.price} ₽</span>
          </div>
        </div>
      </article>
    `;
  }
  return `
    <article class="bento-item" data-dish="${d.id}">
      <img class="bento-img" src="${d.photo}" alt="${d.name}" loading="lazy" onerror="this.style.display='none'">
      <div class="bento-shade"></div>
      <div class="bento-content">
        <h4>${d.name}</h4>
        <div class="bento-meta">
          <span>${round(c.kcal)} ккал</span>
          <span class="bento-price">${c.price} ₽</span>
        </div>
      </div>
    </article>
  `;
}

/* ---------- Карточка блюда (сетка) ---------- */
function dishCardHTML(d) {
  const c = calcComposition(d);
  const fav = state.favorites.includes(d.id);
  return `
    <article class="dish-card" data-dish="${d.id}">
      <div class="dish-photo">
        <img class="dish-img" src="${d.photo}" alt="${d.name}" loading="lazy" onerror="this.style.display='none'">
        <span class="dish-kcal">${round(c.kcal)} ккал</span>
        <button class="fav-btn ${fav ? 'active' : ''}" data-fav="${d.id}" aria-label="В избранное">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.7-7.7 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"/>
          </svg>
        </button>
      </div>
      <div class="dish-body">
        <h4>${d.name}</h4>
        <div class="dish-meta">
          <span>${round(c.weight)} г</span><span class="meta-dot"></span>
          <span>Б ${round(c.p)}</span><span class="meta-dot"></span>
          <span>Ж ${round(c.f)}</span><span class="meta-dot"></span>
          <span>У ${round(c.c)}</span>
        </div>
        <div class="dish-foot">
          <button class="dish-buy ${getDishQtyInCart(d.id) > 0 ? 'in-cart' : ''}" data-add="${d.id}" aria-label="Добавить в корзину">
            <span>${getDishQtyInCart(d.id) > 0 ? getDishQtyInCart(d.id) + '× ' : ''}${c.price} ₽</span>
            <span class="dish-buy-plus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </span>
          </button>
        </div>
      </div>
    </article>
  `;
}

/* Сколько раз это блюдо уже в корзине */
function getDishQtyInCart(dishId) {
  const d = DB.dishes.find(x => x.id === dishId);
  if (!d) return 0;
  const key = `${d.name}::${compKey({ size: d.size, garnish: d.garnish, protein: d.protein, veg: d.veg })}`;
  const item = state.cart.find(i => i.key === key);
  return item ? item.qty : 0;
}

/* Обновить все кнопки-плашки этого блюда на текущем экране */
function updateDishBuyButtons(dishId) {
  const d = DB.dishes.find(x => x.id === dishId);
  if (!d) return;
  const qty = getDishQtyInCart(dishId);
  const c = calcComposition(d);

  document.querySelectorAll(`[data-add="${dishId}"]`).forEach(btn => {
    if (!btn.classList.contains('dish-buy')) return;   // пропускаем кнопку в модалке
    btn.classList.toggle('in-cart', qty > 0);
    const label = btn.querySelector('span');
    if (label) label.textContent = (qty > 0 ? qty + '× ' : '') + c.price + ' ₽';
  });
}

/* ---------- Меню ---------- */
function renderCategories() {
  $('#menu-categories').innerHTML = DB.categories.map(c => `
    <button class="chip ${state.category === c.id ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>
  `).join('');
}

function renderMenu() {
  renderCategories();
  $$('.chip-filter').forEach(b => b.classList.toggle('active', b.dataset.filter === state.filter));

  let list = DB.dishes.slice();
  if (state.category !== 'all') list = list.filter(d => d.cats.includes(state.category));
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter(d => d.name.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q));
  }
  if (state.filter === 'lowcal') list = list.filter(d => calcComposition(d).kcal < 400);
  else if (state.filter === 'highprotein') list = list.filter(d => calcComposition(d).p >= 25);

  const wrap = $('#menu-list');
  const empty = $('#menu-empty');

  if (!list.length) {
    wrap.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  wrap.innerHTML = list.map(dishCardHTML).join('');
}

/* ---------- Конструктор ---------- */
function renderBuild() {
  $('#build-plate').innerHTML = plateSVG(state.plate, 'build');

  const sizeInfo = DB.sizes.find(s => s.id === state.plate.size);
  const sizeNames = { S: 'Маленький', M: 'Средний', L: 'Большой' };
  const plateSizeEl = document.getElementById('plate-size-label');
  if (plateSizeEl) {
    plateSizeEl.innerHTML = `Размер тарелки: <b>${sizeNames[state.plate.size]}</b> · ${sizeInfo.grams} г`;
  }

  $$('#build-plate [data-sec]').forEach(el => {
    el.addEventListener('click', () => {
      state.activeSection = el.dataset.sec;
      renderBuild();
    });
  });

  const r = calcComposition(state.plate);

  // Легенда: заполняем только значение
  const legendKeys = ['garnish', 'protein', 'veg'];
  const legendLabels = { garnish: 'Гарнир · 50%', protein: 'Белок · 25%', veg: 'Овощи · 25%' };
  $('#plate-legend').innerHTML = legendKeys.map(key => {
    const sec = r.sections[key];
    const val = sec.ing
      ? `${sec.ing.name} · ${round(sec.grams)} г`
      : '<span class="legend-empty">Не выбрано</span>';
    return `
      <div class="legend-row">
        <span class="legend-dot ${key}"></span>
        <span class="legend-name">${legendLabels[key]}</span>
        <span class="legend-val">${val}</span>
      </div>`;
  }).join('');

  $('#size-selector').innerHTML = DB.sizes.map(s => `
    <button class="size-btn ${state.plate.size === s.id ? 'active' : ''}" data-size="${s.id}">
      <b>${s.label}</b>
      <small>${s.grams} г · ${s.note}</small>
    </button>
  `).join('');

  $$('#size-selector [data-size]').forEach(btn => {
    btn.onclick = () => { state.plate.size = btn.dataset.size; renderBuild(); };
  });

  $$('#section-tabs .section-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.sec === state.activeSection);
    tab.onclick = () => { state.activeSection = tab.dataset.sec; renderBuild(); };
  });

  const lists = {
    garnish: { arr: DB.garnishes,  cls: 'garnish' },
    protein: { arr: DB.proteins,   cls: 'protein' },
    veg:     { arr: DB.vegetables, cls: 'veg'     }
  };
  const cur = lists[state.activeSection];

  $('#ingredient-list').innerHTML = cur.arr.map(ing => {
    const selected = state.plate[state.activeSection] === ing.id;
    return `
      <button class="ing-card ${selected ? 'selected' : ''}" data-ing="${ing.id}">
        <span class="ing-thumb ${cur.cls}">${ing.emoji}</span>
        <span class="ing-info">
          <strong>${ing.name}</strong>
          <span>${ing.kcal} ккал · Б ${ing.p} · Ж ${ing.f} · У ${ing.c}</span>
        </span>
        <span class="ing-price">${ing.price} ₽</span>
        <span class="ing-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
      </button>`;
  }).join('');

  $$('#ingredient-list [data-ing]').forEach(btn => {
    btn.onclick = () => { state.plate[state.activeSection] = btn.dataset.ing; renderBuild(); };
  });

  renderBuildSummary(r);
}

function renderBuildSummary(r) {
  const complete = r.complete;

  $('#bs-weight').textContent = round(r.weight);
  $('#bs-kcal').textContent   = round(r.kcal);
  $('#bs-p').textContent      = round(r.p);
  $('#bs-f').textContent      = round(r.f);
  $('#bs-c').textContent      = round(r.c);
  $('#bs-price').textContent  = r.price + ' ₽';

  const btn = $('#add-plate');
  btn.disabled = !complete;
  btn.onclick = () => addToCart('Своя тарелка', { ...state.plate });

  $('#bs-hint').style.display = complete ? 'none' : '';
}

/* ---------- Заказы ---------- */
function renderCart() {
  const isEmpty = !state.cart.length;

  $('#cart-empty').hidden  = !isEmpty;
  $('#cart-filled').hidden = isEmpty;

  // Переключатели доставки
  $$('[data-delivery]').forEach(b => {
    b.classList.toggle('active', b.dataset.delivery === state.delivery);
    b.onclick = () => { state.delivery = b.dataset.delivery; renderCart(); };
  });

  // Видимость блоков «Доставка / Самовывоз»
  $('#delivery-addresses').hidden = state.delivery !== 'delivery';
  $('#delivery-pickup').hidden    = state.delivery !== 'pickup';

  // Адреса
  renderAddresses();

  // Позиции
  $('#cart-items').innerHTML = state.cart.map((item, idx) => {
    const c = calcComposition(item.comp);
    const dishData = DB.dishes.find(d => d.name === item.name);
    const tags = [
      c.sections.garnish.ing ? { cls: 'garnish', name: c.sections.garnish.ing.name } : null,
      c.sections.protein.ing ? { cls: 'protein', name: c.sections.protein.ing.name } : null,
      c.sections.veg.ing     ? { cls: 'veg',     name: c.sections.veg.ing.name     } : null
    ].filter(Boolean);

    return `
      <div class="cart-item">
        <div class="cart-photo">
          ${dishData
            ? `<img src="${dishData.photo}" alt="${item.name}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'cart-photo-fallback\\'>🍽</span>'">`
            : `<span class="cart-photo-fallback">🍽</span>`}
        </div>
        <div class="cart-info">
          <div class="cart-head"><h4>${item.name}</h4></div>
          <div class="cart-comp">${c.weight} г · ${round(c.kcal)} ккал</div>
          <div class="cart-tags">${tags.map(t => `<span class="cart-tag ${t.cls}">${t.name}</span>`).join('')}</div>
          <div class="cart-row">
            <span class="cart-price">${c.price * item.qty} ₽</span>
            <button class="cart-remove" data-remove="${idx}" aria-label="Удалить">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
            </button>
            <div class="qty">
              <button data-qty="${idx}" data-delta="-1" aria-label="Меньше">−</button>
              <b>${item.qty}</b>
              <button data-qty="${idx}" data-delta="1" aria-label="Больше">+</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  // Суммы
  const subtotal = state.cart.reduce((s, i) => s + calcComposition(i.comp).price * i.qty, 0);
  const deliveryPrice = state.delivery === 'delivery' ? 150 : 0;
  const total = subtotal + deliveryPrice;

  $('#sum-subtotal').textContent       = subtotal + ' ₽';
  $('#sum-delivery-label').textContent = state.delivery === 'delivery' ? 'Доставка' : 'Самовывоз';
  $('#sum-delivery').textContent       = deliveryPrice ? deliveryPrice + ' ₽' : 'Бесплатно';
  $('#sum-total').textContent          = total + ' ₽';

  // Обработчики
  $$('[data-qty]').forEach(btn => {
    btn.onclick = () => {
      const idx = +btn.dataset.qty;
      const item = state.cart[idx];
      if (!item) return;
      item.qty += +btn.dataset.delta;
      if (item.qty <= 0) state.cart.splice(idx, 1);
      save(); updateCartBadge(); renderCart();
    };
  });

  $$('[data-remove]').forEach(btn => {
    btn.onclick = () => {
      const idx = +btn.dataset.remove;
      openConfirm('Удалить блюдо?', 'Оно будет убрано из корзины', () => {
        state.cart.splice(idx, 1);
        save(); updateCartBadge(); renderCart();
      });
    };
  });

  $('#checkout-btn').onclick = () => {
    if (state.delivery === 'delivery' && !state.selectedAddressId) {
      toast('Выберите адрес доставки');
      return;
    }
    const addr = state.addresses.find(a => a.id === state.selectedAddressId) || null;
    const order = {
      id: 'BL-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString(),
      items: state.cart.map(i => ({ ...i })),
      total, delivery: state.delivery, status: 'Готовится',
      address: addr
    };
    state.orders.unshift(order);
    state.cart = [];
    save(); updateCartBadge();
    toast(`Заказ ${order.id} оформлен ✓`);
    renderCart();
  };
}

/* ---------- История заказов (HTML для модалки) ---------- */
function buildHistoryHTML() {
  if (!state.orders.length) return '';

  const total = state.orders.length;

  return state.orders.map((o, i) => {
    const num = total - i;
    const d = new Date(o.date);
    const dayMonth = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const time     = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const deliveryLabel = o.delivery === 'delivery' ? 'Доставка' : 'Самовывоз';

    const itemsHtml = o.items.map(it => `
      <li class="order-item">
        <span class="order-item-qty">${it.qty}×</span>
        <span class="order-item-name">${it.name}</span>
      </li>
    `).join('');

    return `
      <div class="order-card">
        <div class="order-head">
          <b>Заказ #${num}</b>
          <span class="order-status">${o.status}</span>
        </div>
        <div class="order-meta">${dayMonth} в ${time} · ${deliveryLabel}</div>
        <ul class="order-items">${itemsHtml}</ul>
        <div class="order-foot"><span class="muted">Итого</span><span>${o.total} ₽</span></div>
      </div>`;
  }).join('');
}

/* ---------- Модалки профиля ---------- */
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function openProfileEdit(pendingEmailEnable = false) {
  state._pendingEmailEnable = pendingEmailEnable;

  const u = state.user;
  $('#pe-firstName').value = u.firstName || '';
  $('#pe-lastName').value  = u.lastName  || '';
  $('#pe-email').value     = u.email     || '';

  // Сброс ошибки + подсказка по умолчанию
  const emailInput = $('#pe-email');
  const emailHint  = $('#pe-email-hint');
  emailInput.classList.remove('field-error');
  if (emailHint) {
    emailHint.classList.remove('error');
    emailHint.textContent = 'Реальный email — например, ivan@mail.ru';
  }

  // Снимаем ошибку при вводе
  emailInput.oninput = () => {
    emailInput.classList.remove('field-error');
    if (emailHint) {
      emailHint.classList.remove('error');
      emailHint.textContent = 'Реальный email — например, ivan@mail.ru';
    }
  };

  openModal('profile-edit-modal');
}

function saveProfileEdit() {
  const emailInput = $('#pe-email');
  const emailHint  = $('#pe-email-hint');
  const email = emailInput.value.trim();

  // Валидация email, если поле не пустое
  if (email && !isValidEmail(email)) {
    emailInput.classList.add('field-error');
    if (emailHint) {
      emailHint.classList.add('error');
      emailHint.textContent = 'Похоже, это не email. Пример: ivan@mail.ru';
    }
    emailInput.focus();
    toast('Проверьте адрес почты');
    return;
  }

  // Поле пустое, но пользователь пришёл включить рассылку — не даём сохранить «включённое» состояние
  if (state._pendingEmailEnable && !email) {
    emailInput.classList.add('field-error');
    if (emailHint) {
      emailHint.classList.add('error');
      emailHint.textContent = 'Без почты рассылка не работает — укажите адрес';
    }
    emailInput.focus();
    return;
  }

  emailInput.classList.remove('field-error');
  if (emailHint) {
    emailHint.classList.remove('error');
    emailHint.textContent = 'Реальный email — например, ivan@mail.ru';
  }

  state.user = {
    firstName: $('#pe-firstName').value.trim(),
    lastName:  $('#pe-lastName').value.trim(),
    email:     email
  };

  // Если пришли сюда через тумблер — включаем рассылку автоматически
  let emailTurnedOn = false;
  if (state._pendingEmailEnable && email) {
    state.settings.email = true;
    emailTurnedOn = true;
  }
  state._pendingEmailEnable = false;

  save();
  closeModal('profile-edit-modal');
  renderProfile();
  toast(emailTurnedOn ? 'Почта сохранена, рассылка включена' : 'Данные сохранены');
}

function openOrdersHistory() {
  const empty = $('#orders-history-empty');
  const list  = $('#orders-history-list');
  const html  = buildHistoryHTML();

  if (!html) {
    empty.hidden = false;
    list.innerHTML = '';
  } else {
    empty.hidden = true;
    list.innerHTML = html;
  }
  openModal('orders-history-modal');
}

function openFavorites() {
  const favs = DB.dishes.filter(d => state.favorites.includes(d.id));
  const empty = $('#favorites-empty');
  const list  = $('#favorites-list');

  if (!favs.length) {
    empty.hidden = false;
    list.innerHTML = '';
  } else {
    empty.hidden = true;
    list.innerHTML = favs.map(dishCardHTML).join('');
  }
  openModal('favorites-modal');
}

function openDiscount() {
  const pct = getDiscountPercent();
  $('#discount-big').textContent = pct + '%';

  let text;
  if (pct === 0)       text = 'Сделайте первый заказ, чтобы получить скидку 1%';
  else if (pct < 5)    text = `Ещё ${5 - pct} ${plural(5 - pct, 'заказ', 'заказа', 'заказов')} до максимальной скидки 5%`;
  else                 text = 'Вы получили максимальную скидку 5%';

  $('#discount-text').textContent = text;
  openModal('discount-modal');
}

function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

/* ---------- Валидация email ---------- */

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const s = email.trim();
  if (s.length > 254) return false;
  // name@domain.tld — без пробелов, минимум одна точка в домене, TLD >= 2 букв
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(s);
}

/* ---------- Профиль ---------- */
function renderProfile() {
  const u = state.user;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  const email = u.email || '';

  $('#profile-avatar').textContent = (u.firstName ? u.firstName[0] : '?').toUpperCase();
  $('#profile-name').textContent  = name || 'Имя фамилия';
  $('#profile-email').textContent = email || 'Почта';

  $('#stat-orders').textContent   = state.orders.length;
  $('#stat-favs').textContent     = state.favorites.length;
  $('#stat-discount').textContent = getDiscountPercent() + '%';

$$('[data-setting]').forEach(btn => {
  btn.classList.toggle('on', !!state.settings[btn.dataset.setting]);
  btn.onclick = () => {
    const key = btn.dataset.setting;
    const willBeOn = !state.settings[key];

    // Включение email-рассылки без валидной почты → открываем профиль
    if (key === 'email' && willBeOn && !isValidEmail(state.user.email)) {
      openProfileEdit(true);   // ← флаг «включаем рассылку после сохранения»
      toast('Добавьте реальную почту для рассылки');
      return;
    }

    state.settings[key] = willBeOn;
    save();
    renderProfile();
  };
});
}

function getDiscountPercent() {
  return Math.min(state.orders.length, 5);
}

/* ---------- Модалка блюда ---------- */
function openDish(id) {
  const d = DB.dishes.find(x => x.id === id);
  if (!d) return;

  const c = calcComposition(d);

  $('#dm-photo').src = d.photo;
  $('#dm-photo').alt = d.name;
  $('#dm-title').textContent = d.name;
  $('#dm-desc').textContent  = d.desc;

  const sec = (key) => c.sections[key];
  $('#dm-ing-garnish').textContent = sec('garnish').ing ? sec('garnish').ing.name : '—';
  $('#dm-ing-protein').textContent = sec('protein').ing ? sec('protein').ing.name : '—';
  $('#dm-ing-veg').textContent     = sec('veg').ing     ? sec('veg').ing.name     : '—';
  $('#dm-g-garnish').textContent   = sec('garnish').ing ? round(sec('garnish').grams) + ' г' : '';
  $('#dm-g-protein').textContent   = sec('protein').ing ? round(sec('protein').grams) + ' г' : '';
  $('#dm-g-veg').textContent       = sec('veg').ing     ? round(sec('veg').grams) + ' г' : '';

  $('#dm-weight').textContent = round(c.weight);
  $('#dm-kcal').textContent   = round(c.kcal);
  $('#dm-p').textContent      = round(c.p);
  $('#dm-f').textContent      = round(c.f);
  $('#dm-c').textContent      = round(c.c);

  $('#dm-price').textContent = c.price + ' ₽';

  const addBtn = $('#dm-add');
  addBtn.dataset.add = d.id;
  // onclick НЕ ставим — глобальный обработчик [data-add] сам добавит и закроет модалку

  const modal = $('#dish-modal');
  const sheet = modal.querySelector('.modal-sheet');

  sheet.style.transition = '';
  sheet.style.transform = '';
  modal.querySelector('.modal-backdrop').style.opacity = '';

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDish() {
  const modal = $('#dish-modal');
  if (!modal || !modal.classList.contains('open')) return;

  const sheet = modal.querySelector('.modal-sheet');

  // фиксируем текущее положение (например, если был свайп)
  const current = getComputedStyle(sheet).transform;
  sheet.style.transition = 'none';
  sheet.style.transform = current;
  void sheet.offsetHeight; // force reflow

  // теперь можно плавно уезжать вниз — из текущей точки, а не из 0
  sheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 1, 1)';
  sheet.style.transform = 'translateY(100%)';

  modal.classList.remove('open');   // запустит fade-out backdrop + скрытие через 0.4s
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // чистим инлайн-стили после анимации, чтобы следующее открытие началось с чистого листа
  setTimeout(() => {
    sheet.style.transition = '';
    sheet.style.transform = '';
  }, 320);
}

/* ---------- Модалка подтверждения удаления ---------- */
function openConfirm(title, text, onConfirm) {
  state.confirmAction = onConfirm;
  const titleEl = document.getElementById('confirm-title');
  const textEl  = document.getElementById('confirm-text');
  if (titleEl) titleEl.textContent = title;
  if (textEl)  textEl.textContent  = text;

  const modal = $('#confirm-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeConfirm() {
  const modal = $('#confirm-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.confirmAction = null;
}

/* ---------- Избранное ---------- */
function toggleFav(id) {
  const i = state.favorites.indexOf(id);
  if (i >= 0) { state.favorites.splice(i, 1); toast('Удалено из избранного'); }
  else { state.favorites.push(id); toast('Добавлено в избранное'); }
  save();
  $$(`[data-fav="${id}"]`).forEach(btn => btn.classList.toggle('active', state.favorites.includes(id)));
  if (state.screen === 'profile') renderProfile();
}

/* ---------- Глобальные клики ---------- */
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');

// ── Сброс фильтров из пустого состояния меню
if (e.target.closest('#menu-empty-reset')) {
  state.category = 'all';
  state.search = '';
  state.filter = 'all';
  const searchInput = $('#search-input');
  if (searchInput) searchInput.value = '';
  $$('.chip-filter').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
  renderMenu();
  return;
}

// --- Кнопка «Удалить» на экране редактирования ---
if (e.target.closest('#af-delete')) {
  openConfirm('Удалить адрес?', 'Адрес будет удалён из списка', deleteCurrentAddress);
  return;
}

// --- «+ Добавить адрес» — сбросить режим редактирования ---
if (e.target.closest('[data-add-address]')) {
  state.editingAddressId = null;
  return showScreen('address');
}

  if (e.target.closest('#af-save')) {
    return saveNewAddress();
  }
  if (nav) return showScreen(nav.dataset.nav);

  // ── Карусель: карточка «Скидки спортсменам»
const showcaseCard = e.target.closest('[data-showcase="athletes"]');
if (showcaseCard) {
  e.stopPropagation();
  openModal('athletes-modal');
  return;
}

// ── Закрытие модалки DDX
if (e.target.closest('[data-close-athletes]')) {
  return closeModal('athletes-modal');
}

    // --- Профиль: статистика, карандаш, модалки ---
  const stat = e.target.closest('[data-stat]');
  if (stat) {
    const t = stat.dataset.stat;
    if (t === 'orders')    return openOrdersHistory();
    if (t === 'favorites') return openFavorites();
    if (t === 'discount')  return openDiscount();
  }

  if (e.target.closest('#profile-edit-btn')) return openProfileEdit();
  if (e.target.closest('#pe-save'))          return saveProfileEdit();

  if (e.target.closest('[data-close-profile-edit]'))  return closeModal('profile-edit-modal');
  if (e.target.closest('[data-close-orders-history]')) return closeModal('orders-history-modal');
  if (e.target.closest('[data-close-favorites]'))     return closeModal('favorites-modal');
  if (e.target.closest('[data-close-discount]'))      return closeModal('discount-modal');

  const cat = e.target.closest('[data-goto-cat]');
  if (cat) { state.category = cat.dataset.gotoCat; state.filter = 'all'; return showScreen('menu'); }

  const chip = e.target.closest('[data-cat]');
  if (chip) { state.category = chip.dataset.cat; return renderMenu(); }

  const filter = e.target.closest('[data-filter]');
  if (filter) {
    state.filter = filter.dataset.filter;
    $$('.chip-filter').forEach(b => b.classList.toggle('active', b === filter));
    return renderMenu();
  }

  const fav = e.target.closest('[data-fav]');
  if (fav) { e.stopPropagation(); return toggleFav(fav.dataset.fav); }

const closeBtn = e.target.closest('[data-close-modal]');
if (closeBtn) return closeDish();

// Подтверждение удаления
if (e.target.closest('[data-close-confirm]')) return closeConfirm();

if (e.target.closest('#confirm-remove-btn')) {
  const fn = state.confirmAction;
  closeConfirm();
  if (typeof fn === 'function') fn();
  return;
}

const add = e.target.closest('[data-add]');
if (add) {
  e.stopPropagation();
  const id = add.dataset.add;
  addDishToCart(id);
  updateDishBuyButtons(id);                    // ← добавили
  if ($('#dish-modal')?.classList.contains('open')) closeDish();
  return;
}

  const card = e.target.closest('[data-dish]');
  if (card) return openDish(card.dataset.dish);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeDish();
  closeConfirm();
  closeModal('profile-edit-modal');
  closeModal('orders-history-modal');
  closeModal('favorites-modal');
  closeModal('discount-modal');
  closeModal('athletes-modal');   // ← добавить
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'search-input') { state.search = e.target.value; renderMenu(); }
});

/* ---------- Swipe-to-close модалки ---------- */
function initModalSwipe() {
  const modal = $('#dish-modal');
  if (!modal) return;
  const sheet = modal.querySelector('.modal-sheet');

  let startY = 0;
  let currentY = 0;
  let dragging = false;

const modalBody = sheet.querySelector('.modal-body');

sheet.addEventListener('touchstart', (e) => {
  // если контент прокручен — не перехватываем жест, даём скроллу работать
  if (modalBody && modalBody.scrollTop > 0) return;
  startY = e.touches[0].clientY;
    currentY = startY;
    dragging = true;
    sheet.style.transition = 'none';
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    if (deltaY > 0) {
      // тянем вниз — двигаем шит и притухаем backdrop
      sheet.style.transform = `translateY(${deltaY}px)`;
      const backdrop = modal.querySelector('.modal-backdrop');
      backdrop.style.opacity = String(Math.max(0.15, 1 - deltaY / 500));
    } else {
      // вверх — не двигаем, даём «отпружинить»
      sheet.style.transform = 'translateY(0)';
    }
  }, { passive: true });

  sheet.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;

    const deltaY = currentY - startY;

    if (deltaY > 120) {
      // порог пройден — закрываем; closeDish сам зафиксирует текущее положение и уедет вниз
      modal.querySelector('.modal-backdrop').style.opacity = '';
      sheet.style.transition = '';
      sheet.style.transform = '';
      closeDish();
    } else {
      // не дотянули — пружиним обратно
      modal.querySelector('.modal-backdrop').style.opacity = '';
      sheet.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      sheet.style.transform = 'translateY(0)';

      setTimeout(() => {
        sheet.style.transition = '';
        sheet.style.transform = '';
      }, 300);
    }

    startY = 0;
    currentY = 0;
  });
}

/* =========================================================
   Адреса доставки
   ========================================================= */

let _addressMap = null;
let _addressMarker = null;

function renderAddresses() {
  if (state.delivery !== 'delivery') return;

  const has = state.addresses.length > 0;
  $('#addresses-header').hidden = !has;
  $('#addresses-empty').hidden  = has;

  if (!has) {
    $('#addresses-list').innerHTML = '';
    return;
  }

  $('#addresses-list').innerHTML = state.addresses.map(a => `
    <div class="address-item ${a.id === state.selectedAddressId ? 'selected' : ''}" data-select-address="${a.id}">
      <span class="address-radio"></span>
      <div class="address-info">
        <div class="address-line1">${a.street}, ${a.house}${a.apartment ? ', кв. ' + a.apartment : ''}</div>
        <div class="address-line2">${[a.city, a.entrance ? 'подъезд ' + a.entrance : '', a.floor ? 'этаж ' + a.floor : ''].filter(Boolean).join(' · ')}</div>
      </div>
      <button class="address-edit" data-edit-address="${a.id}" aria-label="Изменить адрес">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>
        </svg>
      </button>
    </div>
  `).join('');

  $$('[data-select-address]').forEach(el => {
    el.onclick = (e) => {
      if (e.target.closest('[data-edit-address]')) return;
      state.selectedAddressId = el.dataset.selectAddress;
      save(); renderCart();
    };
  });

  $$('[data-edit-address]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      state.editingAddressId = btn.dataset.editAddress;
      showScreen('address');
    };
  });
}

/* Экран добавления адреса */
function renderAddressForm() {
  const isEdit = !!state.editingAddressId;
  const addr = isEdit ? state.addresses.find(a => a.id === state.editingAddressId) : null;

  // Заголовок
  const titleEl = document.querySelector('#screen-address .screen-title');
  if (titleEl) titleEl.textContent = isEdit ? 'Изменить адрес' : 'Новый адрес';

  // Заполняем поля
  const fields = {
    city:      addr?.city || '',
    street:    addr?.street || '',
    house:     addr?.house || '',
    entrance:  addr?.entrance || '',
    intercom:  addr?.intercom || '',
    floor:     addr?.floor || '',
    apartment: addr?.apartment || '',
    comment:   addr?.comment || ''
  };

  Object.keys(fields).forEach(k => {
    const el = document.getElementById('af-' + k);
    if (el) {
      el.value = fields[k];
      el.classList.remove('field-error');
      el.oninput = () => el.classList.remove('field-error');
    }
  });

  // Координаты
  if (addr?.coords) state.coords = addr?.coords || [55.753544, 37.621202];

  // Кнопки
  const actionsEl = document.getElementById('af-actions');
  if (actionsEl) {
    if (isEdit) {
      actionsEl.innerHTML = `
        <div class="af-actions-row">
          <button class="btn btn-cancel btn-block" id="af-delete">Удалить</button>
          <button class="btn btn-lime btn-block" id="af-save">Сохранить</button>
        </div>
      `;
    } else {
      actionsEl.innerHTML = `
        <button class="btn btn-lime btn-block" id="af-save">Сохранить адрес</button>
      `;
    }
  }

  setTimeout(() => initAddressMap(), 100);
}

function initAddressMap() {
  if (_addressMap) {
    try { _addressMap.destroy(); } catch (e) {}
    _addressMap = null;
    _addressMarker = null;
  }

  const el = document.getElementById('address-map');
  if (!el) return;

  if (typeof ymaps === 'undefined') {
    el.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px;background:#EAE7DC">
        <div style="font-size:32px;margin-bottom:8px">🗺️</div>
        <div style="font-weight:800;color:#172B3A;font-size:13px">Карта недоступна</div>
        <div style="font-size:11.5px;color:rgba(23,43,58,.65);margin-top:4px">Проверьте API-ключ Яндекс.Карт</div>
      </div>
    `;
    return;
  }

  ymaps.ready(() => {
    if (!document.getElementById('address-map')) return;
    if (_addressMap) return;

    const start = state.coords || [55.753544, 37.621202];

    _addressMap = new ymaps.Map(el, {
      center: start,
      zoom: 16,
      controls: ['zoomControl']
    }, { suppressMapOpenBlock: true });

    const svgIcon = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
        <path d="M18 2C11.4 2 6 7.4 6 14c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
              fill="#172B3A" stroke="#B7E36A" stroke-width="2"/>
        <circle cx="18" cy="14" r="5" fill="#B7E36A"/>
      </svg>
    `);

    _addressMarker = new ymaps.Placemark(start, {}, {
      iconLayout: 'default#image',
      iconImageHref: svgIcon,
      iconImageSize: [36, 36],
      iconImageOffset: [-18, -36],
      draggable: true
    });

    _addressMap.geoObjects.add(_addressMarker);

    _addressMarker.events.add('dragend', () => {
      fillAddressFields(_addressMarker.geometry.getCoordinates());
    });

    _addressMap.events.add('click', (e) => {
      const coords = e.get('coords');
      _addressMarker.geometry.setCoordinates(coords);
      fillAddressFields(coords);
    });

    // первичное заполнение
    fillAddressFields(start);
  });
}

async function fillAddressFields(coords) {
  state.coords = coords;
  const [lat, lng] = coords;

  let data = { city: '', street: '', house: '' };

  // Яндекс
  if (typeof ymaps !== 'undefined' && ymaps.geocode) {
    try {
      const res = await ymaps.geocode(coords, { kind: 'house', results: 1 });
      const obj = res.geoObjects.get(0);
      if (obj) {
        const meta = obj.properties.get('metaDataProperty.GeocoderMetaData');
        const comps = meta?.Address?.Components || [];
        for (const c of comps) {
          if (c.kind === 'locality') data.city = c.name;
          if (c.kind === 'street') data.street = c.name;
          if (c.kind === 'house') data.house = c.name;
        }
      }
    } catch (e) {}
  }

  // Nominatim fallback
  if (!data.city && !data.street) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`,
        { headers: { 'Accept': 'application/json' } }
      );
      const d = await r.json();
      if (d && d.address) {
        data.city = d.address.city || d.address.town || d.address.village || '';
        data.street = d.address.road || '';
        data.house = d.address.house_number || '';
      }
    } catch (e) {}
  }

const setVal = (id, val) => {
  if (!val) return;              // не трогаем, если пусто
  const el = document.getElementById(id);
  if (el) el.value = val;
}; 
  setVal('af-city', data.city);
  setVal('af-street', data.street);
  setVal('af-house', data.house);
}

function saveNewAddress() {
  const fieldsMap = {
    'af-city':      'Город',
    'af-street':    'Улица',
    'af-house':     'Дом',
    'af-entrance':  'Подъезд',
    'af-floor':     'Этаж',
    'af-apartment': 'Квартира',
    'af-intercom':  'Домофон'
  };

  // Сброс ошибок
  Object.keys(fieldsMap).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('field-error');
  });

  // Валидация
  const missing = [];
  Object.keys(fieldsMap).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value.trim()) {
      el.classList.add('field-error');
      missing.push(fieldsMap[id]);
    }
  });

  if (missing.length) {
    toast('Заполните: ' + missing.join(', '));
    const firstErr = document.querySelector('.field-error');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const data = {
    city:      document.getElementById('af-city').value.trim(),
    street:    document.getElementById('af-street').value.trim(),
    house:     document.getElementById('af-house').value.trim(),
    entrance:  document.getElementById('af-entrance').value.trim(),
    intercom:  document.getElementById('af-intercom').value.trim(),
    floor:     document.getElementById('af-floor').value.trim(),
    apartment: document.getElementById('af-apartment').value.trim(),
    comment:   document.getElementById('af-comment').value.trim(),
    coords: state.coords
  };

  if (state.editingAddressId) {
    // обновление
    const idx = state.addresses.findIndex(a => a.id === state.editingAddressId);
    if (idx >= 0) {
      state.addresses[idx] = { ...state.addresses[idx], ...data };
    }
    state.selectedAddressId = state.editingAddressId;
    state.editingAddressId = null;
    save();
    toast('Адрес обновлён');
  } else {
    // создание
    const addr = { id: 'addr-' + Date.now(), ...data };
    state.addresses.push(addr);
    state.selectedAddressId = addr.id;
    save();
    toast('Адрес сохранён');
  }

  showScreen('orders');
}

function deleteCurrentAddress() {
  if (!state.editingAddressId) return;
  const id = state.editingAddressId;
  state.addresses = state.addresses.filter(a => a.id !== id);

  if (state.selectedAddressId === id) {
    state.selectedAddressId = state.addresses[0]?.id || null;
  }
  state.editingAddressId = null;
  save();
  toast('Адрес удалён');
  showScreen('orders');
}

/* ---------- Splash / экран загрузки ---------- */

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve();
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

function preloadAllImages() {
  const urls = new Set();

  // Статические изображения страниц
  urls.add('img/hero.png');
  urls.add('img/pickup.png');
  urls.add('img/address-empty.png');
  urls.add('img/cart-empty.png');

  // Все картинки из базы (блюда + ингредиенты тарелки)
  if (typeof DB !== 'undefined') {
    (DB.dishes     || []).forEach(d => d.photo && urls.add(d.photo));
    (DB.garnishes  || []).forEach(i => i.photo && urls.add(i.photo));
    (DB.proteins   || []).forEach(i => i.photo && urls.add(i.photo));
    (DB.vegetables || []).forEach(i => i.photo && urls.add(i.photo));
  }

  return Promise.all([...urls].map(preloadImage));
}

function initSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;

  // Помечаем, что сплэш управляется app.js — fallback в HTML не сработает
  splash.dataset.managed = 'true';

  const started = performance.now();
  const MIN_VISIBLE = 1200;   // минимум 1.2с — чтобы буква успела проявиться
  const MAX_WAIT    = 8000;   // максимум 8с — если что-то зависло, всё равно скроем

  // Ждём полной загрузки страницы (все скрипты, шрифты, стили, картинки в DOM)
  const windowReady = new Promise((resolve) => {
    if (document.readyState === 'complete') return resolve();
    window.addEventListener('load', () => resolve(), { once: true });
  });

  // Предзагружаем ВСЕ картинки из базы (включая те, что были бы lazy)
  const assetsReady = preloadAllImages();

  // Страховка от зависания
  const timeout = new Promise((resolve) => setTimeout(resolve, MAX_WAIT));

  // Что наступит раньше — полная загрузка или таймаут
  Promise.race([
    Promise.all([windowReady, assetsReady]),
    timeout
  ]).catch(() => {
    // если что-то пошло не так с preload — просто идём дальше
  }).then(() => {
    // Соблюдаем минимальное время показа
    const elapsed = performance.now() - started;
    const remaining = Math.max(0, MIN_VISIBLE - elapsed);

    setTimeout(() => {
      splash.classList.add('splash--hide');
      // Убираем из DOM после анимации исчезновения
      setTimeout(() => splash.remove(), 600);
    }, remaining);
  });
}

/* ---------- Карусель-витрина: счётчик слайдов ---------- */

function initShowcase() {
  const track = document.getElementById('showcase-track');
  if (!track) return;

  const realCards = [...track.querySelectorAll('.showcase-card')];
  const total = realCards.length;
  if (total < 3) return;

  const currentEl = document.getElementById('showcase-current');
  const totalEl   = document.getElementById('showcase-total');
  if (totalEl) totalEl.textContent = String(total).padStart(2, '0');

  // ── Клоны с двух сторон
  const CLONE = Math.min(2, total);
  const headClones = realCards.slice(-CLONE).map(c => {
    const n = c.cloneNode(true);
    n.setAttribute('aria-hidden', 'true');
    return n;
  });
  const tailClones = realCards.slice(0, CLONE).map(c => {
    const n = c.cloneNode(true);
    n.setAttribute('aria-hidden', 'true');
    return n;
  });

  const headFrag = document.createDocumentFragment();
  headClones.forEach(c => headFrag.appendChild(c));
  track.insertBefore(headFrag, track.firstChild);

  const tailFrag = document.createDocumentFragment();
  tailClones.forEach(c => tailFrag.appendChild(c));
  track.appendChild(tailFrag);

  const allCards = [...track.querySelectorAll('.showcase-card')];
  const pad = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--pad')) || 18;

  let isJumping = false;

  function findClosest() {
    const trackLeft = track.getBoundingClientRect().left + pad;
    let closest = 0, minDist = Infinity;
    allCards.forEach((c, i) => {
      const d = Math.abs(c.getBoundingClientRect().left - trackLeft);
      if (d < minDist) { minDist = d; closest = i; }
    });
    return closest;
  }

  function instantJumpTo(allIdx) {
    const target = allCards[allIdx];
    if (!target) return;
    const delta = target.getBoundingClientRect().left
                - track.getBoundingClientRect().left - pad;

    const prevBehavior = track.style.scrollBehavior;
    const prevSnap     = track.style.scrollSnapType;
    track.style.scrollBehavior = 'auto';
    track.style.scrollSnapType = 'none';
    track.scrollLeft = track.scrollLeft + delta;
    void track.offsetHeight;
    track.style.scrollBehavior = prevBehavior || '';
    track.style.scrollSnapType = prevSnap || '';
  }

  // ── Телепорт: только когда скролл остановился
  function doJumpIfNeeded() {
    if (isJumping) return;
    const closest = findClosest();

    if (closest >= CLONE + total) {
      isJumping = true;
      instantJumpTo(closest - total);
      setTimeout(() => { isJumping = false; }, 60);
    } else if (closest < CLONE) {
      isJumping = true;
      instantJumpTo(closest + total);
      setTimeout(() => { isJumping = false; }, 60);
    }
  }

  // ── Счётчик обновляем вживую (плавность UX), а прыжок — отдельно
  let raf = null;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      if (isJumping) return;
      const closest = findClosest();
      const realIdx = ((closest - CLONE) % total + total) % total;
      if (currentEl) currentEl.textContent = String(realIdx + 1).padStart(2, '0');
    });
  }
  track.addEventListener('scroll', onScroll, { passive: true });

  // ── Триггер прыжка: scrollend, а если браузер не умеет — idle 150ms
  if ('onscrollend' in window) {
    track.addEventListener('scrollend', doJumpIfNeeded, { passive: true });
  } else {
    let idleTimer = null;
    track.addEventListener('scroll', () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(doJumpIfNeeded, 150);
    }, { passive: true });
  }

  // ── Стартовая позиция
  requestAnimationFrame(() => {
    instantJumpTo(CLONE);
    if (currentEl) currentEl.textContent = '01';
  });

  // ── goNext() — плавный скролл на одну карточку
  function goNext() {
    if (isJumping) return;
    const closest = findClosest();
    const nextCard = allCards[closest + 1];
    if (!nextCard) {
      // не должно случаться после прыжка, но страхуемся
      doJumpIfNeeded();
      return;
    }
    const delta = nextCard.getBoundingClientRect().left
                - track.getBoundingClientRect().left - pad;
    track.scrollTo({ left: track.scrollLeft + delta, behavior: 'smooth' });
  }

  // ── Автоплей
  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let autoplayTimer = null;
  let isPaused = false;
  function startAutoplay() {
    if (autoplayTimer) return;
    autoplayTimer = setInterval(() => {
  if (isPaused) return;
  if (document.querySelector('.modal.open')) return;   // ← новая строка
  goNext();
}, 4000);
  }
  function stopAutoplay() {
    if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
  }
  function pause()  { isPaused = true; }
  function resume() { isPaused = false; stopAutoplay(); startAutoplay(); }

  ['touchstart', 'pointerdown', 'mouseenter'].forEach(evt =>
    track.addEventListener(evt, pause, { passive: true })
  );
  ['touchend', 'pointerup', 'mouseleave'].forEach(evt =>
    track.addEventListener(evt, resume, { passive: true })
  );

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else resume();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) resume();
      else pause();
    }, { threshold: 0.05 }).observe(track);
  }

  if (!prefersReducedMotion) startAutoplay();
}

/* ---------- Init ---------- */
function init() {
  load();
  renderHome();
  updateCartBadge();
  showScreen('home');
  initSplash();
  initShowcase();   // ← добавить
}
document.addEventListener('DOMContentLoaded', init);