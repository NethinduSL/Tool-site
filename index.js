const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── CONFIG ──────────────────────────────────────────────
const MONGO_URI = 'mongodb+srv://eboxdatabase_db_user:6CnyZPEV6rfQAFvj@cluster0.ngzp3fb.mongodb.net/?appName=Cluster0';
const DB_NAME = 'bitxtools';
const DAILY_LIMIT = 400; // guest limit

// Multiple Admins
const ADMINS = [
  { username: 'nethindu', password: 'EBOX@n2009' },
  { username: 'jithula', password: 'jithula123' }
];

const START_TIME = Date.now();

let db;

// ── DB CONNECTION ────────────────────────────────────────
async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('✅ MongoDB connected');
  
  // Ensure indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ token: 1 });
  await db.collection('sessions').createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // 7d TTL
  await db.collection('visits').createIndex({ date: 1 }, { unique: true });
  await db.collection('tasks').createIndex({ ip: 1, date: 1 });
}

// ── HELPERS ──────────────────────────────────────────────
function hashPass(password) {
  return crypto.createHash('sha256').update(password + 'bitx_salt_2025').digest('hex');
}

function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIP(req) {
  return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
}

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
  await db.collection('visits').updateOne(
    { date: today },
    { $inc: { count: 1 } },
    { upsert: true }
  );
}

// ── VISIT TRACKING MIDDLEWARE ────────────────────────────
app.use(async (req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    try { await recordVisit(); } catch {}
  }
  next();
});

// ── STATIC FILES ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.json({ ok: false, error: 'All fields required' });
    if (password.length < 6)
      return res.json({ ok: false, error: 'Password must be 6+ characters' });

    const existing = await db.collection('users').findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });
    if (existing) return res.json({ ok: false, error: 'Username or email already taken' });

    const user = {
      username: username.toLowerCase(),
      displayName: username,
      email: email.toLowerCase(),
      password: hashPass(password),
      role: 'user',
      status: 'active',
      createdAt: new Date(),
      lastSeen: new Date()
    };
    const result = await db.collection('users').insertOne(user);
    const token = genToken();
    await db.collection('sessions').insertOne({
      token,
      userId: result.insertedId,
      createdAt: new Date()
    });
    res.json({
      ok: true,
      token,
      user: { id: result.insertedId, username: user.username, displayName: user.displayName, email: user.email, role: user.role }
    });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ ok: false, error: 'Fields required' });

    const user = await db.collection('users').findOne({
      $or: [{ email: username.toLowerCase() }, { username: username.toLowerCase() }]
    });
    if (!user || user.password !== hashPass(password))
      return res.json({ ok: false, error: 'Invalid credentials' });
    if (user.status === 'blocked')
      return res.json({ ok: false, error: 'Account blocked. Contact support.' });

    const token = genToken();
    await db.collection('sessions').insertOne({ token, userId: user._id, createdAt: new Date() });
    await db.collection('users').updateOne({ _id: user._id }, { $set: { lastSeen: new Date() } });
    res.json({
      ok: true,
      token,
      user: { id: user._id, username: user.username, displayName: user.displayName, email: user.email, role: user.role }
    });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: 'Login failed' });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (token) await db.collection('sessions').deleteOne({ token });
  res.json({ ok: true });
});

// Get current user
app.get('/api/auth/me', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.json({ ok: false });
  res.json({
    ok: true,
    user: { id: user._id, username: user.username, displayName: user.displayName, email: user.email, role: user.role }
  });
});

// ══════════════════════════════════════════════════════════
// TASK / RATE-LIMIT ROUTES
// ══════════════════════════════════════════════════════════

// Check and increment usage
app.post('/api/tasks/use', async (req, res) => {
  try {
    const ip = getClientIP(req);
    const today = getToday();
    const user = await getSessionUser(req);

    // Signed-in users get unlimited
    if (user && user.status !== 'blocked') {
      return res.json({ ok: true, unlimited: true });
    }

    // Guest: check daily limit
    const rec = await db.collection('tasks').findOne({ ip, date: today });
    const used = rec ? rec.count : 0;
    if (used >= DAILY_LIMIT) {
      return res.json({ ok: false, limited: true, used, limit: DAILY_LIMIT });
    }
    await db.collection('tasks').updateOne(
      { ip, date: today },
      { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true, used: used + 1, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - used - 1 });
  } catch (e) {
    res.json({ ok: true }); // fail open
  }
});

// Get usage status (for UI)
app.get('/api/tasks/status', async (req, res) => {
  const ip = getClientIP(req);
  const today = getToday();
  const user = await getSessionUser(req);
  if (user) return res.json({ ok: true, unlimited: true });
  const rec = await db.collection('tasks').findOne({ ip, date: today });
  const used = rec ? rec.count : 0;
  res.json({ ok: true, used, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used) });
});

