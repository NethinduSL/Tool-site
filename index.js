const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const path = require('path');
const NodeCache = require('node-cache');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── CONFIG ────────────────────────────────────────────────────────────────────
const MONGO_URI = 'mongodb+srv://eboxdatabase_db_user:DIAuQx90bGgxK9KR@cluster0.x98xn7f.mongodb.net/?appName=Cluster0&retryWrites=true&w=majority';
const DB_NAME = 'bitxtools';
const DAILY_LIMIT = 400;
const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

const ADMINS = [
  { username: 'Nethindu', password: 'EBOX@n2009' },
  { username: 'Jithula',  password: 'Jithula123' }
];

// ── CACHE SETUP ───────────────────────────────────────────────────────────────
const cache = new NodeCache({ stdTTL: 0, checkperiod: 30 });
const dirtyKeys = new Set(); // tracks what has changed but not yet flushed to DB

const TTL = { tools: 120, stats: 120, adminStats: 120 };
const START_TIME = Date.now();
let db = null;
let mongoClient = null;

// ── DB CONNECT ────────────────────────────────────────────────────────────────
async function connectDB() {
  mongoClient = new MongoClient(MONGO_URI, {
    maxPoolSize: 10, minPoolSize: 2,
    serverSelectionTimeoutMS: 8000, connectTimeoutMS: 10000,
    socketTimeoutMS: 30000, heartbeatFrequencyMS: 10000,
  });
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  console.log('✅ MongoDB connected');

  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('users').createIndex({ username: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ token: 1 }),
    db.collection('sessions').createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 }),
    db.collection('visits').createIndex({ date: 1 }, { unique: true }),
    db.collection('tasks').createIndex({ ip: 1, date: 1 }),
  ]);

  await warmCache();
  setInterval(syncDirtyToDB, SYNC_INTERVAL_MS);
  console.log('🔄 Cache sync started — every 2 minutes');
}

function watchConnection() {
  if (!mongoClient) return;
  mongoClient.on('close', () => {
    console.warn('⚠️  MongoDB connection closed — reconnecting...');
    db = null;
    setTimeout(() => connectDB().catch(console.error), 3000);
  });
}

function requireDB(req, res, next) {
  if (!db) return res.status(503).json({ ok: false, error: 'Database not ready yet, please retry in a moment.' });
  next();
}

// ── CACHE WARM ────────────────────────────────────────────────────────────────
async function warmCache() {
  if (!db) return;
  try {
    const today = getToday();
    const [users, sessions, visits, tasks, toolSettings] = await Promise.all([
      db.collection('users').find({}, { projection: { password: 0 } }).toArray(),
      db.collection('sessions').find({}).toArray(),
      db.collection('visits').find({}).toArray(),
      db.collection('tasks').find({ date: today }).toArray(),
      db.collection('tool_settings').find({}).toArray(),
    ]);
    cache.set('db:users', users);
    cache.set('db:sessions', sessions);
    cache.set('db:visits', visits);
    cache.set('db:tasks:today', tasks);
    cache.set('db:tool_settings', toolSettings);
    cache.del('public_stats');
    cache.del('admin_stats');
    console.log('✅ Cache warmed —', users.length, 'users,', sessions.length, 'sessions,', visits.length, 'visit days');
  } catch (e) { console.error('Cache warm error:', e.message); }
}

// ── SYNC DIRTY KEYS → DB (every 2 minutes) ────────────────────────────────────
async function syncDirtyToDB() {
  if (!db || dirtyKeys.size === 0) return;
  const keys = [...dirtyKeys];
  dirtyKeys.clear();
  console.log('🔄 Syncing to DB:', keys);

  for (const key of keys) {
    try {
      if (key === 'db:tool_settings') {
        const settings = cache.get('db:tool_settings') || [];
        for (const s of settings) {
          await db.collection('tool_settings').updateOne(
            { toolId: s.toolId }, { $set: s }, { upsert: true }
          );
        }
      }
      if (key === 'db:visits') {
        const visits = cache.get('db:visits') || [];
        for (const v of visits) {
          await db.collection('visits').updateOne(
            { date: v.date }, { $set: { count: v.count } }, { upsert: true }
          );
        }
      }
      if (key === 'db:tasks:today') {
        const tasks = cache.get('db:tasks:today') || [];
        const today = getToday();
        for (const t of tasks) {
          await db.collection('tasks').updateOne(
            { ip: t.ip, date: today },
            { $set: { count: t.count, createdAt: t.createdAt || new Date() } },
            { upsert: true }
          );
        }
      }
    } catch (e) {
      console.error('Sync error for [' + key + ']:', e.message);
      dirtyKeys.add(key); // re-queue on failure
    }
  }

  // Re-fetch from DB after sync to keep cache fresh
  await warmCache();
}

