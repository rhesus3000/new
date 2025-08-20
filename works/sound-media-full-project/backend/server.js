const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Routers
const pelatesRoutes = require('./routes/pelates');   // defines /api/pelates... inside the file
const tasksRoutes   = require('./routes/tasks');     // defines / (GET, POST, PUT, DELETE) relative to /api/tasks

// Mount routers
app.use('/', pelatesRoutes);         // pelates.js already uses absolute paths like /api/pelates
app.use('/api/tasks', tasksRoutes);  // tasks routes live under /api/tasks

// (Optional) health check
app.get('/health', (_req, res) => res.send('ok'));

// 404 fallback
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
