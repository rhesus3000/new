const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve built frontend
app.use(express.static(path.join(__dirname, 'public')));


const DB_FILE = path.join(__dirname, 'data', 'pelates.json');
fs.ensureDirSync(path.dirname(DB_FILE));
fs.ensureFileSync(DB_FILE);
if (!fs.existsSync(DB_FILE)) fs.writeJsonSync(DB_FILE, []);

app.get('/api/pelates', async (req, res) => {
  const data = await fs.readJson(DB_FILE);
  res.json(data);
});

app.post('/api/pelates', async (req, res) => {
  const data = await fs.readJson(DB_FILE);
  const newItem = { ...req.body, id: Date.now() };
  data.push(newItem);
  await fs.writeJson(DB_FILE, data);
  res.json(newItem);
});

app.put('/api/pelates/:id', async (req, res) => {
  const id = Number(req.params.id);
  const data = await fs.readJson(DB_FILE);
  const idx = data.findIndex((p) => p.id === id);
  if (idx !== -1) {
    data[idx] = { ...data[idx], ...req.body };
    await fs.writeJson(DB_FILE, data);
    res.json(data[idx]);
  } else {
    res.status(404).send("Not found");
  }
});

// SPA fallback (after API routes)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).json({ message: 'Not found' });
});

app.listen(PORT, () => console.log(`Backend listening at http://localhost:${PORT}`));
