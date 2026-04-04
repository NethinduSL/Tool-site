const express   = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const crypto    = require('crypto');
const path      = require('path');
const NodeCache = require('node-cache');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const MONGO_URI   = 'mongodb+srv://eboxdatabase_db_user:DIAuQx90bGgxK9KR@cluster0.x98xn7f.mongodb.net/bitxtools?retryWrites=true&w=majority&appName=Cluster0';
const DAILY_LIMIT = 400;
const START_TIME  = Date.now();

const ADMINS = [
  { username: 'Nethindu', password: 'EBOX@n2009' },
  { username: 'Jithula',  password: 'Jithula123' }
];

const userCache       = new NodeCache({ stdTTL: 60,   checkperiod: 30,  useClones: false });
const taskCache       = new NodeCache({ stdTTL: 90,   checkperiod: 45,  useClones: false });
const statsCache      = new NodeCache({ stdTTL: 30,   checkperiod: 15,  useClones: false });
const adminCache      = new NodeCache({ stdTTL: 15,   checkperiod: 10,  useClones: false });
const toolsCache      = new NodeCache({ stdTTL: 120,  checkperiod: 60,  useClones: false });
const adminTokenCache = new NodeCache({ stdTTL: 3600, checkperiod: 300, useClones: false });

let client       = null;
let db           = null;
let connectPromise = null;

async function connectDB() {
  if (db) return db;
  if (connectPromise) { await connectPromise; return db; }

  connectPromise = (async () => {
    client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    await client.connect();
    db = client.db('bitxtools');
    await Promise.all([
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('users').createIndex({ username: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ token: 1 }),
      db.collection('sessions').createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 }),
      db.collection('visits').createIndex({ date: 1 }, { unique: true }),
      db.collection('tasks').createIndex({ ip: 1, date: 1 }),
      db.collection('tool_settings').createIndex({ toolId: 1 }, { unique: true }),
    ]);
    console.log('MongoDB connected');
  })();

  try {
    await connectPromise;
  } catch (err) {
    connectPromise = null;
    db = null;
    throw err;
  }
  return db;
}

async function requireDB(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ ok: false, error: 'Database unavailable. Please retry.' });
  }
}

function hashPass(p) { return crypto.createHash('sha256').update(p + 'bitx_salt_2025').digest('hex'); }
function genToken()  { return crypto.randomBytes(32).toString('hex'); }
function today()     { return new Date().toISOString().slice(0, 10); }
function getClientIP(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || 'unknown';
}

function invalidateUser(token)  { if (token) userCache.del(token); }
function invalidateAdminCache() { adminCache.flushAll(); }
function bustToolsCache()       { toolsCache.del('tools_list'); toolsCache.del('tools_settings'); }

function trackVisit() {
  const d = today();
  connectDB().then(db => {
    db.collection('visits').updateOne({ date: d }, { $inc: { count: 1 } }, { upsert: true }).catch(() => {});
  }).catch(() => {});
  statsCache.del('publicStats');
  statsCache.del('adminStats');
}

async function getSessionUser(req) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim()
             || req.query._token || '';
  if (!token) return null;

  let user = userCache.get(token);
  if (user) return user;

  try {
    const dbc = await connectDB();
    const session = await dbc.collection('sessions').findOne({ token, admin: { $ne: true } });
    if (!session) return null;

    user = await dbc.collection('users').findOne(
      { _id: new ObjectId(session.userId) },
      { projection: { password: 0 } }
    );
    if (!user) return null;

    userCache.set(token, user);
    return user;
  } catch {
    return null;
  }
}

app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') { try { trackVisit(); } catch {} }
  next();
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

function loadToolsModule() {
  const toolsPath = path.join(__dirname, 'public', 'tools.js');
  delete require.cache[toolsPath];
  return require(toolsPath).TOOLS;
}

app.get('/api/tools/list', requireDB, async (req, res) => {
  try {
    const cached = toolsCache.get('tools_list');
    if (cached) return res.json({ ok: true, tools: cached, cached: true });

    const TOOLS = loadToolsModule();
    const settings = await db.collection('tool_settings').find({}).toArray();
    const disabledSet = new Set(settings.filter(s => s.enabled === false).map(s => s.toolId));
    const tools = TOOLS.map(t => ({ ...t, enabled: !disabledSet.has(t.id) }));

    toolsCache.set('tools_list', tools);
    res.json({ ok: true, tools, cached: false });
  } catch (e) {
    try {
      const TOOLS = loadToolsModule();
      res.json({ ok: true, tools: TOOLS.map(t => ({ ...t, enabled: true })), cached: false });
    } catch (e2) { res.json({ ok: false, error: e2.message, tools: [] }); }
  }
});

