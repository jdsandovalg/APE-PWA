import React, { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import Readings from './components/Readings'
import Tariffs from './components/Tariffs'
import Billing from './components/Billing'
import Meters from './components/Meters'
import Companies from './components/Companies'
import Footer from './components/Footer'
import Login from './login/page'
import { Toaster } from 'react-hot-toast'

export default function App(){
  const [view, setView] = useState<'dashboard'|'readings'|'tariffs'|'billing'|'meters'|'companies'>('dashboard')
  const [ready, setReady] = useState(false)
  const [usuario, setUsuario] = useState<any>(null)

  useEffect(()=>{
    const u = localStorage.getItem('usuario')
    setUsuario(u ? JSON.parse(u) : null)
    setReady(true)
  },[])

  if (!usuario) {
    return (
      <>
        <Toaster />
        <Login onSuccess={() => {
          const u = localStorage.getItem('usuario')
          setUsuario(u ? JSON.parse(u) : null)
        }} />
      </>
    )
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
        <Navbar onNavigate={setView} onLogout={() => { localStorage.removeItem('usuario'); setUsuario(null); }} />
        <main className="mt-6">
          {view === 'dashboard' && <Dashboard onNavigate={setView} />}
          {view === 'readings' && <Readings />}
          {view === 'tariffs' && <Tariffs />}
          {view === 'billing' && <Billing />}
          {view === 'meters' && <Meters onNavigate={setView} />}
          {view === 'companies' && <Companies onNavigate={setView} />}
        </main>
        <Footer />
      </div>
    </>
  )
}
