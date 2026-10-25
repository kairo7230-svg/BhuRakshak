import React, { useState, useEffect } from 'react'
import GisHeatmapResults, { CollieryConfig, ZoneConfig } from './components/GisHeatmapResults'
import MineOperatorDashboard from './components/MineOperatorDashboard'
import MinePlannerDashboard from './components/MinePlannerDashboard'
import MineRegulatorDashboard from './components/MineRegulatorDashboard'
import MineAdminPanel from './components/MineAdminPanel'
import MineCommunity from './components/MineCommunity'
import NearbyUpdates from './components/NearbyUpdates'
import {
  Users,
  Megaphone,
  Siren,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  LogIn,
  MapPin,
  Layers,
  Cpu,
  Radio,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building,
  Pickaxe,
  Satellite,
  Compass,
  Thermometer,
  Anchor,
  Activity,
  Ruler,
  Plus,
  Trash2,
  Check,
  HardHat,
  ShieldCheck,
  KeyRound
} from 'lucide-react'

// Location Presets
const REGION_PRESETS: Record<string, { cities: string[]; mines: Record<string, { lat: string; lon: string; region: string; defaultH: number; defaultM: number }> }> = {
  'Chhattisgarh': {
    cities: ['Korba', 'Bilaspur', 'Raigarh'],
    mines: {
      'Singhali Underground Colliery': { lat: '22.3595', lon: '82.7501', region: 'Korba Coalfield', defaultH: 185, defaultM: 3.2 },
      'Manikpur Colliery': { lat: '22.3320', lon: '82.7180', region: 'Korba Coalfield', defaultH: 140, defaultM: 2.8 },
      'Dipka Deep Mine': { lat: '22.3180', lon: '82.5680', region: 'Korba Coalfield', defaultH: 210, defaultM: 4.0 },
      'Gevra Underground Expansion': { lat: '22.3450', lon: '82.5920', region: 'Korba Coalfield', defaultH: 230, defaultM: 4.5 }
    }
  },
  'Jharkhand': {
    cities: ['Dhanbad (Jharia)', 'Ranchi', 'Bokaro'],
    mines: {
      'Moonidih Deep Longwall Mine': { lat: '23.7380', lon: '86.3520', region: 'Jharia Coalfield', defaultH: 450, defaultM: 3.5 },
      'Jharia Block-II Colliery': { lat: '23.7710', lon: '86.2950', region: 'Jharia Coalfield', defaultH: 220, defaultM: 3.0 },
      'Sudamdih Shaft Mine': { lat: '23.6550', lon: '86.4380', region: 'Jharia Coalfield', defaultH: 380, defaultM: 3.8 }
    }
  },
  'West Bengal': {
    cities: ['Asansol (Raniganj)', 'Paschim Bardhaman', 'Purulia'],
    mines: {
      'Chinakuri Underground Mine No. 1 & 2': { lat: '23.6840', lon: '86.8620', region: 'Raniganj Coalfield', defaultH: 600, defaultM: 3.2 },
      'Kottadih Underground Project': { lat: '23.6620', lon: '87.2410', region: 'Raniganj Coalfield', defaultH: 260, defaultM: 2.6 }
    }
  },
  'Maharashtra': {
    cities: ['Nagpur', 'Chandrapur', 'Yavatmal'],
    mines: {
      'Umrer Deep Colliery': { lat: '20.8524', lon: '79.3245', region: 'Nagpur Basin', defaultH: 175, defaultM: 3.0 },
      'Saoner Underground Mine': { lat: '21.3850', lon: '78.9150', region: 'Wardha Valley', defaultH: 195, defaultM: 2.5 }
    }
  }
}

export interface ZoneFormData {
  id: string
  tag: string
  panelName: string
  depthOfCover: string
  extractionThickness: string
  panelWidth: string
  panelLength: string
  miningMethod: 'Bord & Pillar' | 'Longwall'
  roofManagement: 'Caving' | 'Sand Stowing'
  commProtocol: 'UWB' | 'RSSI'
  baselineTilt: string
  baselineTemp: string
  anchorTestReading: string
  tellTaleReading: string
}