function markDirty(key) { dirtyKeys.add(key); }

// ── HELPERS ───────────────────────────────────────────────────────────────────
function hashPass(p) { return crypto.createHash('sha256').update(p + 'bitx_salt_2025').digest('hex'); }
function genToken() { return crypto.randomBytes(32).toString('hex'); }
function getToday() { return new Date().toISOString().slice(0, 10); }
function getClientIP(req) {
  return (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '').split(',')[0].trim();
}

async function getSessionUser(req) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim() || req.query._token || '';
  if (!token) return null;
  const sessions = cache.get('db:sessions') || [];
  const session = sessions.find(s => s.token === token && !s.admin);
  if (!session) return null;
  const users = cache.get('db:users') || [];
  return users.find(u => String(u._id) === String(session.userId)) || null;
}

function recordVisit() {
  const today = getToday();
  const visits = cache.get('db:visits') || [];
  const idx = visits.findIndex(v => v.date === today);
  if (idx >= 0) visits[idx].count = (visits[idx].count || 0) + 1;
  else visits.push({ date: today, count: 1 });
  cache.set('db:visits', visits);
  markDirty('db:visits');
  cache.del('public_stats');
  cache.del('admin_stats');
}

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') { try { recordVisit(); } catch {} }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/index.html', (req, res) => res.redirect(301, '/'));

// ── TOOLS ─────────────────────────────────────────────────────────────────────
function loadToolsModule() {
  const toolsPath = path.join(__dirname, 'public', 'tools.js');
  delete require.cache[toolsPath];
  return require(toolsPath).TOOLS;
}

app.get('/api/tools/list', (req, res) => {
  try {
    const cached = cache.get('tools_list');
    if (cached) return res.json({ ok: true, tools: cached, cached: true });
    const TOOLS = loadToolsModule();
    const toolSettings = cache.get('db:tool_settings') || [];
    const disabledSet = new Set(toolSettings.filter(s => s.enabled === false).map(s => s.toolId));
    const tools = TOOLS.map(t => ({ ...t, enabled: !disabledSet.has(t.id) }));
    cache.set('tools_list', tools, TTL.tools);
    res.json({ ok: true, tools, cached: false });
  } catch (e) {
    try {
      const TOOLS = loadToolsModule();
      res.json({ ok: true, tools: TOOLS.map(t => ({ ...t, enabled: true })), cached: false });
    } catch (e2) { res.json({ ok: false, error: e2.message, tools: [] }); }
  }
});

function bustToolsCache() { cache.del('tools_list'); }

app.get('/api/tools/settings', (req, res) => {
  const toolSettings = cache.get('db:tool_settings') || [];
  res.json({ ok: true, disabled: toolSettings.filter(s => s.enabled === false).map(s => s.toolId) });
});

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', requireDB, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.json({ ok: false, error: 'All fields required' });
    if (password.length < 6) return res.json({ ok: false, error: 'Password must be 6+ characters' });

    const usersCache = cache.get('db:users') || [];
    if (usersCache.find(u => u.email === email.toLowerCase() || u.username === username.toLowerCase()))
      return res.json({ ok: false, error: 'Username or email already taken' });

    const user = {
      username: username.toLowerCase(), displayName: username,
      email: email.toLowerCase(), password: hashPass(password),
      role: 'user', status: 'active', createdAt: new Date(), lastSeen: new Date()
    };
    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;

    // Update users cache (without password)
    const { password: _, ...safeUser } = user;
    usersCache.push(safeUser);
    cache.set('db:users', usersCache);

    const token = genToken();
    await db.collection('sessions').insertOne({ token, userId: result.insertedId, createdAt: new Date() });
    const sessions = cache.get('db:sessions') || [];
    sessions.push({ token, userId: result.insertedId, createdAt: new Date() });
    cache.set('db:sessions', sessions);

    res.json({ ok: true, token, user: { id: result.insertedId, username: user.username, displayName: user.displayName, email: user.email, role: user.role } });
  } catch (e) { console.error(e); res.json({ ok: false, error: 'Registration failed' }); }
});

