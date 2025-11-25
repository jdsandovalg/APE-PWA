import React, { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import Readings from './components/Readings'
import Tariffs from './components/Tariffs'
import Billing from './components/Billing'
import Companies from './components/Companies'
import Meters from './components/Meters'
import Footer from './components/Footer'
import { loadReadings, loadTariffs } from './services/storage'

export default function App(){
  const [view, setView] = useState<'dashboard'|'readings'|'tariffs'|'billing'|'companies'|'meters'>('dashboard')
  const [ready, setReady] = useState(false)

  useEffect(()=>{
    loadReadings()
    loadTariffs()
    setReady(true)
  },[])

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <Navbar onNavigate={setView} />
      <main className="mt-6">
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'readings' && <Readings />}
        {view === 'tariffs' && <Tariffs />}
        {view === 'billing' && <Billing />}
        {view === 'companies' && <Companies onNavigate={setView} />}
        {view === 'meters' && <Meters onNavigate={setView} />}
      </main>
      <Footer />
    </div>
  )
}