app.get('/api/tools/settings', requireDB, async (req, res) => {
  try {
    const cached = toolsCache.get('tools_settings');
    if (cached) return res.json({ ok: true, disabled: cached, cached: true });

    const settings = await db.collection('tool_settings').find({ enabled: false }).toArray();
    const disabled = settings.map(s => s.toolId);

    toolsCache.set('tools_settings', disabled);
    res.json({ ok: true, disabled, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/auth/register', requireDB, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.json({ ok: false, error: 'All fields required' });
    if (password.length < 6) return res.json({ ok: false, error: 'Password must be 6+ characters' });

    const exists = await db.collection('users').findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });
    if (exists) return res.json({ ok: false, error: 'Username or email already taken' });

    const user = {
      username: username.toLowerCase(), displayName: username,
      email: email.toLowerCase(), password: hashPass(password),
      role: 'user', status: 'active', createdAt: new Date(), lastSeen: new Date()
    };
    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;
    invalidateAdminCache();

    const token = genToken();
    await db.collection('sessions').insertOne({ token, userId: result.insertedId, admin: false, createdAt: new Date() });

    res.json({
      ok: true, token,
      user: { id: result.insertedId, username: user.username, displayName: user.displayName, email: user.email, role: user.role }
    });
  } catch (e) { console.error(e); res.json({ ok: false, error: 'Registration failed' }); }
});

app.post('/api/auth/login', requireDB, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ ok: false, error: 'Fields required' });

    const dbUser = await db.collection('users').findOne({
      $or: [{ email: username.toLowerCase() }, { username: username.toLowerCase() }]
    });
    if (!dbUser || dbUser.password !== hashPass(password)) return res.json({ ok: false, error: 'Invalid credentials' });
    if (dbUser.status === 'blocked') return res.json({ ok: false, error: 'Account blocked. Contact support.' });

    const token = genToken();
    await db.collection('sessions').insertOne({ token, userId: dbUser._id, admin: false, createdAt: new Date() });

    db.collection('users').updateOne({ _id: dbUser._id }, { $set: { lastSeen: new Date() } }).catch(() => {});

    const safeUser = { ...dbUser };
    delete safeUser.password;
    userCache.set(token, safeUser);

    res.json({
      ok: true, token,
      user: { id: dbUser._id, username: dbUser.username, displayName: dbUser.displayName, email: dbUser.email, role: dbUser.role }
    });
  } catch (e) { console.error(e); res.json({ ok: false, error: 'Login failed' }); }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
    if (token) {
      invalidateUser(token);
      connectDB().then(dbc => dbc.collection('sessions').deleteOne({ token })).catch(() => {});
    }
  } catch {}
  res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.json({ ok: false });
  res.json({
    ok: true,
    user: { id: user._id, username: user.username, displayName: user.displayName, email: user.email, role: user.role }
  });
});

app.post('/api/tasks/use', async (req, res) => {
  // Unlimited mode — all users get unlimited access
  res.json({ ok: true, unlimited: true });
});

app.get('/api/tasks/status', async (req, res) => {
  // Unlimited mode — all users get unlimited access
  res.json({ ok: true, unlimited: true, used: 0, limit: 0, remaining: Infinity });
});

