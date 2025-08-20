// routes/tasks.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const tasksPath = path.join(__dirname, '../data/Tasks.json');

// --------- helpers ----------
const ensureArray = (v) => Array.isArray(v) ? v : [];
const toNum = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

function readTasks() {
  if (!fs.existsSync(tasksPath)) return [];
  const data = fs.readFileSync(tasksPath, 'utf-8');
  try { return JSON.parse(data); } catch { return []; }
}

function writeTasks(tasks) {
  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8');
}

function makeNextId(tasks) {
  if (!tasks.length) return Date.now().toString();
  const last = tasks[tasks.length - 1]?.id;
  if (typeof last === 'number') return last + 1;
  return Date.now().toString();
}

function normalizePayments(arr) {
  return ensureArray(arr).map(p => ({
    amount: Math.max(0, toNum(p.amount, 0)),
    at: p.at || new Date().toISOString()
  }));
}

function sumPayments(arr) {
  return normalizePayments(arr).reduce((a, p) => a + toNum(p.amount, 0), 0);
}

// --------- routes ----------
/** GET /api/tasks */
router.get('/', (_req, res) => {
  const tasks = readTasks();
  res.json(tasks);
});

/** POST /api/tasks  (create) */
router.post('/', (req, res) => {
  const tasks = readTasks();

  // base
  let task = {
    id: makeNextId(tasks),
    title: String(req.body.title || ''),
    clientId: req.body.clientId ?? '',
    description: String(req.body.description || ''),
    cost: toNum(req.body.cost, 0),
    date: req.body.date || '',
    status: req.body.status || 'Δεν Ξεκίνησε',
    priority: req.body.priority || 'Μέτρια',
    paid: 0,
    payments: [],
    createdAt: new Date().toISOString()
  };

  // allow initial payments / paid from client, but normalize
  if (Array.isArray(req.body.payments)) {
    task.payments = normalizePayments(req.body.payments);
    task.paid = sumPayments(task.payments);
  } else if (req.body.paid != null) {
    task.paid = Math.max(0, toNum(req.body.paid, 0));
  }

  // clamp paid to cost
  task.paid = Math.min(task.paid, task.cost);

  tasks.push(task);
  writeTasks(tasks);
  res.status(201).json(task);
});

/** PUT /api/tasks/:id  (update whole task safely) */
router.put('/:id', (req, res) => {
  const tasks = readTasks();
  const idParam = String(req.params.id);
  const idx = tasks.findIndex(t => String(t.id) === idParam);
  if (idx === -1) return res.status(404).json({ message: 'Task not found' });

  const current = tasks[idx];

  // merge shallowly
  const merged = {
    ...current,
    ...req.body,
    id: current.id,                       // never change id
    createdAt: current.createdAt || null, // preserve createdAt if present
    updatedAt: new Date().toISOString()
  };

  // normalize numeric fields
  merged.cost = toNum(merged.cost, toNum(current.cost, 0));

  // if payments provided, recompute paid from them (source of truth)
  if (Array.isArray(req.body.payments)) {
    merged.payments = normalizePayments(req.body.payments);
    merged.paid = sumPayments(merged.payments);
  } else {
    // otherwise trust 'paid' if sent, else keep existing
    merged.pay = undefined; // ignore typoed fields
    merged.paid = toNum(merged.paid ?? current.paid, 0);
    merged.payments = ensureArray(merged.payments ?? current.payments);
  }

  // enforce invariants
  merged.paid = Math.max(0, Math.min(merged.paid, merged.cost));

  tasks[idx] = merged;
  writeTasks(tasks);
  res.json(merged);
});

/** DELETE /api/tasks/:id */
router.delete('/:id', (req, res) => {
  const tasks = readTasks();
  const idParam = String(req.params.id);
  const filtered = tasks.filter(t => String(t.id) !== idParam);
  if (filtered.length === tasks.length) {
    return res.status(404).json({ message: 'Task not found' });
  }
  writeTasks(filtered);
  res.json({ message: 'Task deleted', id: idParam });
});

/** POST /api/tasks/:id/payments  (append one payment safely) */
router.post('/:id/payments', (req, res) => {
  const tasks = readTasks();
  const idParam = String(req.params.id);
  const idx = tasks.findIndex(t => String(t.id) === idParam);
  if (idx === -1) return res.status(404).json({ message: 'Task not found' });

  const task = tasks[idx];
  const cost = toNum(task.cost, 0);
  const alreadyPaid = toNum(task.paid, 0);

  const amount = Math.max(0, toNum(req.body.amount, 0));
  const remaining = Math.max(cost - alreadyPaid, 0);
  if (amount <= 0) return res.status(400).json({ message: 'Amount must be > 0' });
  if (amount > remaining) return res.status(400).json({ message: 'Amount exceeds remaining' });

  const entry = { amount, at: new Date().toISOString() };
  task.payments = [...ensureArray(task.payments), entry];
  task.paid = Math.min(cost, alreadyPaid + amount);
  task.updatedAt = new Date().toISOString();

  tasks[idx] = task;
  writeTasks(tasks);
  res.status(201).json(task);
});

module.exports = router;
