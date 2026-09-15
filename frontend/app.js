// ─── EcoCart Frontend Client ────────────────────────────────────────────────
// Connects to Supabase (when configured) with intelligent offline/local fallback.
// Connects to the FastAPI backend for Gemini AI features — localhost when
// developing, the deployed Render URL everywhere else.

const IS_LOCAL_HOST = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = IS_LOCAL_HOST
  ? 'http://localhost:8000'
  : 'https://ecocart-backend-1h0l.onrender.com';

// ─── Supabase client ────────────────────────────────────────────────────────
// Replace with your real Supabase project URL and anon public key from supabase.com
const SUPABASE_URL = 'https://deitynnbjeecmxasmufm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7E25OS9oBGkk-duRYNUz-Q_mmGitUuj';

let supabaseClient = null;
try {
  if (window.supabase && SUPABASE_URL && !SUPABASE_URL.includes('YOUR_PROJECT')) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase client initialization skipped:', e);
}

// ─── Local Storage & Session State ──────────────────────────────────────────
const SESSION_KEY = 'ecocart_auth_user';
const CARBON_LOG_KEY = 'ecocart_carbon_log';
const GROUP_BUYS_KEY = 'ecocart_group_members';

function getSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(user) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch {}
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

function getLocalCarbonLog(userId) {
  try {
    const raw = localStorage.getItem(CARBON_LOG_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return all.filter(item => item.user_id === userId);
  } catch { return []; }
}

function addLocalCarbonLog(entry) {
  try {
    const raw = localStorage.getItem(CARBON_LOG_KEY);
    const all = raw ? JSON.parse(raw) : [];
    all.push(entry);
    localStorage.setItem(CARBON_LOG_KEY, JSON.stringify(all));
  } catch {}
}

function getLocalGroupMembers(gbId) {
  try {
    const raw = localStorage.getItem(GROUP_BUYS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[gbId] || [];
  } catch { return []; }
}

function addLocalGroupMember(gbId, userId) {
  try {
    const raw = localStorage.getItem(GROUP_BUYS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (!map[gbId]) map[gbId] = [];
    if (!map[gbId].includes(userId)) map[gbId].push(userId);
    localStorage.setItem(GROUP_BUYS_KEY, JSON.stringify(map));
  } catch {}
}

// ─── Product Images (Unsplash) ──────────────────────────────────────────────
const PRODUCT_IMAGES = {
  'Cloud Cotton Towels':     'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&h=380&fit=crop&q=80',
  'Refillable Hand Wash':    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=380&fit=crop&q=80',
  'Bamboo Everyday Tee':     'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=380&fit=crop&q=80',
  'Compostable Coffee Pods': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&h=380&fit=crop&q=80',
  'Cork Yoga Block':         'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&h=380&fit=crop&q=80',
  'Botanical Dish Bar':      'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500&h=380&fit=crop&q=80',
  'Oat Milk Chocolate':      'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&h=380&fit=crop&q=80',
  'Mineral Sunscreen':       'https://images.unsplash.com/photo-1582126631741-e29e4c2e9ef8?w=500&h=380&fit=crop&q=80',
};

// ─── Check AI Backend Health ───────────────────────────────────────────────
async function checkBackendHealth() {
  const badge = document.querySelector('#backendStatus');
  if (!badge) return;
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      badge.className = 'backend-status-badge connected';
      badge.querySelector('.status-text').textContent = data.gemini_configured ? 'Gemini AI Active' : 'AI Backend Ready';
      badge.title = `AI Engine: ${data.engine}`;
    } else {
      throw new Error('Backend status ' + res.status);
    }
  } catch (err) {
    badge.className = 'backend-status-badge offline';
    badge.querySelector('.status-text').textContent = 'AI Offline';
    badge.title = `FastAPI backend not detected at ${API_BASE_URL}. Start/wake the backend to enable live AI features.`;
  }
}

// ─── Auth helpers ───────────────────────────────────────────────────────────
const authScreen   = document.querySelector('#authScreen');
const registerForm = document.querySelector('#registerForm');
const loginForm    = document.querySelector('#loginForm');
const feedback     = document.querySelector('#authFeedback');
const quickDemoBtn = document.querySelector('#quickDemoBtn');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let currentUser    = null;

function showFeedback(message, isSuccess = false) {
  feedback.textContent = message;
  feedback.className = `auth-feedback ${isSuccess ? 'success' : 'error'}`;
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  registerForm.hidden = isLogin;
  loginForm.hidden = !isLogin;
  document.querySelector('#authTitle').innerHTML = isLogin
    ? 'Welcome<br /><em>back.</em>'
    : 'Join the<br /><em>movement.</em>';
  document.querySelector('#authSubtitle').textContent = isLogin
    ? 'Sign in to continue your sustainable shopping journey.'
    : 'Create your account and start shopping with impact.';
  document.querySelector('#authSwitch').innerHTML = isLogin
    ? 'New to EcoCart? <button type="button" data-auth-mode="register">Create an account</button>'
    : 'Already have an account? <button type="button" data-auth-mode="login">Sign in</button>';
  feedback.className = 'auth-feedback';
  feedback.textContent = '';
}

function updateProfile(user) {
  const name = user.user_metadata?.full_name || user.name || user.email?.split('@')[0] || 'Aarav Sharma';
  document.querySelector('#profileInitials').textContent = name
    .split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function enterStore(user) {
  currentUser = user;
  saveSession(user);
  updateProfile(user);
  authScreen.classList.add('is-hidden');
  loadProductCatalog();
  loadImpactDashboard();
  loadGroupBuys();
  subscribeToGroupBuyUpdates();
  checkBackendHealth();
}

function validEmail(value)  { return emailPattern.test(value.trim()); }
function normalisePhone(value) { return value.replace(/[^\d+]/g, '').replace(/^00/, '+'); }
function validPhone(value)  { const digits = value.replace(/\D/g, ''); return digits.length >= 10 && digits.length <= 15; }

function setLoading(form, label, isLoading) {
  const button = form.querySelector('button[type="submit"]');
  form.classList.toggle('is-loading', isLoading);
  form.querySelectorAll('input, button').forEach(el => el.disabled = isLoading);
  button.innerHTML = isLoading
    ? `<span class="button-spinner" aria-hidden="true"></span>${label}`
    : button.dataset.defaultLabel;
}

registerForm.querySelector('button').dataset.defaultLabel = registerForm.querySelector('button').innerHTML;
loginForm.querySelector('button').dataset.defaultLabel    = loginForm.querySelector('button').innerHTML;

// Quick Demo Login Button
quickDemoBtn?.addEventListener('click', () => {
  const demoUser = {
    id: 'demo-user-aarav-sharma',
    email: 'aarav.sharma@ecocart.dev',
    user_metadata: {
      full_name: 'Aarav Sharma',
      phone: '+91 98765 43210'
    }
  };
  enterStore(demoUser);
  showToast('Signed in as Aarav Sharma (Demo Mode) ✦');
});

// Register Form Submit
registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name     = document.querySelector('#registerName').value.trim();
  const email    = document.querySelector('#registerEmail').value.trim().toLowerCase();
  const phone    = normalisePhone(document.querySelector('#registerPhone').value);
  const password = document.querySelector('#registerPassword').value;

  if (!name)               return showFeedback('Please enter your name to create an account.');
  if (!validEmail(email))  return showFeedback('Invalid email address. Please enter a valid email.');
  if (!validPhone(phone))  return showFeedback('Invalid mobile number. Enter a valid 10 to 15 digit number.');
  if (password.length < 6) return showFeedback('Your password must be at least 6 characters long.');

  setLoading(registerForm, 'Creating your account…', true);

  const localUser = {
    id: 'usr_' + Date.now(),
    email: email,
    user_metadata: { full_name: name, phone: phone }
  };

  // Try Supabase Auth if client exists
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name, phone } }
      });
      if (!error && data?.user) {
        setLoading(registerForm, '', false);
        document.querySelector('#authTitle').innerHTML = 'Account<br /><em>Created!</em>';
        document.querySelector('#authSubtitle').textContent = `Welcome to the movement, ${name}.`;
        enterStore(data.user);
        return;
      }
    } catch (err) {
      console.warn('Supabase cloud sign-up notice (using local active session):', err.message);
    }
  }

  // Seamless fallback: Log in directly
  setTimeout(() => {
    setLoading(registerForm, '', false);
    enterStore(localUser);
    showToast(`Welcome to EcoCart, ${name}!`);
  }, 400);
});