app.get('/api/stats', requireDB, async (req, res) => {
  try {
    const s = Math.floor((Date.now() - START_TIME) / 1000);
    const uptime = `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

    const cached = statsCache.get('publicStats');
    if (cached) return res.json({ ...cached, uptime, cached: true });

    const d = today();
    const [todayVisit, totalVisitsAgg, totalUsers] = await Promise.all([
      db.collection('visits').findOne({ date: d }),
      db.collection('visits').aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }]).toArray(),
      db.collection('users').countDocuments({})
    ]);

    const data = {
      ok: true,
      todayVisits:  todayVisit?.count || 0,
      totalVisits:  totalVisitsAgg[0]?.total || 0,
      totalUsers
    };
    statsCache.set('publicStats', data);
    res.json({ ...data, uptime, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const match = ADMINS.find(a => a.username === username && a.password === password);
  if (!match) return res.json({ ok: false, error: 'Invalid admin credentials' });

  const token = genToken();
  adminTokenCache.set(token, match.username);

  connectDB().then(dbc => {
    dbc.collection('sessions').insertOne({ token, admin: true, username: match.username, createdAt: new Date() }).catch(() => {});
  }).catch(() => {});

  res.json({ ok: true, token, username: match.username, message: `Welcome, ${match.username}!` });
});

async function adminOnly(req, res, next) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const cached = adminTokenCache.get(token);
  if (cached) { req.adminUsername = cached; return next(); }

  try {
    const dbc = await connectDB();
    const session = await dbc.collection('sessions').findOne({ token, admin: true });
    if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    adminTokenCache.set(token, session.username);
    req.adminUsername = session.username;
    next();
  } catch {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
}

app.get('/api/admin/users', adminOnly, async (req, res) => {
  try {
    const cacheKey = 'adminUsers';
    const cached = adminCache.get(cacheKey);
    if (cached) return res.json({ ok: true, users: cached, cached: true });

    const users = await db.collection('users').find({}, { projection: { password: 0 } }).sort({ createdAt: -1 }).toArray();
    adminCache.set(cacheKey, users);
    res.json({ ok: true, users, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/admin/users/:id/block', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    await db.collection('users').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status } });
    const sessions = await db.collection('sessions').find({ userId: new ObjectId(req.params.id) }).toArray();
    sessions.forEach(s => invalidateUser(s.token));
    invalidateAdminCache();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.delete('/api/admin/users/:id', adminOnly, async (req, res) => {
  try {
    const oid = new ObjectId(req.params.id);
    const sessions = await db.collection('sessions').find({ userId: oid }).toArray();
    sessions.forEach(s => invalidateUser(s.token));
    await db.collection('sessions').deleteMany({ userId: oid });
    await db.collection('users').deleteOne({ _id: oid });
    invalidateAdminCache();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/admin/emergency-reset', adminOnly, async (req, res) => {
  try {
    userCache.flushAll();
    taskCache.flushAll();
    statsCache.flushAll();
    adminCache.flushAll();
    await Promise.all([
      db.collection('sessions').deleteMany({ admin: { $ne: true } }),
      db.collection('tasks').deleteMany({ date: today() })
    ]);
    res.json({ ok: true, message: 'All sessions cleared and daily task counts reset.' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/admin/tools', adminOnly, async (req, res) => {
  try {
    const TOOLS = loadToolsModule();
    const settings = await db.collection('tool_settings').find({}).toArray();
    const settingsMap = Object.fromEntries(settings.map(s => [s.toolId, s]));
    const tools = TOOLS.map(t => ({
      toolId: t.id, name: t.name, cat: t.cat, icon: t.icon, fab: t.fab, color: t.color, link: t.link,
      enabled: settingsMap[t.id] ? settingsMap[t.id].enabled !== false : true
    }));
    res.json({ ok: true, tools });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/admin/tools/:toolId', adminOnly, async (req, res) => {
  try {
    const { toolId } = req.params;
    const enabled = !!req.body.enabled;
    await db.collection('tool_settings').updateOne({ toolId }, { $set: { toolId, enabled } }, { upsert: true });
    bustToolsCache();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/admin/stats', adminOnly, async (req, res) => {
  try {
    const s = Math.floor((Date.now() - START_TIME) / 1000);
    const uptime = `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

    const cacheKey = 'adminStats';
    const cached = adminCache.get(cacheKey);
    if (cached) return res.json({ ...cached, uptime, cached: true });

    const d = today();
    const last7Dates = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
      return dt.toISOString().slice(0, 10);
    });

    const [totalUsers, activeUsers, blockedUsers, visits, todayTasksAgg, totalVisitsAgg] = await Promise.all([
      db.collection('users').countDocuments({}),
      db.collection('users').countDocuments({ status: 'active' }),
      db.collection('users').countDocuments({ status: 'blocked' }),
      db.collection('visits').find({ date: { $in: last7Dates } }).toArray(),
      db.collection('tasks').aggregate([{ $match: { date: d } }, { $group: { _id: null, total: { $sum: '$count' } } }]).toArray(),
      db.collection('visits').aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }]).toArray()
    ]);

    const visitMap = Object.fromEntries(visits.map(v => [v.date, v.count]));
    const last7 = last7Dates.map(date => ({ date, count: visitMap[date] || 0 }));

    const data = {
      ok: true,
      totalUsers, activeUsers, blockedUsers,
      todayVisits:  visitMap[d] || 0,
      totalVisits:  totalVisitsAgg[0]?.total || 0,
      todayTasks:   todayTasksAgg[0]?.total || 0,
      uptimeMs:     Date.now() - START_TIME,
      last7
    };
    adminCache.set(cacheKey, data);
    res.json({ ...data, uptime, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/status', (req, res) => {
  res.json({
    status:    'READY',
    region:    process.env.VERCEL_REGION         || 'unknown',
    env:       process.env.VERCEL_ENV            || 'production',
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF || 'main',
    nodeVer:   process.version,
    uptime:    process.uptime(),
    dbReady:   !!db
  });
});

module.exports = app;
