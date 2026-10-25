import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Radio,
  Layers,
  MapPin,
  Cpu,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Maximize2,
  Activity,
  AlertTriangle,
  Info,
  Compass,
  Sliders,
  Sparkles,
  ExternalLink,
  TrendingDown,
  Satellite,
  X,
  ChevronDown
} from 'lucide-react'

export interface ZoneConfig {
  id: string
  panelName: string
  depthOfCover: number // H (m)
  extractionThickness: number // m (m)
  panelWidth: number // W (m)
  panelLength: number // L (m)
  miningMethod: 'Bord & Pillar' | 'Longwall'
  roofManagement: 'Caving' | 'Sand Stowing'
  commProtocol: 'UWB' | 'RSSI'
  baselineTilt: number
  baselineTemp: number
  anchorTest: number
  tellTale: number
}

export interface CollieryConfig {
  mineName: string
  stateName: string
  cityName: string
  region: string
  latitude: number
  longitude: number
  zones?: ZoneConfig[]
  depthOfCover: number // H (m)
  extractionThickness: number // m (m)
  panelWidth: number // W (m)
  panelLength: number // L (m)
  miningMethod: 'Bord & Pillar' | 'Longwall'
  roofManagement: 'Caving' | 'Sand Stowing'
  commProtocol: 'UWB' | 'RSSI'
  baselineTilt: number
  baselineTemp: number
  anchorTest: number
  tellTale: number
}

interface GisHeatmapResultsProps {
  config: CollieryConfig
  onProceedToLogin: (creds: { email: string; pass: string }) => void
  onBackToForm: () => void
}

export type ZoneId = 'zone_a' | 'zone_b' | 'zone_c'

interface TransectPoint {
  northing_m?: number
  easting_m?: number
  deformation_rate_mm_year: number
  coherence_gradient: number
}

interface ZoneInSarMeta {
  zone_id: string
  zone_title: string
  max_subsidence_rate_mm_year: number
  mean_subsidence_rate_mm_year: number
  peak_coherence_gradient: number
  dip_transect: TransectPoint[]
  strike_transect: TransectPoint[]
}

interface InSarPredictionMeta {
  source: string
  sensor_orbit: string
  processing_pipeline: string
  calibration: string
  zones: Record<ZoneId, ZoneInSarMeta>
  max_subsidence_rate_mm_year: number
  mean_subsidence_rate_mm_year: number
  peak_coherence_gradient: number
  annular_tension_radius_meters: number
  compression_core_radius_meters: number
  dip_transect: TransectPoint[]
  strike_transect: TransectPoint[]
}

// Helper to generate organic, asymmetric, non-circular contour polygons
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