// ══════════════════════════════════════════════════════════
// STATS ROUTES (public)
// ══════════════════════════════════════════════════════════
app.get('/api/stats', async (req, res) => {
  try {
    const today = getToday();
    const todayVisits = await db.collection('visits').findOne({ date: today });
    const totalUsers = await db.collection('users').countDocuments();
    const uptimeMs = Date.now() - START_TIME;
    const uptimeSecs = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(uptimeSecs / 3600);
    const mins = Math.floor((uptimeSecs % 3600) / 60);
    const secs = uptimeSecs % 60;
    const uptime = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    const visitAgg = await db.collection('visits').aggregate([
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]).toArray();
    const totalVisits = visitAgg[0]?.total || 0;

    res.json({
      ok: true,
      todayVisits: todayVisits?.count || 0,
      totalVisits,
      totalUsers,
      uptime
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════

// Admin login (supports multiple admins)
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  const isValidAdmin = ADMINS.some(admin => 
    admin.username === username && admin.password === password
  );

  if (isValidAdmin) {
    const token = genToken();
    await db.collection('sessions').insertOne({
      token,
      admin: true,
      username: username,
      createdAt: new Date()
    });
    return res.json({ 
      ok: true, 
      token,
      message: `Welcome, ${username}!` 
    });
  }
  
  res.json({ ok: false, error: 'Invalid admin credentials' });
});

// Admin middleware
async function adminOnly(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  
  const session = await db.collection('sessions').findOne({ token, admin: true });
  if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  
  next();
}

// Admin: get all users
app.get('/api/admin/users', adminOnly, async (req, res) => {
  const users = await db.collection('users')
    .find({}, { projection: { password: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json({ ok: true, users });
});

// Admin: block/unblock user
app.post('/api/admin/users/:id/block', adminOnly, async (req, res) => {
  const { status } = req.body; // 'blocked' or 'active'
  await db.collection('users').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status } }
  );
  res.json({ ok: true });
});

// Admin: delete user
app.delete('/api/admin/users/:id', adminOnly, async (req, res) => {
  await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
});

// Admin: emergency reset
app.post('/api/admin/emergency-reset', adminOnly, async (req, res) => {
  try {
    await db.collection('sessions').deleteMany({});
    const today = getToday();
    await db.collection('tasks').deleteMany({ date: today });
    res.json({ ok: true, message: 'All sessions cleared and daily task counts reset.' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Admin: get tool states
app.get('/api/admin/tools', adminOnly, async (req, res) => {
  try {
    const tools = await db.collection('tool_settings').find({}).toArray();
    res.json({ ok: true, tools });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Admin: set tool enabled/disabled
app.post('/api/admin/tools/:toolId', adminOnly, async (req, res) => {
  const { enabled } = req.body;
  await db.collection('tool_settings').updateOne(
    { toolId: req.params.toolId },
    { $set: { toolId: req.params.toolId, enabled: !!enabled } },
    { upsert: true }
  );
  res.json({ ok: true });
});

// Public: get disabled tools list
app.get('/api/tools/settings', async (req, res) => {
  try {
    const tools = await db.collection('tool_settings').find({ enabled: false }).toArray();
    res.json({ ok: true, disabled: tools.map(t => t.toolId) });
  } catch (e) {
    res.json({ ok: true, disabled: [] });
  }
});

// Admin: full stats
app.get('/api/admin/stats', adminOnly, async (req, res) => {
  try {
    const today = getToday();
    const totalUsers = await db.collection('users').countDocuments();
    const activeUsers = await db.collection('users').countDocuments({ status: 'active' });
    const blockedUsers = await db.collection('users').countDocuments({ status: 'blocked' });
    const todayVisit = await db.collection('visits').findOne({ date: today });
    const visitAgg = await db.collection('visits').aggregate([
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]).toArray();
    const totalVisits = visitAgg[0]?.total || 0;
    const todayTasks = await db.collection('tasks').aggregate([
      { $match: { date: today } },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]).toArray();
    const uptimeMs = Date.now() - START_TIME;
    
    // Last 7 days visits
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); 
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const v = await db.collection('visits').findOne({ date: ds });
      last7.push({ date: ds, count: v?.count || 0 });
    }

    res.json({
      ok: true,
      totalUsers, 
      activeUsers, 
      blockedUsers,
      todayVisits: todayVisit?.count || 0,
      totalVisits,
      todayTasks: todayTasks[0]?.total || 0,
      uptimeMs,
      last7
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Admin: serve admin panel HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch(err => {
  console.error('DB connection failed:', err);
  process.exit(1);
});

module.exports = app;
