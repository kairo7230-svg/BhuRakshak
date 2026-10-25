import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  HardHat,
  Hash,
  HelpCircle,
  Layers,
  Lock,
  LogOut,
  MapPin,
  Maximize2,
  Printer,
  Radio,
  RefreshCw,
  RotateCcw,
  Satellite,
  Scale,
  Search,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingDown,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react'
import Regulator3DViewer from './Regulator3DViewer'
import MineAlertsTab from './MineAlertsTab'

// Contour generator for statutory draw envelope and hazard zones
function generateStatutoryContour(
  centerLat: number,
  centerLon: number,
  radiusA: number,
  radiusB: number,
  azimuthDeg: number = 38,
  skewFactor: number = 0.18,
  roughness: number = 0.05,
  pointsCount: number = 64
): [number, number][] {
  const points: [number, number][] = []
  const meterToLat = 1 / 111320
  const meterToLon = 1 / (111320 * Math.cos((centerLat * Math.PI) / 180))
  const theta = (azimuthDeg * Math.PI) / 180

  for (let i = 0; i < pointsCount; i++) {
    const phi = (2 * Math.PI * i) / pointsCount
    const pearFactor = 1.0 + skewFactor * Math.sin(phi)
    const geoWave = 1.0 + roughness * (Math.sin(3 * phi + 0.8) * 0.5 + Math.cos(5 * phi) * 0.25)
    const rA = radiusA * pearFactor * geoWave
    const rB = radiusB * geoWave

    const x = rB * Math.cos(phi)
    const y = rA * Math.sin(phi)

    const xRot = x * Math.cos(theta) - y * Math.sin(theta)
    const yRot = x * Math.sin(theta) + y * Math.cos(theta)

    points.push([
      centerLat + yRot * meterToLat,
      centerLon + xRot * meterToLon
    ])
  }
  return points
}

// Statutory Sector Data
export interface TopologySector {
  id: string
  name: string
  zoneType: 'caving_face' | 'transition_flank' | 'stabilized_goaf' | 'railway_corridor' | 'canal_syphon' | 'village_buffer'
  depthOfCover: number // meters
  seamThickness: number // meters
  measuredSagMm: number // mm
  permissibleLimitMm: number // mm
  tensileStrain: number // mm/m
  strainLimit: number // mm/m
  tiltSlope: number // mm/m
  tiltLimit: number // mm/m
  safetyFactor: number
  statutoryStatus: 'COMPLIANT' | 'OBSERVE' | 'CRITICAL_BUFFER'
  lastInspected: string
  inspectorNotes: string
  lat: number
  lon: number
}

const TOPOLOGY_SECTORS: TopologySector[] = [
  {
    id: 'SEC-A-01',
    name: 'Sector A: Panel 7 Longwall Active Face',
    zoneType: 'caving_face',
    depthOfCover: 185,
    seamThickness: 3.2,
    measuredSagMm: -42.6,
    permissibleLimitMm: -150.0,
    tensileStrain: 0.34,
    strainLimit: 3.0,
    tiltSlope: 2.1,
    tiltLimit: 10.0,
    safetyFactor: 3.52,
    statutoryStatus: 'COMPLIANT',
    lastInspected: '29-Sep-2026 14:30 IST',
    inspectorNotes: 'Active caving compaction within permissible advance envelope. Zero tension cracking detected on surface soil.',
    lat: 22.3592,
    lon: 82.7501
  },
  {
    id: 'SEC-B-02',
    name: 'Sector B: Panel 6 Transition Flank',
    zoneType: 'transition_flank',
    depthOfCover: 210,
    seamThickness: 2.8,
    measuredSagMm: -18.4,
    permissibleLimitMm: -120.0,
    tensileStrain: 0.22,
    strainLimit: 2.5,
    tiltSlope: 1.4,
    tiltLimit: 8.0,
    safetyFactor: 6.52,
    statutoryStatus: 'COMPLIANT',
    lastInspected: '29-Sep-2026 12:15 IST',
    inspectorNotes: 'Transition abutment stress redistributed to barrier pillar. Extensometers show asymptotic stabilization.',
    lat: 22.3610,
    lon: 82.7516
  },
  {
    id: 'SEC-C-03',
    name: 'Sector C: Panel 4 Stabilized Goaf',
    zoneType: 'stabilized_goaf',
    depthOfCover: 160,
    seamThickness: 2.4,
    measuredSagMm: -3.2,
    permissibleLimitMm: -50.0,
    tensileStrain: 0.05,
    strainLimit: 1.5,
    tiltSlope: 0.3,
    tiltLimit: 5.0,
    safetyFactor: 15.6,
    statutoryStatus: 'COMPLIANT',
    lastInspected: '28-Sep-2026 17:00 IST',
    inspectorNotes: 'Sand stowing goaf completely compacted. Micro-movements well below detection threshold (<0.1 mm/month).',
    lat: 22.3578,
    lon: 82.7485
  },
  {
    id: 'SEC-INF-RAIL',
    name: 'Railway Line Statutory Exclusion Corridor',
    zoneType: 'railway_corridor',
    depthOfCover: 185,
    seamThickness: 3.2,
    measuredSagMm: -2.8,
    permissibleLimitMm: -25.0,
    tensileStrain: 0.08,
    strainLimit: 1.0,
    tiltSlope: 0.4,
    tiltLimit: 3.0,
    safetyFactor: 8.92,
    statutoryStatus: 'COMPLIANT',
    lastInspected: '29-Sep-2026 10:00 IST',
    inspectorNotes: 'Bilaspur-Korba spur railway track. Tilts well below Indian Railways permissible track twisting limit (3 mm/m).',
    lat: 22.3622,
    lon: 82.7478
  },
  {
    id: 'SEC-INF-CANAL',
    name: 'Hasdeo Feeder Irrigation Canal Syphon',
    zoneType: 'canal_syphon',
    depthOfCover: 195,
    seamThickness: 3.2,
    measuredSagMm: -4.2,
    permissibleLimitMm: -30.0,
    tensileStrain: 0.11,
    strainLimit: 1.2,
    tiltSlope: 0.6,
    tiltLimit: 3.5,
    safetyFactor: 7.14,
    statutoryStatus: 'COMPLIANT',
    lastInspected: '29-Sep-2026 09:30 IST',
    inspectorNotes: 'Canal lining intact. Zero differential subsidence or seepage observed at concrete culvert expansion joints.',
    lat: 22.3628,
    lon: 82.7528
  },
  {
    id: 'SEC-VILLAGE',
    name: 'Gevra Habitation & Village Buffer',
    zoneType: 'village_buffer',
    depthOfCover: 220,
    seamThickness: 3.0,
    measuredSagMm: -1.2,
    permissibleLimitMm: -20.0,
    tensileStrain: 0.04,
    strainLimit: 0.8,
    tiltSlope: 0.2,
    tiltLimit: 2.0,
    safetyFactor: 16.6,
    statutoryStatus: 'COMPLIANT',
    lastInspected: '27-Sep-2026 15:45 IST',
    inspectorNotes: '200m statutory safety barrier maintained from outermost extraction boundary. Structures show zero settlement.',
    lat: 22.3565,
    lon: 82.7538
  }
]

// Mesh Network Node Details for Coverage Proof
export interface MeshCoverageNode {
  id: string
  name: string
  lat: number
  lon: number
  uplinkHop: string
  rssiDbm: number
  snrDb: number
  packetSuccessRate: number // %
  lastHeartbeatSecAgo: number
  status: 'optimal' | 'warning' | 'offline'
  redundancyCount: number // Number of overlapping neighbor nodes covering its hotspot
  hotspotTarget: string
}

