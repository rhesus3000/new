import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './pages/Layout'
import Pelates from './pages/Pelates'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'  // ✅ Add this import


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pelates" element={<Pelates />} />
          <Route path="ergasies" element={<Tasks />} />  {/* ✅ Add this line */}
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