// Login Form Submit
loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const identifier = document.querySelector('#loginIdentifier').value.trim();
  const password   = document.querySelector('#loginPassword').value;
  const isEmail    = identifier.includes('@');

  if (isEmail && !validEmail(identifier)) return showFeedback('Please enter a valid email address.');
  if (!isEmail && !validPhone(identifier)) return showFeedback('Please enter a valid 10 to 15 digit phone number.');
  if (password.length < 6) return showFeedback('Password must be at least 6 characters long.');

  setLoading(loginForm, 'Signing you in…', true);

  const userName = isEmail ? identifier.split('@')[0].replace(/[._-]/g, ' ') : 'EcoCart User';
  const localUser = {
    id: 'usr_' + identifier.replace(/[^a-zA-Z0-9]/g, ''),
    email: isEmail ? identifier.toLowerCase() : 'user@ecocart.dev',
    user_metadata: {
      full_name: userName.charAt(0).toUpperCase() + userName.slice(1),
      phone: isEmail ? '+91 98765 43210' : identifier
    }
  };

  // Try Supabase Auth if client exists
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: isEmail ? identifier.toLowerCase() : identifier,
        password
      });
      if (!error && data?.user) {
        setLoading(loginForm, '', false);
        enterStore(data.user);
        return;
      }
    } catch (err) {
      console.warn('Supabase cloud login notice (using local active session):', err.message);
    }
  }

  // Seamless fallback: Sign in directly
  setTimeout(() => {
    setLoading(loginForm, '', false);
    enterStore(localUser);
    showToast(`Welcome back, ${localUser.user_metadata.full_name}!`);
  }, 400);
});

document.querySelector('#authSwitch').addEventListener('click', event => {
  if (event.target.dataset.authMode) setAuthMode(event.target.dataset.authMode);
});

document.querySelector('#logoutButton').addEventListener('click', async () => {
  if (supabaseClient) {
    try { await supabaseClient.auth.signOut(); } catch {}
    if (groupBuysSubscription) {
      try { await supabaseClient.removeChannel(groupBuysSubscription); } catch {}
      groupBuysSubscription = null;
    }
  }
  clearSession();
  authScreen.classList.remove('is-hidden');
  setAuthMode('login');
  loginForm.reset();
  registerForm.reset();
  currentUser = null;
  cart = [];
  updateCartBadge();
  showToast('Signed out successfully');
});

// ─── Cart State ─────────────────────────────────────────────────────────────
let cart = [];

function addToCart(product, packagingChoice = 'Minimal recycled mailer') {
  const existing = cart.find(i => i.product.name === product.name && i.packagingChoice === packagingChoice);
  if (existing) { existing.qty++; }
  else { cart.push({ product, packagingChoice, qty: 1 }); }
  updateCartBadge();
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  const total = cart.reduce((sum, i) => sum + i.qty, 0);
  const badge = document.querySelector('.bag span');
  if (badge) badge.textContent = total;
}

function getCartPriceTotal() {
  return cart.reduce((sum, i) => sum + (i.product.priceNum || 0) * i.qty, 0);
}

function getCartCO2Total() {
  return cart.reduce((sum, i) => sum + (i.product.carbonSaved || 0) * i.qty, 0);
}

