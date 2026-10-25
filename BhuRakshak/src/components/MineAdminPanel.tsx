import React, { useState, useEffect } from 'react'
import {
  HardHat,
  ShieldCheck,
  Compass,
  LogOut,
  Clock,
  Sparkles,
  Building,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Users
} from 'lucide-react'
import MineOperatorDashboard from './MineOperatorDashboard'
import MinePlannerDashboard from './MinePlannerDashboard'
import MineRegulatorDashboard from './MineRegulatorDashboard'
import MineCommunity from './MineCommunity'

interface Props {
  onLogout: () => void
  collieryName?: string
  adminEmail?: string
  isSimulatedAlert?: boolean
  onToggleSimulation?: () => void
}

export default function MineAdminPanel({
  onLogout,
  collieryName = 'Singhali Underground Colliery',
  adminEmail = 'admin.singhali@bhurakshak.gov.in',
  isSimulatedAlert: propIsSimulatedAlert,
  onToggleSimulation
}: Props) {
  // Three master tabs: 'operator' | 'regulator' | 'planner'
  const [activeTab, setActiveTab] = useState<'operator' | 'regulator' | 'planner' | 'community'>('operator')
  const [currentTime, setCurrentTime] = useState<string>('')
  // Shared simulation state for sensor delta surge anomaly across Operator, Regulator, Planner
  const [localSimulatedAlert, setLocalSimulatedAlert] = useState<boolean>(false)
  const isSimulatedAlert = onToggleSimulation !== undefined ? (propIsSimulatedAlert ?? false) : localSimulatedAlert

  // Live real-time clock
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST')
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleToggleSimulation = () => {
    if (onToggleSimulation) {
      onToggleSimulation()
    } else {
      setLocalSimulatedAlert(prev => !prev)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none">
      
      {/* ========================================================================= */}
      {/* MASTER COLLIERY ADMIN NAVBAR WITH THREE TABS: OPERATOR, REGULATOR, PLANNER */}
      {/* ========================================================================= */}
      <header className="w-full bg-white border-b border-slate-200/90 sticky top-0 z-40 px-4 sm:px-8 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Branding & Colliery Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-2xs flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-950">
                  Bhu<span className="text-emerald-600">Rakshak</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-900 text-white tracking-wider">
                  Admin Panel
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 hidden sm:inline-block">
                  by Akshat
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block truncate max-w-[320px]">
                {collieryName} • Conceived &amp; Developed by Akshat
              </p>
            </div>
          </div>

          {/* Center: The Three Master Tabs: Operator, Regulator, Planner */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/90 shadow-inner">
            {/* Operator Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('operator')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'operator'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80 ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <HardHat className={`w-4 h-4 ${activeTab === 'operator' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Operator</span>
            </button>

            {/* Regulator Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('regulator')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'regulator'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80 ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'regulator' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Regulator</span>
            </button>

            {/* Planner Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'planner'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80 ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Compass className={`w-4 h-4 ${activeTab === 'planner' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Planner</span>
            </button>

            {/* Community Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('community')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'community'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80 ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className={`w-4 h-4 ${activeTab === 'community' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Community</span>
            </button>
          </div>

          {/* Right: Admin Info, Clock, and Sign Out */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Admin identity badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block leading-tight font-medium">Logged in Admin</span>
                <span className="text-[11px] font-bold text-slate-800 font-mono block leading-tight truncate max-w-[170px]">
                  {adminEmail}
                </span>
              </div>
            </div>

            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime || '12:00:00 IST'}</span>
            </div>

            {/* Simulation Trigger Button */}
            <button
              type="button"
              onClick={handleToggleSimulation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-xs whitespace-nowrap ${
                isSimulatedAlert
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white'
              }`}
              title="Simulate Sensor Anomaly across all cockpits"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{isSimulatedAlert ? 'Reset Simulation' : '⚡ Simulate Anomaly'}</span>
            </button>

            {/* Sign Out */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* ACTIVE DASHBOARD EMBED: OPERATOR, REGULATOR, OR PLANNER                   */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full">
        {activeTab === 'operator' && (
          <MineOperatorDashboard
            onLogout={onLogout}
            collieryName={collieryName}
            hideHeader={true}
            isSimulatedAlert={isSimulatedAlert}
            onToggleSimulation={handleToggleSimulation}
          />
        )}
        {activeTab === 'regulator' && (
          <MineRegulatorDashboard
            onLogout={onLogout}
            collieryName={collieryName}
            hideHeader={true}
            isSimulatedAlert={isSimulatedAlert}
            onToggleSimulation={handleToggleSimulation}
          />
        )}
        {activeTab === 'planner' && (
          <MinePlannerDashboard
            onLogout={onLogout}
            collieryName={collieryName}
            hideHeader={true}
            isSimulatedAlert={isSimulatedAlert}
            onToggleSimulation={handleToggleSimulation}
          />
        )}
        {activeTab === 'community' && (
          <MineCommunity />
        )}
      </div>

    </div>
  )
}