const DEFAULT_ZONES: ZoneFormData[] = [
  {
    id: 'zone_a',
    tag: 'Zone A',
    panelName: 'Panel 7 (Active Caving Face)',
    depthOfCover: '185',
    extractionThickness: '3.2',
    panelWidth: '150',
    panelLength: '600',
    miningMethod: 'Longwall',
    roofManagement: 'Caving',
    commProtocol: 'UWB',
    baselineTilt: '0.18',
    baselineTemp: '29.2',
    anchorTestReading: '82.5',
    tellTaleReading: '4.2'
  },
  {
    id: 'zone_b',
    tag: 'Zone B',
    panelName: 'Panel 6 (Transition Advance Face)',
    depthOfCover: '210',
    extractionThickness: '2.8',
    panelWidth: '130',
    panelLength: '500',
    miningMethod: 'Bord & Pillar',
    roofManagement: 'Caving',
    commProtocol: 'RSSI',
    baselineTilt: '0.12',
    baselineTemp: '28.0',
    anchorTestReading: '74.0',
    tellTaleReading: '2.8'
  },
  {
    id: 'zone_c',
    tag: 'Zone C',
    panelName: 'Panel 4 (Stabilized Sand Goaf)',
    depthOfCover: '160',
    extractionThickness: '2.4',
    panelWidth: '110',
    panelLength: '420',
    miningMethod: 'Bord & Pillar',
    roofManagement: 'Sand Stowing',
    commProtocol: 'RSSI',
    baselineTilt: '0.04',
    baselineTemp: '26.8',
    anchorTestReading: '68.0',
    tellTaleReading: '1.1'
  }
]

export type AppView =
  | 'login'
  | 'register'
  | 'results'
  | 'operator_dashboard'
  | 'planner_dashboard'
  | 'regulator_dashboard'
  | 'admin_panel'
  | 'community'
  | 'nearby_updates'