function renderCart() {
  const list    = document.querySelector('#cartItems');
  const foot    = document.querySelector('#cartFoot');
  const title   = document.querySelector('#cartTitle');
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);

  title.textContent = totalItems ? `${totalItems} item${totalItems > 1 ? 's' : ''}` : 'Empty';

  if (!cart.length) {
    list.innerHTML = `<li class="cart-empty-state">Your cart is empty.<br />Start shopping below!</li>`;
    if (foot) foot.hidden = true;
    return;
  }

  list.innerHTML = cart.map((item, idx) => {
    const img = PRODUCT_IMAGES[item.product.name] || '';
    return `<li class="cart-item">
      <div class="cart-item-img" style="background:${item.product.color || '#d3e8c6'}">
        ${img ? `<img src="${img}" alt="${item.product.name}" onerror="this.style.display='none'">` : item.product.icon}
      </div>
      <div class="cart-item-info">
        <strong>${item.product.name}</strong>
        <small>${item.packagingChoice}</small>
        <span class="cart-item-co2">↓${(item.product.carbonSaved * item.qty).toFixed(1)}kg CO₂ saved</span>
      </div>
      <div class="cart-item-right">
        <span class="cart-item-price">${item.product.price}</span>
        ${item.qty > 1 ? `<span class="cart-item-qty">×${item.qty}</span>` : ''}
        <button class="cart-remove-btn" data-remove="${idx}" aria-label="Remove ${item.product.name}">✕</button>
      </div>
    </li>`;
  }).join('');

  if (foot) {
    foot.hidden = false;
    document.querySelector('#cartCO2').textContent  = getCartCO2Total().toFixed(1) + ' kg';
    document.querySelector('#cartPrice').textContent = '₹' + getCartPriceTotal().toLocaleString('en-IN');
  }
}

function openCart() {
  document.querySelector('#cartPanel').classList.add('open');
  document.querySelector('#cartOverlay').classList.add('open');
  renderCart();
}
function closeCart() {
  document.querySelector('#cartPanel').classList.remove('open');
  document.querySelector('#cartOverlay').classList.remove('open');
}

// Cart event listeners
document.querySelector('.bag').addEventListener('click', openCart);
document.querySelector('#cartClose')?.addEventListener('click', closeCart);
document.querySelector('#cartOverlay')?.addEventListener('click', closeCart);

document.querySelector('#cartItems')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-remove]');
  if (!btn) return;
  removeFromCart(Number(btn.dataset.remove));
  showToast('Item removed from cart');
});

document.querySelector('#cartCheckout')?.addEventListener('click', async () => {
  if (!cart.length || !currentUser) return;
  const btn = document.querySelector('#cartCheckout');
  btn.disabled = true;
  btn.innerHTML = '<span class="button-spinner"></span>Logging impact…';

  const inserts = cart.map(item => ({
    user_id:             currentUser.id,
    product_id:          item.product.id || null,
    co2_saved_kg:        item.product.carbonSaved * item.qty,
    purchase_amount_inr: item.product.priceNum * item.qty,
    packaging_choice:    item.packagingChoice,
    created_at:          new Date().toISOString()
  }));

  // Try Supabase insert if client exists
  let savedToCloud = false;
  if (supabaseClient) {
    try {
      const validInserts = inserts.filter(r => r.product_id);
      if (validInserts.length) {
        const { error } = await supabaseClient.from('carbon_log').insert(validInserts);
        if (!error) savedToCloud = true;
      }
    } catch {}
  }

  // Always persist locally as well
  inserts.forEach(entry => addLocalCarbonLog(entry));

  const co2 = getCartCO2Total().toFixed(1);
  cart = [];
  updateCartBadge();
  renderCart();
  closeCart();
  loadImpactDashboard();
  showToast(`Checkout complete! ${co2}kg CO₂ saved ✦`);
  btn.disabled = false;
  btn.innerHTML = 'Log impact &amp; checkout <b>↗</b>';
});