export default function GisHeatmapResults({
  config,
  onProceedToLogin,
  onBackToForm
}: GisHeatmapResultsProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  const [mapType, setMapType] = useState<'satellite' | 'topo'>('satellite')
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedField, setCopiedField] = useState<'email' | 'passkey' | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [selectedNode, setSelectedNode] = useState<{
    id: string
    type: string
    zone: string
    lat: number
    lon: number
    status: string
  } | null>(null)

  // MULTI-ZONE STATE (Zone A, Zone B, Zone C)
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneId>('zone_a')
  const [insarData, setInsarData] = useState<InSarPredictionMeta | null>(null)
  const [activeTransectTab, setActiveTransectTab] = useState<'dip' | 'strike'>('dip')
  const [hoveredPoint, setHoveredPoint] = useState<TransectPoint | null>(null)
  const [showImageLightbox, setShowImageLightbox] = useState(false)

  // Fetch InSAR dataset from public
  useEffect(() => {
    fetch('/insar_prediction_data.json')
      .then((res) => {
        if (!res.ok) throw new Error('Network error')
        return res.json()
      })
      .then((data: InSarPredictionMeta) => {
        setInsarData(data)
      })
      .catch((err) => {
        console.warn('Fallback to local InSAR dataset', err)
      })
  }, [])

  // --------------------------------------------------------------------------
  // 1. ZONE DEFINITIONS (ZONE A & B ARE CLOSE, PERIMETERS TOUCH/OVERLAP)
  // --------------------------------------------------------------------------
  const lat = config.latitude
  const lon = config.longitude

  const za = config.zones?.[0]
  const zb = config.zones?.[1]
  const zc = config.zones?.[2]

  const zonesConfig = {
    zone_a: {
      id: 'zone_a' as ZoneId,
      name: za?.panelName ? `Zone A: ${za.panelName}` : 'Zone A: Panel 7 (Active Caving)',
      shortLabel: 'Zone A (Critical)',
      category: 'Critical Subsidence Zone',
      colorBadge: 'bg-purple-100 text-purple-800 border-purple-200',
      centerLat: lat - 0.0004,
      centerLon: lon,
      maxRate: za ? (za.roofManagement === 'Caving' ? (za.miningMethod === 'Longwall' ? 28.2 : 22.0) : 4.2) : 28.2,
      maxSagMm: za ? Math.round((za.roofManagement === 'Caving' ? (za.miningMethod === 'Longwall' ? 0.70 : 0.55) : 0.10) * za.extractionThickness * 1000) : 2240,
      riskLevel: 'Critical Risk',
      nodeCount: 8,
      description: za ? `${za.miningMethod} excavation in ${za.panelName || 'Panel 7'}. Depth H=${za.depthOfCover}m, m=${za.extractionThickness}m with ${za.roofManagement} & ${za.commProtocol} sensors.` : 'Active Longwall Panel 7. High deformation velocity with Annular Tension Ring cracking.',
      modelSrc: '/interactive_strata_3d_zone_a.html',
      insarPng: '/insar_stacking_coherence_zone_a.png',
      panelData: za
    },
    zone_b: {
      id: 'zone_b' as ZoneId,
      name: zb?.panelName ? `Zone B: ${zb.panelName}` : 'Zone B: Panel 6 (Transition Advance)',
      shortLabel: 'Zone B (Transition)',
      category: 'Transition Sag Zone',
      colorBadge: 'bg-orange-100 text-orange-800 border-orange-200',
      centerLat: lat + 0.0016,
      centerLon: lon + 0.0015,
      maxRate: zb ? (zb.roofManagement === 'Caving' ? (zb.miningMethod === 'Longwall' ? 18.0 : 15.6) : 4.2) : 15.6,
      maxSagMm: zb ? Math.round((zb.roofManagement === 'Caving' ? (zb.miningMethod === 'Longwall' ? 0.65 : 0.42) : 0.10) * zb.extractionThickness * 1000) : 1180,
      riskLevel: 'Moderate Risk',
      nodeCount: 5,
      description: zb ? `${zb.miningMethod} excavation in ${zb.panelName || 'Panel 6'}. Depth H=${zb.depthOfCover}m, m=${zb.extractionThickness}m with ${zb.roofManagement} & ${zb.commProtocol} sensors.` : 'Adjacent extraction face. Perimeters overlap across barrier pillars with shared tensile flexure.',
      modelSrc: '/interactive_strata_3d_zone_b.html',
      insarPng: '/insar_stacking_coherence_zone_b.png',
      panelData: zb
    },
    zone_c: {
      id: 'zone_c' as ZoneId,
      name: zc?.panelName ? `Zone C: ${zc.panelName}` : 'Zone C: Panel 4 (Stabilized Stowed Goaf)',
      shortLabel: 'Zone C (Stabilized)',
      category: 'Low Residual Settlement',
      colorBadge: 'bg-amber-100 text-amber-800 border-amber-200',
      centerLat: lat - 0.0028,
      centerLon: lon - 0.0032,
      maxRate: zc ? (zc.roofManagement === 'Caving' ? 12.0 : 4.2) : 4.2,
      maxSagMm: zc ? Math.round((zc.roofManagement === 'Caving' ? 0.40 : 0.10) * zc.extractionThickness * 1000) : 240,
      riskLevel: 'Low Risk',
      nodeCount: 3,
      description: zc ? `${zc.miningMethod} in ${zc.panelName || 'Panel 4'}. Depth H=${zc.depthOfCover}m, m=${zc.extractionThickness}m with ${zc.roofManagement} & ${zc.commProtocol} sensors.` : 'Hydraulically sand-stowed goaf. Strata deflection is stabilized and minimal.',
      modelSrc: '/interactive_strata_3d_zone_c.html',
      insarPng: '/insar_stacking_coherence_zone_c.png',
      panelData: zc
    }
  }

  const activeZone = zonesConfig[selectedZoneId]
  const totalLeaseNodes =
    zonesConfig.zone_a.nodeCount +
    zonesConfig.zone_b.nodeCount +
    zonesConfig.zone_c.nodeCount // 16 nodes total

  // Master Access Credentials Generation
  const collierySlug =
    config.mineName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) ||
    'singhali'
  const masterEmail = `admin.${collierySlug}@bhurakshak.gov.in`
  const masterPassword = `MINE-${config.cityName.toUpperCase()}-${Math.floor(
    1000 + Math.random() * 9000
  )}-SECURE`

  // --------------------------------------------------------------------------
  // 1. SCROLL RESTORATION: ALWAYS OPEN AT TOP OF PAGE
  // --------------------------------------------------------------------------
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    const frameId = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })

    return () => cancelAnimationFrame(frameId)
  }, [])

  // --------------------------------------------------------------------------
  // 2. LEAFLET MAP INITIALIZATION: OVERLAPPING PERIMETERS FOR ZONE A & B
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat - 0.0003, lon - 0.0004],
      zoom: 16,
      zoomControl: false
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri World Imagery',
        maxZoom: 19
      }
    )

    const topoLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: 'CartoDB Positron',
        maxZoom: 19
      }
    )

    if (mapType === 'satellite') {
      satelliteLayer.addTo(map)
    } else {
      topoLayer.addTo(map)
    }

    const meterToLat = 1 / 111320
    const meterToLon = 1 / (111320 * Math.cos((lat * Math.PI) / 180))

    const addNodeMarker = (
      nId: string,
      nType: string,
      nZone: string,
      nLat: number,
      nLon: number,
      color: string
    ) => {
      const customIcon = L.divIcon({
        className: 'custom-node-pin',
        html: `
          <div style="
            background: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 8px;
            font-weight: 800;
          ">
            <span>●</span>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })

      const marker = L.marker([nLat, nLon], { icon: customIcon }).addTo(map)
      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; padding: 4px;">
          <b style="color: #0f172a; font-size: 12px;">${nId}</b><br/>
          <span style="color: #64748b;">Target Zone:</span> <b>${nZone}</b><br/>
          <span style="color: #64748b;">Sensor Hardware:</span> <b>${nType}</b><br/>
          <span style="color: #64748b;">Telemetry:</span> ${config.commProtocol} 868MHz Mesh<br/>
          <span style="color: #10b981; font-weight: 700;">● Planned Deployment (Phase B)</span>
        </div>
      `)

      marker.on('click', () => {
        setSelectedNode({
          id: nId,
          type: nType,
          zone: nZone,
          lat: nLat,
          lon: nLon,
          status: 'Planned Deploy'
        })
      })
    }

    // ------------------------------------------------------------------------
    // RENDER ZONE A: PANEL 7 (ACTIVE CRITICAL CAVING)
    // ------------------------------------------------------------------------
    const cA = zonesConfig.zone_a
    L.polygon(generateOrganicContour(cA.centerLat, cA.centerLon, 80, 68, 38, 0.16, 0.05), {
      color: '#9333ea',
      weight: 2.2,
      fillColor: '#7e22ce',
      fillOpacity: 0.45
    })
      .addTo(map)
      .bindTooltip('<b>Zone A: Compression Core</b><br/>Rate: 24 - 28.2 mm/yr<br/>Cumulative Sag: -2240 mm', { sticky: false })

    L.polygon(generateOrganicContour(cA.centerLat, cA.centerLon, 135, 110, 38, 0.20, 0.06), {
      color: '#f97316',
      weight: 2,
      dashArray: '3, 3',
      fillColor: '#f97316',
      fillOpacity: 0.28
    })
      .addTo(map)
      .bindTooltip('<b>Zone A: Annular Tension Ring</b><br/>Rate: 14 - 22 mm/yr<br/>Peak Tensile Shear Hazard', { sticky: false })

    L.polygon(generateOrganicContour(cA.centerLat, cA.centerLon, 185, 150, 38, 0.22, 0.07), {
      color: '#10b981',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#10b981',
      fillOpacity: 0.08
    })
      .addTo(map)
      .bindTooltip('<b>Zone A: Outer Perimeter (Draw Limit)</b><br/>Rate: 1 - 5 mm/yr', { sticky: false })

    addNodeMarker('GW-MASTER-01', 'Central LoRaWAN Master Gateway', 'Zone A (Core)', cA.centerLat, cA.centerLon, '#0f172a')
    addNodeMarker('NODE-A01', 'Biaxial Tiltmeter + Extensometer', 'Zone A (Core)', cA.centerLat + 25 * meterToLat, cA.centerLon + 20 * meterToLon, '#7e22ce')
    addNodeMarker('NODE-A02', 'Biaxial Tiltmeter + Extensometer', 'Zone A (Core)', cA.centerLat - 30 * meterToLat, cA.centerLon - 15 * meterToLon, '#7e22ce')
    addNodeMarker('NODE-A03', 'Deep Wire Borehole Probe', 'Zone A (Core)', cA.centerLat + 15 * meterToLat, cA.centerLon - 25 * meterToLon, '#7e22ce')
    addNodeMarker('NODE-A04', 'Shear Inclinometer Array', 'Zone A (Tension)', cA.centerLat + 75 * meterToLat, cA.centerLon + 60 * meterToLon, '#f97316')
    addNodeMarker('NODE-A05', 'Shear Inclinometer Array', 'Zone A (Tension)', cA.centerLat - 70 * meterToLat, cA.centerLon - 55 * meterToLon, '#f97316')
    addNodeMarker('NODE-A06', 'Strain Gauge Array', 'Zone A (Tension)', cA.centerLat + 50 * meterToLat, cA.centerLon - 65 * meterToLon, '#f97316')
    addNodeMarker('NODE-A07', 'Inter-Panel Shared Barrier Anchor', 'Zone A/B Overlap', cA.centerLat + 125 * meterToLat, cA.centerLon + 95 * meterToLon, '#10b981')

    // ------------------------------------------------------------------------
    // RENDER ZONE B: PANEL 6 (ADJACENT TRANSITION ADVANCE)
    // ------------------------------------------------------------------------
    const cB = zonesConfig.zone_b
    L.polygon(generateOrganicContour(cB.centerLat, cB.centerLon, 70, 58, 40, 0.14, 0.05), {
      color: '#ea580c',
      weight: 2,
      fillColor: '#ea580c',
      fillOpacity: 0.35
    })
      .addTo(map)
      .bindTooltip('<b>Zone B: Advance Sag Center</b><br/>Rate: 10 - 15.6 mm/yr<br/>Sag: -1180 mm', { sticky: false })

    L.polygon(generateOrganicContour(cB.centerLat, cB.centerLon, 130, 105, 40, 0.18, 0.06), {
      color: '#eab308',
      weight: 1.5,
      dashArray: '3, 3',
      fillColor: '#eab308',
      fillOpacity: 0.12
    })
      .addTo(map)
      .bindTooltip('<b>Zone B: Overlapping Influence Perimeter</b><br/>Rate: 2 - 8 mm/yr (Inter-Panel Strata Flexure)', { sticky: false })

    addNodeMarker('NODE-B01', 'Tiltmeter Array + Extensometer', 'Zone B (Center)', cB.centerLat, cB.centerLon, '#ea580c')
    addNodeMarker('NODE-B02', 'Flank Surface Extensometer', 'Zone B (Flank)', cB.centerLat + 40 * meterToLat, cB.centerLon + 30 * meterToLon, '#f59e0b')
    addNodeMarker('NODE-B03', 'Flank Surface Extensometer', 'Zone B (Flank)', cB.centerLat - 35 * meterToLat, cB.centerLon - 30 * meterToLon, '#f59e0b')
    addNodeMarker('NODE-B04', 'Strain Gauge Array', 'Zone B (Flank)', cB.centerLat + 25 * meterToLat, cB.centerLon - 35 * meterToLon, '#f59e0b')
    addNodeMarker('NODE-B05', 'Outer Boundary Anchor', 'Zone B (Perimeter)', cB.centerLat + 80 * meterToLat, cB.centerLon + 65 * meterToLon, '#10b981')

    // ------------------------------------------------------------------------
    // RENDER ZONE C: PANEL 4 (STABILIZED SAND STOWING GOAF)
    // ------------------------------------------------------------------------
    const cC = zonesConfig.zone_c
    L.polygon(generateOrganicContour(cC.centerLat, cC.centerLon, 90, 75, 25, 0.1, 0.05), {
      color: '#ca8a04',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#eab308',
      fillOpacity: 0.12
    })
      .addTo(map)
      .bindTooltip('<b>Zone C: Stabilized Stowed Goaf</b><br/>Rate: 2 - 4.2 mm/yr (Compacted Backfill)', { sticky: false })

    addNodeMarker('NODE-C01', 'Settlement Potentiometer', 'Zone C (Stowed Goaf)', cC.centerLat, cC.centerLon, '#ca8a04')
    addNodeMarker('NODE-C02', 'Periodic Baseline Tiltmeter', 'Zone C (Perimeter)', cC.centerLat + 45 * meterToLat, cC.centerLon + 35 * meterToLon, '#10b981')
    addNodeMarker('NODE-C03', 'Periodic Baseline Tiltmeter', 'Zone C (Perimeter)', cC.centerLat - 40 * meterToLat, cC.centerLon - 35 * meterToLon, '#10b981')

    mapInstanceRef.current = map

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    })
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [config, mapType])

  const focusZoneOnMap = (zid: ZoneId) => {
    setSelectedZoneId(zid)
    if (mapInstanceRef.current) {
      const target = zonesConfig[zid]
      mapInstanceRef.current.flyTo([target.centerLat, target.centerLon], 16.5, {
        duration: 1.0
      })
    }
  }

  const resetFullCollieryView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat - 0.0003, lon - 0.0004], 16, {
        duration: 0.8
      })
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(masterPassword)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 3000)
  }

  const copyField = (text: string, field: 'email' | 'passkey') => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2500)
  }

  // Active zone transect data
  const activeZoneInSar = insarData?.zones?.[selectedZoneId]
  const currentTransect: TransectPoint[] =
    activeZoneInSar && activeTransectTab === 'dip'
      ? activeZoneInSar.dip_transect
      : activeZoneInSar
      ? activeZoneInSar.strike_transect
      : []

  return (
    <div className="w-full max-w-6xl mx-auto space-y-7">
      {/* Lightbox Modal for High-Resolution InSAR Dual Panel */}
      {showImageLightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setShowImageLightbox(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  NRSC Bhoonidhi InSAR Analysis • {activeZone.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Dual-panel interferometric geodetic visualization (Sentinel-1 C-SAR TOPS Descending Track 63)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImageLightbox(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={activeZone.insarPng}
              alt="High Resolution InSAR and Coherence Gradient Analysis"
              className="w-full h-auto rounded-xl border border-slate-800 object-contain max-h-[75vh]"
            />
          </div>
        </div>
      )}

      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight">
              Phase A Geotechnical Pre-Calculation & Multi-Zone InSAR Planning
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Colliery: <b className="text-slate-800">{config.mineName}</b> •{' '}
            {config.cityName}, {config.stateName} ({config.latitude}° N,{' '}
            {config.longitude}° E) • <span className="font-semibold text-emerald-700">Adjacent Overlapping Panels (Zone A & B)</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit Form</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onProceedToLogin({ email: masterEmail, pass: masterPassword })
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shadow-sm shadow-emerald-600/20"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 1: TOP 2-COLUMN GRID (MAP ON LEFT, 2 BALANCED CARDS ON RIGHT)  */}
      {/* Both columns align vertically with matching top & bottom edges        */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT: LEAFLET GIS SATELLITE MAP CARD (COL 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          {/* Map Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Singhali Mines GIS • Multi-Panel Subsidence Mesh
              </h3>
            </div>

            {/* Map Style Toggle */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-600 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-2.5 py-1 rounded-md transition ${
                  mapType === 'satellite'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => setMapType('topo')}
                className={`px-2.5 py-1 rounded-md transition ${
                  mapType === 'topo'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Topographic
              </button>
            </div>
          </div>

          {/* Zone Quick Focus Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold">
            <span className="text-slate-400 text-[10px] uppercase mr-1">Focus Zone:</span>
            <button
              type="button"
              onClick={resetFullCollieryView}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 transition"
            >
              🌐 Full Area
            </button>
            {(Object.keys(zonesConfig) as ZoneId[]).map((zid) => {
              const z = zonesConfig[zid]
              const isSelected = selectedZoneId === zid
              return (
                <button
                  key={zid}
                  type="button"
                  onClick={() => focusZoneOnMap(zid)}
                  className={`px-2.5 py-1 rounded-lg border transition ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {z.shortLabel}
                </button>
              )
            })}
          </div>

          {/* Actual Leaflet Map Canvas (flex-1 to fill vertical space evenly) */}
          <div className="relative w-full flex-1 min-h-[360px] sm:min-h-[390px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Floating Legend */}
            <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-3 shadow-lg text-[10px] space-y-1.5 pointer-events-auto max-w-[200px]">
              <div className="font-extrabold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center justify-between">
                <span>Singhali Panels</span>
                <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono font-bold">
                  16 Nodes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 border border-purple-800 flex-shrink-0" />
                <span className="font-bold text-slate-800">
                  Zone A: Critical (&gt;22 mm/yr)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-orange-700 flex-shrink-0" />
                <span className="font-bold text-slate-800">
                  Zone B: Transition (10-18 mm/yr)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600 flex-shrink-0" />
                <span className="font-bold text-slate-800">
                  Zone C: Stabilized (2-5 mm/yr)
                </span>
              </div>
              <div className="pt-1 border-t border-slate-100 text-[9px] text-slate-500 leading-tight">
                *Zone A & B perimeters touch & overlap across inter-panel barrier.
              </div>
            </div>

            {/* Node Inspection Pill if clicked */}
            {selectedNode && (
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[1000] bg-[#0f172a] text-white rounded-xl p-3 shadow-xl text-xs max-w-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedNode.id}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedNode.zone}
                  </span>
                </div>
                <p className="font-semibold text-slate-200 mt-1">
                  {selectedNode.type}
                </p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Coords: {selectedNode.lat.toFixed(5)}° N,{' '}
                  {selectedNode.lon.toFixed(5)}° E
                </p>
              </div>
            )}
          </div>

          {/* Bottom Map Stats Cards (3 Columns for Zone A, B, C) */}
          <div className="grid grid-cols-3 gap-3 text-center pt-1">
            <div
              onClick={() => focusZoneOnMap('zone_a')}
              className={`p-3 rounded-2xl border cursor-pointer transition ${
                selectedZoneId === 'zone_a'
                  ? 'bg-purple-100/90 border-purple-400 ring-2 ring-purple-300 shadow-sm'
                  : 'bg-purple-50/70 border-purple-200 hover:bg-purple-100/60'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-purple-700 block">
                Zone A (Critical)
              </span>
              <p className="text-xs sm:text-sm font-black text-purple-950 mt-0.5">
                8 Nodes • 28.2 mm/yr
              </p>
              <span className="text-[9px] text-purple-600 block mt-0.5">Active Longwall Caving</span>
            </div>

            <div
              onClick={() => focusZoneOnMap('zone_b')}
              className={`p-3 rounded-2xl border cursor-pointer transition ${
                selectedZoneId === 'zone_b'
                  ? 'bg-orange-100/90 border-orange-400 ring-2 ring-orange-300 shadow-sm'
                  : 'bg-orange-50/70 border-orange-200 hover:bg-orange-100/60'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-orange-700 block">
                Zone B (Transition)
              </span>
              <p className="text-xs sm:text-sm font-black text-orange-950 mt-0.5">
                5 Nodes • 15.6 mm/yr
              </p>
              <span className="text-[9px] text-orange-600 block mt-0.5">Overlapping Perimeter</span>
            </div>

            <div
              onClick={() => focusZoneOnMap('zone_c')}
              className={`p-3 rounded-2xl border cursor-pointer transition ${
                selectedZoneId === 'zone_c'
                  ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-300 shadow-sm'
                  : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/60'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-amber-700 block">
                Zone C (Stabilized)
              </span>
              <p className="text-xs sm:text-sm font-black text-amber-950 mt-0.5">
                3 Nodes • 4.2 mm/yr
              </p>
              <span className="text-[9px] text-amber-600 block mt-0.5">Sand-Stowed Goaf</span>
            </div>
          </div>
        </div>

        {/* RIGHT: GEOTECHNICAL PROFILE & HARDWARE ALLOCATION DIV (COL 5) */}
        {/* Vertically aligned with the Left GIS Map Card */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-5 sm:gap-6">
          {/* 1. KNOTHE SUBSIDENCE PROFILE */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Geotechnical Profile • {activeZone.shortLabel}
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Smax = {activeZone.maxSagMm} mm
              </span>
            </div>

            {/* SVG Cross-Section Curve */}
            <div className="w-full bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>-1.5R</span>
                <span className="text-rose-600 font-bold">Center (x=0)</span>
                <span>+1.5R</span>
              </div>

              <div className="h-28 w-full flex items-center justify-center relative my-auto">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 300 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="basinGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  <line
                    x1="0"
                    y1="15"
                    x2="300"
                    y2="15"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />

                  <path
                    d={`
                      M 0 15
                      C 60 15, 100 ${15 + (activeZone.maxSagMm / 2240) * 70}, 150 ${15 + (activeZone.maxSagMm / 2240) * 70}
                      C 200 ${15 + (activeZone.maxSagMm / 2240) * 70}, 240 15, 300 15
                    `}
                    fill="url(#basinGrad)"
                    stroke={selectedZoneId === 'zone_a' ? '#9333ea' : selectedZoneId === 'zone_b' ? '#ea580c' : '#ca8a04'}
                    strokeWidth="2.5"
                  />

                  <circle
                    cx="150"
                    cy={15 + (activeZone.maxSagMm / 2240) * 70}
                    r="4"
                    fill={selectedZoneId === 'zone_a' ? '#9333ea' : '#ea580c'}
                  />
                </svg>

                <div className="absolute bottom-1 font-mono text-[10px] font-extrabold text-slate-800 bg-white/95 px-2 py-0.5 rounded shadow-xs border border-slate-200">
                  Peak Sag: -{activeZone.maxSagMm} mm
                </div>
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    InSAR Annual Rate
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {activeZone.maxRate} mm/year
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    DGMS Risk Status
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {activeZone.riskLevel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. HARDWARE ALLOCATION CARD */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Hardware Node Allocation
                </h3>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                {totalLeaseNodes} Total Nodes
              </span>
            </div>

            <div className="space-y-2 text-xs flex-1 flex flex-col justify-around">
              <div
                onClick={() => focusZoneOnMap('zone_a')}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                  selectedZoneId === 'zone_a' ? 'bg-purple-100/80 border-purple-400' : 'bg-purple-50/70 border-purple-200 hover:bg-purple-100/50'
                }`}
              >
                <div>
                  <span className="font-extrabold text-purple-950 block">
                    Zone A: Panel 7 (Critical Core)
                  </span>
                  <span className="text-[10px] text-purple-700">
                    Biaxial Tilts + Wire Borehole Probes
                  </span>
                </div>
                <span className="text-sm font-black text-purple-700">8 Nodes (High)</span>
              </div>

              <div
                onClick={() => focusZoneOnMap('zone_b')}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                  selectedZoneId === 'zone_b' ? 'bg-orange-100/80 border-orange-400' : 'bg-orange-50/70 border-orange-200 hover:bg-orange-100/50'
                }`}
              >
                <div>
                  <span className="font-extrabold text-orange-950 block">
                    Zone B: Panel 6 (Transition Advance)
                  </span>
                  <span className="text-[10px] text-orange-700">
                    Shear Inclinometers + Flank Sensors
                  </span>
                </div>
                <span className="text-sm font-black text-orange-700">5 Nodes (Med)</span>
              </div>

              <div
                onClick={() => focusZoneOnMap('zone_c')}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                  selectedZoneId === 'zone_c' ? 'bg-amber-100/80 border-amber-400' : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/50'
                }`}
              >
                <div>
                  <span className="font-extrabold text-amber-950 block">
                    Zone C: Panel 4 (Stabilized Goaf)
                  </span>
                  <span className="text-[10px] text-amber-700">
                    Settlement Potentiometers
                  </span>
                </div>
                <span className="text-sm font-black text-amber-700">3 Nodes (Low)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 2: EXTENDED FULL-WIDTH COLLIERY MASTER ACCESS CARD            */}
      {/* Premium, enterprise-grade dark obsidian credential console            */}
      {/* --------------------------------------------------------------------- */}
      <div className="w-full bg-[#0b1322] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        {/* Subtle ambient emerald glow */}
        <div className="absolute top-0 right-0 w-96 h-full bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Title, Active Status & Action Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-sm shadow-emerald-500/10">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  Colliery Master Access Generated
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Active Provisioning
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Your mine has been verified and registered. Keep these master credentials secure to authenticate into the live Phase B monitoring console.
              </p>
            </div>
          </div>

          {/* Login Call to Action Button */}
          <button
            type="button"
            onClick={() => onProceedToLogin({ email: masterEmail, pass: masterPassword })}
            className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm transition shadow-lg shadow-emerald-500/25 active:scale-[0.98] cursor-pointer whitespace-nowrap self-start md:self-auto"
          >
            <span>Login with Master Credentials</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>

        {/* Bottom Credentials Strip: 2 Spacious, Dedicated High-Tech Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-5 relative z-10">
          {/* 1. Master Operator Email */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-inner hover:border-slate-700/80 transition group">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Master Operator Email
              </span>
              <span className="text-emerald-300 font-mono font-bold text-xs sm:text-sm tracking-tight block select-all truncate">
                {masterEmail}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyField(masterEmail, 'email')}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-mono font-bold transition shadow-xs active:scale-95 cursor-pointer"
              title="Copy Email"
            >
              {copiedField === 'email' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-sans">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition" />
                  <span className="font-sans">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Security Passkey */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-inner hover:border-slate-700/80 transition group">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Security Passkey
              </span>
              <span className="text-white font-mono font-bold text-xs sm:text-sm tracking-wider block select-all truncate">
                {showKey ? masterPassword : '••••••••••••••••••••'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                title={showKey ? 'Hide Passkey' : 'Show Passkey'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => copyField(masterPassword, 'passkey')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-sans font-bold transition shadow-xs active:scale-95 cursor-pointer"
                title="Copy Passkey"
              >
                {copiedField === 'passkey' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 2: FULL-WIDTH 3D STRATA DIGITAL TWIN (SPACIOUS, UN-CONGESTED)  */}
      {/* --------------------------------------------------------------------- */}
      <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        {/* Sleek Single-Line Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight whitespace-nowrap">
              GeoGem 3D Strata Digital Twin
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase whitespace-nowrap">
              Interactive WebGL
            </span>
          </div>

          {/* Controls: Zone Selector on ONE Line */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
              Select Subsidence Zone:
            </span>
            <div className="relative">
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value as ZoneId)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-extrabold rounded-xl py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs transition"
              >
                <option value="zone_a">Zone A: Panel 7 (Critical Subsidence)</option>
                <option value="zone_b">Zone B: Panel 6 (Transition Advance - Overlapping)</option>
                <option value="zone_c">Zone C: Panel 4 (Stabilized Stowing)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <a
              href={activeZone.modelSrc}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-600 transition px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-xs"
              title="Open Fullscreen 3D View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fullscreen</span>
            </a>
          </div>
        </div>

        {/* Informative Sub-Banner */}
        <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-600 font-medium">
            Viewing: <b className="text-slate-900">{activeZone.name}</b> • {activeZone.description}
          </span>
          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border self-start sm:self-auto ${activeZone.colorBadge}`}>
            {activeZone.riskLevel}
          </span>
        </div>

        {/* Spacious 3D WebGL Canvas */}
        <div className="relative w-full h-[480px] sm:h-[520px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner bg-white">
          <iframe
            key={selectedZoneId}
            src={activeZone.modelSrc}
            className="w-full h-full border-0"
            scrolling="no"
            title={`GeoGem 3D Strata - ${activeZone.name}`}
          />
        </div>

        {/* 3D Strata Legend Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-bold text-slate-600 pt-1">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-500 flex-shrink-0" />
            <span>Subsided Surface (Bowl)</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#a8967b] flex-shrink-0" />
            <span>Sandstone Main Roof (-12m)</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#334155] flex-shrink-0" />
            <span>Shale Roof (-20m)</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-950 flex-shrink-0" />
            <span>Coal Seam Pillars (-28m)</span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 3: FULL-WIDTH NRSC BHOONIDHI STACKING-INSAR & COHERENCE        */}
      {/* --------------------------------------------------------------------- */}
      <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Section Header & Zone Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <Satellite className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight">
                ISRO NRSC Bhoonidhi Stacking-InSAR & Coherence Gradient Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Multi-temporal interferometric radar processing calibrated to Indian Gondwana Coalfields. Integrates C-band SAR datasets from{' '}
              <a
                href="https://bhoonidhi.nrsc.gov.in/bhoonidhi/index.html"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
              >
                <span>ISRO NRSC Bhoonidhi Open Geoportal</span>
                <ExternalLink className="w-3 h-3" />
              </a>{' '}
              for real deformation velocity (mm/year) and shear strain gradient mapping across each active panel.
            </p>
          </div>

          {/* InSAR Zone Selector Dropdown */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">InSAR Zone:</span>
            <div className="relative">
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value as ZoneId)}
                className="appearance-none bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-extrabold rounded-xl py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs transition"
              >
                <option value="zone_a">Zone A: Panel 7 (Active High Risk)</option>
                <option value="zone_b">Zone B: Panel 6 (Transition Advance - Overlapping)</option>
                <option value="zone_c">Zone C: Panel 4 (Stabilized Goaf)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Top Key InSAR Indicators for Selected Zone */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Max Subsidence Rate
            </span>
            <span className="text-base font-black text-rose-600 mt-1 block">
              {activeZoneInSar ? activeZoneInSar.max_subsidence_rate_mm_year : activeZone.maxRate} mm/yr
            </span>
            <span className="text-[9px] text-slate-400">Peak LOS Velocity</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Mean Active Rate
            </span>
            <span className="text-base font-black text-amber-600 mt-1 block">
              {activeZoneInSar ? activeZoneInSar.mean_subsidence_rate_mm_year : (activeZone.maxRate * 0.45).toFixed(1)} mm/yr
            </span>
            <span className="text-[9px] text-slate-400">Zone Average</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Peak Coherence Grad
            </span>
            <span className="text-base font-black text-rose-700 mt-1 block">
              {activeZoneInSar ? activeZoneInSar.peak_coherence_gradient : 0.927}
            </span>
            <span className="text-[9px] text-slate-400">Spatial Shear Index</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Cumulative Sag Smax
            </span>
            <span className="text-base font-black text-slate-900 mt-1 block">
              {activeZone.maxSagMm} mm
            </span>
            <span className="text-[9px] text-slate-400">Strata Deflection</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Zone Risk Status
            </span>
            <span className="text-base font-black text-purple-700 mt-1 block">
              {activeZone.riskLevel}
            </span>
            <span className="text-[9px] text-slate-400">DGMS Categorization</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Hardware Frequency
            </span>
            <span className="text-base font-black text-emerald-600 mt-1 block">
              {activeZone.nodeCount} Nodes
            </span>
            <span className="text-[9px] text-slate-400">
              {selectedZoneId === 'zone_a' ? 'Dense Mesh' : selectedZoneId === 'zone_b' ? 'Transition Grid' : 'Goaf Monitored'}
            </span>
          </div>
        </div>

        {/* Dual Panel InSAR Visualization Display for Selected Zone */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Multi-Temporal Stacking-InSAR & Interferometric Coherence Gradient • {activeZone.name}
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                300 DPI Geocoded
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowImageLightbox(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-600 transition px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Enlarge View</span>
            </button>
          </div>

          {/* Dual Panel Image Container */}
          <div
            className="group relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white cursor-pointer"
            onClick={() => setShowImageLightbox(true)}
          >
            <img
              key={activeZone.insarPng}
              src={activeZone.insarPng}
              alt={`Stacking-InSAR and Coherence Gradient for ${activeZone.name}`}
              className="w-full h-auto object-cover transition duration-300 group-hover:scale-[1.01]"
            />
            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition flex items-center justify-center pointer-events-none">
              <span className="opacity-0 group-hover:opacity-100 transition px-3.5 py-1.5 rounded-xl bg-white/95 text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Click to view full resolution</span>
              </span>
            </div>
          </div>

          {/* Scientific Methodology Explanatory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>(a) Stacking-InSAR Deformation Rate (mm/year) • {activeZone.shortLabel}</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {selectedZoneId === 'zone_c' ? (
                  <>
                    Stabilized sand-stowed goaf. Shows uniform low displacement (<b>4.2 mm/year max</b>) due to compaction resistance of hydraulic sand backfilling under the sandstone roof.
                  </>
                ) : selectedZoneId === 'zone_b' ? (
                  <>
                    Advancing extraction panel with moderate deformation (<b>15.6 mm/year max</b>). Contours touch and overlap with Zone A across inter-panel chain pillars.
                  </>
                ) : (
                  <>
                    Active caving panel with maximum geodetic rate of <b>28.2 mm/year</b>. Elliptical elongation reflects the 35° dip of the Barakar coal seam.
                  </>
                )}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span>(b) Interferometric Coherence Gradient • {activeZone.shortLabel}</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {selectedZoneId === 'zone_c' ? (
                  <>
                    Low shear gradient across the backfilled area. Prevents formation of surface tension cracks.
                  </>
                ) : selectedZoneId === 'zone_b' ? (
                  <>
                    Moderate coherence decorrelation marking the advancing extraction boundary. Shows inter-panel tension continuity with Zone A.
                  </>
                ) : (
                  <>
                    Prominent <b>Annular Tension Ring (Cracking Boundary)</b> where spatial shear gradient peaks at 0.93, encircling the low-gradient central <b>Compression Core</b>.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* INTERACTIVE SUBSIDENCE VELOCITY TRANSECT GRAPH (MM/YEAR)            */}
        {/* ------------------------------------------------------------------- */}
        <div className="pt-4 border-t border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Cross-Sectional Geodetic Transect • {activeZone.name}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hover along the cross-section to inspect localized deformation rate (mm/year) and coherence gradient.
              </p>
            </div>

            {/* Profile Tab Toggle */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setActiveTransectTab('dip')
                  setHoveredPoint(null)
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTransectTab === 'dip'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Dip Transect (N-S Profile)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTransectTab('strike')
                  setHoveredPoint(null)
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTransectTab === 'strike'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Strike Transect (E-W Profile)
              </button>
            </div>
          </div>

          {/* Interactive Transect SVG Chart */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 relative overflow-hidden">
            {/* Top Chart Legends */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-purple-600 rounded-full" />
                  <span className="font-bold text-slate-800">
                    Deformation Rate (mm/year)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-rose-600 rounded-full border-t border-dashed" />
                  <span className="font-bold text-slate-800">
                    Coherence Gradient (0.0 to 1.0)
                  </span>
                </div>
              </div>

              {hoveredPoint ? (
                <div className="flex items-center gap-3 font-mono text-[11px] bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-xs">
                  <span className="text-slate-500">
                    Dist:{' '}
                    <b className="text-slate-800">
                      {hoveredPoint.northing_m ?? hoveredPoint.easting_m} m
                    </b>
                  </span>
                  <span className="text-purple-700">
                    Rate: <b>{hoveredPoint.deformation_rate_mm_year} mm/yr</b>
                  </span>
                  <span className="text-rose-600">
                    Gradient: <b>{hoveredPoint.coherence_gradient}</b>
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">
                  Hover across the profile to view coordinates
                </span>
              )}
            </div>

            {/* SVG Canvas for Transect */}
            <div className="w-full h-56 sm:h-64 relative">
              {currentTransect.length > 0 ? (
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 800 240"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="rateFillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9333ea" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {[0, 60, 120, 180, 240].map((yVal, i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={yVal}
                      x2="800"
                      y2={yVal}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      strokeDasharray="2, 2"
                    />
                  ))}

                  {/* Deformation Rate Area & Curve */}
                  {(() => {
                    const maxRate = 30.0
                    const pts = currentTransect.map((pt, idx) => {
                      const x = (idx / (currentTransect.length - 1)) * 800
                      const y = 230 - (pt.deformation_rate_mm_year / maxRate) * 210
                      return { x, y, pt }
                    })

                    const pathD = pts.reduce((acc, p, idx) => {
                      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
                    }, '')

                    const areaD = `${pathD} L 800 240 L 0 240 Z`

                    // Coherence Gradient Path
                    const gradPts = currentTransect.map((pt, idx) => {
                      const x = (idx / (currentTransect.length - 1)) * 800
                      const y = 230 - pt.coherence_gradient * 200
                      return { x, y }
                    })
                    const gradPathD = gradPts.reduce((acc, p, idx) => {
                      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
                    }, '')

                    return (
                      <>
                        <path d={areaD} fill="url(#rateFillGrad)" />
                        <path
                          d={pathD}
                          fill="none"
                          stroke={selectedZoneId === 'zone_a' ? '#7e22ce' : selectedZoneId === 'zone_b' ? '#ea580c' : '#10b981'}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <path
                          d={gradPathD}
                          fill="none"
                          stroke="#e11d48"
                          strokeWidth="2"
                          strokeDasharray="4, 3"
                          strokeLinecap="round"
                        />
                      </>
                    )
                  })()}

                  {/* Interactive Invisible Hover Bars */}
                  {currentTransect.map((pt, idx) => {
                    const x = (idx / (currentTransect.length - 1)) * 800
                    const width = 800 / currentTransect.length
                    return (
                      <rect
                        key={idx}
                        x={x - width / 2}
                        y={0}
                        width={width}
                        height={240}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoveredPoint(pt)}
                      />
                    )
                  })}
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Loading InSAR Transect Data...
                </div>
              )}
            </div>

            {/* Bottom Axis Labels */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
              <span>0 m (Perimeter)</span>
              <span>200 m</span>
              <span className="font-bold text-slate-700">400 m (Zone Midpoint)</span>
              <span>600 m</span>
              <span>800 m (Opposite Boundary)</span>
            </div>
          </div>
        </div>

        {/* Phase A Demarcation Banner */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-extrabold text-white block">
                Phase A Pre-Calculation Complete for Active Panels
              </span>
              <span className="text-[11px] text-slate-400">
                Satellite InSAR deformation boundaries and strategic node allocations for Zone A, B, and C are locked. Live optical GIS and sensor telemetry feeds will activate upon Phase B deployment.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onProceedToLogin({ email: masterEmail, pass: masterPassword })
            }
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-2"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
          </button>
        </div>
      </div>
    </div>
  )
}
