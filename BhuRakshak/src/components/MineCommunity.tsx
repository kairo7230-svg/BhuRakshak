import React, { useState } from 'react'
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ThumbsUp,
  Share2,
  Bell,
  HardHat,
  Flame,
  Wind,
  Zap,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Image as ImageIcon,
  FileText,
  HelpCircle,
  Send,
  Filter,
  Search,
  ChevronDown,
  Shield,
  Activity,
  Layers,
  Heart,
  Bookmark,
  ArrowLeft,
  Megaphone,
  Siren,
  Calendar,
  ChevronRight
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type PostType = 'update' | 'alert' | 'help' | 'achievement'
type FilterType = 'all' | 'update' | 'alert' | 'help' | 'achievement'

interface Mine {
  id: string
  name: string
  region: string
  state: string
  workers: number
  activeWorkers: number
  status: 'normal' | 'caution' | 'critical'
  avatar: string
  verified: boolean
}

interface Post {
  id: string
  mineId: string
  author: string
  role: string
  avatar: string
  type: PostType
  title: string
  body: string
  tags: string[]
  likes: number
  comments: number
  shares: number
  liked: boolean
  bookmarked: boolean
  timestamp: string
  workers?: number
  attachmentType?: 'image' | 'report'
  attachmentLabel?: string
  urgent?: boolean
}

