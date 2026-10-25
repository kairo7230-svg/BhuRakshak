import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Compass,
  Cpu,
  Eye,
  Layers,
  LogOut,
  MapPin,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Satellite,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Sparkles,
  Thermometer,
  TrendingDown,
  X,
  Zap,
  HardHat,
  Filter,
  Maximize2,
  Scale
} from 'lucide-react'
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

export interface TelemetryNode {
  id: string
  name: string
  zoneId: 'zone_a' | 'zone_b' | 'zone_c'
  zoneName: string
  lat: number
  lon: number
  displacement: number // mm
  strain: number // microstrain
  tilt: number // degrees
  temperature: number // deg C
  vibration: number // mm/s PPV
  battery: number // %
  signalDbm: number
  status: 'normal' | 'warning' | 'critical'
  depth: number // m
  color: string
}

// 16 Nodes deployed across Singhali Mines
const ALL_LEASE_NODES: TelemetryNode[] = [
  // ZONE A NODES (Panel 7 Longwall Caving)
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
    temperature: 28.8,
    vibration: 1.42,
    battery: 94,
    signalDbm: -72,
    status: 'normal',
    depth: 185,
    color: '#7e22ce'
  },
  {
    id: 'NODE-SN-02',
    name: 'Node SN-02',
    zoneId: 'zone_a',
    zoneName: 'Zone A: Panel 7 (Caving Face)',
    lat: 22.3602,
    lon: 82.7508,
    displacement: -36.2,
    strain: 480,
    tilt: 0.24,
    temperature: 29.1,
    vibration: 1.85,
    battery: 91,
    signalDbm: -76,
    status: 'normal',
    depth: 185,
    color: '#7e22ce'
  },
  {
    id: 'NODE-SN-03',
    name: 'Node SN-03',
    zoneId: 'zone_a',
    zoneName: 'Zone A: Panel 7 (Caving Face)',
    lat: 22.3582,
    lon: 82.7495,
    displacement: -18.4,
    strain: 160,
    tilt: 0.08,
    temperature: 27.9,
    vibration: 0.65,
    battery: 97,
    signalDbm: -68,
    status: 'normal',
    depth: 185,
    color: '#7e22ce'
  },
  {
    id: 'NODE-SN-07',
    name: 'Node SN-07',
    zoneId: 'zone_a',
    zoneName: 'Zone A: Panel 7 (Caving Face)',
    lat: 22.3596,
    lon: 82.7514,
    displacement: -38.9,
    strain: 390,
    tilt: 0.19,
    temperature: 29.0,
    vibration: 1.68,
    battery: 92,
    signalDbm: -73,
    status: 'normal',
    depth: 185,
    color: '#f97316'
  },
  {
    id: 'NODE-SN-08',
    name: 'Node SN-08',
    zoneId: 'zone_a',
    zoneName: 'Zone A: Panel 7 (Caving Face)',
    lat: 22.3589,
    lon: 82.7490,
    displacement: -31.5,
    strain: 310,
    tilt: 0.15,
    temperature: 28.6,
    vibration: 1.15,
    battery: 96,
    signalDbm: -70,
    status: 'normal',
    depth: 185,
    color: '#f97316'
  },

  // ZONE B NODES (Panel 6 Transition Advance)
  {
    id: 'NODE-SN-04',
    name: 'Node SN-04',
    zoneId: 'zone_b',
    zoneName: 'Zone B: Panel 6 (Transition Advance)',
    lat: 22.3611,
    lon: 82.7516,
    displacement: -24.8,
    strain: 290,
    tilt: 0.12,
    temperature: 28.2,
    vibration: 0.95,
    battery: 89,
    signalDbm: -80,
    status: 'normal',
    depth: 210,
    color: '#ea580c'
  },
  {
    id: 'NODE-SN-05',
    name: 'Node SN-05',
    zoneId: 'zone_b',
    zoneName: 'Zone B: Panel 6 (Transition Advance)',
    lat: 22.3605,
    lon: 82.7511,
    displacement: -21.0,
    strain: 240,
    tilt: 0.11,
    temperature: 28.0,
    vibration: 0.82,
    battery: 95,
    signalDbm: -74,
    status: 'normal',
    depth: 210,
    color: '#ea580c'
  },
  {
    id: 'NODE-SN-09',
    name: 'Node SN-09',
    zoneId: 'zone_b',
    zoneName: 'Zone B: Panel 6 (Transition Advance)',
    lat: 22.3618,
    lon: 82.7525,
    displacement: -14.2,
    strain: 180,
    tilt: 0.09,
    temperature: 27.8,
    vibration: 0.52,
    battery: 93,
    signalDbm: -77,
    status: 'normal',
    depth: 210,
    color: '#eab308'
  },

  // ZONE C NODES (Panel 4 Sand Stowed Goaf)
  {
    id: 'NODE-SN-06',
    name: 'Node SN-06',
    zoneId: 'zone_c',
    zoneName: 'Zone C: Panel 4 (Stabilized Goaf)',
    lat: 22.3567,
    lon: 82.7469,
    displacement: -6.4,
    strain: 75,
    tilt: 0.03,
    temperature: 27.4,
    vibration: 0.28,
    battery: 98,
    signalDbm: -64,
    status: 'normal',
    depth: 240,
    color: '#ca8a04'
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
    temperature: 27.2,
    vibration: 0.22,
    battery: 99,
    signalDbm: -62,
    status: 'normal',
    depth: 240,
    color: '#ca8a04'
  }
]

export interface NodeTelemetryHistory {
  displacement: number[]
  strain: number[]
  tilt: number[]
  temperature: number[]
  vibration: number[]
}

function buildInitialHistory(n: TelemetryNode): NodeTelemetryHistory {
  const d = n.displacement
  const s = n.strain
  const t = n.tilt
  const temp = n.temperature
  const v = n.vibration
  return {
    displacement: [
      parseFloat((d + 0.35).toFixed(2)),
      parseFloat((d + 0.20).toFixed(2)),
      parseFloat((d + 0.15).toFixed(2)),
      parseFloat((d - 0.10).toFixed(2)),
      parseFloat((d + 0.05).toFixed(2)),
      parseFloat((d - 0.15).toFixed(2)),
      parseFloat(d.toFixed(2))
    ],
    strain: [
      Math.round(s - 12),
      Math.round(s - 5),
      Math.round(s + 8),
      Math.round(s + 3),
      Math.round(s - 7),
      Math.round(s + 10),
      s
    ],
    tilt: [
      parseFloat((t - 0.015).toFixed(3)),
      parseFloat((t - 0.008).toFixed(3)),
      parseFloat((t + 0.005).toFixed(3)),
      parseFloat((t - 0.002).toFixed(3)),
      parseFloat((t + 0.006).toFixed(3)),
      parseFloat((t - 0.004).toFixed(3)),
      t
    ],
    temperature: [
      parseFloat((temp - 0.2).toFixed(1)),
      parseFloat((temp - 0.1).toFixed(1)),
      parseFloat((temp + 0.1).toFixed(1)),
      parseFloat((temp + 0.0).toFixed(1)),
      parseFloat((temp - 0.1).toFixed(1)),
      parseFloat((temp + 0.2).toFixed(1)),
      temp
    ],
    vibration: [
      parseFloat((v - 0.15).toFixed(2)),
      parseFloat((v + 0.10).toFixed(2)),
      parseFloat((v - 0.05).toFixed(2)),
      parseFloat((v + 0.08).toFixed(2)),
      parseFloat((v - 0.03).toFixed(2)),
      parseFloat((v + 0.12).toFixed(2)),
      v
    ]
  }
}

