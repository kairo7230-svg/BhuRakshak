import React, { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Clock,
  MapPin,
  Home,
  Users,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Activity,
  Wind,
  Layers,
  Zap,
  Calendar,
  Navigation,
  Phone,
  Radio,
  Eye,
  Info,
  ArrowLeft,
  Megaphone,
  Siren,
  HardHat,
  Droplets,
  Truck
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type WarningSeverity = 'info' | 'caution' | 'warning' | 'critical'
type WarningCategory = 'subsidence' | 'gas' | 'blast' | 'traffic' | 'water' | 'evacuation' | 'general'
type TaskStatus = 'upcoming' | 'ongoing' | 'completed'

interface Warning {
  id: string
  severity: WarningSeverity
  category: WarningCategory
  title: string
  body: string
  affectedAreas: string[]
  mineName: string
  distance: string
  issuedBy: string
  issuedAt: string
  expiresAt: string
  resolved: boolean
  actionRequired: boolean
  safetyTip?: string
}

interface CommunityTask {
  id: string
  status: TaskStatus
  title: string
  description: string
  category: WarningCategory
  mineName: string
  scheduledDate: string
  scheduledTime: string
  duration: string
  affectedAreas: string[]
  contactPerson: string
  contactPhone: string
  impactLevel: 'low' | 'medium' | 'high'
  noticeGiven: string
}

interface EmergencyContact {
  label: string
  number: string
  available: string
  icon: React.ElementType
}

// ─── Dummy Data ─────────────────────────────────────────────────────────────────
const WARNINGS: Warning[] = [
  {
    id: 'w1',
    severity: 'critical',
    category: 'gas',
    title: 'CH₄ Gas Leak — Mandatory Evacuation Zone Active',
    body: 'Methane concentration has exceeded safe limits (1.8% v/v) in the Dipka Deep Mine, Panel 4 return airway. As a precautionary measure, residents within a 500-metre radius of the eastern mine boundary are advised to immediately evacuate to the Dipka Community Hall (designated Safe Assembly Point #3). Do NOT re-enter the area until the All Clear signal is issued. Emergency ventilation is deployed. DGMS and SDRF teams are on-site.',
    affectedAreas: ['Dipka Township Block-E', 'Dipka Road Colony', "Old Miners' Quarter"],
    mineName: 'Dipka Deep Mine',
    distance: '320 m from residential perimeter',
    issuedBy: 'Emergency Coordinator, Dipka Deep Mine + Korba District SDRF',
    issuedAt: 'Today, 17:30 IST',
    expiresAt: 'Until further notice',
    resolved: false,
    actionRequired: true,
    safetyTip: 'Close all windows and doors before leaving. Do not use electrical switches. Proceed on foot to the north exit of the colony.'
  },
  {
    id: 'w2',
    severity: 'warning',
    category: 'subsidence',
    title: 'Ground Subsidence Advisory — Structural Inspection Required',
    body: "InSAR satellite data (Sentinel-1, 24-Oct-2026) reveals a 28.2 mm/yr line-of-sight surface displacement in the Zone A Panel 7 vicinity. Buildings within the mapped subsidence bowl (approx. 800 m radius from shaft mouth) may experience micro-cracking in walls or floors. Residents are advised to inspect their homes for new cracks in load-bearing walls. Report any findings to the District Collector's helpline.",
    affectedAreas: ['Singhali Colony Sector 2', 'Singhali Colony Sector 3', 'Near Korba Nala Bridge'],
    mineName: 'Singhali Underground Colliery',
    distance: '480 m from residential perimeter',
    issuedBy: 'Safety Officer, Singhali Colliery + Korba District Administration',
    issuedAt: 'Today, 14:00 IST',
    expiresAt: '31-Oct-2026',
    resolved: false,
    actionRequired: true,
    safetyTip: 'Look for hairline cracks near window frames, door jambs, and corner junctions of walls. Photograph and report to 1800-XXX-XXXX (toll free).'
  },
  {
    id: 'w3',
    severity: 'caution',
    category: 'blast',
    title: 'Scheduled Controlled Blasting — Noise & Vibration Advisory',
    body: 'A scheduled controlled blasting operation (rock loosening for longwall advance) is planned at Moonidih Deep Longwall Mine on 25-Oct-2026 between 06:00–06:30 IST. Residents within 1 km may feel ground vibration (estimated < 5 mm/s PPV) and hear a muffled blast sound. This is a routine, DGMS-approved procedure. There is NO danger to life or property. Please keep livestock indoors and avoid startling during the blast window.',
    affectedAreas: ['Moonidih Colony A & B', 'Dhanbad Road Settlement', 'Jharia Township Ward 4'],
    mineName: 'Moonidih Deep Longwall Mine',
    distance: '650 m from residential perimeter',
    issuedBy: 'Mine Manager, Moonidih Deep Mine',
    issuedAt: 'Today, 10:00 IST',
    expiresAt: '25-Oct-2026, 07:00 IST',
    resolved: false,
    actionRequired: false,
    safetyTip: 'Keep children and elderly away from windows during the 06:00–06:30 IST window. Tremors will last less than 3 seconds.'
  },
  {
    id: 'w4',
    severity: 'info',
    category: 'water',
    title: 'Mine Drainage Discharge — Downstream Water Notice',
    body: 'Chinakuri Underground Mine will discharge treated mine water into the Chinakuri Nala on 26–27 Oct 2026 for desilting operations. The effluent meets CPCB standards. However, residents using nala water for irrigation are advised to pause usage during this 48-hour window. WBPCB monitoring teams will be stationed at the discharge point.',
    affectedAreas: ['Chinakuri Village', 'Nala-side Agricultural Fields', 'Panagarh Road Hamlet'],
    mineName: 'Chinakuri Underground Mine',
    distance: 'Nala corridor — 200 m from nearest settlement',
    issuedBy: 'Environment Officer, Chinakuri Mine + WBPCB',
    issuedAt: 'Yesterday, 16:00 IST',
    expiresAt: '27-Oct-2026, 23:59 IST',
    resolved: false,
    actionRequired: false,
    safetyTip: 'Do not use nala water for drinking or cooking during this period. Tanker water supply will be provided at the Chinakuri Village Chowk.'
  },
  {
    id: 'w5',
    severity: 'info',
    category: 'general',
    title: 'Night Shift Road Closure — Convoy Movement',
    body: 'The Korba–Singhali Road (stretch: Mine Gate No. 3 to Township Junction) will be closed for civilian traffic between 22:00–04:00 IST on 24–25 Oct 2026 for a heavy machinery convoy movement (20-tonne longwall support segments). Alternate route via NH-130D is advised.',
    affectedAreas: ['Singhali Main Road Stretch', 'Mine Gate No. 3 vicinity'],
    mineName: 'Singhali Underground Colliery',
    distance: 'Road closure along residential access',
    issuedBy: 'Traffic Management Cell, BhuRakshak + NHAI',
    issuedAt: 'Yesterday, 18:00 IST',
    expiresAt: '25-Oct-2026, 04:00 IST',
    resolved: false,
    actionRequired: false
  },
  {
    id: 'w6',
    severity: 'caution',
    category: 'general',
    title: 'Roof Fall Recovery — Dust & Noise (Resolved)',
    body: 'Minor roof spall at Chinakuri Mine Section C (600m level) has been contained and the affected heading is sealed. Dust suppression operations completed. No surface impact. Residents near Chinakuri Colony were advised to keep windows closed during 10:00–12:00 IST. Advisory now lifted.',
    affectedAreas: ['Chinakuri Colony South Block'],
    mineName: 'Chinakuri Underground Mine',
    distance: '520 m below surface — no direct surface impact',
    issuedBy: 'Mine Safety Officer, Chinakuri',
    issuedAt: 'Today, 09:45 IST',
    expiresAt: 'Resolved at 12:15 IST',
    resolved: true,
    actionRequired: false
  }
]

const COMMUNITY_TASKS: CommunityTask[] = [
  {
    id: 't1',
    status: 'upcoming',
    title: 'Emergency Evacuation Drill — Panel 4 Scenario',
    description: 'Mandatory community-level evacuation drill covering gas leak scenario for Dipka Township Blocks C, D, E. All residents in the affected zones must participate. BhuRakshak safety personnel and SDRF will guide the exercise. Attendance will be recorded by colony welfare officers.',
    category: 'evacuation',
    mineName: 'Dipka Deep Mine',
    scheduledDate: '28-Oct-2026 (Monday)',
    scheduledTime: '08:00 IST',
    duration: '~90 minutes',
    affectedAreas: ['Dipka Township Block C', 'Dipka Township Block D', 'Dipka Township Block E'],
    contactPerson: 'Mr. Vikram Singh (Emergency Coordinator)',
    contactPhone: '+91-98760-12345',
    impactLevel: 'high',
    noticeGiven: '7 days in advance'
  },
  {
    id: 't2',
    status: 'upcoming',
    title: 'Controlled Blasting — Longwall Face Advance',
    description: 'Routine DGMS-approved controlled blasting at the longwall face (Panel 7). Residents within 1 km will experience brief vibration (< 5 mm/s PPV) and noise. No structural risk. Operations will pause in case of adverse weather.',
    category: 'blast',
    mineName: 'Moonidih Deep Longwall Mine',
    scheduledDate: '25-Oct-2026 (Saturday)',
    scheduledTime: '06:00 – 06:30 IST',
    duration: '30 minutes',
    affectedAreas: ['Moonidih Colony A & B', 'Jharia Ward 4'],
    contactPerson: 'Mr. R.K. Mishra (Chief Mine Manager)',
    contactPhone: '+91-94561-88821',
    impactLevel: 'low',
    noticeGiven: '48 hours in advance'
  },
  {
    id: 't3',
    status: 'upcoming',
    title: 'Road Closure — Heavy Machinery Convoy',
    description: 'Korba–Singhali Road partial closure (Mine Gate 3 to Township Junction) for longwall support segment transport. Civilian traffic to use NH-130D alternate route. Police escort will be present.',
    category: 'traffic',
    mineName: 'Singhali Underground Colliery',
    scheduledDate: '24-Oct-2026 (Tonight)',
    scheduledTime: '22:00 – 04:00 IST',
    duration: '6 hours',
    affectedAreas: ['Singhali Main Road Stretch', 'Mine Gate 3 Area'],
    contactPerson: 'Traffic Cell, BhuRakshak HQ',
    contactPhone: '+91-77220-33445',
    impactLevel: 'medium',
    noticeGiven: '24 hours in advance'
  },
  {
    id: 't4',
    status: 'upcoming',
    title: 'Mine Water Discharge — Nala Maintenance',
    description: 'Treated mine water discharge into Chinakuri Nala for desilting. CPCB-compliant. Irrigation-use pause advised. Tanker water supply provided at Chinakuri Chowk. WBPCB inspectors on-site.',
    category: 'water',
    mineName: 'Chinakuri Underground Mine',
    scheduledDate: '26–27 Oct 2026',
    scheduledTime: '08:00 IST (start)',
    duration: '48 hours',
    affectedAreas: ['Chinakuri Village', 'Nala-Side Agricultural Fields'],
    contactPerson: 'Env. Officer, Chinakuri Mine',
    contactPhone: '+91-80019-22334',
    impactLevel: 'low',
    noticeGiven: '3 days in advance'
  },
  {
    id: 't5',
    status: 'ongoing',
    title: 'Subsidence Monitoring Survey — Ground Inspection',
    description: 'BhuRakshak ground survey teams are conducting door-to-door structural inspection in Singhali Colony Sectors 2 & 3 following elevated InSAR displacement readings. Residents are requested to allow access to inspectors carrying official BhuRakshak ID cards for a 10-minute interior inspection.',
    category: 'subsidence',
    mineName: 'Singhali Underground Colliery',
    scheduledDate: '24–26 Oct 2026',
    scheduledTime: '09:00 – 17:00 IST daily',
    duration: '3 days',
    affectedAreas: ['Singhali Colony Sector 2', 'Singhali Colony Sector 3'],
    contactPerson: 'Safety Officer D. Patel',
    contactPhone: '+91-99887-66554',
    impactLevel: 'medium',
    noticeGiven: '5 days in advance'
  },
  {
    id: 't6',
    status: 'completed',
    title: 'Dust Suppression & Roof Fall Containment',
    description: 'Roof spall containment and surface dust suppression operations in Chinakuri Colony South Block vicinity. Completed successfully. Advisory lifted. No structural damage to surface buildings.',
    category: 'general',
    mineName: 'Chinakuri Underground Mine',
    scheduledDate: '24-Oct-2026',
    scheduledTime: '10:00 – 12:15 IST',
    duration: '2 hrs 15 min',
    affectedAreas: ['Chinakuri Colony South Block'],
    contactPerson: 'Safety Officer, Chinakuri Mine',
    contactPhone: '+91-80019-22334',
    impactLevel: 'low',
    noticeGiven: '2 hours in advance (emergency)'
  }
]

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { label: 'BhuRakshak Emergency Hotline', number: '1800-222-MINE', available: '24/7', icon: Siren },
  { label: 'DGMS Regional Office (Dhanbad)', number: '0326-221-1391', available: 'Mon–Sat 09:00–17:00', icon: ShieldCheck },
  { label: 'SDRF Control Room (Korba)', number: '07759-222-881', available: '24/7', icon: Radio },
  { label: 'District Collector Helpline', number: '1800-233-4455', available: '24/7', icon: Phone },
  { label: 'Mines Rescue Station (Dhanbad)', number: '0326-221-0016', available: '24/7', icon: HardHat },
]