interface Alert {
  id: string
  mineId: string
  mineName: string
  type: 'gas' | 'seismic' | 'fire' | 'electrical' | 'structural'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const MINES: Mine[] = [
  { id: 'm1', name: 'Singhali Underground Colliery', region: 'Korba Coalfield', state: 'Chhattisgarh', workers: 847, activeWorkers: 312, status: 'caution', avatar: 'SU', verified: true },
  { id: 'm2', name: 'Moonidih Deep Longwall Mine', region: 'Jharia Coalfield', state: 'Jharkhand', workers: 1240, activeWorkers: 486, status: 'normal', avatar: 'MD', verified: true },
  { id: 'm3', name: 'Chinakuri Underground Mine', region: 'Raniganj Coalfield', state: 'West Bengal', workers: 692, activeWorkers: 247, status: 'normal', avatar: 'CU', verified: true },
  { id: 'm4', name: 'Dipka Deep Mine', region: 'Korba Coalfield', state: 'Chhattisgarh', workers: 534, activeWorkers: 189, status: 'critical', avatar: 'DD', verified: true },
  { id: 'm5', name: 'Jharia Block-II Colliery', region: 'Jharia Coalfield', state: 'Jharkhand', workers: 423, activeWorkers: 156, status: 'normal', avatar: 'JB', verified: false },
  { id: 'm6', name: 'Sudamdih Shaft Mine', region: 'Jharia Coalfield', state: 'Jharkhand', workers: 318, activeWorkers: 98, status: 'normal', avatar: 'SS', verified: true },
]

const COMMUNITY_ALERTS: Alert[] = [
  { id: 'a1', mineId: 'm4', mineName: 'Dipka Deep Mine', type: 'gas', severity: 'critical', message: 'CH₄ concentration exceeding 1.8% v/v in Panel 4 return airway. Evacuation protocol initiated. All personnel accounted for. Ventilation team deployed.', timestamp: '8 min ago', resolved: false },
  { id: 'a2', mineId: 'm1', mineName: 'Singhali Underground Colliery', type: 'seismic', severity: 'high', message: 'Micro-seismic event Richter 2.1 detected at depth 185m in Zone A. Subsidence velocity spike observed on InSAR overlay. Monitoring elevated.', timestamp: '34 min ago', resolved: false },
  { id: 'a3', mineId: 'm2', mineName: 'Moonidih Deep Longwall Mine', type: 'electrical', severity: 'medium', message: 'Conveyor belt drive motor tripped in maingate roadway. Production halted. Electrical team investigating. Expected restoration: 2 hrs.', timestamp: '1 hr ago', resolved: true },
  { id: 'a4', mineId: 'm3', mineName: 'Chinakuri Underground Mine', type: 'structural', severity: 'low', message: 'Minor roof spall detected at 600m level, Section C. Roof bolting pattern adjusted. DGMS inspector notified per SOP.', timestamp: '3 hrs ago', resolved: true },
]

const POSTS: Post[] = [
  {
    id: 'p1', mineId: 'm2', author: 'Engr. R. K. Mishra', role: 'Chief Mine Manager • Moonidih', avatar: 'RM',
    type: 'achievement', title: '🏆 Zero LTI — 365 Consecutive Days!',
    body: 'Proud to announce that Moonidih Deep Longwall Mine has achieved 365 consecutive days of ZERO Lost Time Injuries. This milestone belongs to all 1,240 of our workforce and reflects our unwavering commitment to safety-first operations. We credit the BhuRakshak subsidence monitoring system for enabling proactive hazard identification before they become incidents. #ZeroHarm #SafetyFirst',
    tags: ['#ZeroHarm', '#MilestoneAchieved', '#LongwallSafety'],
    likes: 184, comments: 47, shares: 62, liked: true, bookmarked: false,
    timestamp: '2 hrs ago', workers: 1240, attachmentType: 'image', attachmentLabel: 'Safety Milestone Certificate.jpg', urgent: false
  },
  {
    id: 'p2', mineId: 'm1', author: 'Safety Officer D. Patel', role: 'Safety Officer • Singhali Colliery', avatar: 'DP',
    type: 'alert', title: '⚠️ Zone A Subsidence Rate Elevated — All Mines Advisory',
    body: 'Following InSAR stacking results from Sentinel-1 pass (12-day revisit), Zone A Panel 7 is showing 28.2 mm/yr LOS velocity — up 3.1 mm/yr from last cycle. We are escalating to DGMS per SOP. Sharing raw InSAR coherence map and EKF prediction outputs. Recommending adjacent mines check their subsidence monitoring intervals.\n\nAll mines with longwall panels deeper than 180m: please cross-check your current InSAR baselines.',
    tags: ['#InSAR', '#SubsidenceAlert', '#DGMS', '#SafetyAdvisory'],
    likes: 97, comments: 88, shares: 121, liked: false, bookmarked: true,
    timestamp: '4 hrs ago', workers: 312, attachmentType: 'report', attachmentLabel: 'InSAR_Coherence_ZoneA_Oct24.pdf', urgent: true
  },
  {
    id: 'p3', mineId: 'm3', author: 'Ventilation Engr. S. Bose', role: 'Ventilation Engineer • Chinakuri Mine', avatar: 'SB',
    type: 'help', title: '🆘 Seeking Guidance: UWB Mesh Coverage at 600m Depth',
    body: 'We are facing persistent UWB beacon dead zones in the 600m level, Section C-D junction. Our mesh density follows standard DGMS guidelines but we are still getting 8–12 second lapses in worker location telemetry. Has any mine team dealt with multi-reflective roof strata affecting UWB propagation? Would appreciate if anyone can share antenna placement configurations that worked for deep seams with laminated sandstone roofs.',
    tags: ['#UWB', '#WorkerTracking', '#TechHelp', '#IoT'],
    likes: 43, comments: 31, shares: 9, liked: false, bookmarked: false,
    timestamp: '6 hrs ago', workers: 247
  },
  {
    id: 'p4', mineId: 'm5', author: 'Mine Surveyor A. Khan', role: 'Surveyor • Jharia Block-II', avatar: 'AK',
    type: 'update', title: '📊 Monthly Production & Safety Update — October 2026',
    body: 'October 2026 Summary for Jharia Block-II:\n• Production: 47,320 MT (↑6.2% vs September)\n• Worker Shifts Completed: 3,892\n• Near-Miss Reports Filed: 4 (all actioned)\n• Subsidence Monitoring: 3 cycles completed, all within acceptable limits\n• Emergency Drills Conducted: 2\n• Active Sensors Online: 94%\n\nWe are planning to upgrade our tilt sensor firmware to v3.2 next week. Any mine already on v3.2 — please share your calibration offsets.',
    tags: ['#MonthlyUpdate', '#Production', '#SafetyStats'],
    likes: 67, comments: 22, shares: 18, liked: false, bookmarked: false,
    timestamp: '10 hrs ago', workers: 156, attachmentType: 'report', attachmentLabel: 'JhariaBlockII_Oct26_Report.pdf'
  },
  {
    id: 'p5', mineId: 'm6', author: 'Mine Manager K. Sharma', role: 'Mine Manager • Sudamdih Shaft', avatar: 'KS',
    type: 'update', title: '🔧 New EKF Tuning Parameters — Sharing for Community Use',
    body: 'After 3 weeks of calibration trials, we have finalised our Extended Kalman Filter drift neutralization parameters for our 380m deep shaft conditions. Sharing our tuned Q and R matrices for the 3-state model (surface deformation, strain rate, sensor drift):\n\nQ = diag([0.02, 0.008, 0.001]) | R = diag([0.15, 0.09])\n\nWith these parameters, our RMSE dropped from 4.7mm to 1.9mm against ground truth extensometer readings. Happy to share the full calibration log if anyone needs it.',
    tags: ['#EKF', '#KalmanFilter', '#Calibration', '#SensorFusion'],
    likes: 112, comments: 64, shares: 44, liked: true, bookmarked: true,
    timestamp: '1 day ago', workers: 98
  },
  {
    id: 'p6', mineId: 'm4', author: 'Emergency Coordinator V. Singh', role: 'Emergency Coord. • Dipka Deep Mine', avatar: 'VS',
    type: 'alert', title: '🚨 ACTIVE INCIDENT: Panel 4 Gas Elevated — Operations Suspended',
    body: 'UPDATE (18:08 IST): All 189 workers in active zones have been evacuated. Methane levels at 1.82% v/v as of last sensor read. Main fan auxiliary circuit engaged. Rescue team on standby at surface. Methanometer teams entering 30 min intervals. Requesting mutual aid standby from Moonidih and Singhali rescue teams as per BhuRakshak MCA.\n\nNext update: 18:45 IST.',
    tags: ['#ActiveIncident', '#GasAlert', '#MutualAid', '#Evacuation'],
    likes: 12, comments: 38, shares: 87, liked: false, bookmarked: true,
    timestamp: '42 min ago', workers: 189, urgent: true
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function MineStatusDot({ status }: { status: Mine['status'] }) {
  return (
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
      status === 'normal' ? 'bg-emerald-500' :
      status === 'caution' ? 'bg-amber-500 animate-pulse' :
      'bg-rose-600 animate-pulse'
    }`} />
  )
}

function MineAvatar({ mine, size = 'sm' }: { mine: Mine; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-base' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  const color = mine.status === 'normal' ? 'bg-emerald-100 text-emerald-800' : mine.status === 'caution' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
  return (
    <div className={`${sizeClass} ${color} rounded-xl font-black flex items-center justify-center flex-shrink-0 border border-white shadow-sm`}>
      {mine.avatar}
    </div>
  )
}

function PostTypeBadge({ type, urgent }: { type: PostType; urgent?: boolean }) {
  const config = {
    update: { label: 'Update', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    alert: { label: 'Alert', cls: urgent ? 'bg-rose-600 text-white border-rose-700' : 'bg-rose-50 text-rose-700 border-rose-200' },
    help: { label: 'Help Needed', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    achievement: { label: 'Achievement', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }[type]
  return (
    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.cls}`}>
      {urgent ? '🚨 ' : ''}{config.label}
    </span>
  )
}

function AlertSeverityBadge({ severity }: { severity: Alert['severity'] }) {
  const config = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    critical: 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse',
  }[severity]
  return (
    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${config}`}>
      {severity}
    </span>
  )
}

function AlertTypeIcon({ type }: { type: Alert['type'] }) {
  const config = {
    gas: { icon: Wind, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    seismic: { icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
    fire: { icon: Flame, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    electrical: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
    structural: { icon: Layers, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  }[type]
  const Icon = config.icon
  return (
    <div className={`w-8 h-8 rounded-xl ${config.bg} border flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
    </div>
  )
}

