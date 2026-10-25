import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  Compass,
  Cpu,
  Eye,
  Filter,
  Layers,
  LogOut,
  MapPin,
  Maximize2,
  PlusCircle,
  Radio,
  RefreshCw,
  Satellite,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  Zap
} from 'lucide-react'
import Gis3DModelViewer from './Gis3DModelViewer'
import MineAlertsTab from './MineAlertsTab'

// Organic contour generator (Knothe asymmetric geological dispersion)
function generateOrganicContour(
  centerLat: number,
  centerLon: number,
  radiusA: number,
  radiusB: number,
  azimuthDeg: number = 38,
  skewDownDip: number = 0.22,
  perturbation: number = 0.07,
  numPoints: number = 64
): [number, number][] {
  const points: [number, number][] = []
  const meterToLat = 1 / 111320
  const meterToLon = 1 / (111320 * Math.cos((centerLat * Math.PI) / 180))
  const theta = (azimuthDeg * Math.PI) / 180

  for (let i = 0; i < numPoints; i++) {
    const phi = (2 * Math.PI * i) / numPoints
    const pearFactor = 1.0 + skewDownDip * Math.sin(phi)
    const geology =
      1.0 +
      perturbation *
        (Math.sin(3 * phi + 1.1) * 0.45 +
          Math.cos(5 * phi - 0.8) * 0.35 +
          Math.sin(7 * phi + 0.3) * 0.2)

    const rA = radiusA * pearFactor * geology
    const rB = radiusB * geology

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

export interface PlannerNode {
  id: string
  name: string
  zoneId: 'zone_a' | 'zone_b' | 'zone_c'
  zoneName: string
  lat: number
  lon: number
  displacement: number // mm
  strain: number // microstrain
  tilt: number // degrees
  vibration: number // mm/s PPV
  status: 'normal' | 'warning' | 'critical' | 'proposed'
  depth: number
  coverageRadiusMeters: number
  insarCorrelatedRate: number // mm/yr
  isProposed?: boolean
}

// 10 Active Hardware Nodes + 2 Strategic Proposed Deployment Nodes
const DEPLOYED_NODES: PlannerNode[] = [
  {
    id: 'NODE-SN-01',
    name: 'Node SN-01',
    zoneId: 'zone_a',
    zoneName: 'Zone A: Panel 7 (Caving Face)',
    lat: 22.3591,
    lon: 82.7501,
    displacement: -42.6,
    strain: 340,
    tilt: 0.18,
    vibration: 1.42,
    status: 'critical',
    depth: 185,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -118.4
  },
  {
    id: 'NODE-SN-02',
    name: 'Node SN-02',
    zoneId: 'zone_a',
    zoneName: 'Zone A: Panel 7 (Caving Face)',
    lat: 22.3599,
    lon: 82.7508,
    displacement: -38.2,
    strain: 295,
    tilt: 0.15,
    vibration: 1.15,
    status: 'critical',
    depth: 185,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -98.2
  },
  {
    id: 'NODE-SN-03',
    name: 'Node SN-03',
    zoneId: 'zone_a',
    zoneName: 'Zone A: Panel 7 (Caving Face)',
    lat: 22.3584,
    lon: 82.7495,
    displacement: -29.4,
    strain: 210,
    tilt: 0.11,
    vibration: 0.88,
    status: 'warning',
    depth: 185,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -74.5
  },
  {
    id: 'NODE-SN-04',
    name: 'Node SN-04',
    zoneId: 'zone_a',
    zoneName: 'Zone A: Panel 7 (Caving Face)',
    lat: 22.3603,
    lon: 82.7492,
    displacement: -21.8,
    strain: 165,
    tilt: 0.08,
    vibration: 0.65,
    status: 'normal',
    depth: 185,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -52.0
  },
  {
    id: 'NODE-SN-05',
    name: 'Node SN-05',
    zoneId: 'zone_a',
    zoneName: 'Zone A: Panel 7 (Caving Face)',
    lat: 22.3578,
    lon: 82.7509,
    displacement: -18.5,
    strain: 140,
    tilt: 0.07,
    vibration: 0.52,
    status: 'normal',
    depth: 185,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -41.2
  },
  {
    id: 'NODE-SN-06',
    name: 'Node SN-06',
    zoneId: 'zone_b',
    zoneName: 'Zone B: Panel 6 (Transition Advance)',
    lat: 22.3611,
    lon: 82.7516,
    displacement: -24.8,
    strain: 195,
    tilt: 0.12,
    vibration: 0.95,
    status: 'warning',
    depth: 210,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -64.8
  },
  {
    id: 'NODE-SN-07',
    name: 'Node SN-07',
    zoneId: 'zone_b',
    zoneName: 'Zone B: Panel 6 (Transition Advance)',
    lat: 22.3619,
    lon: 82.7523,
    displacement: -16.2,
    strain: 135,
    tilt: 0.08,
    vibration: 0.62,
    status: 'normal',
    depth: 210,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -38.6
  },
  {
    id: 'NODE-SN-08',
    name: 'Node SN-08',
    zoneId: 'zone_b',
    zoneName: 'Zone B: Panel 6 (Transition Advance)',
    lat: 22.3605,
    lon: 82.7531,
    displacement: -11.5,
    strain: 98,
    tilt: 0.05,
    vibration: 0.44,
    status: 'normal',
    depth: 210,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -26.4
  },
  {
    id: 'NODE-SN-09',
    name: 'Node SN-09',
    zoneId: 'zone_c',
    zoneName: 'Zone C: Panel 4 (Stabilized Goaf)',
    lat: 22.3567,
    lon: 82.7469,
    displacement: -6.4,
    strain: 75,
    tilt: 0.03,
    vibration: 0.28,
    status: 'normal',
    depth: 240,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -12.1
  },
  {
    id: 'NODE-SN-10',
    name: 'Node SN-10',
    zoneId: 'zone_c',
    zoneName: 'Zone C: Panel 4 (Stabilized Goaf)',
    lat: 22.3574,
    lon: 82.7475,
    displacement: -4.8,
    strain: 50,
    tilt: 0.02,
    vibration: 0.22,
    status: 'normal',
    depth: 240,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -8.4
  }
]

// Proposed Strategic Nodes to fill InSAR coverage gaps
const PROPOSED_STRATEGIC_NODES: PlannerNode[] = [
  {
    id: 'NODE-SN-11-PROP',
    name: 'Proposed SN-11',
    zoneId: 'zone_a',
    zoneName: 'Zone A: North-East Flank (Blind Spot 1)',
    lat: 22.3608,
    lon: 82.7505,
    displacement: -34.5,
    strain: 260,
    tilt: 0.14,
    vibration: 1.05,
    status: 'proposed',
    depth: 185,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -82.6,
    isProposed: true
  },
  {
    id: 'NODE-SN-12-PROP',
    name: 'Proposed SN-12',
    zoneId: 'zone_b',
    zoneName: 'Zone B: South Transition Margin (Blind Spot 2)',
    lat: 22.3598,
    lon: 82.7525,
    displacement: -19.2,
    strain: 155,
    tilt: 0.09,
    vibration: 0.72,
    status: 'proposed',
    depth: 210,
    coverageRadiusMeters: 80,
    insarCorrelatedRate: -46.5,
    isProposed: true
  }
]

// Long-Term Forecast Horizons Data
interface LongTermHorizonData {
  label: string
  horizonMonths: number
  advanceMeters: number
  maxSagMm: number
  maxStrainMmPerM: number
  maxSlopeMmPerM: number
  bowlVolumeM3: number
  breachRiskPct: number
  infrastructureStatus: {
    railway: { status: 'SAFE' | 'MONITOR' | 'CRITICAL'; tiltMmPerM: number; etaMonths: number }
    canal: { status: 'SAFE' | 'MONITOR' | 'CRITICAL'; sagMm: number; etaMonths: number }
    village: { status: 'SAFE' | 'MONITOR' | 'CRITICAL'; strainMmPerM: number; etaMonths: number }
    ventShaft: { status: 'SAFE' | 'MONITOR' | 'CRITICAL'; displacementMm: number; etaMonths: number }
  }
  summaryNarrative: string
}

const LONG_TERM_HORIZONS: Record<'m0' | 'm1' | 'm3' | 'm6' | 'm12', LongTermHorizonData> = {
  m0: {
    label: 'Current Datum (Month 0)',
    horizonMonths: 0,
    advanceMeters: 0,
    maxSagMm: -42.6,
    maxStrainMmPerM: 0.34,
    maxSlopeMmPerM: 2.1,
    bowlVolumeM3: 42000,
    breachRiskPct: 12,
    infrastructureStatus: {
      railway: { status: 'SAFE', tiltMmPerM: 0.4, etaMonths: 8.5 },
      canal: { status: 'SAFE', sagMm: -4.2, etaMonths: 6.2 },
      village: { status: 'SAFE', strainMmPerM: 0.18, etaMonths: 4.5 },
      ventShaft: { status: 'SAFE', displacementMm: -1.2, etaMonths: 24.0 }
    },
    summaryNarrative: 'Baseline face advance with active caving in Panel 7. Continuous ground strain remains within permissible elastic deformation parameters.'
  },
  m1: {
    label: '+1 Month (+75m Advance)',
    horizonMonths: 1,
    advanceMeters: 75,
    maxSagMm: -142.0,
    maxStrainMmPerM: 0.85,
    maxSlopeMmPerM: 4.8,
    bowlVolumeM3: 142500,
    breachRiskPct: 24,
    infrastructureStatus: {
      railway: { status: 'SAFE', tiltMmPerM: 0.9, etaMonths: 7.5 },
      canal: { status: 'SAFE', sagMm: -12.4, etaMonths: 5.2 },
      village: { status: 'MONITOR', strainMmPerM: 0.52, etaMonths: 3.5 },
      ventShaft: { status: 'SAFE', displacementMm: -2.1, etaMonths: 23.0 }
    },
    summaryNarrative: 'Longwall face progresses 75m northward. Surface tensile crack propagation commences along the rear breakline of Panel 7.'
  },
  m3: {
    label: '+3 Months (Quarterly: +225m)',
    horizonMonths: 3,
    advanceMeters: 225,
    maxSagMm: -480.0,
    maxStrainMmPerM: 1.95,
    maxSlopeMmPerM: 9.6,
    bowlVolumeM3: 260000,
    breachRiskPct: 58,
    infrastructureStatus: {
      railway: { status: 'MONITOR', tiltMmPerM: 2.1, etaMonths: 4.5 },
      canal: { status: 'MONITOR', sagMm: -65.0, etaMonths: 2.2 },
      village: { status: 'CRITICAL', strainMmPerM: 1.82, etaMonths: 0.8 },
      ventShaft: { status: 'SAFE', displacementMm: -3.8, etaMonths: 20.0 }
    },
    summaryNarrative: 'Inflection point crossed. Surface tensile strains at village boundary approach critical DGMS cracking threshold (2.0 mm/m). Stress relief trenching recommended.'
  },
  m6: {
    label: '+6 Months (Bi-Annual: +450m)',
    horizonMonths: 6,
    advanceMeters: 450,
    maxSagMm: -1240.0,
    maxStrainMmPerM: 3.40,
    maxSlopeMmPerM: 15.2,
    bowlVolumeM3: 430000,
    breachRiskPct: 84,
    infrastructureStatus: {
      railway: { status: 'CRITICAL', tiltMmPerM: 3.8, etaMonths: 0.4 },
      canal: { status: 'CRITICAL', sagMm: -180.0, etaMonths: 0.2 },
      village: { status: 'CRITICAL', strainMmPerM: 3.10, etaMonths: 0.0 },
      ventShaft: { status: 'SAFE', displacementMm: -6.4, etaMonths: 16.0 }
    },
    summaryNarrative: 'Full caving goaf compaction phase. Hasdeo Feeder canal gradient altered; ballast packing required on Bilaspur-Korba spur to prevent track twisting.'
  },
  m12: {
    label: '+12 Months (Seam Depletion: +900m)',
    horizonMonths: 12,
    advanceMeters: 900,
    maxSagMm: -2180.0,
    maxStrainMmPerM: 4.25,
    maxSlopeMmPerM: 18.5,
    bowlVolumeM3: 620000,
    breachRiskPct: 92,
    infrastructureStatus: {
      railway: { status: 'MONITOR', tiltMmPerM: 4.1, etaMonths: 0.0 },
      canal: { status: 'MONITOR', sagMm: -240.0, etaMonths: 0.0 },
      village: { status: 'CRITICAL', strainMmPerM: 3.90, etaMonths: 0.0 },
      ventShaft: { status: 'SAFE', displacementMm: -9.8, etaMonths: 12.0 }
    },
    summaryNarrative: 'Asymptotic ceiling S_max (-2,240 mm) reached. Ground movement decelerates to steady post-mining residual settling. Permanent land regrading plan activated.'
  }
}

// Dynamic EKF Tuning Profiles for Tab 3
const EKF_TUNING_PROFILES = {
  standard: {
    label: 'Standard Balanced EKF',
    badge: 'Balanced 50/50 Multi-Rate Bayesian Fusion',
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    description: 'Optimal minimum mean-square error (MMSE) state estimation balancing multi-temporal InSAR satellite baseline with 1.5s real-time IoT strain mesh.',
    kalmanGain: '0.642',
    gainDetail: 'Equally weighted Bayesian balance',
    residual: '±0.28 mm',
    residualDetail: '3σ bound: ±1.20 mm (Optimal Convergence)',
    varianceSuppression: '82.4%',
    varianceDetail: 'Trace reduction Tr(P) = 0.196',
    latency: '18 ms',
    latencyDetail: 'Real-time multi-rate fusion cycle',
    stateVector: 'x̂ = [-42.84 mm (Sag), -6.32 mm/day (Velocity)]',
    covarianceP: [
      ['0.142', '0.018'],
      ['0.018', '0.054']
    ],
    traceP: '0.196',
    rInsar: '17.64 mm² (σ = 4.20mm, Standard InSAR)',
    rMesh: '0.64 mm² (σ = 0.80mm, Standard LoRa)',
    qProcess: 'diag(0.04, 0.01)',
    nisTest: 'χ² = 2.14 < 5.99 (95% Confidence Pass)',
    conditionNum: '1.12',
    nisStatus: 'OPTIMAL CONVERGENCE',
    // Fused Green Curve: Balanced smooth path between InSAR dots and LoRa path
    curvePath: 'M 50 46 C 120 50, 200 70, 300 92 C 400 124, 500 150, 600 172 C 680 188, 730 198, 770 202',
    syncDot: { x: 750, y: 200 },
    logs: [
      'INGEST: Sentinel-1B Track 64 InSAR interferogram parsed (Phase Coherence γ = 0.84).',
      'EKF-CYCLE: Sensor NODE-SN-01 fused with InSAR Pixel (22.3591, 82.7501).',
      'RESIDUAL: ỹ_k = +0.14 mm; Kalman gain K = [0.642, 0.118]^T applied.',
      'LORA-MESH: 10 hardware nodes synced via Korba Central LoRa Gateway (RSSI: -64 dBm).',
      'STATE-UPDATE: x̂_k updated to [-42.84 mm, -6.32 mm/day]. P trace stable at 0.196.',
      'VALIDATION: Chi-squared NIS test = 2.14 < 5.99 -> PASS (White noise innovation).'
    ]
  },
  insar_heavy: {
    label: 'High InSAR Weight (Satellite Priority)',
    badge: '85% InSAR Orbit Trust • Ground Jitter Filtered',
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-300',
    description: 'Prioritizes satellite interferometric line-of-sight measurements (R_insar decreased to 4.2 mm²). Fused trajectory firmly tracks large-scale orbital phase passes, dampening high-frequency surface vibrations.',
    kalmanGain: '0.885',
    gainDetail: 'High satellite observation trust (85%)',
    residual: '±0.11 mm',
    residualDetail: '3σ bound: ±0.48 mm (Strict Satellite Tracking)',
    varianceSuppression: '91.8%',
    varianceDetail: 'Trace reduction Tr(P) = 0.112',
    latency: '14 ms',
    latencyDetail: 'Low-order polynomial smoothing',
    stateVector: 'x̂ = [-43.92 mm (Sag), -6.85 mm/day (Velocity)]',
    covarianceP: [
      ['0.084', '0.009'],
      ['0.009', '0.028']
    ],
    traceP: '0.112',
    rInsar: '4.20 mm² (σ = 2.05mm, Highly Trusted Satellite)',
    rMesh: '4.80 mm² (σ = 2.19mm, De-weighted Mesh Noise)',
    qProcess: 'diag(0.01, 0.005)',
    nisTest: 'χ² = 1.62 < 5.99 (99% InSAR Agreement)',
    conditionNum: '1.04',
    nisStatus: 'SATELLITE DOMINATED TRACE',
    // Fused Green Curve: Passes directly through purple InSAR points! (90, 52), (190, 76), (290, 92), (390, 138), (490, 148), (590, 172), (690, 188)
    curvePath: 'M 50 44 C 70 48, 80 50, 90 52 C 140 64, 170 72, 190 76 C 240 84, 270 88, 290 92 C 340 115, 370 130, 390 138 C 440 143, 470 146, 490 148 C 540 160, 570 168, 590 172 C 640 180, 670 185, 690 188 C 730 195, 755 198, 770 200',
    syncDot: { x: 690, y: 188 },
    logs: [
      'TUNING: InSAR measurement noise R_insar reduced to 4.20 mm² (High Satellite Priority).',
      'INTERFEROGRAM: Sentinel-1 Descending Track 64 fringe phase unwrapping locked.',
      'EKF-CYCLE: Strong satellite Kalman gain K = 0.885 clamps state to radar LOS.',
      'FILTER-ACTION: High-frequency LoRa surface vibrations de-weighted by 75%.',
      'STATE-UPDATE: x̂_k updated to [-43.92 mm, -6.85 mm/day]. P trace minimized to 0.112.',
      'VALIDATION: InSAR residual tightly bounded at ±0.11 mm (Satellite Truth Conformity).'
    ]
  },
  iot_heavy: {
    label: 'High IoT Mesh Weight (Real-Time Sensor Priority)',
    badge: '85% IoT Ground Sensor Trust • Micro-Deformation Active',
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-300',
    description: 'Prioritizes subterranean in-situ IoT telemetry (R_mesh decreased to 0.16 mm²). Fused trajectory captures rapid dynamic strain accelerations and seismic geophone vibrations in real time.',
    kalmanGain: '0.312',
    gainDetail: 'High local ground node trust (85%)',
    residual: '±0.49 mm',
    residualDetail: '3σ bound: ±1.85 mm (Tracks Real-Time Dynamic Jitter)',
    varianceSuppression: '74.6%',
    varianceDetail: 'Trace reduction Tr(P) = 0.310',
    latency: '8 ms',
    latencyDetail: 'High-frequency 1.5s real-time streaming',
    stateVector: 'x̂ = [-41.76 mm (Sag), -5.84 mm/day (Velocity)]',
    covarianceP: [
      ['0.218', '0.034'],
      ['0.034', '0.092']
    ],
    traceP: '0.310',
    rInsar: '36.00 mm² (σ = 6.00mm, High Atmospheric Noise Penalty)',
    rMesh: '0.16 mm² (σ = 0.40mm, Highly Trusted Strain)',
    qProcess: 'diag(0.08, 0.04)',
    nisTest: 'χ² = 3.84 < 5.99 (Dynamic Strain Tracking)',
    conditionNum: '1.28',
    nisStatus: 'GROUND STRAIN RESPONSIVE',
    // Fused Green Curve: Closely tracks the fluctuating amber LoRa line!
    curvePath: 'M 50 48 L 70 43 L 90 53 L 110 50 L 130 57 L 150 56 L 170 65 L 190 71 L 210 68 L 230 77 L 250 81 L 270 85 L 290 93 L 310 97 L 330 105 L 350 113 L 370 119 L 390 133 L 410 129 L 430 141 L 450 139 L 470 147 L 490 151 L 510 157 L 530 161 L 550 167 L 570 165 L 590 173 L 610 175 L 630 181 L 650 179 L 670 187 L 690 189 L 710 195 L 730 197 L 750 201 L 770 203',
    syncDot: { x: 750, y: 201 },
    logs: [
      'TUNING: LoRa mesh noise R_mesh reduced to 0.16 mm² (Subterranean Sensor Priority).',
      'MESH-SYNC: 10 borehole extensometers & tiltmeters stream at 1.5s interval.',
      'EKF-CYCLE: Fast dynamic state propagation active; tracking abrupt ground flexure.',
      'INNOVATION: Atmospheric InSAR phase noise penalized; state follows ground strain.',
      'STATE-UPDATE: x̂_k updated to [-41.76 mm, -5.84 mm/day]. Dynamic response: HIGH.',
      'VALIDATION: NIS test = 3.84 < 5.99 -> PASS (Responsive to rapid face advance).'
    ]
  }
}

interface Props {
  onLogout: () => void
  onSwitchDashboard?: (dashboard: 'operator' | 'planner') => void
  collieryName?: string
  hideHeader?: boolean
  isSimulatedAlert?: boolean
  onToggleSimulation?: () => void
}

export default function MinePlannerDashboard({
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

  // Tabs: 'insar_node_mapping' | 'ai_trend_forecasting' | 'data_processing_feed' | 'alerts'
  const [activeTab, setActiveTab] = useState<'insar_node_mapping' | 'ai_trend_forecasting' | 'data_processing_feed' | 'alerts'>('insar_node_mapping')

  // Tab 1 Sub-View Modes: 'gis_interactive' | 'scientific_top_view' | 'gis_3d_model'
  const [insarViewMode, setInsarViewMode] = useState<'gis_interactive' | 'scientific_top_view' | 'gis_3d_model'>('gis_interactive')
  const [heatmapZone, setHeatmapZone] = useState<'zone_a' | 'zone_b' | 'zone_c'>('zone_a')

  // Map Basemap: 'satellite' | 'topo'
  const [mapBasemap, setMapBasemap] = useState<'satellite' | 'topo'>('satellite')

  // InSAR Map Controls
  const [showCoverageBuffers, setShowCoverageBuffers] = useState<boolean>(true)
  const [showCoverageGaps, setShowCoverageGaps] = useState<boolean>(true)
  const [simulateProposedNodes, setSimulateProposedNodes] = useState<boolean>(false)
  const [selectedPlannerNode, setSelectedPlannerNode] = useState<PlannerNode | null>(DEPLOYED_NODES[0])

  // AI Trend Forecasting Controls
  const [forecastHorizon, setForecastHorizon] = useState<'m0' | 'm1' | 'm3' | 'm6' | 'm12'>('m3')

  // Data Processing Feed (EKF) Controls & Telemetry
  const [kalmanFilterMode, setKalmanFilterMode] = useState<'standard' | 'insar_heavy' | 'iot_heavy'>('standard')
  const [currentTime, setCurrentTime] = useState<string>('')

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const satelliteLayerRef = useRef<L.TileLayer | null>(null)
  const topoLayerRef = useRef<L.TileLayer | null>(null)
  const insarLayerGroupRef = useRef<L.LayerGroup | null>(null)
  const nodesLayerGroupRef = useRef<L.LayerGroup | null>(null)
  const gapLayerGroupRef = useRef<L.LayerGroup | null>(null)

  // Real-time Clock
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
  // LEAFLET MAP INITIALIZATION & LAYER MANAGEMENT
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'insar_node_mapping' || insarViewMode !== 'gis_interactive') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      return
    }

    if (!mapContainerRef.current || mapInstanceRef.current) return

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
    satelliteLayerRef.current = satLayer

    const topoLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19 }
    )
    topoLayerRef.current = topoLayer

    if (mapBasemap === 'satellite') {
      satLayer.addTo(map)
    } else {
      topoLayer.addTo(map)
    }

    insarLayerGroupRef.current = L.layerGroup().addTo(map)
    gapLayerGroupRef.current = L.layerGroup().addTo(map)
    nodesLayerGroupRef.current = L.layerGroup().addTo(map)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [activeTab, insarViewMode])

  // Basemap switch
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !satelliteLayerRef.current || !topoLayerRef.current) return

    if (mapBasemap === 'satellite') {
      if (map.hasLayer(topoLayerRef.current)) map.removeLayer(topoLayerRef.current)
      if (!map.hasLayer(satelliteLayerRef.current)) satelliteLayerRef.current.addTo(map)
    } else {
      if (map.hasLayer(satelliteLayerRef.current)) map.removeLayer(satelliteLayerRef.current)
      if (!map.hasLayer(topoLayerRef.current)) topoLayerRef.current.addTo(map)
    }
  }, [mapBasemap])

  // Draw InSAR Subsidence Heatmap Polygons
  useEffect(() => {
    const insarGroup = insarLayerGroupRef.current
    if (!insarGroup) return

    insarGroup.clearLayers()

    // 1. Core High Subsidence Zone (-90 to -120 mm/yr)
    L.polygon(generateOrganicContour(22.3591, 82.7501, 85, 70, 38, 0.16, 0.05), {
      color: '#9333ea',
      weight: 2.5,
      fillColor: '#7e22ce',
      fillOpacity: 0.55
    })
      .addTo(insarGroup)
      .bindTooltip('<b>InSAR High Velocity Core: -118.4 mm/yr</b><br/>Sentinel-1 LOS Deformation<br/>Goaf Caving Center', { sticky: true })

    // 2. Annular Tension Ring (-45 to -85 mm/yr)
    L.polygon(generateOrganicContour(22.3591, 82.7501, 140, 115, 38, 0.2, 0.06), {
      color: '#ea580c',
      weight: 2,
      dashArray: '4, 4',
      fillColor: '#f97316',
      fillOpacity: 0.35
    })
      .addTo(insarGroup)
      .bindTooltip('<b>InSAR Intermediate Subsidence: -64.2 mm/yr</b><br/>Differential Shear Gradient', { sticky: true })

    // 3. Low Subsidence Outer Margin (-10 to -35 mm/yr)
    L.polygon(generateOrganicContour(22.3591, 82.7501, 195, 155, 38, 0.22, 0.07), {
      color: '#059669',
      weight: 1.5,
      dashArray: '5, 5',
      fillColor: '#10b981',
      fillOpacity: 0.15
    })
      .addTo(insarGroup)
      .bindTooltip('<b>InSAR Outer Draw Boundary: -12.5 mm/yr</b><br/>Subsidence Trough Limit', { sticky: true })

    // Zone B InSAR Trough
    L.polygon(generateOrganicContour(22.3611, 82.7516, 75, 62, 40, 0.14, 0.05), {
      color: '#ea580c',
      weight: 2,
      fillColor: '#ea580c',
      fillOpacity: 0.42
    })
      .addTo(insarGroup)
      .bindTooltip('<b>Zone B InSAR Advance Trough: -64.8 mm/yr</b><br/>Transition Longwall Flexure', { sticky: true })
  }, [activeTab, insarViewMode])

  // Draw Coverage Gaps & Blind Spots
  useEffect(() => {
    const gapGroup = gapLayerGroupRef.current
    if (!gapGroup) return

    gapGroup.clearLayers()

    if (showCoverageGaps) {
      // Blind Spot #1: Zone A North-East Flank (InSAR shows -82 mm/yr with zero ground node within 140m)
      L.polygon(
        [
          [22.3602, 82.7499],
          [22.3614, 82.7506],
          [22.3610, 82.7514],
          [22.3598, 82.7508]
        ],
        {
          color: '#e11d48',
          weight: 2.5,
          dashArray: '6, 6',
          fillColor: '#f43f5e',
          fillOpacity: 0.35
        }
      )
        .addTo(gapGroup)
        .bindTooltip('<b>CRITICAL COVERAGE BLIND SPOT #1</b><br/>InSAR Rate: -82.6 mm/yr<br/>Ground Sensor Distance: 142m (Gap)<br/>High Surface Shear Risk', { sticky: true })

      // Blind Spot #2: Transition Panel 6 South
      L.polygon(
        [
          [22.3593, 82.7518],
          [22.3604, 82.7523],
          [22.3601, 82.7533],
          [22.3590, 82.7526]
        ],
        {
          color: '#d97706',
          weight: 2.2,
          dashArray: '5, 5',
          fillColor: '#f59e0b',
          fillOpacity: 0.28
        }
      )
        .addTo(gapGroup)
        .bindTooltip('<b>COVERAGE BLIND SPOT #2</b><br/>InSAR Rate: -46.5 mm/yr<br/>Near Surface Village Infrastructure Boundary', { sticky: true })
    }
  }, [showCoverageGaps, activeTab, insarViewMode])

  // Draw Deployed Nodes & Proposed Nodes
  useEffect(() => {
    const nodesGroup = nodesLayerGroupRef.current
    if (!nodesGroup) return

    nodesGroup.clearLayers()

    const nodesToRender = simulateProposedNodes
      ? [...DEPLOYED_NODES, ...PROPOSED_STRATEGIC_NODES]
      : DEPLOYED_NODES

    nodesToRender.forEach((n) => {
      const isSelected = selectedPlannerNode?.id === n.id
      const isProposed = n.isProposed

      // Buffer radius circle
      if (showCoverageBuffers) {
        L.circle([n.lat, n.lon], {
          radius: n.coverageRadiusMeters,
          color: isProposed ? '#06b6d4' : '#10b981',
          weight: 1.2,
          dashArray: isProposed ? '3, 3' : undefined,
          fillColor: isProposed ? '#06b6d4' : '#10b981',
          fillOpacity: isProposed ? 0.22 : 0.12
        }).addTo(nodesGroup)
      }

      const pinColor = isProposed
        ? '#06b6d4'
        : n.status === 'critical'
        ? '#dc2626'
        : n.status === 'warning'
        ? '#ea580c'
        : '#059669'

      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'
        }">
          <span class="absolute -top-1 -right-1 flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${
              isProposed ? 'bg-cyan-400' : 'bg-emerald-400'
            } opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 ${
              isProposed ? 'bg-cyan-500' : 'bg-emerald-500'
            }"></span>
          </span>
          <div style="
            background: ${pinColor};
            width: ${isSelected ? '28px' : '22px'};
            height: ${isSelected ? '28px' : '22px'};
            border: 2px solid white;
            border-radius: 9999px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isSelected ? '10px' : '8px'};
            font-weight: 900;
            font-family: monospace;
          ">
            ${isProposed ? 'P' : n.name.replace('Node SN-', '')}
          </div>
        </div>
      `

      const icon = L.divIcon({
        className: 'custom-planner-pin',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })

      const marker = L.marker([n.lat, n.lon], { icon }).addTo(nodesGroup)
      marker.on('click', () => setSelectedPlannerNode(n))
      marker.bindTooltip(
        `<b>${n.name} ${isProposed ? '(PROPOSED)' : ''}</b><br/>InSAR Correlated Rate: <b>${n.insarCorrelatedRate} mm/yr</b><br/>Current Sag: <b>${n.displacement} mm</b>`,
        { direction: 'top', offset: [0, -10] }
      )
    })
  }, [showCoverageBuffers, simulateProposedNodes, selectedPlannerNode, activeTab, insarViewMode])

  const currentHorizonData = LONG_TERM_HORIZONS[forecastHorizon]
  const currentEkfProfile = EKF_TUNING_PROFILES[kalmanFilterMode]

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none">
      
      {/* ========================================================================= */}
      {/* TOP NAVBAR (EXECUTIVE BRANDING WITHOUT SWITCHER)                          */}
      {/* ========================================================================= */}
      {!hideHeader && (
        <header className="w-full bg-white border-b border-slate-200/90 sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-2xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* Logo & Portal Identity */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Compass className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-slate-950">
                    Bhu<span className="text-emerald-600">Rakshak</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wider">
                    Mine Planner (Strategy)
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 hidden sm:inline-block">
                    by Akshat
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 hidden sm:block">
                  {collieryName} • DGMS Strategic Geotechnical Planning &amp; InSAR Surveillance • Conceived &amp; Developed by Akshat
                </p>
              </div>
            </div>

            {/* Right Header Controls: Live Clock + InSAR Sync + Sign Out */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Live Clock */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span>{currentTime || '12:00:00 IST'}</span>
              </div>

              {/* InSAR Sync Indicator */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <Satellite className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sentinel-1 InSAR Synced</span>
              </div>

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
      {/* 3 CORE STRATEGIC SUBTABS: CENTERED ROUNDED CARD CONTAINER                 */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 4 CORE PLANNER TABS + SIMULATION BUTTON: ROUNDED CARD CONTAINER           */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-5 pb-1">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto scrollbar-none w-full md:w-auto py-0.5">
            
            {/* Tab 1: InSAR Heatmap & Node Mapping */}
            <button
              type="button"
              onClick={() => setActiveTab('insar_node_mapping')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'insar_node_mapping'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Satellite className="w-4 h-4 text-indigo-600" />
              <span>InSAR Heatmap &amp; Node Mapping</span>
            </button>

            {/* Tab 2: AI Trend Forecasting */}
            <button
              type="button"
              onClick={() => setActiveTab('ai_trend_forecasting')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'ai_trend_forecasting'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>AI Trend Forecasting (1-12m)</span>
            </button>

            {/* Tab 3: Data Processing Feed (EKF) */}
            <button
              type="button"
              onClick={() => setActiveTab('data_processing_feed')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'data_processing_feed'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Data Processing Feed (EKF)</span>
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

          {/* Simulation Trigger Button on Planner */}
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
      {/* MAIN CONTENT CANVAS                                                       */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-4 flex-1">
        
        {/* ======================================================================= */}
        {/* TAB 0: ALERTS & EARLY WARNING                                           */}
        {/* ======================================================================= */}
        {activeTab === 'alerts' && (
          <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs animate-fadeIn">
            <MineAlertsTab
              isSimulatedAlert={isSimulatedAlert}
              onToggleSimulation={handleToggleSimulation}
              currentRole="planner"
              collieryName={collieryName}
            />
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 1: InSAR HEATMAP & STRATEGIC NODE MAPPING                           */}
        {/* ======================================================================= */}
        {activeTab === 'insar_node_mapping' && (
          <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn">
            
            {/* Header: Title + Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Satellite className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                    InSAR SATELLITE SUBSIDENCE &amp; STRATEGIC NODE MAPPING
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    Sentinel-1 Multi-Temporal InSAR Overlay
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Overlaying Sentinel-1 radar line-of-sight (LOS) displacement interferograms with physical IoT sensor deployment to identify coverage gaps.
                </p>
              </div>

              {/* View Mode & Map Controls Group */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* 1. Main View Mode Switcher: GIS Interactive vs Scientific Top-View vs 3D GIS Model */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setInsarViewMode('gis_interactive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      insarViewMode === 'gis_interactive'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    GIS Mesh &amp; Nodes
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsarViewMode('scientific_top_view')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      insarViewMode === 'scientific_top_view'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Top-View InSAR Heatmap
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsarViewMode('gis_3d_model')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      insarViewMode === 'gis_3d_model'
                        ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-cyan-400 shadow-xs ring-1 ring-cyan-500/40'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5 text-cyan-500" />
                    <span>3D GIS Model</span>
                    <span className="text-[9px] bg-cyan-100 text-cyan-800 font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                      3D
                    </span>
                  </button>
                </div>

                {/* 2. Simulation Toggle Button (Always easily accessible) */}
                <button
                  type="button"
                  onClick={() => setSimulateProposedNodes(!simulateProposedNodes)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    simulateProposedNodes
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white border-cyan-600 shadow-xs ring-2 ring-cyan-400/40'
                      : 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{simulateProposedNodes ? '✓ Simulating +2 Nodes' : 'Simulate +2 Nodes'}</span>
                </button>

                {/* 3. Contextual GIS Action Buttons (Visible when GIS Map is on screen) */}
                {insarViewMode === 'gis_interactive' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowCoverageBuffers(!showCoverageBuffers)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        showCoverageBuffers
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {showCoverageBuffers ? 'Hide 80m Radii' : 'Show 80m Radii'}
                    </button>

                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setMapBasemap('satellite')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          mapBasemap === 'satellite' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Satellite
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapBasemap('topo')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          mapBasemap === 'topo' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Vector
                      </button>
                    </div>
                  </>
                )}

                {/* 4. Contextual Zone Switcher (Visible when Top-View Heatmap is on screen) */}
                {insarViewMode === 'scientific_top_view' && (
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {(['zone_a', 'zone_b', 'zone_c'] as const).map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setHeatmapZone(z)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          heatmapZone === z
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {z === 'zone_a' ? 'Zone A (Panel 7)' : z === 'zone_b' ? 'Zone B (Panel 6)' : 'Zone C (Panel 4)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Strategic KPI Metric Deck */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Lease Area</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">4.20 km²</span>
                <span className="block text-[11px] text-slate-500">100% InSAR coverage</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ground Node Coverage</span>
                <div className="text-xl sm:text-2xl font-black font-mono flex items-baseline gap-2">
                  <span className={simulateProposedNodes ? 'text-emerald-700' : 'text-slate-900'}>
                    {simulateProposedNodes ? '96.8%' : '74.2%'}
                  </span>
                  {simulateProposedNodes && (
                    <span className="text-xs font-bold text-emerald-600 font-sans">+22.6%</span>
                  )}
                </div>
                <span className="block text-[11px] text-slate-500">
                  {simulateProposedNodes ? '2 proposed nodes deployed' : '1.08 km² coverage gap remaining'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-rose-800 uppercase tracking-wider">Identified Blind Spots</span>
                <span className="text-xl sm:text-2xl font-black text-rose-900 font-mono">
                  {simulateProposedNodes ? '0 Gaps' : '2 Critical Gaps'}
                </span>
                <span className="block text-[11px] text-rose-700">
                  {simulateProposedNodes ? 'All high-shear zones covered' : 'Zone A NE flank & Transition flank'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-purple-900 uppercase tracking-wider">Peak InSAR Velocity</span>
                <span className="text-xl sm:text-2xl font-black text-purple-950 font-mono">-118.4 mm/yr</span>
                <span className="block text-[11px] text-purple-700">Panel 7 Longwall Caving Axis</span>
              </div>
            </div>

            {/* =================================================================== */}
            {/* STRATEGIC SIMULATION COMPARATIVE ANALYSIS DECK                      */}
            {/* =================================================================== */}
            {simulateProposedNodes && (
              <div className="bg-gradient-to-br from-cyan-950/5 via-slate-50 to-indigo-950/5 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                          Strategic Deployment Simulation: Baseline (10 Nodes) vs. Simulated (12 Nodes)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          +2 Nodes Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Quantitative geotechnical comparison from adding Proposed Node SN-11 (Zone A NE) and Proposed Node SN-12 (Zone B South Margin).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500 text-white shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      100% Blind Spot Mitigation
                    </span>
                  </div>
                </div>

                {/* 6 High-Impact Side-by-Side Comparison Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  
                  {/* Metric 1: Triangulated Ground Coverage */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Ground Node Coverage</span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        +22.6% GAIN
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-400">Baseline (10 Nodes)</span>
                        <span className="text-lg font-black text-slate-600 font-mono">74.2%</span>
                        <span className="text-[10px] text-slate-500 block">3.12 km² triangulated</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-600 self-center" />
                      <div className="text-right">
                        <span className="block text-[10px] text-cyan-600 font-bold">Simulated (12 Nodes)</span>
                        <span className="text-xl font-black text-emerald-600 font-mono">96.8%</span>
                        <span className="text-[10px] text-emerald-700 font-bold block">4.06 km² triangulated</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 2: Identified Blind Spots */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Critical Blind Spots</span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        100% ELIMINATED
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-400">Baseline (10 Nodes)</span>
                        <span className="text-lg font-black text-rose-600 font-mono">2 Gaps</span>
                        <span className="text-[10px] text-rose-600 block">142m &amp; 115m gaps</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-600 self-center" />
                      <div className="text-right">
                        <span className="block text-[10px] text-cyan-600 font-bold">Simulated (12 Nodes)</span>
                        <span className="text-xl font-black text-emerald-600 font-mono">0 Gaps</span>
                        <span className="text-[10px] text-emerald-700 font-bold block">Full InSAR Overlap</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 3: Max Inter-Node Distance */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Max Inter-Node Distance</span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        -104m (-73%)
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-400">Baseline (10 Nodes)</span>
                        <span className="text-lg font-black text-slate-600 font-mono">142 m</span>
                        <span className="text-[10px] text-rose-600 block">&gt; 80m DGMS limit</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-600 self-center" />
                      <div className="text-right">
                        <span className="block text-[10px] text-cyan-600 font-bold">Simulated (12 Nodes)</span>
                        <span className="text-xl font-black text-emerald-600 font-mono">38 m</span>
                        <span className="text-[10px] text-emerald-700 font-bold block">Dense Mesh Ring</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 4: EKF Uncertainty Covariance Tr(P) */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">EKF State Uncertainty Tr(P)</span>
                      <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        -52.4% ERROR DROP
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-400">Baseline (10 Nodes)</span>
                        <span className="text-lg font-black text-slate-600 font-mono">0.412 mm²</span>
                        <span className="text-[10px] text-slate-500 block">InSAR fringe noise</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-600 self-center" />
                      <div className="text-right">
                        <span className="block text-[10px] text-cyan-600 font-bold">Simulated (12 Nodes)</span>
                        <span className="text-xl font-black text-indigo-600 font-mono">0.196 mm²</span>
                        <span className="text-[10px] text-indigo-700 font-bold block">82.4% Variance Cut</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 5: Predictive Early Warning Lead Time */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Predictive Lead Time</span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        +72 HOURS (+150%)
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-400">Baseline (10 Nodes)</span>
                        <span className="text-lg font-black text-slate-600 font-mono">48 Hours</span>
                        <span className="text-[10px] text-slate-500 block">2 days evacuation</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-600 self-center" />
                      <div className="text-right">
                        <span className="block text-[10px] text-cyan-600 font-bold">Simulated (12 Nodes)</span>
                        <span className="text-xl font-black text-emerald-600 font-mono">120 Hours</span>
                        <span className="text-[10px] text-emerald-700 font-bold block">5 days predictive lead</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 6: DGMS Safety & Capex ROI */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">DGMS Statutory Clearance</span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        38x RISK ROI
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-400">Baseline (10 Nodes)</span>
                        <span className="text-lg font-black text-slate-600 font-mono">Cat II-B</span>
                        <span className="text-[10px] text-amber-600 block">Requires visual audit</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-600 self-center" />
                      <div className="text-right">
                        <span className="block text-[10px] text-cyan-600 font-bold">Simulated (12 Nodes)</span>
                        <span className="text-xl font-black text-emerald-600 font-mono">Class I-A</span>
                        <span className="text-[10px] text-emerald-700 font-bold block">₹4.8L vs ₹1.85Cr Risk</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW MODE 1: INTERACTIVE GIS & NODE PLACEMENT MAP                   */}
            {/* =================================================================== */}
            {insarViewMode === 'gis_interactive' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Map Canvas (Left 8 cols) */}
                <div className="lg:col-span-8 flex flex-col justify-between space-y-2">
                  <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
                    <div ref={mapContainerRef} className="w-full h-full" />
                    
                    {/* Floating Map Legend */}
                    <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 max-w-[200px]">
                      <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider border-b border-slate-100 pb-1">
                        InSAR LOS Subsidence
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-3.5 h-3 rounded-sm bg-[#9333ea]" />
                        <span>&gt; -90 mm/yr (Core)</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-3.5 h-3 rounded-sm bg-[#ea580c]" />
                        <span>-45 to -90 mm/yr (Shear)</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-3.5 h-3 rounded-sm bg-[#10b981]" />
                        <span>-10 to -45 mm/yr (Margin)</span>
                      </div>
                      <div className="border-t border-slate-100 pt-1 mt-1 space-y-1">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="w-3 h-3 rounded-full border-2 border-rose-500 bg-rose-200" />
                          <span>Coverage Gap Polygon</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="w-3 h-3 rounded-full bg-cyan-500" />
                          <span>Proposed Node (+80m)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                    <span>* Click any node pin to inspect correlated InSAR telemetry and geotechnical coverage characteristics.</span>
                    <span className="font-mono text-[11px]">Orbit: Sentinel-1 Descending Track 64</span>
                  </div>
                </div>

                {/* Node Inspector & Coverage Gap Advisory (Right 4 cols: Exactly height matched to 540px) */}
                <div className="lg:col-span-4 h-[540px] flex flex-col justify-between space-y-3">
                  
                  {/* Node Detail Card */}
                  {selectedPlannerNode && (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-sm">
                              {selectedPlannerNode.name}
                            </h3>
                            {selectedPlannerNode.isProposed && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-cyan-100 text-cyan-800">
                                Proposed
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                            {selectedPlannerNode.zoneName}
                          </p>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          selectedPlannerNode.isProposed
                            ? 'bg-cyan-100 text-cyan-800'
                            : selectedPlannerNode.status === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : selectedPlannerNode.status === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {selectedPlannerNode.isProposed ? 'SIMULATION' : selectedPlannerNode.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 font-sans block">InSAR Rate</span>
                          <span className="font-bold text-rose-600">{selectedPlannerNode.insarCorrelatedRate} mm/yr</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 font-sans block">Measured Sag</span>
                          <span className="font-bold text-slate-900">{selectedPlannerNode.displacement} mm</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 font-sans block">Coverage Radius</span>
                          <span className="font-bold text-indigo-600">{selectedPlannerNode.coverageRadiusMeters} meters</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 font-sans block">Strata Depth</span>
                          <span className="font-bold text-slate-900">{selectedPlannerNode.depth} m</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200 text-[11px] text-indigo-900 space-y-0.5">
                        <span className="font-bold block">Strategic Recommendation:</span>
                        <p className="leading-snug text-[10px]">
                          {selectedPlannerNode.isProposed
                            ? 'Deployment fills Blind Spot 1. Suggested configuration: 3-point magnetic extensometer + MEMS tiltmeter.'
                            : 'Sensor within Knothe draw angle. Telemetry fused with Sentinel-1 interferograms via Extended Kalman Filter.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Coverage Gap Identification Action Box */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Identified Coverage Gaps</span>
                    </h4>
                    
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded-xl border border-rose-200 bg-rose-50/50 space-y-0.5">
                        <div className="flex items-center justify-between font-bold text-rose-900">
                          <span>Blind Spot #1 (Zone A NE)</span>
                          <span className="text-[9px] bg-rose-200/70 text-rose-800 px-1.5 py-0.2 rounded-full font-mono">142m Gap</span>
                        </div>
                        <p className="text-[10px] text-rose-700 leading-tight">
                          InSAR detects -82.6 mm/yr over breakline with no physical sensor coverage.
                        </p>
                      </div>

                      <div className="p-2 rounded-xl border border-amber-200 bg-amber-50/50 space-y-0.5">
                        <div className="flex items-center justify-between font-bold text-amber-900">
                          <span>Blind Spot #2 (Transition South)</span>
                          <span className="text-[9px] bg-amber-200/70 text-amber-800 px-1.5 py-0.2 rounded-full font-mono">115m Gap</span>
                        </div>
                        <p className="text-[10px] text-amber-700 leading-tight">
                          Near surface village boundary. High horizontal strain gradient requires ground sensor confirmation.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSimulateProposedNodes(!simulateProposedNodes)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{simulateProposedNodes ? 'Reset Strategic Simulation' : 'Simulate Strategic Additions (+2 Nodes)'}</span>
                    </button>
                  </div>

                </div>

              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW MODE 2: SCIENTIFIC TOP-VIEW HEATMAP & COHERENCE GRADIENT      */}
            {/* =================================================================== */}
            {insarViewMode === 'scientific_top_view' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4">
                  
                  {/* Top Bar with Zone & Title */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Satellite className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">
                          Scientific Top-View Stacking-InSAR &amp; Coherence Gradient ({heatmapZone.replace('_', ' ').toUpperCase()})
                        </h3>
                        <p className="text-xs text-slate-500">
                          High-resolution satellite interferometric radar processing with normalized phase coherence gradient.
                        </p>
                      </div>
                    </div>

                    {/* Zone Selector */}
                    <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      {(['zone_a', 'zone_b', 'zone_c'] as const).map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => setHeatmapZone(z)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            heatmapZone === z
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {z === 'zone_a' ? 'Zone A (Caving)' : z === 'zone_b' ? 'Zone B (Advance)' : 'Zone C (Goaf)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Top View Heatmap Image Container */}
                  <div className="w-full bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center justify-center overflow-hidden">
                    <img
                      src={
                        heatmapZone === 'zone_b'
                          ? '/insar_stacking_coherence_zone_b.png'
                          : heatmapZone === 'zone_c'
                          ? '/insar_stacking_coherence_zone_c.png'
                          : '/insar_stacking_coherence_zone_a.png'
                      }
                      alt={`InSAR Top View Heatmap ${heatmapZone}`}
                      className="max-h-[520px] w-auto object-contain rounded-xl select-none"
                    />
                  </div>

                  {/* Scientific Interpretation Deck */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-900 block">(a) Stacking-InSAR Deformation</span>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        Multi-temporal interferometric stacking across Sentinel-1 orbital cycles. Elliptical contours delineate continuous subterranean subsidence basin from 0 to 28.2 mm/yr.
                      </p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-900 block">(b) Coherence Phase Gradient</span>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        Normalized spatial coherence (0.0 to 0.96) pinpoints the annular tension ring cracking boundary versus central compressive core settling.
                      </p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-900 block">Ground Truth Node Deployment</span>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        Physical IoT strain nodes (Nodes SN-01 to SN-05) are deployed inside the peak gradient contour, achieving 98.4% calibration alignment.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW MODE 3: ANIMATED 3D GIS MODEL (STRATA & SATELLITE TWIN)        */}
            {/* =================================================================== */}
            {insarViewMode === 'gis_3d_model' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-fadeIn">
                
                {/* 3D WebGL Canvas (Left 8 cols) */}
                <div className="lg:col-span-8 flex flex-col justify-between space-y-2">
                  <Gis3DModelViewer
                    deployedNodes={DEPLOYED_NODES}
                    proposedNodes={PROPOSED_STRATEGIC_NODES}
                    simulateProposedNodes={simulateProposedNodes}
                    onToggleSimulation={() => setSimulateProposedNodes(!simulateProposedNodes)}
                    selectedNode={selectedPlannerNode}
                    onSelectNode={(node) => setSelectedPlannerNode(node)}
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 px-1 pt-1 gap-1">
                    <span>* Left-click drag to orbit in 3D. Right-click drag to pan. Scroll to zoom. Click any node pin in 3D space to inspect.</span>
                    <span className="font-mono text-[11px] text-cyan-600 font-bold">
                      Three.js GPU Accelerated Strata Engine
                    </span>
                  </div>
                </div>

                {/* Node Inspector & Coverage Gap Advisory (Right 4 cols: matched to 580px height) */}
                <div className="lg:col-span-4 h-[580px] flex flex-col justify-between space-y-3">
                  
                  {/* Node Detail Card */}
                  {selectedPlannerNode && (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-sm">
                              {selectedPlannerNode.name}
                            </h3>
                            {selectedPlannerNode.isProposed && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-cyan-100 text-cyan-800 border border-cyan-300">
                                Proposed
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                            {selectedPlannerNode.zoneName}
                          </p>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          selectedPlannerNode.isProposed
                            ? 'bg-cyan-100 text-cyan-800'
                            : selectedPlannerNode.status === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : selectedPlannerNode.status === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {selectedPlannerNode.isProposed ? 'SIMULATION' : selectedPlannerNode.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 font-sans block">InSAR Rate</span>
                          <span className="font-bold text-rose-600">{selectedPlannerNode.insarCorrelatedRate} mm/yr</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 font-sans block">Measured Sag</span>
                          <span className="font-bold text-slate-900">{selectedPlannerNode.displacement} mm</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 font-sans block">Coverage Radius</span>
                          <span className="font-bold text-indigo-600">{selectedPlannerNode.coverageRadiusMeters} meters</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                          <span className="text-[10px] text-slate-500 font-sans block">Strata Depth</span>
                          <span className="font-bold text-slate-900">{selectedPlannerNode.depth} m</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200 text-[11px] text-indigo-900 space-y-0.5">
                        <span className="font-bold block">Strategic Recommendation:</span>
                        <p className="leading-snug text-[10px]">
                          {selectedPlannerNode.isProposed
                            ? 'Simulated placement eliminates breakline blind spot. Telemetry directly constrains EKF state vector.'
                            : 'Sensor within Knothe draw angle. Telemetry fused with Sentinel-1 interferograms via Extended Kalman Filter.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Coverage Gap Identification Action Box */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        {simulateProposedNodes ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Blind Spots Mitigated</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>Identified Coverage Gaps</span>
                          </>
                        )}
                      </h4>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        simulateProposedNodes ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {simulateProposedNodes ? '0 Gaps (100%)' : '2 Gaps (25.8% Unmonitored)'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className={`p-2 rounded-xl border space-y-0.5 transition ${
                        simulateProposedNodes ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/50'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className={simulateProposedNodes ? 'text-emerald-900' : 'text-rose-900'}>
                            Blind Spot #1 (Zone A NE)
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                            simulateProposedNodes ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200/70 text-rose-800'
                          }`}>
                            {simulateProposedNodes ? 'RESOLVED (SN-11)' : '142m Gap'}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-tight ${simulateProposedNodes ? 'text-emerald-800' : 'text-rose-700'}`}>
                          {simulateProposedNodes
                            ? 'Covered by Proposed Node SN-11 (+80m radius). InSAR rate of -82.6 mm/yr now actively constrained.'
                            : 'InSAR detects -82.6 mm/yr over breakline with no physical sensor coverage.'}
                        </p>
                      </div>

                      <div className={`p-2 rounded-xl border space-y-0.5 transition ${
                        simulateProposedNodes ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/50'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className={simulateProposedNodes ? 'text-emerald-900' : 'text-amber-900'}>
                            Blind Spot #2 (Transition South)
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                            simulateProposedNodes ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200/70 text-amber-800'
                          }`}>
                            {simulateProposedNodes ? 'RESOLVED (SN-12)' : '115m Gap'}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-tight ${simulateProposedNodes ? 'text-emerald-800' : 'text-amber-700'}`}>
                          {simulateProposedNodes
                            ? 'Covered by Proposed Node SN-12 (+80m radius). Village flank horizontal shear stress actively tracked.'
                            : 'Near surface village boundary. High horizontal strain gradient requires ground sensor confirmation.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSimulateProposedNodes(!simulateProposedNodes)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                        simulateProposedNodes
                          ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400'
                          : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{simulateProposedNodes ? 'Reset Strategic Simulation' : 'Simulate Strategic Additions (+2 Nodes)'}</span>
                    </button>
                  </div>

                </div>

              </div>
            )}

            {/* Strategic Deployment Planning Audit Table */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mine-Wide Ground Sensor Deployment &amp; InSAR Alignment Audit</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {simulateProposedNodes ? '12 Nodes Monitored (10 Deployed + 2 Simulated)' : '10 Deployed Physical Hardware Nodes'}
                </span>
              </div>

              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Deployment Sector</th>
                      <th className="py-2.5 px-3.5">Assigned Zone</th>
                      <th className="py-2.5 px-3.5">InSAR LOS Rate</th>
                      <th className="py-2.5 px-3.5">Sensor Density</th>
                      <th className="py-2.5 px-3.5">Coverage Status</th>
                      <th className="py-2.5 px-3.5">Strategic Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">Panel 7 Active Longwall Face</td>
                      <td className="py-3 px-4 text-slate-600">Zone A (Caving)</td>
                      <td className="py-3 px-4 font-mono text-rose-600 font-bold">-118.4 mm/yr</td>
                      <td className="py-3 px-4 font-mono">5 Active Nodes</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          92% OPTIMAL
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">Maintain continuous high-frequency LoRa stream</td>
                    </tr>
                    
                    {/* Blind Spot #1 Row */}
                    <tr className={simulateProposedNodes ? 'bg-cyan-50/40 hover:bg-cyan-50/70 transition' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-4 text-slate-900 font-bold">
                        <div className="flex items-center gap-2">
                          <span>Panel 7 North-East Breakline</span>
                          {simulateProposedNodes && (
                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-[10px] font-bold font-mono border border-cyan-300">
                              SN-11 SIM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">Zone A (Blind Spot 1)</td>
                      <td className="py-3 px-4 font-mono text-rose-600 font-bold">-82.6 mm/yr</td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-900">
                        {simulateProposedNodes ? '1 Proposed Node (SN-11)' : '0 Nodes (142m gap)'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          simulateProposedNodes ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {simulateProposedNodes ? 'COVERED (SIMULATED)' : 'CRITICAL GAP'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {simulateProposedNodes
                          ? 'Node SN-11 allocated at (22.3608, 82.7505) with 185m multi-depth extensometer'
                          : 'Deploy Proposed Node SN-11 to close 142m breakline fringe gap'}
                      </td>
                    </tr>

                    {/* Blind Spot #2 Row */}
                    <tr className={simulateProposedNodes ? 'bg-cyan-50/40 hover:bg-cyan-50/70 transition' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-4 text-slate-900 font-bold">
                        <div className="flex items-center gap-2">
                          <span>Panel 6 South Transition Margin</span>
                          {simulateProposedNodes && (
                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-[10px] font-bold font-mono border border-cyan-300">
                              SN-12 SIM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">Zone B (Blind Spot 2)</td>
                      <td className="py-3 px-4 font-mono text-amber-600 font-bold">-46.5 mm/yr</td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-900">
                        {simulateProposedNodes ? '1 Proposed Node (SN-12)' : '0 Nodes (115m gap)'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          simulateProposedNodes ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {simulateProposedNodes ? 'COVERED (SIMULATED)' : 'CRITICAL GAP'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {simulateProposedNodes
                          ? 'Node SN-12 allocated at (22.3598, 82.7525) with 210m MEMS tiltmeter'
                          : 'Deploy Proposed Node SN-12 to monitor village boundary shear stress'}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">Panel 6 Transition Advance</td>
                      <td className="py-3 px-4 text-slate-600">Zone B (Advance)</td>
                      <td className="py-3 px-4 font-mono text-amber-600 font-bold">-64.8 mm/yr</td>
                      <td className="py-3 px-4 font-mono">3 Active Nodes</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          78% MODERATE
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">Monitor differential flexure and village flank</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">Panel 4 Stabilized Goaf</td>
                      <td className="py-3 px-4 text-slate-600">Zone C (Goaf)</td>
                      <td className="py-3 px-4 font-mono text-emerald-600 font-bold">-12.1 mm/yr</td>
                      <td className="py-3 px-4 font-mono">2 Active Nodes</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          100% STABILIZED
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">Residual compaction tracking (DGMS compliant)</td>
                    </tr>
                  </tbody>
                </table>

                {/* Simulation Comparison Summary Row */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="font-bold">Audit Network Totals:</span>
                    <span>{simulateProposedNodes ? '12 Nodes (10 Hardware + 2 Simulated)' : '10 Hardware Nodes'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={simulateProposedNodes ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                      Coverage: <b>{simulateProposedNodes ? '96.8%' : '74.2%'}</b>
                    </span>
                    <span>•</span>
                    <span className={simulateProposedNodes ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                      Blind Spots: <b>{simulateProposedNodes ? '0 Gaps (100% Mitigated)' : '2 Gaps (25.8% Unmonitored)'}</b>
                    </span>
                    <span>•</span>
                    <span className="text-indigo-700 font-bold">
                      Tr(P): <b>{simulateProposedNodes ? '0.196 mm²' : '0.412 mm²'}</b>
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: AI TREND FORECASTING (LONG-TERM PREDICTIVE MODELING)             */}
        {/* ======================================================================= */}
        {activeTab === 'ai_trend_forecasting' && (
          <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn">
            
            {/* Header: Title + Long-Term Horizon Controls (Single sleek horizontal row, NO awkward wrapping) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                    AI LONG-TERM TREND FORECASTING (1 — 12 MONTHS)
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Physics-Informed Neural Network (PINN) + Bi-LSTM
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Long-term predictive modeling projecting subterranean strata subsidence flow ahead based on real-time node strain, InSAR time series, and longwall advance schedules.
                </p>
              </div>

              {/* Forecast Horizon Switcher: ALL 5 buttons comfortably fit on a single sleek line */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none max-w-full">
                {(['m0', 'm1', 'm3', 'm6', 'm12'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setForecastHorizon(h)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      forecastHorizon === h
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {h === 'm0' ? 'Current M0' : h === 'm1' ? '+1 Month' : h === 'm3' ? '+3 Months' : h === 'm6' ? '+6 Months' : '+12 Months'}
                  </button>
                ))}
              </div>
            </div>

            {/* Key Long-Term Forecast Metrics Matrix (6 Detailed Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Face Advance</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">+{currentHorizonData.advanceMeters} m</span>
                <span className="block text-[11px] text-slate-500">2.5 m/day rate</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">Projected Sag</span>
                <span className="text-xl sm:text-2xl font-black text-amber-900 font-mono">{currentHorizonData.maxSagMm} mm</span>
                <span className="block text-[11px] text-amber-700">Central trough datum</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peak Strain ε_x</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">+{currentHorizonData.maxStrainMmPerM} mm/m</span>
                <span className={`block text-[11px] font-semibold ${
                  currentHorizonData.maxStrainMmPerM > 2.0 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {currentHorizonData.maxStrainMmPerM > 2.0 ? 'Exceeds Crack Limit' : 'Within Elastic Bound'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Surface Slope (Tilt)</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{currentHorizonData.maxSlopeMmPerM} mm/m</span>
                <span className="block text-[11px] text-slate-500">DGMS Cat II: &lt;10 mm/m</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trough Volume</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{(currentHorizonData.bowlVolumeM3 / 1000).toFixed(0)}k m³</span>
                <span className="block text-[11px] text-slate-500">Cumulative extraction bowl</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Breach Risk P(F)</span>
                <span className={`text-xl sm:text-2xl font-black font-mono ${
                  currentHorizonData.breachRiskPct > 60 ? 'text-rose-600' : currentHorizonData.breachRiskPct > 30 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {currentHorizonData.breachRiskPct}%
                </span>
                <span className="block text-[11px] text-slate-500">AI Bayesian probability</span>
              </div>
            </div>

            {/* Strategic Predictive Visualizer Chart (12-Month Multi-Temporal Trajectory) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Multi-Temporal Subsidence Progression Profile (0 to 12 Months Projection)
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] flex-wrap">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-0.5 bg-emerald-500" /> Measured (IoT)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-0.5 bg-indigo-600 border-dashed" /> AI PINN Forecast
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-2 bg-indigo-100 border border-indigo-200" /> 95% Confidence Band
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                    <span className="w-3 h-0.5 bg-rose-500" /> Theoretical S_max (-2,240 mm)
                  </span>
                </div>
              </div>

              {/* SVG 12-Month Trajectory Curve with generous vertical breathing room and clean labels */}
              <div className="w-full overflow-hidden">
                <svg viewBox="0 0 800 270" className="w-full h-auto block select-none">
                  {/* Grid Lines */}
                  <line x1="50" y1="30" x2="770" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="75" x2="770" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="120" x2="770" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="165" x2="770" y2="165" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="210" x2="770" y2="210" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Vertical Horizon Lines */}
                  <line x1="120" y1="20" x2="120" y2="225" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="240" y1="20" x2="240" y2="225" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="420" y1="20" x2="420" y2="225" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="600" y1="20" x2="600" y2="225" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="750" y1="20" x2="750" y2="225" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />

                  {/* 95% Confidence Envelope Band */}
                  <path
                    d="M 120 40 C 180 50, 240 85, 330 115 C 420 145, 520 178, 600 195 C 680 210, 720 215, 750 218 L 750 198 C 720 195, 680 188, 600 175 C 520 155, 420 125, 330 95 C 240 68, 180 38, 120 32 Z"
                    fill="#e0e7ff"
                    fillOpacity="0.6"
                  />

                  {/* Knothe Asymptotic Limit S_max */}
                  <line x1="50" y1="210" x2="770" y2="210" stroke="#e11d48" strokeWidth="1.8" strokeDasharray="4,4" />
                  <text x="765" y="202" textAnchor="end" fill="#e11d48" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                    S_max Bound = -2,240 mm
                  </text>

                  {/* Historical Measured IoT Segment (0 to M0) */}
                  <path
                    d="M 50 35 L 75 36 L 95 38 L 120 40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />
                  <circle cx="120" cy="40" r="4.5" fill="#10b981" />
                  <text x="120" y="26" textAnchor="middle" fill="#047857" fontSize="8.5" fontWeight="bold">
                    Now (-42.6mm)
                  </text>

                  {/* Predicted PINN-LSTM Curve (M0 to M12) */}
                  <path
                    d="M 120 40 C 180 46, 240 76, 330 108 C 420 138, 520 168, 600 185 C 680 200, 720 208, 750 210"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.8"
                    strokeDasharray="5,3"
                  />

                  {/* Horizon Key Points with Halos to avoid collisions */}
                  {/* +1 Month */}
                  <circle cx="240" cy="76" r="4" fill="#4f46e5" />
                  <text x="240" y="64" textAnchor="middle" fill="#4338ca" fontSize="8.5" fontWeight="bold">M1: -142mm</text>

                  {/* +3 Months */}
                  <circle cx="420" cy="138" r="5" fill="#ea580c" />
                  <text x="420" y="126" textAnchor="middle" fill="#c2410c" fontSize="8.5" fontWeight="bold">M3: -480mm (Inflection)</text>

                  {/* +6 Months */}
                  <circle cx="600" cy="185" r="4" fill="#4f46e5" />
                  <text x="600" y="172" textAnchor="middle" fill="#4338ca" fontSize="8.5" fontWeight="bold">M6: -1,240mm</text>

                  {/* +12 Months */}
                  <circle cx="750" cy="210" r="4" fill="#4f46e5" />
                  <text x="750" y="195" textAnchor="middle" fill="#4338ca" fontSize="8.5" fontWeight="bold">M12: -2,180mm</text>

                  {/* Y-Axis Labels */}
                  <text x="42" y="34" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">0 mm</text>
                  <text x="42" y="79" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-500 mm</text>
                  <text x="42" y="124" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-1000 mm</text>
                  <text x="42" y="169" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-1500 mm</text>
                  <text x="42" y="214" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-2240 mm</text>

                  {/* X-Axis Labels */}
                  <text x="50" y="246" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">Past</text>
                  <text x="120" y="246" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">Today</text>
                  <text x="240" y="246" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">+1 Mo</text>
                  <text x="420" y="246" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">+3 Mo</text>
                  <text x="600" y="246" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">+6 Mo</text>
                  <text x="750" y="246" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">+12 Mo</text>
                </svg>
              </div>

              {/* Selected Horizon Narrative Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">
                    {currentHorizonData.label} Strategic Assessment:
                  </span>
                  <span>{currentHorizonData.summaryNarrative}</span>
                </div>
              </div>
            </div>

            {/* Surface Infrastructure Long-Term Risk Matrix */}
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>Surface Infrastructure Strategic Impact &amp; Mitigation Timeline</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Asset 1: Railway Spur */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">Bilaspur-Korba Railway</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      currentHorizonData.infrastructureStatus.railway.status === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800'
                        : currentHorizonData.infrastructureStatus.railway.status === 'MONITOR'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {currentHorizonData.infrastructureStatus.railway.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono space-y-1 text-slate-600">
                    <div>Tilt Gradient: <b className="text-slate-900">{currentHorizonData.infrastructureStatus.railway.tiltMmPerM} mm/m</b></div>
                    <div>Safe Threshold: <b className="text-slate-500">&lt; 3.0 mm/m</b></div>
                    <div>Threshold ETA: <b className="text-indigo-600">{currentHorizonData.infrastructureStatus.railway.etaMonths} months</b></div>
                  </div>
                  <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    Mitigation: Ballast tamping &amp; hydraulic rail jacking scheduled before Month 4.
                  </div>
                </div>

                {/* Asset 2: Feeder Canal */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">Hasdeo Feeder Canal</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      currentHorizonData.infrastructureStatus.canal.status === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800'
                        : currentHorizonData.infrastructureStatus.canal.status === 'MONITOR'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {currentHorizonData.infrastructureStatus.canal.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono space-y-1 text-slate-600">
                    <div>Projected Sag: <b className="text-slate-900">{currentHorizonData.infrastructureStatus.canal.sagMm} mm</b></div>
                    <div>Safe Capacity: <b className="text-slate-500">-50 mm</b></div>
                    <div>Threshold ETA: <b className="text-indigo-600">{currentHorizonData.infrastructureStatus.canal.etaMonths} months</b></div>
                  </div>
                  <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    Mitigation: Concrete canal bed joint flexible sealing + diversion pump installation.
                  </div>
                </div>

                {/* Asset 3: Peripheral Village */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">Dhelwadih Village</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      currentHorizonData.infrastructureStatus.village.status === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800'
                        : currentHorizonData.infrastructureStatus.village.status === 'MONITOR'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {currentHorizonData.infrastructureStatus.village.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono space-y-1 text-slate-600">
                    <div>Tensile Strain: <b className="text-slate-900">{currentHorizonData.infrastructureStatus.village.strainMmPerM} mm/m</b></div>
                    <div>DGMS Limit: <b className="text-slate-500">2.0 mm/m</b></div>
                    <div>Threshold ETA: <b className="text-indigo-600">{currentHorizonData.infrastructureStatus.village.etaMonths} months</b></div>
                  </div>
                  <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    Mitigation: Excavate perimeter stress relief trenches along boundary by Month 2.
                  </div>
                </div>

                {/* Asset 4: Main Ventilation Shaft #2 */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">Ventilation Shaft #2</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                      SAFE (PILLAR)
                    </span>
                  </div>
                  <div className="text-xs font-mono space-y-1 text-slate-600">
                    <div>Pillar Sag: <b className="text-slate-900">{currentHorizonData.infrastructureStatus.ventShaft.displacementMm} mm</b></div>
                    <div>Safety Pillar: <b className="text-emerald-700">100% UNTOUCHED</b></div>
                    <div>Integrity: <b className="text-emerald-600">DGMS Standard</b></div>
                  </div>
                  <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    Mitigation: None required. Solid safety shaft pillar guarantees permanent shaft stability.
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: DATA PROCESSING FEED (EXTENDED KALMAN FILTER FUSION)              */}
        {/* ======================================================================= */}
        {activeTab === 'data_processing_feed' && (
          <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn">
            
            {/* Header: Title + Dynamic EKF Weight Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Cpu className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                    DATA PROCESSING FEED &amp; EXTENDED KALMAN FILTER (EKF) FUSION
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${currentEkfProfile.badgeColor}`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                    {currentEkfProfile.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {currentEkfProfile.description}
                </p>
              </div>

              {/* Dynamic Filter Tuning Preset Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setKalmanFilterMode('standard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    kalmanFilterMode === 'standard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Standard Balanced EKF
                </button>
                <button
                  type="button"
                  onClick={() => setKalmanFilterMode('insar_heavy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    kalmanFilterMode === 'insar_heavy'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-700 hover:text-purple-950 hover:bg-purple-100/60'
                  }`}
                >
                  High InSAR Weight
                </button>
                <button
                  type="button"
                  onClick={() => setKalmanFilterMode('iot_heavy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    kalmanFilterMode === 'iot_heavy'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
                  }`}
                >
                  High IoT Mesh Weight
                </button>
              </div>
            </div>

            {/* DYNAMIC Top Filter Performance Metrics (Updates based on selected weight!) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 transition-all">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Optimal Kalman Gain K</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{currentEkfProfile.kalmanGain}</span>
                <span className="block text-[11px] text-slate-500">{currentEkfProfile.gainDetail}</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1 transition-all">
                <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Innovation Residual ỹ</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">{currentEkfProfile.residual}</span>
                <span className="block text-[11px] text-emerald-700">{currentEkfProfile.residualDetail}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 transition-all">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Variance Suppression</span>
                <span className="text-xl sm:text-2xl font-black text-indigo-600 font-mono">{currentEkfProfile.varianceSuppression}</span>
                <span className="block text-[11px] text-slate-500">{currentEkfProfile.varianceDetail}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 transition-all">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fusion Latency</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{currentEkfProfile.latency}</span>
                <span className="block text-[11px] text-slate-500">{currentEkfProfile.latencyDetail}</span>
              </div>
            </div>

            {/* Tri-Signal Decomposition SVG Plot: Dynamically adjusts curve according to selected weight! */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Tri-Signal Decomposition: Raw InSAR vs. Raw LoRa Mesh vs. EKF Fused State Estimate
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] flex-wrap">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Raw InSAR (Noise σ=4.2mm)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Raw LoRa Mesh (Jitter σ=0.8mm)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                    <span className="w-3.5 h-1.5 bg-emerald-600 rounded-sm" /> EKF Fused Estimate x̂ ({currentEkfProfile.label})
                  </span>
                </div>
              </div>

              {/* Dynamic Signal Waveform Canvas */}
              <div className="w-full overflow-hidden">
                <svg viewBox="0 0 800 240" className="w-full h-auto block select-none">
                  {/* Grid Lines */}
                  <line x1="50" y1="30" x2="770" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="80" x2="770" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="130" x2="770" y2="130" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="180" x2="770" y2="180" stroke="#f1f5f9" strokeWidth="1" />

                  {/* 1. Raw InSAR Observation Points (Sparse, with atmospheric scatter) */}
                  <g>
                    {[
                      { x: 90, y: 52 },
                      { x: 190, y: 76 },
                      { x: 290, y: 92 },
                      { x: 390, y: 138 },
                      { x: 490, y: 148 },
                      { x: 590, y: 172 },
                      { x: 690, y: 188 }
                    ].map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="5" fill="#a855f7" stroke="#ffffff" strokeWidth="1.5" />
                        <line x1={pt.x} y1={pt.y - 12} x2={pt.x} y2={pt.y + 12} stroke="#a855f7" strokeWidth="1.2" strokeDasharray="2,2" />
                      </g>
                    ))}
                  </g>

                  {/* 2. Raw LoRa Mesh Telemetry (Continuous noisy zig-zag with thermal jitter) */}
                  <path
                    d="M 50 48 L 70 42 L 90 54 L 110 50 L 130 58 L 150 56 L 170 66 L 190 72 L 210 68 L 230 78 L 250 82 L 270 86 L 290 94 L 310 98 L 330 106 L 350 114 L 370 120 L 390 134 L 410 130 L 430 142 L 450 140 L 470 148 L 490 152 L 510 158 L 530 162 L 550 168 L 570 166 L 590 174 L 610 176 L 630 182 L 650 180 L 670 188 L 690 190 L 710 196 L 730 198 L 750 202 L 770 204"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.4"
                    strokeOpacity="0.75"
                  />

                  {/* 3. DYNAMIC EKF Fused Optimal State Trajectory */}
                  <path
                    d={currentEkfProfile.curvePath}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="3.4"
                    className="transition-all duration-500 ease-out"
                  />

                  {/* Real-time sync tracker dot */}
                  <circle
                    cx={currentEkfProfile.syncDot.x}
                    cy={currentEkfProfile.syncDot.y}
                    r="5.5"
                    fill="#059669"
                    className="animate-pulse"
                  />

                  {/* Y-Axis Labels */}
                  <text x="42" y="34" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-20 mm</text>
                  <text x="42" y="84" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-30 mm</text>
                  <text x="42" y="134" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-40 mm</text>
                  <text x="42" y="184" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-50 mm</text>

                  {/* X-Axis Epoch Labels */}
                  <text x="90" y="215" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Pass 78</text>
                  <text x="190" y="215" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Pass 79</text>
                  <text x="290" y="215" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Pass 80</text>
                  <text x="390" y="215" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Pass 81</text>
                  <text x="490" y="215" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Pass 82</text>
                  <text x="590" y="215" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Pass 83</text>
                  <text x="690" y="215" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="bold">Pass 84 (Latest)</text>
                </svg>
              </div>

              {/* Filter Convergence Verification Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Normalized Innovation Squared (NIS) Test: <b>{currentEkfProfile.nisTest}</b></span>
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  Condition Number κ(P) = {currentEkfProfile.conditionNum} • Status: <b className="text-slate-800">{currentEkfProfile.nisStatus}</b>
                </div>
              </div>
            </div>

            {/* DYNAMIC EKF Mathematical State & Live Terminal Feed Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* EKF Formulation & Covariance Matrix (Left 5 cols) */}
              <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>EKF Formulation &amp; Covariance States</span>
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold font-mono">
                    Mode: {kalmanFilterMode.toUpperCase()}
                  </span>
                </h4>

                <div className="space-y-3 text-xs font-mono flex-1 flex flex-col justify-between">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                    <span className="block text-[10px] font-bold text-slate-500 font-sans uppercase">State Vector x̂_k = [s_k, v_k]^T:</span>
                    <div className="text-slate-900 font-bold">
                      {currentEkfProfile.stateVector}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                    <span className="block text-[10px] font-bold text-slate-500 font-sans uppercase">Error Covariance Matrix P_k|k:</span>
                    <div className="text-indigo-900 font-bold">
                      P = [ {currentEkfProfile.covarianceP[0][0]}&nbsp;&nbsp;{currentEkfProfile.covarianceP[0][1]} ]<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;[ {currentEkfProfile.covarianceP[1][0]}&nbsp;&nbsp;{currentEkfProfile.covarianceP[1][1]} ]
                    </div>
                    <span className="block text-[10px] text-emerald-700 font-sans">
                      Trace Tr(P) = {currentEkfProfile.traceP} ({currentEkfProfile.varianceSuppression} suppression)
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                    <span className="block text-[10px] font-bold text-slate-500 font-sans uppercase">Multi-Rate Measurement Weights:</span>
                    <div className="text-slate-700 text-[11px] font-sans space-y-0.5">
                      <div>InSAR Noise Covariance R_insar = <b>{currentEkfProfile.rInsar}</b></div>
                      <div>LoRa Mesh Noise R_mesh = <b>{currentEkfProfile.rMesh}</b></div>
                      <div>Process Dynamic Noise Q = <b>{currentEkfProfile.qProcess}</b></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DYNAMIC Live Multi-Rate Fusion Processing Stream (Right 7 cols) */}
              <div className="lg:col-span-7 bg-slate-950 rounded-2xl p-5 shadow-xs text-slate-200 font-mono text-xs flex flex-col justify-between h-full">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-100 font-sans">
                      Live Telemetry Processing Stream
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Mode: {currentEkfProfile.label}</span>
                </div>

                <div className="space-y-2 text-[11px] leading-relaxed flex-1 overflow-y-auto scrollbar-none py-3">
                  {currentEkfProfile.logs.map((logLine, idx) => (
                    <div key={idx} className={idx % 2 === 0 ? 'text-slate-300' : 'text-emerald-400'}>
                      <span className="text-indigo-400">[{currentTime || '12:15:20'}.{idx * 15 + 10}]</span> {logLine}
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-sans mt-auto">
                  <span>Extended Kalman Filter status: {currentEkfProfile.nisStatus}</span>
                  <span className="font-mono text-emerald-400">Zero packet loss (100.0%)</span>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

    </div>
  )
}
