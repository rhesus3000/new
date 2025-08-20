import React, { useEffect, useState, useRef } from "react"
import axios from "axios"
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from "react-icons/fa"

export default function Pelates() {
const viewModalRef = useRef();
const taskModalRef = useRef();

const handleBackdropClick = (e) => {
  if (viewModalRef.current && !viewModalRef.current.contains(e.target)) {
    setShowViewModal(false);
  }
};

const handleTaskBackdropClick = (e) => {
  if (taskModalRef.current && !taskModalRef.current.contains(e.target)) {
    setShowTaskModal(false);
  }
};


  const [pelates, setPelates] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [clientToDelete, setClientToDelete] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [editClientId, setEditClientId] = useState(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedClientForTask, setSelectedClientForTask] = useState(null)
  const [newTask, setNewTask] = useState({})
  const [searchQuery, setSearchQuery] = useState("")
  const [tasks, setTasks] = useState([])
  const [showFullContact, setShowFullContact] = useState(false)






const handleAddTask = async () => {
  if (!newTask.title || !selectedClientForTask?.id) {
    alert("Συμπληρώστε τον τίτλο και βεβαιωθείτε ότι υπάρχει επιλεγμένος πελάτης.")
    return
  }

  const body = {
    ...newTask,
    clientId: selectedClientForTask.id,
    paid: 0,
    payments: []
  }

  try {
    const res = await axios.post("http://localhost:3000/api/tasks", body)
    const created = res.data?.task ?? res.data

    // Keep the central tasks list in sync
    setTasks(prev => [...prev, created])

    // Optional: remove local push into pelates[p].tasks to avoid stale copies
    // (You can delete the old block that pushed into p.tasks)

    setShowTaskModal(false)
    setSelectedClientForTask(null)
    setNewTask({})
  } catch (err) {
    console.error("Error adding task", err)
    alert("Αποτυχία προσθήκης εργασίας.")
  }
}





  const [newClient, setNewClient] = useState({
    name: "",
    phone: "",
    afm: "",
    company: "",
    email: "",
    notes: "",
    region: "",
  })

useEffect(() => {
  axios.get("http://localhost:3000/api/pelates").then((res) => setPelates(res.data))
  axios.get("http://localhost:3000/api/tasks").then((res) => setTasks(res.data))
}, [])



  const isValidEmail = (email) => /.+@.+\..+/.test(email)
  const isValidPhone = (phone) => /^6\d{9}$/.test(phone)
  const isValidAfm = (afm) => /^\d{9}$/.test(afm)

  const sumPaidForClient = (clientId) => {
  return tasks
    .filter(t => String(t.clientId) === String(clientId))
    .reduce((sum, t) => {
      const paid = t?.paid != null
        ? parseFloat(t.paid) || 0
        : Array.isArray(t?.payments)
          ? t.payments.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0)
          : 0
      return sum + paid
    }, 0)
}

// Total COST for this client's tasks (based on central `tasks` state)
const sumCostForClient = (clientId) =>
  tasks
    .filter((t) => String(t.clientId) === String(clientId))
    .reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)

// How many tasks are "Σε Εξέλιξη" for this client
const activeCountForClient = (clientId) =>
  tasks.filter(
    (t) => String(t.clientId) === String(clientId) && t.status === "Σε Εξέλιξη"
  ).length