interface MineCommunityProps {
  onBack?: () => void
  onNavigateNearby?: () => void
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MineCommunity({ onBack, onNavigateNearby }: MineCommunityProps = {}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const [postLikes, setPostLikes] = useState<Record<string, boolean>>(
    Object.fromEntries(POSTS.map(p => [p.id, p.liked]))
  )
  const [postBookmarks, setPostBookmarks] = useState<Record<string, boolean>>(
    Object.fromEntries(POSTS.map(p => [p.id, p.bookmarked]))
  )
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>(
    Object.fromEntries(POSTS.map(p => [p.id, p.likes]))
  )

  const handleNavigateNearby = () => {
    if (onNavigateNearby) {
      onNavigateNearby()
    } else {
      window.location.hash = '#/nearbyupdates'
    }
  }

  const filteredPosts = POSTS.filter(p => {
    const matchFilter = activeFilter === 'all' || p.type === activeFilter
    const matchSearch = searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase())
    return matchFilter && matchSearch
  })

  const activeMines = MINES.filter(m => m.status !== 'normal').length
  const totalWorkers = MINES.reduce((a, m) => a + m.workers, 0)
  const totalActiveWorkers = MINES.reduce((a, m) => a + m.activeWorkers, 0)
  const activeAlerts = COMMUNITY_ALERTS.filter(a => !a.resolved).length

