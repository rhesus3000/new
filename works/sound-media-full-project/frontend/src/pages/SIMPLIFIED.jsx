import React, { useEffect, useState } from "react"
import axios from "axios"
import {
  FaUsers,
  FaTasks,
  FaCheckCircle,
  FaSpinner,
  FaClock,
  FaEuroSign,
} from "react-icons/fa"

// Calendar imports
import { Calendar, dateFnsLocalizer } from "react-big-calendar"
import format from "date-fns/format"
import parse from "date-fns/parse"
import startOfWeek from "date-fns/startOfWeek"
import getDay from "date-fns/getDay"
import "react-big-calendar/lib/css/react-big-calendar.css"
import el from "date-fns/locale/el"

const locales = { "el-GR": el }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

export default function SIMPLIFIED({ showTitle = false }) {

  const [clients, setClients] = useState([])
  const [totalCost, setTotalCost] = useState(0)
  const [inProgressCount, setInProgressCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [notStartedCount, setNotStartedCount] = useState(0)
  const [showStatusPopup, setShowStatusPopup] = useState(false)
  const [filteredTasks, setFilteredTasks] = useState([])
  const [events, setEvents] = useState([])

  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showPaidPopup, setShowPaidPopup] = useState(false)
  const [paidTasks, setPaidTasks] = useState([])
  const [paidSearch, setPaidSearch] = useState("")
  const [statusSearch, setStatusSearch] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")

  const toNum = (v) => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }

  const formatDT = (iso) => {
    try {
      return new Date(iso).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })
    } catch {
      return iso || "—"
    }
  }

  const openPaidPopup = () => {
    const rows = []
    clients.forEach((c) => {
      ;(c.tasks || []).forEach((t) => {
        const cost = Number(t.cost) || 0
        const paid =
          t?.paid != null
            ? Number(t.paid) || 0
            : Array.isArray(t?.payments)
            ? t.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0)
            : 0

        if (paid > 0) {
          const remaining = Math.max(cost - paid, 0)
          const lastPayAt =
            Array.isArray(t?.payments) && t.payments.length
              ? t.payments[t.payments.length - 1].at
              : null

          rows.push({
            id: t.id,
            title: t.title,
            clientName: c.name,
            cost,
            paid,
            remaining,
            status: t.status,
            date: t.date,
            lastPayAt,
          })
        }
      })
    })

    rows.sort((a, b) => b.paid - a.paid)
    setPaidTasks(rows)
    setShowPaidPopup(true)
  }

  useEffect(() => {
    axios.get("http://localhost:3000/api/pelates").then((res) => {
      setClients(res.data)

      let paidTotal = 0
      let inProgress = 0
      let completed = 0
      let notStarted = 0
      let allEvents = []

      res.data.forEach((c) => {
        if (!c.tasks) return
        c.tasks.forEach((t) => {
          const paid =
            t?.paid != null
              ? Number(t.paid) || 0
              : Array.isArray(t?.payments)
              ? t.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0)
              : 0
          paidTotal += paid

          if (t.status === "Σε Εξέλιξη") inProgress++
          else if (t.status === "Ολοκληρώθηκε") completed++
          else if (t.status === "Δεν Ξεκίνησε") notStarted++

          if (t.date) {
            allEvents.push({
              ...t,
              title: `${t.title} (${c.name})`,
              clientName: c.name,
              start: new Date(t.date),
              end: new Date(t.date),
              allDay: true,
            })
          }
        })
      })

      setEvents(allEvents)
      setTotalCost(paidTotal) // now stores PAID total
      setInProgressCount(inProgress)
      setCompletedCount(completed)
      setNotStartedCount(notStarted)
    })
  }, [])

  const handleRecordPayment = async () => {
    if (!selectedTask) return

    const cost = toNum(selectedTask.cost)
    const alreadyPaid = toNum(selectedTask.paid)
    const remaining = Math.max(cost - alreadyPaid, 0)
    const amt = toNum(paymentAmount)

    if (amt <= 0 || amt > remaining) {
      alert("Μη έγκυρο ποσό.")
      return
    }

    try {
      const res = await axios.post(
        `http://localhost:3000/api/tasks/${encodeURIComponent(String(selectedTask.id))}/payments`,
        { amount: amt }
      )
      const saved = res.data?.task ?? res.data

      setSelectedTask(saved)
      setPaymentAmount("")

      setClients((prev) =>
        prev.map((c) => {
          const targetClientId = saved.clientId ?? selectedTask.clientId
          if (String(c.id) !== String(targetClientId)) return c
          return {
            ...c,
            tasks: (c.tasks || []).map((tt) => (String(tt.id) === String(saved.id) ? saved : tt)),
          }
        })
      )
    } catch (err) {
      const msg = err?.response?.data?.message || "Πρόβλημα στην καταχώρηση πληρωμής."
      alert(msg)
    }
  }

  const taskCount = inProgressCount + completedCount + notStartedCount

  const handleStatusClick = (status) => {
    const tasks = []
    clients.forEach((client) => {
      if (client.tasks) {
        client.tasks.forEach((t) => {
          if (t.status === status) {
            tasks.push({ ...t, clientName: client.name })
          }
        })
      }
    })
    setFilteredTasks(tasks)
    setShowStatusPopup(true)
  }

  const handleEventClick = (event) => {
    setSelectedTask(event)
    setShowTaskModal(true)
  }

  return (
    <div className="p-6">
      {showTitle && <h1 className="text-2xl font-bold mb-6">Πίνακας Ελέγχου</h1>}


      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-md p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FaUsers className="text-xl text-blue-500" />
            <h2 className="text-lg font-semibold">Σύνολο Πελατών</h2>
          </div>
          <div className="text-2xl font-bold">{clients.length}</div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FaTasks className="text-xl text-purple-500" />
            <h2 className="text-lg font-semibold">Κατάσταση Εργασιών</h2>
          </div>
          <div className="text-center space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span
                className="flex items-center gap-2 text-yellow-600 cursor-pointer hover:underline"
                onClick={() => handleStatusClick("Σε Εξέλιξη")}
              >
                <FaSpinner /> Σε Εξέλιξη
              </span>
              <span className="font-semibold">{inProgressCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-green-600">
                <FaCheckCircle /> Ολοκληρώθηκε
              </span>
              <span className="font-semibold">{completedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-600">
                <FaClock /> Δεν Ξεκίνησε
              </span>
              <span className="font-semibold">{notStartedCount}</span>
            </div>
            <hr className="my-2" />
            <div className="flex items-center justify-between font-bold text-blue-800">
              <span>Σύνολο</span>
              <span>{taskCount}</span>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-2xl shadow-md p-6 text-center cursor-pointer hover:shadow-lg transition"
          onClick={openPaidPopup}
          title="Προβολή αναλυτικών πληρωμών"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <FaEuroSign className="text-xl text-green-500" />
            <h2 className="text-lg font-semibold">Έχουν Αποδοθεί</h2>
          </div>
          <div className="text-2xl font-bold">€{totalCost.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Προβολή αναλυτικά</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="mt-8 bg-white rounded-2xl shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">Ημερολόγιο</h2>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          messages={{
            next: "Επόμενος μήνας",
            previous: "Προηγούμενος μήνας",
            today: "Σήμερα",
            month: "Μήνας",
            week: "Εβδομάδα",
            day: "Ημέρα",
            agenda: "Ατζέντα",
          }}
          onSelectEvent={handleEventClick}
        />
      </div>

      {/* Paid popup */}
      {showPaidPopup && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-sm"
            onClick={() => setShowPaidPopup(false)}
          />
          <div className="relative mx-auto mt-12 w-[92vw] max-w-5xl">
            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-2xl ring-1 ring-black/5 max-h-[85vh] flex flex-col">
              <div className="relative">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400" />
                <div className="flex items-start justify-between p-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Αναλυτικά Πληρωμένων Εργασιών</h3>
                    <p className="mt-1 text-sm text-gray-500">Όλες οι εργασίες με καταχωρημένες πληρωμές.</p>
                  </div>
                  <button
                    onClick={() => setShowPaidPopup(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-blue-50"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Chips + Search */}
                {(() => {
                  const totalPaidSum = (paidTasks ?? []).reduce((a, t) => a + (Number(t.paid) || 0), 0)
                  return (
                    <div className="px-6 pb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          Σύνολο εργασιών: {(paidTasks ?? []).length}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Σύνολο πληρωμών: €{totalPaidSum.toFixed(2)}
                        </span>
                        <div className="ml-auto w-full sm:w-72">
                          <input
                            type="text"
                            value={paidSearch}
                            onChange={(e) => setPaidSearch(e.target.value)}
                            placeholder="Αναζήτηση (τίτλος/πελάτης)…"
                            className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm shadow-inner focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Table */}
              {(() => {
                const q = paidSearch.trim().toLowerCase()
                const visible = (paidTasks ?? []).filter((t) => {
                  const title = (t.title || "").toLowerCase()
                  const client = (t.clientName || "").toLowerCase()
                  return !q || title.includes(q) || client.includes(q)
                })

                const badge = (status) =>
                  status === "Ολοκληρώθηκε"
                    ? "bg-emerald-100 text-emerald-800"
                    : status === "Σε Εξέλιξη"
                    ? "bg-sky-100 text-sky-800"
                    : "bg-gray-100 text-gray-700"

                return (
                  <div className="max-h-[65vh] overflow-y-auto px-2 sm:px-0">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 z-10 border-y bg-white/95 backdrop-blur">
                        <tr className="text-gray-500">
                          <th className="px-4 py-3 text-left font-medium">Εργασία</th>
                          <th className="px-4 py-3 text-left font-medium">Πελάτης</th>
                          <th className="px-4 py-3 text-right font-medium">Πληρωμένο</th>
                          <th className="px-4 py-3 text-right font-medium">Υπόλοιπο</th>
                          <th className="px-4 py-3 text-left font-medium">Ημερομηνία</th>
                          <th className="px-4 py-3 text-left font-medium">Κατάσταση</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {visible.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                              Καμία εγγραφή.
                            </td>
                          </tr>
                        ) : (
                          visible.map((t, i) => {
                            const cost = Number(t.cost) || 0
                            const paid = Number(t.paid) || 0
                            const remaining = Math.max(cost - paid, 0)
                            return (
                              <tr
                                key={`${t.id}-${i}`}
                                className="odd:bg-white even:bg-gray-50 hover:bg-blue-50/60 transition-colors"
                              >
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  <div className="truncate max-w-[24ch]" title={t.title}>
                                    {t.title || "—"}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  <div className="truncate max-w-[22ch]" title={t.clientName}>
                                    {t.clientName || "—"}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                  €{paid.toFixed(2)}
                                </td>
                                <td className={`px-4 py-3 text-right font-semibold ${remaining === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                  €{remaining.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {t.date ? new Date(t.date).toLocaleDateString("el-GR") : "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge(t.status)}`}>
                                    {t.status || "—"}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              })()}

              <div className="flex items-center justify-end gap-3 p-5">
                <button
                  onClick={() => setShowPaidPopup(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-blue-50"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status popup */}
      {showStatusPopup && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-sm"
            onClick={() => setShowStatusPopup(false)}
          />
          <div className="relative mx-auto mt-12 w-[94vw] max-w-6xl">
            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-2xl ring-1 ring-black/5 max-h-[85vh] flex flex-col">
              <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-blue-400 to-emerald-400 shrink-0" />
              <div className="flex flex-wrap items-start gap-4 p-6 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900">Εργασίες σε Εξέλιξη</h3>
                  <p className="mt-1 text-sm text-gray-500">Λίστα με αναζήτηση και γρήγορη προεπισκόπηση.</p>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    Σύνολο: {filteredTasks.length}
                  </span>
                </div>
                <div className="w-full sm:w-72 ml-auto">
                  <input
                    type="text"
                    value={statusSearch}
                    onChange={(e) => setStatusSearch(e.target.value)}
                    placeholder="Αναζήτηση (τίτλος/πελάτης)…"
                    className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm shadow-inner focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button
                  onClick={() => setShowStatusPopup(false)}
                  className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-blue-50"
                  aria-label="Close"
                  title="Κλείσιμο"
                >
                  ×
                </button>
              </div>

              {(() => {
                const q = statusSearch.trim().toLowerCase()
                const visible = (filteredTasks ?? []).filter((t) => {
                  const title = (t.title || "").toLowerCase()
                  const client = (t.clientName || "").toLowerCase()
                  return !q || title.includes(q) || client.includes(q)
                })

                const priorityChip = (p) =>
                  p === "Υψηλή" ? "bg-red-100 text-red-800"
                  : p === "Μέτρια" ? "bg-yellow-100 text-yellow-800"
                  : "bg-emerald-100 text-emerald-800"

                const fmt = (d) => (d ? new Date(d).toLocaleDateString("el-GR") : "—")

                return (
                  <div className="px-6 pb-6 grow overflow-y-auto overscroll-contain">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visible.map((t, i) => {
                        const cost = Number(t.cost) || 0
                        const paid = t?.paid != null
                          ? (Number(t.paid) || 0)
                          : Array.isArray(t?.payments)
                            ? t.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0)
                            : 0
                        const remaining = Math.max(cost - paid, 0)
                        const pct = cost > 0 ? Math.round(Math.min(100, (paid / cost) * 100)) : 0
                        const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("el-GR") : "—")

                        return (
                          <button
                            key={`${t.id}-${i}`}
                            onClick={() => {
                              setShowStatusPopup(false)
                              setSelectedTask(t)
                              setShowTaskModal(true)
                            }}
                            className="group text-left rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm transition hover:shadow-md hover:bg-blue-50/40"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-gray-900" title={t.title}>
                                  {t.title || "—"}
                                </div>
                                <div className="mt-1 text-sm text-gray-600 truncate" title={t.clientName}>
                                  {t.clientName || "—"}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${priorityChip(t.priority)}`}>
                                  {t.priority || "—"}
                                </span>
                                <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                                  {t.status || "—"}
                                </span>
                              </div>
                            </div>

                            {t.description ? (
                              <p className="mt-2 line-clamp-2 text-xs text-gray-600">{t.description}</p>
                            ) : null}

                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                              <div className="rounded-lg bg-emerald-50 px-2 py-1 text-right">
                                <div className="font-semibold text-emerald-700">€{paid.toFixed(2)}</div>
                                <div className="text-[10px] text-emerald-700/80">Πληρωμένο</div>
                              </div>
                              <div className="rounded-lg bg-rose-50 px-2 py-1 text-right">
                                <div className={`font-semibold ${remaining === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                  €{remaining.toFixed(2)}
                                </div>
                                <div className="text-[10px] text-rose-700/80">Υπόλοιπο</div>
                              </div>
                              <div className="rounded-lg bg-blue-50 px-2 py-1 text-right">
                                <div className="font-semibold text-blue-700">€{cost.toFixed(2)}</div>
                                <div className="text-[10px] text-blue-700/80">Κόστος</div>
                              </div>
                            </div>

                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                              <div className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-400" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                              <span>Ημερομηνία Παράδοσης: {fmtDate(t.date)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                              <span>
                                Δημιουργήθηκε στις:{" "}
                                <span className="font-semibold text-gray-700">
                                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString("el-GR") : "—"}
                                </span>
                              </span>
                              <span>{pct}%</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <div className="flex items-center justify-end gap-3 px-6 pb-6">
                <button
                  onClick={() => setShowStatusPopup(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-blue-50"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 md:p-7 rounded-2xl shadow-2xl w-full max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{selectedTask.title}</h2>
                <p className="text-gray-700 text-sm mt-1">
                  Πελάτης: <span className="font-medium">{selectedTask.clientName || "Άγνωστος Πελάτης"}</span>
                </p>
                <p className="text-gray-500 text-xs">
                  {selectedTask.date ? new Date(selectedTask.date).toLocaleDateString("el-GR") : "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  {selectedTask.status}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                    ${selectedTask.priority === "Υψηλή" ? "bg-red-100 text-red-800"
                    : selectedTask.priority === "Μέτρια" ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"}`}
                >
                  {selectedTask.priority}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <section className="md:col-span-7">
                <div className="rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Λεπτομέρειες</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Περιγραφή</dt>
                      <dd className="text-sm text-gray-800 mt-0.5 break-words">{selectedTask.description || "—"}</dd>
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
                      <dd className="text-sm text-gray-800 mt-0.5">
                        {selectedTask.date ? new Date(selectedTask.date).toLocaleDateString("el-GR") : "—"}
                      </dd>
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
                              <div className={`text-base font-semibold ${remaining === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                €{remaining.toFixed(2)}
                              </div>
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
                    {(() => {
                      const cost = toNum(selectedTask.cost)
                      const paid = toNum(selectedTask.paid)
                      const remaining = Math.max(cost - paid, 0)
                      const next = Math.max(remaining - toNum(paymentAmount || 0), 0)
                      return (
                        <>
                          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                            <div className="text-[11px] uppercase tracking-wide text-gray-500">Τρέχον υπόλοιπο</div>
                            <div className={`text-sm font-semibold mt-0.5 ${remaining === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                              €{remaining.toFixed(2)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                            <div className="text-[11px] uppercase tracking-wide text-gray-500">Μετά την πληρωμή</div>
                            <div className="text-sm font-semibold mt-0.5">€{next.toFixed(2)}</div>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  <button
                    onClick={handleRecordPayment}
                    disabled={Math.max(toNum(selectedTask.cost) - toNum(selectedTask.paid), 0) === 0}
                    className={`w-full mt-4 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition
                      ${Math.max(toNum(selectedTask.cost) - toNum(selectedTask.paid), 0) === 0
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-sm"}`}
                  >
                    Καταχώρηση Πληρωμής
                  </button>

                  <div className="mt-4">
                    {Math.max(toNum(selectedTask.cost) - toNum(selectedTask.paid), 0) === 0 ? (
                      <span className="inline-flex px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                        Εξοφλήθηκε
                      </span>
                    ) : toNum(selectedTask.paid) > 0 ? (
                      <span className="inline-flex px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                        Μερική πληρωμή
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">
                        Καμία πληρωμή
                      </span>
                    )}
                  </div>

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
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-blue-50 text-sm font-medium">
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