const handleAddClient = async () => {
  if (!newClient.name || !newClient.email || !newClient.phone || !newClient.afm || !newClient.company) {
    alert("Συμπληρώστε τα υποχρεωτικά πεδία.")
    return
  }

  try {
    if (editClientId) {
      const res = await axios.put(`http://localhost:3000/api/pelates/${editClientId}`, newClient)
      setPelates(pelates.map(p => (String(p.id) === String(editClientId) ? res.data : p)))
    } else {
      const res = await axios.post("http://localhost:3000/api/pelates", newClient)
      setPelates([...pelates, res.data])
    }

    setShowAddModal(false)
    setEditClientId(null) // reset after save
    setNewClient({
      name: "",
      phone: "",
      afm: "",
      company: "",
      email: "",
      notes: "",
      region: "",
    })
  } catch (err) {
    console.error("Error saving client", err.response?.data || err.message)
  }
}


  const confirmDeleteClient = (id) => {
    setClientToDelete(id)
    setShowConfirmDelete(true)
  }

  const handleDeleteClient = async () => {
    try {
      await axios.delete(`http://localhost:3000/api/pelates/${clientToDelete}`)
      setPelates(pelates.filter(p => p.id !== clientToDelete))
      setShowConfirmDelete(false)
      setClientToDelete(null)
    } catch (err) {
      console.error("Error deleting client", err)
    }
  }

  return (
    <div className="p-6">
<div className="mb-4">
  <div className="flex justify-between items-center mb-8">

    <h1 className="text-2xl font-bold">Πελάτες</h1>
    <button
      onClick={() => setShowAddModal(true)}
      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow"
    >
      + Προσθήκη Πελάτη
    </button>
  </div>
  <div className="mb-8">
  <input
    type="text"
    placeholder="Αναζήτηση πελάτη..."
    className="w-full p-2 border border-gray-300 rounded"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
  </div>
</div>


<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
  {pelates
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.afm.includes(searchQuery) ||
      p.phone.includes(searchQuery) ||
      p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map((p, i) => {
      // compute values from central `tasks`
      const clientTasks = tasks.filter(t => String(t.clientId) === String(p.id))
      const paid = clientTasks.reduce((sum, t) => {
        const direct = t?.paid != null ? parseFloat(t.paid) || 0 : 0
        const fromArray = Array.isArray(t?.payments)
          ? t.payments.reduce((a, pp) => a + (parseFloat(pp.amount) || 0), 0)
          : 0
        return sum + (direct || fromArray)
      }, 0)
      const cost = clientTasks.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0)
      const outstanding = Math.max(cost - paid, 0)
      const pct = cost > 0 ? Math.min(100, Math.round((paid / cost) * 100)) : 0
      const active = clientTasks.filter(t => t.status === "Σε Εξέλιξη").length

      const borderTone =
        outstanding === 0 ? "border-emerald-200" : paid > 0 ? "border-amber-200" : "border-gray-200"
      const ringTone =
        outstanding === 0 ? "ring-emerald-100" : paid > 0 ? "ring-amber-100" : "ring-gray-100"
      const statusBadge =
        outstanding === 0
          ? "bg-emerald-100 text-emerald-800"
          : paid > 0
          ? "bg-amber-100 text-amber-800"
          : "bg-gray-100 text-gray-700"

      return (
        <div
          key={String(p.id ?? i)}
          className={`relative bg-white rounded-2xl border ${borderTone} ring-1 ${ringTone} p-4 shadow-sm hover:shadow-md transition`}
        >
          {/* Kebab menu */}
          <button
            onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            aria-label="menu"
          >
            ⋯
          </button>

          {openMenu === p.id && (
            <div className="absolute right-3 top-9 bg-white border rounded-lg shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => {
                  setNewClient(p)
                  setEditClientId(p.id)
                  setShowAddModal(true)
                  setOpenMenu(null)
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                ✏️ Επεξεργασία
              </button>
              <button
                onClick={() => confirmDeleteClient(p.id)}
                className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
              >
                🗑️ Διαγραφή
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-gray-900 truncate" title={p.name}>
                {p.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-medium">
                  Ενεργός
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadge}`}>
                  {outstanding === 0 ? "Εξοφλημένος" : paid > 0 ? "Μερική πληρωμή" : "Καμία πληρωμή"}
                </span>
              </div>
            </div>
          </div>

          {/* Compact contact */}
          <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs text-gray-700">
            <div className="flex items-center gap-2 min-w-0">
              <FaEnvelope className="text-gray-400 shrink-0" />
              <a href={p.email ? `mailto:${p.email}` : undefined} className="truncate hover:underline">
                {p.email || "—"}
              </a>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <FaPhone className="text-gray-400 shrink-0" />
              <a href={p.phone ? `tel:${p.phone}` : undefined} className="truncate hover:underline">
                {p.phone || "—"}
              </a>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <FaMapMarkerAlt className="text-gray-400 shrink-0" />
              <span className="truncate">{p.region || "—"}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="text-[11px] text-gray-500">Πληρωμές</div>
              <div className="text-sm font-semibold text-gray-900">€{paid.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="text-[11px] text-gray-500">Υπόλοιπο</div>
              <div className={`text-sm font-semibold ${outstanding === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                €{outstanding.toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="text-[11px] text-gray-500">Σε εξέλιξη</div>
              <div className="text-sm font-semibold text-gray-900">{active}</div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
              <span>Πρόοδος πληρωμής</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-2 ${outstanding === 0 ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-4 flex gap-2">
            <button
              className="w-1/2 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
              onClick={() => {
                setSelectedClient(p)
                setShowViewModal(true)
              }}
            >
              Προβολή
            </button>
            <button
              className="w-1/2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
              onClick={() => {
                setSelectedClientForTask(p)
                setShowTaskModal(true)
              }}
            >
              + Εργασία
            </button>
          </div>
        </div>
      )
    })}
</div>


{showViewModal && selectedClient && (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
    onClick={handleBackdropClick}
  >
    <div
      ref={viewModalRef}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col"
    >
      {(() => {
        // ---------- derive everything from central tasks ----------
        const clientTasks = tasks.filter(
          (t) => String(t.clientId) === String(selectedClient.id)
        )

        const totals = clientTasks.reduce(
          (acc, t) => {
            const cost = Number(t.cost) || 0
            const paid =
              t?.paid != null
                ? Number(t.paid) || 0
                : Array.isArray(t?.payments)
                ? t.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0)
                : 0
            acc.cost += cost
            acc.paid += paid
            return acc
          },
          { cost: 0, paid: 0 }
        )
        const outstanding = Math.max(totals.cost - totals.paid, 0)
        const activeCount = clientTasks.filter((t) => t.status === 'Σε Εξέλιξη').length
        const initial =
          (selectedClient.name?.[0] || selectedClient.company?.[0] || 'Π').toUpperCase()

        // recent payments across all tasks (max 6)
        const recent = clientTasks
          .flatMap(t => (Array.isArray(t.payments) ? t.payments.map(p => ({ ...p, taskTitle: t.title || '—' })) : []))
          .sort((a, b) => new Date(b.at) - new Date(a.at))
          .slice(0, 6)

        const fmtDT = (iso) => {
          try { return new Date(iso).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' }) }
          catch { return iso || '—' }
        }

        return (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold truncate">{selectedClient.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                        Ενεργός
                      </span>
                      <span className="text-gray-500">
                        Πελάτης από {selectedClient.createdAt?.slice(0, 10) || 'Άγνωστο'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowViewModal(false)}
                  className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>


            {/* Content */}
            <div className="flex-1 p-6 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full min-h-0">

                {/* LEFT: Contact (md: 4 cols) */}
                <section className="md:col-span-4">
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-2.5 border-b bg-gray-50">
                      <h3 className="font-semibold text-gray-800 text-sm">Στοιχεία Επικοινωνίας</h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-gray-400">📧</span>
                          <a
                            href={selectedClient.email ? `mailto:${selectedClient.email}` : undefined}
                            className="font-medium text-gray-800 truncate hover:underline"
                          >
                            {selectedClient.email || '—'}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-gray-400">📞</span>
                          <a
                            href={selectedClient.phone ? `tel:${selectedClient.phone}` : undefined}
                            className="font-medium text-gray-800 truncate hover:underline"
                          >
                            {selectedClient.phone || '—'}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-gray-400">📍</span>
                          <span className="font-medium text-gray-800 truncate">
                            {selectedClient.region || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-gray-400">🏢</span>
                          <span className="font-medium text-gray-800 truncate">
                            {selectedClient.company || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-gray-400">🧾</span>
                          <span className="font-medium text-gray-800 truncate">
                            {selectedClient.afm || '—'}
                          </span>
                        </div>


                        {/* Notes - small, trimmed */}
                        <div className="pt-1">
                          <div className="text-[11px] text-gray-500 mb-1">Σημειώσεις</div>
                          <div
                            className="text-xs font-medium text-gray-800 bg-gray-50 rounded-lg p-2 line-clamp-2"
                            title={selectedClient.notes || ''}
                          >
                            {selectedClient.notes || '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>



                  {/* Quick metrics (small cards) */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-xl border border-gray-200 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Πληρωμές</div>
                      <div className="mt-0.5 text-lg font-semibold">€{totals.paid.toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Υπόλοιπο</div>
                      <div className={`mt-0.5 text-lg font-semibold ${outstanding === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        €{outstanding.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {/* Task Status Distribution – Pie (Donut) */}
<div className="rounded-2xl border border-gray-200 overflow-hidden mt-4">
  <div className="px-5 py-2.5 border-b bg-gray-50">
    <h3 className="font-semibold text-gray-800 text-sm">Κατάσταση εργασιών</h3>
  </div>
  <div className="p-4">
    {(() => {
      // Tally
      const counts = { 'Δεν Ξεκίνησε': 0, 'Σε Εξέλιξη': 0, 'Ολοκληρώθηκε': 0 }
      clientTasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })

      const total = clientTasks.length
      const parts = [
        { label: 'Δεν Ξεκίνησε', color: '#d1d5db', value: counts['Δεν Ξεκίνησε'] || 0 },
        { label: 'Σε Εξέλιξη',   color: '#60a5fa', value: counts['Σε Εξέλιξη']   || 0 },
        { label: 'Ολοκληρώθηκε', color: '#34d399', value: counts['Ολοκληρώθηκε'] || 0 },
      ]
      const show = parts.filter(p => p.value > 0)

      if (total === 0) {
        return <div className="text-xs text-gray-500">Δεν υπάρχουν εργασίες.</div>
      }

      // Donut geometry
      const size = 140
      const cx = size / 2
      const cy = size / 2
      const r = 52
      const stroke = 14
      const C = 2 * Math.PI * r

      // Build segments using strokeDasharray / strokeDashoffset
      let acc = 0 // cumulative fraction start
      const segs = show.map((p) => {
        const frac = p.value / total
        const len = C * frac
        const offset = -C * acc
        acc += frac
        return { ...p, len, offset, frac }
      })

      const pctDone = Math.round(((counts['Ολοκληρώθηκε'] || 0) / total) * 100)

      return (
        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative">
            <svg width={size} height={size} className="-rotate-90">
              {/* track */}
              <circle
                cx={cx} cy={cy} r={r}
                fill="transparent"
                stroke="#e5e7eb"
                strokeWidth={stroke}
              />
              {/* segments */}
              {segs.map((s, i) => (
                <circle
                  key={i}
                  cx={cx} cy={cy} r={r}
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${s.len} ${C}`}
                  strokeDashoffset={s.offset}
                  strokeLinecap="butt"
                />
              ))}
            </svg>

            {/* center label (upright) */}
            <div className="absolute inset-0 flex items-center justify-center rotate-90">
              
            </div>
          </div>

          {/* legend */}
          <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
            {parts.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                <span className="min-w-[110px]">{p.label}</span>
                <span className="font-medium">({p.value})</span>
              </div>
            ))}
          </div>
        </div>
      )
    })()}
  </div>
</div>

                </section>



                {/* MIDDLE: Financial + Activity (md: 4 cols) */}
                <section className="md:col-span-4">
                  {/* Totals */}
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-2.5 border-b bg-gray-50">
                      <h3 className="font-semibold text-gray-800 text-sm">Οικονομικά</h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Συνολικό Κόστος</div>
                        <div className="mt-0.5 font-semibold text-gray-900">€{totals.cost.toFixed(2)}</div>
                      </div>
                      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Σε Εξέλιξη</div>
                        <div className="mt-0.5 font-semibold text-gray-900">{activeCount}</div>
                      </div>
                    </div>
                  </div>



                  {/* Recent payments */}
                  <div className="rounded-2xl border border-gray-200 overflow-hidden mt-4">
                    <div className="px-5 py-2.5 border-b bg-gray-50">
                      <h3 className="font-semibold text-gray-800 text-sm">Πρόσφατες πληρωμές</h3>
                    </div>
                    {recent.length === 0 ? (
                      <div className="p-4 text-xs text-gray-500">Δεν υπάρχουν πληρωμές ακόμη.</div>
                    ) : (
                      <div className="p-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="px-2 py-1">Ημερομηνία</th>
                              <th className="px-2 py-1">Εργασία</th>
                              <th className="px-2 py-1 text-right">Ποσό</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recent.map((p, i) => (
                              <tr key={i} className="odd:bg-white even:bg-gray-50">
                                <td className="px-2 py-1">{fmtDT(p.at)}</td>
                                <td className="px-2 py-1 truncate">{p.taskTitle}</td>
                                <td className="px-2 py-1 text-right font-medium">€{Number(p.amount || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>


                {/* RIGHT: Tasks (md: 4 cols) */}
                <section className="md:col-span-4 h-full min-h-0 flex">

                  <div className="rounded-2xl border border-gray-200 overflow-hidden h-full min-h-0 flex flex-col">

                    <div className="px-5 py-2.5 border-b bg-gray-50 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 text-sm">Εργασίες</h3>
                      <span className="text-[11px] text-gray-500">{clientTasks.length}</span>
                    </div>

                    {clientTasks.length === 0 ? (
                      <div className="p-5 text-sm text-gray-500">Δεν υπάρχουν καταχωρημένες εργασίες.</div>
                    ) : (
                      <div className="flex-1 overflow-y-auto">
                        {clientTasks
                          .sort((a, b) => (new Date(b.createdAt || b.date || 0)) - (new Date(a.createdAt || a.date || 0)))
                          .map((t, idx) => {
                            const cost = Number(t.cost) || 0
                            const paid =
                              t?.paid != null
                                ? Number(t.paid) || 0
                                : Array.isArray(t?.payments)
                                ? t.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0)
                                : 0
                            const remaining = Math.max(cost - paid, 0)
                            const pct = cost > 0 ? Math.round(Math.min(100, (paid / cost) * 100)) : 0

                            return (
                              <div key={idx} className="p-4 border-b last:border-b-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-gray-900 truncate">{t.title || 'Χωρίς τίτλο'}</p>
                                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold
                                        ${t.status === 'Σε Εξέλιξη'
                                          ? 'bg-blue-100 text-blue-800'
                                          : t.status === 'Ολοκληρώθηκε'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-gray-100 text-gray-700'}`}>
                                        {t.status || '—'}
                                      </span>
                                      <span className={`text-[11px] px-2 py-0.5 rounded-full
                                        ${remaining === 0 ? 'bg-emerald-100 text-emerald-800' : paid > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                                        {remaining === 0 ? 'Εξοφλήθηκε' : paid > 0 ? 'Μερική πληρωμή' : 'Καμία πληρωμή'}
                                      </span>
                                    </div>
<p className="text-xs text-gray-500 mt-1">
  Προτεραιότητα: {t.priority || '—'} • Δημιουργήθηκε: {t.createdAt ? new Date(t.createdAt).toLocaleDateString('el-GR') : '—'}
</p>

                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="text-[11px] text-gray-500">Κόστος</div>
                                    <div className="font-semibold text-gray-900">€{cost.toFixed(2)}</div>
                                  </div>
                                </div>

                                {/* Payment progress */}
                                <div className="mt-3">
                                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                                    <span>Πληρωμένο: €{paid.toFixed(2)}</span>
                                    <span>Υπόλοιπο: €{remaining.toFixed(2)}</span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-2 ${remaining === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  </div>
)}



      {showTaskModal && (
  <div
  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  onClick={handleTaskBackdropClick}
>

    <div
  ref={taskModalRef}
  className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl"
>

      <h2 className="text-xl font-bold mb-6">Προσθήκη Νέας Εργασίας</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div>
          <label className="block font-medium">Τίτλος Εργασίας</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
        </div>

        {/* Status */}
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

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block font-medium">Περιγραφή</label>
          <textarea
            className="w-full p-2 border rounded"
            rows="3"
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
        </div>

        {/* Priority */}
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

        {/* Date */}
        <div>
          <label className="block font-medium">Ημερομηνία Παράδοσης</label>
          <input
            type="date"
            className="w-full p-2 border rounded"
            onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
          />
        </div>

        {/* Cost */}
        <div>
          <label className="block font-medium">Κόστος (€)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            onChange={(e) => setNewTask({ ...newTask, cost: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => setShowTaskModal(false)}
          className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
        >
          Άκυρο
        </button>
        <button
          onClick={handleAddTask}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Αποθήκευση Εργασίας
        </button>

      </div>
    </div>
  </div>
)}


      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative">
            <h2 className="text-xl font-bold mb-4">Νέος Πελάτης</h2>
            {[{ label: "Όνομα *", key: "name", required: true }, { label: "Τηλέφωνο *", key: "phone", required: true, error: !isValidPhone(newClient.phone), message: "Πρέπει να ξεκινάει από 6 και να έχει 10 ψηφία." }, { label: "ΑΦΜ *", key: "afm", required: true, error: !isValidAfm(newClient.afm), message: "Πρέπει να έχει 9 ψηφία." }, { label: "Εταιρεία *", key: "company", required: true }, { label: "Email *", key: "email", required: true, error: !isValidEmail(newClient.email), message: "Μη έγκυρη διεύθυνση email." }, { label: "Περιοχή", key: "region" }].map(({ label, key, error, message }) => (
              <div key={key} className="mb-2">
                <label className="block font-medium">{label}</label>
                <input
                  type="text"
                  className={`w-full p-2 border rounded ${error ? "border-red-500" : ""}`}
                  value={newClient[key]}
                  onChange={(e) => setNewClient({ ...newClient, [key]: e.target.value })}
                />
                {error && <div className="text-red-500 text-sm">{message}</div>}
              </div>
            ))}
            <div className="mb-4">
              <label className="block font-medium">Σημειώσεις</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                value={newClient.notes}
                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">Άκυρο</button>
              <button onClick={handleAddClient} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Αποθήκευση</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm text-center">
            <h2 className="text-lg font-bold mb-4">Επιβεβαίωση Διαγραφής</h2>
            <p className="mb-6">Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον πελάτη;</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowConfirmDelete(false)} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">Όχι</button>
              <button onClick={handleDeleteClient} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Ναι, Διαγραφή</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}