app.post('/api/auth/login', requireDB, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ ok: false, error: 'Fields required' });

    // Always verify password directly against DB for security
    const dbUser = await db.collection('users').findOne({
      $or: [{ email: username.toLowerCase() }, { username: username.toLowerCase() }]
    });
    if (!dbUser || dbUser.password !== hashPass(password)) return res.json({ ok: false, error: 'Invalid credentials' });
    if (dbUser.status === 'blocked') return res.json({ ok: false, error: 'Account blocked. Contact support.' });

    const token = genToken();
    await db.collection('sessions').insertOne({ token, userId: dbUser._id, createdAt: new Date() });

    const sessions = cache.get('db:sessions') || [];
    sessions.push({ token, userId: dbUser._id, createdAt: new Date() });
    cache.set('db:sessions', sessions);

    await db.collection('users').updateOne({ _id: dbUser._id }, { $set: { lastSeen: new Date() } });
    const usersCache = cache.get('db:users') || [];
    const idx = usersCache.findIndex(u => String(u._id) === String(dbUser._id));
    if (idx >= 0) usersCache[idx].lastSeen = new Date();
    cache.set('db:users', usersCache);

    res.json({ ok: true, token, user: { id: dbUser._id, username: dbUser.username, displayName: dbUser.displayName, email: dbUser.email, role: dbUser.role } });
  } catch (e) { console.error(e); res.json({ ok: false, error: 'Login failed' }); }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
    if (token) {
      const sessions = (cache.get('db:sessions') || []).filter(s => s.token !== token);
      cache.set('db:sessions', sessions);
      if (db) await db.collection('sessions').deleteOne({ token });
    }
  } catch {}
  res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.json({ ok: false });
  res.json({ ok: true, user: { id: user._id, username: user.username, displayName: user.displayName, email: user.email, role: user.role } });
});

// ── TASKS / RATE LIMIT ────────────────────────────────────────────────────────
app.post('/api/tasks/use', async (req, res) => {
  try {
    const ip = getClientIP(req); const today = getToday();
    const user = await getSessionUser(req);
    if (user && user.status !== 'blocked') return res.json({ ok: true, unlimited: true });

    const tasks = cache.get('db:tasks:today') || [];
    const rec = tasks.find(t => t.ip === ip && t.date === today);
    const used = rec ? rec.count : 0;
    if (used >= DAILY_LIMIT) return res.json({ ok: false, limited: true, used, limit: DAILY_LIMIT });

    if (rec) rec.count = used + 1;
    else tasks.push({ ip, date: today, count: 1, createdAt: new Date() });
    cache.set('db:tasks:today', tasks);
    markDirty('db:tasks:today');

    res.json({ ok: true, used: used + 1, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - used - 1 });
  } catch { res.json({ ok: true }); }
});

app.get('/api/tasks/status', async (req, res) => {
  const ip = getClientIP(req); const today = getToday();
  const user = await getSessionUser(req);
  if (user) return res.json({ ok: true, unlimited: true });
  const tasks = cache.get('db:tasks:today') || [];
  const rec = tasks.find(t => t.ip === ip && t.date === today);
  const used = rec ? rec.count : 0;
  res.json({ ok: true, used, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used) });
});

