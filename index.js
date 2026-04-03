const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const path = require('path');
const NodeCache = require('node-cache');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CONFIG
const MONGO_URI = 'mongodb+srv://eboxdatabase_db_user:6CnyZPEV6rfQAFvj@cluster0.ngzp3fb.mongodb.net/?appName=Cluster0';
const DB_NAME = 'bitxtools';
const DAILY_LIMIT = 400;

// ADMINS — Nethindu: EBOX@n2009 | Jithula: Jithula123
const ADMINS = [
  { username: 'Nethindu', password: 'EBOX@n2009' },
  { username: 'Jithula',  password: 'Jithula123' }
];

// NODE CACHE
const cache = new NodeCache({ stdTTL: 0, checkperiod: 60 });
const TTL = { tools: 600, stats: 15, adminStats: 20 };

const START_TIME = Date.now();
let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('✅ MongoDB connected');
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ token: 1 });
  await db.collection('sessions').createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 });
  await db.collection('visits').createIndex({ date: 1 }, { unique: true });
  await db.collection('tasks').createIndex({ ip: 1, date: 1 });
}

function hashPass(p) { return crypto.createHash('sha256').update(p + 'bitx_salt_2025').digest('hex'); }
function genToken() { return crypto.randomBytes(32).toString('hex'); }
function getToday() { return new Date().toISOString().slice(0, 10); }
function getClientIP(req) { return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim(); }

async function getSessionUser(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim() || req.query._token || '';
  if (!token) return null;
  const session = await db.collection('sessions').findOne({ token });
  if (!session) return null;
  return db.collection('users').findOne({ _id: session.userId });
}

async function recordVisit() {
  const today = getToday();
  await db.collection('visits').updateOne({ date: today }, { $inc: { count: 1 } }, { upsert: true });
  cache.del('public_stats');
}

app.use(async (req, res, next) => {
  if (req.path === '/' || req.path === '/home.html') { try { await recordVisit(); } catch {} }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ── TOOLS LIST ROUTE (cached) ──
app.get('/api/tools/list', async (req, res) => {
  try {
    const cacheKey = 'tools_list';
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ok: true, tools: cached, cached: true });

    // delete require cache so admin changes to tools.js take effect
    delete require.cache[require.resolve('./public/tools.js')];
    const { TOOLS } = require('./public/tools.js');

    const disabledDocs = await db.collection('tool_settings').find({ enabled: false }).toArray();
    const disabledSet = new Set(disabledDocs.map(d => d.toolId));

    const tools = TOOLS.map(t => ({ ...t, enabled: !disabledSet.has(t.id) }));
    cache.set(cacheKey, tools, TTL.tools);
    res.json({ ok: true, tools, cached: false });
  } catch (e) {
    console.error('/api/tools/list error:', e);
    res.json({ ok: false, error: e.message, tools: [] });
  }
});

function bustToolsCache() { cache.del('tools_list'); }

// ── AUTH ──
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.json({ ok: false, error: 'All fields required' });
    if (password.length < 6) return res.json({ ok: false, error: 'Password must be 6+ characters' });
    const existing = await db.collection('users').findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existing) return res.json({ ok: false, error: 'Username or email already taken' });
    const user = { username: username.toLowerCase(), displayName: username, email: email.toLowerCase(), password: hashPass(password), role: 'user', status: 'active', createdAt: new Date(), lastSeen: new Date() };
    const result = await db.collection('users').insertOne(user);
    const token = genToken();
    await db.collection('sessions').insertOne({ token, userId: result.insertedId, createdAt: new Date() });
    res.json({ ok: true, token, user: { id: result.insertedId, username: user.username, displayName: user.displayName, email: user.email, role: user.role } });
  } catch (e) { console.error(e); res.json({ ok: false, error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ ok: false, error: 'Fields required' });
    const user = await db.collection('users').findOne({ $or: [{ email: username.toLowerCase() }, { username: username.toLowerCase() }] });
    if (!user || user.password !== hashPass(password)) return res.json({ ok: false, error: 'Invalid credentials' });
    if (user.status === 'blocked') return res.json({ ok: false, error: 'Account blocked. Contact support.' });
    const token = genToken();
    await db.collection('sessions').insertOne({ token, userId: user._id, createdAt: new Date() });
    await db.collection('users').updateOne({ _id: user._id }, { $set: { lastSeen: new Date() } });
    res.json({ ok: true, token, user: { id: user._id, username: user.username, displayName: user.displayName, email: user.email, role: user.role } });
  } catch (e) { console.error(e); res.json({ ok: false, error: 'Login failed' }); }
});

app.post('/api/auth/logout', async (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (token) await db.collection('sessions').deleteOne({ token });
  res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.json({ ok: false });
  res.json({ ok: true, user: { id: user._id, username: user.username, displayName: user.displayName, email: user.email, role: user.role } });
});

