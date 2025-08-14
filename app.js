
// Utils
const rupiah = n => new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR'}).format(n);
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// State
let PRODUCTS = window.__PRODUCTS__ || [];
let CART = JSON.parse(localStorage.getItem('dsk_cart') || '[]');

function saveCart(){ localStorage.setItem('dsk_cart', JSON.stringify(CART)); updateCartCount(); }

function updateCartCount(){
  const count = CART.reduce((a,i)=>a+i.qty,0);
  $('#cartCount').textContent = count;
}

// Build product cards
function renderProducts(list){
  const grid = $('#productGrid');
  grid.innerHTML = '';
  list.forEach(p=>{
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <div class="product-info">
        <div class="product-title">
          <h3>${p.name}</h3>
          <span class="price">${rupiah(p.price)}</span>
        </div>
        <p class="product-desc">${p.desc}</p>
        <div class="card-actions">
          <div class="qty">
            <button aria-label="kurangi" data-dec>-</button>
            <input type="number" min="1" value="1" inputmode="numeric">
            <button aria-label="tambah" data-inc>+</button>
          </div>
          <button class="btn primary" data-add>Tambah</button>
        </div>
      </div>`;
    const input = card.querySelector('input');
    card.querySelector('[data-inc]').addEventListener('click',()=>input.value = (+input.value||1)+1);
    card.querySelector('[data-dec]').addEventListener('click',()=>input.value = Math.max(1,(+input.value||1)-1));
    card.querySelector('[data-add]').addEventListener('click',()=>{
      const qty = +input.value||1;
      addToCart(p.id, qty);
      card.animate([{transform:'translateY(0)'},{transform:'translateY(-6px)'},{transform:'translateY(0)'}],{duration:300});
    });
    grid.appendChild(card);
  });
}

// Cart logic
function addToCart(id, qty=1){
  const item = CART.find(i=>i.id===id);
  if(item) item.qty += qty;
  else{
    const p = PRODUCTS.find(x=>x.id===id);
    CART.push({id, name:p.name, price:p.price, img:p.img, qty});
  }
  saveCart();
  openCart();
  renderCart();
}

function removeFromCart(id){
  CART = CART.filter(i=>i.id!==id);
  saveCart();
  renderCart();
}

function changeQty(id, delta){
  const item = CART.find(i=>i.id===id);
  if(!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCart();
}

function renderCart(){
  const wrap = $('#cartItems');
  wrap.innerHTML = '';
  let subtotal = 0;
  CART.forEach(i=>{
    subtotal += i.qty * i.price;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${i.img}" alt="${i.name}">
      <div>
        <div style="font-weight:700">${i.name}</div>
        <div class="row">
          <button class="icon-btn" data-m="${i.id}">-</button>
          <span>${i.qty}</span>
          <button class="icon-btn" data-p="${i.id}">+</button>
        </div>
      </div>
      <div style="text-align:right">
        <div>${rupiah(i.price*i.qty)}</div>
        <button class="icon-btn" data-r="${i.id}" title="hapus">&times;</button>
      </div>`;
    row.querySelector('[data-m]').addEventListener('click',()=>changeQty(i.id,-1));
    row.querySelector('[data-p]').addEventListener('click',()=>changeQty(i.id, +1));
    row.querySelector('[data-r]').addEventListener('click',()=>removeFromCart(i.id));
    wrap.appendChild(row);
  });
  $('#cartSubtotal').textContent = rupiah(subtotal);
  $('#checkoutTotal').textContent = rupiah(subtotal);
}

// Drawer & modal
const drawer = $('#cartDrawer');
const backdrop = $('#backdrop');
function openCart(){ drawer.classList.add('open'); backdrop.classList.add('show'); drawer.setAttribute('aria-hidden','false'); }
function closeCart(){ drawer.classList.remove('open'); backdrop.classList.remove('show'); drawer.setAttribute('aria-hidden','true'); }

$('#openCart').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
backdrop.addEventListener('click', ()=>{ closeCart(); closeCheckout(); });

// Checkout
const checkoutModal = $('#checkoutModal');
function openCheckout(){ checkoutModal.classList.add('show'); checkoutModal.setAttribute('aria-hidden','false'); }
function closeCheckout(){ checkoutModal.classList.remove('show'); checkoutModal.setAttribute('aria-hidden','true'); }

$('#checkoutBtn').addEventListener('click', ()=>{
  if(CART.length===0){ alert('Keranjang masih kosong 😅'); return; }
  openCheckout();
});
$('#closeCheckout').addEventListener('click', closeCheckout);

$('#checkoutForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  const order = {
    id: 'DSK' + Date.now().toString().slice(-6),
    items: CART,
    total: CART.reduce((a,i)=>a+i.qty*i.price,0),
    ...data
  };
  localStorage.setItem('dsk_last_order', JSON.stringify(order));
  CART = []; saveCart(); renderCart(); closeCheckout(); closeCart();
  alert('Pesanan dibuat!\nNomor: '+order.id+'\nTotal: '+rupiah(order.total));
});

// Search + sort
$('#searchInput').addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  const filtered = PRODUCTS.filter(p => (p.name+' '+p.desc).toLowerCase().includes(q));
  renderProducts(filtered);
});
$('#sortSelect').addEventListener('change', (e)=>{
  const v = e.target.value;
  let arr = [...PRODUCTS];
  if(v==='asc') arr.sort((a,b)=>a.price-b.price);
  else if(v==='desc') arr.sort((a,b)=>b.price-a.price);
  else arr.sort((a,b)=>b.popular - a.popular);
  renderProducts(arr);
});

// Slider
(function(){
  const slider = $('#slider');
  const slides = $$('#slider .slide');
  const prev = slider.querySelector('.prev');
  const next = slider.querySelector('.next');
  const dots = $('#sliderDots');
  let idx = 0;
  slides.forEach((_,i)=>{
    const b = document.createElement('button');
    b.addEventListener('click', ()=>go(i));
    dots.appendChild(b);
  });
  function go(i){
    slides[idx].classList.remove('current');
    dots.children[idx].classList.remove('active');
    idx = (i+slides.length) % slides.length;
    slides[idx].classList.add('current');
    dots.children[idx].classList.add('active');
  }
  prev.addEventListener('click', ()=>go(idx-1));
  next.addEventListener('click', ()=>go(idx+1));
  setInterval(()=>go(idx+1), 5000);
  go(0);
})();

// Animate on view
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('in'); });
},{threshold:.1});
$$('[data-animate]').forEach(el=>io.observe(el));

// Dark mode toggle
const root = document.documentElement;
const themeBtn = $('#themeToggle');
let dark = localStorage.getItem('dsk_theme')==='dark';
function applyTheme(){ document.body.classList.toggle('dark', dark); themeBtn.textContent = dark ? '🌙' : '☀'; }
applyTheme();
themeBtn.addEventListener('click', ()=>{ dark=!dark; localStorage.setItem('dsk_theme', dark?'dark':'light'); applyTheme(); });

// Footer year
$('#year').textContent = new Date().getFullYear();

// Init
updateCartCount();
renderProducts(PRODUCTS);
renderCart();
