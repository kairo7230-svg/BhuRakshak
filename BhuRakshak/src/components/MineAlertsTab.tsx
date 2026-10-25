import React, { useState } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Activity,
  Zap,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Clock,
  Radio,
  Sliders,
  CheckCircle2,
  HardHat,
  ShieldCheck,
  Compass,
  FileText,
  Layers,
  MapPin,
  ChevronRight,
  Share2,
  Download
} from 'lucide-react'

export interface Props {
  isSimulatedAlert?: boolean
  onToggleSimulation?: () => void
  currentRole?: 'operator' | 'regulator' | 'planner' | 'all'
  collieryName?: string
}

export default function MineAlertsTab({
  isSimulatedAlert: propIsSimulatedAlert = false,
  onToggleSimulation,
  currentRole = 'all',
  collieryName = 'Singhali Underground Colliery'
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
  }

  // Selected factor to highlight in the trend graph: 'all' | 'subsidence' | 'displacement' | 'tilt'
  const [selectedFactor, setSelectedFactor] = useState<'all' | 'subsidence' | 'displacement' | 'tilt'>('all')
  // Active role directive tab
  const [activeDirectiveRole, setActiveDirectiveRole] = useState<'operator' | 'regulator' | 'planner'>('operator')
  // Hovered data point index on Trend Graph
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null)
  // Hovered data point index on Prediction Graph
  const [hoveredPredIdx, setHoveredPredIdx] = useState<number | null>(null)

  // =========================================================================
  // SENSOR DATA VALUES (BASELINE VS. SIMULATED LARGE DELTA SURGE)
  // =========================================================================
  const sensorData = isSimulatedAlert
    ? {
        status: 'CRITICAL',
        statusText: 'CRITICAL STRATA ACCELERATION DETECTED',
        badgeColor: 'bg-rose-500 text-white animate-pulse',
        sensorId: 'MPBX-04 & INCL-02',
        location: 'Longwall Panel 3B • Maingate Chainage 420m (Depth: 185m)',
        timestamp: 'Just now (12s ago)',
        // Factor 1: Subsidence
        subsidence: {
          current: 66.8,
          baseline: 14.2,
          delta: +52.6,
          percentChange: '+370.4%',
          threshold: 50.0,
          unit: 'mm',
          rate: '8.4 mm/h (High Risk)',
          statutoryStatus: 'EXCEEDED PERMISSIBLE ENVELOPE'
        },
        // Factor 2: Vertical Displacement
        verticalDisplacement: {
          current: -43.8,
          baseline: -8.4,
          delta: -35.4,
          percentChange: '+421.4%',
          threshold: -25.0,
          unit: 'mm',
          rate: '-5.9 mm/h (Bed Sag)',
          statutoryStatus: 'MAJOR ROOF DELAMINATION (-65m horizon)'
        },
        // Factor 3: Tilt Angle
        tiltAngle: {
          current: 4.85,
          baseline: 0.95,
          delta: +3.90,
          percentChange: '+410.5%',
          threshold: 3.0,
          unit: 'mm/m',
          rate: '0.62 mm/m/h',
          statutoryStatus: 'DGMS CMR 2017 REG. 111 BREACH'
        },
        microseismicEnergy: '890 J (Spike: +640 J)',
        chockPressure: '38.6 MPa (Overpressure Alarm)'
      }
    : {
        status: 'NORMAL',
        statusText: 'NOMINAL STRATA EQUILIBRIUM',
        badgeColor: 'bg-emerald-500 text-white',
        sensorId: 'MPBX-04 & INCL-02',
        location: 'Longwall Panel 3B • Maingate Chainage 420m (Depth: 185m)',
        timestamp: 'Real-time telemetry synchronized',
        // Factor 1: Subsidence
        subsidence: {
          current: 14.2,
          baseline: 13.8,
          delta: +0.4,
          percentChange: '+2.9%',
          threshold: 50.0,
          unit: 'mm',
          rate: '0.12 mm/h (Nominal)',
          statutoryStatus: 'WITHIN KNOTHE-SAXENA ENVELOPE'
        },
        // Factor 2: Vertical Displacement
        verticalDisplacement: {
          current: -8.4,
          baseline: -8.1,
          delta: -0.3,
          percentChange: '+3.7%',
          threshold: -25.0,
          unit: 'mm',
          rate: '-0.08 mm/h (Stable)',
          statutoryStatus: 'ELASTIC BED COMPACTION'
        },
        // Factor 3: Tilt Angle
        tiltAngle: {
          current: 0.95,
          baseline: 0.92,
          delta: +0.03,
          percentChange: '+3.2%',
          threshold: 3.0,
          unit: 'mm/m',
          rate: '0.01 mm/m/h',
          statutoryStatus: 'COMPLIANT WITH DGMS 3.0 mm/m'
        },
        microseismicEnergy: '24 J (Background Noise)',
        chockPressure: '24.2 MPa (Optimal Setting)'
      }

  // =========================================================================
  // TREND ANALYSIS DATA (PAST 24 HOURS HISTORY: BEFORE VS. AFTER CHANGE)
  // Shows baseline stability until t-2h, then the sharp surge!
  // =========================================================================
  const trendHistory = [
    { time: '-24h', label: '24h ago', sub: 12.1, disp: -7.5, tilt: 0.88, isAfterChange: false },
    { time: '-20h', label: '20h ago', sub: 12.4, disp: -7.6, tilt: 0.89, isAfterChange: false },
    { time: '-16h', label: '16h ago', sub: 12.8, disp: -7.8, tilt: 0.91, isAfterChange: false },
    { time: '-12h', label: '12h ago', sub: 13.2, disp: -8.0, tilt: 0.92, isAfterChange: false },
    { time: '-8h',  label: '8h ago',  sub: 13.6, disp: -8.2, tilt: 0.93, isAfterChange: false },
    { time: '-4h',  label: '4h ago',  sub: 14.0, disp: -8.4, tilt: 0.95, isAfterChange: false },
    // Event inflection point (t-2h)
    {
      time: '-2h',
      label: '2h ago (Event Trigger)',
      sub: isSimulatedAlert ? 28.5 : 14.1,
      disp: isSimulatedAlert ? -18.2 : -8.3,
      tilt: isSimulatedAlert ? 2.10 : 0.94,
      isAfterChange: true
    },
    {
      time: '-1h',
      label: '1h ago',
      sub: isSimulatedAlert ? 47.2 : 14.15,
      disp: isSimulatedAlert ? -31.4 : -8.35,
      tilt: isSimulatedAlert ? 3.45 : 0.945,
      isAfterChange: true
    },
    {
      time: 'Now',
      label: 'Current Reading',
      sub: isSimulatedAlert ? 66.8 : 14.2,
      disp: isSimulatedAlert ? -43.8 : -8.4,
      tilt: isSimulatedAlert ? 4.85 : 0.95,
      isAfterChange: true
    }
  ]

  // =========================================================================
  // PREDICTION DATA (FUTURE FORECAST ACCORDING TO THIS RISK FACTOR)
  // DST-GT multi-horizon predictions with P10, P50, P90 confidence bounds
  // =========================================================================
  const predictionHorizons = [
    {
      horizon: 'Now',
      label: 'Current (t₀)',
      baselinePred: 14.2,
      riskPredP50: isSimulatedAlert ? 66.8 : 14.2,
      riskPredP10: isSimulatedAlert ? 62.0 : 13.5,
      riskPredP90: isSimulatedAlert ? 71.5 : 15.0,
      leadHours: 0,
      statutoryAction: 'Continuous Monitoring'
    },
    {
      horizon: '+6h',
      label: '+6 Hours (Mid-Shift)',
      baselinePred: 15.4,
      riskPredP50: isSimulatedAlert ? 88.5 : 15.1,
      riskPredP10: isSimulatedAlert ? 80.2 : 14.2,
      riskPredP90: isSimulatedAlert ? 97.8 : 16.2,
      leadHours: 6,
      statutoryAction: isSimulatedAlert ? 'Evacuate Longwall Face' : 'Nominal Shearer Pass'
    },
    {
      horizon: '+12h',
      label: '+12 Hours (Shift Change)',
      baselinePred: 16.8,
      riskPredP50: isSimulatedAlert ? 112.4 : 16.2,
      riskPredP10: isSimulatedAlert ? 101.5 : 15.0,
      riskPredP90: isSimulatedAlert ? 124.0 : 17.5,
      leadHours: 12,
      statutoryAction: isSimulatedAlert ? 'Stop Coal Clearance • Chock Pressure Boost' : 'Routine Chock Advance'
    },
    {
      horizon: '+24h',
      label: '+24 Hours (Daily)',
      baselinePred: 18.5,
      riskPredP50: isSimulatedAlert ? 138.2 : 17.9,
      riskPredP10: isSimulatedAlert ? 123.0 : 16.2,
      riskPredP90: isSimulatedAlert ? 154.5 : 19.8,
      leadHours: 24,
      statutoryAction: isSimulatedAlert ? 'Railway Speed Restriction to 15km/h' : 'Check Extensometers'
    },
    {
      horizon: '+48h',
      label: '+48 Hours (2 Days)',
      baselinePred: 20.4,
      riskPredP50: isSimulatedAlert ? 156.0 : 19.5,
      riskPredP10: isSimulatedAlert ? 138.5 : 17.8,
      riskPredP90: isSimulatedAlert ? 172.0 : 21.5,
      leadHours: 48,
      statutoryAction: isSimulatedAlert ? 'Sand Stowing Emergency Infill' : 'Hydraulic Line Inspection'
    },
    {
      horizon: '+7d',
      label: '+7 Days (Cycle End)',
      baselinePred: 22.0,
      riskPredP50: isSimulatedAlert ? 164.5 : 21.0,
      riskPredP10: isSimulatedAlert ? 145.0 : 19.0,
      riskPredP90: isSimulatedAlert ? 180.0 : 23.5,
      leadHours: 168,
      statutoryAction: isSimulatedAlert ? 'Full Trough Asymptotic Equilibrium (Saxena Cap: 168mm)' : 'Panel Survey Sign-off'
    }
  ]

  // =========================================================================
  // SVG GRAPH RENDER HELPERS
  // =========================================================================
  // Trend Graph Coordinate Scaling
  const trendSvgWidth = 720
  const trendSvgHeight = 220
  const trendPadLeft = 55
  const trendPadRight = 35
  const trendPadTop = 25
  const trendPadBottom = 35

  const trendPlotW = trendSvgWidth - trendPadLeft - trendPadRight
  const trendPlotH = trendSvgHeight - trendPadTop - trendPadBottom

  // Dynamic Y-range for Trend Graph (Subsidence mm)
  const maxTrendSub = isSimulatedAlert ? 80 : 25
  const minTrendSub = 0

  const getTrendX = (index: number) => {
    return trendPadLeft + (index / (trendHistory.length - 1)) * trendPlotW
  }

  const getTrendY = (val: number, maxVal = maxTrendSub, minVal = minTrendSub) => {
    const norm = (val - minVal) / (maxVal - minVal)
    return trendPadTop + trendPlotH - norm * trendPlotH
  }

  // Prediction Graph Coordinate Scaling
  const predSvgWidth = 720
  const predSvgHeight = 220
  const predPlotW = predSvgWidth - trendPadLeft - trendPadRight
  const predPlotH = predSvgHeight - trendPadTop - trendPadBottom
  const maxPredSub = isSimulatedAlert ? 200 : 35

  const getPredX = (index: number) => {
    return trendPadLeft + (index / (predictionHorizons.length - 1)) * predPlotW
  }

  const getPredY = (val: number) => {
    const norm = val / maxPredSub
    return trendPadTop + predPlotH - norm * predPlotH
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      
      {/* ===================================================================== */}
      {/* TOP HEADER & SIMULATION MASTER CONTROL BAR                            */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left: Hazard Identity */}
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
            isSimulatedAlert ? 'bg-rose-50 border border-rose-200 text-rose-600' : 'bg-slate-900 text-emerald-400'
          }`}>
            {isSimulatedAlert ? (
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            ) : (
              <Activity className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-slate-950 tracking-tight">
                Live Geotechnical Alerts & Risk Predictor
              </h1>
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-2xs ${sensorData.badgeColor}`}>
                {sensorData.status === 'CRITICAL' ? '⚠️ CRITICAL ANOMALY' : '✓ ALL NOMINAL'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {collieryName} • Continuous Multi-Sensor IoT Mesh & Deep Spatio-Temporal Graph Transformer (DST-GT)
            </p>
          </div>
        </div>

        {/* Right: Simulation Trigger Buttons */}
        <div className="flex items-center gap-2.5 self-stretch md:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleToggleSimulation}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shadow-xs ${
              isSimulatedAlert
                ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-500/20'
                : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white'
            }`}
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>{isSimulatedAlert ? '⚡ Anomaly Active (Click to Revert)' : '⚡ Simulate Strata Anomaly'}</span>
          </button>

          {isSimulatedAlert && (
            <button
              type="button"
              onClick={handleToggleSimulation}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Baseline</span>
            </button>
          )}
        </div>

      </div>

      {/* ===================================================================== */}
      {/* SIMULATED ALERT NOTIFICATION BANNER (When active)                    */}
      {/* ===================================================================== */}
      {isSimulatedAlert && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-rose-900 tracking-wider">
                  STATUTORY SAFETY ALERT • DGMS CMR 2017 REG. 111 EXCEEDANCE
                </span>
                <span className="text-[10px] bg-rose-200 text-rose-800 font-extrabold px-2 py-0.5 rounded-md">
                  STATION {sensorData.sensorId}
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                Sudden delta change triggered at <strong>{sensorData.location}</strong>. 
                Surface subsidence surged by <strong>+{sensorData.subsidence.delta} mm</strong> in 2 hours with tilt rate breaching <strong>4.85 mm/m</strong> (statutory limit: 3.0 mm/m). 
                Immediate pre-emptive action required for railway chainage and active longwall face.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
            <span className="text-[11px] font-bold text-rose-700 bg-white/80 px-3 py-1.5 rounded-xl border border-rose-200 font-mono">
              Lead Time to Severe Breach: 4.8h
            </span>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* THE 3 CORE SENSOR FACTORS CARDS WITH LARGE DELTA CHANGES              */}
      {/* 1. Subsidence  |  2. Vertical Displacement  |  3. Tilt Angle          */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Surface Subsidence */}
        <div className={`bg-white border rounded-2xl p-5 shadow-xs transition ${
          isSimulatedAlert ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isSimulatedAlert ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700'
              }`}>
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Surface Subsidence</h3>
                <p className="text-[10px] text-slate-400">Total Ground Sinking</p>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              isSimulatedAlert ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              Limit: {sensorData.subsidence.threshold} mm
            </span>
          </div>

          {/* Current Value & Large Delta */}
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-950 font-mono tracking-tight">
                {sensorData.subsidence.current}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">mm</span>
            </div>

            {/* Delta Callout */}
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
              isSimulatedAlert ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Δ {sensorData.subsidence.delta > 0 ? `+${sensorData.subsidence.delta}` : sensorData.subsidence.delta} mm</span>
              <span className="text-[10px] opacity-80">({sensorData.subsidence.percentChange})</span>
            </div>
          </div>

          {/* Previous baseline & Rate */}
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Previous Value:</span>
              <span className="font-bold text-slate-700 font-mono">{sensorData.subsidence.baseline} mm</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Velocity (dS/dt):</span>
              <span className={`font-bold font-mono ${isSimulatedAlert ? 'text-rose-600' : 'text-slate-700'}`}>
                {sensorData.subsidence.rate}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[10px] font-semibold text-slate-500">
            Status: <span className={isSimulatedAlert ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
              {sensorData.subsidence.statutoryStatus}
            </span>
          </div>
        </div>

        {/* Card 2: Vertical Displacement */}
        <div className={`bg-white border rounded-2xl p-5 shadow-xs transition ${
          isSimulatedAlert ? 'border-amber-300 ring-2 ring-amber-500/10' : 'border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isSimulatedAlert ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Vertical Displacement</h3>
                <p className="text-[10px] text-slate-400">Strata Bed Separation</p>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              isSimulatedAlert ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              Limit: {sensorData.verticalDisplacement.threshold} mm
            </span>
          </div>

          {/* Current Value & Large Delta */}
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-950 font-mono tracking-tight">
                {sensorData.verticalDisplacement.current}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">mm</span>
            </div>

            {/* Delta Callout */}
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
              isSimulatedAlert ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Δ {sensorData.verticalDisplacement.delta} mm</span>
              <span className="text-[10px] opacity-80">({sensorData.verticalDisplacement.percentChange})</span>
            </div>
          </div>

          {/* Previous baseline & Sag Rate */}
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Previous Value:</span>
              <span className="font-bold text-slate-700 font-mono">{sensorData.verticalDisplacement.baseline} mm</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Separation Rate:</span>
              <span className={`font-bold font-mono ${isSimulatedAlert ? 'text-amber-700' : 'text-slate-700'}`}>
                {sensorData.verticalDisplacement.rate}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[10px] font-semibold text-slate-500 truncate">
            Status: <span className={isSimulatedAlert ? 'text-amber-700 font-bold' : 'text-emerald-600'}>
              {sensorData.verticalDisplacement.statutoryStatus}
            </span>
          </div>
        </div>

        {/* Card 3: Tilt Angle */}
        <div className={`bg-white border rounded-2xl p-5 shadow-xs transition ${
          isSimulatedAlert ? 'border-purple-300 ring-2 ring-purple-500/10' : 'border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isSimulatedAlert ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
              }`}>
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Surface Tilt Angle</h3>
                <p className="text-[10px] text-slate-400">Ground Slope Gradient</p>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              isSimulatedAlert ? 'bg-rose-500 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              DGMS Max: 3.0 mm/m
            </span>
          </div>

          {/* Current Value & Large Delta */}
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-950 font-mono tracking-tight">
                {sensorData.tiltAngle.current}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">mm/m</span>
            </div>

            {/* Delta Callout */}
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
              isSimulatedAlert ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Δ +{sensorData.tiltAngle.delta} mm/m</span>
              <span className="text-[10px] opacity-80">({sensorData.tiltAngle.percentChange})</span>
            </div>
          </div>

          {/* Previous baseline & Rate */}
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Previous Value:</span>
              <span className="font-bold text-slate-700 font-mono">{sensorData.tiltAngle.baseline} mm/m</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Angular Drift:</span>
              <span className={`font-bold font-mono ${isSimulatedAlert ? 'text-purple-700' : 'text-slate-700'}`}>
                {sensorData.tiltAngle.rate}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[10px] font-semibold text-slate-500">
            Statutory: <span className={isSimulatedAlert ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
              {sensorData.tiltAngle.statutoryStatus}
            </span>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* GRAPH 1: TREND ANALYSIS ("WHAT WAS HAPPENING BEFORE VS. NOW")        */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        
        {/* Graph Header & Factor Selectors */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Historical Trend Analysis: Pre-Event Baseline vs. Accelerated Surge Now
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              24-hour synchronized telemetry showing stable steady-state followed by sudden delta divergence at t - 2h
            </p>
          </div>

          {/* Toggle Factors */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setSelectedFactor('all')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedFactor === 'all' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All 3 Factors
            </button>
            <button
              type="button"
              onClick={() => setSelectedFactor('subsidence')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedFactor === 'subsidence' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Subsidence
            </button>
            <button
              type="button"
              onClick={() => setSelectedFactor('displacement')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedFactor === 'displacement' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bed Sag
            </button>
            <button
              type="button"
              onClick={() => setSelectedFactor('tilt')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedFactor === 'tilt' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tilt Slope
            </button>
          </div>
        </div>

        {/* The Responsive SVG Trend Chart */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[650px]">
            <svg viewBox={`0 0 ${trendSvgWidth} ${trendSvgHeight}`} className="w-full h-auto select-none">
              
              {/* Background gridlines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
                const y = trendPadTop + frac * trendPlotH
                const val = Math.round(maxTrendSub - frac * (maxTrendSub - minTrendSub))
                return (
                  <g key={i}>
                    <line
                      x1={trendPadLeft}
                      y1={y}
                      x2={trendSvgWidth - trendPadRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={trendPadLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="9"
                      fontFamily="monospace"
                      fill="#94a3b8"
                    >
                      {val}mm
                    </text>
                  </g>
                )
              })}

              {/* Shaded "Before Event" vs "After Event Surge" background regions */}
              {isSimulatedAlert && (
                <>
                  {/* Before Region */}
                  <rect
                    x={trendPadLeft}
                    y={trendPadTop}
                    width={getTrendX(5) - trendPadLeft}
                    height={trendPlotH}
                    fill="#f8fafc"
                    opacity="0.8"
                  />
                  <text
                    x={trendPadLeft + 15}
                    y={trendPadTop + 18}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#64748b"
                  >
                    ← WHAT WAS HAPPENING BEFORE (STEADY BASELINE)
                  </text>

                  {/* After Region (Surge) */}
                  <rect
                    x={getTrendX(5)}
                    y={trendPadTop}
                    width={trendSvgWidth - trendPadRight - getTrendX(5)}
                    height={trendPlotH}
                    fill="#fff1f2"
                    opacity="0.5"
                  />
                  <text
                    x={getTrendX(5) + 12}
                    y={trendPadTop + 18}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#e11d48"
                  >
                    ⚡ SURGE NOW (DELTA ACCELERATION)
                  </text>

                  {/* Event Marker Vertical Line */}
                  <line
                    x1={getTrendX(5)}
                    y1={trendPadTop}
                    x2={getTrendX(5)}
                    y2={trendPadTop + trendPlotH}
                    stroke="#e11d48"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                </>
              )}

              {/* Statutory Threshold Reference Line (50 mm) */}
              {maxTrendSub >= 50 && (
                <g>
                  <line
                    x1={trendPadLeft}
                    y1={getTrendY(50)}
                    x2={trendSvgWidth - trendPadRight}
                    y2={getTrendY(50)}
                    stroke="#f43f5e"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={trendSvgWidth - trendPadRight - 5}
                    y={getTrendY(50) - 4}
                    textAnchor="end"
                    fontSize="8"
                    fontWeight="bold"
                    fill="#f43f5e"
                  >
                    DGMS Warning Limit (50mm)
                  </text>
                </g>
              )}

              {/* 1. Subsidence Curve (Rose/Red) */}
              {(selectedFactor === 'all' || selectedFactor === 'subsidence') && (
                <path
                  d={trendHistory.reduce((acc, pt, idx) => {
                    const x = getTrendX(idx)
                    const y = getTrendY(pt.sub)
                    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
                  }, '')}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* 2. Vertical Displacement Bed Sag Curve (Amber) */}
              {(selectedFactor === 'all' || selectedFactor === 'displacement') && (
                <path
                  d={trendHistory.reduce((acc, pt, idx) => {
                    const x = getTrendX(idx)
                    // Map -disp (positive magnitude for comparison)
                    const y = getTrendY(Math.abs(pt.disp))
                    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
                  }, '')}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2"
                  strokeDasharray={selectedFactor === 'all' ? '5 3' : 'none'}
                  strokeLinecap="round"
                />
              )}

              {/* 3. Tilt Angle Curve (Purple, scaled x10 for visibility) */}
              {(selectedFactor === 'all' || selectedFactor === 'tilt') && (
                <path
                  d={trendHistory.reduce((acc, pt, idx) => {
                    const x = getTrendX(idx)
                    const y = getTrendY(pt.tilt * 10)
                    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
                  }, '')}
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2"
                  strokeDasharray={selectedFactor === 'all' ? '2 2' : 'none'}
                  strokeLinecap="round"
                />
              )}

              {/* Data points & hover zones */}
              {trendHistory.map((pt, idx) => {
                const x = getTrendX(idx)
                const ySub = getTrendY(pt.sub)
                const isHovered = hoveredTrendIdx === idx

                return (
                  <g key={idx} onMouseEnter={() => setHoveredTrendIdx(idx)} onMouseLeave={() => setHoveredTrendIdx(null)}>
                    {/* Time Label on X-axis */}
                    <text
                      x={x}
                      y={trendPadTop + trendPlotH + 16}
                      textAnchor="middle"
                      fontSize="9"
                      fontFamily="monospace"
                      fill={pt.isAfterChange && isSimulatedAlert ? '#e11d48' : '#64748b'}
                      fontWeight={pt.isAfterChange && isSimulatedAlert ? 'bold' : 'normal'}
                    >
                      {pt.time}
                    </text>

                    {/* Dot on Subsidence curve */}
                    {(selectedFactor === 'all' || selectedFactor === 'subsidence') && (
                      <circle
                        cx={x}
                        cy={ySub}
                        r={isHovered ? 5.5 : 3.5}
                        fill={pt.isAfterChange && isSimulatedAlert ? '#e11d48' : '#0f172a'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Hover tooltip card */}
                    {isHovered && (
                      <g>
                        <rect
                          x={Math.min(x - 65, trendSvgWidth - 145)}
                          y={ySub - 55}
                          width="135"
                          height="48"
                          rx="8"
                          fill="#0f172a"
                          opacity="0.95"
                        />
                        <text x={Math.min(x, trendSvgWidth - 80)} y={ySub - 40} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">
                          {pt.label}
                        </text>
                        <text x={Math.min(x, trendSvgWidth - 80)} y={ySub - 28} textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">
                          Sub: {pt.sub}mm • Sag: {pt.disp}mm
                        </text>
                        <text x={Math.min(x, trendSvgWidth - 80)} y={ySub - 16} textAnchor="middle" fill="#c084fc" fontSize="8.5" fontWeight="bold">
                          Tilt: {pt.tilt} mm/m
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}

            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="w-3 h-0.5 bg-[#e11d48] rounded-full inline-block" />
              <span>Surface Subsidence (mm)</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="w-3 h-0.5 border-t border-dashed border-[#d97706] inline-block" />
              <span>Vertical Bed Sag Magnitude (|mm|)</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="w-3 h-0.5 border-t border-dotted border-[#7c3aed] inline-block" />
              <span>Tilt Slope (×10 mm/m)</span>
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {isSimulatedAlert
              ? 'Inflection point detected at t - 2h (Main roof beam shear failure)'
              : 'Strata movement rate uniform (<0.2 mm/day)'}
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* GRAPH 2: SUBSIDENCE PREDICTION ACCORDING TO THAT RISK                 */}
      {/* Forward Multi-Horizon Projections (+6h, +12h, +24h, +48h, +7d)         */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Multi-Horizon Subsidence Forecast (DST-GT Deep Learning Engine)
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Forward projection of subsidence curve conditioned on current risk surge with N.C. Saxena PINN physical asymptote
            </p>
          </div>

          {/* Lead time badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">Asymptotic Cap (Saxena):</span>
            <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              S_max = 168.0 mm
            </span>
          </div>
        </div>

        {/* The Responsive SVG Prediction Chart */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[650px]">
            <svg viewBox={`0 0 ${predSvgWidth} ${predSvgHeight}`} className="w-full h-auto select-none">
              
              {/* Background gridlines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
                const y = trendPadTop + frac * predPlotH
                const val = Math.round(maxPredSub - frac * maxPredSub)
                return (
                  <g key={i}>
                    <line
                      x1={trendPadLeft}
                      y1={y}
                      x2={predSvgWidth - trendPadRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={trendPadLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="9"
                      fontFamily="monospace"
                      fill="#94a3b8"
                    >
                      {val}mm
                    </text>
                  </g>
                )
              })}

              {/* DGMS Statutory 50mm Threshold Line */}
              <g>
                <line
                  x1={trendPadLeft}
                  y1={getPredY(50)}
                  x2={predSvgWidth - trendPadRight}
                  y2={getPredY(50)}
                  stroke="#eab308"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                />
                <text
                  x={trendPadLeft + 10}
                  y={getPredY(50) - 4}
                  fontSize="8.5"
                  fontWeight="bold"
                  fill="#ca8a04"
                >
                  DGMS 50mm Advisory Limit
                </text>
              </g>

              {/* DGMS Emergency 100mm Evacuation Line */}
              <g>
                <line
                  x1={trendPadLeft}
                  y1={getPredY(100)}
                  x2={predSvgWidth - trendPadRight}
                  y2={getPredY(100)}
                  stroke="#e11d48"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                />
                <text
                  x={trendPadLeft + 10}
                  y={getPredY(100) - 4}
                  fontSize="8.5"
                  fontWeight="bold"
                  fill="#e11d48"
                >
                  DGMS 100mm Evacuation Ceiling
                </text>
              </g>

              {/* Shaded P10 to P90 Uncertainty Envelope for Risk Curve */}
              {isSimulatedAlert && (
                <polygon
                  points={`
                    ${predictionHorizons.map((p, i) => `${getPredX(i)},${getPredY(p.riskPredP90)}`).join(' ')}
                    ${predictionHorizons.slice().reverse().map((p, i) => `${getPredX(predictionHorizons.length - 1 - i)},${getPredY(p.riskPredP10)}`).join(' ')}
                  `}
                  fill="#fda4af"
                  opacity="0.3"
                />
              )}

              {/* Nominal Pre-Risk Curve (Green dashed) */}
              <path
                d={predictionHorizons.reduce((acc, pt, idx) => {
                  const x = getPredX(idx)
                  const y = getPredY(pt.baselinePred)
                  return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
                }, '')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 3"
              />

              {/* Risk-Adjusted Prediction Curve (Red solid P50) */}
              <path
                d={predictionHorizons.reduce((acc, pt, idx) => {
                  const x = getPredX(idx)
                  const y = getPredY(pt.riskPredP50)
                  return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
                }, '')}
                fill="none"
                stroke={isSimulatedAlert ? '#e11d48' : '#10b981'}
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Points & Interactive Tooltips on Prediction Graph */}
              {predictionHorizons.map((pt, idx) => {
                const x = getPredX(idx)
                const yRisk = getPredY(pt.riskPredP50)
                const isHovered = hoveredPredIdx === idx

                return (
                  <g key={idx} onMouseEnter={() => setHoveredPredIdx(idx)} onMouseLeave={() => setHoveredPredIdx(null)}>
                    {/* Horizon label */}
                    <text
                      x={x}
                      y={trendPadTop + predPlotH + 16}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill="#0f172a"
                    >
                      {pt.horizon}
                    </text>

                    {/* Point on curve */}
                    <circle
                      cx={x}
                      cy={yRisk}
                      r={isHovered ? 6 : 4}
                      fill={isSimulatedAlert ? '#e11d48' : '#10b981'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <g>
                        <rect
                          x={Math.min(x - 75, predSvgWidth - 165)}
                          y={yRisk - 60}
                          width="155"
                          height="52"
                          rx="8"
                          fill="#0f172a"
                          opacity="0.95"
                        />
                        <text x={Math.min(x, predSvgWidth - 85)} y={yRisk - 44} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">
                          {pt.label}
                        </text>
                        <text x={Math.min(x, predSvgWidth - 85)} y={yRisk - 31} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                          Predicted: {pt.riskPredP50} mm
                        </text>
                        {isSimulatedAlert && (
                          <text x={Math.min(x, predSvgWidth - 85)} y={yRisk - 18} textAnchor="middle" fill="#fca5a5" fontSize="8" fontWeight="bold">
                            Range: [{pt.riskPredP10}mm – {pt.riskPredP90}mm]
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                )
              })}

            </svg>
          </div>
        </div>

        {/* Prediction Table Breakdown */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
          {predictionHorizons.map((h, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-black text-slate-500 uppercase block font-mono">{h.horizon}</span>
              <span className={`text-base font-black font-mono block mt-0.5 ${
                h.riskPredP50 >= 100 ? 'text-rose-600' : h.riskPredP50 >= 50 ? 'text-amber-600' : 'text-slate-900'
              }`}>
                {h.riskPredP50} mm
              </span>
              <span className="text-[9px] text-slate-500 font-medium line-clamp-1 mt-0.5" title={h.statutoryAction}>
                {h.statutoryAction}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* ===================================================================== */}
      {/* ROLE-SPECIFIC GEOTECHNICAL DIRECTIVES (OPERATOR, REGULATOR, PLANNER) */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Role-Specific Action Directives for this Risk State
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Standard operating procedures mandated by DGMS Coal Mines Regulations (CMR) 2017
            </p>
          </div>

          {/* Role switcher inside alert tab */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveDirectiveRole('operator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeDirectiveRole === 'operator' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <HardHat className="w-3.5 h-3.5 text-emerald-600" />
              <span>Operator Action</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDirectiveRole('regulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeDirectiveRole === 'regulator' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Regulator Action</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDirectiveRole('planner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeDirectiveRole === 'planner' ? 'bg-white text-indigo-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              <span>Planner Action</span>
            </button>
          </div>
        </div>

        {/* Operator Directives */}
        {activeDirectiveRole === 'operator' && (
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-950 font-bold">
              <HardHat className="w-4 h-4 text-emerald-600" />
              <span>Mine Operator Urgent Protocols:</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-700 leading-relaxed">
              <li>
                <strong>Face Worker Safety Alert:</strong> {isSimulatedAlert 
                  ? 'Withdraw personnel from Longwall Panel 3B face within 3.5 hours. Roof delamination accelerating.' 
                  : 'Normal face operations authorized. Ensure standard continuous gas checks.'}
              </li>
              <li>
                <strong>Hydraulic Chock Setting:</strong> {isSimulatedAlert 
                  ? 'Increase powered support hydraulic setting pressure from 24 MPa to 38 MPa to arrest cantilever sag.' 
                  : 'Maintain standard 24 MPa set pressure across all 140 chocks.'}
              </li>
              <li>
                <strong>Conveyor & Haulage:</strong> {isSimulatedAlert 
                  ? 'Inspect maingate belt structure for tilt distortion at chainage 420m.' 
                  : 'All conveyor belts operating at nominal alignment.'}
              </li>
            </ul>
          </div>
        )}

        {/* Regulator Directives */}
        {activeDirectiveRole === 'regulator' && (
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-blue-950 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>DGMS Statutory Regulator Compliance:</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-700 leading-relaxed">
              <li>
                <strong>CMR 2017 Regulation 111 Enforcement:</strong> {isSimulatedAlert 
                  ? 'Tilt breach (4.85 mm/m > 3.0 mm/m). Form IV Notice to be dispatched to Colliery Agent.' 
                  : 'All monitored corridors compliant with DGMS permissible limits.'}
              </li>
              <li>
                <strong>Surface Infrastructure Protection:</strong> {isSimulatedAlert 
                  ? 'Notify South-Eastern Railway Division for speed restriction (15 km/h) over culvert #14.' 
                  : 'Railway and water canal clearances within normal tolerances.'}
              </li>
              <li>
                <strong>Continuous Telemetry Log:</strong> Timestamped immutable audit log recorded in regulatory database.
              </li>
            </ul>
          </div>
        )}

        {/* Planner Directives */}
        {activeDirectiveRole === 'planner' && (
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-950 font-bold">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Mine Technical Planning Adjustments:</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-700 leading-relaxed">
              <li>
                <strong>Longwall Face Advance Speed:</strong> {isSimulatedAlert 
                  ? 'Temporarily reduce face advance from 6.5 m/day to 2.5 m/day to allow stress redistribution.' 
                  : 'Maintain scheduled 6.5 m/day extraction advance.'}
              </li>
              <li>
                <strong>Hydraulic Sand Stowing Feed:</strong> {isSimulatedAlert 
                  ? 'Increase sand-water slurry pumping density to 95% into adjacent Goaf 3A to support abutment.' 
                  : 'Standard stowing schedule active.'}
              </li>
              <li>
                <strong>N.C. Saxena Trough Recalculation:</strong> Dynamic subsidence trough profile updated with revised Barakar sandstone bridging factor.
              </li>
            </ul>
          </div>
        )}

      </div>

    </div>
  )
}
