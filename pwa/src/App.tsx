import React, { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import Readings from './components/Readings'
import Tariffs from './components/Tariffs'
import BillingTest from './components/BillingTest'
import Footer from './components/Footer'
import { loadReadings, loadTariffs } from './services/storage'

export default function App(){
  const [view, setView] = useState<'dashboard'|'readings'|'tariffs'|'billing'>('dashboard')
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
        {view === 'dashboard' && <Dashboard />}
        {view === 'readings' && <Readings />}
        {view === 'tariffs' && <Tariffs />}
        {view === 'billing' && <BillingTest />}
      </main>
      <Footer />
    </div>
  )
}
