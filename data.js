const DB = {

  sizes: [
    { id: 'S', label: 'S', grams: 400, base: 0, note: 'Лёгкий'   },
    { id: 'M', label: 'M', grams: 500, base: 0, note: 'Стандарт' },
    { id: 'L', label: 'L', grams: 600, base: 0, note: 'Сытно'    }
  ],

garnishes: [
  { id: 'g1', name: 'Гречка',            emoji: '🌾', price: 45, kcal: 343, p: 12.6, f: 3.3, c: 62.0, photo: 'img/g1.jpg' },
  { id: 'g2', name: 'Бурый рис',         emoji: '🍚', price: 50, kcal: 337, p: 7.4,  f: 1.8, c: 73.0, photo: 'img/g2.jpg' },
  { id: 'g3', name: 'Киноа',             emoji: '🌱', price: 85, kcal: 368, p: 14.1, f: 6.1, c: 64.0, photo: 'img/g3.jpg' },
  { id: 'g4', name: 'Картофельное пюре', emoji: '🥔', price: 40, kcal: 85,  p: 2.0,  f: 1.0, c: 17.0, photo: 'img/g4.jpg' },
  { id: 'g5', name: 'Булгур',            emoji: '🌾', price: 48, kcal: 342, p: 12.3, f: 1.3, c: 63.0, photo: 'img/g5.jpg' },
  { id: 'g6', name: 'Паста',             emoji: '🍝', price: 45, kcal: 350, p: 12.0, f: 1.5, c: 70.0, photo: 'img/g6.jpg' },
  { id: 'g7', name: 'Кускус',            emoji: '🌾', price: 48, kcal: 376, p: 12.8, f: 0.6, c: 77.0, photo: 'img/g7.jpg' }
],

proteins: [
  { id: 'p1', name: 'Куриная грудка', emoji: '🍗', price: 150, kcal: 165, p: 31.0, f: 3.6,  c: 0.0, photo: 'img/p1.jpg' },
  { id: 'p2', name: 'Лосось',         emoji: '🐟', price: 380, kcal: 208, p: 20.0, f: 13.0, c: 0.0, photo: 'img/p2.jpg' },
  { id: 'p3', name: 'Говядина',       emoji: '🥩', price: 320, kcal: 250, p: 26.0, f: 15.0, c: 0.0, photo: 'img/p3.jpg' },
  { id: 'p4', name: 'Индейка',        emoji: '🦃', price: 170, kcal: 189, p: 29.0, f: 7.0,  c: 0.0, photo: 'img/p4.jpg' },
  { id: 'p5', name: 'Тофу',           emoji: '🧈', price: 140, kcal: 76,  p: 8.0,  f: 4.8,  c: 1.9, photo: 'img/p5.jpg' },
  { id: 'p6', name: 'Креветки',       emoji: '🍤', price: 360, kcal: 99,  p: 24.0, f: 0.3,  c: 0.2, photo: 'img/p6.jpg' }
],

vegetables: [
  { id: 'v1', name: 'Брокколи',         emoji: '🥦', price: 70, kcal: 34, p: 2.8, f: 0.4, c: 7.0,  photo: 'img/v1.jpg' },
  { id: 'v2', name: 'Помидоры черри',   emoji: '🍅', price: 65, kcal: 18, p: 0.9, f: 0.2, c: 3.9,  photo: 'img/v2.jpg' },
  { id: 'v3', name: 'Огурец',           emoji: '🥒', price: 45, kcal: 15, p: 0.7, f: 0.1, c: 3.6,  photo: 'img/v3.jpg' },
  { id: 'v4', name: 'Болгарский перец', emoji: '🫑', price: 65, kcal: 31, p: 1.0, f: 0.3, c: 6.0,  photo: 'img/v4.jpg' },
  { id: 'v5', name: 'Шпинат',           emoji: '🥬', price: 90, kcal: 23, p: 2.9, f: 0.4, c: 3.6,  photo: 'img/v5.jpg' },
  { id: 'v6', name: 'Морковь',          emoji: '🥕', price: 45, kcal: 41, p: 0.9, f: 0.2, c: 10.0, photo: 'img/v6.jpg' },
  { id: 'v7', name: 'Микс салата',      emoji: '🥗', price: 80, kcal: 20, p: 1.5, f: 0.2, c: 2.5,  photo: 'img/v7.jpg' }
],

  categories: [
    { id: 'all',   name: 'Все',            emoji: '✨' },
    { id: 'bowls', name: 'Боулы',          emoji: '🥣' },
    { id: 'fish',  name: 'С рыбой',        emoji: '🐟' },
    { id: 'meat',  name: 'С мясом',        emoji: '🥩' },
    { id: 'veg',   name: 'Вегетарианское', emoji: '🌱' },
    { id: 'light', name: 'Лёгкие',         emoji: '🥗' }
  ],

  dishes: [
    { id: 'd1', name: 'Баланс с лососем', desc: 'Нежное филе лосося на подушке из киноа с брокколи.', photo: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=70', size: 'M', garnish: 'g3', protein: 'p2', veg: 'v1', cats: ['fish', 'bowls'], tag: 'Хит' },
    { id: 'd2', name: 'Фитнес-боул с курицей', desc: 'Запечённая куриная грудка, бурый рис и свежий микс салата.', photo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=70', size: 'M', garnish: 'g2', protein: 'p1', veg: 'v7', cats: ['meat', 'bowls'], tag: '' },
    { id: 'd3', name: 'Зелёный детокс', desc: 'Тофу, киноа и молодой шпинат.', photo: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=70', size: 'S', garnish: 'g3', protein: 'p5', veg: 'v5', cats: ['veg', 'light', 'bowls'], tag: 'Vegan' },
    { id: 'd4', name: 'Мясной баланс', desc: 'Сочная говядина, булгур и запечённый болгарский перец.', photo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=70', size: 'M', garnish: 'g5', protein: 'p3', veg: 'v4', cats: ['meat'], tag: '' },
    { id: 'd5', name: 'Средиземноморский', desc: 'Креветки, кускус и помидоры черри.', photo: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=70', size: 'M', garnish: 'g7', protein: 'p6', veg: 'v2', cats: ['fish', 'bowls'], tag: 'Новинка' },
    { id: 'd6', name: 'Лёгкий овощной', desc: 'Тофу, кускус, свежий огурец.', photo: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=70', size: 'S', garnish: 'g7', protein: 'p5', veg: 'v3', cats: ['veg', 'light'], tag: '' }
  ]
};