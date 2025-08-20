import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { FaUser, FaCalendarAlt, FaClock, FaEuroSign, FaSearch, FaRedoAlt, FaFilter } from 'react-icons/fa'

const sortTasks = (arr, sortKey = 'newest') => {
  const base = [...arr]
  if (sortKey === 'newest') {
    return base.sort((a, b) => {
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (aCreated !== bCreated) return bCreated - aCreated
      const aId = Number(a.id) || 0
      const bId = Number(b.id) || 0
      return bId - aId
    })
  }
  if (sortKey === 'dueAsc') {
    return base.sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : Infinity
      const bd = b.date ? new Date(b.date).getTime() : Infinity
      return ad - bd
    })
  }
  if (sortKey === 'dueDesc') {
    return base.sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : -Infinity
      const bd = b.date ? new Date(b.date).getTime() : -Infinity
      return bd - ad
    })
  }
  if (sortKey === 'amountRemainingDesc') {
    return base.sort((a, b) => {
      const ar = Math.max((parseFloat(a.cost)||0) - (parseFloat(a.paid)||0), 0)
      const br = Math.max((parseFloat(b.cost)||0) - (parseFloat(b.paid)||0), 0)
      return br - ar
    })
  }
  return base
}

// Format ISO to readable date/time
const formatDT = (iso) => {
  try {
    return new Date(iso).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso || '—'
  }
}

