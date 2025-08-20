import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white shadow-md p-4">
        <h2 className="text-xl font-bold mb-6">Sound Media</h2>
        <nav className="space-y-2">
          <NavLink to="/" className="block px-2 py-1 hover:bg-gray-200 rounded">Πίνακας Ελέγχου</NavLink>
          <NavLink to="/pelates" className="block px-2 py-1 hover:bg-gray-200 rounded">Πελάτες</NavLink>
          <NavLink to="/ergasies" className="block px-2 py-1 hover:bg-gray-200 rounded">Εργασίες</NavLink>
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
