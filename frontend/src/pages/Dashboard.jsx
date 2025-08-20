import React, { useEffect, useState } from "react"
import SIMPLIFIED from "./SIMPLIFIED"
import DETAILED from "./DETAILED"

export default function Dashboard() {
  const [mode, setMode] = useState(() => {
    try {
      const saved = window.localStorage.getItem("dashboardMode")
      return saved === "detailed" ? "detailed" : "simple"
    } catch {
      return "simple"
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem("dashboardMode", mode)
    } catch {}
  }, [mode])

  return (
    <div className="p-4 sm:p-6">
      {/* Header with single page title + mode badge + toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">Πίνακας Ελέγχου</h1>
          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              mode === "simple"
                ? "bg-gray-100 text-gray-700 border-gray-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
            aria-label="Current mode"
          >
            {mode === "simple" ? "Simple" : "Detailed"}
          </span>
        </div>

        {/* Segmented toggle */}
        <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm inline-flex">
          <button
            onClick={() => setMode("simple")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === "simple" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-50"
            }`}
            title="Απλή προβολή (με ημερολόγιο)"
            aria-pressed={mode === "simple"}
          >
            Απλή
          </button>
          <button
            onClick={() => setMode("detailed")}
            className={`ml-1 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === "detailed" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-50"
            }`}
            title="Αναλυτική προβολή (χωρίς ημερολόγιο)"
            aria-pressed={mode === "detailed"}
          >
            Αναλυτική
          </button>
        </div>
      </div>

      {/* Render selected mode; hide inside titles to avoid duplicates */}
      {mode === "simple" ? <SIMPLIFIED showTitle={false} /> : <DETAILED showTitle={false} />}
    </div>
  )
}