function SparklineMetricCard({
  label,
  value,
  color,
  points,
  timeLabels
}: {
  label: string
  value: string
  color: string
  points: number[]
  timeLabels: string[]
}) {
  const width = 320
  const height = 32
  const padX = 8
  const padY = 6

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = padX + (i / Math.max(1, points.length - 1)) * (width - 2 * padX)
    const norm = (p - min) / range
    const y = height - padY - norm * (height - 2 * padY)
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
  })

  const pathD = coords.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    const prev = arr[i - 1]
    const cx1 = prev.x + (pt.x - prev.x) / 2
    const cy1 = prev.y
    const cx2 = prev.x + (pt.x - prev.x) / 2
    const cy2 = pt.y
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`
  }, '')

  return (
    <div className="py-0.5">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-black text-xs" style={{ color }}>
          {value}
        </span>
      </div>

      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-7 overflow-visible block">
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="2.5"
              fill={color}
            />
          ))}
        </svg>

        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-0.5 px-0.5">
          {timeLabels.map((time, idx) => (
            <span key={idx}>{time}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

const ZONE_FORECAST_DATA = {
  zone_a: {
    name: 'Zone A: Panel 7 (Caving Face)',
    seam: 'SECL Singhali Colliery G-III Seam',
    depth: '185 m',
    angleDraw: '32.5°',
    influenceRadius: '53.4 m',
    sMax: '-2,240 mm',
    now: {
      disp: -42.6,
      delta: 0,
      strain: 0.24,
      tilt: 0.18,
      delam: 11.2,
      vib: 1.42,
      status: 'CRITICAL TENSILE SHEAR',
      velocity: '6.3 mm/day',
      dipPx: 10,
      strainFactor: 1.0,
      hazards: [
        { title: 'Farmland damage', desc: 'Surface tension fissures', color: '#b91c1c' },
        { title: 'Building damage', desc: 'Differential foundation shear', color: '#c2410c' },
        { title: 'Ground waterlogging', desc: 'Central basin depression', color: '#0284c7' }
      ]
    },
    '24h': {
      disp: -48.9,
      delta: 6.3,
      strain: 0.28,
      tilt: 0.22,
      delam: 12.8,
      vib: 1.65,
      status: 'ACTIVE DRAW PROPAGATION',
      velocity: '7.8 mm/day',
      dipPx: 14,
      strainFactor: 1.15,
      hazards: [
        { title: 'Farmland damage', desc: 'Expanding surface tension fissures', color: '#b91c1c' },
        { title: 'Building damage', desc: 'Foundation tilt gradient +0.04°', color: '#c2410c' },
        { title: 'Ground waterlogging', desc: 'Basin ponding depth +6.3mm', color: '#0284c7' }
      ]
    },
    '48h': {
      disp: -57.4,
      delta: 14.8,
      strain: 0.34,
      tilt: 0.27,
      delam: 14.6,
      vib: 1.88,
      status: 'MAXIMUM SUBSIDENCE ACCELERATION',
      velocity: '9.2 mm/day',
      dipPx: 18,
      strainFactor: 1.35,
      hazards: [
        { title: 'Farmland damage', desc: 'Severe tension crack breakthrough (>15mm width)', color: '#b91c1c' },
        { title: 'Building damage', desc: 'Evacuate peripheral village structures', color: '#c2410c' },
        { title: 'Ground waterlogging', desc: 'High run-off convergence in basin trough', color: '#0284c7' }
      ]
    },
    '7d': {
      disp: -78.2,
      delta: 35.6,
      strain: 0.45,
      tilt: 0.36,
      delam: 18.5,
      vib: 1.95,
      status: 'POST-MINING STEADY CAVING',
      velocity: '4.1 mm/day',
      dipPx: 24,
      strainFactor: 1.6,
      hazards: [
        { title: 'Farmland damage', desc: 'Consolidated subsidence depression', color: '#b91c1c' },
        { title: 'Building damage', desc: 'Permanent tilt stabilization', color: '#c2410c' },
        { title: 'Ground waterlogging', desc: 'Permanent wetland formation without regrading', color: '#0284c7' }
      ]
    }
  },
  zone_b: {
    name: 'Zone B: Panel 6 (Transition Advance)',
    seam: 'SECL Singhali Colliery G-III Seam',
    depth: '210 m',
    angleDraw: '28.0°',
    influenceRadius: '44.8 m',
    sMax: '-2,030 mm',
    now: {
      disp: -24.8,
      delta: 0,
      strain: 0.14,
      tilt: 0.12,
      delam: 6.4,
      vib: 0.95,
      status: 'MODERATE ELASTIC FLEXURE',
      velocity: '3.4 mm/day',
      dipPx: 6,
      strainFactor: 0.65,
      hazards: [
        { title: 'Topsoil strain', desc: 'Micro-fissures within safe limit', color: '#b91c1c' },
        { title: 'Drainage deflection', desc: 'Gentle gradient slope alteration', color: '#c2410c' },
        { title: 'Bed separation', desc: 'Intermediate sandstone flexure', color: '#0284c7' }
      ]
    },
    '24h': {
      disp: -28.2,
      delta: 3.4,
      strain: 0.16,
      tilt: 0.14,
      delam: 7.2,
      vib: 1.05,
      status: 'STEADY ELASTIC DEFORMATION',
      velocity: '4.1 mm/day',
      dipPx: 8,
      strainFactor: 0.75,
      hazards: [
        { title: 'Topsoil strain', desc: 'Superficial hair cracks', color: '#b91c1c' },
        { title: 'Drainage deflection', desc: 'Runoff channel deviation', color: '#c2410c' },
        { title: 'Bed separation', desc: 'Delamination tracking nominal', color: '#0284c7' }
      ]
    },
    '48h': {
      disp: -32.6,
      delta: 7.8,
      strain: 0.19,
      tilt: 0.17,
      delam: 8.1,
      vib: 1.15,
      status: 'CONTINUOUS COMPACTION',
      velocity: '4.8 mm/day',
      dipPx: 10,
      strainFactor: 0.88,
      hazards: [
        { title: 'Topsoil strain', desc: 'Elastic curvature expansion', color: '#b91c1c' },
        { title: 'Drainage deflection', desc: 'Surface grading maintenance needed', color: '#c2410c' },
        { title: 'Bed separation', desc: 'Controlled layer parting', color: '#0284c7' }
      ]
    },
    '7d': {
      disp: -44.0,
      delta: 19.2,
      strain: 0.25,
      tilt: 0.22,
      delam: 10.4,
      vib: 1.25,
      status: 'ASYMPTOTIC EQUILIBRIUM',
      velocity: '2.5 mm/day',
      dipPx: 13,
      strainFactor: 1.05,
      hazards: [
        { title: 'Topsoil strain', desc: 'No structural fracture risk', color: '#b91c1c' },
        { title: 'Drainage deflection', desc: 'Stabilized slope', color: '#c2410c' },
        { title: 'Bed separation', desc: 'Compacted overburden equilibrium', color: '#0284c7' }
      ]
    }
  },
  zone_c: {
    name: 'Zone C: Panel 4 (Stabilized Goaf)',
    seam: 'SECL Singhali Colliery G-III Seam',
    depth: '240 m',
    angleDraw: '22.0°',
    influenceRadius: '32.1 m',
    sMax: '-750 mm',
    now: {
      disp: -6.4,
      delta: 0,
      strain: 0.03,
      tilt: 0.03,
      delam: 1.8,
      vib: 0.28,
      status: 'STABILIZED COMPACTION (SAFE)',
      velocity: '0.4 mm/day',
      dipPx: 3,
      strainFactor: 0.25,
      hazards: [
        { title: 'Residual settling', desc: 'Sub-millimetric sand compaction', color: '#15803d' },
        { title: 'Foundation integrity', desc: 'Surface buildings 100% safe', color: '#15803d' },
        { title: 'Hydrostatic seal', desc: 'Zero water ponding or breach risk', color: '#0284c7' }
      ]
    },
    '24h': {
      disp: -6.8,
      delta: 0.4,
      strain: 0.03,
      tilt: 0.03,
      delam: 1.9,
      vib: 0.30,
      status: 'HYDRAULIC BACKFILL RESISTANCE',
      velocity: '0.4 mm/day',
      dipPx: 3,
      strainFactor: 0.28,
      hazards: [
        { title: 'Residual settling', desc: 'Negligible compaction', color: '#15803d' },
        { title: 'Foundation integrity', desc: 'No tilt or shear stress', color: '#15803d' },
        { title: 'Hydrostatic seal', desc: 'Ponding risk absent', color: '#0284c7' }
      ]
    },
    '48h': {
      disp: -7.2,
      delta: 0.8,
      strain: 0.04,
      tilt: 0.04,
      delam: 2.0,
      vib: 0.32,
      status: 'COMPLETE STOWED PACK STABILITY',
      velocity: '0.3 mm/day',
      dipPx: 4,
      strainFactor: 0.32,
      hazards: [
        { title: 'Residual settling', desc: 'Stabilized sand cushion', color: '#15803d' },
        { title: 'Foundation integrity', desc: 'Zero ground fissure detection', color: '#15803d' },
        { title: 'Hydrostatic seal', desc: 'Stable catchment area', color: '#0284c7' }
      ]
    },
    '7d': {
      disp: -8.1,
      delta: 1.7,
      strain: 0.05,
      tilt: 0.04,
      delam: 2.3,
      vib: 0.35,
      status: 'PERMANENT CONSOLIDATED GOAF',
      velocity: '0.1 mm/day',
      dipPx: 4,
      strainFactor: 0.36,
      hazards: [
        { title: 'Residual settling', desc: 'Full geotechnical equilibrium reached', color: '#15803d' },
        { title: 'Foundation integrity', desc: 'Permanent structural safety certified', color: '#15803d' },
        { title: 'Hydrostatic seal', desc: 'No remediation required', color: '#0284c7' }
      ]
    }
  }
}

function GeotechnicalCrossSectionView({
  zoneId,
  timeStep
}: {
  zoneId: 'zone_a' | 'zone_b' | 'zone_c'
  timeStep: 'now' | '24h' | '48h' | '7d'
}) {
  const zoneData = ZONE_FORECAST_DATA[zoneId]
  const currentData = zoneData[timeStep]
  const strainFactor = currentData.strainFactor

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 2D Cross Section Plots (Left 8-9 cols) */}
      <div className="lg:col-span-9 space-y-4">
        {/* Top Graph: Surface Horizontal Strain */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-2xs overflow-hidden">
          <svg viewBox="0 0 680 120" className="w-full h-auto block select-none">
            <rect x="0.5" y="0.5" width="679" height="119" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" rx="6" />
            <text x="340" y="14" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">
              Surface Horizontal Strain ε_x &amp; Geotechnical Regime Delineation
            </text>
            
            {/* Grid Lines */}
            <line x1="45" y1="28" x2="660" y2="28" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="45" y1="48" x2="660" y2="48" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3,3" />
            <line x1="45" y1="68" x2="660" y2="68" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="45" y1="88" x2="660" y2="88" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />

            <line x1="168" y1="20" x2="168" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="291" y1="20" x2="291" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="414" y1="20" x2="414" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="537" y1="20" x2="537" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />

            {/* Shaded Tension & Compression Areas */}
            <path d={`M 45 48 L 45 ${48 - strainFactor * 18} C 100 ${48 - strainFactor * 24}, 180 ${48 - strainFactor * 16}, 211 48 Z`} fill="#fed7aa" fillOpacity="0.85" />
            <path d={`M 494 48 C 525 ${48 - strainFactor * 16}, 605 ${48 - strainFactor * 24}, 660 ${48 - strainFactor * 18} L 660 48 Z`} fill="#fed7aa" fillOpacity="0.85" />
            <path d={`M 211 48 C 242 ${48 + strainFactor * 25}, 295 ${48 + strainFactor * 39}, 352.5 ${48 + strainFactor * 39} C 410 ${48 + strainFactor * 39}, 463 ${48 + strainFactor * 25}, 494 48 Z`} fill="#bfdbfe" fillOpacity="0.85" />

            {/* Strain curve line */}
            <path
              d={`M 45 ${48 - strainFactor * 18} C 100 ${48 - strainFactor * 24}, 180 ${48 - strainFactor * 16}, 211 48 C 242 ${48 + strainFactor * 25}, 295 ${48 + strainFactor * 39}, 352.5 ${48 + strainFactor * 39} C 410 ${48 + strainFactor * 39}, 463 ${48 + strainFactor * 25}, 494 48 C 525 ${48 - strainFactor * 16}, 605 ${48 - strainFactor * 24}, 660 ${48 - strainFactor * 18}`}
              fill="none"
              stroke="#0f172a"
              strokeWidth="2.2"
            />

            {/* Y-axis Ticks & Labels */}
            <text x="40" y="31" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">0.25</text>
            <text x="40" y="51" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">0.00</text>
            <text x="40" y="71" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-0.25</text>
            <text x="40" y="91" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-0.50</text>
            <text x="12" y="65" textAnchor="middle" transform="rotate(-90, 12, 65)" fill="#0f172a" fontSize="8" fontWeight="bold">
              Strain ε_x (mm/m)
            </text>

            {/* X-axis Ticks & Labels */}
            <text x="45" y="112" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">0</text>
            <text x="168" y="112" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">20</text>
            <text x="291" y="112" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">40</text>
            <text x="414" y="112" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">60</text>
            <text x="537" y="112" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">80</text>
            <text x="660" y="112" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">100</text>

            {/* Legend on Top Right */}
            <g transform="translate(485, 18)">
              <rect x="0" y="0" width="180" height="42" fill="#ffffff" fillOpacity="0.92" stroke="#e2e8f0" rx="3" />
              <line x1="8" y1="10" x2="24" y2="10" stroke="#0f172a" strokeWidth="2" />
              <text x="28" y="13" fill="#334155" fontSize="7.5" fontWeight="bold">Horizontal Strain ε_x</text>
              <rect x="8" y="18" width="16" height="8" fill="#fed7aa" />
              <text x="28" y="25" fill="#334155" fontSize="7.5">Tension Zone (Surface Cracking)</text>
              <rect x="8" y="29" width="16" height="8" fill="#bfdbfe" />
              <text x="28" y="36" fill="#334155" fontSize="7.5">Compression Zone (Basin Squeezing)</text>
            </g>
          </svg>
        </div>

        {/* Bottom Diagram: 2D Geotechnical Cross-Section */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-2xs overflow-hidden">
          <svg viewBox="0 0 680 340" className="w-full h-auto block select-none">
            <rect x="0.5" y="0.5" width="679" height="339" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" rx="6" />

            <text x="340" y="15" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">
              2D Geotechnical Cross-Section ({zoneData.seam})
            </text>

            {/* Strata Layers */}
            {/* Layer 1: Topsoil / Weathered Overburden (0 to -6m) */}
            <rect x="45" y="85" width="615" height="40" fill="#fed7aa" />
            
            {/* Layer 2: Coarse Sandstone (Main Roof, -6 to -19m) */}
            <rect x="45" y="125" width="615" height="80" fill="#e2e8f0" />
            <line x1="45" y1="145" x2="660" y2="145" stroke="#cbd5e1" strokeDasharray="4,4" />
            <line x1="45" y1="170" x2="660" y2="170" stroke="#cbd5e1" strokeDasharray="4,4" />
            <line x1="45" y1="190" x2="660" y2="190" stroke="#cbd5e1" strokeDasharray="4,4" />
            <text x="140" y="165" fill="#334155" fontSize="10" fontWeight="bold">Coarse Sandstone (Main Roof)</text>

            {/* Layer 3: Laminated Shale (Immediate Roof, -19 to -27m) */}
            <rect x="45" y="205" width="615" height="50" fill="#64748b" />
            <text x="140" y="235" fill="#f8fafc" fontSize="9.5" fontWeight="bold">Laminated Shale (Immediate Roof)</text>

            {/* Layer 4: Coal Pillars (Left: 0-32m, Right: 68-100m) */}
            <rect x="45" y="255" width="196.8" height="30" fill="#0f172a" />
            <text x="140" y="274" fill="#ffffff" fontSize="10" fontWeight="bold">Coal</text>

            <rect x="463.2" y="255" width="196.8" height="30" fill="#0f172a" />
            <text x="550" y="274" fill="#ffffff" fontSize="10" fontWeight="bold">Coal</text>

            {/* Layer 5: Massive Floor Rock / Sandstone below -32m */}
            <rect x="45" y="285" width="615" height="45" fill="#334155" />
            <line x1="45" y1="300" x2="660" y2="300" stroke="#475569" strokeDasharray="5,5" />
            <text x="352.5" y="312" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">Massive Floor Rock / Sandstone</text>

            {/* Layer 6: Caved Goaf Rubble (Extracted Panel 32m to 68m) */}
            <path d="M 241.8 285 L 241.8 260 Q 300 230, 352.5 225 Q 405 230, 463.2 260 L 463.2 285 Z" fill="#1e293b" />
            <g fill="#475569" fillOpacity="0.4">
              <ellipse cx="290" cy="270" rx="12" ry="6" />
              <ellipse cx="320" cy="255" rx="15" ry="7" />
              <ellipse cx="360" cy="245" rx="18" ry="8" />
              <ellipse cx="390" cy="260" rx="14" ry="7" />
              <ellipse cx="420" cy="272" rx="12" ry="6" />
            </g>
            <rect x="272" y="250" width="160" height="17" rx="3" fill="#0f172a" />
            <text x="352.5" y="262" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Caved Goaf Rubble</text>

            {/* Bed Separation & Roof Failure Lines */}
            <rect x="255" y="198" width="195" height="16" rx="3" fill="#0f172a" />
            <text x="352.5" y="209" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">Bed separation and roof failure</text>
            {[275, 295, 315, 335, 355, 375, 395, 415, 435].map((x) => (
              <line key={x} x1={x} y1="214" x2={x} y2="228" stroke="#0f172a" strokeWidth="1.5" />
            ))}

            {/* Angle of Draw Lines */}
            <line x1="241.8" y1="255" x2="131" y2="85" stroke="#1e293b" strokeWidth="2.2" strokeDasharray="5,4" />
            <line x1="463.2" y1="255" x2="574" y2="85" stroke="#1e293b" strokeWidth="2.2" strokeDasharray="5,4" />
            <text x="500" y="160" fill="#0f172a" fontSize="8.5" fontWeight="bold">
              Angle of Draw ({zoneData.angleDraw})
            </text>

            {/* Vertical Panel Extraction Boundaries */}
            <line x1="241.8" y1="25" x2="241.8" y2="330" stroke="#f97316" strokeWidth="1.2" strokeDasharray="3,3" />
            <line x1="463.2" y1="25" x2="463.2" y2="330" stroke="#f97316" strokeWidth="1.2" strokeDasharray="3,3" />

            {/* Surface Subsidence Trough */}
            <line x1="45" y1="85" x2="660" y2="85" stroke="#1e293b" strokeWidth="1.8" strokeDasharray="5,3" />
            <path
              d={`M 45 85 Q 180 85, 241.8 ${85 + currentData.dipPx * 0.4} Q 352.5 ${85 + currentData.dipPx}, 463.2 ${85 + currentData.dipPx * 0.4} Q 525 85, 660 85`}
              fill="none"
              stroke="#dc2626"
              strokeWidth="2.2"
            />
            <text x="352.5" y={`${80 + currentData.dipPx * 0.3}`} textAnchor="middle" fill="#dc2626" fontSize="10" fontWeight="black">
              Subsidence
            </text>

            {/* Surface Cracks (Tension Zone) */}
            {[145, 165, 185].map((x) => (
              <line key={x} x1={x} y1="80" x2={x} y2="92" stroke="#991b1b" strokeWidth="2" />
            ))}
            <text x="165" y="103" textAnchor="middle" fill="#b91c1c" fontSize="8.5" fontWeight="bold">Tension Zone</text>

            {[520, 540, 560].map((x) => (
              <line key={x} x1={x} y1="80" x2={x} y2="92" stroke="#991b1b" strokeWidth="2" />
            ))}
            <text x="540" y="103" textAnchor="middle" fill="#b91c1c" fontSize="8.5" fontWeight="bold">Tension Zone</text>
            <text x="352.5" y="102" textAnchor="middle" fill="#0284c7" fontSize="8.5" fontWeight="bold">Compression Zone</text>

            {/* Infrastructure 1: Mine Office / Village */}
            <polygon points="75,52 106,35 137,52" fill="#1e293b" />
            <rect x="75" y="52" width="62" height="33" fill="#475569" />
            <rect x="70" y="54" width="72" height="24" rx="2" fill="#0f172a" fillOpacity="0.75" />
            <text x="106" y="63" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">Mine Office / Village</text>
            <text x="106" y="71" textAnchor="middle" fill="#ffffff" fontSize="6.5">(Foundation Tilt)</text>
            <text x="106" y="82" textAnchor="middle" fill="#fca5a5" fontSize="6.5" fontWeight="bold">Zone of surface cracks</text>

            {/* Infrastructure 2: Pit Headgear & Fan */}
            <circle cx="600" cy="38" r="8" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
            <line x1="600" y1="38" x2="585" y2="85" stroke="#1e293b" strokeWidth="2.8" />
            <line x1="600" y1="38" x2="615" y2="85" stroke="#1e293b" strokeWidth="2.8" />
            <line x1="588" y1="68" x2="612" y2="68" stroke="#1e293b" strokeWidth="2" />
            <text x="600" y="24" textAnchor="middle" fill="#1e293b" fontSize="8" fontWeight="bold">Pit Headgear &amp; Fan</text>

            {/* Surface Node 01 & Borehole Probe */}
            <rect x="256" y={`${80 + currentData.dipPx * 0.4}`} width="10" height="10" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            <text x="261" y={`${74 + currentData.dipPx * 0.4}`} textAnchor="middle" fill="#b91c1c" fontSize="7.5" fontWeight="bold">Node 01</text>
            <text x="261" y={`${65 + currentData.dipPx * 0.4}`} textAnchor="middle" fill="#b91c1c" fontSize="7" fontWeight="black">Disp: {Math.abs(currentData.disp).toFixed(1)}mm</text>
            <line x1="261" y1={`${90 + currentData.dipPx * 0.4}`} x2="261" y2="125" stroke="#7c3aed" strokeWidth="2" />
            <circle cx="261" cy="125" r="3.5" fill="#7c3aed" />
            
            <g transform="translate(282, 114)">
              <rect x="0" y="0" width="105" height="23" rx="4" fill="#ffffff" stroke="#7c3aed" strokeWidth="1.5" />
              <text x="5" y="10" fill="#4338ca" fontSize="7.5" fontWeight="bold">3.5m Borehole Probe</text>
              <text x="5" y="19" fill="#6d28d9" fontSize="7.5" fontWeight="black">Delam: {currentData.delam} mm</text>
            </g>

            {/* Axes & Ticks */}
            <text x="40" y="28" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">10</text>
            <text x="40" y="88" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">0</text>
            <text x="40" y="165" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-10</text>
            <text x="40" y="235" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-20</text>
            <text x="40" y="285" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">-30</text>
            <text x="12" y="170" textAnchor="middle" transform="rotate(-90, 12, 170)" fill="#0f172a" fontSize="8" fontWeight="bold">
              Depth (Meters)
            </text>

            {/* X-axis Ticks & Labels */}
            <text x="45" y="334" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">0</text>
            <text x="168" y="334" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">20</text>
            <text x="291" y="334" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">40</text>
            <text x="414" y="334" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">60</text>
            <text x="537" y="334" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">80</text>
            <text x="660" y="334" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">100</text>
            <text x="352.5" y="336" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">
              Transverse Distance (Meters)
            </text>
          </svg>
        </div>
      </div>

      {/* Right Panels: Geotechnical Hazards & Sensor Telemetry Correlation (Left 3-4 cols) */}
      <div className="lg:col-span-3 space-y-4">
        {/* Geotechnical Hazards Panel */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Geotechnical Hazards</span>
          </h4>
          <div className="space-y-2 text-xs">
            {currentData.hazards.map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: h.color }} />
                <div>
                  <span className="font-bold block" style={{ color: h.color }}>
                    • {h.title}
                  </span>
                  <span className="text-[11px] text-slate-600 block pl-2 font-medium">
                    ({h.desc})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Telemetry Correlation Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sensor Telemetry Correlation</span>
          </h4>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
              <span className="font-bold block text-slate-900">Surface Node 01:</span>
              <span className="block text-[11px] text-slate-700">Disp: {Math.abs(currentData.disp).toFixed(2)} mm</span>
              <span className="block text-[11px] text-slate-700">Tilt: {currentData.tilt.toFixed(2)}°</span>
              <span className="block text-[11px] text-slate-700">Vib: {currentData.vib} mm/s</span>
            </div>

            <div className="p-2.5 bg-purple-50/60 border border-purple-200/80 rounded-xl space-y-0.5">
              <span className="font-bold block text-purple-950">3.5m Borehole Probe:</span>
              <span className="block text-[11px] text-purple-800 font-bold">Delamination: {currentData.delam.toFixed(2)} mm</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5 text-slate-600 text-[11px]">
              <div>Angle of Draw: <b className="text-slate-900">{zoneData.angleDraw}</b></div>
              <div>Influence Radius: <b className="text-slate-900">{zoneData.influenceRadius}</b></div>
              <div>Seam Depth: <b className="text-slate-900">{zoneData.depth}</b></div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Status:</span>
              <span className={`block text-[11px] font-black uppercase ${
                currentData.status.includes('CRITICAL') || currentData.status.includes('MAXIMUM')
                  ? 'text-rose-600'
                  : currentData.status.includes('MODERATE')
                  ? 'text-amber-600'
                  : 'text-emerald-700'
              }`}>
                {currentData.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  onLogout: () => void
  onSwitchDashboard?: (dashboard: 'operator' | 'planner') => void
  collieryName?: string
  hideHeader?: boolean
  isSimulatedAlert?: boolean
  onToggleSimulation?: () => void
}

export default function MineOperatorDashboard({
  onLogout,
  onSwitchDashboard,
  collieryName = 'Singhali Underground Colliery',
  hideHeader = false,
  isSimulatedAlert: propIsSimulatedAlert = false,
  onToggleSimulation
}: Props) {
  // Tabs: 'gis_mapping' | 'digital_twin' | 'live_sensor_feed' | 'ai_forecast' | 'alerts'
  const [activeTab, setActiveTab] = useState<'gis_mapping' | 'digital_twin' | 'live_sensor_feed' | 'ai_forecast' | 'alerts'>('gis_mapping')

  // Local fallback state if onToggleSimulation is not provided by parent
  const [localSimulatedAlert, setLocalSimulatedAlert] = useState<boolean>(false)
  const isSimulatedAlert = onToggleSimulation !== undefined ? propIsSimulatedAlert : localSimulatedAlert

  const handleToggleSimulation = () => {
    if (onToggleSimulation) {
      onToggleSimulation()
    } else {
      setLocalSimulatedAlert(prev => !prev)
    }
  }

  // Zone Switching State for GIS Heatmap & Dashboard
  const [activeZoneFilter, setActiveZoneFilter] = useState<'all' | 'zone_a' | 'zone_b' | 'zone_c'>('all')

  // AI Forecast State: Zone & Time Horizon
  const [forecastZone, setForecastZone] = useState<'zone_a' | 'zone_b' | 'zone_c'>('zone_a')
  const [forecastTimeStep, setForecastTimeStep] = useState<'now' | '24h' | '48h' | '7d'>('24h')

  // Map Basemap layer: 'satellite' | 'topo'
  const [mapBasemap, setMapBasemap] = useState<'satellite' | 'topo'>('satellite')

  // Nodes & Active Selected Node
  const [nodes, setNodes] = useState<TelemetryNode[]>(ALL_LEASE_NODES)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('NODE-SN-01')

  // History state for sparklines (maintains 7 historical data points per node)
  const [historyMap, setHistoryMap] = useState<Record<string, NodeTelemetryHistory>>(() => {
    const initial: Record<string, NodeTelemetryHistory> = {}
    ALL_LEASE_NODES.forEach((n) => {
      initial[n.id] = buildInitialHistory(n)
    })
    return initial
  })

  // Stream & Anomaly Simulation (synchronized with isSimulatedAlert)
  const [isStreaming, setIsStreaming] = useState<boolean>(true)
  const [isAnomalyActive, setIsAnomalyActive] = useState<boolean>(false)

  // Keep isAnomalyActive synchronized with isSimulatedAlert
  useEffect(() => {
    setIsAnomalyActive(isSimulatedAlert)
    if (isSimulatedAlert) {
      // Immediately spike the target anomaly nodes for instant feedback
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === 'NODE-SN-01' || n.id === 'NODE-SN-02') {
            return {
              ...n,
              displacement: -58.4,
              strain: 740,
              tilt: 0.38,
              vibration: 18.5,
              status: 'critical' as const
            }
          }
          return n
        })
      )
    } else {
      // Restore normal baseline values
      setNodes(ALL_LEASE_NODES)
    }
  }, [isSimulatedAlert])

  const [currentTime, setCurrentTime] = useState<string>('')

  // Audit Modal
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false)

  // Leaflet map reference & layer groups
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const satelliteLayerRef = useRef<L.TileLayer | null>(null)
  const topoLayerRef = useRef<L.TileLayer | null>(null)
  const contoursLayerGroupRef = useRef<L.LayerGroup | null>(null)
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null)
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map())

  // Active selected node & telemetry history
  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0]
  const activeHistory = historyMap[activeNode.id] || buildInitialHistory(activeNode)

  // 7 dynamic time markers spaced 15 minutes apart
  const timeMarkers = useMemo(() => {
    const now = new Date()
    const markers: string[] = []
    for (let i = 6; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 15 * 60 * 1000)
      const hours = t.getHours().toString().padStart(2, '0')
      const mins = t.getMinutes().toString().padStart(2, '0')
      markers.push(`${hours}:${mins}`)
    }
    return markers
  }, [currentTime.slice(0, 5)])

  // Time updater
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST')
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  // Live Telemetry Simulation
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setNodes((prevNodes) => {
        const nextNodes = prevNodes.map((n) => {
          if (isAnomalyActive && (n.id === 'NODE-SN-01' || n.id === 'NODE-SN-02')) {
            return {
              ...n,
              displacement: parseFloat((n.displacement - 0.14).toFixed(2)),
              strain: Math.round(n.strain + (Math.random() * 25 - 5)),
              tilt: parseFloat((n.tilt + 0.005).toFixed(3)),
              vibration: parseFloat((16.8 + Math.random() * 4.5).toFixed(2)),
              status: 'critical' as const
            }
          }

          const dispJitter = (Math.random() - 0.5) * 0.04
          const strainJitter = Math.round((Math.random() - 0.5) * 4)
          const tiltJitter = (Math.random() - 0.5) * 0.002
          const vibJitter = (Math.random() - 0.5) * 0.05
          const tempJitter = (Math.random() - 0.5) * 0.03

          return {
            ...n,
            displacement: parseFloat((n.displacement + dispJitter).toFixed(2)),
            strain: Math.max(10, n.strain + strainJitter),
            tilt: Math.max(0.01, parseFloat((n.tilt + tiltJitter).toFixed(3))),
            vibration: Math.max(0.1, parseFloat((n.vibration + vibJitter).toFixed(2))),
            temperature: parseFloat((n.temperature + tempJitter).toFixed(1)),
            status: n.vibration > 10 ? ('critical' as const) : Math.abs(n.displacement) > 50 ? ('warning' as const) : ('normal' as const)
          }
        })

        // Synchronously update historyMap with the latest readings
        setHistoryMap((prevHistory) => {
          const nextHistory = { ...prevHistory }
          nextNodes.forEach((node) => {
            const hist = nextHistory[node.id] || buildInitialHistory(node)
            nextHistory[node.id] = {
              displacement: [...hist.displacement.slice(1), node.displacement],
              strain: [...hist.strain.slice(1), node.strain],
              tilt: [...hist.tilt.slice(1), node.tilt],
              temperature: [...hist.temperature.slice(1), node.temperature],
              vibration: [...hist.vibration.slice(1), node.vibration]
            }
          })
          return nextHistory
        })

        return nextNodes
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [isStreaming, isAnomalyActive])


  // =========================================================================
  // LEAFLET GIS HEATMAP ENGINE (DECOUPLED LIFECYCLE: NEVER RESETS ON TELEMETRY)
  // =========================================================================

  // 1. Initialize Map Once when activeTab === 'gis_mapping'
  useEffect(() => {
    if (activeTab !== 'gis_mapping') {
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

    // Base tile layers
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

    // Layer groups for Contours and Markers
    contoursLayerGroupRef.current = L.layerGroup().addTo(map)
    markersLayerGroupRef.current = L.layerGroup().addTo(map)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [activeTab])

  // 2. Basemap layer switcher (Smooth tile swap, zero map reset)
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

  // 4. Zone Contours & Smooth Pan-To (Triggers ONLY when zone changes, NOT on ticks)
  useEffect(() => {
    const map = mapInstanceRef.current
    const contoursGroup = contoursLayerGroupRef.current
    if (!map || !contoursGroup) return

    contoursGroup.clearLayers()

    // Zone A Contours
    if (activeZoneFilter === 'all' || activeZoneFilter === 'zone_a') {
      const zALat = 22.3591
      const zALon = 82.7501

      // 1. Compression Core (>24 mm/yr, Cumulative Sag -2,240 mm)
      L.polygon(generateOrganicContour(zALat, zALon, 80, 68, 38, 0.16, 0.05), {
        color: '#9333ea',
        weight: 2.5,
        fillColor: '#7e22ce',
        fillOpacity: 0.52
      })
        .addTo(contoursGroup)
        .bindTooltip('<b>Zone A: Compression Core</b><br/>Rate: 24 - 28.2 mm/yr<br/>Sag: -2,240 mm', { sticky: true })

      // 2. Annular Tension Ring (14-22 mm/yr, Peak Shear Stress)
      L.polygon(generateOrganicContour(zALat, zALon, 135, 110, 38, 0.2, 0.06), {
        color: '#f97316',
        weight: 2,
        dashArray: '4, 4',
        fillColor: '#f97316',
        fillOpacity: 0.32
      })
        .addTo(contoursGroup)
        .bindTooltip('<b>Zone A: Annular Tension Ring</b><br/>Rate: 14 - 22 mm/yr<br/>Tensile Shear Hazard', { sticky: true })

      // 3. Outer Draw Limit (1-5 mm/yr)
      L.polygon(generateOrganicContour(zALat, zALon, 185, 150, 38, 0.22, 0.07), {
        color: '#10b981',
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: '#10b981',
        fillOpacity: 0.12
      })
        .addTo(contoursGroup)
        .bindTooltip('<b>Zone A: Outer Draw Limit (β=62°)</b><br/>Rate: 1 - 5 mm/yr', { sticky: true })
    }

    // Zone B Contours
    if (activeZoneFilter === 'all' || activeZoneFilter === 'zone_b') {
      const zBLat = 22.3611
      const zBLon = 82.7516

      // Advance Sag Center
      L.polygon(generateOrganicContour(zBLat, zBLon, 70, 58, 40, 0.14, 0.05), {
        color: '#ea580c',
        weight: 2.2,
        fillColor: '#ea580c',
        fillOpacity: 0.42
      })
        .addTo(contoursGroup)
        .bindTooltip('<b>Zone B: Advance Sag Center</b><br/>Rate: 10 - 15.6 mm/yr<br/>Sag: -1,180 mm', { sticky: true })

      // Overlapping Influence Perimeter
      L.polygon(generateOrganicContour(zBLat, zBLon, 130, 105, 40, 0.18, 0.06), {
        color: '#eab308',
        weight: 1.8,
        dashArray: '4, 4',
        fillColor: '#eab308',
        fillOpacity: 0.18
      })
        .addTo(contoursGroup)
        .bindTooltip('<b>Zone B: Overlapping Influence Perimeter</b><br/>Rate: 2 - 8 mm/yr (Shared Strata Flexure)', { sticky: true })
    }

    // Zone C Contours
    if (activeZoneFilter === 'all' || activeZoneFilter === 'zone_c') {
      const zCLat = 22.3567
      const zCLon = 82.7469

      L.polygon(generateOrganicContour(zCLat, zCLon, 90, 75, 25, 0.1, 0.05), {
        color: '#ca8a04',
        weight: 2,
        dashArray: '4, 4',
        fillColor: '#eab308',
        fillOpacity: 0.22
      })
        .addTo(contoursGroup)
        .bindTooltip('<b>Zone C: Stabilized Stowed Goaf</b><br/>Rate: 2 - 4.2 mm/yr (Compacted Backfill)', { sticky: true })
    }

    // Smoothly pan & zoom to target zone center
    if (activeZoneFilter === 'zone_a') {
      map.flyTo([22.3591, 82.7501], 17, { duration: 0.75 })
    } else if (activeZoneFilter === 'zone_b') {
      map.flyTo([22.3611, 82.7516], 17, { duration: 0.75 })
    } else if (activeZoneFilter === 'zone_c') {
      map.flyTo([22.3567, 82.7469], 17, { duration: 0.75 })
    } else {
      map.flyTo([22.3595, 82.7501], 16, { duration: 0.75 })
    }
  }, [activeZoneFilter])

  // 5. Hardware Node Markers Setup (Only rebuilds if zone filter, selectedNodeId, or anomaly changes)
  useEffect(() => {
    const markersGroup = markersLayerGroupRef.current
    if (!markersGroup) return

    markersGroup.clearLayers()
    markersMapRef.current.clear()

    nodes.forEach((n) => {
      if (activeZoneFilter !== 'all' && n.zoneId !== activeZoneFilter) return

      const isSelected = n.id === selectedNodeId
      const isCritical = n.status === 'critical' || (isAnomalyActive && (n.id === 'NODE-SN-01' || n.id === 'NODE-SN-02'))

      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-10'
        }">
          <span class="absolute -top-1 -right-1 flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${
              isCritical ? 'bg-rose-400' : 'bg-emerald-400'
            } opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 ${
              isCritical ? 'bg-rose-500' : 'bg-emerald-500'
            }"></span>
          </span>
          <div style="
            background: ${isCritical ? '#dc2626' : n.color};
            width: ${isSelected ? '26px' : '22px'};
            height: ${isSelected ? '26px' : '22px'};
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 9px;
            font-weight: 900;
          ">
            ${n.id.replace('NODE-SN-', '#')}
          </div>
        </div>
      `

      const icon = L.divIcon({
        className: 'custom-node-pin',
        html: markerHtml,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      })

      const marker = L.marker([n.lat, n.lon], { icon }).addTo(markersGroup)
      marker.on('click', () => setSelectedNodeId(n.id))
      marker.bindTooltip(
        `<b>${n.name}</b><br/>Vertical Sag: <b style="color:${isCritical ? '#dc2626' : '#0f172a'}">${n.displacement} mm</b><br/>PPV Vibration: <b>${n.vibration} mm/s</b>`,
        { direction: 'top', offset: [0, -10] }
      )
      markersMapRef.current.set(n.id, marker)
    })
  }, [activeZoneFilter, selectedNodeId, isAnomalyActive])

  // 6. Dynamic Tooltip Live Updates (Updates tooltip text in place, ZERO map reload or repositioning)
  useEffect(() => {
    nodes.forEach((n) => {
      const marker = markersMapRef.current.get(n.id)
      if (marker) {
        const isCritical = n.status === 'critical' || (isAnomalyActive && (n.id === 'NODE-SN-01' || n.id === 'NODE-SN-02'))
        marker.setTooltipContent(
          `<b>${n.name}</b><br/>Vertical Sag: <b style="color:${isCritical ? '#dc2626' : '#0f172a'}">${n.displacement} mm</b><br/>PPV Vibration: <b>${n.vibration} mm/s</b>`
        )
      }
    })
  }, [nodes, isAnomalyActive])

  // 7. Pan to selected node when user explicitly chooses it
  useEffect(() => {
    if (mapInstanceRef.current && activeNode && activeTab === 'gis_mapping') {
      mapInstanceRef.current.panTo([activeNode.lat, activeNode.lon], { animate: true })
    }
  }, [selectedNodeId, activeTab])

  // S_max calculation for AI forecast & Live Strata deformation
  const S_MAX = -2240
  const currentSag = activeNode.displacement
  const sag24h = parseFloat((currentSag - 6.3).toFixed(1))
  const sag48h = parseFloat((currentSag - 14.8).toFixed(1))
  const liveSagRatio = Math.min(100, Math.max(5, Math.round((Math.abs(currentSag) / Math.abs(S_MAX)) * 100 * 2.2)))

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none">
      
      {/* ========================================================================= */}
      {/* TOP NAVBAR (EXECUTIVE BRANDING)                                            */}
      {/* ========================================================================= */}
      {!hideHeader && (
        <header className="w-full bg-white border-b border-slate-200/90 sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-2xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* Logo & Portal Identity */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-2xs">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-slate-950">
                    Bhu<span className="text-emerald-600">Rakshak</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wider">
                    Operator Command
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 hidden sm:inline-block">
                    by Akshat
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 hidden sm:block">
                  {collieryName} • DGMS Real-Time Subsidence Surveillance • Conceived &amp; Developed by Akshat
                </p>
              </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{currentTime || '12:00:00 IST'}</span>
              </div>

              {isAnomalyActive ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-black animate-pulse shadow-sm shadow-rose-600/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>HAZARD ALARM TRIGGERED</span>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ALL SENSORS NOMINAL</span>
                </div>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>
        </header>
      )}

      {/* ========================================================================= */}
      {/* 4 FUNCTIONAL SUBTABS: CENTERED ROUNDED CARD CONTAINER                      */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-5 pb-1">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 overflow-x-auto scrollbar-none w-full max-w-4xl py-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('gis_mapping')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'gis_mapping'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>GIS MAPPING</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('digital_twin')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'digital_twin'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>DIGITAL TWIN (3D STRATA)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('live_sensor_feed')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'live_sensor_feed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>LIVE SENSOR FEED</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ai_forecast')}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'ai_forecast'
                  ? 'bg-amber-50 text-amber-700 border border-amber-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>AI FORECAST (24-48h)</span>
            </button>

            {/* Tab 5: ALERTS & EARLY WARNING */}
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

          {/* Simulation Trigger Button on Operator */}
          <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                handleToggleSimulation()
                if (!isSimulatedAlert) setActiveTab('alerts')
              }}
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
      {/* COCKPIT CONTAINER: EXPANDED FULL-WIDTH FOR LIVE SENSOR FEED OR 2-COLUMN   */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-4 flex-1">
        {activeTab === 'alerts' ? (
          <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs animate-fadeIn">
            <MineAlertsTab
              isSimulatedAlert={isSimulatedAlert}
              onToggleSimulation={handleToggleSimulation}
              currentRole="operator"
              collieryName={collieryName}
            />
          </div>
        ) : activeTab === 'live_sensor_feed' ? (
          /* ===================================================================== */
          /* EXPANDED FULL-WIDTH SAFETY INTEGRITY & LIVE SENSOR FEED DECK         */
          /* ===================================================================== */
          <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn">
            
            {/* Top Header: Title + Telemetry Status + Zone & Node Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Radio className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                    SAFETY INTEGRITY • LIVE SENSOR FEED
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    10/10 Hardware Nodes Active
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Live Stream &bull; 1.5s interval</span>
                  <span>&bull;</span>
                  <span>DGMS Tech Cir-2024 Safety Envelope</span>
                  <span>&bull;</span>
                  <span className="font-mono text-emerald-600 font-bold">Mesh Latency: 42ms</span>
                </div>
              </div>

              {/* Controls: Risk Level Badge & Active Node Dropdown */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border transition-colors ${
                  isAnomalyActive
                    ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }`}>
                  {isAnomalyActive ? 'RISK LEVEL: CRITICAL HAZARD' : 'RISK LEVEL: LOW (SAFE ENVELOPE)'}
                </div>

                <div className="relative">
                  <select
                    value={selectedNodeId}
                    onChange={(e) => setSelectedNodeId(e.target.value)}
                    className="pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer shadow-2xs transition"
                  >
                    <optgroup label="Zone A (Active Caving Face)">
                      {nodes
                        .filter((n) => n.zoneId === 'zone_a')
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} ({n.displacement} mm)
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Zone B (Transition Advance)">
                      {nodes
                        .filter((n) => n.zoneId === 'zone_b')
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} ({n.displacement} mm)
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Zone C (Stabilized Stowed Goaf)">
                      {nodes
                        .filter((n) => n.zoneId === 'zone_c')
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} ({n.displacement} mm)
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 6 EXECUTIVE METRIC SUMMARY TILES */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Tile 1: Active Subterranean Sag */}
              <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl p-3.5 text-center shadow-2xs">
                <span className="block text-[11px] font-bold text-slate-600 mb-0.5">
                  Subterranean Sag
                </span>
                <div className="text-2xl font-black text-emerald-600 tracking-tight leading-tight">
                  {Math.abs(activeNode.displacement).toFixed(1)} mm
                </div>
                <span className="block text-[10px] font-medium text-emerald-800/80 mt-0.5">
                  Live sag envelope
                </span>
              </div>

              {/* Tile 2: Vertical Displacement */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl">
                <span className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                  <span>Displacement</span>
                </span>
                <div className="text-xl font-black text-rose-600 mt-1">
                  {activeNode.displacement} mm
                </div>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  Compaction rate nominal
                </span>
              </div>

              {/* Tile 3: Tensile Strain */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl">
                <span className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-sky-500" />
                  <span>Tensile Strain</span>
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {activeNode.strain} με
                </div>
                <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                  Elastic zone (&lt;600με)
                </span>
              </div>

              {/* Tile 4: Surface Tilt */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl">
                <span className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Compass className="w-3 h-3 text-amber-500" />
                  <span>Surface Tilt</span>
                </span>
                <div className="text-xl font-black text-amber-600 mt-1">
                  {activeNode.tilt}°
                </div>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  Safe slope (&lt;0.5°)
                </span>
              </div>

              {/* Tile 5: Temperature */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl">
                <span className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-emerald-500" />
                  <span>Temperature</span>
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {activeNode.temperature} °C
                </div>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  Thermal strata nominal
                </span>
              </div>

              {/* Tile 6: Ground Vibration */}
              <div className={`p-3.5 rounded-2xl border transition ${
                activeNode.vibration > 10 ? 'bg-rose-50 border-rose-300 animate-pulse' : 'bg-slate-50/80 border-slate-200/90'
              }`}>
                <span className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Activity className={`w-3 h-3 ${activeNode.vibration > 10 ? 'text-rose-600' : 'text-indigo-500'}`} />
                  <span>Vibration (PPV)</span>
                </span>
                <div className={`text-xl font-black mt-1 ${activeNode.vibration > 10 ? 'text-rose-600' : 'text-indigo-600'}`}>
                  {activeNode.vibration} mm/s
                </div>
                <span className={`block text-[10px] font-semibold mt-0.5 ${activeNode.vibration > 10 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {activeNode.vibration > 10 ? 'HAZARD SPIKE' : 'DGMS limit <5mm/s'}
                </span>
              </div>
            </div>

            {/* EXPANDED HIGH-RESOLUTION TIME-SERIES SPARKLINE CARDS (3 COLUMNS) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>{activeNode.name} Real-Time Multi-Parameter Trendline Telemetry</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">7-Interval Rolling Buffer</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Chart 1: Vertical Displacement */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
                  <SparklineMetricCard
                    label="Vertical Displacement"
                    value={`${activeNode.displacement} mm`}
                    color={isAnomalyActive && (activeNode.id === 'NODE-SN-01' || activeNode.id === 'NODE-SN-02') ? '#e11d48' : '#10b981'}
                    points={activeHistory.displacement}
                    timeLabels={timeMarkers}
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/60 pt-2">
                    <span>Floor Compaction</span>
                    <span className="font-mono font-bold text-slate-700">Rate: -0.04 mm/hr</span>
                  </div>
                </div>

                {/* Chart 2: Tensile Strain */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
                  <SparklineMetricCard
                    label="Tensile Strain"
                    value={`${activeNode.strain} με`}
                    color="#0284c7"
                    points={activeHistory.strain}
                    timeLabels={timeMarkers}
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/60 pt-2">
                    <span>Overburden Flexure</span>
                    <span className="font-mono font-bold text-slate-700">Limit: 1,000 με</span>
                  </div>
                </div>

                {/* Chart 3: Surface Tilt Angle */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
                  <SparklineMetricCard
                    label="Surface Tilt Angle"
                    value={`${activeNode.tilt}°`}
                    color="#d97706"
                    points={activeHistory.tilt}
                    timeLabels={timeMarkers}
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/60 pt-2">
                    <span>Biaxial Inclinometer</span>
                    <span className="font-mono font-bold text-slate-700">Max Tol: 0.50°</span>
                  </div>
                </div>

                {/* Chart 4: Temperature */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
                  <SparklineMetricCard
                    label="Temperature"
                    value={`${activeNode.temperature} °C`}
                    color="#0284c7"
                    points={activeHistory.temperature}
                    timeLabels={timeMarkers}
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/60 pt-2">
                    <span>Downhole Thermistor</span>
                    <span className="font-mono font-bold text-slate-700">Delta: +0.2 °C</span>
                  </div>
                </div>

                {/* Chart 5: Ground Vibration (PPV) */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
                  <SparklineMetricCard
                    label="Ground Vibration (PPV)"
                    value={`${activeNode.vibration} mm/s`}
                    color={activeNode.vibration > 10 ? '#e11d48' : '#6366f1'}
                    points={activeHistory.vibration}
                    timeLabels={timeMarkers}
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/60 pt-2">
                    <span>Triaxial Geophone Array</span>
                    <span className="font-mono font-bold text-slate-700">DGMS Cutoff: 5.0 mm/s</span>
                  </div>
                </div>

                {/* Chart 6: Live Sag Ratio Progress */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-700">Live Sag Ratio to S_max</span>
                      <span className="font-black text-xs text-indigo-600">{liveSagRatio}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3 p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500 transition-all duration-500"
                        style={{ width: `${liveSagRatio}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-2">
                      <span>0 mm (t0)</span>
                      <span>-1,120 mm (Inflection)</span>
                      <span>-2,240 mm (S_max)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/60 pt-2 mt-3">
                    <span>Asymptotic Model</span>
                    <span className="font-mono font-bold text-emerald-600">Safe Envelope</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FULL 10-NODE HARDWARE FLEET TELEMETRY MATRIX */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Deployed LoRa Hardware Node Fleet Telemetry (10 Nodes Active)
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Filter Zone:</span>
                  {(['all', 'zone_a', 'zone_b', 'zone_c'] as const).map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setActiveZoneFilter(z)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        activeZoneFilter === z
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {z === 'all' ? 'All (10)' : z === 'zone_a' ? 'Zone A (5)' : z === 'zone_b' ? 'Zone B (3)' : 'Zone C (2)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fleet Table */}
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Node ID</th>
                      <th className="py-2.5 px-3.5">Zone & Face</th>
                      <th className="py-2.5 px-3.5">Depth</th>
                      <th className="py-2.5 px-3.5">Vertical Sag</th>
                      <th className="py-2.5 px-3.5">Tensile Strain</th>
                      <th className="py-2.5 px-3.5">Tilt</th>
                      <th className="py-2.5 px-3.5">Temp</th>
                      <th className="py-2.5 px-3.5">Vibration (PPV)</th>
                      <th className="py-2.5 px-3.5">Signal / Bat</th>
                      <th className="py-2.5 px-3.5">Status</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nodes
                      .filter((n) => activeZoneFilter === 'all' || n.zoneId === activeZoneFilter)
                      .map((node) => {
                        const isCritical = node.status === 'critical' || (isAnomalyActive && (node.id === 'NODE-SN-01' || node.id === 'NODE-SN-02'))
                        const isSelected = node.id === selectedNodeId

                        return (
                          <tr
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            className={`transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50/60 font-bold'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: node.color }}
                              />
                              <span>{node.name}</span>
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-600 text-[11px]">
                              {node.zoneName}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-600 text-[11px]">
                              {node.depth} m
                            </td>
                            <td className="py-2.5 px-3.5 font-mono font-bold text-rose-600">
                              {node.displacement} mm
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-800">
                              {node.strain} με
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-amber-600">
                              {node.tilt}°
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-800">
                              {node.temperature} °C
                            </td>
                            <td className="py-2.5 px-3.5 font-mono">
                              <span className={node.vibration > 10 ? 'text-rose-600 font-bold animate-pulse' : 'text-indigo-600'}>
                                {node.vibration} mm/s
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-[11px] font-mono text-slate-500">
                              {node.signalDbm} dBm • {node.battery}%
                            </td>
                            <td className="py-2.5 px-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                isCritical
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isCritical ? 'CRITICAL' : 'NORMAL'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedNodeId(node.id)
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isSelected ? 'Active' : 'Inspect'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Controls: Alarm Banner & Audit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex-1 w-full sm:w-auto">
                {isAnomalyActive ? (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span><b>AUTOMATED ALARM TRIGGERED:</b> Geophone PPV vibration & tensile strain exceed safe envelope! Shift evacuation protocol initiated.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><b>DGMS Safety Envelope Verified:</b> PPV &lt; 5.0 mm/s, Tilt &lt; 0.5°, Subterranean Sag within predicted Knothe curve.</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <span>View Full Geotechnical Compliance Audit</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

          </div>
        ) : activeTab === 'ai_forecast' ? (
          /* ===================================================================== */
          /* EXPANDED FULL-WIDTH AI FORECAST & GEOTECHNICAL CROSS-SECTION DECK      */
          /* ===================================================================== */
          <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn">
            {/* Header: Title, Zone Tabs, Time Horizon Switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                    AI SHORT-TERM FORECAST &amp; SUBSIDENCE PROGRESSION
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Knothe Time-Dependent Prediction Model
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>24h &amp; 48h Strata Displacements</span>
                  <span>&bull;</span>
                  <span>Knothe Influence Angle γ: {ZONE_FORECAST_DATA[forecastZone].angleDraw}</span>
                  <span>&bull;</span>
                  <span className="font-mono text-indigo-600 font-bold">Calibration R²: 0.984</span>
                  <span>&bull;</span>
                  <span className="text-slate-600 font-medium">Asymptotic Bound S_max: {ZONE_FORECAST_DATA[forecastZone].sMax}</span>
                </div>
              </div>

              {/* Controls: Zone Switcher & Forecast Time Horizon Switcher */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
                {/* Zone Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['zone_a', 'zone_b', 'zone_c'] as const).map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setForecastZone(z)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        forecastZone === z
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      {z === 'zone_a' ? 'Zone A (Caving)' : z === 'zone_b' ? 'Zone B (Advance)' : 'Zone C (Goaf)'}
                    </button>
                  ))}
                </div>

                {/* Horizon Switcher */}
                <div className="flex items-center gap-1 bg-amber-50/70 p-1 rounded-xl border border-amber-200">
                  {(['now', '24h', '48h', '7d'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForecastTimeStep(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        forecastTimeStep === t
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100'
                      }`}
                    >
                      {t === 'now' ? 'Current t=0' : t === '24h' ? '+24h Forecast' : t === '48h' ? '+48h Forecast' : '+7d Asymptotic'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed AI Forecast Analytics (8 Comprehensive Geotechnical Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* Card 1: Current Sag */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Current Sag (t=0)</span>
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {ZONE_FORECAST_DATA[forecastZone].now.disp} mm
                </div>
                <div className="text-[11px] text-slate-500">
                  Measured surface datum
                </div>
              </div>

              {/* Card 2: Projected Sag */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  <span>
                    {forecastTimeStep === 'now' ? 'Projected Sag (t=0)' : forecastTimeStep === '24h' ? 'Predicted 24h Sag' : forecastTimeStep === '48h' ? 'Predicted 48h Sag' : '7d Asymptotic Sag'}
                  </span>
                  <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono flex items-baseline gap-2">
                  <span>{ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].disp} mm</span>
                  {ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].delta > 0 && (
                    <span className="text-xs font-bold text-rose-600">
                      (+{ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].delta} mm)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-amber-700">
                  {forecastTimeStep === 'now' ? 'Zero time delta' : `Additional +${ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].delta} mm subsidence`}
                </div>
              </div>

              {/* Card 3: Subsidence Velocity */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Subsidence Velocity</span>
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].velocity}
                </div>
                <div className="text-[11px] text-slate-500">
                  {forecastTimeStep === '48h' ? 'Maximum Acceleration' : forecastTimeStep === '7d' ? 'Deceleration Phase' : 'Active Draw Velocity'}
                </div>
              </div>

              {/* Card 4: Peak Strain ε_x */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Peak Horizontal Strain</span>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                  +{(ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].strain * 10).toFixed(2)} mm/m
                </div>
                <div className={`text-[11px] font-semibold ${
                  ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].strain * 10 > 2.0 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].strain * 10 > 2.0 ? 'Exceeds Tension Limit (>2.0)' : 'Within Elastic Limit (<2.0)'}
                </div>
              </div>

              {/* Card 5: Asymptotic Bound S_max */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Theoretical S_max</span>
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {ZONE_FORECAST_DATA[forecastZone].sMax}
                </div>
                <div className="text-[11px] text-slate-500">
                  Full caving goaf capacity limit
                </div>
              </div>

              {/* Card 6: Borehole Probe Delamination */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                  <span>3.5m Borehole Delam</span>
                  <Compass className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-purple-950 font-mono">
                  {ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].delam.toFixed(1)} mm
                </div>
                <div className="text-[11px] text-purple-700">
                  Immediate roof bed separation
                </div>
              </div>

              {/* Card 7: Foundation Tilt */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Differential Tilt</span>
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].tilt.toFixed(2)}°
                </div>
                <div className="text-[11px] text-slate-500">
                  {(ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].tilt * 17.45).toFixed(1)} mm/m slope gradient
                </div>
              </div>

              {/* Card 8: Regime Status */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Predicted Hazard Status</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-sm font-black text-slate-900 truncate">
                  {ZONE_FORECAST_DATA[forecastZone][forecastTimeStep].status}
                </div>
                <div className="text-[11px] text-slate-500">
                  Radius: {ZONE_FORECAST_DATA[forecastZone].influenceRadius} • Draw: {ZONE_FORECAST_DATA[forecastZone].angleDraw}
                </div>
              </div>
            </div>

            {/* Geotechnical 2D Cross-Section & Horizontal Strain Deck */}
            <div className="pt-2">
              <GeotechnicalCrossSectionView zoneId={forecastZone} timeStep={forecastTimeStep} />
            </div>

            {/* Geotechnical Knothe Equation & Scientific Calibration Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Activity className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Knothe Time-Dependent Geotechnical Formulation &amp; Subsidence Mechanics
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Colliery Seam Depth H = {ZONE_FORECAST_DATA[forecastZone].depth} • Angle of Draw γ = {ZONE_FORECAST_DATA[forecastZone].angleDraw}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed pt-1">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/70 space-y-1.5 font-mono">
                  <span className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider font-sans">
                    Subsidence Profile Function W(x, t):
                  </span>
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-800 text-xs">
                    W(x, t) = W_max(t) &times; ½ [ erf(√π &times; x / R) + 1 ]
                  </div>
                  <span className="block text-[11px] text-slate-500 font-sans">
                    Where W_max(t) = S_max &times; (1 - e^( -c &times; t )), with c = 0.082 day⁻¹ time-rate coefficient.
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/70 space-y-1.5">
                  <span className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Geotechnical Failure Criteria Correlation:
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Horizontal strain ε_x is derived directly as the first derivative of horizontal displacement: ε_x = ∂U(x)/∂x.
                    Tensile cracks emerge when ε_x &gt; +2.0 mm/m, triggering automated building foundation risk advisories according to DGMS circular standards.
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* ===================================================================== */
          /* 2-COLUMN COCKPIT (MATCHING REFERENCE PHOTO DESIGN)                   */
          /* ===================================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* ===================================================================== */}
          {/* LEFT CARD (~65-70% / 8 COLS): PASHU-COLLAR CARD EQUIVALENT             */}
          {/* ===================================================================== */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between h-full space-y-5">
            
            {/* Top Node Header: Clean, Compact Title */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
                  <Cpu className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {activeNode.name}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase">
                    Zone {activeNode.zoneId.replace('zone_', '').toUpperCase()} • Depth {activeNode.depth}m • LoRa Mesh
                  </p>
                </div>
              </div>

              {/* LIVE Indicator */}
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-black tracking-wider uppercase shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>LIVE</span>
                </span>
              </div>
            </div>

            {/* TAB CONTENT: 1. GIS MAPPING (AUTHENTIC SUBSIDENCE HEATMAP WITH ZONE SWITCHING) */}
            {activeTab === 'gis_mapping' && (
              <div className="space-y-3.5 animate-fadeIn">
                
                {/* GIS HEATMAP TOOLBAR: MODERN SEGMENTED CONTROLS */}
                <div className="flex items-center justify-between p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveZoneFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeZoneFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Zones
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveZoneFilter('zone_a')
                        if (activeNode.zoneId !== 'zone_a') setSelectedNodeId('NODE-SN-01')
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        activeZoneFilter === 'zone_a'
                          ? 'bg-white text-purple-700 shadow-xs border border-purple-200'
                          : 'text-slate-600 hover:text-purple-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      <span>Zone A</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveZoneFilter('zone_b')
                        if (activeNode.zoneId !== 'zone_b') setSelectedNodeId('NODE-SN-04')
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        activeZoneFilter === 'zone_b'
                          ? 'bg-white text-orange-600 shadow-xs border border-orange-200'
                          : 'text-slate-600 hover:text-orange-600'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>Zone B</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveZoneFilter('zone_c')
                        if (activeNode.zoneId !== 'zone_c') setSelectedNodeId('NODE-SN-06')
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        activeZoneFilter === 'zone_c'
                          ? 'bg-white text-amber-600 shadow-xs border border-amber-200'
                          : 'text-slate-600 hover:text-amber-600'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Zone C</span>
                    </button>
                  </div>

                  {/* Basemap Switcher on the Right */}
                  <div className="flex items-center gap-1 pr-1">
                    <button
                      type="button"
                      onClick={() => setMapBasemap(mapBasemap === 'satellite' ? 'topo' : 'satellite')}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Toggle Satellite or Topographic Base"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>{mapBasemap === 'satellite' ? 'Topo Vector' : '🛰️ Satellite'}</span>
                    </button>
                  </div>
                </div>

                {/* Leaflet Map with Organic Heatmap & Radar Assimilation */}
                <div
                  ref={mapContainerRef}
                  className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner z-10"
                />

                {/* Authentic Geotechnical Heatmap Legend Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-slate-600 pt-1">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#7e22ce] flex-shrink-0" />
                    <span>Compression Core (&gt;24 mm/yr)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#f97316] flex-shrink-0" />
                    <span>Tension Ring (14-22 mm/yr)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#10b981] flex-shrink-0" />
                    <span>Outer Draw Limit (1-5 mm/yr)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ca8a04] flex-shrink-0" />
                    <span>Stabilized Goaf (&lt;5 mm/yr)</span>
                  </div>
                </div>

                {/* 6 Bottom Quick Metric Stats (Matching the 6 tiles in the reference photo) */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Vertical Sag</span>
                    <span className="text-sm font-black text-rose-600">{activeNode.displacement} mm</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Strain</span>
                    <span className="text-sm font-black text-slate-900">{activeNode.strain} με</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Surface Tilt</span>
                    <span className="text-sm font-black text-amber-600">{activeNode.tilt}°</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Vibration</span>
                    <span className={`text-sm font-black ${activeNode.vibration > 10 ? 'text-rose-600' : 'text-indigo-600'}`}>
                      {activeNode.vibration} mm/s
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Battery</span>
                    <span className="text-sm font-black text-emerald-600">{activeNode.battery}%</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Mesh Link</span>
                    <span className="text-sm font-black text-emerald-600">98% Online</span>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: 2. DIGITAL TWIN (3D STRATA) - REAL-TIME SENSOR DRIVEN */}
            {activeTab === 'digital_twin' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Real-time automated strata deflection telemetry display (Light Background) */}
                <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800">
                        Live Subterranean Sag Integration:
                      </span>
                      <span className="text-xs font-mono font-black text-rose-600">
                        {activeNode.displacement} mm
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-600">Tensile Strain: <b className="text-indigo-600">{activeNode.strain} με</b></span>
                      <span className="text-slate-600">PPV Vibration: <b className={activeNode.vibration > 10 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}>{activeNode.vibration} mm/s</b></span>
                    </div>
                  </div>

                  {/* Real-time automated deflection progress gauge */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Live Sag Ratio</span>
                      <span className="text-indigo-600 font-mono font-bold">{liveSagRatio}% of S_max (-2,240 mm)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden p-0.5 border border-slate-300/60">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          activeNode.vibration > 10 || Math.abs(activeNode.displacement) > 40
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                            : 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                        }`}
                        style={{ width: `${liveSagRatio}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                      <span>0 mm Undisturbed Surface</span>
                      <span>-1,120 mm Inflection Sag Point</span>
                      <span>-2,240 mm Maximum Theoretical S_max</span>
                    </div>
                  </div>
                </div>

                {/* 3D WebGL Iframe (Height adjusted to align bottom with GIS Mapping and Right Card) */}
                <div className="relative w-full h-[510px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-950">
                  <iframe
                    src={
                      activeNode.zoneId === 'zone_b'
                        ? '/interactive_strata_3d_zone_b.html'
                        : activeNode.zoneId === 'zone_c'
                        ? '/interactive_strata_3d_zone_c.html'
                        : '/interactive_strata_3d_zone_a.html'
                    }
                    className="w-full h-full border-0"
                    title="3D Strata Digital Twin"
                  />
                </div>
              </div>
            )}

          </div>

          {/* ===================================================================== */}
          {/* RIGHT CARD (~30-35% / 4 COLS): SAFETY INTEGRITY & NODE TELEMETRY      */}
          {/* ===================================================================== */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between h-full space-y-4">
            
            <div className="space-y-3.5">
              {/* Header: Title + Online Dot + Risk Level Pill Badge (No A+ badge) */}
              <div className="pb-3 border-b border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      SAFETY INTEGRITY
                    </h3>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      IoT device online
                    </span>
                  </div>

                  {/* Risk Level Badge */}
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors ${
                    isAnomalyActive
                      ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  }`}>
                    {isAnomalyActive ? 'RISK LEVEL: CRITICAL HAZARD' : 'RISK LEVEL: LOW (SAFE ENVELOPE)'}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Live synced &bull; 1.5s interval</span>
                  <span className="font-mono text-[10px]">DGMS-2024 REGULATION</span>
                </div>
              </div>

              {/* Hardware Node Selector Dropdown (Grouped by Zone) */}
              <div className="flex items-center justify-between gap-2 py-0.5">
                <label className="text-[11px] font-bold text-slate-600 shrink-0">
                  Telemetry Node:
                </label>
                <div className="relative flex-1">
                  <select
                    value={selectedNodeId}
                    onChange={(e) => setSelectedNodeId(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer shadow-2xs transition"
                  >
                    <optgroup label="Zone A (Active Caving Face)">
                      {nodes
                        .filter((n) => n.zoneId === 'zone_a')
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} ({n.displacement} mm)
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Zone B (Transition Advance)">
                      {nodes
                        .filter((n) => n.zoneId === 'zone_b')
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} ({n.displacement} mm)
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Zone C (Stabilized Stowed Goaf)">
                      {nodes
                        .filter((n) => n.zoneId === 'zone_c')
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} ({n.displacement} mm)
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* TELEMETRY METRIC CHARTS MATCHING REFERENCE APP */}
              <div className="space-y-1.5 divide-y divide-slate-100/80">
                
                {/* 1. Vertical Displacement */}
                <SparklineMetricCard
                  label="Vertical Displacement"
                  value={`${activeNode.displacement} mm`}
                  color={isAnomalyActive && (activeNode.id === 'NODE-SN-01' || activeNode.id === 'NODE-SN-02') ? '#e11d48' : '#10b981'}
                  points={activeHistory.displacement}
                  timeLabels={timeMarkers}
                />

                {/* 2. Tensile Strain (Strata removed) */}
                <div className="pt-1.5">
                  <SparklineMetricCard
                    label="Tensile Strain"
                    value={`${activeNode.strain} με`}
                    color="#0284c7"
                    points={activeHistory.strain}
                    timeLabels={timeMarkers}
                  />
                </div>

                {/* 3. Surface Tilt Angle */}
                <div className="pt-1.5">
                  <SparklineMetricCard
                    label="Surface Tilt Angle"
                    value={`${activeNode.tilt}°`}
                    color="#d97706"
                    points={activeHistory.tilt}
                    timeLabels={timeMarkers}
                  />
                </div>

                {/* Center Highlighted Card: Active Subterranean Sag (Compact) */}
                <div className="pt-1">
                  <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl px-3.5 py-2 text-center my-0.5 shadow-2xs">
                    <span className="block text-[11px] font-bold text-slate-600">
                      Active Subterranean Sag
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight leading-tight my-0.5">
                      {Math.abs(activeNode.displacement).toFixed(1)} mm
                    </div>
                    <span className="block text-[10px] font-medium text-emerald-800/80">
                      Current live sensor sag envelope
                    </span>
                  </div>
                </div>

                {/* 4. Temperature (Strata removed) */}
                <div className="pt-1.5">
                  <SparklineMetricCard
                    label="Temperature"
                    value={`${activeNode.temperature} °C`}
                    color="#0284c7"
                    points={activeHistory.temperature}
                    timeLabels={timeMarkers}
                  />
                </div>

                {/* 5. Ground Vibration (PPV) */}
                <div className="pt-1.5">
                  <SparklineMetricCard
                    label="Ground Vibration (PPV)"
                    value={`${activeNode.vibration} mm/s`}
                    color={activeNode.vibration > 10 ? '#e11d48' : '#6366f1'}
                    points={activeHistory.vibration}
                    timeLabels={timeMarkers}
                  />
                </div>

              </div>
            </div>

            {/* Bottom Controls Pinned to Bottom for Vertical Div Alignment */}
            <div className="space-y-3 pt-3 mt-auto">
              {/* AUTOMATED ALARM TRIGGER STATUS */}
              {isAnomalyActive ? (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-black text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>AUTOMATED ALARM TRIGGERED</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Geophone vibration ({activeNode.vibration} mm/s) & tensile strain exceed safe envelope! Shift evacuation protocol initiated.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-[11px]">Thresholds active: PPV &lt; 5 mm/s, Tilt &lt; 0.5°.</span>
                </div>
              )}

              {/* View Full Audit */}
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Full Geotechnical Audit</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

          </div>

        </div>
        )}
      </main>

      {/* Floating Action Button: Toggle Anomaly Simulation (Circular Button with Tick Mark) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={handleToggleSimulation}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${
            isAnomalyActive
              ? 'bg-rose-600 shadow-rose-600/40 ring-4 ring-rose-400/50 animate-bounce'
              : 'bg-emerald-600 shadow-emerald-600/30 hover:bg-emerald-700'
          }`}
          title={isAnomalyActive ? 'Anomaly Active: Click to Reset System' : 'Click to Simulate Anomaly'}
        >
          {isAnomalyActive ? (
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          ) : (
            <ShieldCheck className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Audit Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  DGMS Geotechnical Compliance Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between font-bold text-slate-900 mb-1">
                  <span>1. Knothe Factor Calibration (a · m)</span>
                  <span className="text-emerald-600">PASS (0.70 Caving Ratio)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Extracted thickness m=3.2m at depth H=185m complies with Circular No. DGMS/Tech/2024.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between font-bold text-slate-900 mb-1">
                  <span>2. IoT Hardware Mesh Redundancy</span>
                  <span className="text-emerald-600">10 of 10 Nodes Online</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  All active surface anchors reporting without packet drop. Ping latency: 42ms.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between font-bold text-slate-900 mb-1">
                  <span>3. Triaxial Geophone Vibration Threshold</span>
                  <span className={activeNode.vibration > 10 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                    {activeNode.vibration > 10 ? 'THRESHOLD EXCEEDED' : 'PASS (< 5 mm/s PPV)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Surface blasting PPV limits comply with DGMS standard 15 mm/s.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