// ─── Sub-components ─────────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<WarningSeverity, { label: string; bannerCls: string; badgeCls: string; iconCls: string; borderCls: string; bgCls: string }> = {
  critical: {
    label: '🚨 CRITICAL',
    bannerCls: 'bg-rose-600',
    badgeCls: 'bg-rose-100 text-rose-700 border-rose-300',
    iconCls: 'text-rose-600',
    borderCls: 'border-rose-300 ring-1 ring-rose-200',
    bgCls: 'bg-rose-50/40'
  },
  warning: {
    label: '⚠️ WARNING',
    bannerCls: 'bg-orange-500',
    badgeCls: 'bg-orange-100 text-orange-700 border-orange-300',
    iconCls: 'text-orange-500',
    borderCls: 'border-orange-200',
    bgCls: 'bg-orange-50/30'
  },
  caution: {
    label: '🔶 CAUTION',
    bannerCls: 'bg-amber-500',
    badgeCls: 'bg-amber-100 text-amber-700 border-amber-300',
    iconCls: 'text-amber-500',
    borderCls: 'border-amber-200',
    bgCls: 'bg-amber-50/30'
  },
  info: {
    label: 'ℹ️ INFO',
    bannerCls: 'bg-blue-500',
    badgeCls: 'bg-blue-100 text-blue-700 border-blue-200',
    iconCls: 'text-blue-500',
    borderCls: 'border-blue-200',
    bgCls: 'bg-blue-50/20'
  }
}