// ── TASKS ──
app.post('/api/tasks/use', async (req, res) => {
  try {
    const ip = getClientIP(req); const today = getToday(); const user = await getSessionUser(req);
    if (user && user.status !== 'blocked') return res.json({ ok: true, unlimited: true });
    const rec = await db.collection('tasks').findOne({ ip, date: today });
    const used = rec ? rec.count : 0;
    if (used >= DAILY_LIMIT) return res.json({ ok: false, limited: true, used, limit: DAILY_LIMIT });
    await db.collection('tasks').updateOne({ ip, date: today }, { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    res.json({ ok: true, used: used + 1, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - used - 1 });
  } catch (e) { res.json({ ok: true }); }
});

app.get('/api/tasks/status', async (req, res) => {
  const ip = getClientIP(req); const today = getToday(); const user = await getSessionUser(req);
  if (user) return res.json({ ok: true, unlimited: true });
  const rec = await db.collection('tasks').findOne({ ip, date: today });
  const used = rec ? rec.count : 0;
  res.json({ ok: true, used, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used) });
});

// ── STATS (cached) ──
app.get('/api/stats', async (req, res) => {
  try {
    const cacheKey = 'public_stats';
    const cached = cache.get(cacheKey);
    const uptimeMs = Date.now() - START_TIME;
    const s = Math.floor(uptimeMs/1000);
    const uptime = `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    if (cached) return res.json({ ...cached, uptime, cached: true });

    const today = getToday();
    const todayVisits = await db.collection('visits').findOne({ date: today });
    const totalUsers = await db.collection('users').countDocuments();
    const visitAgg = await db.collection('visits').aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }]).toArray();
    const totalVisits = visitAgg[0]?.total || 0;
    const data = { ok: true, todayVisits: todayVisits?.count || 0, totalVisits, totalUsers };
    cache.set(cacheKey, data, TTL.stats);
    res.json({ ...data, uptime, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── ADMIN ──
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const matchedAdmin = ADMINS.find(a => a.username === username && a.password === password);
  if (matchedAdmin) {
    const token = genToken();
    await db.collection('sessions').insertOne({ token, admin: true, username: matchedAdmin.username, createdAt: new Date() });
    return res.json({ ok: true, token, username: matchedAdmin.username, message: `Welcome, ${matchedAdmin.username}!` });
  }
  res.json({ ok: false, error: 'Invalid admin credentials' });
});

async function adminOnly(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  const session = await db.collection('sessions').findOne({ token, admin: true });
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  req.adminUsername = session.username;
  next();
}

app.get('/api/admin/users', adminOnly, async (req, res) => {
  const users = await db.collection('users').find({}, { projection: { password: 0 } }).sort({ createdAt: -1 }).toArray();
  res.json({ ok: true, users });
});

app.post('/api/admin/users/:id/block', adminOnly, async (req, res) => {
  const { status } = req.body;
  await db.collection('users').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status } });
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', adminOnly, async (req, res) => {
  await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
});

app.post('/api/admin/emergency-reset', adminOnly, async (req, res) => {
  try {
    await db.collection('sessions').deleteMany({});
    await db.collection('tasks').deleteMany({ date: getToday() });
    cache.flushAll();
    res.json({ ok: true, message: 'All sessions cleared and daily task counts reset.' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/admin/tools', adminOnly, async (req, res) => {
  try {
    delete require.cache[require.resolve('./public/tools.js')];
    const { TOOLS } = require('./public/tools.js');
    const settings = await db.collection('tool_settings').find({}).toArray();
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.toolId] = s; });
    const tools = TOOLS.map(t => ({
      toolId: t.id, name: t.name, cat: t.cat, icon: t.icon, fab: t.fab, color: t.color, link: t.link,
      enabled: settingsMap[t.id] ? settingsMap[t.id].enabled !== false : true
    }));
    res.json({ ok: true, tools });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/admin/tools/:toolId', adminOnly, async (req, res) => {
  const { enabled } = req.body;
  await db.collection('tool_settings').updateOne(
    { toolId: req.params.toolId },
    { $set: { toolId: req.params.toolId, enabled: !!enabled } },
    { upsert: true }
  );
  bustToolsCache();
  res.json({ ok: true });
});

app.get('/api/tools/settings', async (req, res) => {
  try {
    const tools = await db.collection('tool_settings').find({ enabled: false }).toArray();
    res.json({ ok: true, disabled: tools.map(t => t.toolId) });
  } catch (e) { res.json({ ok: true, disabled: [] }); }
});

app.get('/api/admin/stats', adminOnly, async (req, res) => {
  try {
    const cacheKey = 'admin_stats';
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
    const today = getToday();
    const totalUsers = await db.collection('users').countDocuments();
    const activeUsers = await db.collection('users').countDocuments({ status: 'active' });
    const blockedUsers = await db.collection('users').countDocuments({ status: 'blocked' });
    const todayVisit = await db.collection('visits').findOne({ date: today });
    const visitAgg = await db.collection('visits').aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }]).toArray();
    const totalVisits = visitAgg[0]?.total || 0;
    const todayTasks = await db.collection('tasks').aggregate([{ $match: { date: today } }, { $group: { _id: null, total: { $sum: '$count' } } }]).toArray();
    const uptimeMs = Date.now() - START_TIME;
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const v = await db.collection('visits').findOne({ date: ds });
      last7.push({ date: ds, count: v?.count || 0 });
    }
    const data = { ok: true, totalUsers, activeUsers, blockedUsers, todayVisits: todayVisit?.count || 0, totalVisits, todayTasks: todayTasks[0]?.total || 0, uptimeMs, last7 };
    cache.set(cacheKey, data, TTL.adminStats);
    res.json({ ...data, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'admin.html')); });

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch(err => { console.error('DB connection failed:', err); process.exit(1); });

module.exports = app;