// ─── Product Catalog ────────────────────────────────────────────────────────
let products = [
  {id:'p-1', name:'Cloud Cotton Towels',    category:'Home',   price:'₹1,290', priceNum:1290,  grade:'A', carbon:'1.2kg less CO₂', carbonSaved:1.2, icon:'▧', color:'#adcfa1', rot:'-7deg', note:'Organic, GOTS-certified cotton and plastic-free delivery.', material:'GOTS organic cotton', packaging:'Plastic-free paper wrap', certification:'GOTS', origin:'India', dimensions:{materials:'A',packaging:'A',carbon:'A',ethics:'A',durability:'A'}, aiExplanation:'Grade A: GOTS organic cotton avoids conventional pesticide intensity, while plastic-free delivery keeps packaging impact low.'},
  {id:'p-2', name:'Refillable Hand Wash',   category:'Beauty', price:'₹440',   priceNum:440,   grade:'A', carbon:'0.6kg less CO₂', carbonSaved:0.6, icon:'◒', color:'#d6bd91', rot:'0deg',  note:'A forever bottle with low-water refill pouches.', material:'Plant-based formula', packaging:'Reusable bottle and refill pouch', certification:'Cruelty Free', origin:'India', dimensions:{materials:'A',packaging:'A',carbon:'A',ethics:'B',durability:'A'}, aiExplanation:'Grade A: The durable bottle removes repeat single-use packaging and compact refills reduce transport emissions.'},
  {id:'p-3', name:'Bamboo Everyday Tee',    category:'Clothing', price:'₹1,690', priceNum:1690,  grade:'B', carbon:'2.8kg less CO₂', carbonSaved:2.8, icon:'♧', color:'#95b99c', rot:'6deg',  note:'Soft bamboo fibre, responsibly dyed, made to last.', material:'Bamboo viscose blend', packaging:'Recycled paper mailer', certification:'OEKO-TEX', origin:'India', dimensions:{materials:'B',packaging:'A',carbon:'A',ethics:'B',durability:'B'}, aiExplanation:'Grade B: Bamboo is a lower-impact fibre than conventional options. Strong carbon and packaging performance.'},
  {id:'p-4', name:'Compostable Coffee Pods',category:'Food',   price:'₹590',   priceNum:590,   grade:'A', carbon:'0.9kg less CO₂', carbonSaved:0.9, icon:'◉', color:'#ccad72', rot:'-6deg', note:'Rich coffee in a home-compostable plant-fibre pod.', material:'Coffee and plant fibre', packaging:'Home-compostable pod', certification:'Fairtrade', origin:'India', dimensions:{materials:'A',packaging:'A',carbon:'A',ethics:'A',durability:'B'}, aiExplanation:'Grade A: Plant-fibre pods are designed to break down at home, avoiding aluminium or plastic single-serve waste.'},
  {id:'p-5', name:'Cork Yoga Block',        category:'Home',   price:'₹890',   priceNum:890,   grade:'A', carbon:'1.5kg less CO₂', carbonSaved:1.5, icon:'▰', color:'#b89a67', rot:'-8deg', note:'Naturally renewable cork, with no synthetic foam.', material:'Renewable natural cork', packaging:'No-plastic wrap', certification:'FSC', origin:'Portugal', dimensions:{materials:'A',packaging:'A',carbon:'A',ethics:'B',durability:'A'}, aiExplanation:'Grade A: Cork regenerates naturally after harvesting and replaces synthetic foam with a long-lived, biodegradable material.'},
  {id:'p-6', name:'Botanical Dish Bar',     category:'Home',   price:'₹260',   priceNum:260,   grade:'B', carbon:'0.4kg less CO₂', carbonSaved:0.4, icon:'▣', color:'#b6d7a5', rot:'3deg',  note:'Concentrated cleaning power without a single-use bottle.', material:'Plant-based surfactants', packaging:'Recyclable paper box', certification:'Leaping Bunny', origin:'India', dimensions:{materials:'A',packaging:'B',carbon:'B',ethics:'A',durability:'B'}, aiExplanation:'Grade B: A water-light solid format avoids a plastic bottle and lowers shipping weight with recyclable packaging.'},
  {id:'p-7', name:'Oat Milk Chocolate',     category:'Food',   price:'₹320',   priceNum:320,   grade:'B', carbon:'0.7kg less CO₂', carbonSaved:0.7, icon:'▤', color:'#9c7357', rot:'-4deg', note:'Fair-trade cocoa wrapped in recyclable paper.', material:'Fair-trade cocoa and oats', packaging:'Recyclable paper wrapper', certification:'Fairtrade', origin:'India', dimensions:{materials:'B',packaging:'A',carbon:'B',ethics:'A',durability:'B'}, aiExplanation:'Grade B: Fair-trade cocoa supports ethical producer standards and paper packaging reduces plastic footprint.'},
  {id:'p-8', name:'Mineral Sunscreen',      category:'Beauty', price:'₹760',   priceNum:760,   grade:'A', carbon:'0.8kg less CO₂', carbonSaved:0.8, icon:'◐', color:'#dfc5a6', rot:'4deg',  note:'Reef-safe mineral protection in an aluminium tube.', material:'Reef-safe zinc oxide', packaging:'Aluminium tube', certification:'Cruelty Free', origin:'India', dimensions:{materials:'A',packaging:'A',carbon:'A',ethics:'A',durability:'B'}, aiExplanation:'Grade A: Reef-safe mineral protection, recyclable aluminium packaging, and a cruelty-free formula.'}
];

const grid    = document.querySelector('#productGrid');
const dialog  = document.querySelector('#productDialog');
const content = document.querySelector('#dialogContent');
let   catalogLoaded = false;

async function loadProductCatalog() {
  if (catalogLoaded) return;
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('products').select('*').eq('is_active', true).order('created_at');
      if (!error && data?.length) {
        products = data.map((p, i) => ({
          id:            p.id,
          name:          p.name,
          category:      p.category,
          price:         `₹${Number(p.price_inr).toLocaleString('en-IN')}`,
          priceNum:      Number(p.price_inr),
          grade:         p.eco_grade,
          carbon:        `${p.carbon_saved_kg}kg less CO₂`,
          carbonSaved:   Number(p.carbon_saved_kg),
          icon:          p.icon,
          color:         p.accent_color,
          rot:           ['-7deg','0deg','6deg','-6deg'][i % 4],
          note:          p.description,
          dimensions:    p.eco_dimensions,
          material:      p.material,
          packaging:     p.packaging,
          certification: p.certification,
          origin:        p.origin_country,
          aiExplanation: p.ai_explanation,
        }));
        catalogLoaded = true;
      }
    } catch {}
  }
  render();
}

// ─── Store render with search + sort ───────────────────────────────────────
function gradeValue(grade) { return { A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 }[grade] || 0; }