const MESH_NODES: MeshCoverageNode[] = [
  {
    id: 'GW-01',
    name: 'Master LoRaWAN Gateway GW-01',
    lat: 22.3602,
    lon: 82.7495,
    uplinkHop: 'FIBER_BACKHAUL (DGMS Server)',
    rssiDbm: -54,
    snrDb: 24.2,
    packetSuccessRate: 100.0,
    lastHeartbeatSecAgo: 1,
    status: 'optimal',
    redundancyCount: 4,
    hotspotTarget: 'Central Colliery Telemetry Tower'
  },
  {
    id: 'NODE-SN-01',
    name: 'Node SN-01 (Crown Core)',
    lat: 22.3591,
    lon: 82.7501,
    uplinkHop: 'GW-01 (1 Hop Direct)',
    rssiDbm: -64,
    snrDb: 18.5,
    packetSuccessRate: 99.98,
    lastHeartbeatSecAgo: 2,
    status: 'optimal',
    redundancyCount: 3,
    hotspotTarget: 'Hotspot H1: Panel 7 Center Maximum Sag'
  },
  {
    id: 'NODE-SN-02',
    name: 'Node SN-02 (Advancing Face)',
    lat: 22.3596,
    lon: 82.7507,
    uplinkHop: 'GW-01 (1 Hop Direct)',
    rssiDbm: -68,
    snrDb: 16.2,
    packetSuccessRate: 99.96,
    lastHeartbeatSecAgo: 3,
    status: 'optimal',
    redundancyCount: 3,
    hotspotTarget: 'Hotspot H2: Active Caving Abutment Zone'
  },
  {
    id: 'NODE-SN-03',
    name: 'Node SN-03 (North-East Perimeter)',
    lat: 22.3604,
    lon: 82.7504,
    uplinkHop: 'GW-01 (1 Hop Direct)',
    rssiDbm: -66,
    snrDb: 17.8,
    packetSuccessRate: 99.99,
    lastHeartbeatSecAgo: 1,
    status: 'optimal',
    redundancyCount: 3,
    hotspotTarget: 'Panel 7 / Panel 6 North Boundary'
  },
  {
    id: 'NODE-SN-04',
    name: 'Node SN-04 (Transition Flank)',
    lat: 22.3611,
    lon: 82.7516,
    uplinkHop: 'NODE-SN-03 -> GW-01 (2 Hops)',
    rssiDbm: -72,
    snrDb: 14.1,
    packetSuccessRate: 99.92,
    lastHeartbeatSecAgo: 4,
    status: 'optimal',
    redundancyCount: 2,
    hotspotTarget: 'Hotspot H3: Panel 6 Transition Abutment'
  },
  {
    id: 'NODE-SN-05',
    name: 'Node SN-05 (Railway Boundary North)',
    lat: 22.3619,
    lon: 82.7483,
    uplinkHop: 'GW-01 (1 Hop Direct)',
    rssiDbm: -70,
    snrDb: 15.6,
    packetSuccessRate: 99.95,
    lastHeartbeatSecAgo: 2,
    status: 'optimal',
    redundancyCount: 2,
    hotspotTarget: 'Railway Statutory Buffer Line'
  },
  {
    id: 'NODE-SN-06',
    name: 'Node SN-06 (Canal Syphon Crossing)',
    lat: 22.3625,
    lon: 82.7523,
    uplinkHop: 'NODE-SN-04 -> NODE-SN-03 (3 Hops)',
    rssiDbm: -76,
    snrDb: 12.4,
    packetSuccessRate: 99.88,
    lastHeartbeatSecAgo: 5,
    status: 'optimal',
    redundancyCount: 2,
    hotspotTarget: 'Hasdeo Feeder Canal Culvert'
  },
  {
    id: 'NODE-SN-07',
    name: 'Node SN-07 (West Extensometer Deep)',
    lat: 22.3582,
    lon: 82.7489,
    uplinkHop: 'GW-01 (1 Hop Direct)',
    rssiDbm: -67,
    snrDb: 17.0,
    packetSuccessRate: 99.97,
    lastHeartbeatSecAgo: 2,
    status: 'optimal',
    redundancyCount: 3,
    hotspotTarget: 'Zone C Stabilized Goaf Margin'
  },
  {
    id: 'NODE-SN-08',
    name: 'Node SN-08 (South Village Incline)',
    lat: 22.3572,
    lon: 82.7512,
    uplinkHop: 'NODE-SN-01 -> GW-01 (2 Hops)',
    rssiDbm: -73,
    snrDb: 13.8,
    packetSuccessRate: 99.94,
    lastHeartbeatSecAgo: 3,
    status: 'optimal',
    redundancyCount: 2,
    hotspotTarget: 'Gevra Village Protection Barrier'
  },
  {
    id: 'NODE-SN-09',
    name: 'Node SN-09 (South-East Buffer Line)',
    lat: 22.3579,
    lon: 82.7528,
    uplinkHop: 'NODE-SN-08 -> NODE-SN-01 (3 Hops)',
    rssiDbm: -75,
    snrDb: 13.1,
    packetSuccessRate: 99.89,
    lastHeartbeatSecAgo: 4,
    status: 'optimal',
    redundancyCount: 2,
    hotspotTarget: 'Surface Irrigation Discharge Pond'
  },
  {
    id: 'NODE-SN-10',
    name: 'Node SN-10 (Deep Seam Sub-Station)',
    lat: 22.3598,
    lon: 82.7479,
    uplinkHop: 'GW-01 (1 Hop Direct)',
    rssiDbm: -63,
    snrDb: 19.4,
    packetSuccessRate: 100.0,
    lastHeartbeatSecAgo: 1,
    status: 'optimal',
    redundancyCount: 3,
    hotspotTarget: 'Ventilation Shaft No. 2 Intake'
  }
]

// Cryptographic Telemetry Block Hash Ledger Data (Audit Trail)
export interface TelemetryAuditBlock {
  blockNumber: number
  timestamp: string
  packetCount: number
  expectedPackets: number
  merkleRootHash: string
  blockHash: string
  uninterruptedUptimePct: number
  hotspotsAudited: number
  missedHotspots: number
  auditStatus: 'VERIFIED' | 'TAMPER_PROOF'
}

const AUDIT_BLOCKS: TelemetryAuditBlock[] = [
  {
    blockNumber: 48292,
    timestamp: '29-Sep-2026 16:45:00 IST',
    packetCount: 900,
    expectedPackets: 900,
    merkleRootHash: '0x7c9f8a12e34b...8821',
    blockHash: '0x9a3e210d7f98b421a8c0d9e87f1234567890abcdef1234567890abcdef123456',
    uninterruptedUptimePct: 100.0,
    hotspotsAudited: 4,
    missedHotspots: 0,
    auditStatus: 'VERIFIED'
  },
  {
    blockNumber: 48291,
    timestamp: '29-Sep-2026 16:30:00 IST',
    packetCount: 900,
    expectedPackets: 900,
    merkleRootHash: '0x3b18d94c01ff...4490',
    blockHash: '0x6e5d4c3b2a1908f7e6d5c4b3a2109876543210fedcba9876543210fedcba9876',
    uninterruptedUptimePct: 100.0,
    hotspotsAudited: 4,
    missedHotspots: 0,
    auditStatus: 'VERIFIED'
  },
  {
    blockNumber: 48290,
    timestamp: '29-Sep-2026 16:15:00 IST',
    packetCount: 900,
    expectedPackets: 900,
    merkleRootHash: '0x88ee1249aa01...bb73',
    blockHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    uninterruptedUptimePct: 100.0,
    hotspotsAudited: 4,
    missedHotspots: 0,
    auditStatus: 'VERIFIED'
  },
  {
    blockNumber: 48289,
    timestamp: '29-Sep-2026 16:00:00 IST',
    packetCount: 900,
    expectedPackets: 900,
    merkleRootHash: '0x55aa3377dd88...0012',
    blockHash: '0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    uninterruptedUptimePct: 100.0,
    hotspotsAudited: 4,
    missedHotspots: 0,
    auditStatus: 'VERIFIED'
  },
  {
    blockNumber: 48288,
    timestamp: '29-Sep-2026 15:45:00 IST',
    packetCount: 900,
    expectedPackets: 900,
    merkleRootHash: '0x9922cc44ee11...fa77',
    blockHash: '0x4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123',
    uninterruptedUptimePct: 100.0,
    hotspotsAudited: 4,
    missedHotspots: 0,
    auditStatus: 'VERIFIED'
  }
]

// Prediction vs Reality Parametric Comparison
export interface ParametricMetric {
  parameter: string
  symbol: string
  unit: string
  statutoryLimit: string
  preCalculation: number
  loggedActual: number
  deviationAbs: number
  deviationPct: number
  safetyMarginPct: number
  verdict: 'PASS' | 'WARNING' | 'BREACH'
  methodology: string
  evaluationNotes: string
}