// ── PUBLIC STATS ──────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  try {
    const s = Math.floor((Date.now() - START_TIME) / 1000);
    const uptime = `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

    const cached = cache.get('public_stats');
    if (cached) return res.json({ ...cached, uptime, cached: true });

    const visits = cache.get('db:visits') || [];
    const users  = cache.get('db:users')  || [];
    const today  = getToday();
    const todayV = visits.find(v => v.date === today);
    const total  = visits.reduce((s, v) => s + (v.count || 0), 0);

    const data = { ok: true, todayVisits: todayV?.count || 0, totalVisits: total, totalUsers: users.length };
    cache.set('public_stats', data, TTL.stats);
    res.json({ ...data, uptime, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── ADMIN LOGIN ───────────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const match = ADMINS.find(a => a.username === username && a.password === password);
  if (!match) return res.json({ ok: false, error: 'Invalid admin credentials' });

  const token = genToken();
  cache.set(`admin_token:${token}`, match.username, 3600);

  if (db) {
    await db.collection('sessions').insertOne({ token, admin: true, username: match.username, createdAt: new Date() });
    const sessions = cache.get('db:sessions') || [];
    sessions.push({ token, admin: true, username: match.username, createdAt: new Date() });
    cache.set('db:sessions', sessions);
  }

  res.json({ ok: true, token, username: match.username, message: `Welcome, ${match.username}!` });
});

async function adminOnly(req, res, next) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const cachedAdmin = cache.get(`admin_token:${token}`);
  if (cachedAdmin) { req.adminUsername = cachedAdmin; return next(); }

  const sessions = cache.get('db:sessions') || [];
  const session = sessions.find(s => s.token === token && s.admin === true);
  if (session) { req.adminUsername = session.username; return next(); }

  if (!db) return res.status(503).json({ ok: false, error: 'Database not ready' });
  const dbSession = await db.collection('sessions').findOne({ token, admin: true });
  if (!dbSession) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  req.adminUsername = dbSession.username;
  next();
}

app.get('/api/admin/users', adminOnly, (req, res) => {
  const users = (cache.get('db:users') || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, users });
});

app.post('/api/admin/users/:id/block', adminOnly, async (req, res) => {
  const { status } = req.body;
  const users = cache.get('db:users') || [];
  const idx = users.findIndex(u => String(u._id) === req.params.id);
  if (idx >= 0) users[idx].status = status;
  cache.set('db:users', users);
  if (db) await db.collection('users').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status } });
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', adminOnly, async (req, res) => {
  const users = (cache.get('db:users') || []).filter(u => String(u._id) !== req.params.id);
  cache.set('db:users', users);
  if (db) await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
});

app.post('/api/admin/emergency-reset', adminOnly, async (req, res) => {
  try {
    cache.set('db:sessions', []);
    cache.set('db:tasks:today', []);
    cache.del('public_stats');
    cache.del('admin_stats');
    dirtyKeys.clear();
    if (db) {
      await db.collection('sessions').deleteMany({});
      await db.collection('tasks').deleteMany({ date: getToday() });
    }
    res.json({ ok: true, message: 'All sessions cleared and daily task counts reset.' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/admin/tools', adminOnly, (req, res) => {
  try {
    const TOOLS = loadToolsModule();
    const toolSettings = cache.get('db:tool_settings') || [];
    const settingsMap = Object.fromEntries(toolSettings.map(s => [s.toolId, s]));
    const tools = TOOLS.map(t => ({
      toolId: t.id, name: t.name, cat: t.cat, icon: t.icon, fab: t.fab, color: t.color, link: t.link,
      enabled: settingsMap[t.id] ? settingsMap[t.id].enabled !== false : true
    }));
    res.json({ ok: true, tools });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/admin/tools/:toolId', adminOnly, (req, res) => {
  const { toolId } = req.params;
  const enabled = !!req.body.enabled;
  const toolSettings = cache.get('db:tool_settings') || [];
  const idx = toolSettings.findIndex(s => s.toolId === toolId);
  if (idx >= 0) toolSettings[idx].enabled = enabled;
  else toolSettings.push({ toolId, enabled });
  cache.set('db:tool_settings', toolSettings);
  markDirty('db:tool_settings');
  bustToolsCache();
  res.json({ ok: true });
});

// ── ADMIN STATS — pure cache, zero DB queries ─────────────────────────────────
app.get('/api/admin/stats', adminOnly, (req, res) => {
  try {
    const s = Math.floor((Date.now() - START_TIME) / 1000);
    const uptime = `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

    const cached = cache.get('admin_stats');
    if (cached) return res.json({ ...cached, uptime, cached: true });

    const users  = cache.get('db:users')       || [];
    const visits = cache.get('db:visits')      || [];
    const tasks  = cache.get('db:tasks:today') || [];
    const today  = getToday();

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const v = visits.find(x => x.date === date);
      last7.push({ date, count: v?.count || 0 });
    }

    const data = {
      ok: true,
      totalUsers:   users.length,
      activeUsers:  users.filter(u => u.status === 'active').length,
      blockedUsers: users.filter(u => u.status === 'blocked').length,
      todayVisits:  (visits.find(v => v.date === today))?.count || 0,
      totalVisits:  visits.reduce((s, v) => s + (v.count || 0), 0),
      todayTasks:   tasks.reduce((s, t) => s + (t.count || 0), 0),
      uptimeMs: Date.now() - START_TIME,
      last7
    };
    cache.set('admin_stats', data, TTL.adminStats);
    res.json({ ...data, uptime, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  watchConnection();
  app.listen(PORT, () => console.log('🚀 Server running on port', PORT));
}).catch(err => {
  console.error('❌ DB connection failed:', err.message);
  app.listen(PORT, () => console.log('⚠️  Server running WITHOUT DB on port', PORT));
});

module.exports = app;
