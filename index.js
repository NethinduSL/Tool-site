// ============================================================
// BitX Tools Server — index.js  (Mongoose + node-cache optimized)
// Rebuilt to match the API site's database management pattern
// ============================================================

const express    = require('express');
const mongoose   = require('mongoose');
const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');
const NodeCache  = require('node-cache');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ─── CONFIG ──────────────────────────────────────────────────
const MONGO_URI    = 'mongodb+srv://eboxdatabase_db_user:DIAuQx90bGgxK9KR@cluster0.x98xn7f.mongodb.net/bitxtools?retryWrites=true&w=majority&appName=Cluster0';
const DAILY_LIMIT  = 400;
const START_TIME   = Date.now();

const ADMINS = [
  { username: 'Nethindu', password: 'EBOX@n2009' },
  { username: 'Jithula',  password: 'Jithula123' }
];

// ─── CACHE INSTANCES ─────────────────────────────────────────
// userCache: keyed by session token, TTL 60s
const userCache    = new NodeCache({ stdTTL: 60,  checkperiod: 30,  useClones: false });
// taskCache: keyed by IP, TTL 90s (daily rate-limit records)
const taskCache    = new NodeCache({ stdTTL: 90,  checkperiod: 45,  useClones: false });
// statsCache: TTL 30s — dashboards stay fresh without hammering DB
const statsCache   = new NodeCache({ stdTTL: 30,  checkperiod: 15,  useClones: false });
// adminCache: TTL 15s — admin data changes often
const adminCache   = new NodeCache({ stdTTL: 15,  checkperiod: 10,  useClones: false });
// toolsCache: TTL 120s — tool list/settings
const toolsCache   = new NodeCache({ stdTTL: 120, checkperiod: 60,  useClones: false });
// adminTokenCache: keyed by token, TTL 3600s (1 hour)
const adminTokenCache = new NodeCache({ stdTTL: 3600, checkperiod: 300, useClones: false });

// ─── MongoDB Connection ───────────────────────────────────────
mongoose.connect(MONGO_URI, {
  maxPoolSize:              20,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ─── Schemas ──────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username:    { type: String, unique: true, required: true, lowercase: true },
  displayName: { type: String, default: '' },
  email:       { type: String, unique: true, required: true, lowercase: true },
  password:    { type: String, required: true },
  role:        { type: String, enum: ['user', 'admin'], default: 'user' },
  status:      { type: String, enum: ['active', 'blocked'], default: 'active' },
  createdAt:   { type: Date, default: Date.now },
  lastSeen:    { type: Date, default: Date.now }
});
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

const sessionSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  admin:     { type: Boolean, default: false },
  username:  { type: String, default: '' },   // only set for admin sessions
  createdAt: { type: Date, default: Date.now, expires: 604800 }  // auto-expire after 7 days
});
sessionSchema.index({ token: 1 });

const visitSchema = new mongoose.Schema({
  date:  { type: String, unique: true },
  count: { type: Number, default: 0 }
});
visitSchema.index({ date: 1 });