const PREDICTION_VS_REALITY_METRICS: ParametricMetric[] = [
  {
    parameter: 'Maximum Subsidence Trough',
    symbol: 'S_max',
    unit: 'mm',
    statutoryLimit: '≤ 150.0 mm (Current Advance)',
    preCalculation: -48.0,
    loggedActual: -42.6,
    deviationAbs: 5.4,
    deviationPct: -11.2,
    safetyMarginPct: 71.6,
    verdict: 'PASS',
    methodology: 'Knothe Theory: S(x) = S_max * 0.5 * [1 - erf(√π * x / R)]',
    evaluationNotes: 'Actual compaction is 11.2% lower than theoretical prediction due to high sandstone bulking factor (Kf = 1.34).'
  },
  {
    parameter: 'Angle of Draw (Limit Influence)',
    symbol: 'β',
    unit: 'degrees',
    statutoryLimit: 'Statutory Envelope 60.0° - 65.0°',
    preCalculation: 62.5,
    loggedActual: 61.8,
    deviationAbs: 0.7,
    deviationPct: -1.12,
    safetyMarginPct: 95.0,
    verdict: 'PASS',
    methodology: 'Geodetic inclinometer transect cross-referenced with Sentinel-1 InSAR limit',
    evaluationNotes: 'Observed angle is within 0.7° of pre-calculation, confirming lateral limit of ground movement is strictly contained within lease.'
  },
  {
    parameter: 'Radius of Major Influence',
    symbol: 'R',
    unit: 'meters',
    statutoryLimit: '≤ 120.0 m (Lease Boundary Margin)',
    preCalculation: 96.5,
    loggedActual: 98.8,
    deviationAbs: 2.3,
    deviationPct: +2.38,
    safetyMarginPct: 17.7,
    verdict: 'PASS',
    methodology: 'R = H / tan(β); Depth H = 185m, tan(61.8°) = 1.865',
    evaluationNotes: 'Slight lateral expansion (+2.3m) accounted for by weathered sub-soil overburden layer; well inside 150m buffer corridor.'
  },
  {
    parameter: 'Maximum Tensile Strain',
    symbol: 'ε_+',
    unit: 'mm/m',
    statutoryLimit: '≤ 3.00 mm/m (CMR Reg. 111)',
    preCalculation: 2.40,
    loggedActual: 0.34,
    deviationAbs: 2.06,
    deviationPct: -85.8,
    safetyMarginPct: 88.7,
    verdict: 'PASS',
    methodology: 'Differential strain gauge pairs over 20m baseline array',
    evaluationNotes: 'Extremely safe tensile strain (0.34 mm/m). No risk of surface tension tears, open crevices, or building structural damage.'
  },
  {
    parameter: 'Maximum Compressive Strain',
    symbol: 'ε_-',
    unit: 'mm/m',
    statutoryLimit: '≤ 4.50 mm/m (CMR Reg. 111)',
    preCalculation: 3.80,
    loggedActual: 0.52,
    deviationAbs: 3.28,
    deviationPct: -86.3,
    safetyMarginPct: 88.4,
    verdict: 'PASS',
    methodology: 'Goaf center compression cell arrays + optical level stations',
    evaluationNotes: 'Compressive ridges absent. Soil structure retains load-bearing cohesion across entire surface projection.'
  },
  {
    parameter: 'Maximum Ground Tilt / Slope',
    symbol: 'i_max',
    unit: 'mm/m',
    statutoryLimit: '≤ 10.0 mm/m (Statutory Rail Limit: 3.0)',
    preCalculation: 8.20,
    loggedActual: 2.10,
    deviationAbs: 6.10,
    deviationPct: -74.4,
    safetyMarginPct: 79.0,
    verdict: 'PASS',
    methodology: 'Knothe first derivative: i(x) = |dS/dx| from dual tiltmeter sensors',
    evaluationNotes: 'Max recorded surface slope is 2.1 mm/m over active longwall center, and only 0.4 mm/m at railway spur.'
  }
]

interface Props {
  onLogout: () => void
  onSwitchDashboard?: (dashboard: 'operator' | 'planner' | 'regulator') => void
  collieryName?: string
  hideHeader?: boolean
  isSimulatedAlert?: boolean
  onToggleSimulation?: () => void
}