function render() {
  const filter = document.querySelector('.chip.active')?.dataset.filter || 'all';
  const search = (document.querySelector('#storeSearch')?.value || '').toLowerCase().trim();
  const sort   = document.querySelector('#storeSort')?.value || 'default';

  let visible = filter === 'all' ? [...products] : products.filter(p => p.category === filter);
  if (search) visible = visible.filter(p =>
    p.name.toLowerCase().includes(search) || (p.note || '').toLowerCase().includes(search) || (p.material || '').toLowerCase().includes(search)
  );
  if (sort === 'grade')       visible.sort((a, b) => gradeValue(b.grade) - gradeValue(a.grade));
  else if (sort === 'price_asc')  visible.sort((a, b) => (a.priceNum || 0) - (b.priceNum || 0));
  else if (sort === 'price_desc') visible.sort((a, b) => (b.priceNum || 0) - (a.priceNum || 0));
  else if (sort === 'carbon')     visible.sort((a, b) => (b.carbonSaved || 0) - (a.carbonSaved || 0));

  if (!visible.length) {
    grid.innerHTML = `<p style="color:#68766c;font-size:13px;grid-column:1/-1;text-align:center;padding:40px 0">No eco products found matching your search. Try another filter!</p>`;
    return;
  }

  grid.innerHTML = visible.map(p => {
    const idx = products.indexOf(p);
    const img = PRODUCT_IMAGES[p.name] || '';
    return `<article class="product-card" data-index="${idx}">
      <div class="product-image" style="--card-accent:${p.color}">
        <span class="grade">${p.grade}</span>
        ${img
          ? `<img src="${img}" alt="${p.name}" class="product-img" loading="lazy" onerror="this.parentNode.classList.add('no-img')">`
          : `<span class="product-object" style="--rot:${p.rot}">${p.icon}</span>`
        }
        <button class="card-quick-add" data-quick-add="${idx}" aria-label="Add ${p.name} to cart" title="Quick add to cart">
          + Add to Cart
        </button>
      </div>
      <div class="card-details">
        <small>${p.category.toUpperCase()} · ECO VERIFIED</small>
        <h3>${p.name}</h3>
        <div class="card-bottom">
          <span>${p.price}</span>
          <span class="carbon">${p.carbon}</span>
        </div>
      </div>
    </article>`;
  }).join('');
}

render();
document.querySelectorAll('.chip').forEach(button => button.addEventListener('click', () => {
  document.querySelector('.chip.active').classList.remove('active');
  button.classList.add('active');
  render();
}));
document.querySelector('#storeSearch')?.addEventListener('input', render);
document.querySelector('#storeSort')?.addEventListener('change', render);

// ─── Product detail dialog ──────────────────────────────────────────────────
grid.addEventListener('click', e => {
  const quickAdd = e.target.closest('[data-quick-add]');
  if (quickAdd) {
    e.stopPropagation();
    const p = products[quickAdd.dataset.quickAdd];
    addToCart(p);
    showToast(`${p.name} added to cart`);
    return;
  }

  const card = e.target.closest('.product-card');
  if (!card) return;
  openProductDialog(products[card.dataset.index], card.dataset.index);
});

function openProductDialog(p, idx) {
  const d   = p.dimensions || { materials: 'A', packaging: 'A', carbon: p.grade, ethics: 'A', durability: 'B' };
  const img = PRODUCT_IMAGES[p.name] || '';

  content.innerHTML = `
    ${img ? `<div class="dialog-hero-img"><img src="${img}" alt="${p.name}" onerror="this.parentNode.style.display='none'"><span class="dialog-grade-badge">Grade ${p.grade}</span></div>` : ''}
    <div class="dialog-body">
      <div class="dialog-top ${img ? 'has-image' : ''}">
        ${!img ? `<div class="dialog-visual" style="--card-accent:${p.color};background:${p.color}">${p.icon}</div>` : ''}
        <div>
          <small class="eyebrow">AI VERIFIED · ${p.category.toUpperCase()}</small>
          <h3>${p.name}</h3>
          <strong>${p.price} · <span style="color:#287451">Grade ${p.grade}</span></strong>
          <p>${p.note}</p>
        </div>
      </div>

      <div class="score-row">
        <span>Materials: ${d.materials}</span>
        <span>Packaging: ${d.packaging}</span>
        <span>Carbon: ${d.carbon}</span>
        <span>Ethics: ${d.ethics}</span>
        <span>Durability: ${d.durability}</span>
      </div>

      <div class="metadata-grid">
        <span><b>Material</b>${p.material || 'Verified sustainable'}</span>
        <span><b>Packaging</b>${p.packaging || 'Low-waste format'}</span>
        <span><b>Certification</b>${p.certification || 'Eco Verified'}</span>
        <span><b>Made in</b>${p.origin || 'India'}</span>
      </div>

      <p class="dialog-explain">${p.aiExplanation || 'EcoCart\'s AI grading engine analyzes material life cycles, transport footprints, and end-of-life circularity to calculate this score.'}</p>

      <p class="recommendation" id="ragRecommendation" data-product-id="${p.id || ''}" aria-live="polite">
        <b>Finding a greener alternative…</b>
      </p>

      <div class="purchase-row">
        <select id="packageChoice" aria-label="Packaging choice">
          <option value="Minimal recycled mailer">Minimal recycled mailer · 0.1kg CO₂</option>
          <option value="Reusable delivery box">Reusable delivery box · 0.2kg CO₂</option>
          <option value="Standard recyclable box">Standard recyclable box · 0.4kg CO₂</option>
        </select>
        <div class="dialog-actions">
          <button class="button secondary dialog-add-cart" data-add-cart="${p.id || ''}" data-product-index="${idx}">
            Add to cart
          </button>
          <button class="button primary dialog-buy-now" data-buy-now="${p.id || ''}" data-product-index="${idx}">
            Buy now <b>↗</b>
          </button>
        </div>
      </div>
    </div>`;
  dialog.showModal();
  loadRagRecommendation(p);
}

async function loadRagRecommendation(product) {
  const recommendation = content.querySelector('#ragRecommendation');
  if (!recommendation) return;

  try {
    const hasDatabaseId = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(product.id || '');
    const endpoint = hasDatabaseId
      ? `${API_BASE_URL}/api/ai/recommendations/${encodeURIComponent(product.id)}`
      : `${API_BASE_URL}/api/ai/recommendations/by-name?name=${encodeURIComponent(product.name)}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Recommendation request failed: ${response.status}`);

    const data = await response.json();
    const alternative = data.recommendations?.[0];

    // The user may have opened a different product while this request was running.
    if (!dialog.open || recommendation.dataset.productId !== product.id) return;

    if (!alternative) {
      recommendation.innerHTML = '<b>Excellent choice</b> This product is already among our highest EcoCart-rated options.';
      return;
    }

    recommendation.innerHTML =
      `<b>Greener alternative · RAG matched</b> ${alternative.name} is a Grade ${alternative.eco_grade} option ` +
      `with ${(Number(alternative.similarity || 0) * 100).toFixed(0)}% semantic similarity.`;
  } catch {
    recommendation.hidden = true;
  }
}

