import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from "recharts"
import { FaUsers } from "react-icons/fa"

// ===== Helpers =====
const toNum = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0)
const fmtEUR = (n) => `€${toNum(n).toFixed(2)}`
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("el-GR") : "—")
const monthKey = (d) => {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
}
const weekKey = (d) => {
  const date = new Date(d)
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}
// paid helper: prefer explicit paid, else sum of payments; cap by cost
const taskPaid = (t) => {
  const cost = toNum(t.cost)
  const byField = t?.paid != null ? toNum(t.paid) : 0
  const byPayments = Array.isArray(t?.payments) ? t.payments.reduce((a, p) => a + toNum(p.amount), 0) : 0
  return Math.min(cost, Math.max(byField, byPayments))
}

// ===== UI atoms =====
const Card = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-md border border-gray-100 ${className}`}>
    {title ? (
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
    ) : null}
    <div className="p-5">{children}</div>
  </div>
)

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${
      active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50"
    }`}
  >
    {children}
  </button>
)

export default function DETAILED({ showTitle = false }) {

  const [clients, setClients] = useState([])
  const [tab, setTab] = useState("analytics") // analytics | payments | deadlines | clients

  // Filters
  const [preset, setPreset] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [payState, setPayState] = useState("all") // all | paid | partial | unpaid
  const [search, setSearch] = useState("")

  useEffect(() => {
    axios.get("http://localhost:3000/api/pelates").then((res) => setClients(res.data))
  }, [])

  // Flatten tasks with client metadata
  const allTasks = useMemo(() => {
    const out = []
    clients.forEach((c) => {
      (c.tasks || []).forEach((t) => {
        const paid = taskPaid(t)
        const cost = toNum(t.cost)
        out.push({
          ...t,
          clientId: c.id,
          clientName: c.name,
          cost,
          paid,
          remaining: Math.max(cost - paid, 0),
          due: t.date, // rule: due date = payment due date
          lastPayAt: (t.payments || []).length ? t.payments[t.payments.length - 1].at : null,
        })
      })
    })
    return out
  }, [clients])

  // Preset -> date window
  const computedRange = useMemo(() => {
    const now = new Date()
    const startOfWeek = () => {
      const d = new Date(now)
      const day = (d.getDay() + 6) % 7 // Mon=0
      d.setDate(d.getDate() - day); d.setHours(0,0,0,0); return d
    }
    const startOfMonth = () => new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfQuarter = () => new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const startOfYear = () => new Date(now.getFullYear(), 0, 1)
    const endToday = () => { const d = new Date(now); d.setHours(23,59,59,999); return d }

    let f = null, t = null
    switch (preset) {
      case "today": f = new Date(); f.setHours(0,0,0,0); t = endToday(); break
      case "thisWeek": f = startOfWeek(); t = endToday(); break
      case "last7": f = new Date(now); f.setDate(f.getDate() - 6); f.setHours(0,0,0,0); t = endToday(); break
      case "thisMonth": f = startOfMonth(); t = endToday(); break
      case "last30": f = new Date(now); f.setDate(f.getDate() - 29); f.setHours(0,0,0,0); t = endToday(); break
      case "last60": f = new Date(now); f.setDate(f.getDate() - 59); f.setHours(0,0,0,0); t = endToday(); break
      case "last90": f = new Date(now); f.setDate(f.getDate() - 89); f.setHours(0,0,0,0); t = endToday(); break
      case "prevMonth": f = new Date(now.getFullYear(), now.getMonth() - 1, 1); t = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59,999); break
      case "qtd": f = startOfQuarter(); t = endToday(); break
      case "ytd": f = startOfYear(); t = endToday(); break
      case "prevQuarter": {
        const q = Math.floor(now.getMonth() / 3) - 1
        const year = q >= 0 ? now.getFullYear() : now.getFullYear() - 1
        const start = new Date(year, ((q + 4) % 4) * 3, 1)
        const end = new Date(year, ((q + 4) % 4) * 3 + 3, 0, 23,59,59,999)
        f = start; t = end; break
      }
      case "prevYear": f = new Date(now.getFullYear() - 1, 0, 1); t = new Date(now.getFullYear() - 1, 11, 31, 23,59,59,999); break
      case "custom": f = from ? new Date(from) : null; t = to ? new Date(to) : null; break
      case "all": default: f = null; t = null; break
    }
    return { from: f, to: t }
  }, [preset, from, to])

  // Filtering
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allTasks.filter((t) => {
      // date window on due date
      if (computedRange.from && (!t.due || new Date(t.due) < computedRange.from)) return false
      if (computedRange.to && (!t.due || new Date(t.due) > computedRange.to)) return false
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (clientFilter !== "all" && String(t.clientId) !== String(clientFilter)) return false
      if (payState !== "all") {
        const fully = t.paid >= t.cost
        if (payState === "paid" && !fully) return false
        if (payState === "unpaid" && t.paid > 0) return false
        if (payState === "partial" && !(t.paid > 0 && t.paid < t.cost)) return false
      }
      if (q) {
        const hay = `${t.title || ""} ${t.clientName || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [allTasks, computedRange, statusFilter, clientFilter, payState, search])

  // KPIs
  const kpis = useMemo(() => {
    const totalTasks = filteredTasks.length
    const totalPaid = filteredTasks.reduce((s, t) => s + t.paid, 0)
    const totalRemaining = filteredTasks.reduce((s, t) => s + t.remaining, 0)
    const paidPct = totalTasks ? Math.round((filteredTasks.filter((t) => t.paid >= t.cost).length * 100) / totalTasks) : 0
    return { totalClients: clients.length, totalTasks, totalPaid, totalRemaining, paidPct }
  }, [filteredTasks, clients.length])

  // Analytics data
  const statusData = useMemo(() => {
    const b = { "Δεν Ξεκίνησε": 0, "Σε Εξέλιξη": 0, "Ολοκληρώθηκε": 0 }
    filteredTasks.forEach((t) => {
      if (t.status === "Δεν Ξεκίνησε") b["Δεν Ξεκίνησε"]++
      else if (t.status === "Σε Εξέλιξη") b["Σε Εξέλιξη"]++
      else if (["Ολοκληρώθηκε", "Ολοκληρωμένο"].includes(t.status)) b["Ολοκληρώθηκε"]++
    })
    return Object.entries(b).map(([name, value]) => ({ name, value }))
  }, [filteredTasks])

  const monthlyFlow = useMemo(() => {
    const map = new Map()
    filteredTasks.forEach((t) => {
      const key = monthKey(t.due || t.createdAt || new Date())
      const row = map.get(key) || { month: key, cost: 0, paid: 0, remaining: 0 }
      row.cost += t.cost; row.paid += t.paid; row.remaining += t.remaining
      map.set(key, row)
    })
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
  }, [filteredTasks])

  const paymentsByWeek = useMemo(() => {
    const map = new Map()
    filteredTasks.forEach((t) => (t.payments || []).forEach((p) => {
      const at = new Date(p.at)
      if (computedRange.from && at < computedRange.from) return
      if (computedRange.to && at > computedRange.to) return
      const key = weekKey(at)
      const cur = map.get(key) || { week: key, paid: 0 }
      cur.paid += toNum(p.amount)
      map.set(key, cur)
    }))
    return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week))
  }, [filteredTasks, computedRange])

  const agingBuckets = useMemo(() => {
    const now = new Date()
    const b = { "0-7": 0, "8-30": 0, "31-60": 0, "60+": 0 }
    filteredTasks.forEach((t) => {
      if (!t.due || t.remaining <= 0) return
      const days = Math.floor((now - new Date(t.due)) / 86400000)
      if (days <= 0) return
      if (days <= 7) b["0-7"] += t.remaining
      else if (days <= 30) b["8-30"] += t.remaining
      else if (days <= 60) b["31-60"] += t.remaining
      else b["60+"] += t.remaining
    })
    return Object.entries(b).map(([bucket, amount]) => ({ bucket, amount }))
  }, [filteredTasks])

  const clientStack = useMemo(() => {
    const acc = new Map()
    filteredTasks.forEach((t) => {
      const cur = acc.get(t.clientName) || { client: t.clientName, paid: 0, remaining: 0 }
      cur.paid += t.paid; cur.remaining += t.remaining; acc.set(t.clientName, cur)
    })
    return Array.from(acc.values())
      .sort((a, b) => (b.paid + b.remaining) - (a.paid + a.remaining))
      .slice(0, 12)
  }, [filteredTasks])

  const upcomingDue = useMemo(() => {
    const now = new Date()
    return filteredTasks
      .filter((t) => t.due && new Date(t.due) >= now && t.remaining > 0)
      .sort((a, b) => new Date(a.due) - new Date(b.due))
      .slice(0, 12)
  }, [filteredTasks])

  const overdue = useMemo(() => {
    const now = new Date()
    return filteredTasks
      .filter((t) => t.due && new Date(t.due) < now && t.remaining > 0)
      .sort((a, b) => new Date(a.due) - new Date(b.due))
  }, [filteredTasks])

  const recentPayments = useMemo(() => {
    const arr = []
    filteredTasks.forEach((t) => (t.payments || []).forEach((p) => arr.push({
      amount: toNum(p.amount), at: p.at, clientName: t.clientName, taskTitle: t.title
    })))
    return arr.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12)
  }, [filteredTasks])

  return (
    <div className="p-6 space-y-6">
     

      {/* Filters bar */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All time" },
            { id: "today", label: "Σήμερα" },
            { id: "thisWeek", label: "Τρέχουσα Εβδομάδα" },
            { id: "last7", label: "Τελευταίες 7" },
            { id: "thisMonth", label: "Τρέχων Μήνας" },
            { id: "last30", label: "30 ημέρες" },
            { id: "last60", label: "60 ημέρες" },
            { id: "last90", label: "90 ημέρες" },
            { id: "prevMonth", label: "Προηγ. Μήνας" },
            { id: "qtd", label: "QTD" },
            { id: "ytd", label: "YTD" },
            { id: "prevQuarter", label: "Προηγ. Τρίμηνο" },
            { id: "prevYear", label: "Προηγ. Έτος" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                preset === p.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-gray-500">Από</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("custom") }} className="rounded-lg border border-gray-200 px-2 py-1 text-sm"/>
            <label className="text-xs text-gray-500">Έως</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset("custom") }} className="rounded-lg border border-gray-200 px-2 py-1 text-sm"/>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="all">Κατάσταση: Όλες</option>
            <option value="Δεν Ξεκίνησε">Δεν Ξεκίνησε</option>
            <option value="Σε Εξέλιξη">Σε Εξέλιξη</option>
            <option value="Ολοκληρώθηκε">Ολοκληρώθηκε</option>
          </select>
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="all">Πελάτης: Όλοι</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={payState} onChange={(e) => setPayState(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="all">Εξόφληση: Όλες</option>
            <option value="paid">Εξοφλημένες</option>
            <option value="partial">Μερική πληρωμή</option>
            <option value="unpaid">Καμία πληρωμή</option>
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Αναζήτηση (τίτλος/πελάτης)…" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center"><FaUsers className="text-blue-600"/></div>
            <div>
              <div className="text-sm text-gray-500">Σύνολο Πελατών</div>
              <div className="text-2xl font-bold">{kpis.totalClients}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Σύνολο Εργασιών (φιλτραρισμένα)</div>
          <div className="text-2xl font-bold">{kpis.totalTasks}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Πληρωμένο</div>
          <div className="text-2xl font-bold text-emerald-700">{fmtEUR(kpis.totalPaid)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Υπόλοιπο • % Εξοφλημένων</div>
          <div className="text-2xl font-bold">{fmtEUR(kpis.totalRemaining)} <span className="text-sm text-gray-400">• {kpis.paidPct}%</span></div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")}>📊 Analytics</TabButton>
        <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>💳 Payments</TabButton>
        <TabButton active={tab === "deadlines"} onClick={() => setTab("deadlines")}>📅 Deadlines</TabButton>
        <TabButton active={tab === "clients"} onClick={() => setTab("clients")}>🏆 Clients</TabButton>
      </div>

      {/* Analytics */}
      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Κατανομή Κατάστασης">
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={85} innerRadius={55}>
                      {statusData.map((_, i) => (<Cell key={i} fill={["#9CA3AF","#60A5FA","#34D399"][i % 3]} />))}
                    </Pie>
                    <Legend /><Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Aging Buckets (Ληξιπρόθεσμα)">
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={agingBuckets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" /><YAxis />
                    <Tooltip formatter={(v) => fmtEUR(v)} />
                    <Bar dataKey="amount" name="Ποσό" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Top Πελάτες (Πληρωμένο vs Υπόλοιπο)">
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={clientStack} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="client" interval={0} angle={-15} textAnchor="end" height={60}/>
                    <YAxis /><Tooltip formatter={(v) => fmtEUR(v)} /><Legend />
                    <Bar dataKey="paid" name="Πληρωμένο" fill="#10B981" />
                    <Bar dataKey="remaining" name="Υπόλοιπο" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card title="Ροή Εσόδων (Μηνιαία)">
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={monthlyFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" /><YAxis />
                  <Tooltip formatter={(v) => fmtEUR(v)} /><Legend />
                  <Line type="monotone" dataKey="cost" name="Κόστος" stroke="#60A5FA" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="paid" name="Πληρωμένο" stroke="#34D399" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="remaining" name="Υπόλοιπο" stroke="#F87171" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Payments */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Πληρωμές ανά Εβδομάδα">
              <div className="h-72">
                <ResponsiveContainer>
                  <AreaChart data={paymentsByWeek}>
                    <defs>
                      <linearGradient id="paidArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34D399" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#34D399" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" /><YAxis />
                    <Tooltip formatter={(v) => fmtEUR(v)} />
                    <Area type="monotone" dataKey="paid" name="Πληρωμές" stroke="#10B981" fill="url(#paidArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Πρόσφατες Πληρωμές (12)">
              <ul className="divide-y divide-gray-100">
                {recentPayments.length === 0 ? (
                  <li className="py-3 text-sm text-gray-500">Καμία πληρωμή.</li>
                ) : recentPayments.map((p, i) => (
                  <li key={i} className="py-3 text-sm flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{fmtEUR(p.amount)} — {p.clientName}</div>
                      <div className="text-gray-500 truncate">{p.taskTitle}</div>
                    </div>
                    <div className="text-xs text-gray-500 ml-3">
                      {new Date(p.at).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Μεγαλύτερες Οφειλές (Top 10)">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Εργασία</th>
                    <th className="py-2 pr-4">Πελάτης</th>
                    <th className="py-2 pr-4">Προθεσμία</th>
                    <th className="py-2 pr-4 text-right">Υπόλοιπο</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTasks
                    .filter((t) => t.remaining > 0)
                    .sort((a, b) => b.remaining - a.remaining)
                    .slice(0, 10)
                    .map((t, i) => (
                      <tr key={i} className="hover:bg-blue-50/40">
                        <td className="py-2 pr-4 font-medium text-gray-900 truncate max-w-[28ch]" title={t.title}>{t.title}</td>
                        <td className="py-2 pr-4 text-gray-700 truncate max-w-[24ch]" title={t.clientName}>{t.clientName}</td>
                        <td className="py-2 pr-4">{fmtDate(t.due)}</td>
                        <td className="py-2 pr-4 text-right text-rose-700 font-semibold">{fmtEUR(t.remaining)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Deadlines */}
      {tab === "deadlines" && (
        <div className="space-y-4">
          <Card title="Επερχόμενες Προθεσμίες (12)">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Εργασία</th>
                    <th className="py-2 pr-4">Πελάτης</th>
                    <th className="py-2 pr-4">Ημ/νία</th>
                    <th className="py-2 pr-4 text-right">Υπόλοιπο</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTasks
                    .filter((t) => t.due && new Date(t.due) >= new Date() && t.remaining > 0)
                    .sort((a, b) => new Date(a.due) - new Date(b.due))
                    .slice(0, 12)
                    .map((t, i) => (
                      <tr key={i} className="hover:bg-blue-50/40">
                        <td className="py-2 pr-4 font-medium text-gray-900 truncate max-w-[28ch]" title={t.title}>{t.title}</td>
                        <td className="py-2 pr-4 text-gray-700 truncate max-w-[24ch]" title={t.clientName}>{t.clientName}</td>
                        <td className="py-2 pr-4">{fmtDate(t.due)}</td>
                        <td className="py-2 pr-4 text-right">{fmtEUR(t.remaining)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Ληξιπρόθεσμα">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Εργασία</th>
                    <th className="py-2 pr-4">Πελάτης</th>
                    <th className="py-2 pr-4">Ημ/νία</th>
                    <th className="py-2 pr-4 text-right">Υπόλοιπο</th>
                    <th className="py-2 pr-4 text-right">Ημέρες καθυστέρησης</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overdue.map((t, i) => {
                    const days = Math.max(0, Math.floor((new Date() - new Date(t.due)) / 86400000))
                    return (
                      <tr key={i} className="hover:bg-red-50/40">
                        <td className="py-2 pr-4 font-medium text-gray-900 truncate max-w-[28ch]" title={t.title}>{t.title}</td>
                        <td className="py-2 pr-4 text-gray-700 truncate max-w-[24ch]" title={t.clientName}>{t.clientName}</td>
                        <td className="py-2 pr-4">{fmtDate(t.due)}</td>
                        <td className="py-2 pr-4 text-right text-rose-700 font-semibold">{fmtEUR(t.remaining)}</td>
                        <td className="py-2 pr-4 text-right">{days}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Clients */}
      {tab === "clients" && (
        <div className="space-y-4">
          <Card title="Πελάτες — Πληρωμένο vs Υπόλοιπο (Top 12)">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={clientStack} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="client" interval={0} angle={-15} textAnchor="end" height={70}/>
                  <YAxis /><Tooltip formatter={(v) => fmtEUR(v)} /><Legend />
                  <Bar dataKey="paid" name="Πληρωμένο" fill="#10B981" />
                  <Bar dataKey="remaining" name="Υπόλοιπο" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Λίστα Πελατών (φιλτραρισμένα)">
            <ul className="divide-y divide-gray-100">
              {Array.from(new Map(filteredTasks.map(t => [t.clientName, 0])).keys()).map((name, i) => {
                const rows = filteredTasks.filter(t => t.clientName === name)
                const paid = rows.reduce((s, t) => s + t.paid, 0)
                const rem = rows.reduce((s, t) => s + t.remaining, 0)
                return (
                  <li key={i} className="py-3 text-sm flex items-center justify-between">
                    <div className="font-medium text-gray-900">{name}</div>
                    <div className="text-gray-600">{fmtEUR(paid)} / {fmtEUR(rem)}</div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}