const CATEGORY_ICONS: Record<WarningCategory, React.ElementType> = {
  subsidence: Layers,
  gas: Wind,
  blast: Zap,
  traffic: Truck,
  water: Droplets,
  evacuation: Navigation,
  general: Megaphone
}

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; cls: string; dot: string }> = {
  upcoming: { label: 'Upcoming', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  ongoing: { label: 'Ongoing', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-pulse' },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
}

const IMPACT_CONFIG: Record<CommunityTask['impactLevel'], string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-rose-50 text-rose-700 border-rose-200'
}

function WarningCard({ warning }: { warning: Warning }) {
  const [expanded, setExpanded] = useState(warning.severity === 'critical')
  const s = SEVERITY_CONFIG[warning.severity]
  const CategoryIcon = CATEGORY_ICONS[warning.category]

  return (
    <div className={`rounded-2xl border ${s.borderCls} shadow-sm overflow-hidden ${warning.resolved ? 'opacity-60' : ''}`}>
      {/* Severity Banner */}
      <div className={`flex items-center gap-2 px-5 py-2 ${s.bannerCls}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-white flex-shrink-0" />
        <span className="text-[11px] font-extrabold text-white uppercase tracking-widest">{s.label}</span>
        {warning.resolved && (
          <span className="ml-auto text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">✓ RESOLVED</span>
        )}
        {warning.actionRequired && !warning.resolved && (
          <span className="ml-auto text-[10px] font-extrabold bg-white text-rose-700 px-2 py-0.5 rounded-full animate-pulse">
            ⚡ ACTION REQUIRED
          </span>
        )}
      </div>

      <div className={`px-5 pt-4 pb-4 ${s.bgCls}`}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
            warning.severity === 'critical' ? 'bg-rose-100 border-rose-200' :
            warning.severity === 'warning' ? 'bg-orange-100 border-orange-200' :
            warning.severity === 'caution' ? 'bg-amber-100 border-amber-200' :
            'bg-blue-100 border-blue-200'
          }`}>
            <CategoryIcon className={`w-5 h-5 ${s.iconCls}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-slate-950 leading-snug mb-1">{warning.title}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase border px-2 py-0.5 rounded-full ${s.badgeCls}`}>
                {warning.category}
              </span>
              <div className="flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                <span className="text-[10px] text-slate-500 font-medium">{warning.mineName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Navigation className="w-2.5 h-2.5 text-slate-400" />
                <span className="text-[10px] text-slate-500 font-medium">{warning.distance}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 p-1.5 rounded-xl hover:bg-black/5 transition cursor-pointer"
          >
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Affected Areas */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {warning.affectedAreas.map(area => (
            <span key={area} className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
              <Home className="w-2.5 h-2.5 text-slate-400" />
              {area}
            </span>
          ))}
        </div>

        {/* Expanded Body */}
        {expanded && (
          <div className="space-y-3 border-t border-black/5 pt-3">
            <p className="text-xs text-slate-700 leading-relaxed">{warning.body}</p>
            {warning.safetyTip && (
              <div className="flex items-start gap-2 p-3 bg-white rounded-xl border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mb-0.5">Safety Tip</p>
                  <p className="text-xs text-slate-600">{warning.safetyTip}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex flex-col gap-0.5 p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium uppercase tracking-wide">Issued</span>
                <span className="font-bold text-slate-700">{warning.issuedAt}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium uppercase tracking-wide">Expires</span>
                <span className="font-bold text-slate-700">{warning.expiresAt}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              <span className="font-bold">Issued by:</span> {warning.issuedBy}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-3">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] text-slate-400">{warning.issuedAt}</span>
          <button
            onClick={() => setExpanded(e => !e)}
            className="ml-auto text-[10px] font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            {expanded ? 'Show less ↑' : 'Read full advisory ↓'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: CommunityTask }) {
  const [expanded, setExpanded] = useState(task.status === 'ongoing')
  const s = TASK_STATUS_CONFIG[task.status]
  const CategoryIcon = CATEGORY_ICONS[task.category]

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${task.status === 'completed' ? 'opacity-65' : ''}`}>
      <div className="px-5 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
            task.category === 'blast' ? 'bg-amber-50 border-amber-200' :
            task.category === 'evacuation' ? 'bg-rose-50 border-rose-200' :
            task.category === 'water' ? 'bg-blue-50 border-blue-200' :
            task.category === 'subsidence' ? 'bg-purple-50 border-purple-200' :
            'bg-slate-50 border-slate-200'
          }`}>
            <CategoryIcon className={`w-5 h-5 ${
              task.category === 'blast' ? 'text-amber-600' :
              task.category === 'evacuation' ? 'text-rose-600' :
              task.category === 'water' ? 'text-blue-600' :
              task.category === 'subsidence' ? 'text-purple-600' :
              'text-slate-500'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <div className={`flex items-center gap-1 text-[10px] font-extrabold uppercase border px-2 py-0.5 rounded-full ${s.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </div>
              <span className={`text-[10px] font-extrabold uppercase border px-2 py-0.5 rounded-full ${IMPACT_CONFIG[task.impactLevel]}`}>
                {task.impactLevel} impact
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-950 leading-snug">{task.title}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5 text-slate-400" />
              <span className="text-[10px] text-slate-500">{task.mineName}</span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Schedule Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-700">{task.scheduledDate}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-700">{task.scheduledTime}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Activity className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-700">{task.duration}</span>
          </div>
        </div>

        {/* Affected Areas */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {task.affectedAreas.map(area => (
            <span key={area} className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
              <Home className="w-2.5 h-2.5 text-slate-400" />
              {area}
            </span>
          ))}
        </div>

        {/* Expanded */}
        {expanded && (
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-extrabold text-slate-900">{task.contactPerson}</p>
                <p className="text-[10px] text-slate-500 font-mono">{task.contactPhone}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              <span className="font-bold text-slate-600">Notice given:</span> {task.noticeGiven}
            </p>
          </div>
        )}

        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-[10px] font-bold text-slate-400 hover:text-slate-700 transition cursor-pointer"
        >
          {expanded ? '↑ Collapse' : '↓ View details'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────
interface Props {
  onBack: () => void
}

export default function NearbyUpdates({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'warnings' | 'tasks' | 'contacts'>('warnings')

  const activeWarnings = WARNINGS.filter(w => !w.resolved)
  const criticalCount = activeWarnings.filter(w => w.severity === 'critical').length
  const upcomingTasks = COMMUNITY_TASKS.filter(t => t.status === 'upcoming').length
  const ongoingTasks = COMMUNITY_TASKS.filter(t => t.status === 'ongoing').length

  return (
    <div className="min-h-screen w-full bg-[#f0f4f8] pb-12">

      {/* ── Top Navbar ──────────────────────────────────────────────────────── */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-xs cursor-pointer flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-950">Nearby Updates</span>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 tracking-wider">
                  PUBLIC
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">Warnings & upcoming tasks for residents near BhuRakshak mines</p>
            </div>
          </div>
          {criticalCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 animate-pulse">
              <Siren className="w-3.5 h-3.5 text-white" />
              <span className="text-[11px] font-extrabold text-white">{criticalCount} Critical</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-rose-900 border-b border-slate-700 px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <p className="text-rose-300 text-xs font-bold uppercase tracking-widest mb-1">BhuRakshak Community Safety Portal</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Warnings & Updates<br />
              <span className="text-rose-400">for Nearby Residents</span>
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xl mt-2">
              Real-time safety warnings, scheduled mine operations, and community notices affecting residents living near BhuRakshak-monitored collieries. Stay informed and stay safe.
            </p>
          </div>
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-3">
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl ${criticalCount > 0 ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-white/5 border border-white/10'}`}>
              <AlertTriangle className={`w-4 h-4 ${criticalCount > 0 ? 'text-rose-300' : 'text-slate-400'}`} />
              <div>
                <p className={`text-lg font-black leading-none ${criticalCount > 0 ? 'text-rose-200' : 'text-white'}`}>{activeWarnings.length}</p>
                <p className={`text-[10px] font-medium ${criticalCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Active Warnings</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Calendar className="w-4 h-4 text-amber-300" />
              <div>
                <p className="text-lg font-black text-amber-200 leading-none">{upcomingTasks}</p>
                <p className="text-[10px] text-amber-400 font-medium">Upcoming Tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <Activity className="w-4 h-4 text-blue-300" />
              <div>
                <p className="text-lg font-black text-blue-200 leading-none">{ongoingTasks}</p>
                <p className="text-[10px] text-blue-400 font-medium">Ongoing Now</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10">
              <Eye className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-lg font-black text-white leading-none">{WARNINGS.filter(w => w.resolved).length}</p>
                <p className="text-[10px] text-slate-400 font-medium">Resolved</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-[57px] z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 py-2">
            {[
              { key: 'warnings' as const, label: 'Warnings & Advisories', icon: AlertTriangle, count: activeWarnings.length, countCls: criticalCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600' },
              { key: 'tasks' as const, label: 'Scheduled Tasks', icon: Calendar, count: upcomingTasks + ongoingTasks, countCls: 'bg-amber-100 text-amber-700' },
              { key: 'contacts' as const, label: 'Emergency Contacts', icon: Phone, count: null, countCls: '' }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {tab.count !== null && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key ? 'bg-white/20 text-white' : tab.countCls
                    }`}>{tab.count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 space-y-4">

        {/* ── Warnings Tab ── */}
        {activeTab === 'warnings' && (
          <>
            {criticalCount > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <Siren className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-extrabold text-rose-900">{criticalCount} Critical Warning{criticalCount > 1 ? 's' : ''} Active</p>
                  <p className="text-xs text-rose-700 mt-0.5">Immediate attention required. Follow evacuation instructions if your area is listed. Call 1800-222-MINE for guidance.</p>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 font-medium px-1">
              Showing {activeWarnings.length} active warnings + {WARNINGS.filter(w => w.resolved).length} resolved
            </p>
            {WARNINGS.map(w => <WarningCard key={w.id} warning={w} />)}
          </>
        )}

        {/* ── Tasks Tab ── */}
        {activeTab === 'tasks' && (
          <>
            {/* Ongoing tasks first */}
            {COMMUNITY_TASKS.filter(t => t.status === 'ongoing').length > 0 && (
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700 mb-3 px-1">🔄 Ongoing Now</p>
                <div className="space-y-4">
                  {COMMUNITY_TASKS.filter(t => t.status === 'ongoing').map(t => <TaskCard key={t.id} task={t} />)}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700 mb-3 px-1">📅 Upcoming</p>
              <div className="space-y-4">
                {COMMUNITY_TASKS.filter(t => t.status === 'upcoming').map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 px-1">✅ Completed</p>
              <div className="space-y-4">
                {COMMUNITY_TASKS.filter(t => t.status === 'completed').map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          </>
        )}

        {/* ── Contacts Tab ── */}
        {activeTab === 'contacts' && (
          <>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 mb-2">
              <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                In case of any emergency related to nearby mine operations, contact BhuRakshak's 24/7 hotline first. Do not wait to see if a situation resolves on its own — early reporting saves lives.
              </p>
            </div>
            <div className="space-y-3">
              {EMERGENCY_CONTACTS.map((contact, i) => {
                const Icon = contact.icon
                return (
                  <div key={i} className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-slate-900">{contact.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{contact.available}</p>
                    </div>
                    <a
                      href={`tel:${contact.number.replace(/[^0-9+]/g, '')}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition flex-shrink-0"
                    >
                      <Phone className="w-3 h-3" />
                      {contact.number}
                    </a>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 p-5 bg-rose-50 border border-rose-200 rounded-2xl">
              <p className="text-sm font-extrabold text-rose-900 mb-2">🆘 If this is a life-threatening emergency</p>
              <p className="text-xs text-rose-700 leading-relaxed mb-3">
                Call <strong>112</strong> (National Emergency) immediately. Then call the BhuRakshak Emergency Hotline to report the mine-related incident for coordinated response.
              </p>
              <a href="tel:112" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold transition">
                <Phone className="w-4 h-4" />
                Call 112 — National Emergency
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