export default function Tasks() {
  const [showAddModal, setShowAddModal] = useState(false)

  // Edit + View state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [showTaskViewModal, setShowTaskViewModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  const toNum = (v) => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }

  // payment status helper
  const paymentMeta = (task) => {
    const cost = toNum(task.cost)
    const paid = toNum(task.paid)
    const remaining = Math.max(cost - paid, 0)
    const pct = cost > 0 ? Math.round(Math.min(100, (paid / cost) * 100)) : 0
    let state = 'none'
    if (remaining === 0 && cost > 0) state = 'full'
    else if (paid > 0) state = 'partial'
    return { state, cost, paid, remaining, pct }
  }

  const [paymentAmount, setPaymentAmount] = useState('')

  // Delete confirm modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [sortKey, setSortKey] = useState('newest')

  // -------- NEW: Filter state --------
  const today = new Date()
  const [filters, setFilters] = useState({
    q: '',
    clientId: '',
    status: '',
    priority: '',
    payState: '', // '', 'none' | 'partial' | 'full'
    from: '',     // yyyy-mm-dd
    to: '',       // yyyy-mm-dd
  })

  const applyPreset = (preset) => {
    const d = new Date()
    const pad = (x) => String(x).padStart(2, '0')

    const asYMD = (date) => {
      const y = date.getFullYear()
      const m = pad(date.getMonth() + 1)
      const dd = pad(date.getDate())
      return `${y}-${m}-${dd}`
    }

    let from = ''
    let to = ''

    if (preset === 'today') {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      from = asYMD(start)
      to = asYMD(end)
    } else if (preset === 'week') {
      // Δευτέρα - Κυριακή
      const day = d.getDay() || 7 // Κυρ=0 -> 7
      const monday = new Date(d)
      monday.setDate(d.getDate() - (day - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      from = asYMD(monday)
      to = asYMD(sunday)
    } else if (preset === 'month') {
      const first = new Date(d.getFullYear(), d.getMonth(), 1)
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      from = asYMD(first)
      to = asYMD(last)
    } else if (preset === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) // 0..3
      const first = new Date(d.getFullYear(), q * 3, 1)
      const last = new Date(d.getFullYear(), q * 3 + 3, 0)
      from = asYMD(first)
      to = asYMD(last)
    } else if (preset === 'ytd') {
      const first = new Date(d.getFullYear(), 0, 1)
      const last = d
      from = asYMD(first)
      to = asYMD(last)
    } else if (preset === 'all') {
      from = ''
      to = ''
    }

    setFilters((f) => ({ ...f, from, to }))
  }

  const resetFilters = () =>
    setFilters({ q: '', clientId: '', status: '', priority: '', payState: '', from: '', to: '' })

  useEffect(() => {
    axios.get('http://localhost:3000/api/pelates')
      .then(res => setClients(res.data))
      .catch(err => console.error('Error loading clients:', err))

    axios.get('http://localhost:3000/api/tasks')
      .then(res => setTasks(sortTasks(res.data, sortKey)))
      .catch(err => console.error('Error loading tasks:', err))
  }, []) // initial

  useEffect(() => {
    // re-sort when sortKey changes
    setTasks(prev => sortTasks(prev, sortKey))
  }, [sortKey])

  const [highlightedId, setHighlightedId] = useState(null)

  const handleAdd = () => {
    axios.post('http://localhost:3000/api/tasks', { ...newTask, paid: 0, payments: [] })
      .then(res => {
        const created = res.data?.task ?? res.data
        setTasks(prev => sortTasks([created, ...prev], sortKey))
        setHighlightedId(String(created.id))
        setTimeout(() => setHighlightedId(null), 2000)
        setShowAddModal(false)
        setNewTask({
          title: '',
          clientId: '',
          description: '',
          cost: '',
          date: '',
          status: 'Σε Εξέλιξη',
          priority: 'Μέτρια'
        })
      })
      .catch(err => console.error('Error saving task:', err))
  }

  const [newTask, setNewTask] = useState({
    title: '',
    clientId: '',
    description: '',
    cost: '',
    date: '',
    status: 'Σε Εξέλιξη',
    priority: 'Μέτρια'
  })

  // OPEN EDIT
  const openEdit = (task) => {
    setEditTask({ ...task })
    setShowEditModal(true)
  }

  // SAVE EDIT
  const handleUpdate = () => {
    if (!editTask || editTask.id == null) {
      console.error('Missing editTask or ID', editTask)
      return
    }
    axios.put(`http://localhost:3000/api/tasks/${encodeURIComponent(String(editTask.id))}`, editTask)
      .then(res => {
        const updated = res.data
        setTasks(prev => sortTasks(prev.map(t => String(t.id) === String(updated.id) ? updated : t), sortKey))
        setShowEditModal(false)
        setEditTask(null)
      })
      .catch(err => console.error('Error updating task:', err))
  }

  // DELETE (called from confirm popup)
  const handleDelete = () => {
    if (!editTask?.id) {
      console.error('Missing ID for delete', editTask)
      return
    }
    axios
      .delete(`http://localhost:3000/api/tasks/${encodeURIComponent(String(editTask.id))}`)
      .then(() => {
        setTasks(prev => prev.filter(t => String(t.id) !== String(editTask.id)))
        setShowDeleteConfirm(false)
        setShowEditModal(false)
        setEditTask(null)
      })
      .catch(err => console.error('Error deleting task:', err))
  }

  const handleRecordPayment = async () => {
    if (!selectedTask) return;

    const cost = toNum(selectedTask.cost);
    const alreadyPaid = toNum(selectedTask.paid);
    const remaining = Math.max(cost - alreadyPaid, 0);
    const amt = toNum(paymentAmount);

    if (amt <= 0) {
      alert('Enter an amount greater than zero.');
      return;
    }
    if (amt > remaining) {
      alert('Amount cannot exceed the remaining balance.');
      return;
    }

    try {
      const res = await axios.post(
        `http://localhost:3000/api/tasks/${encodeURIComponent(String(selectedTask.id))}/payments`,
        { amount: amt }
      );
      const saved = res.data?.task ?? res.data;

      setTasks(prev => prev.map(t => String(t.id) === String(saved.id) ? saved : t));
      setSelectedTask(saved);
      setPaymentAmount('');
    } catch (err) {
      const msg = err?.response?.data?.message || 'There was a problem saving the payment.';
      console.error('Error recording payment:', err);
      alert(msg);
    }
  };

  const priorityColors = {
    Χαμηλή: 'bg-green-100 text-green-800',
    Μέτρια: 'bg-yellow-100 text-yellow-800',
    Υψηλή: 'bg-red-100 text-red-800',
  }

  const getRemainingTime = (dateStr) => {
    const now = new Date()
    const due = new Date(dateStr)
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    const diffMs = dueDateOnly - nowDateOnly
    if (diffMs < 0) return 'Πέρασε'
    if (diffMs === 0) return 'Σήμερα'
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return `${days} ημέρες`
  }

  // -------- NEW: Derived filtered tasks --------
  const visibleTasks = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const from = filters.from ? new Date(filters.from + 'T00:00:00') : null
    const to = filters.to ? new Date(filters.to + 'T23:59:59') : null

    let list = tasks.filter((t) => {
      // text search on title/description/client
      if (q) {
        const client = clients.find(c => String(c.id) === String(t.clientId))
        const hay = [
          t.title || '',
          t.description || '',
          client?.name || ''
        ].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }

      // client filter
      if (filters.clientId && String(t.clientId) !== String(filters.clientId)) return false

      // status filter
      if (filters.status && t.status !== filters.status) return false

      // priority filter
      if (filters.priority && t.priority !== filters.priority) return false

      // payment state filter
      if (filters.payState) {
        const meta = paymentMeta(t)
        if (meta.state !== filters.payState) return false
      }

      // date range (by due date t.date)
      if (from) {
        const due = t.date ? new Date(t.date) : null
        if (!due || due < from) return false
      }
      if (to) {
        const due = t.date ? new Date(t.date) : null
        if (!due || due > to) return false
      }

      return true
    })

    return sortTasks(list, sortKey)
  }, [tasks, clients, filters, sortKey])

  // ---------- UI ----------
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-bold">Εργασίες</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            + Εργασία
          </button>
        </div>
      </div>

      {/* -------- Filter Bar (Detailed-style) -------- */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white/90 shadow-sm">
        {/* top row: search + quick presets */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4">
          <div className="flex items-center gap-2 w-full md:w-96">
            <FaSearch className="text-gray-400" />
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Αναζήτηση (τίτλος, περιγραφή, πελάτης)…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => applyPreset('today')} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-blue-50">Σήμερα</button>
            <button onClick={() => applyPreset('week')} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-blue-50">Εβδομάδα</button>
            <button onClick={() => applyPreset('month')} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-blue-50">Μήνας</button>
            <button onClick={() => applyPreset('quarter')} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-blue-50">Τρίμηνο</button>
            <button onClick={() => applyPreset('ytd')} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-blue-50">YTD</button>
            <button onClick={() => applyPreset('all')} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-blue-50">Όλο το διάστημα</button>
          </div>
        </div>

        {/* second row: filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 px-4 pb-4">
          {/* Client */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Πελάτης</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={filters.clientId}
              onChange={(e) => setFilters((f) => ({ ...f, clientId: e.target.value }))}
            >
              <option value="">Όλοι</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Κατάσταση</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">Όλες</option>
                  <option>Σε Εξέλιξη</option>
                  <option>Δεν Ξεκίνησε</option>
                  <option>Ολοκληρώθηκε</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Προτεραιότητα</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={filters.priority}
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="">Όλες</option>
              <option>Χαμηλή</option>
              <option>Μέτρια</option>
              <option>Υψηλή</option>
            </select>
          </div>

          {/* Payment state */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Κατάσταση Πληρωμής</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={filters.payState}
              onChange={(e) => setFilters((f) => ({ ...f, payState: e.target.value }))}
            >
              <option value="">Όλες</option>
              <option value="none">Καμία</option>
              <option value="partial">Μερική</option>
              <option value="full">Εξοφλημένη</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ταξινόμηση</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="newest">Πιο πρόσφατες</option>
              <option value="dueAsc">Παράδοση ↑</option>
              <option value="dueDesc">Παράδοση ↓</option>
              <option value="amountRemainingDesc">Υπόλοιπο € ↓</option>
            </select>
          </div>
        </div>

        {/* third row: date range + reset */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 pb-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Από (Παράδοση)</label>
              <input
                type="date"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Έως (Παράδοση)</label>
              <input
                type="date"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <FaFilter className="text-gray-400" />
            <span className="text-sm text-gray-600">Σύνολο: <strong>{visibleTasks.length}</strong></span>
            <button
              onClick={resetFilters}
              className="ml-2 inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              title="Καθαρισμός φίλτρων"
            >
              <FaRedoAlt /> Επαναφορά
            </button>
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <style>{`
        @keyframes scalePop {
          0%   { transform: none; }
          50%  { transform: scale(1.03); }
          100% { transform: none; }
        }
        .task-card { position: relative; }
        .task-card.blink3 { animation: scalePop 0.18s ease-in-out 3; }
      `}</style>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
        {visibleTasks.map((task) => {
          const client = clients.find(c => String(c.id) === String(task.clientId))
          const { state, remaining, paid, pct } = paymentMeta(task)

          const borderClass =
            highlightedId === String(task.id)
              ? 'border-4 border-blue-400'
              : state === 'full'
                ? 'border-2 border-emerald-400'
                : state === 'partial'
                  ? 'border-2 border-amber-400'
                  : 'border border-gray-200'

          return (
            <div
              id={`task-${String(task.id)}`}
              key={String(task.id)}
              className={`task-card bg-white rounded-xl p-5 shadow-md transition-all duration-1000 ${borderClass}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg truncate max-w-[70%]">{task.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-1 rounded-full font-semibold
                    ${state === 'full'
                      ? 'bg-emerald-100 text-emerald-800'
                      : state === 'partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'}`}>
                    {state === 'full' ? 'Εξοφλήθηκε' : state === 'partial' ? 'Μερική' : 'Καμία'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${priorityColors[task.priority] || ''}`}>
                    {task.priority}
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                <FaUser /> {client?.name || 'Άγνωστος Πελάτης'}
              </div>

              <p className="text-sm text-gray-800 mb-2 line-clamp-4 break-words min-h-[5.2rem]">
                {task.description}
              </p>

              <div className="text-sm text-gray-700 font-medium mb-1">Πληρωμή</div>
              <div className="w-full h-2 bg-gray-200 rounded mb-3 overflow-hidden">
                <div className={`${state === 'full' ? 'bg-emerald-500' : 'bg-amber-500'} h-2`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>Πληρωμένο: {paid.toFixed(2)} €</span>
                <span>Υπόλοιπο: {remaining.toFixed(2)} €</span>
              </div>

              <div className="text-sm font-medium text-gray-700 mt-1 mb-2">
                Δημιουργήθηκε: {task.createdAt ? new Date(task.createdAt).toLocaleDateString('el-GR') : '—'}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">{task.status}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm mt-2 text-gray-600">
                <div>
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt />
                    <span className="font-semibold">Παράδοση</span>
                  </div>
                  <div className="ml-6">{task.date ? new Date(task.date).toLocaleDateString('el-GR') : '—'}</div>
                </div>

                {(() => {
                  const dueDate = task.date ? new Date(task.date) : null
                  const now = new Date()
                  const isToday = dueDate &&
                    dueDate.getFullYear() === now.getFullYear() &&
                    dueDate.getMonth() === now.getMonth() &&
                    dueDate.getDate() === now.getDate()
                  return (
                    <div>
                      <div className="flex items-center gap-2">
                        <FaClock />
                        <span className="font-semibold">{isToday ? 'Λήγει' : 'Απομένουν'}</span>
                      </div>
                      <div className="ml-6">
                        {dueDate ? (isToday ? 'Σήμερα' : getRemainingTime(dueDate)) : '—'}
                      </div>
                    </div>
                  )
                })()}

                <div>
                  <div className="flex items-center gap-2">
                    <FaEuroSign />
                    <span className="font-semibold">Κόστος</span>
                  </div>
                  <div className="ml-6 text-blue-700 font-semibold">{task.cost} €</div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  className="w-1/2 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                  onClick={() => {
                    setEditTask({ ...task })
                    setShowEditModal(true)
                  }}
                >
                  Επεξεργασία
                </button>
                <button
                  className="w-1/2 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  onClick={() => {
                    setSelectedTask(task)
                    setPaymentAmount('')
                    setShowTaskViewModal(true)
                  }}
                >
                  Προβολή
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ====== View modal, Edit modal, Delete confirm, Add modal (όπως τα είχες) ====== */}
      {showTaskViewModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 md:p-7 rounded-2xl shadow-2xl w-full max-w-5xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{selectedTask.title}</h2>
                <p className="text-gray-700 text-sm mt-1">
                  Πελάτης:{' '}
                  <span className="font-medium">
                    {clients.find(c => String(c.id) === String(selectedTask.clientId))?.name || "Άγνωστος Πελάτης"}
                  </span>
                </p>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  Η Εργασία Δημιουργήθηκε στις: {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString('el-GR') : '—'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  {selectedTask.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                  ${selectedTask.priority === 'Υψηλή' ? 'bg-red-100 text-red-800'
                    : selectedTask.priority === 'Μέτρια' ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'}`}>
                  {selectedTask.priority}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* LEFT */}
              <section className="md:col-span-7">
                <div className="rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Λεπτομέρειες</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Περιγραφή</dt>
                      <dd className="text-sm text-gray-800 mt-0.5 break-words">{selectedTask.description || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Κατάσταση</dt>
                      <dd className="text-sm text-gray-800 mt-0.5">{selectedTask.status}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Προτεραιότητα</dt>
                      <dd className="text-sm text-gray-800 mt-0.5">{selectedTask.priority}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Παράδοση</dt>
                      <dd className="text-sm text-gray-800 mt-0.5">{selectedTask.date ? new Date(selectedTask.date).toLocaleDateString('el-GR') : '—'}</dd>
                    </div>
                  </dl>

                  <div className="mt-5 rounded-lg bg-gray-50 border border-gray-200 p-4">
                    {(() => {
                      const cost = toNum(selectedTask.cost)
                      const paid = Math.min(toNum(selectedTask.paid), cost)
                      const remaining = Math.max(cost - paid, 0)
                      const pct = cost > 0 ? Math.round((paid / cost) * 100) : 0
                      return (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex items-center justify-between sm:block">
                              <div className="text-xs uppercase tracking-wide text-gray-500">Κόστος</div>
                              <div className="text-base font-semibold text-gray-900">€{cost.toFixed(2)}</div>
                            </div>
                            <div className="flex items-center justify-between sm:block">
                              <div className="text-xs uppercase tracking-wide text-gray-500">Πληρωμένο</div>
                              <div className="text-base font-semibold text-emerald-700">€{paid.toFixed(2)}</div>
                            </div>
                            <div className="flex items-center justify-between sm:block">
                              <div className="text-xs uppercase tracking-wide text-gray-500">Υπόλοιπο</div>
                              <div className={`text-base font-semibold ${remaining === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>€{remaining.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>Πρόοδος πληρωμής</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full h-2 bg-white border border-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </section>

              {/* RIGHT */}
              <section className="md:col-span-5">
                <div className="rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Πληρωμή</h3>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Ποσό πληρωμής</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="π.χ. 50.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <div className="mt-2 text-xs text-gray-600">Δεν μπορείτε να πληρώσετε πάνω από το υπόλοιπο.</div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Τρέχον υπόλοιπο</div>
                      <div className={`text-sm font-semibold mt-0.5 ${
                        Math.max(toNum(selectedTask.cost) - toNum(selectedTask.paid), 0) === 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        €{Math.max(toNum(selectedTask.cost) - toNum(selectedTask.paid), 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Μετά την πληρωμή</div>
                      {(() => {
                        const cost = toNum(selectedTask.cost)
                        const paid = toNum(selectedTask.paid)
                        const amt = toNum(paymentAmount)
                        const remaining = Math.max(cost - paid, 0)
                        const next = Math.max(remaining - (amt > 0 ? amt : 0), 0)
                        return <div className="text-sm font-semibold mt-0.5">€{next.toFixed(2)}</div>
                      })()}
                    </div>
                  </div>

                  <button
                    onClick={handleRecordPayment}
                    disabled={Math.max(toNum(selectedTask.cost) - toNum(selectedTask.paid), 0) === 0}
                    className={`w-full mt-4 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition
                      ${Math.max(toNum(selectedTask.cost) - toNum(selectedTask.paid), 0) === 0
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'}`}
                  >
                    Καταχώρηση Πληρωμής
                  </button>

                  {(selectedTask.payments?.length ?? 0) > 0 && (
                    <div className="mt-4 rounded-lg bg-white border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-gray-800">Ιστορικό πληρωμών</div>
                        <div className="text-xs text-gray-500">
                          Σύνολο: €{((selectedTask.payments ?? []).reduce((a, p) => a + (parseFloat(p.amount) || 0), 0)).toFixed(2)}
                        </div>
                      </div>
                      <div className="max-h-64 overflow-auto">
                        <ul className="space-y-1.5 text-sm text-gray-700">
                          {[...(selectedTask.payments ?? [])].reverse().map((p, idx) => (
                            <li key={`${p.at}-${idx}`} className="flex items-center justify-between">
                              <span>€{Number(p.amount).toFixed(2)}</span>
                              <span className="text-gray-500">{formatDT(p.at)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  const id = selectedTask?.id
                  setShowTaskViewModal(false)
                  setSelectedTask(null)
                  if (id != null) {
                    const el = document.getElementById(`task-${id}`)
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      el.classList.remove('blink3')
                      void el.offsetWidth
                      el.classList.add('blink3')
                      setTimeout(() => el.classList.remove('blink3'), 800)
                    }
                  }
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && editTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl">
            <h2 className="text-xl font-bold mb-6">Επεξεργασία Εργασίας</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium">Τίτλος Εργασίας</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={editTask.title ?? ''}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium">Πελάτης</label>
                <select
                  className="w-full p-2 border rounded"
                  value={String(editTask.clientId ?? '')}
                  onChange={(e) => setEditTask({ ...editTask, clientId: e.target.value })}
                >
                  <option value="">-- Επιλέξτε Πελάτη --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block font-medium">Περιγραφή</label>
                <textarea
                  className="w-full p-2 border rounded"
                  rows="3"
                  value={editTask.description ?? ''}
                  onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium">Κατάσταση</label>
                <select
                  className="w-full p-2 border rounded"
                  value={editTask.status ?? 'Σε Εξέλιξη'}
                  onChange={(e) => setEditTask({ ...editTask, status: e.target.value })}
                >
                  <option>Δεν Ξεκίνησε</option>
                  <option>Σε Εξέλιξη</option>
                  <option>Ολοκληρώθηκε</option>
                </select>
              </div>
              <div>
                <label className="block font-medium">Προτεραιότητα</label>
                <select
                  className="w-full p-2 border rounded"
                  value={editTask.priority ?? 'Μέτρια'}
                  onChange={(e) => setEditTask({ ...editTask, priority: e.target.value })}
                >
                  <option>Χαμηλή</option>
                  <option>Μέτρια</option>
                  <option>Υψηλή</option>
                </select>
              </div>
              <div>
                <label className="block font-medium">Ημερομηνία Παράδοσης</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={editTask.date ?? ''}
                  onChange={(e) => setEditTask({ ...editTask, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium">Κόστος (€)</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={editTask.cost ?? ''}
                  onChange={(e) => setEditTask({ ...editTask, cost: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-between items-center gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Διαγραφή
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowEditModal(false); setEditTask(null); }}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                >
                  Άκυρο
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Αποθήκευση
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Επιβεβαίωση Διαγραφής</h2>
            <p className="text-gray-700 mb-6">
              Σίγουρα θέλετε να διαγράψετε αυτή την εργασία; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Άκυρο
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Διαγραφή
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl">
            <h2 className="text-xl font-bold mb-6">Προσθήκη Νέας Εργασίας</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium">Τίτλος Εργασίας</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="Εισάγετε τίτλο"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium">Πελάτης</label>
                <select
                  className="w-full p-2 border rounded"
                  value={newTask.clientId}
                  onChange={(e) => setNewTask({ ...newTask, clientId: e.target.value })}
                >
                  <option value="">-- Επιλέξτε Πελάτη --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block font-medium">Περιγραφή</label>
                <textarea
                  className="w-full p-2 border rounded"
                  rows="3"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium">Κατάσταση</label>
                <select
                  className="w-full p-2 border rounded"
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                >
                  <option>Σε Εξέλιξη</option>
                  <option>Δεν Ξεκίνησε</option>
                  <option>Ολοκληρώθηκε</option>
                </select>
              </div>
              <div>
                <label className="block font-medium">Προτεραιότητα</label>
                <select
                  className="w-full p-2 border rounded"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option>Χαμηλή</option>
                  <option>Μέτρια</option>
                  <option>Υψηλή</option>
                </select>
              </div>
              <div>
                <label className="block font-medium">Ημερομηνία Παράδοσης</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={newTask.date}
                  onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-medium">Κόστος (€)</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={newTask.cost}
                  onChange={(e) => setNewTask({ ...newTask, cost: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">Άκυρο</button>
              <button onClick={handleAdd} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Αποθήκευση Εργασίας</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