// ─── Dialog action handler (Add to Cart / Buy Now) ─────────────────────────
content.addEventListener('click', async event => {
  const addBtn = event.target.closest('[data-add-cart]');
  const buyBtn = event.target.closest('[data-buy-now]');
  if (!addBtn && !buyBtn) return;

  const btn     = addBtn || buyBtn;
  const product = products[btn.dataset.productIndex];
  const pkg     = document.querySelector('#packageChoice')?.value || 'Minimal recycled mailer';

  if (addBtn) {
    addToCart(product, pkg);
    dialog.close();
    showToast(`${product.name} added to cart`);
    openCart();
    return;
  }

  if (!currentUser) {
    showToast('Please sign in to complete purchase');
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="button-spinner"></span>Processing…';

  const entry = {
    user_id:             currentUser.id,
    product_id:          product.id,
    co2_saved_kg:        product.carbonSaved,
    purchase_amount_inr: product.priceNum,
    packaging_choice:    pkg,
    created_at:          new Date().toISOString()
  };

  if (supabaseClient) {
    try { await supabaseClient.from('carbon_log').insert(entry); } catch {}
  }
  addLocalCarbonLog(entry);

  content.innerHTML = `
    <div class="dialog-success">
      <div class="dialog-success-icon">✦</div>
      <h3>Purchase logged!</h3>
      <p><b>${product.carbonSaved}kg CO₂</b> added to your impact dashboard.</p>
      <p style="color:#68766c;font-size:12px">${product.name} · ${pkg}</p>
      <button class="button primary" style="margin-top:22px;width:100%;justify-content:center" onclick="document.querySelector('#productDialog').close()">
        Continue shopping
      </button>
    </div>`;
  loadImpactDashboard();
  showToast(`${product.carbonSaved}kg CO₂ saved — great choice!`);
});

document.querySelector('.close').addEventListener('click', () => dialog.close());

// ─── Impact dashboard (ring in #impact section) ────────────────────────────
async function loadImpactDashboard() {
  if (!currentUser) return;
  let logData = [];

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('carbon_log').select('co2_saved_kg').eq('user_id', currentUser.id);
      if (!error && data?.length) logData = data;
    } catch {}
  }

  if (!logData.length) {
    logData = getLocalCarbonLog(currentUser.id);
  }

  const total = logData.reduce((sum, item) => sum + Number(item.co2_saved_kg || 0), 0);
  document.querySelector('#impactTotal').textContent      = total.toFixed(1);
  document.querySelector('#impactEquivalent').textContent = `${Math.round(total * 121.5).toLocaleString('en-IN')} smartphones`;
  document.querySelector('#impactStatus').innerHTML       = total
    ? `LIVE DATA FROM YOUR PURCHASE LOG <b>✦</b>`
    : `MAKE YOUR FIRST BETTER CHOICE <b>✦</b>`;
}

// ─── Personal Dashboard Modal ───────────────────────────────────────────────
const dashModal = document.querySelector('#dashboardModal');

document.querySelector('#profileInitials').addEventListener('click', () => {
  if (!currentUser) return;
  openDashboardModal();
});
document.querySelector('.dashboard-close')?.addEventListener('click', () => dashModal.close());

const BADGES = [
  { id: 'first_purchase',  icon: '🌱', label: 'First Purchase',    check: (log) => log.length >= 1 },
  { id: 'carbon_saver',    icon: '♻️', label: 'Carbon Saver',      check: (log) => log.reduce((s,i) => s + Number(i.co2_saved_kg || 0), 0) >= 5 },
  { id: 'plastic_free',    icon: '🚫', label: 'Plastic-Free Pick', check: (log) => log.some(i => (i.packaging_choice || '').toLowerCase().includes('minimal')) },
  { id: 'triple_shopper',  icon: '🛒', label: 'Triple Shopper',    check: (log) => log.length >= 3 },
  { id: 'carbon_champion', icon: '🏆', label: 'Carbon Champion',   check: (log) => log.reduce((s,i) => s + Number(i.co2_saved_kg || 0), 0) >= 10 },
];

function computeEcoScore(log, purchasedProductIds) {
  if (!log.length) return 0;
  const gradeMap = {};
  purchasedProductIds.forEach(id => {
    const p = products.find(p => p.id === id);
    if (p) gradeMap[id] = gradeValue(p.grade);
  });
  const avgGrade   = Object.values(gradeMap).length ? Object.values(gradeMap).reduce((s,v) => s+v, 0) / Object.values(gradeMap).length : 3;
  const totalCO2   = log.reduce((s,i) => s + Number(i.co2_saved_kg || 0), 0);
  return Math.round(Math.min(totalCO2 * 4, 40) + (avgGrade / 6) * 40 + Math.min(log.length * 3, 20));
}

function ecoScoreLabel(score) {
  if (score >= 80) return { label: 'Carbon Champion 🏆', desc: 'You are in the top tier of eco shoppers.' };
  if (score >= 60) return { label: 'Eco Leader 🌿',      desc: 'Your impact is making a real difference.' };
  if (score >= 40) return { label: 'Green Shopper 🛒',   desc: 'Building great sustainable habits.' };
  if (score >= 20) return { label: 'Getting Started 🌱', desc: 'Every eco swap counts. Keep going!' };
  return { label: 'New Member', desc: 'Make your first purchase to earn your score.' };
}

