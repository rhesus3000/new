const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()

const CLIENTS_FILE = path.join(__dirname, '../data/Pelates.json')
const TASKS_FILE = path.join(__dirname, '../data/Tasks.json')

// GET all clients with their tasks
router.get('/api/pelates', (req, res) => {
  try {
    const clients = JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'))
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'))

    // Combine tasks with clients
    const enrichedClients = clients.map(client => ({
      ...client,
      tasks: tasks.filter(t => String(t.clientId) === String(client.id))
    }))

    res.json(enrichedClients)
  } catch (err) {
    console.error('Failed to load clients or tasks:', err)
    res.status(500).json({ error: 'Failed to load data' })
  }
})

//router.post('/api/tasks', (req, res) => {
  //const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'))
  //const newTask = { ...req.body, id: Date.now().toString() } // ← generate unique ID
 // tasks.push(newTask)
 // fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
 // res.status(201).json(newTask)
//})


// POST new client
router.post('/api/pelates', (req, res) => {
  const data = JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'))
  const newClient = { ...req.body, id: Date.now().toString() }
  data.push(newClient)
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(data, null, 2))
  res.status(201).json(newClient)
})

// DELETE client by id
router.delete('/api/pelates/:id', (req, res) => {
  const data = JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'))
  const updated = data.filter(p => String(p.id) !== req.params.id)
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(updated, null, 2))
  res.status(200).json({ success: true })
})




// PUT update client by id
router.put('/api/pelates/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'))
    const index = data.findIndex(p => String(p.id) === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Client not found' })
    }

    data[index] = { ...data[index], ...req.body }
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(data, null, 2))

    res.status(200).json(data[index])
  } catch (err) {
    console.error("Failed to update client:", err)
    res.status(500).json({ error: 'Failed to update client' })
  }
})

module.exports = router