export default function App() {
  const getInitialView = (): AppView => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase()
      const hash = window.location.hash.toLowerCase()
      if (path === '/nearbyupdates' || hash.includes('nearbyupdates')) {
        return 'nearby_updates'
      }
      if (path === '/community' || hash.includes('community')) {
        return 'community'
      }
    }
    return 'login'
  }

  // Current view
  const [view, setView] = useState<AppView>(getInitialView)
  const [submittedConfig, setSubmittedConfig] = useState<CollieryConfig | null>(null)

  // Listen to browser URL and hash routing (e.g. /nearbyupdates and #/nearbyupdates)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase()
      const hash = window.location.hash.toLowerCase()
      if (path === '/nearbyupdates' || hash.includes('nearbyupdates')) {
        setView('nearby_updates')
      } else if (path === '/community' || hash.includes('community')) {
        setView('community')
      }
    }

    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  const navigateTo = (newView: AppView) => {
    setView(newView)
    if (newView === 'nearby_updates') {
      window.history.pushState(null, '', '/nearbyupdates')
      window.location.hash = '#/nearbyupdates'
    } else if (newView === 'community') {
      window.history.pushState(null, '', '/community')
      window.location.hash = '#/community'
    } else {
      if (window.location.pathname === '/nearbyupdates' || window.location.pathname === '/community') {
        window.history.pushState(null, '', '/')
      }
      if (window.location.hash.includes('nearbyupdates') || window.location.hash.includes('community')) {
        window.location.hash = ''
      }
    }
  }

  // Global simulated anomaly alert state shared across Operator, Planner, Regulator dashboards & Admin Panel
  const [isSimulatedAlert, setIsSimulatedAlert] = useState<boolean>(false)
  const handleToggleSimulation = () => {
    setIsSimulatedAlert((prev) => !prev)
  }

  // Always scroll to top of page when changing view
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [view])

  // --- LOGIN STATE ---
  const [loginRole, setLoginRole] = useState<'admin' | 'worker'>('admin')
  // Admin credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Worker credentials
  const [workerEmail, setWorkerEmail] = useState('')
  const [workerPassword, setWorkerPassword] = useState('')
  const [showWorkerPassword, setShowWorkerPassword] = useState(false)
  // Password Reset / Recovery state
  const [isResetMode, setIsResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSubmitted, setResetSubmitted] = useState(false)
  // Status banner
  const [isLoginSubmitted, setIsLoginSubmitted] = useState(false)
  const [loginBannerText, setLoginBannerText] = useState('')

  // --- REGISTRATION FORM STATE ---
  // 0. Location & Mine Selection (Mine-Wide Site Information)
  const [stateName, setStateName] = useState('Chhattisgarh')
  const [cityName, setCityName] = useState('Korba')
  const [mineName, setMineName] = useState('Singhali Underground Colliery')
  const [customMine, setCustomMine] = useState('')
  const [region, setRegion] = useState('Korba Coalfield')
  const [latitude, setLatitude] = useState('22.3595')
  const [longitude, setLongitude] = useState('82.7501')

  // Multi-Zone State
  const [zones, setZones] = useState<ZoneFormData[]>(DEFAULT_ZONES)
  const [activeZoneIndex, setActiveZoneIndex] = useState(0)

  const activeZone = zones[activeZoneIndex] || zones[0]

  const updateActiveZone = <K extends keyof ZoneFormData>(
    field: K,
    val: ZoneFormData[K]
  ) => {
    setZones((prev) =>
      prev.map((z, idx) => (idx === activeZoneIndex ? { ...z, [field]: val } : z))
    )
  }

  const addNewZone = () => {
    const nextChar = String.fromCharCode(65 + zones.length) // D, E, F...
    const nextNumber = zones.length + 5 // e.g. Panel 8, Panel 9...
    const newZone: ZoneFormData = {
      id: `zone_${nextChar.toLowerCase()}`,
      tag: `Zone ${nextChar}`,
      panelName: `Panel ${nextNumber} (Active Extraction District)`,
      depthOfCover: '195',
      extractionThickness: '3.0',
      panelWidth: '140',
      panelLength: '520',
      miningMethod: 'Longwall',
      roofManagement: 'Caving',
      commProtocol: 'UWB',
      baselineTilt: '0.14',
      baselineTemp: '28.5',
      anchorTestReading: '76.0',
      tellTaleReading: '3.2'
    }
    setZones((prev) => [...prev, newZone])
    setActiveZoneIndex(zones.length) // Switch to newly created zone immediately
  }

  const removeZone = (indexToRemove: number) => {
    if (zones.length <= 1) return
    setZones((prev) => prev.filter((_, idx) => idx !== indexToRemove))
    if (activeZoneIndex >= indexToRemove && activeZoneIndex > 0) {
      setActiveZoneIndex(activeZoneIndex - 1)
    }
  }

  // Location selector change handler
  const handleStateChange = (selectedState: string) => {
    setStateName(selectedState)
    const availableCities = REGION_PRESETS[selectedState]?.cities || []
    const firstCity = availableCities[0] || ''
    setCityName(firstCity)

    const availableMines = Object.keys(REGION_PRESETS[selectedState]?.mines || {})
    if (availableMines.length > 0) {
      const firstMine = availableMines[0]
      setMineName(firstMine)
      const data = REGION_PRESETS[selectedState].mines[firstMine]
      setLatitude(data.lat)
      setLongitude(data.lon)
      setRegion(data.region)
      setZones((prev) =>
        prev.map((z, idx) =>
          idx === 0
            ? { ...z, depthOfCover: String(data.defaultH), extractionThickness: String(data.defaultM) }
            : z
        )
      )
    }
  }

  const handleMineChange = (selectedMine: string) => {
    setMineName(selectedMine)
    if (selectedMine === 'custom') {
      return
    }
    const currentMines = REGION_PRESETS[stateName]?.mines
    if (currentMines && currentMines[selectedMine]) {
      const data = currentMines[selectedMine]
      setLatitude(data.lat)
      setLongitude(data.lon)
      setRegion(data.region)
      setZones((prev) =>
        prev.map((z, idx) =>
          idx === 0
            ? { ...z, depthOfCover: String(data.defaultH), extractionThickness: String(data.defaultM) }
            : z
        )
      )
    }
  }

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginBannerText(`Signing in (${email || 'admin.singhali@bhurakshak.gov.in'})...`)
    setIsLoginSubmitted(true)
    setTimeout(() => {
      setIsLoginSubmitted(false)
      setView('admin_panel')
    }, 400)
  }

  const handleWorkerLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginBannerText(`Authenticating (${workerEmail || 'operator'})...`)
    setIsLoginSubmitted(true)
    setTimeout(() => {
      setIsLoginSubmitted(false)
      setView('operator_dashboard')
    }, 400)
  }

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setResetSubmitted(true)
    setTimeout(() => {
      setResetSubmitted(false)
      setIsResetMode(false)
    }, 3500)
  }

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const primary = zones[0] || activeZone
    const configData: CollieryConfig = {
      mineName: mineName === 'custom' ? (customMine || 'Custom Colliery') : mineName,
      stateName,
      cityName,
      region,
      latitude: parseFloat(latitude) || 22.3595,
      longitude: parseFloat(longitude) || 82.7501,
      zones: zones.map((z) => ({
        id: z.id,
        panelName: z.panelName,
        depthOfCover: parseFloat(z.depthOfCover) || 185,
        extractionThickness: parseFloat(z.extractionThickness) || 3.2,
        panelWidth: parseFloat(z.panelWidth) || 140,
        panelLength: parseFloat(z.panelLength) || 550,
        miningMethod: z.miningMethod,
        roofManagement: z.roofManagement,
        commProtocol: z.commProtocol,
        baselineTilt: parseFloat(z.baselineTilt) || 0.15,
        baselineTemp: parseFloat(z.baselineTemp) || 28.5,
        anchorTest: parseFloat(z.anchorTestReading) || 78.4,
        tellTale: parseFloat(z.tellTaleReading) || 3.8
      })),
      depthOfCover: parseFloat(primary.depthOfCover) || 185,
      extractionThickness: parseFloat(primary.extractionThickness) || 3.2,
      panelWidth: parseFloat(primary.panelWidth) || 140,
      panelLength: parseFloat(primary.panelLength) || 550,
      miningMethod: primary.miningMethod,
      roofManagement: primary.roofManagement,
      commProtocol: primary.commProtocol,
      baselineTilt: parseFloat(primary.baselineTilt) || 0.15,
      baselineTemp: parseFloat(primary.baselineTemp) || 28.5,
      anchorTest: parseFloat(primary.anchorTestReading) || 78.4,
      tellTale: parseFloat(primary.tellTaleReading) || 3.8
    }
    setSubmittedConfig(configData)
    setView('results')
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  if (view === 'operator_dashboard') {
    return (
      <MineOperatorDashboard
        onLogout={() => setView('login')}
        onSwitchDashboard={(d) => setView(d === 'planner' ? 'planner_dashboard' : 'operator_dashboard')}
        collieryName={submittedConfig?.mineName || mineName || 'Singhali Underground Colliery'}
        isSimulatedAlert={isSimulatedAlert}
        onToggleSimulation={handleToggleSimulation}
      />
    )
  }

  if (view === 'planner_dashboard') {
    return (
      <MinePlannerDashboard
        onLogout={() => setView('login')}
        onSwitchDashboard={(d) => setView(d === 'operator' ? 'operator_dashboard' : 'planner_dashboard')}
        collieryName={submittedConfig?.mineName || mineName || 'Singhali Underground Colliery'}
        isSimulatedAlert={isSimulatedAlert}
        onToggleSimulation={handleToggleSimulation}
      />
    )
  }

  if (view === 'regulator_dashboard') {
    return (
      <MineRegulatorDashboard
        onLogout={() => setView('login')}
        onSwitchDashboard={(d) => {
          if (d === 'operator') setView('operator_dashboard')
          else if (d === 'planner') setView('planner_dashboard')
          else setView('regulator_dashboard')
        }}
        collieryName={submittedConfig?.mineName || mineName || 'Singhali Underground Colliery'}
        isSimulatedAlert={isSimulatedAlert}
        onToggleSimulation={handleToggleSimulation}
      />
    )
  }

  if (view === 'admin_panel') {
    const adminAccountEmail =
      email ||
      (submittedConfig
        ? `admin.${(submittedConfig.mineName || 'singhali')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 10)}@bhurakshak.gov.in`
        : 'admin.singhali@bhurakshak.gov.in')

    return (
      <MineAdminPanel
        onLogout={() => setView('login')}
        collieryName={submittedConfig?.mineName || mineName || 'Singhali Underground Colliery'}
        adminEmail={adminAccountEmail}
        isSimulatedAlert={isSimulatedAlert}
        onToggleSimulation={handleToggleSimulation}
      />
    )
  }

  if (view === 'nearby_updates') {
    return <NearbyUpdates onBack={() => navigateTo('login')} />
  }

  if (view === 'community') {
    return (
      <MineCommunity
        onBack={() => navigateTo('login')}
        onNavigateNearby={() => navigateTo('nearby_updates')}
      />
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col justify-between items-center p-4 sm:p-6 relative overflow-x-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Subtle ambient lighting */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-emerald-100/40 via-emerald-50/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className={`w-full ${view === 'results' ? 'max-w-6xl' : 'max-w-4xl'} flex items-center justify-between z-10 py-3`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-slate-950">
              Bhu<span className="text-emerald-600">Rakshak</span>
            </span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 hidden sm:inline-block">
              by Akshat
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo('community')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white/90 hover:bg-slate-100 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Inter-Mine</span>
            <span>Community</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('nearby_updates')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50/90 hover:bg-rose-100 text-xs font-bold text-rose-700 transition shadow-2xs cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5 text-rose-600" />
            <span>Nearby Updates</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping ml-0.5" />
          </button>

          {view === 'register' && (
            <button
              type="button"
              onClick={() => setView('login')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white/90 hover:bg-slate-100 text-xs font-bold text-slate-700 transition shadow-sm hover:border-slate-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          )}

          {view === 'results' && (
            <button
              type="button"
              onClick={() => setView('login')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white/90 hover:bg-slate-100 text-xs font-bold text-slate-700 transition shadow-sm hover:border-slate-300"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-600" />
              <span>Colliery Login</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VIEW 1: DUAL LOGIN PAGE (ADMIN vs. WORKER)                                */}
      {/* ========================================================================= */}
      {view === 'login' && (
        <main className="w-full flex-1 flex items-center justify-center z-10 py-10">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-[28px] p-8 sm:p-10 shadow-xl shadow-slate-200/50 relative">
            
            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl mb-7 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setLoginRole('admin')
                  setIsResetMode(false)
                  setResetSubmitted(false)
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  loginRole === 'admin'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 ring-1 ring-slate-950/5'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${loginRole === 'admin' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Colliery Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginRole('worker')
                  setIsResetMode(false)
                  setResetSubmitted(false)
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  loginRole === 'worker'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 ring-1 ring-slate-950/5'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <HardHat className={`w-4 h-4 ${loginRole === 'worker' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Mine Worker</span>
              </button>
            </div>

            {/* FORGOT PASSWORD / PASSWORD RESET MODE */}
            {isResetMode ? (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex justify-center mb-4">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm ${
                    loginRole === 'admin' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}>
                    <KeyRound className="w-6 h-6" />
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
                    Reset {loginRole === 'admin' ? 'Admin' : 'Worker'} Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {loginRole === 'admin'
                      ? 'Enter your administrative email to receive master access recovery instructions.'
                      : 'Enter your worker ID email to receive an SMS verification code dispatched to your registered device.'}
                  </p>
                </div>

                {resetSubmitted ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-emerald-950">Recovery Link Dispatched!</p>
                    <p className="text-[11px] text-emerald-700">
                      Instructions have been sent to <b>{resetEmail || (loginRole === 'admin' ? email || 'admin@bhurakshak.gov.in' : workerEmail || 'worker@bhurakshak.gov.in')}</b>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false)
                        setResetSubmitted(false)
                      }}
                      className="mt-2 text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Return to Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    <div>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                        <input
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder={loginRole === 'admin' ? 'admin.singhali@bhurakshak.gov.in' : 'worker.id@mine.coal.in'}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#0f172a] hover:bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md shadow-slate-900/10 hover:shadow-lg active:scale-[0.99] cursor-pointer"
                    >
                      <span>Send Recovery Instructions</span>
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetMode(false)
                          setResetSubmitted(false)
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
                      >
                        ← Back to {loginRole === 'admin' ? 'Admin' : 'Worker'} Login
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : loginRole === 'admin' ? (
              /* ========================================================================= */
              /* ADMIN LOGIN PANEL: EXACT REPLICA OF CURRENT LOGIN PAGE + REGISTER LINK    */
              /* ========================================================================= */
              <div>
                {/* Top Login Emblem */}
                <div className="flex justify-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 shadow-sm">
                    <LogIn className="w-6 h-6 text-emerald-600 ml-0.5" />
                  </div>
                </div>

                {/* Heading */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
                    Sign in to BhuRakshak
                  </h1>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Enter your credentials to access subterranean surveillance and colliery monitoring.
                  </p>
                </div>

                {/* Feedback banner */}
                {isLoginSubmitted && (
                  <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold text-center animate-fadeIn">
                    {loginBannerText || `Signing in as ${email || 'operator'}...`}
                  </div>
                )}

                {/* Admin Login Form */}
                <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                  <div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-11 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email)
                          setIsResetMode(true)
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#0f172a] hover:bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md shadow-slate-900/10 hover:shadow-lg active:scale-[0.99] cursor-pointer"
                    >
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-500">
                    Mine not registered?{' '}
                    <button
                      type="button"
                      onClick={() => setView('register')}
                      className="font-bold text-emerald-600 hover:text-emerald-700 underline decoration-emerald-500/30 underline-offset-4 transition cursor-pointer"
                    >
                      Register Mine!
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* WORKER LOGIN PANEL: ONLY EMAIL, PASSWORD & FORGOT PASSWORD                */
              /* ========================================================================= */
              <div>
                {/* Worker Top Emblem */}
                <div className="flex justify-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-sm">
                    <HardHat className="w-7 h-7 text-amber-600" />
                  </div>
                </div>

                {/* Worker Heading */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
                    Mine Worker Sign In
                  </h1>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Enter your worker credentials to log in and access shift telemetry and safety alerts.
                  </p>
                </div>

                {/* Feedback banner */}
                {isLoginSubmitted && (
                  <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold text-center animate-fadeIn">
                    {loginBannerText || `Signing in worker ${workerEmail || 'shift member'}...`}
                  </div>
                )}

                {/* Worker Login Form: ONLY EMAIL, PASSWORD & FORGOT PASSWORD */}
                <form onSubmit={handleWorkerLoginSubmit} className="space-y-4">
                  <div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input
                        type="email"
                        required
                        value={workerEmail}
                        onChange={(e) => setWorkerEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input
                        type={showWorkerPassword ? 'text' : 'password'}
                        required
                        value={workerPassword}
                        onChange={(e) => setWorkerPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-11 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWorkerPassword(!showWorkerPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      >
                        {showWorkerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(workerEmail)
                          setIsResetMode(true)
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-amber-600 transition cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#0f172a] hover:bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md shadow-slate-900/10 hover:shadow-lg active:scale-[0.99] cursor-pointer"
                    >
                      <span>Worker Sign In</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Direct Dashboard Demo Login Access - ONLY VISIBLE IN WORKER LOGIN */}
            {!isResetMode && loginRole === 'worker' && (
              <div className="mt-7 pt-5 border-t border-slate-100 space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
                      <HardHat className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Mine Operator Cockpit</span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-800">
                          Demo
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                        operator@mine.coal.in • operator123
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('operator@mine.coal.in')
                      setPassword('operator123')
                      setView('operator_dashboard')
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                  >
                    <span>Launch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
                      <Compass className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Mine Planner Studio</span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-200/80 text-indigo-800">
                          Strategy
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                        InSAR Overlay • PINN AI • EKF Filter
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('planner@mine.coal.in')
                      setPassword('planner123')
                      setView('planner_dashboard')
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                  >
                    <span>Launch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/90 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Regulator Portal</span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-200/80 text-blue-800">
                          DGMS Audit
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                        Topology Logs • Mesh Proof • Prediction Matrix
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('regulator@dgms.gov.in')
                      setPassword('dgms2026')
                      setView('regulator_dashboard')
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                  >
                    <span>Launch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Public Community & Nearby Resident Bulletins */}
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-center mb-1">
                Public Safety &amp; Collaborative Network
              </div>

              {/* Citizen Warning & Nearby Updates */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200/90 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>Nearby Residents Portal</span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-200 text-rose-800">
                        /nearbyupdates
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Warnings &amp; Upcoming Tasks for Living People
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('nearby_updates')}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                >
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inter-Mine Community Hub */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>Inter-Mine Community Hub</span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800">
                        Live Feed
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Cross-Mine Collaboration, Posts &amp; Headcount
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('community')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                >
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: HIGHLY STRUCTURED & BEAUTIFULLY ARRANGED REGISTRATION FORM       */}
      {/* ========================================================================= */}
      {view === 'register' && (
        <main className="w-full flex-1 flex items-center justify-center z-10 py-6">
          <div className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-[32px] p-6 sm:p-10 shadow-2xl shadow-slate-200/60 relative">
            
            {/* Header with Title and Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm flex-shrink-0">
                  <Pickaxe className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">
                      Register New Mine Site
                    </h1>
                    <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Phase A Form
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Input structural parameters, operational methods & sensor baselines for InSAR geodetic onboarding.
                  </p>
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegisterSubmit} className="mt-8 space-y-6">

              {/* ----------------------------------------------------------------- */}
              {/* SECTION 01: LOCATION & COLLIERY IDENTIFICATION CARD               */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 sm:p-6 transition hover:border-slate-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold flex items-center justify-center shadow-xs">
                      01
                    </span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Location & Colliery Identification</span>
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 hidden sm:inline-block">
                    InSAR Geodetic Anchor
                  </span>
                </div>

                {/* 3-Column Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      State *
                    </label>
                    <select
                      value={stateName}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                    >
                      {Object.keys(REGION_PRESETS).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      City / District *
                    </label>
                    <select
                      value={cityName}
                      onChange={(e) => setCityName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                    >
                      {(REGION_PRESETS[stateName]?.cities || []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Mine Selector *
                    </label>
                    <select
                      value={mineName}
                      onChange={(e) => handleMineChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                    >
                      {Object.keys(REGION_PRESETS[stateName]?.mines || {}).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="custom">+ Custom Colliery...</option>
                    </select>
                  </div>
                </div>

                {/* Custom Mine input if needed */}
                {mineName === 'custom' && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Custom Colliery Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customMine}
                      onChange={(e) => setCustomMine(e.target.value)}
                      placeholder="e.g. Singhali Colliery Panel 7 West"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 shadow-xs"
                    />
                  </div>
                )}

                {/* Satellite Coordinates Bar */}
                <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Satellite className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Latitude (°N)</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Sentinel-1 Target</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Longitude (°E)</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Sentinel-1 Target</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* SECTION 02: EXTRACTION PANELS & MULTI-ZONE CONFIGURATION         */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 sm:p-6 transition hover:border-slate-300 space-y-5">
                
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold flex items-center justify-center shadow-xs">
                      02
                    </span>
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Extraction Panels & Multi-Zone Configuration</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Configure independent strata depth, mining method & sensor calibrations per panel.
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                    {zones.length} {zones.length === 1 ? 'Panel' : 'Panels'} Configured
                  </span>
                </div>

                {/* Sleek Zone Switcher Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {zones.map((z, idx) => {
                    const isActive = idx === activeZoneIndex
                    const displayName = z.panelName.split('(')[0].trim() || z.panelName
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setActiveZoneIndex(idx)}
                        className={`group flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-500/25'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/90'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                        <span>{z.tag}: {displayName}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                            isActive ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {z.miningMethod === 'Longwall' ? 'LW' : 'B&P'} • {z.roofManagement === 'Caving' ? 'Cav' : 'Stow'}
                        </span>
                        {zones.length > 1 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              removeZone(idx)
                            }}
                            className={`p-1 rounded transition ml-0.5 ${
                              isActive ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200'
                            }`}
                            title={`Remove ${z.tag}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={addNewZone}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-xs font-bold transition flex-shrink-0 cursor-pointer"
                    title="Add another extraction panel"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Add Zone</span>
                  </button>
                </div>

                {/* Active Zone Configuration Body (Spacious, Uncongested) */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                  {/* Active Zone Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Configuring {activeZone.tag} • Panel {activeZoneIndex + 1} of {zones.length}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 self-start sm:self-auto">
                      Extraction Mode: <b className="text-slate-800">{activeZone.miningMethod}</b> ({activeZone.roofManagement})
                    </span>
                  </div>

                  {/* Panel Identifier */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Panel Identifier / Extraction Face Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={activeZone.panelName}
                      onChange={(e) => updateActiveZone('panelName', e.target.value)}
                      placeholder="e.g. Panel 7 Active Longwall Face"
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                    />
                  </div>

                  {/* Strata Depth & Panel Dimensions (4 clean inputs) */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Strata Depth & Panel Geometry</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Depth of Cover (H) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={activeZone.depthOfCover}
                            onChange={(e) => updateActiveZone('depthOfCover', e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                          />
                          <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">m</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Extraction Thickness (m) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={activeZone.extractionThickness}
                            onChange={(e) => updateActiveZone('extractionThickness', e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                          />
                          <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">m</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Panel Width (W) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            required
                            value={activeZone.panelWidth}
                            onChange={(e) => updateActiveZone('panelWidth', e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                          />
                          <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">m</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Panel Length (L) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="1"
                            required
                            value={activeZone.panelLength}
                            onChange={(e) => updateActiveZone('panelLength', e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                          />
                          <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">m</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Methods (Mining Method & Roof Control) */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Operational Method & Roof Control</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                          Excavation Method *
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateActiveZone('miningMethod', 'Bord & Pillar')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                              activeZone.miningMethod === 'Bord & Pillar'
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {activeZone.miningMethod === 'Bord & Pillar' && <Check className="w-3.5 h-3.5" />}
                            <span>Bord & Pillar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateActiveZone('miningMethod', 'Longwall')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                              activeZone.miningMethod === 'Longwall'
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {activeZone.miningMethod === 'Longwall' && <Check className="w-3.5 h-3.5" />}
                            <span>Longwall</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                          Roof Management Technique *
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateActiveZone('roofManagement', 'Caving')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                              activeZone.roofManagement === 'Caving'
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {activeZone.roofManagement === 'Caving' && <Check className="w-3.5 h-3.5" />}
                            <span>Caving</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateActiveZone('roofManagement', 'Sand Stowing')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                              activeZone.roofManagement === 'Sand Stowing'
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {activeZone.roofManagement === 'Sand Stowing' && <Check className="w-3.5 h-3.5" />}
                            <span>Sand Stowing</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Telemetry & Baselines */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Hardware Telemetry & Sensor Baselines</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Comm Protocol *
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateActiveZone('commProtocol', 'UWB')}
                            className={`py-2 rounded-xl text-xs font-bold transition border ${
                              activeZone.commProtocol === 'UWB'
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            UWB
                          </button>
                          <button
                            type="button"
                            onClick={() => updateActiveZone('commProtocol', 'RSSI')}
                            className={`py-2 rounded-xl text-xs font-bold transition border ${
                              activeZone.commProtocol === 'RSSI'
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            RSSI (LoRa)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Baseline Tilt
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={activeZone.baselineTilt}
                            onChange={(e) => updateActiveZone('baselineTilt', e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                          />
                          <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">deg</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Baseline Temperature
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={activeZone.baselineTemp}
                            onChange={(e) => updateActiveZone('baselineTemp', e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                          />
                          <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">°C</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Anchor className="w-3 h-3 text-amber-600" />
                            <span>Anchor Pull Load Test</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Roof Bolt Test</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={activeZone.anchorTestReading}
                            onChange={(e) => updateActiveZone('anchorTestReading', e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                          />
                          <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">kN</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Ruler className="w-3 h-3 text-blue-600" />
                            <span>Tell-Tale Convergence</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Dual Height</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={activeZone.tellTaleReading}
                            onChange={(e) => updateActiveZone('tellTaleReading', e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                          />
                          <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clean, Non-Congested "+ Add Another Zone" Footer Prompt */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 flex-shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-slate-600">
                      Configured <b>{zones.length} panels</b> ({zones.map(z => z.tag).join(', ')}). Need to monitor an additional extraction panel?
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addNewZone}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs active:scale-95 whitespace-nowrap cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Zone {String.fromCharCode(65 + zones.length)}</span>
                  </button>
                </div>

              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl bg-[#0f172a] hover:bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center gap-2.5 transition shadow-xl shadow-slate-900/10 hover:shadow-2xl active:scale-[0.99] cursor-pointer"
                >
                  <span>Complete Registration & Generate GIS Heatmap ({zones.length} Panels Configured)</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

            </form>

          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: GIS HEATMAP & STRATEGIC NODE PLACEMENT RESULTS                     */}
      {/* ========================================================================= */}
      {view === 'results' && submittedConfig && (
        <main className="w-full flex-1 flex flex-col items-center justify-center z-10 py-6">
          <GisHeatmapResults
            config={submittedConfig}
            onProceedToLogin={({ email, pass }) => {
              setEmail(email)
              setPassword(pass)
              setLoginRole('admin')
              setIsResetMode(false)
              setView('admin_panel')
            }}
            onBackToForm={() => setView('register')}
          />
        </main>
      )}

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center text-[11px] text-slate-400 py-3 z-10 space-y-0.5">
        <div>BhuRakshak Geotechnical Digital Twin • DGMS Compliant • Phase A Portal</div>
        <div className="text-[10px] text-slate-500 font-medium">Conceived, Designed &amp; Developed by <span className="font-bold text-slate-700">Akshat</span></div>
      </footer>
    </div>
  )
}