async function openDashboardModal() {
  dashModal.showModal();
  document.querySelector('#dashEcoScore').textContent   = '…';
  document.querySelector('#dashScoreLabel').textContent = 'Loading…';
  document.querySelector('#dashCO2Total').textContent   = '…';
  document.querySelector('#dashHistoryList').innerHTML  = '<li class="dash-history-empty">Loading…</li>';
  document.querySelector('#dashBadges').innerHTML       = '';

  let safeLog = [];
  if (supabaseClient) {
    try {
      const { data: log, error } = await supabaseClient.from('carbon_log')
        .select('co2_saved_kg, packaging_choice, created_at, product_id')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (!error && log?.length) safeLog = log;
    } catch {}
  }

  if (!safeLog.length) {
    safeLog = getLocalCarbonLog(currentUser.id).reverse();
  }

  const totalCO2 = safeLog.reduce((s, i) => s + Number(i.co2_saved_kg || 0), 0);
  document.querySelector('#dashCO2Total').textContent = totalCO2.toFixed(1);
  document.querySelector('#dashCO2Equiv').textContent = Math.round(totalCO2 * 121.5).toLocaleString('en-IN');

  const catTotals = { Home: 0, Beauty: 0, Food: 0 };
  safeLog.forEach(row => {
    const prod = products.find(p => p.id === row.product_id);
    if (prod?.category) catTotals[prod.category] = (catTotals[prod.category] || 0) + Number(row.co2_saved_kg || 0);
  });
  const maxCat = Math.max(...Object.values(catTotals), 0.01);
  document.querySelector('#dashCategoryBars').innerHTML = Object.entries(catTotals).map(([cat, val]) => `
    <div class="dash-cat-row">
      <span class="dash-cat-name">${cat}</span>
      <div class="dash-cat-bar-wrap"><div class="dash-cat-bar" style="width:${Math.round((val/maxCat)*100)}%"></div></div>
      <span class="dash-cat-val">${val.toFixed(1)}kg</span>
    </div>`).join('');

  const productIds    = [...new Set(safeLog.map(r => r.product_id).filter(Boolean))];
  const score         = computeEcoScore(safeLog, productIds);
  const { label, desc } = ecoScoreLabel(score);
  document.querySelector('#dashEcoScore').textContent   = score;
  document.querySelector('#dashScoreLabel').textContent = label;
  document.querySelector('#dashScoreDesc').textContent  = desc;

  const earned = BADGES.filter(b => b.check(safeLog));
  const locked = BADGES.filter(b => !b.check(safeLog));
  document.querySelector('#dashBadges').innerHTML =
    earned.map(b => `<div class="dash-badge earned"><span>${b.icon}</span><small>${b.label}</small></div>`).join('') +
    locked.map(b => `<div class="dash-badge locked"><span>🔒</span><small>${b.label}</small></div>`).join('');

  document.querySelector('#dashHistoryList').innerHTML = !safeLog.length
    ? '<li class="dash-history-empty">No purchases yet. Buy your first eco product above!</li>'
    : safeLog.slice(0, 6).map(row => {
        const prod = products.find(p => p.id === row.product_id);
        const date = new Date(row.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return `<li class="dash-history-item">
          <span class="dash-history-icon">${prod?.icon || '✦'}</span>
          <div class="dash-history-info"><strong>${prod?.name || 'Eco product'}</strong><small>${date} · ${row.packaging_choice || 'Standard packaging'}</small></div>
          <span class="dash-history-co2">↓${Number(row.co2_saved_kg || 0).toFixed(1)}kg CO₂</span>
        </li>`;
      }).join('');
}

// ─── Group Buying ───────────────────────────────────────────────────────────
const DEFAULT_GROUP_BUYS = [
  { id: 'gb-1', title: 'Refill together: Refillable Hand Wash', target_members: 50, discount_percent: 18, base_count: 34, product: { name: 'Refillable Hand Wash', icon: '◒', accent_color: '#d6bd91', eco_grade: 'A' } },
  { id: 'gb-2', title: 'Plastic-free coffee circle', target_members: 25, discount_percent: 12, base_count: 18, product: { name: 'Compostable Coffee Pods', icon: '◉', accent_color: '#ccad72', eco_grade: 'A' } },
  { id: 'gb-3', title: 'Organic Towel Collective', target_members: 30, discount_percent: 15, base_count: 22, product: { name: 'Cloud Cotton Towels', icon: '▧', accent_color: '#adcfa1', eco_grade: 'A' } }
];

const groupbuysGrid = document.querySelector('#groupbuysGrid');
let groupBuysSubscription = null;

async function loadGroupBuys() {
  let list = DEFAULT_GROUP_BUYS;
  let totalMembers = 0;

  // Signed-in users read live data; guests keep the usable demo fallback.
  if (supabaseClient && currentUser && !String(currentUser.id || '').startsWith('demo-')) {
    try {
      const { data, error } = await supabaseClient
        .from('group_buys')
        .select('id,title,target_members,discount_percent,products(name,icon,accent_color,eco_grade),group_buy_members(count)')
        .eq('is_active', true)
        .order('created_at');
      if (!error && data?.length) {
        list = data.map(groupBuy => ({
          ...groupBuy,
          base_count: groupBuy.group_buy_members?.[0]?.count || 0,
          product: groupBuy.products || {}
        }));
      }
    } catch {}
  }

  groupbuysGrid.innerHTML = list.map((gb) => {
    const localJoined = currentUser ? getLocalGroupMembers(gb.id).includes(currentUser.id) : false;
    const count   = (gb.base_count || 10) + (localJoined ? 1 : 0);
    totalMembers += count;
    const target  = gb.target_members || 20;
    const pct     = Math.min(Math.round((count / target) * 100), 100);
    const prod    = gb.product || {};
    const discount= gb.discount_percent ? `${gb.discount_percent}% off when full` : 'Discount when full';

    return `<div class="groupbuy-card" data-gb-id="${gb.id}">
      <div class="groupbuy-visual" style="background:${prod.accent_color || '#d3e8c6'}">${prod.icon || '✦'}</div>
      <div class="groupbuy-info">
        <small class="eyebrow" style="margin-bottom:6px"><span></span>${prod.eco_grade ? `GRADE ${prod.eco_grade} · ` : ''}BUYING CIRCLE</small>
        <h3>${prod.name || gb.title}</h3>
        <p class="groupbuy-discount">${discount}</p>
        <div class="groupbuy-progress-wrap">
          <div class="groupbuy-progress-bar"><div class="groupbuy-progress-fill" style="width:${pct}%"></div></div>
          <span class="groupbuy-count">${count} / ${target} members</span>
        </div>
        <button class="button primary groupbuy-join" data-gb-id="${gb.id}" data-gb-name="${prod.name || 'this product'}" ${localJoined ? 'disabled' : ''}>
          ${localJoined ? 'Joined! <b>✓</b>' : 'Join this circle <b>↗</b>'}
        </button>
      </div>
    </div>`;
  }).join('');

  const totalEl = document.querySelector('#groupTotalMembers');
  if (totalEl) totalEl.textContent = totalMembers || '—';
}

function subscribeToGroupBuyUpdates() {
  if (!supabaseClient || !currentUser || String(currentUser.id || '').startsWith('demo-') || groupBuysSubscription) return;
  groupBuysSubscription = supabaseClient
    .channel('ecocart-group-buy-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_buy_members' }, loadGroupBuys)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_buys' }, loadGroupBuys)
    .subscribe();
}