  const toggleLike = (postId: string) => {
    setPostLikes(prev => {
      const next = { ...prev, [postId]: !prev[postId] }
      setPostLikeCounts(counts => ({
        ...counts,
        [postId]: counts[postId] + (next[postId] ? 1 : -1)
      }))
      return next
    })
  }

  const toggleBookmark = (postId: string) => {
    setPostBookmarks(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] pb-12">
      {/* ── Top Bar with Back & Nearby Updates Route Switcher ────────────────── */}
      {onBack && (
        <div className="w-full bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-2.5 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to BhuRakshak Portal</span>
          </button>

          <button
            onClick={handleNavigateNearby}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-xs cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Go to /nearbyupdates</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ─── Community Hero Banner ─────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 border-b border-slate-700 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  Bhu<span className="text-emerald-400">Rakshak</span> Community
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider">
                  LIVE
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-lg">
                Collaborative safety & operations hub for all BhuRakshak-connected mines. Share updates, raise alerts, seek help, and celebrate milestones together.
              </p>
            </div>
            {/* Network Stats */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex flex-col items-center px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-lg font-black text-white">{MINES.length}</span>
                <span className="text-[10px] text-slate-400 font-medium">Mines</span>
              </div>
              <div className="flex flex-col items-center px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-lg font-black text-white">{totalWorkers.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-medium">Workforce</span>
              </div>
              <div className="flex flex-col items-center px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-lg font-black text-emerald-300">{totalActiveWorkers.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-400 font-medium">Active Now</span>
              </div>
              <div className={`flex flex-col items-center px-4 py-2 rounded-2xl ${activeAlerts > 0 ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-white/5 border border-white/10'}`}>
                <span className={`text-lg font-black ${activeAlerts > 0 ? 'text-rose-300' : 'text-white'}`}>{activeAlerts}</span>
                <span className={`text-[10px] font-medium ${activeAlerts > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Live Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Resident Safety Bulletin: Warnings & Upcoming Tasks for Nearby Living People ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-5">
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3.5 border-b border-rose-200/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Warnings & Upcoming Tasks for Nearby Living People
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white">
                    Public Safety Notice
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Important geological alerts, evacuation zones, controlled blasting notices, and upcoming civil tasks affecting neighboring residential colonies.
                </p>
              </div>
            </div>

            <button
              onClick={handleNavigateNearby}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition shadow-sm hover:shadow active:scale-95 whitespace-nowrap cursor-pointer self-start md:self-center"
            >
              <span>View Full Portal (/nearbyupdates)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3.5">
            {/* Warning 1 */}
            <div className="bg-white/90 backdrop-blur rounded-xl border border-rose-200 p-3 shadow-2xs hover:border-rose-300 transition">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                  🚨 CRITICAL GAS WARNING
                </span>
                <span className="text-[10px] text-slate-400 font-medium">320m from colony</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 leading-snug">
                CH₄ Gas Leak — Dipka East Perimeter Evacuation
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                Mandatory evacuation zone active for Dipka Township Block-E & Road Colony. Proceed to Safe Assembly Point #3.
              </p>
            </div>

            {/* Warning 2 */}
            <div className="bg-white/90 backdrop-blur rounded-xl border border-amber-200 p-3 shadow-2xs hover:border-amber-300 transition">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  ⚠️ GROUND SUBSIDENCE
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Singhali Colliery</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 leading-snug">
                InSAR 28.2 mm/yr Advisory — Structural Check
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                Residents in Singhali Colony Sectors 2 & 3 advised to inspect foundation walls for micro-fissures.
              </p>
            </div>

            {/* Upcoming Task 1 */}
            <div className="bg-white/90 backdrop-blur rounded-xl border border-slate-200 p-3 shadow-2xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  UPCOMING TASK
                </span>
                <span className="text-[10px] text-slate-400 font-medium">25-Oct 06:00 IST</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 leading-snug">
                Controlled Blasting — Moonidih Colliery
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                Muffled ground tremor &lt;5 mm/s PPV expected. Keep livestock indoors. DGMS certified routine operation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-6">

        {/* ── Left Sidebar: Mine Directory ──────────────────────────────────── */}
        <aside className="space-y-4">
          {/* Mine Directory */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Mine Network</h2>
              <span className="ml-auto text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{MINES.length} mines</span>
            </div>
            <div className="divide-y divide-slate-100">
              {MINES.map(mine => (
                <div key={mine.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition cursor-pointer group">
                  <MineAvatar mine={mine} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <MineStatusDot status={mine.status} />
                      <span className="text-xs font-bold text-slate-900 truncate leading-tight">{mine.name}</span>
                      {mine.verified && <Shield className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{mine.region} • {mine.state}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <HardHat className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-700">{mine.workers.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400">total</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-700">{mine.activeWorkers}</span>
                        <span className="text-[10px] text-slate-400">active</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    mine.status === 'normal' ? 'bg-emerald-50 text-emerald-700' :
                    mine.status === 'caution' ? 'bg-amber-50 text-amber-700' :
                    'bg-rose-50 text-rose-700'
                  }`}>{mine.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Network Health</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Mines Online</span>
                <span className="text-xs font-extrabold text-slate-900">{MINES.length}/{MINES.length}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Mines at Normal</span>
                <span className="text-xs font-extrabold text-emerald-700">{MINES.filter(m => m.status === 'normal').length}/{MINES.length}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(MINES.filter(m => m.status === 'normal').length / MINES.length) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Sensor Coverage</span>
                <span className="text-xs font-extrabold text-blue-700">97.2%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '97.2%' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">EKF Models Active</span>
                <span className="text-xs font-extrabold text-purple-700">6/6</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full w-full" />
              </div>
            </div>
          </div>
        </aside>

        {/* ── Center: Feed ───────────────────────────────────────────────────── */}
        <main className="space-y-4 min-w-0">
          {/* Compose Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {!composing ? (
              <button
                onClick={() => setComposing(true)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center flex-shrink-0">A</div>
                <span className="text-sm text-slate-400 font-medium">Share an update, alert, or ask for help...</span>
              </button>
            ) : (
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center flex-shrink-0">A</div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Akshat • Admin</p>
                    <p className="text-[10px] text-slate-400">Singhali Underground Colliery</p>
                  </div>
                </div>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-none"
                  rows={3}
                  placeholder="Share an update, safety alert, or technical help request with the BhuRakshak community..."
                  autoFocus
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition cursor-pointer">
                      <ImageIcon className="w-3.5 h-3.5" /> Photo
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition cursor-pointer">
                      <FileText className="w-3.5 h-3.5" /> Report
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition cursor-pointer">
                      <AlertTriangle className="w-3.5 h-3.5" /> Alert
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 text-xs font-bold text-violet-700 transition cursor-pointer">
                      <HelpCircle className="w-3.5 h-3.5" /> Ask Help
                    </button>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setComposing(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer">Cancel</button>
                    <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition cursor-pointer">
                      <Send className="w-3.5 h-3.5" /> Post
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Post type filters */}
            <div className="flex items-center gap-1 px-4 py-2 border-t border-slate-100 overflow-x-auto">
              {(['all', 'update', 'alert', 'help', 'achievement'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wide transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    activeFilter === f
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {f === 'all' ? '📋 All' : f === 'update' ? '📊 Updates' : f === 'alert' ? '⚠️ Alerts' : f === 'help' ? '🆘 Help' : '🏆 Achievements'}
                </button>
              ))}
              <div className="ml-auto relative flex-shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search posts..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-32 transition"
                />
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-slate-400 text-sm">No posts match your filters.</p>
            </div>
          ) : filteredPosts.map(post => {
            const mine = MINES.find(m => m.id === post.mineId)!
            return (
              <div
                key={post.id}
                className={`bg-white rounded-2xl border shadow-xs overflow-hidden ${post.urgent ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'}`}
              >
                {post.urgent && (
                  <div className="flex items-center gap-2 bg-rose-600 px-5 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-extrabold text-white uppercase tracking-wider">URGENT — Active Incident</span>
                  </div>
                )}
                <div className="px-5 pt-4 pb-0">
                  {/* Post header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center flex-shrink-0 ${
                      mine.status === 'normal' ? 'bg-emerald-100 text-emerald-800' :
                      mine.status === 'caution' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>{post.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-xs font-extrabold text-slate-900">{post.author}</span>
                        {mine.verified && <Shield className="w-3 h-3 text-emerald-500" />}
                        <PostTypeBadge type={post.type} urgent={post.urgent} />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-500">{post.role}</span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          <span className="text-[10px] text-slate-400">{post.timestamp}</span>
                        </div>
                        {post.workers !== undefined && (
                          <>
                            <span className="text-[10px] text-slate-300">•</span>
                            <div className="flex items-center gap-1">
                              <HardHat className="w-2.5 h-2.5 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-700">{post.workers} workers</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Post body */}
                  <h3 className="text-sm font-extrabold text-slate-950 mb-2 leading-snug">{post.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-3">{post.body}</p>
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full cursor-pointer hover:bg-emerald-100 transition">{tag}</span>
                      ))}
                    </div>
                  )}
                  {/* Attachment */}
                  {post.attachmentType && (
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 mb-3 cursor-pointer hover:bg-slate-100 transition">
                      {post.attachmentType === 'image' ? (
                        <ImageIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-700 truncate">{post.attachmentLabel}</span>
                      <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">View</span>
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 px-4 py-2.5 border-t border-slate-100">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${postLikes[post.id] ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${postLikes[post.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                    {postLikeCounts[post.id]}
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {post.comments}
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer">
                    <Share2 className="w-3.5 h-3.5" />
                    {post.shares}
                  </button>
                  <button
                    onClick={() => toggleBookmark(post.id)}
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${postBookmarks[post.id] ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${postBookmarks[post.id] ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                </div>
              </div>
            )
          })}
        </main>

        {/* ── Right Sidebar: Live Alerts & Activity ─────────────────────────── */}
        <aside className="space-y-4">
          {/* Live Alerts Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <Bell className="w-4 h-4 text-rose-500" />
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Live Alerts</h2>
              {activeAlerts > 0 && (
                <span className="ml-auto text-[10px] font-extrabold bg-rose-600 text-white px-2 py-0.5 rounded-full animate-pulse">{activeAlerts} ACTIVE</span>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {COMMUNITY_ALERTS.map(alert => (
                <div key={alert.id} className={`p-3.5 ${alert.resolved ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-2.5">
                    <AlertTypeIcon type={alert.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-900 truncate">{alert.mineName}</span>
                        <AlertSeverityBadge severity={alert.severity} />
                        {alert.resolved && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Resolved</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3">{alert.message}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-[10px] text-slate-400">{alert.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Tags */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Trending Tags</h2>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {['#InSAR', '#ZeroHarm', '#EKF', '#SubsidenceAlert', '#DGMS', '#UWB', '#SafetyFirst', '#LongwallSafety', '#KalmanFilter', '#WorkerTracking'].map(tag => (
                <button key={tag} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition cursor-pointer">
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Worker Headcount Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <HardHat className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Workforce Today</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {MINES.map(mine => (
                <div key={mine.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <MineStatusDot status={mine.status} />
                  <span className="text-[10px] font-bold text-slate-700 flex-1 truncate">{mine.name.split(' ').slice(0, 2).join(' ')}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] font-extrabold text-emerald-700">{mine.activeWorkers}</span>
                    <span className="text-[10px] text-slate-400">/</span>
                    <span className="text-[10px] font-bold text-slate-500">{mine.workers}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50">
                <span className="text-[10px] font-extrabold text-slate-900 flex-1">Network Total</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-extrabold text-emerald-700">{totalActiveWorkers}</span>
                  <span className="text-[10px] text-slate-400">/</span>
                  <span className="text-[10px] font-bold text-slate-700">{totalWorkers}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