const taskSchema = new mongoose.Schema({
  ip:        { type: String },
  date:      { type: String },
  count:     { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
taskSchema.index({ ip: 1, date: 1 });

const toolSettingSchema = new mongoose.Schema({
  toolId:  { type: String, unique: true },
  enabled: { type: Boolean, default: true }
});
toolSettingSchema.index({ toolId: 1 });

const User        = mongoose.model('User', userSchema);
const Session     = mongoose.model('Session', sessionSchema);
const Visit       = mongoose.model('Visit', visitSchema);
const Task        = mongoose.model('Task', taskSchema);
const ToolSetting = mongoose.model('ToolSetting', toolSettingSchema);

// ─── Helpers ──────────────────────────────────────────────────
function hashPass(p) { return crypto.createHash('sha256').update(p + 'bitx_salt_2025').digest('hex'); }
function genToken() { return crypto.randomBytes(32).toString('hex'); }
function today()    { return new Date().toISOString().slice(0, 10); }
function getClientIP(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || 'unknown';
}

// ─── Cache invalidation helpers ───────────────────────────────
function invalidateUser(token) { if (token) userCache.del(token); }
function invalidateAdminCache() { adminCache.flushAll(); }
function bustToolsCache() { toolsCache.del('tools_list'); toolsCache.del('tools_settings'); }

// ─── Track Visit (fire-and-forget) ───────────────────────────
function trackVisit() {
  const d = today();
  Visit.findOneAndUpdate({ date: d }, { $inc: { count: 1 } }, { upsert: true }).exec().catch(() => {});
  statsCache.del('publicStats');
  statsCache.del('adminStats');
}

// ─── Session resolution ───────────────────────────────────────
async function getSessionUser(req) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim()
             || req.query._token || '';
  if (!token) return null;

  // Check cache first
  let user = userCache.get(token);
  if (user) return user;

  // Fallback to DB
  const session = await Session.findOne({ token, admin: { $ne: true } });
  if (!session) return null;

  user = await User.findById(session.userId).select('-password');
  if (!user) return null;

  userCache.set(token, user);
  return user;
}

// ─── Visit Middleware ─────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') { try { trackVisit(); } catch {} }
  next();
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/index.html', (req, res) => res.redirect(301, '/'));

// ─── TOOLS ────────────────────────────────────────────────────
function loadToolsModule() {
  const toolsPath = path.join(__dirname, 'public', 'tools.js');
  delete require.cache[toolsPath];
  return require(toolsPath).TOOLS;
}

app.get('/api/tools/list', async (req, res) => {
  try {
    const cached = toolsCache.get('tools_list');
    if (cached) return res.json({ ok: true, tools: cached, cached: true });

    const TOOLS = loadToolsModule();
    const settings = await ToolSetting.find({});
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

app.get('/api/tools/settings', async (req, res) => {
  try {
    const cached = toolsCache.get('tools_settings');
    if (cached) return res.json({ ok: true, disabled: cached, cached: true });

    const settings = await ToolSetting.find({ enabled: false });
    const disabled = settings.map(s => s.toolId);

    toolsCache.set('tools_settings', disabled);
    res.json({ ok: true, disabled, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ─── AUTH ─────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.json({ ok: false, error: 'All fields required' });
    if (password.length < 6) return res.json({ ok: false, error: 'Password must be 6+ characters' });

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (exists) return res.json({ ok: false, error: 'Username or email already taken' });

    const user = await User.create({
      username: username.toLowerCase(), displayName: username,
      email: email.toLowerCase(), password: hashPass(password)
    });
    invalidateAdminCache();

    const token = genToken();
    const session = await Session.create({ token, userId: user._id });

    res.json({
      ok: true, token,
      user: { id: user._id, username: user.username, displayName: user.displayName, email: user.email, role: user.role }
    });
  } catch (e) { console.error(e); res.json({ ok: false, error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ ok: false, error: 'Fields required' });

    const dbUser = await User.findOne({
      $or: [{ email: username.toLowerCase() }, { username: username.toLowerCase() }]
    });
    if (!dbUser || dbUser.password !== hashPass(password)) return res.json({ ok: false, error: 'Invalid credentials' });
    if (dbUser.status === 'blocked') return res.json({ ok: false, error: 'Account blocked. Contact support.' });

    const token = genToken();
    await Session.create({ token, userId: dbUser._id });

    // Update lastSeen (fire-and-forget)
    User.findByIdAndUpdate(dbUser._id, { lastSeen: new Date() }).exec().catch(() => {});

    // Warm user into cache for this token
    const safeUser = { ...dbUser.toObject() };
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
      Session.deleteOne({ token }).exec().catch(() => {});
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

// ─── TASKS / RATE LIMIT ───────────────────────────────────────
app.post('/api/tasks/use', async (req, res) => {
  try {
    const ip = getClientIP(req);
    const d  = today();

    const user = await getSessionUser(req);
    if (user && user.status !== 'blocked') return res.json({ ok: true, unlimited: true });

    // Check task cache first
    let rec = taskCache.get(ip);

    if (!rec) {
      rec = await Task.findOne({ ip, date: d });
      if (!rec) rec = { ip, date: d, count: 0 };
      else rec = rec.toObject();
    }

    // Reset if it's a new day
    if (rec.date !== d) { rec.date = d; rec.count = 0; }

    if (rec.count >= DAILY_LIMIT) {
      return res.json({ ok: false, limited: true, used: rec.count, limit: DAILY_LIMIT });
    }

    rec.count += 1;
    taskCache.set(ip, rec);

    // Persist to DB (fire-and-forget)
    Task.findOneAndUpdate(
      { ip, date: d },
      { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    ).exec().catch(() => {});

    res.json({ ok: true, used: rec.count, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - rec.count });
  } catch { res.json({ ok: true }); }
});

app.get('/api/tasks/status', async (req, res) => {
  const ip = getClientIP(req);
  const d  = today();

  const user = await getSessionUser(req);
  if (user) return res.json({ ok: true, unlimited: true });

  let rec = taskCache.get(ip);
  if (!rec) {
    rec = await Task.findOne({ ip, date: d });
    if (rec) { rec = rec.toObject(); taskCache.set(ip, rec); }
  }
  const used = (rec && rec.date === d) ? rec.count : 0;
  res.json({ ok: true, used, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used) });
});

// ─── PUBLIC STATS ─────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const s = Math.floor((Date.now() - START_TIME) / 1000);
    const uptime = `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

    const cached = statsCache.get('publicStats');
    if (cached) return res.json({ ...cached, uptime, cached: true });

    const d = today();
    const [todayVisit, totalVisitsAgg, totalUsers] = await Promise.all([
      Visit.findOne({ date: d }),
      Visit.aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }]),
      User.countDocuments({})
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

// ─── ADMIN AUTH ───────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const match = ADMINS.find(a => a.username === username && a.password === password);
  if (!match) return res.json({ ok: false, error: 'Invalid admin credentials' });

  const token = genToken();
  adminTokenCache.set(token, match.username);

  // Persist admin session to DB (fire-and-forget)
  Session.create({ token, admin: true, username: match.username }).catch(() => {});

  res.json({ ok: true, token, username: match.username, message: `Welcome, ${match.username}!` });
});

async function adminOnly(req, res, next) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  // 1. Check in-memory admin token cache (fastest)
  const cached = adminTokenCache.get(token);
  if (cached) { req.adminUsername = cached; return next(); }

  // 2. Fallback to DB session
  const session = await Session.findOne({ token, admin: true });
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  adminTokenCache.set(token, session.username); // warm for next request
  req.adminUsername = session.username;
  next();
}

// ─── ADMIN ROUTES ─────────────────────────────────────────────
app.get('/api/admin/users', adminOnly, async (req, res) => {
  try {
    const cacheKey = 'adminUsers';
    const cached = adminCache.get(cacheKey);
    if (cached) return res.json({ ok: true, users: cached, cached: true });

    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    adminCache.set(cacheKey, users);
    res.json({ ok: true, users, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/admin/users/:id/block', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    await User.findByIdAndUpdate(req.params.id, { status });
    // Evict cached sessions for this user
    Session.find({ userId: req.params.id }).then(sessions => {
      sessions.forEach(s => invalidateUser(s.token));
    }).catch(() => {});
    invalidateAdminCache();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.delete('/api/admin/users/:id', adminOnly, async (req, res) => {
  try {
    // Remove user sessions from cache
    const sessions = await Session.find({ userId: req.params.id });
    sessions.forEach(s => invalidateUser(s.token));
    await Session.deleteMany({ userId: req.params.id });

    await User.findByIdAndDelete(req.params.id);
    invalidateAdminCache();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/admin/emergency-reset', adminOnly, async (req, res) => {
  try {
    // Flush all caches
    userCache.flushAll();
    taskCache.flushAll();
    statsCache.flushAll();
    adminCache.flushAll();

    await Promise.all([
      Session.deleteMany({ admin: { $ne: true } }),
      Task.deleteMany({ date: today() })
    ]);

    res.json({ ok: true, message: 'All sessions cleared and daily task counts reset.' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/admin/tools', adminOnly, async (req, res) => {
  try {
    const TOOLS = loadToolsModule();
    const settings = await ToolSetting.find({});
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
    await ToolSetting.findOneAndUpdate({ toolId }, { enabled }, { upsert: true, new: true });
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

    // Build last 7 days date array
    const last7Dates = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
      return dt.toISOString().slice(0, 10);
    });

    const [totalUsers, activeUsers, blockedUsers, visits, todayTasks, totalVisitsAgg] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'blocked' }),
      Visit.find({ date: { $in: last7Dates } }),
      Task.aggregate([{ $match: { date: d } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
      Visit.aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }])
    ]);

    const visitMap = Object.fromEntries(visits.map(v => [v.date, v.count]));
    const last7 = last7Dates.map(date => ({ date, count: visitMap[date] || 0 }));

    const data = {
      ok: true,
      totalUsers, activeUsers, blockedUsers,
      todayVisits:  visitMap[d] || 0,
      totalVisits:  totalVisitsAgg[0]?.total || 0,
      todayTasks:   todayTasks[0]?.total || 0,
      uptimeMs:     Date.now() - START_TIME,
      last7
    };
    adminCache.set(cacheKey, data);
    res.json({ ...data, uptime, cached: false });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ─── VERCEL STATUS ────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    status:    'READY',
    region:    process.env.VERCEL_REGION         || 'unknown',
    env:       process.env.VERCEL_ENV            || 'production',
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF || 'main',
    nodeVer:   process.version,
    uptime:    process.uptime()
  });
});

// ─── PAGES ────────────────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ─── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
mongoose.connection.once('open', () => {
  app.listen(PORT, () => console.log(`🚀 BitX Tools running on port ${PORT}`));
});

mongoose.connection.on('error', err => {
  console.error('❌ MongoDB runtime error:', err);
});

module.exports = app;