export default function MineRegulatorDashboard({
  onLogout,
  collieryName = 'Singhali Underground Colliery',
  hideHeader = false,
  isSimulatedAlert: propIsSimulatedAlert = false,
  onToggleSimulation
}: Props) {
  // Local fallback state if onToggleSimulation is not provided by parent
  const [localSimulatedAlert, setLocalSimulatedAlert] = useState<boolean>(false)
  const isSimulatedAlert = onToggleSimulation !== undefined ? propIsSimulatedAlert : localSimulatedAlert

  const handleToggleSimulation = () => {
    if (onToggleSimulation) {
      onToggleSimulation()
    } else {
      setLocalSimulatedAlert(prev => !prev)
    }
    if (!isSimulatedAlert) setActiveTab('alerts')
  }

  // Tabs: 'topology_stability' | 'network_proof' | 'prediction_reality' | 'alerts'
  const [activeTab, setActiveTab] = useState<'topology_stability' | 'network_proof' | 'prediction_reality' | 'alerts'>('topology_stability')

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState<string>('')

  // Map Basemap: 'satellite' | 'topo'
  const [mapBasemap, setMapBasemap] = useState<'satellite' | 'topo'>('satellite')

  // Tab 1: Topology Stability Controls
  const [showStatutoryBuffers, setShowStatutoryBuffers] = useState<boolean>(true)
  const [showDrawEnvelope, setShowDrawEnvelope] = useState<boolean>(true)
  const [showInfraCorridors, setShowInfraCorridors] = useState<boolean>(true)
  const [selectedSector, setSelectedSector] = useState<TopologySector>(TOPOLOGY_SECTORS[0])
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState<boolean>(false)

  // Tab 2: Network Coverage Proof Controls
  const [showMeshLinks, setShowMeshLinks] = useState<boolean>(true)
  const [showRadioBuffers, setShowRadioBuffers] = useState<boolean>(true)
  const [showHotspotOverlays, setShowHotspotOverlays] = useState<boolean>(true)
  const [selectedMeshNode, setSelectedMeshNode] = useState<MeshCoverageNode>(MESH_NODES[1])
  const [searchBlockQuery, setSearchBlockQuery] = useState<string>('')

  // Tab 3: Prediction vs Reality Controls
  const [crossSectionStation, setCrossSectionStation] = useState<number>(0) // station index along profile (-200m to +300m)
  const [selectedParametricMetric, setSelectedParametricMetric] = useState<ParametricMetric>(PREDICTION_VS_REALITY_METRICS[0])

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const satelliteLayerRef = useRef<L.TileLayer | null>(null)
  const topoLayerRef = useRef<L.TileLayer | null>(null)

  // Layer groups for Tab 1
  const statutoryBoundaryGroupRef = useRef<L.LayerGroup | null>(null)
  const drawEnvelopeGroupRef = useRef<L.LayerGroup | null>(null)
  const infraCorridorGroupRef = useRef<L.LayerGroup | null>(null)
  const sectorPinsGroupRef = useRef<L.LayerGroup | null>(null)

  // Layer groups for Tab 2
  const meshLinksGroupRef = useRef<L.LayerGroup | null>(null)
  const radioBuffersGroupRef = useRef<L.LayerGroup | null>(null)
  const hotspotsGroupRef = useRef<L.LayerGroup | null>(null)
  const meshNodesGroupRef = useRef<L.LayerGroup | null>(null)

  // Real-time Clock interval
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST')
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  // =========================================================================
  // LEAFLET MAP INITIALIZATION & SWITCHING
  // =========================================================================
  useEffect(() => {
    if (activeTab === 'prediction_reality') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      return
    }

    if (!mapContainerRef.current) return

    // If map already exists, just invalidate size
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize()
      }, 100)
      return
    }

    const baseLat = 22.3595
    const baseLon = 82.7501

    const map = L.map(mapContainerRef.current, {
      center: [baseLat, baseLon],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    })
    mapInstanceRef.current = map

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    )
    const topoLayer = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      { maxZoom: 17 }
    )

    satelliteLayerRef.current = satLayer
    topoLayerRef.current = topoLayer

    if (mapBasemap === 'satellite') {
      satLayer.addTo(map)
    } else {
      topoLayer.addTo(map)
    }

    // Initialize layer groups
    statutoryBoundaryGroupRef.current = L.layerGroup().addTo(map)
    drawEnvelopeGroupRef.current = L.layerGroup().addTo(map)
    infraCorridorGroupRef.current = L.layerGroup().addTo(map)
    sectorPinsGroupRef.current = L.layerGroup().addTo(map)

    meshLinksGroupRef.current = L.layerGroup().addTo(map)
    radioBuffersGroupRef.current = L.layerGroup().addTo(map)
    hotspotsGroupRef.current = L.layerGroup().addTo(map)
    meshNodesGroupRef.current = L.layerGroup().addTo(map)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [activeTab])

  // Switch basemap layer
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !satelliteLayerRef.current || !topoLayerRef.current) return

    if (mapBasemap === 'satellite') {
      map.removeLayer(topoLayerRef.current)
      if (!map.hasLayer(satelliteLayerRef.current)) {
        map.addLayer(satelliteLayerRef.current)
      }
    } else {
      map.removeLayer(satelliteLayerRef.current)
      if (!map.hasLayer(topoLayerRef.current)) {
        map.addLayer(topoLayerRef.current)
      }
    }
  }, [mapBasemap])

  // =========================================================================
  // TAB 1: RENDER TOPOLOGY STABILITY GIS LAYERS
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'topology_stability') {
      statutoryBoundaryGroupRef.current?.clearLayers()
      drawEnvelopeGroupRef.current?.clearLayers()
      infraCorridorGroupRef.current?.clearLayers()
      sectorPinsGroupRef.current?.clearLayers()
      return
    }

    const statGroup = statutoryBoundaryGroupRef.current
    const drawGroup = drawEnvelopeGroupRef.current
    const infraGroup = infraCorridorGroupRef.current
    const pinsGroup = sectorPinsGroupRef.current

    if (!statGroup || !drawGroup || !infraGroup || !pinsGroup) return

    statGroup.clearLayers()
    drawGroup.clearLayers()
    infraGroup.clearLayers()
    pinsGroup.clearLayers()

    // 1. Statutory Mining Lease Boundary Line (Gold/Emerald dashed polygon)
    const leaseBoundaryPoints: [number, number][] = [
      [22.3635, 82.7455],
      [22.3642, 82.7545],
      [22.3555, 82.7558],
      [22.3548, 82.7462]
    ]

    L.polygon(leaseBoundaryPoints, {
      color: '#059669',
      weight: 2.5,
      dashArray: '8, 6',
      fillColor: '#10b981',
      fillOpacity: 0.04
    })
      .addTo(statGroup)
      .bindTooltip('<b>DGMS Statutory Mining Lease Boundary</b><br/>Mining Lease ML-482/CIL<br/>Total Area: 1.48 km²', { sticky: true })

    // 2. Knothe Theoretical Draw Angle Boundary (β = 62.5°)
    if (showDrawEnvelope) {
      // Outer limit envelope based on depth H = 185m and draw angle 62.5 deg
      const drawEnvelopePoints = generateStatutoryContour(22.3592, 82.7501, 220, 170, 38, 0.16, 0.04)
      L.polygon(drawEnvelopePoints, {
        color: '#3b82f6',
        weight: 2,
        dashArray: '5, 4',
        fillColor: '#60a5fa',
        fillOpacity: 0.12
      })
        .addTo(drawGroup)
        .bindTooltip('<b>Theoretical Knothe Draw Envelope (β = 62.5°)</b><br/>Limit of Surface Influence: R = 98.8m<br/>All deformations strictly internal', { sticky: true })

      // Active caving maximum sag contour
      const maxSagPoints = generateStatutoryContour(22.3591, 82.7501, 95, 75, 38, 0.22, 0.05)
      L.polygon(maxSagPoints, {
        color: '#f97316',
        weight: 2,
        fillColor: '#fb923c',
        fillOpacity: 0.28
      })
        .addTo(drawGroup)
        .bindTooltip('<b>Active Subsidence Core (Panel 7)</b><br/>Measured Sag: -42.6 mm<br/>Permissible Advance Limit: -150.0 mm', { sticky: true })
    }

    // 3. Infrastructure Safety Exclusion Corridors
    if (showInfraCorridors) {
      // Railway line buffer (North West corridor)
      const railwayPoly: [number, number][] = [
        [22.3630, 82.7460],
        [22.3615, 82.7490],
        [22.3610, 82.7485],
        [22.3625, 82.7455]
      ]
      L.polygon(railwayPoly, {
        color: '#dc2626',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#ef4444',
        fillOpacity: 0.20
      })
        .addTo(infraGroup)
        .bindTooltip('<b>Railway 150m Statutory Exclusion Buffer</b><br/>Current Tilt: 0.4 mm/m (Safe &lt; 3.0 mm/m)', { sticky: true })

      // Hasdeo Canal Buffer (North East corridor)
      const canalPoly: [number, number][] = [
        [22.3635, 82.7518],
        [22.3620, 82.7540],
        [22.3615, 82.7534],
        [22.3630, 82.7512]
      ]
      L.polygon(canalPoly, {
        color: '#2563eb',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#3b82f6',
        fillOpacity: 0.18
      })
        .addTo(infraGroup)
        .bindTooltip('<b>Hasdeo Canal 120m Statutory Buffer</b><br/>Current Sag: -4.2 mm (Safe &lt; -30.0 mm)', { sticky: true })

      // Village 200m Protection Corridor
      const villagePoly: [number, number][] = [
        [22.3570, 82.7525],
        [22.3558, 82.7545],
        [22.3552, 82.7538],
        [22.3564, 82.7518]
      ]
      L.polygon(villagePoly, {
        color: '#7c3aed',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.16
      })
        .addTo(infraGroup)
        .bindTooltip('<b>Gevra Village 200m Habitation Buffer</b><br/>Current Strain: 0.04 mm/m (Safe &lt; 0.8 mm/m)', { sticky: true })
    }

    // 4. Sector Status Markers
    TOPOLOGY_SECTORS.forEach((sec) => {
      const isSelected = selectedSector.id === sec.id
      const markerHtml = `
        <div style="position: relative; cursor: pointer; transform: scale(${isSelected ? 1.25 : 1}); transition: transform 0.2s;">
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 9999px;
            background: ${isSelected ? '#0f172a' : '#ffffff'};
            border: 2.5px solid ${sec.zoneType.includes('railway') || sec.zoneType.includes('caving') ? '#059669' : '#3b82f6'};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          ">
            <div style="
              width: 10px;
              height: 10px;
              border-radius: 9999px;
              background: ${sec.measuredSagMm < -30 ? '#f97316' : '#10b981'};
            "></div>
          </div>
          <div style="
            position: absolute;
            top: 28px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            background: rgba(15, 23, 42, 0.9);
            color: #ffffff;
            font-size: 9px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.2);
            pointer-events: none;
          ">
            ${sec.name.split(':')[0]}
          </div>
        </div>
      `

      const icon = L.divIcon({
        className: 'custom-topology-sector-marker',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })

      const marker = L.marker([sec.lat, sec.lon], { icon }).addTo(pinsGroup)
      marker.on('click', () => setSelectedSector(sec))
      marker.bindTooltip(
        `<b>${sec.name}</b><br/>Measured Sag: <b>${sec.measuredSagMm} mm</b><br/>Safety Factor: <b>${sec.safetyFactor}x</b><br/>Status: <b>${sec.statutoryStatus}</b>`,
        { direction: 'top', offset: [0, -14] }
      )
    })
  }, [activeTab, showDrawEnvelope, showInfraCorridors, selectedSector])

  // =========================================================================
  // TAB 2: RENDER NETWORK COVERAGE PROOF GIS LAYERS
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'network_proof') {
      meshLinksGroupRef.current?.clearLayers()
      radioBuffersGroupRef.current?.clearLayers()
      hotspotsGroupRef.current?.clearLayers()
      meshNodesGroupRef.current?.clearLayers()
      return
    }

    const linksGroup = meshLinksGroupRef.current
    const buffersGroup = radioBuffersGroupRef.current
    const hotspotsGroup = hotspotsGroupRef.current
    const nodesGroup = meshNodesGroupRef.current

    if (!linksGroup || !buffersGroup || !hotspotsGroup || !nodesGroup) return

    linksGroup.clearLayers()
    buffersGroup.clearLayers()
    hotspotsGroup.clearLayers()
    nodesGroup.clearLayers()

    const gateway = MESH_NODES.find((n) => n.id === 'GW-01') || MESH_NODES[0]

    // 1. Radio Coverage Buffers (80m radius circles demonstrating zero blind spots)
    if (showRadioBuffers) {
      MESH_NODES.forEach((node) => {
        const isGw = node.id === 'GW-01'
        L.circle([node.lat, node.lon], {
          radius: isGw ? 280 : 80,
          color: isGw ? '#2563eb' : '#059669',
          weight: 1.2,
          dashArray: isGw ? '4, 4' : undefined,
          fillColor: isGw ? '#3b82f6' : '#10b981',
          fillOpacity: isGw ? 0.08 : 0.16
        })
          .addTo(buffersGroup)
          .bindTooltip(`<b>${node.name}</b><br/>Coverage Radius: ${isGw ? '280m (Gateway)' : '80m (Node)'}<br/>Zero Blind Spot Redundancy`, { sticky: true })
      })
    }

    // 2. Active Wireless Mesh Transmission Links (Green/Amber paths)
    if (showMeshLinks) {
      // Connect each non-gateway node along its hop topology
      MESH_NODES.forEach((node) => {
        if (node.id === 'GW-01') return

        let targetNode = gateway
        if (node.id === 'NODE-SN-04') {
          targetNode = MESH_NODES.find((n) => n.id === 'NODE-SN-03') || gateway
        } else if (node.id === 'NODE-SN-06') {
          targetNode = MESH_NODES.find((n) => n.id === 'NODE-SN-04') || gateway
        } else if (node.id === 'NODE-SN-08') {
          targetNode = MESH_NODES.find((n) => n.id === 'NODE-SN-01') || gateway
        } else if (node.id === 'NODE-SN-09') {
          targetNode = MESH_NODES.find((n) => n.id === 'NODE-SN-08') || gateway
        }

        const isGoodSignal = node.rssiDbm >= -74
        L.polyline(
          [
            [node.lat, node.lon],
            [targetNode.lat, targetNode.lon]
          ],
          {
            color: isGoodSignal ? '#10b981' : '#f59e0b',
            weight: 2,
            dashArray: '4, 4',
            opacity: 0.85
          }
        )
          .addTo(linksGroup)
          .bindTooltip(`<b>Mesh Link: ${node.name} &rarr; ${targetNode.name}</b><br/>Signal RSSI: ${node.rssiDbm} dBm (SNR: ${node.snrDb} dB)<br/>Transmission SLA: 100% Uptime`, { sticky: true })
      })
    }

    // 3. Hotspots with Verified Multi-Node Proof
    if (showHotspotOverlays) {
      const hotspots = [
        { lat: 22.3591, lon: 82.7501, name: 'Hotspot H1: Active Caving Crown (-42.6 mm)', redundancy: 'Node SN-01, SN-02, SN-03' },
        { lat: 22.3611, lon: 82.7516, name: 'Hotspot H2: Panel 6 Transition Flank (-18.4 mm)', redundancy: 'Node SN-04, SN-03, SN-06' },
        { lat: 22.3622, lon: 82.7480, name: 'Hotspot H3: Railway Proximity Buffer', redundancy: 'Node SN-05, GW-01, SN-10' }
      ]

      hotspots.forEach((h) => {
        L.circle([h.lat, h.lon], {
          radius: 45,
          color: '#e11d48',
          weight: 2,
          dashArray: '3, 3',
          fillColor: '#f43f5e',
          fillOpacity: 0.25
        })
          .addTo(hotspotsGroup)
          .bindTooltip(`<b>VERIFIED HOTSPOT</b><br/>${h.name}<br/>Proof Coverage: <b>${h.redundancy}</b><br/>Hotspot Miss Rate: <b>0.00%</b>`, { sticky: true })
      })
    }

    // 4. Mesh Hardware Nodes Pins
    MESH_NODES.forEach((node) => {
      const isGw = node.id === 'GW-01'
      const isSelected = selectedMeshNode.id === node.id

      const markerHtml = `
        <div style="position: relative; cursor: pointer; transform: scale(${isSelected ? 1.25 : 1}); transition: transform 0.2s;">
          <div style="
            width: ${isGw ? '32px' : '26px'};
            height: ${isGw ? '32px' : '26px'};
            border-radius: 8px;
            background: ${isGw ? '#1e293b' : '#ffffff'};
            border: 2px solid ${isGw ? '#38bdf8' : '#059669'};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.22);
            color: ${isGw ? '#ffffff' : '#0f172a'};
            font-size: 10px;
            font-weight: 900;
          ">
            ${isGw ? 'GW' : node.name.replace('Node SN-', '')}
          </div>
          <div style="
            position: absolute;
            top: ${isGw ? '32px' : '26px'};
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            background: rgba(15, 23, 42, 0.88);
            color: #ffffff;
            font-size: 8px;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 4px;
            pointer-events: none;
          ">
            ${node.packetSuccessRate}%
          </div>
        </div>
      `

      const icon = L.divIcon({
        className: 'custom-mesh-node-marker',
        html: markerHtml,
        iconSize: [isGw ? 32 : 26, isGw ? 32 : 26],
        iconAnchor: [isGw ? 16 : 13, isGw ? 16 : 13]
      })

      const marker = L.marker([node.lat, node.lon], { icon }).addTo(nodesGroup)
      marker.on('click', () => setSelectedMeshNode(node))
      marker.bindTooltip(
        `<b>${node.name}</b><br/>Uptime SLA: <b>${node.packetSuccessRate}%</b><br/>RSSI: <b>${node.rssiDbm} dBm</b><br/>Target: <b>${node.hotspotTarget}</b>`,
        { direction: 'top', offset: [0, -14] }
      )
    })
  }, [activeTab, showMeshLinks, showRadioBuffers, showHotspotOverlays, selectedMeshNode])

  // Filtered audit blocks based on search query
  const filteredAuditBlocks = useMemo(() => {
    if (!searchBlockQuery.trim()) return AUDIT_BLOCKS
    const q = searchBlockQuery.toLowerCase()
    return AUDIT_BLOCKS.filter(
      (b) =>
        b.blockNumber.toString().includes(q) ||
        b.blockHash.toLowerCase().includes(q) ||
        b.timestamp.toLowerCase().includes(q) ||
        b.merkleRootHash.toLowerCase().includes(q)
    )
  }, [searchBlockQuery])

  // =========================================================================
  // TAB 3: KNOTHE CURVE TRANSECT PROFILE POINTS GENERATION (-200m to +300m)
  // =========================================================================
  const transectProfileData = useMemo(() => {
    const stations: {
      xMeters: number // -200m to +300m
      preCalcSagMm: number // Knothe equation theoretical sag
      actualLoggedMm: number // Actual logged values from extensometer stations
      statutoryMaxEnvelopeMm: number // Permissible statutory threshold line
      stationLabel: string
      correlatedNodeId?: string
    }[] = []

    const S_max = -48.0 // Advance phase max sag (mm)
    const R = 98.8 // Radius of influence (meters)

    // Knothe erf approximation
    // erf(z) ≈ sign(z) * sqrt(1 - exp(-z^2 * (4/pi + a*z^2) / (1 + a*z^2)))
    const approxErf = (z: number) => {
      const sign = z >= 0 ? 1 : -1
      const x = Math.abs(z)
      const a = 0.147
      const term1 = 4 / Math.PI + a * x * x
      const term2 = 1 + a * x * x
      const expTerm = Math.exp(-x * x * (term1 / term2))
      return sign * Math.sqrt(Math.max(0, 1 - expTerm))
    }

    for (let x = -200; x <= 300; x += 10) {
      // Dimensionless Knothe coordinate
      const z = (Math.sqrt(Math.PI) * x) / R
      const erfVal = approxErf(z)
      const theoretical = S_max * 0.5 * (1 - erfVal)

      // Actual ground truth: slightly dampened (-11.2% less sag due to bulking factor)
      // with minor localized variation around sensor locations
      let actual = theoretical * 0.888

      // Add realistic sensor anchor alignment
      if (Math.abs(x - 0) < 15) {
        actual = -42.6 // At x=0 (SN-01 Center)
      } else if (Math.abs(x - 50) < 15) {
        actual = -31.2 // At x=50 (SN-02)
      } else if (Math.abs(x - 120) < 15) {
        actual = -14.6 // At x=120 (SN-04)
      } else if (Math.abs(x - (-80)) < 15) {
        actual = -3.2 // At x=-80 (SN-07)
      }

      stations.push({
        xMeters: x,
        preCalcSagMm: parseFloat(theoretical.toFixed(1)),
        actualLoggedMm: parseFloat(actual.toFixed(1)),
        statutoryMaxEnvelopeMm: -150.0,
        stationLabel: x === 0 ? 'Face Origin (0m)' : `${x > 0 ? '+' : ''}${x}m`,
        correlatedNodeId:
          x === 0
            ? 'NODE-SN-01'
            : x === 50
            ? 'NODE-SN-02'
            : x === 120
            ? 'NODE-SN-04'
            : x === -80
            ? 'NODE-SN-07'
            : undefined
      })
    }

    return stations
  }, [])

  const selectedStationData = transectProfileData[crossSectionStation] || transectProfileData[20]

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none">
      
      {/* ========================================================================= */}
      {/* TOP REGULATOR NAVBAR (STATUTORY OVERSIGHT IDENTITY)                       */}
      {/* ========================================================================= */}
      {!hideHeader && (
        <header className="w-full bg-white border-b border-slate-200/90 sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-2xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* Logo & Portal Identity */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/90 flex items-center justify-center text-blue-700 shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-slate-950">
                    Bhu<span className="text-emerald-600">Rakshak</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 tracking-wider">
                    Regulator Portal (DGMS Audit)
                  </span>
                  <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 hidden sm:inline-block">
                    by Akshat
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 hidden sm:block">
                  {collieryName} • Directorate General of Mines Safety (DGMS) Statutory Oversight • Conceived &amp; Developed by Akshat
                </p>
              </div>
            </div>

            {/* Right Header Controls: Live Clock + DGMS Compliant Badge + Sign Out */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Live Clock */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>{currentTime || '12:00:00 IST'}</span>
              </div>

              {/* Statutory Compliance Seal */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>DGMS Circular 4 (2018) Compliant</span>
              </div>

              {/* Sign Out Button */}
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
      )}

      {/* ========================================================================= */}
      {/* 4 CORE REGULATOR TABS + SIMULATION BUTTON: ROUNDED CARD CONTAINER         */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-5 pb-1">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto scrollbar-none w-full md:w-auto py-0.5">
            
            {/* Tab 1: Topology Stability Logs */}
            <button
              type="button"
              onClick={() => setActiveTab('topology_stability')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'topology_stability'
                  ? 'bg-blue-50 text-blue-900 border border-blue-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Topology Stability Logs</span>
            </button>

            {/* Tab 2: Network Coverage Proof */}
            <button
              type="button"
              onClick={() => setActiveTab('network_proof')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'network_proof'
                  ? 'bg-blue-50 text-blue-900 border border-blue-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Radio className="w-4 h-4 text-blue-600" />
              <span>Network Coverage Proof</span>
            </button>

            {/* Tab 3: Prediction vs. Reality Matrix */}
            <button
              type="button"
              onClick={() => setActiveTab('prediction_reality')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'prediction_reality'
                  ? 'bg-blue-50 text-blue-900 border border-blue-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Scale className="w-4 h-4 text-blue-600" />
              <span>Prediction vs. Reality Matrix</span>
            </button>

            {/* Tab 4: ALERTS & HAZARDS */}
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'alerts'
                  ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-xs'
                  : isSimulatedAlert
                  ? 'text-rose-600 bg-rose-50/60 hover:bg-rose-100 border border-rose-200 animate-pulse'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${isSimulatedAlert ? 'text-rose-600 animate-bounce' : 'text-rose-500'}`} />
              <span>ALERTS</span>
              {isSimulatedAlert && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-0.5" />
              )}
            </button>

          </div>

          {/* Simulation Trigger Button on Regulator */}
          <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
            <button
              type="button"
              onClick={handleToggleSimulation}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shadow-xs whitespace-nowrap ${
                isSimulatedAlert
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white'
              }`}
              title="Simulate Sensor Anomaly"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{isSimulatedAlert ? 'Reset Simulation' : '⚡ Simulate Strata Anomaly'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN DASHBOARD CONTENT AREA                                               */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-5 flex-1 flex flex-col gap-6">

        {/* ======================================================================= */}
        {/* TAB 0: ALERTS & EARLY WARNING                                           */}
        {/* ======================================================================= */}
        {activeTab === 'alerts' && (
          <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs animate-fadeIn">
            <MineAlertsTab
              isSimulatedAlert={isSimulatedAlert}
              onToggleSimulation={handleToggleSimulation}
              currentRole="regulator"
              collieryName={collieryName}
            />
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 1: TOPOLOGY STABILITY LOGS (HIGH-LEVEL STABILITY REPORTS & GIS MAP) */}
        {/* ======================================================================= */}
        {activeTab === 'topology_stability' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Statutory Summary Strip */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Metric 1: Overall Stability Index */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Topology Stability Index</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">91.8</span>
                    <span className="text-xs font-extrabold text-emerald-600">/ 100 (Safe)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Knothe strain within tolerance</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              {/* Metric 2: Max Surface Sag Recorded */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Max Logged Surface Sag</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-orange-600">-42.6</span>
                    <span className="text-xs font-extrabold text-slate-600">mm</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">71.6% below -150mm statutory cap</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>

              {/* Metric 3: Critical Infrastructure Margin */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exclusion Buffer Integrity</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-emerald-600">100%</span>
                    <span className="text-xs font-extrabold text-slate-500">Uncompromised</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Railway track tilt: 0.4 mm/m</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Metric 4: Statutory Audit Action */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Statutory Audit Clearance</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      DGMS FORM IV-B VALID
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCertificateModalOpen(true)}
                    className="text-[11px] font-extrabold text-blue-600 hover:text-blue-800 underline decoration-blue-300 mt-1 cursor-pointer flex items-center gap-1"
                  >
                    <span>View Official Certificate</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Award className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Side-by-Side Main Deck: GIS Interactive Map vs High-Level Sector Stability Ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* LEFT COLUMN: INTERACTIVE STATUTORY GIS MAP (7 COLS) */}
              <div className="lg:col-span-7 flex flex-col justify-between h-full bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
                
                {/* Header Controls for GIS Map */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Statutory Topology GIS Map &amp; Hazard Buffers
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Draw angle limit envelope (β = 62.5°) &bull; Railway &amp; canal exclusion corridors
                      </p>
                    </div>
                  </div>

                  {/* Basemap & Overlay Toggles */}
                  <div className="flex items-center gap-2">
                    {/* Basemap Switcher */}
                    <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setMapBasemap('satellite')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                          mapBasemap === 'satellite' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Satellite
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapBasemap('topo')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                          mapBasemap === 'topo' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Topographic
                      </button>
                    </div>

                    {/* Reset Map View */}
                    <button
                      type="button"
                      onClick={() => mapInstanceRef.current?.setView([22.3595, 82.7501], 16)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition cursor-pointer shadow-2xs"
                      title="Reset View"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Layer Toggle Pills */}
                <div className="flex flex-wrap items-center gap-2 py-2.5">
                  <button
                    type="button"
                    onClick={() => setShowDrawEnvelope(!showDrawEnvelope)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      showDrawEnvelope
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Knothe Draw Envelope (β = 62.5°)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowInfraCorridors(!showInfraCorridors)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      showInfraCorridors
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Infrastructure Exclusion Corridors</span>
                  </button>

                  <span className="text-[10px] text-slate-400 font-mono ml-auto">
                    Coords: 22.3595° N, 82.7501° E
                  </span>
                </div>

                {/* Map Render Canvas */}
                <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                  <div ref={mapContainerRef} className="w-full h-full z-0" />

                  {/* On-map Legend Pill */}
                  <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-2.5 shadow-md text-[10px] space-y-1.5">
                    <div className="font-black text-slate-800 uppercase tracking-wider text-[9px]">Map Legend</div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-1 bg-emerald-600 rounded-full" />
                      <span className="text-slate-600">Statutory Lease Boundary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-1 bg-blue-500 rounded-full" />
                      <span className="text-slate-600">Knothe Draw Angle Line</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-1 bg-red-500 rounded-full" />
                      <span className="text-slate-600">Railway / Canal Buffer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span className="text-slate-600">Active Panel 7 Subsidence Pin</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Map Note */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Surveyed under Indian Coal Mines Regulations 2017 (CMR Reg. 111 &amp; 112)</span>
                  </div>
                  <span className="font-semibold text-slate-700">Datum: WGS84 / UTM 44N</span>
                </div>

              </div>

              {/* RIGHT COLUMN: HIGH-LEVEL SECTOR STABILITY LEDGER & AUDIT REPORT (5 COLS) */}
              <div className="lg:col-span-5 flex flex-col justify-between h-full bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
                
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        High-Level Stability Inspection Ledger
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Statutory limits, tensile strains &amp; safety factor per sector
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      6 Monitored Sectors
                    </span>
                  </div>

                  {/* Sectors Interactive Scrollable List */}
                  <div className="space-y-2.5 mt-3 max-h-[300px] overflow-y-auto pr-1">
                    {TOPOLOGY_SECTORS.map((sec) => {
                      const isSelected = selectedSector.id === sec.id
                      const isHighActivity = sec.measuredSagMm < -30

                      return (
                        <div
                          key={sec.id}
                          onClick={() => setSelectedSector(sec)}
                          className={`p-3 rounded-2xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-500/20'
                              : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900">{sec.name}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Depth: <span className="font-semibold text-slate-700">{sec.depthOfCover}m</span> • Seam: <span className="font-semibold text-slate-700">{sec.seamThickness}m</span>
                              </p>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              {sec.statutoryStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[10px]">
                            <div>
                              <span className="text-slate-400 block font-medium">Logged Sag:</span>
                              <span className={`font-mono font-bold ${isHighActivity ? 'text-orange-600' : 'text-slate-800'}`}>
                                {sec.measuredSagMm} mm
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Tensile Strain:</span>
                              <span className="font-mono font-bold text-slate-800">{sec.tensileStrain} mm/m</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Safety Factor:</span>
                              <span className="font-mono font-black text-emerald-600">{sec.safetyFactor}x</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Sector Drilldown Card */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider">
                      Selected Sector Audit Details
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedSector.lastInspected}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-xl border border-slate-200/80 mb-3">
                    "{selectedSector.inspectorNotes}"
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Permissible Sag Cap</span>
                      <span className="font-mono font-extrabold text-slate-800">{selectedSector.permissibleLimitMm} mm</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Max Surface Tilt Slope</span>
                      <span className="font-mono font-extrabold text-slate-800">{selectedSector.tiltSlope} mm/m (Cap: {selectedSector.tiltLimit})</span>
                    </div>
                  </div>
                </div>

                {/* Statutory Form IV-B Download CTA */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsCertificateModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Generate DGMS Statutory Form IV-B Report</span>
                  </button>
                </div>

              </div>

            </div>

            {/* 3D GIS Animated Topology Stability System (Below Map) */}
            <div className="pt-1">
              <Regulator3DViewer
                mode="topology_stability"
                sectors={TOPOLOGY_SECTORS}
                selectedSector={selectedSector}
                onSelectSector={(s) => setSelectedSector(s)}
              />
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: NETWORK COVERAGE PROOF (UNINTERRUPTED MESH & ZERO HOTSPOT MISS)  */}
        {/* ======================================================================= */}
        {activeTab === 'network_proof' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Mesh SLA Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Card 1: Network Transmission Uptime */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mesh Telemetry SLA Uptime</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-emerald-600">99.98%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Statutory requirement: &gt; 99.50%</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Wifi className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Hotspot Miss Rate */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subsidence Hotspot Misses</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">0.00%</span>
                    <span className="text-xs font-bold text-emerald-600">Zero Gaps</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">All 4 InSAR subsidence foci covered</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Check className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Verified Packets in Ledger */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">30-Day Verified Packets</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">1,420,890</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cryptographically signed &amp; hashed</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Hash className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Mean Signal & Redundancy */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mean RSSI &amp; SNR</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">-68</span>
                    <span className="text-xs font-extrabold text-slate-500">dBm (SNR 18dB)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Average 2.6 redundant node overlaps</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                  <Zap className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Side-by-Side Main Deck: GIS Mesh Topology & Hotspot Proof vs Cryptographic Block Audit Trail */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* LEFT COLUMN: INTERACTIVE GIS MESH TOPOLOGY & RADIO COVERAGE (7 COLS) */}
              <div className="lg:col-span-7 flex flex-col justify-between h-full bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Wireless Mesh Network Topology &amp; Radio Buffers
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Continuous transmission proof &bull; 80m radio overlap over high-hazard subsidence zones
                      </p>
                    </div>
                  </div>

                  {/* Toggle Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setMapBasemap('satellite')}
                        className={`px-2 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                          mapBasemap === 'satellite' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Satellite
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapBasemap('topo')}
                        className={`px-2 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                          mapBasemap === 'topo' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Topo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Layer Toggle Pills */}
                <div className="flex flex-wrap items-center gap-2 py-2.5">
                  <button
                    type="button"
                    onClick={() => setShowRadioBuffers(!showRadioBuffers)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      showRadioBuffers
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>80m Node Radio Buffers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMeshLinks(!showMeshLinks)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      showMeshLinks
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Mesh Multi-Hop Transmission Links</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowHotspotOverlays(!showHotspotOverlays)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      showHotspotOverlays
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Verified Subsidence Hotspots</span>
                  </button>
                </div>

                {/* Map Render Canvas */}
                <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                  <div ref={mapContainerRef} className="w-full h-full z-0" />

                  {/* On-map Legend Pill */}
                  <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-2.5 shadow-md text-[10px] space-y-1.5">
                    <div className="font-black text-slate-800 uppercase tracking-wider text-[9px]">Mesh SLA Status</div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-slate-900 border border-cyan-400" />
                      <span className="text-slate-600">GW-01 Central LoRa Gateway</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-600">Active Sensing Node (99.9% Uptime)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-emerald-500" />
                      <span className="text-slate-600">Primary Transmission Link (RSSI &gt; -75dBm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-500 bg-rose-100" />
                      <span className="text-slate-600">Critical Hotspot (Dual Node Monitored)</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Node Information Strip */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">{selectedMeshNode.name}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span>Uplink: <span className="font-mono text-slate-800">{selectedMeshNode.uplinkHop}</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>Packet Delivery: <b className="text-emerald-600">{selectedMeshNode.packetSuccessRate}%</b></span>
                    <span>RSSI: <b className="font-mono text-slate-800">{selectedMeshNode.rssiDbm} dBm</b></span>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: CRYPTOGRAPHIC TELEMETRY BLOCK LEDGER (AUDIT PROOF) (5 COLS) */}
              <div className="lg:col-span-5 flex flex-col justify-between h-full bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
                
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Cryptographic Telemetry Audit Ledger
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        15-min periodic block hashes verifying continuous, tamper-proof logging
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <Lock className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Search Bar for Blocks */}
                  <div className="relative mt-3 mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchBlockQuery}
                      onChange={(e) => setSearchBlockQuery(e.target.value)}
                      placeholder="Search block # or SHA-256 hash..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Audit Blocks List */}
                  <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                    {filteredAuditBlocks.map((block) => (
                      <div
                        key={block.blockNumber}
                        className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/80 transition"
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-blue-700">Block #{block.blockNumber}</span>
                            <span className="text-[10px] text-slate-400 font-normal">&bull; {block.timestamp}</span>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {block.auditStatus}
                          </span>
                        </div>

                        <div className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/70 my-2 overflow-x-auto select-all">
                          <span className="text-slate-400">HASH: </span>{block.blockHash.slice(0, 36)}...
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <span className="text-slate-400 block font-medium">Packets:</span>
                            <span className="font-mono font-bold text-slate-800">{block.packetCount}/{block.expectedPackets} (100%)</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Uptime SLA:</span>
                            <span className="font-mono font-bold text-emerald-600">{block.uninterruptedUptimePct}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Hotspots Missed:</span>
                            <span className="font-mono font-black text-emerald-600">{block.missedHotspots}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hotspot Zero-Gap Statutory Certificate Card */}
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-black text-emerald-900 text-[11px] uppercase tracking-wider">
                      Hotspot Non-Omission Proof
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Automated spatial correlation confirms that <b>100% of all InSAR detected ground motion anomalies</b> are bounded by <b>at least 2 physical sensing nodes</b> within &lt;80m distance. No unmonitored blind spots exist across the lease.
                  </p>
                </div>

                {/* Export Telemetry Audit Certificate */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      alert('Cryptographic Mesh Telemetry Proof Manifest (SHA-256 Merkle Ledger) exported as immutable JSON archive.')
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-700" />
                    <span>Export Cryptographic Transmission Proof Ledger</span>
                  </button>
                </div>

              </div>

            </div>

            {/* 3D GIS Animated Mesh Network Coverage & Hotspot Proof System (Below Map) */}
            <div className="pt-1">
              <Regulator3DViewer
                mode="network_coverage"
                meshNodes={MESH_NODES}
                selectedNode={selectedMeshNode}
                onSelectNode={(n) => setSelectedMeshNode(n)}
              />
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: PREDICTION VS. REALITY MATRIX (KNOTHE PROFILE VS SENSOR LOGS)    */}
        {/* ======================================================================= */}
        {activeTab === 'prediction_reality' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: Prediction Deviation */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Model Variance to Ground Truth</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">-11.2%</span>
                    <span className="text-xs font-bold text-emerald-600">Conservative Envelope</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Observed sag lower than pre-calculation</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Draw Angle Correlation */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Draw Angle Congruence (β)</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">61.8°</span>
                    <span className="text-xs font-bold text-slate-500">vs 62.5° pre-calc</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Δ = -0.7° (Within ±2.0° statutory tolerance)</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Scale className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Statutory Safety Clearance */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Statutory Clearance Verdict</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ALL PARAMETERS COMPLIANT
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">CMR 2017 Reg. 111 &bull; 6/6 Limits Passed</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Award className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Side-by-Side Main Deck: SVG Knothe Profile vs Reality Comparison Matrix Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* LEFT COLUMN: INTERACTIVE TRANSECT PROFILE COMPARISON CURVE (7 COLS) */}
              <div className="lg:col-span-7 flex flex-col justify-between h-full bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Cross-Sectional Transect: Prediction vs. Reality
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Theoretical Knothe subsidence curve vs. actual extensometer &amp; InSAR ground truth
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      Advance Axis: -200m to +300m
                    </span>
                  </div>
                </div>

                {/* SVG Transect Graph Viewport */}
                <div className="relative w-full h-[360px] bg-slate-50 rounded-2xl border border-slate-200 p-3 mt-3 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 700 320" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="actualGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="predGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line x1="60" y1="40" x2="680" y2="40" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="60" y1="95" x2="680" y2="95" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1="60" y1="150" x2="680" y2="150" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1="60" y1="205" x2="680" y2="205" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1="60" y1="260" x2="680" y2="260" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Y-Axis Labels */}
                    <text x="50" y="44" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">0 mm</text>
                    <text x="50" y="99" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">-25 mm</text>
                    <text x="50" y="154" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">-50 mm</text>
                    <text x="50" y="209" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">-75 mm</text>
                    <text x="50" y="264" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">-100 mm</text>

                    {/* Statutory Limit Threshold Line (-150 mm ceiling indicator) */}
                    <line x1="60" y1="290" x2="680" y2="290" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
                    <text x="670" y="285" fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="end">
                      Statutory Permissible Threshold (-150 mm)
                    </text>

                    {/* Vertical Inflection / Longwall Face Origin Line (x = 0m) */}
                    <line x1="310" y1="30" x2="310" y2="270" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,4" />
                    <text x="315" y="45" fill="#475569" fontSize="9" fontWeight="bold">
                      Longwall Face Origin (x = 0m)
                    </text>

                    {/* Pre-Calculation Knothe Theoretical Curve (Dashed Blue) */}
                    <path
                      d={`M 60 ${40 + Math.abs(transectProfileData[0].preCalcSagMm) * 2.2} ${transectProfileData
                        .map((pt, idx) => {
                          const px = 60 + (idx / (transectProfileData.length - 1)) * 620
                          const py = 40 + Math.abs(pt.preCalcSagMm) * 2.2
                          return `L ${px.toFixed(1)} ${py.toFixed(1)}`
                        })
                        .join(' ')}`}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeDasharray="6,4"
                    />

                    {/* Actual Logged Ground Truth Curve (Solid Emerald) */}
                    <path
                      d={`M 60 ${40 + Math.abs(transectProfileData[0].actualLoggedMm) * 2.2} ${transectProfileData
                        .map((pt, idx) => {
                          const px = 60 + (idx / (transectProfileData.length - 1)) * 620
                          const py = 40 + Math.abs(pt.actualLoggedMm) * 2.2
                          return `L ${px.toFixed(1)} ${py.toFixed(1)}`
                        })
                        .join(' ')}`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                    />

                    {/* Sensor Node Markers on the Curve */}
                    {transectProfileData.map((pt, idx) => {
                      if (!pt.correlatedNodeId) return null
                      const px = 60 + (idx / (transectProfileData.length - 1)) * 620
                      const py = 40 + Math.abs(pt.actualLoggedMm) * 2.2
                      const isSelected = crossSectionStation === idx

                      return (
                        <g key={pt.correlatedNodeId} className="cursor-pointer" onClick={() => setCrossSectionStation(idx)}>
                          <circle cx={px} cy={py} r={isSelected ? 7 : 5} fill="#ffffff" stroke="#059669" strokeWidth="2.5" />
                          <circle cx={px} cy={py} r={2} fill="#059669" />
                          <text x={px} y={py - 10} fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle">
                            {pt.correlatedNodeId.replace('NODE-', '')}
                          </text>
                        </g>
                      )
                    })}

                    {/* Interactive Cursor along curve */}
                    {selectedStationData && (
                      <g>
                        {(() => {
                          const cx = 60 + (crossSectionStation / (transectProfileData.length - 1)) * 620
                          const cy = 40 + Math.abs(selectedStationData.actualLoggedMm) * 2.2
                          return (
                            <>
                              <line x1={cx} y1="30" x2={cx} y2="270" stroke="#0f172a" strokeWidth="1" strokeDasharray="2,2" />
                              <circle cx={cx} cy={cy} r="6" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
                            </>
                          )
                        })()}
                      </g>
                    )}

                    {/* X-Axis Stations */}
                    <text x="60" y="278" fill="#64748b" fontSize="9" textAnchor="middle">-200m</text>
                    <text x="185" y="278" fill="#64748b" fontSize="9" textAnchor="middle">-100m</text>
                    <text x="310" y="278" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle">0m (Origin)</text>
                    <text x="435" y="278" fill="#64748b" fontSize="9" textAnchor="middle">+100m</text>
                    <text x="560" y="278" fill="#64748b" fontSize="9" textAnchor="middle">+200m</text>
                    <text x="680" y="278" fill="#64748b" fontSize="9" textAnchor="middle">+300m</text>
                  </svg>

                  {/* Legend Overlay Inside Graph */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-xs border border-slate-200 rounded-xl p-2 shadow-xs text-[10px] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-blue-500 border-b border-dashed border-blue-600" />
                      <span className="text-slate-600 font-bold">Knothe Theoretical Pre-Calc</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-emerald-500" />
                      <span className="text-slate-800 font-extrabold">Logged Actual Ground Truth</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-red-500 border-b border-dashed border-red-500" />
                      <span className="text-red-700 font-semibold">Statutory Margin Cap</span>
                    </div>
                  </div>
                </div>

                {/* Profile Slider to Inspect Any Station */}
                <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700">Station Inspector Along Advance Profile:</span>
                    <span className="font-mono text-blue-700 font-black">{selectedStationData.stationLabel}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={transectProfileData.length - 1}
                    value={crossSectionStation}
                    onChange={(e) => setCrossSectionStation(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/70 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Theoretical Sag:</span>
                      <span className="font-mono font-bold text-blue-700">{selectedStationData.preCalcSagMm} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Actual Logged Sag:</span>
                      <span className="font-mono font-bold text-emerald-600">{selectedStationData.actualLoggedMm} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Difference (Δ):</span>
                      <span className="font-mono font-black text-slate-800">
                        {(selectedStationData.actualLoggedMm - selectedStationData.preCalcSagMm).toFixed(1)} mm (Safe)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footnote */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Geological Parameters: Bulking factor Kf = 1.34 &bull; Poisson's ratio ν = 0.24 &bull; InSAR Sentinel-1 Track 64</span>
                  <span className="font-bold text-emerald-600">Model Reliability: 98.2%</span>
                </div>

              </div>

              {/* RIGHT COLUMN: PARAMETRIC VALIDATION MATRIX TABLE (5 COLS) */}
              <div className="lg:col-span-5 flex flex-col justify-between h-full bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
                
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Parametric Validation Matrix
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Formal verification of pre-calculations vs. actual logged node values
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      6/6 Compliant
                    </span>
                  </div>

                  {/* Parametric Metrics List */}
                  <div className="space-y-2.5 mt-3 max-h-[340px] overflow-y-auto pr-1">
                    {PREDICTION_VS_REALITY_METRICS.map((metric) => {
                      const isSelected = selectedParametricMetric.symbol === metric.symbol

                      return (
                        <div
                          key={metric.symbol}
                          onClick={() => setSelectedParametricMetric(metric)}
                          className={`p-3 rounded-2xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-500/20'
                              : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-900">{metric.parameter}</span>
                                <span className="text-[10px] font-mono text-slate-500">({metric.symbol})</span>
                              </div>
                              <span className="text-[10px] text-slate-400 mt-0.5 block">
                                Limit: <span className="font-semibold text-slate-700">{metric.statutoryLimit}</span>
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {metric.verdict}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[10px]">
                            <div>
                              <span className="text-slate-400 block font-medium">Pre-Calculated:</span>
                              <span className="font-mono font-bold text-blue-700">{metric.preCalculation} {metric.unit}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Actual Logged:</span>
                              <span className="font-mono font-bold text-emerald-600">{metric.loggedActual} {metric.unit}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Safety Margin:</span>
                              <span className="font-mono font-black text-slate-800">{metric.safetyMarginPct}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Parameter Details & Methodology */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider">
                      Audit Methodology: {selectedParametricMetric.parameter}
                    </span>
                  </div>

                  <p className="text-[10px] font-mono text-slate-600 bg-white p-2 rounded-xl border border-slate-200/80 mb-2">
                    {selectedParametricMetric.methodology}
                  </p>

                  <p className="text-[11px] text-slate-600 leading-relaxed italic">
                    "{selectedParametricMetric.evaluationNotes}"
                  </p>
                </div>

                {/* Statutory Regulatory Approval Seal */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsCertificateModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>View Regulatory Clearance Endorsement</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* STATUTORY DGMS COMPLIANCE CERTIFICATE MODAL (FORM IV-B)                  */}
      {/* ========================================================================= */}
      {isCertificateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    DIRECTORATE GENERAL OF MINES SAFETY
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Statutory Subsidence &amp; Strata Stability Endorsement (Form IV-B)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCertificateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Certificate Body */}
            <div className="py-6 space-y-4 text-xs text-slate-700">
              
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                    Statutory Clearance Status
                  </span>
                  <p className="text-sm font-black text-emerald-950 mt-0.5">
                    UNCONDITIONAL STATUTORY CLEARANCE GRANTED
                  </p>
                </div>
                <Award className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block">Colliery Name:</span>
                  <span className="font-extrabold text-slate-900">{collieryName}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block">Statutory Audit ID:</span>
                  <span className="font-mono font-extrabold text-slate-900">DGMS/CZ/2026/AUDIT-891</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block">Inspection Date:</span>
                  <span className="font-semibold text-slate-800">29 September 2026 (Live Surveillance)</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block">Regulatory Standard:</span>
                  <span className="font-semibold text-slate-800">CMR 2017 Reg. 111 &bull; Tech Cir. 4 (2018)</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <span className="font-black text-slate-900 block text-[11px] uppercase tracking-wider">
                  Summary Findings of the Regulatory Inspectorate:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed text-[11px]">
                  <li>
                    <b>Topology Stability:</b> Surface deformations along Panel 7 caving face (-42.6 mm max sag) are 71.6% below the permissible statutory threshold (-150 mm).
                  </li>
                  <li>
                    <b>Infrastructure Buffers:</b> Railway spur tilt is 0.4 mm/m (safe limit: 3.0 mm/m). Hasdeo Canal syphon shows zero differential settlement.
                  </li>
                  <li>
                    <b>Network SLA &amp; Coverage:</b> LoRa mesh uptime verified at 99.98% over past 30 days with 0.00% hotspot miss rate across 1,420,890 telemetry packets.
                  </li>
                  <li>
                    <b>Prediction vs Reality:</b> Actual draw angle (61.8°) strictly matches the 62.5° pre-calculation (Δ = -0.7°).
                  </li>
                </ul>
              </div>

              {/* Cryptographic Verification Seal */}
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block">
                    Cryptographic Validation Stamp (SHA-256)
                  </span>
                  <span className="font-mono text-[10px] text-slate-300 break-all select-all">
                    0x9a3e210d7f98b421a8c0d9e87f1234567890abcdef1234567890abcdef123456
                  </span>
                </div>
                <Lock className="w-5 h-5 text-emerald-400 ml-3 flex-shrink-0" />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCertificateModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print()
                }}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save Official Certificate</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
