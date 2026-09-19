// Exercises frontend/app.js in jsdom with a mocked Supabase client: login, signup, session restore, demo mode.
const { JSDOM } = require('jsdom');
const fs = require('fs');

const path = require('path');
const FRONTEND = path.join(__dirname, '..', '..', 'frontend');
const html = fs.readFileSync(`${FRONTEND}/index.html`, 'utf8')
  .replace(/<script src="https:\/\/cdn[^>]*><\/script>/, '')
  .replace('<script src="app.js"></script>', '');
const appJs = fs.readFileSync(`${FRONTEND}/app.js`, 'utf8');

const REAL_USER = { id: '11111111-2222-3333-4444-555555555555', email: 'real@example.com', user_metadata: { full_name: 'Real Person' }, identities: [{}] };
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

// Any Supabase table/realtime call resolves to an empty result.
function chain() {
  const p = new Proxy(function () {}, {
    get(_, prop) { return prop === 'then' ? (res) => res({ data: [], error: null }) : () => p; },
    apply() { return p; },
  });
  return p;
}

function makeClient(auth) {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'auth') return auth;
      return () => chain();
    },
  });
}

async function boot({ auth, saved, noSupabase, url } = {}) {
  const dom = new JSDOM(html, { url: url || 'https://ecocart-delta.vercel.app/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.fetch = async () => ({ ok: true, json: async () => ({ gemini_configured: true, engine: 'test' }) });
  if (saved) w.localStorage.setItem('ecocart_auth_user', JSON.stringify(saved));
  const fullAuth = Object.assign({
    getSession: async () => ({ data: { session: null } }),
    signOut: async () => ({}),
  }, auth || {});
  if (!noSupabase) w.supabase = { createClient: () => makeClient(fullAuth) };
  w.eval(appJs + '\n;window.__api = API_BASE_URL;');
  await tick();
  return w;
}

const doc = (w) => w.document;
const submit = (w, id) => doc(w).querySelector(id).dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
const set = (w, id, v) => { doc(w).querySelector(id).value = v; };
const inStore = (w) => doc(w).querySelector('#authScreen').classList.contains('is-hidden');
const feedback = (w) => doc(w).querySelector('#authFeedback').textContent;

let failures = 0;
function check(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra ? '  [' + extra + ']' : ''}`);
  if (!cond) failures++;
}

async function fillLogin(w, email, pw) { set(w, '#loginIdentifier', email); set(w, '#loginPassword', pw); }
async function fillRegister(w) {
  set(w, '#registerName', 'Real Person'); set(w, '#registerEmail', 'real@example.com');
  set(w, '#registerPhone', '+91 98765 43210'); set(w, '#registerPassword', 'secret123');
}

(async () => {
  // 1. Wrong password must NOT get in
  let w = await boot({ auth: { signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Invalid login credentials', code: 'invalid_credentials' } }) } });
  w.document.querySelector('#authSwitch button').click();
  await fillLogin(w, 'anyone@example.com', 'wrong-pass'); submit(w, '#loginForm'); await tick();
  check('wrong password is rejected', !inStore(w));
  check('wrong password shows a clear error', feedback(w) === 'Incorrect email or password.', feedback(w));
  check('no fake session stored', w.localStorage.getItem('ecocart_auth_user') === null);

  // 2. Unconfirmed email message
  w = await boot({ auth: { signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Email not confirmed', code: 'email_not_confirmed' } }) } });
  w.document.querySelector('#authSwitch button').click();
  await fillLogin(w, 'a@example.com', 'secret123'); submit(w, '#loginForm'); await tick();
  check('unconfirmed email gets a helpful message', /confirm your email/i.test(feedback(w)) && !inStore(w), feedback(w));

  // 3. Correct login enters the store; real users are not persisted in localStorage
  w = await boot({ auth: { signInWithPassword: async () => ({ data: { user: REAL_USER, session: {} }, error: null }) } });
  w.document.querySelector('#authSwitch button').click();
  await fillLogin(w, 'real@example.com', 'secret123'); submit(w, '#loginForm'); await tick();
  check('correct login enters the store', inStore(w));
  check('real user is not written to localStorage', w.localStorage.getItem('ecocart_auth_user') === null);

  // 4. Non-email login is rejected client-side
  w = await boot({ auth: { signInWithPassword: async () => { throw new Error('must not be called'); } } });
  w.document.querySelector('#authSwitch button').click();
  await fillLogin(w, '+919876543210', 'secret123'); submit(w, '#loginForm'); await tick();
  check('phone-number login is refused with a clear message', !inStore(w) && /valid email/i.test(feedback(w)), feedback(w));

  // 5. Register: success with immediate session
  w = await boot({ auth: { signUp: async () => ({ data: { user: REAL_USER, session: {} }, error: null }) } });
  await fillRegister(w); submit(w, '#registerForm'); await tick();
  check('signup with session enters the store', inStore(w));

  // 6. Register: confirmation required (no session)
  w = await boot({ auth: { signUp: async () => ({ data: { user: REAL_USER, session: null }, error: null }) } });
  await fillRegister(w); submit(w, '#registerForm'); await tick();
  check('signup without session asks to confirm email and shows login', !inStore(w) && !w.document.querySelector('#loginForm').hidden && /check your email/i.test(feedback(w)), feedback(w));

  // 7. Register: existing email (Supabase returns a user with no identities)
  w = await boot({ auth: { signUp: async () => ({ data: { user: { ...REAL_USER, identities: [] }, session: null }, error: null }) } });
  await fillRegister(w); submit(w, '#registerForm'); await tick();
  check('duplicate email is reported', !inStore(w) && /already exists/i.test(feedback(w)), feedback(w));

  // 8. Register: API error is surfaced
  w = await boot({ auth: { signUp: async () => ({ data: {}, error: { message: 'Password should be at least 6 characters.' } }) } });
  await fillRegister(w); submit(w, '#registerForm'); await tick();
  check('signup API error is surfaced', !inStore(w) && /at least 6/i.test(feedback(w)), feedback(w));

  // 9. Network failure during login
  w = await boot({ auth: { signInWithPassword: async () => { throw new Error('network down'); } } });
  w.document.querySelector('#authSwitch button').click();
  await fillLogin(w, 'real@example.com', 'secret123'); submit(w, '#loginForm'); await tick();
  check('network failure shows a message and does not log in', !inStore(w) && /could not reach/i.test(feedback(w)), feedback(w));

  // 10. Stale fake session in localStorage is discarded
  w = await boot({ saved: { id: 'usr_attacker', email: 'x@y.z', user_metadata: {} } });
  check('stale non-demo session does not log in', !inStore(w));
  check('stale non-demo session is cleared', w.localStorage.getItem('ecocart_auth_user') === null);

  // 11. A genuine Supabase session is restored on reload
  w = await boot({ auth: { getSession: async () => ({ data: { session: { user: REAL_USER } } }) } });
  check('real Supabase session is restored on reload', inStore(w));

  // 12. Demo mode works and persists
  w = await boot();
  w.document.querySelector('#quickDemoBtn').click(); await tick();
  check('quick demo enters the store', inStore(w));
  check('demo user is persisted', /demo-user/.test(w.localStorage.getItem('ecocart_auth_user') || ''));
  w = await boot({ saved: { id: 'demo-user-aarav-sharma', email: 'aarav.sharma@ecocart.dev', user_metadata: { full_name: 'Aarav Sharma' } } });
  check('demo session is restored on reload', inStore(w));

  // 13. Supabase library failed to load
  w = await boot({ noSupabase: true });
  w.document.querySelector('#authSwitch button').click();
  await fillLogin(w, 'real@example.com', 'secret123'); submit(w, '#loginForm'); await tick();
  check('login is refused (not faked) when the account service is unavailable', !inStore(w) && /unavailable/i.test(feedback(w)), feedback(w));

  // 14. API base URL selection
  check('production build targets the deployed backend', w.__api === 'https://ecocart-backend-1h0l.onrender.com', w.__api);
  const local = await boot({ url: 'http://localhost:5500/' });
  check('localhost build targets the local backend', local.__api === 'http://localhost:8000', local.__api);

  console.log(failures === 0 ? '\nALL FRONTEND AUTH CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('TEST HARNESS ERROR', e); process.exit(2); });