// Show the available circles before sign-in; authentication is required only
// when someone clicks Join.
loadGroupBuys();

groupbuysGrid?.addEventListener('click', async event => {
  const btn = event.target.closest('.groupbuy-join');
  if (!btn || !currentUser) return;
  btn.disabled = true;
  btn.textContent = 'Joining…';
  const gbId   = btn.dataset.gbId;
  const gbName = btn.dataset.gbName;

  const joinedList = getLocalGroupMembers(gbId);
  if (joinedList.includes(currentUser.id)) {
    showToast(`You're already in the ${gbName} circle ✦`);
    btn.innerHTML = 'Already joined <b>✓</b>';
    return;
  }

  addLocalGroupMember(gbId, currentUser.id);
  if (supabaseClient) {
    try { await supabaseClient.from('group_buy_members').insert({ group_buy_id: gbId, user_id: currentUser.id }); } catch {}
  }

  showToast(`You've joined the ${gbName} buying circle!`);
  btn.innerHTML = 'Joined! <b>✓</b>';
  loadGroupBuys();
});

// ─── Floating AI EcoAdvisor Chat ───────────────────────────────────────────
const ecochatToggle   = document.querySelector('#ecochatToggle');
const ecochatDrawer   = document.querySelector('#ecochatDrawer');
const ecochatClose    = document.querySelector('#ecochatClose');
const ecochatForm     = document.querySelector('#ecochatForm');
const ecochatInput    = document.querySelector('#ecochatInput');
const ecochatMessages = document.querySelector('#ecochatMessages');

let chatHistory = [];

ecochatToggle?.addEventListener('click', () => {
  const isHidden = ecochatDrawer.hasAttribute('hidden');
  if (isHidden) {
    ecochatDrawer.removeAttribute('hidden');
    ecochatInput.focus();
  } else {
    ecochatDrawer.setAttribute('hidden', '');
  }
});

ecochatClose?.addEventListener('click', () => {
  ecochatDrawer.setAttribute('hidden', '');
});

document.querySelectorAll('.chat-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    ecochatInput.value = chip.dataset.query;
    ecochatForm.dispatchEvent(new Event('submit'));
  });
});

ecochatForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = ecochatInput.value.trim();
  if (!query) return;

  appendChatMessage('user', query);
  ecochatInput.value = '';
  chatHistory.push({ role: 'user', content: query });

  const placeholderId = 'ai-loading-' + Date.now();
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chat-msg ai-msg';
  loadingDiv.id = placeholderId;
  loadingDiv.innerHTML = `<span>🌿</span><div class="msg-bubble"><span class="button-spinner" style="border-top-color:var(--green);border-color:#d0ddd0"></span> EcoAdvisor is thinking…</div>`;
  ecochatMessages.appendChild(loadingDiv);
  ecochatMessages.scrollTop = ecochatMessages.scrollHeight;

  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query, history: chatHistory })
    });

    const data = await res.json();
    loadingDiv.remove();

    if (data.reply) {
      appendChatMessage('ai', data.reply);
      chatHistory.push({ role: 'assistant', content: data.reply });
    } else {
      appendChatMessage('ai', 'I am currently having trouble reaching my AI engine. Please check that FastAPI backend is running on port 8000.');
    }
  } catch (err) {
    loadingDiv.remove();
    appendChatMessage('ai', '🌿 **Eco Tip**: Choosing plastic-free packaging and concentrated refill products helps save up to 2.8kg of CO₂ per household swap!');
  }
});

function appendChatMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${role}-msg`;
  const icon = role === 'ai' ? '<span>🌿</span>' : '';
  msgDiv.innerHTML = `${icon}<div class="msg-bubble">${formatChatText(text)}</div>`;
  ecochatMessages.appendChild(msgDiv);
  ecochatMessages.scrollTop = ecochatMessages.scrollHeight;
}

function formatChatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
}

// ─── Toast helper ───────────────────────────────────────────────────────────
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.innerHTML = `${message} <span>✦</span>`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─── Misc ───────────────────────────────────────────────────────────────────
document.querySelector('#watchStory')?.addEventListener('click', () =>
  document.querySelector('#how').scrollIntoView({ behavior: 'smooth' })
);

// Initial check
checkBackendHealth();

// Restore a prior session only after all UI state and render functions have
// been initialized. Calling enterStore earlier aborts the script due to the
// temporal-dead-zone rules for later `let` and `const` declarations.
const savedUser = getSavedSession();
if (savedUser) {
  enterStore(savedUser);
} else if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) enterStore(session.user);
  }).catch(() => {});
}
