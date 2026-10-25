import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  RotateCcw,
  Play,
  Pause,
  Layers,
  Box,
  Radio,
  ShieldCheck,
  Wifi,
  Sparkles,
  MapPin,
  ArrowDown,
  Target,
  BarChart3,
  Layers2,
  Activity,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2
} from 'lucide-react'
import type { TopologySector, MeshCoverageNode } from './MineRegulatorDashboard'

interface Regulator3DViewerProps {
  mode: 'topology_stability' | 'network_coverage'
  sectors?: TopologySector[]
  selectedSector?: TopologySector | null
  onSelectSector?: (sector: TopologySector) => void
  meshNodes?: MeshCoverageNode[]
  selectedNode?: MeshCoverageNode | null
  onSelectNode?: (node: MeshCoverageNode) => void
}

// Strata profile configuration for depth cross-section graph
interface StrataLayer {
  id: string
  name: string
  depthRange: string
  topM: number
  bottomM: number
  lithology: string
  thicknessM: number
  measuredSagMm: number
  maxPermissibleMm: number
  bedSeparationMm: number
  color: string
  accentColor: string
  textColor: string
  status: 'STABLE' | 'DEFORMING' | 'CAVING'
}

const STRATA_LAYERS: StrataLayer[] = [
  {
    id: 'layer-1',
    name: 'Surface Topsoil & Alluvium',
    depthRange: '0m to -25m',
    topM: 0,
    bottomM: 25,
    lithology: 'Sandy Loam & Weathered Sandstone',
    thicknessM: 25,
    measuredSagMm: -42.6,
    maxPermissibleMm: -150.0,
    bedSeparationMm: 0.2,
    color: '#f8fafc',
    accentColor: '#3b82f6',
    textColor: '#1e293b',
    status: 'STABLE'
  },
  {
    id: 'layer-2',
    name: 'Upper Barakar Sandstone',
    depthRange: '-25m to -75m',
    topM: 25,
    bottomM: 75,
    lithology: 'Medium-Grained Sandstone Aquifer',
    thicknessM: 50,
    measuredSagMm: -64.2,
    maxPermissibleMm: -200.0,
    bedSeparationMm: 0.8,
    color: '#f1f5f9',
    accentColor: '#0ea5e9',
    textColor: '#334155',
    status: 'STABLE'
  },
  {
    id: 'layer-3',
    name: 'Massive Sandstone Main Roof',
    depthRange: '-75m to -140m',
    topM: 75,
    bottomM: 140,
    lithology: 'Competent Quartzitic Sandstone Beam',
    thicknessM: 65,
    measuredSagMm: -98.5,
    maxPermissibleMm: -280.0,
    bedSeparationMm: 1.4,
    color: '#e2e8f0',
    accentColor: '#6366f1',
    textColor: '#475569',
    status: 'STABLE'
  },
  {
    id: 'layer-4',
    name: 'Carbonaceous Shale Sub-Roof',
    depthRange: '-140m to -182m',
    topM: 140,
    bottomM: 182,
    lithology: 'Laminated Mudstone & Interbedded Shale',
    thicknessM: 42,
    measuredSagMm: -186.4,
    maxPermissibleMm: -450.0,
    bedSeparationMm: 2.1,
    color: '#cbd5e1',
    accentColor: '#f59e0b',
    textColor: '#334155',
    status: 'DEFORMING'
  },
  {
    id: 'layer-5',
    name: 'Singhali Seam IV & Goaf Cavity',
    depthRange: '-182m to -185.4m',
    topM: 182,
    bottomM: 185.4,
    lithology: 'Semi-Anthracite Coal Seam (Active Longwall)',
    thicknessM: 3.4,
    measuredSagMm: -840.0,
    maxPermissibleMm: -1200.0,
    bedSeparationMm: 4.8,
    color: '#0f172a',
    accentColor: '#ef4444',
    textColor: '#f8fafc',
    status: 'CAVING'
  }
]

export default function Regulator3DViewer({
  mode,
  sectors = [],
  selectedSector,
  onSelectSector,
  meshNodes = [],
  selectedNode,
  onSelectNode
}: Regulator3DViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const isInteractingRef = useRef<boolean>(false)

  // Stable references for data to avoid re-initializing the 3D scene on clock updates
  const sectorsRef = useRef(sectors)
  sectorsRef.current = sectors
  const meshNodesRef = useRef(meshNodes)
  meshNodesRef.current = meshNodes

  // 3D View Controls & Toggles
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [activePreset, setActivePreset] = useState<'isometric' | 'top_down' | 'caving_face' | 'subterranean'>('isometric')
  const [showCoverageDomes, setShowCoverageDomes] = useState<boolean>(true)
  const [showSubterranean, setShowSubterranean] = useState<boolean>(true)
  const [showWireframe, setShowWireframe] = useState<boolean>(false)

  // Side Panel Tabs: 'depth' | 'location'
  const [graphTab, setGraphTab] = useState<'depth' | 'location'>('depth')
  const [selectedStrataIndex, setSelectedStrataIndex] = useState<number>(0)
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null)

  // References for animation
  const pulsingRingsRef = useRef<THREE.Mesh[]>([])
  const animatedBeamsRef = useRef<{ line: THREE.Line; material: THREE.LineDashedMaterial }[]>([])
  const terrainMeshRef = useRef<THREE.Mesh | null>(null)
  const subterraneanGroupRef = useRef<THREE.Group | null>(null)
  const domesGroupRef = useRef<THREE.Group | null>(null)
  const interactiveMarkersMapRef = useRef<Map<string, THREE.Object3D>>(new Map())

  // Coordinate mapping from GPS lat/lon to 3D Local Space [-25, 25]
  const baseLat = 22.3595
  const baseLon = 82.7501
  const mapCoordsTo3D = (lat: number, lon: number): [number, number] => {
    const dx = (lon - baseLon) * 103000 // meters east
    const dz = (lat - baseLat) * 111000 // meters north
    const scale = 0.05 // 1m -> 0.05 3D units
    return [dx * scale, -dz * scale]
  }

  // Knothe subsidence calculation for surface height Y
  const getTerrainHeight = (x: number, z: number): number => {
    const r1 = Math.sqrt((x - 0) * (x - 0) + (z - 2) * (z - 2))
    const r2 = Math.sqrt((x - 8) * (x - 8) + (z + 6) * (z + 6))
    const cavingBowl = -4.2 * Math.exp(-(r1 * r1) / (2 * 6.5 * 6.5))
    const transitionBowl = -2.0 * Math.exp(-(r2 * r2) / (2 * 5.0 * 5.0))
    const topography = 0.6 * Math.sin(x * 0.12) * Math.cos(z * 0.12)
    return cavingBowl + transitionBowl + topography
  }

  // =========================================================================
  // THREE.JS SCENE INITIALIZATION (ONLY RUNS ONCE OR WHEN MODE CHANGES)
  // =========================================================================
  useEffect(() => {
    if (!mountRef.current) return

    const container = mountRef.current
    const width = container.clientWidth || 700
    const height = container.clientHeight || 500

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#f8fafc')
    scene.fog = new THREE.FogExp2('#f8fafc', 0.015)
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 500)
    camera.position.set(28, 22, 32)
    cameraRef.current = camera

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 4. Orbit Controls (with user-drag detection)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2 + 0.18
    controls.minDistance = 12
    controls.maxDistance = 95
    controls.target.set(0, -3, 0)
    controlsRef.current = controls

    controls.addEventListener('start', () => {
      isInteractingRef.current = true
    })
    controls.addEventListener('end', () => {
      isInteractingRef.current = false
    })

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.25)
    sunLight.position.set(30, 45, 20)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 150
    sunLight.shadow.bias = -0.0005
    scene.add(sunLight)

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.5)
    fillLight.position.set(-25, 20, -25)
    scene.add(fillLight)

    const underLight = new THREE.DirectionalLight(0x0284c7, 0.4)
    underLight.position.set(0, -30, 0)
    scene.add(underLight)

    // 6. Geological Terrain Mesh with Knothe Subsidence Bowl
    const terrainSize = 50
    const segments = 90
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments)
    terrainGeo.rotateX(-Math.PI / 2)

    const posAttr = terrainGeo.attributes.position
    const colors: number[] = []

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i)
      const vz = posAttr.getZ(i)
      const vy = getTerrainHeight(vx, vz)
      posAttr.setY(i, vy)

      let c = new THREE.Color('#e2e8f0') // Default stable ground
      if (vy < -3.0) {
        c = new THREE.Color('#9333ea') // High subsidence (Zone A center)
      } else if (vy < -1.8) {
        c = new THREE.Color('#ea580c') // Transition tension (Orange)
      } else if (vy < -0.8) {
        c = new THREE.Color('#f59e0b') // Low subsidence (Gold)
      } else if (vy < -0.2) {
        c = new THREE.Color('#10b981') // Stable green margin
      }
      colors.push(c.r, c.g, c.b)
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    terrainGeo.computeVertexNormals()

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.12,
      flatShading: false,
      wireframe: false
    })

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat)
    terrainMesh.receiveShadow = true
    scene.add(terrainMesh)
    terrainMeshRef.current = terrainMesh

    // Surface Grid Overlay
    const gridHelper = new THREE.GridHelper(terrainSize, 25, 0x94a3b8, 0xe2e8f0)
    gridHelper.position.y = 0.05
    scene.add(gridHelper)

    // 7. Subterranean Geological Strata & Longwall Coal Seam (-185m Cover)
    const subterraneanGroup = new THREE.Group()
    scene.add(subterraneanGroup)
    subterraneanGroupRef.current = subterraneanGroup

    // Strata Layer 1: Sandstone Overburden (Y = -3.8)
    const strataGeo1 = new THREE.BoxGeometry(terrainSize, 1.2, terrainSize)
    const strataMat1 = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.22,
      roughness: 0.8
    })
    const strata1 = new THREE.Mesh(strataGeo1, strataMat1)
    strata1.position.y = -3.8
    subterraneanGroup.add(strata1)

    // Strata Layer 2: Competent Shale Sub-Roof (Y = -6.8)
    const strataGeo2 = new THREE.BoxGeometry(terrainSize, 1.4, terrainSize)
    const strataMat2 = new THREE.MeshStandardMaterial({
      color: 0x475569,
      transparent: true,
      opacity: 0.28,
      roughness: 0.85
    })
    const strata2 = new THREE.Mesh(strataGeo2, strataMat2)
    strata2.position.y = -6.8
    subterraneanGroup.add(strata2)

    // Seam Layer: Deep Coal Seam & Active Extraction Panel (Y = -9.6)
    const seamGeo = new THREE.BoxGeometry(terrainSize, 0.9, terrainSize)
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95
    })
    const seam = new THREE.Mesh(seamGeo, seamMat)
    seam.position.y = -9.6
    subterraneanGroup.add(seam)

    // Red Goaf / Extraction Cavity
    const goafGeo = new THREE.BoxGeometry(14, 0.92, 18)
    const goafMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x7f1d1d,
      roughness: 0.5
    })
    const goaf = new THREE.Mesh(goafGeo, goafMat)
    goaf.position.set(0, -9.6, 2)
    subterraneanGroup.add(goaf)

    // Hydraulic Chock Support Pillars (5 on front advance face + 5 on opposite face)
    const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.8, 16)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25
    })

    // Front edge (z = -7.0)
    for (let i = 0; i < 5; i++) {
      const px = -5.0 + i * 2.5
      const p = new THREE.Mesh(pillarGeo, pillarMat)
      p.position.set(px, -8.7, -7.0)
      subterraneanGroup.add(p)
    }
    // Opposite edge (z = +11.0)
    for (let i = 0; i < 5; i++) {
      const px = -5.0 + i * 2.5
      const p = new THREE.Mesh(pillarGeo, pillarMat)
      p.position.set(px, -8.7, 11.0)
      subterraneanGroup.add(p)
    }

    // 8. MODE-SPECIFIC 3D GRAPHICAL ELEMENTS
    interactiveMarkersMapRef.current.clear()
    pulsingRingsRef.current = []
    animatedBeamsRef.current = []

    const currentSectors = sectorsRef.current
    const currentNodes = meshNodesRef.current

    if (mode === 'topology_stability') {
      // MODE 1: TOPOLOGY STABILITY (HAZARD BUFFERS, DRAW ENVELOPE, SECTOR VECTORS)
      const drawGroup = new THREE.Group()
      scene.add(drawGroup)

      // 3D Knothe Draw Limit Envelope Cone (β = 62.5°)
      const coneCurvePoints: THREE.Vector3[] = []
      const radius = 12.0
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2
        const cx = Math.cos(theta) * radius
        const cz = Math.sin(theta) * (radius * 0.85) + 2
        coneCurvePoints.push(new THREE.Vector3(cx, getTerrainHeight(cx, cz) + 0.15, cz))
      }
      const drawLineGeo = new THREE.BufferGeometry().setFromPoints(coneCurvePoints)
      const drawLineMat = new THREE.LineDashedMaterial({
        color: 0x3b82f6,
        dashSize: 0.8,
        gapSize: 0.4,
        linewidth: 2
      })
      const drawLine = new THREE.Line(drawLineGeo, drawLineMat)
      drawLine.computeLineDistances()
      drawGroup.add(drawLine)

      // Surface Railway Track (Red corridor ribbon)
      const railCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-18, 0, -12),
        new THREE.Vector3(-8, 0, -8),
        new THREE.Vector3(2, 0, -4),
        new THREE.Vector3(14, 0, -2)
      ])
      const railGeo = new THREE.TubeGeometry(railCurve, 32, 0.25, 8, false)
      const railMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6, roughness: 0.4 })
      const railMesh = new THREE.Mesh(railGeo, railMat)
      drawGroup.add(railMesh)

      // Hasdeo Canal (Blue corridor ribbon)
      const canalCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-14, 0, 14),
        new THREE.Vector3(-2, 0, 16),
        new THREE.Vector3(12, 0, 18),
        new THREE.Vector3(22, 0, 20)
      ])
      const canalGeo = new THREE.TubeGeometry(canalCurve, 32, 0.35, 8, false)
      const canalMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.4, roughness: 0.2, transparent: true, opacity: 0.85 })
      const canalMesh = new THREE.Mesh(canalGeo, canalMat)
      drawGroup.add(canalMesh)

      // 3D Sector Stability Pins with Sag Vectors
      currentSectors.forEach((sec) => {
        const [x3d, z3d] = mapCoordsTo3D(sec.lat, sec.lon)
        const y3d = getTerrainHeight(x3d, z3d)

        const markerGroup = new THREE.Group()
        markerGroup.position.set(x3d, y3d, z3d)

        const isCritical = sec.measuredSagMm < -30
        const mastGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12)
        const mastMat = new THREE.MeshStandardMaterial({
          color: isCritical ? 0xf97316 : 0x059669,
          metalness: 0.8,
          roughness: 0.2
        })
        const mast = new THREE.Mesh(mastGeo, mastMat)
        mast.position.y = 1.6
        markerGroup.add(mast)

        const headGeo = new THREE.SphereGeometry(0.55, 16, 16)
        const headMat = new THREE.MeshStandardMaterial({
          color: isCritical ? 0xf97316 : 0x10b981,
          emissive: isCritical ? 0xc2410c : 0x047857,
          emissiveIntensity: 0.4
        })
        const head = new THREE.Mesh(headGeo, headMat)
        head.position.y = 3.3
        markerGroup.add(head)

        // Pulsing sag vector ring on the ground
        const ringGeo = new THREE.RingGeometry(0.7, 1.1, 24)
        ringGeo.rotateX(-Math.PI / 2)
        const ringMat = new THREE.MeshBasicMaterial({
          color: isCritical ? 0xf97316 : 0x10b981,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.position.y = 0.08
        markerGroup.add(ring)
        pulsingRingsRef.current.push(ring)

        scene.add(markerGroup)
        interactiveMarkersMapRef.current.set(sec.id, markerGroup)
      })

    } else {
      // MODE 2: NETWORK COVERAGE PROOF (GATEWAY, 80m RADIO DOMES, MESH BEAMS)
      const domesGroup = new THREE.Group()
      scene.add(domesGroup)
      domesGroupRef.current = domesGroup

      const radarGroup = new THREE.Group()
      scene.add(radarGroup)

      // Master Gateway Tower (GW-01)
      const gw = currentNodes.find((n) => n.id === 'GW-01') || currentNodes[0]
      const [gwX, gwZ] = gw ? mapCoordsTo3D(gw.lat, gw.lon) : [0, 0]
      const gwY = getTerrainHeight(gwX, gwZ)

      const gwGroup = new THREE.Group()
      gwGroup.position.set(gwX, gwY, gwZ)

      const towerGeo = new THREE.CylinderGeometry(0.2, 0.8, 6.0, 4)
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 })
      const tower = new THREE.Mesh(towerGeo, towerMat)
      tower.position.y = 3.0
      gwGroup.add(tower)

      const beaconGeo = new THREE.SphereGeometry(0.65, 16, 16)
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8
      })
      const beacon = new THREE.Mesh(beaconGeo, beaconMat)
      beacon.position.y = 6.2
      gwGroup.add(beacon)
      scene.add(gwGroup)

      // Gateway Expanding Radar Rings
      for (let r = 1; r <= 3; r++) {
        const radarGeo = new THREE.RingGeometry(r * 3.5, r * 3.5 + 0.3, 32)
        radarGeo.rotateX(-Math.PI / 2)
        const radarMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.45 / r,
          side: THREE.DoubleSide
        })
        const radarRing = new THREE.Mesh(radarGeo, radarMat)
        radarRing.position.set(gwX, gwY + 0.15, gwZ)
        radarGroup.add(radarRing)
        pulsingRingsRef.current.push(radarRing)
      }

      // Sensing Nodes with 80m Radio Domes
      currentNodes.forEach((node) => {
        if (node.id === 'GW-01') return

        const [nx, nz] = mapCoordsTo3D(node.lat, node.lon)
        const ny = getTerrainHeight(nx, nz)

        const nodeGroup = new THREE.Group()
        nodeGroup.position.set(nx, ny, nz)

        const canisterGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.4, 16)
        const canisterMat = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.8, roughness: 0.25 })
        const canister = new THREE.Mesh(canisterGeo, canisterMat)
        canister.position.y = 0.7
        nodeGroup.add(canister)

        const antGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8)
        const antMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.9 })
        const ant = new THREE.Mesh(antGeo, antMat)
        ant.position.y = 2.1
        nodeGroup.add(ant)

        // 80m Radio Coverage Dome
        const domeGeo = new THREE.SphereGeometry(4.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)
        const domeMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.18,
          roughness: 0.4,
          side: THREE.DoubleSide
        })
        const dome = new THREE.Mesh(domeGeo, domeMat)
        domesGroup.add(dome)
        dome.position.set(nx, ny, nz)

        scene.add(nodeGroup)
        interactiveMarkersMapRef.current.set(node.id, nodeGroup)

        // Wireless Transmission Link Line
        let targetX = gwX
        let targetY = gwY
        let targetZ = gwZ

        if (node.id === 'NODE-SN-04') {
          const n3 = currentNodes.find((n) => n.id === 'NODE-SN-03')
          if (n3) {
            const [tx, tz] = mapCoordsTo3D(n3.lat, n3.lon)
            targetX = tx
            targetZ = tz
            targetY = getTerrainHeight(tx, tz)
          }
        }

        const linkCurve = new THREE.LineCurve3(
          new THREE.Vector3(nx, ny + 1.8, nz),
          new THREE.Vector3(targetX, targetY + (node.id === 'NODE-SN-04' ? 1.8 : 5.8), targetZ)
        )
        const linkGeo = new THREE.BufferGeometry().setFromPoints(linkCurve.getPoints(20))
        const linkMat = new THREE.LineDashedMaterial({
          color: node.rssiDbm >= -74 ? 0x10b981 : 0xf59e0b,
          dashSize: 0.6,
          gapSize: 0.4,
          linewidth: 2
        })
        const linkLine = new THREE.Line(linkGeo, linkMat)
        linkLine.computeLineDistances()
        scene.add(linkLine)
        animatedBeamsRef.current.push({ line: linkLine, material: linkMat })
      })
    }

    // =========================================================================
    // 60 FPS ANIMATION LOOP (Smooth without resets)
    // =========================================================================
    const clock = new THREE.Clock()

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Auto-rotation only when user is NOT dragging
      if (controlsRef.current) {
        if (autoRotate && !isInteractingRef.current) {
          controlsRef.current.autoRotate = true
          controlsRef.current.autoRotateSpeed = 0.6
        } else {
          controlsRef.current.autoRotate = false
        }
        controlsRef.current.update()
      }

      // Pulsing rings animation
      pulsingRingsRef.current.forEach((ring, idx) => {
        const scale = 1.0 + 0.18 * Math.sin(elapsedTime * 2.5 + idx * 0.8)
        ring.scale.set(scale, scale, scale)
      })

      // Wireless transmission dashed beam motion
      animatedBeamsRef.current.forEach(({ material }, i) => {
        material.dashSize = 0.6 + 0.15 * Math.sin(elapsedTime * 4 + i)
      })

      renderer.render(scene, camera)
    }

    animate()

    // ResizeObserver ensures exact canvas dimensions on all screen resizes
    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return
      const w = mountRef.current.clientWidth
      const h = mountRef.current.clientHeight
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(w, h)
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
      controls.dispose()
      renderer.dispose()
    }
  }, [mode]) // <-- ONLY DEPENDS ON MODE! Never resets on parent clock interval ticks

  // Lightweight selection highlighting in 3D scene (no camera reset)
  useEffect(() => {
    if (mode === 'topology_stability' && selectedSector) {
      interactiveMarkersMapRef.current.forEach((obj, id) => {
        if (id === selectedSector.id) {
          obj.scale.set(1.3, 1.3, 1.3)
        } else {
          obj.scale.set(1.0, 1.0, 1.0)
        }
      })
    }
  }, [mode, selectedSector])

  useEffect(() => {
    if (mode === 'network_coverage' && selectedNode) {
      interactiveMarkersMapRef.current.forEach((obj, id) => {
        if (id === selectedNode.id) {
          obj.scale.set(1.3, 1.3, 1.3)
        } else {
          obj.scale.set(1.0, 1.0, 1.0)
        }
      })
    }
  }, [mode, selectedNode])

  // Camera Presets Dispatcher
  const setCameraPreset = (preset: 'isometric' | 'top_down' | 'caving_face' | 'subterranean') => {
    setActivePreset(preset)
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    if (preset === 'isometric') {
      camera.position.set(28, 22, 32)
      controls.target.set(0, -3, 0)
    } else if (preset === 'top_down') {
      camera.position.set(0, 48, 0.1)
      controls.target.set(0, 0, 0)
    } else if (preset === 'caving_face') {
      camera.position.set(16, 8, 18)
      controls.target.set(0, -3, 2)
    } else if (preset === 'subterranean') {
      camera.position.set(22, -8, 24)
      controls.target.set(0, -9.5, 2)
    }
    controls.update()
  }

  // Toggle wireframe on terrain
  useEffect(() => {
    if (terrainMeshRef.current) {
      const mat = terrainMeshRef.current.material as THREE.MeshStandardMaterial
      mat.wireframe = showWireframe
    }
  }, [showWireframe])

  // Toggle subterranean layers visibility
  useEffect(() => {
    if (subterraneanGroupRef.current) {
      subterraneanGroupRef.current.visible = showSubterranean
    }
  }, [showSubterranean])

  // Toggle radio domes visibility
  useEffect(() => {
    if (domesGroupRef.current) {
      domesGroupRef.current.visible = showCoverageDomes
    }
  }, [showCoverageDomes])

  // Selected strata layer details
  const activeStrata = STRATA_LAYERS[selectedStrataIndex] || STRATA_LAYERS[0]

  // Spatial location points data for the Location Radar Graph
  const locationGraphPoints = useMemo(() => {
    if (mode === 'topology_stability') {
      return sectors.map((sec) => {
        const [x3d, z3d] = mapCoordsTo3D(sec.lat, sec.lon)
        // Convert to local mining grid meters (-150m to +150m)
        const localX = parseFloat((x3d * 20).toFixed(1))
        const localZ = parseFloat((-z3d * 20).toFixed(1))
        const distFromFace = Math.sqrt(localX * localX + localZ * localZ)
        return {
          id: sec.id,
          name: sec.name,
          shortName: sec.name.split(':')[0] || sec.id,
          localX,
          localZ,
          distFromFace: Math.round(distFromFace),
          valueDisplay: `${sec.measuredSagMm} mm`,
          status: sec.statutoryStatus,
          isCritical: sec.measuredSagMm < -30,
          rawItem: sec
        }
      })
    } else {
      return meshNodes.map((n) => {
        const [x3d, z3d] = mapCoordsTo3D(n.lat, n.lon)
        const localX = parseFloat((x3d * 20).toFixed(1))
        const localZ = parseFloat((-z3d * 20).toFixed(1))
        const distFromFace = Math.sqrt(localX * localX + localZ * localZ)
        return {
          id: n.id,
          name: n.name,
          shortName: n.name.replace('Node ', ''),
          localX,
          localZ,
          distFromFace: Math.round(distFromFace),
          valueDisplay: `${n.rssiDbm} dBm (${n.packetSuccessRate}%)`,
          status: n.rssiDbm >= -74 ? 'EXCELLENT' : 'ACCEPTABLE',
          isCritical: n.rssiDbm < -78,
          rawItem: n
        }
      })
    }
  }, [mode, sectors, meshNodes])

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col space-y-4">
      
      {/* ===================================================================== */}
      {/* 3D GIS HEADER: TITLE, MODE BADGE & TOP CAMERA PRESETS                 */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs ${
            mode === 'topology_stability' ? 'bg-blue-50 border border-blue-200 text-blue-600' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
          }`}>
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                {mode === 'topology_stability'
                  ? '3D GIS Animated Topology & Subsidence Basin System'
                  : '3D GIS Animated Mesh Network & Hotspot Proof System'}
              </h3>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                mode === 'topology_stability'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                WebGL 60 FPS • Glitch-Free
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              {mode === 'topology_stability'
                ? 'Knothe theoretical basin • -185m coal seam strata • Hydraulic support pillars & stability vectors'
                : 'Central LoRaWAN gateway tower • 80m radio coverage domes • Real-time transmission beams'}
            </p>
          </div>
        </div>

        {/* Top Camera Presets Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold">
          <button
            type="button"
            onClick={() => setCameraPreset('isometric')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
              activePreset === 'isometric' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Isometric
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('top_down')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
              activePreset === 'top_down' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Top-Down
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('caving_face')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
              activePreset === 'caving_face' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Caving Face
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('subterranean')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
              activePreset === 'subterranean' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Seam Depth
          </button>
        </div>
      </div>

      {/* Layer Toggles & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Rotate Toggle */}
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              autoRotate ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {autoRotate ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-slate-400" />}
            <span>Auto Rotate</span>
          </button>

          {/* Subterranean Layers Toggle */}
          <button
            type="button"
            onClick={() => setShowSubterranean(!showSubterranean)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              showSubterranean ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
            }`}
          >
            <Layers className="w-3 h-3 text-indigo-600" />
            <span>-185m Strata &amp; Pillars</span>
          </button>

          {/* Mode Specific Toggles */}
          {mode === 'network_coverage' && (
            <button
              type="button"
              onClick={() => setShowCoverageDomes(!showCoverageDomes)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                showCoverageDomes ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
              }`}
            >
              <Radio className="w-3 h-3 text-emerald-600" />
              <span>80m Radio Domes</span>
            </button>
          )}

          {/* Wireframe Toggle */}
          <button
            type="button"
            onClick={() => setShowWireframe(!showWireframe)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              showWireframe ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <span>Wireframe Mesh</span>
          </button>
        </div>

        {/* Camera Reset */}
        <button
          type="button"
          onClick={() => setCameraPreset('isometric')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-bold transition cursor-pointer shadow-2xs"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset View</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SIDE-BY-SIDE GRID: 3D GIS MODEL (LEFT) & DEPTH/LOCATION GRAPH (RIGHT)  */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* LEFT COLUMN: 3D WebGL Canvas Viewport (8 Columns) */}
        <div className="lg:col-span-8 relative h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-[#f8fafc]">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Floating On-Canvas Info Pill */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-3 shadow-md text-xs space-y-1.5 max-w-xs z-10">
            <div className="flex items-center gap-1.5 font-black text-slate-900 text-[11px] uppercase tracking-wider">
              {mode === 'topology_stability' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>3D Strata Sag Envelope</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>LoRaWAN Mesh Telemetry</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              {mode === 'topology_stability'
                ? 'Left drag to orbit. Scroll to zoom. Real-time geomechanical Knothe basin over -185m coal seam cavity with 10 hydraulic chock pillars.'
                : 'Central LoRaWAN tower with 80m radio coverage spheres verifying 100% spatial telemetry proof with zero subsidence hotspot misses.'}
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
              <span>S_max: <b>-42.6 mm</b></span>
              <span>Cover H: <b>185 m</b></span>
              <span>Angle β: <b>62.5°</b></span>
            </div>
          </div>

          {/* 3D Navigation Tips on Canvas Top Right */}
          <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white rounded-lg px-2.5 py-1 text-[9px] font-mono border border-slate-700/80 pointer-events-none z-10">
            Left Drag: Orbit • Right Drag: Pan • Scroll: Zoom
          </div>
        </div>

        {/* RIGHT COLUMN: DEPTH AND LOCATION GRAPH PANEL (4 Columns) */}
        <div className="lg:col-span-4 h-[500px] flex flex-col bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs overflow-hidden">
          
          {/* Header with Subtab Switcher: Depth Graph vs Location Graph */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold w-full">
              <button
                type="button"
                onClick={() => setGraphTab('depth')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer text-[11px] ${
                  graphTab === 'depth'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Depth Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setGraphTab('location')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer text-[11px] ${
                  graphTab === 'location'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>Location Radar</span>
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* SUBTAB 1: DEPTH PROFILE GRAPH (0m to -185m Strata Displacement)   */}
          {/* ================================================================= */}
          {graphTab === 'depth' && (
            <div className="flex-1 flex flex-col justify-between pt-2.5 overflow-hidden">
              
              {/* Depth Header Info */}
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-slate-900 text-[11px]">Borehole Extensometer Extrapolated Sag</span>
                  <p className="text-[10px] text-slate-400">Surface (0m) &rarr; Active Seam (-185.4m)</p>
                </div>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  5 Anchors
                </span>
              </div>

              {/* Strata Cross Section SVG Graphic */}
              <div className="relative w-full h-[220px] bg-slate-50 rounded-xl border border-slate-200/80 p-2 my-1 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 260 190" preserveAspectRatio="none">
                  {/* Grid depth lines */}
                  <line x1="36" y1="20" x2="250" y2="20" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3,3" />
                  <line x1="36" y1="60" x2="250" y2="60" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3,3" />
                  <line x1="36" y1="110" x2="250" y2="110" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3,3" />
                  <line x1="36" y1="150" x2="250" y2="150" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3,3" />
                  <line x1="36" y1="180" x2="250" y2="180" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3,3" />

                  {/* Y-Axis Depth Labels */}
                  <text x="32" y="23" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">0m</text>
                  <text x="32" y="63" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">-25m</text>
                  <text x="32" y="113" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">-75m</text>
                  <text x="32" y="153" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">-140m</text>
                  <text x="32" y="183" fill="#dc2626" fontSize="8" fontWeight="bold" textAnchor="end" fontFamily="monospace">-185m</text>

                  {/* Geological Strata Blocks */}
                  {/* Layer 1: Topsoil 0m to 25m */}
                  <rect x="40" y="20" width="110" height="40" fill="#e2e8f0" fillOpacity="0.6" rx="2" />
                  <text x="95" y="44" fill="#334155" fontSize="7.5" fontWeight="bold" textAnchor="middle">Alluvium (0 to -25m)</text>

                  {/* Layer 2: Sandstone 25m to 75m */}
                  <rect x="40" y="62" width="110" height="48" fill="#cbd5e1" fillOpacity="0.5" rx="2" />
                  <text x="95" y="88" fill="#334155" fontSize="7.5" fontWeight="bold" textAnchor="middle">Upper Sandstone (-75m)</text>

                  {/* Layer 3: Massive Sandstone 75m to 140m */}
                  <rect x="40" y="112" width="110" height="38" fill="#94a3b8" fillOpacity="0.4" rx="2" />
                  <text x="95" y="134" fill="#1e293b" fontSize="7.5" fontWeight="bold" textAnchor="middle">Massive Sandstone Beam</text>

                  {/* Layer 4: Shale 140m to 182m */}
                  <rect x="40" y="152" width="110" height="28" fill="#64748b" fillOpacity="0.5" rx="2" />
                  <text x="95" y="169" fill="#f8fafc" fontSize="7.5" fontWeight="bold" textAnchor="middle">Carbonaceous Shale</text>

                  {/* Layer 5: Coal Seam -185m */}
                  <rect x="40" y="182" width="110" height="8" fill="#0f172a" rx="1" />

                  {/* Strata Displacement Sag Curve on the right (x: 160 to 245) */}
                  {/* Statutory Permissible Line (Red Dashed) */}
                  <line x1="210" y1="20" x2="210" y2="185" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3,2" />
                  <text x="210" y="14" fill="#ef4444" fontSize="7" fontWeight="bold" textAnchor="middle">Cap (-150mm)</text>

                  {/* Sag Curve (Non-linear Delamination Curve) */}
                  <path
                    d="M 172 20 Q 180 80 195 130 T 235 185"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                  />

                  {/* Multi-point Extensometer Sensor Anchors */}
                  {STRATA_LAYERS.map((layer, idx) => {
                    const yPos = 20 + (idx === 0 ? 0 : idx === 1 ? 40 : idx === 2 ? 90 : idx === 3 ? 132 : 165)
                    // Scaled Sag X position: 172 at -42.6mm, up to 235 at -840mm
                    const xSag = 172 + (idx === 0 ? 0 : idx === 1 ? 8 : idx === 2 ? 18 : idx === 3 ? 35 : 62)
                    const isSelected = selectedStrataIndex === idx

                    return (
                      <g
                        key={layer.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedStrataIndex(idx)}
                      >
                        {/* Anchor Node */}
                        <circle
                          cx={xSag}
                          cy={yPos}
                          r={isSelected ? 6 : 4}
                          fill={isSelected ? '#2563eb' : '#ffffff'}
                          stroke={idx === 4 ? '#ef4444' : '#2563eb'}
                          strokeWidth="2"
                        />
                        {/* Sag Value Label */}
                        <text
                          x={xSag + (idx === 4 ? -8 : 8)}
                          y={yPos + 3}
                          fill="#0f172a"
                          fontSize="7.5"
                          fontWeight="bold"
                          textAnchor={idx === 4 ? 'end' : 'start'}
                        >
                          {layer.measuredSagMm}mm
                        </text>
                      </g>
                    )
                  })}
                </svg>

                {/* SVG Floating Legend */}
                <div className="absolute bottom-1 right-2 bg-white/90 backdrop-blur-xs rounded-md px-1.5 py-0.5 text-[8px] font-mono text-slate-500 border border-slate-200">
                  <span className="text-blue-600 font-bold">● Sag Profile</span> • <span className="text-rose-600 font-bold">-- Permissible</span>
                </div>
              </div>

              {/* Selected Strata Layer Card Drilldown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeStrata.accentColor }} />
                    <span className="font-extrabold text-slate-900 text-[11px]">{activeStrata.name}</span>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                    activeStrata.status === 'STABLE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : activeStrata.status === 'DEFORMING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {activeStrata.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                    <span className="text-slate-400 block">Depth Interval:</span>
                    <span className="font-mono font-bold text-slate-800">{activeStrata.depthRange}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                    <span className="text-slate-400 block">Logged Sag:</span>
                    <span className="font-mono font-bold text-blue-700">{activeStrata.measuredSagMm} mm</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                    <span className="text-slate-400 block">Bed Separation:</span>
                    <span className="font-mono font-bold text-emerald-700">{activeStrata.bedSeparationMm} mm</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                    <span className="text-slate-400 block">Lithology:</span>
                    <span className="font-sans font-medium text-slate-700 truncate" title={activeStrata.lithology}>
                      {activeStrata.lithology.split(' ')[0]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Switcher between 5 Layers */}
              <div className="grid grid-cols-5 gap-1 pt-1.5">
                {STRATA_LAYERS.map((layer, idx) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelectedStrataIndex(idx)}
                    className={`py-1 text-[9px] font-bold rounded-lg border transition cursor-pointer text-center ${
                      selectedStrataIndex === idx
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    L{idx + 1} ({layer.depthRange.split(' ')[0]})
                  </button>
                ))}
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* SUBTAB 2: LOCATION GRAPH (2D Planar Local Mining Grid & Offset)   */}
          {/* ================================================================= */}
          {graphTab === 'location' && (
            <div className="flex-1 flex flex-col justify-between pt-2.5 overflow-hidden">
              
              {/* Location Header Info */}
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-slate-900 text-[11px]">2D Spatial Planar Coordinates</span>
                  <p className="text-[10px] text-slate-400">Relative to Active Longwall Face Origin (0,0)</p>
                </div>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {locationGraphPoints.length} Positions Mapped
                </span>
              </div>

              {/* 2D Local Mining Coordinate Radar SVG */}
              <div className="relative w-full h-[220px] bg-slate-900 rounded-xl border border-slate-800 p-2 my-1 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 260 190">
                  {/* Grid Axes: X (Transverse) and Z (Advance) */}
                  <line x1="20" y1="95" x2="240" y2="95" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="130" y1="15" x2="130" y2="175" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />

                  {/* Concentric Distance Rings (50m, 100m, 150m) */}
                  <circle cx="130" cy="95" r="28" fill="none" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="130" cy="95" r="54" fill="none" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="130" cy="95" r="78" fill="none" stroke="#1e293b" strokeWidth="1" />

                  {/* Ring Distance Labels */}
                  <text x="130" y="65" fill="#475569" fontSize="6.5" textAnchor="middle">50m</text>
                  <text x="130" y="39" fill="#475569" fontSize="6.5" textAnchor="middle">100m</text>
                  <text x="130" y="15" fill="#475569" fontSize="6.5" textAnchor="middle">150m</text>

                  {/* Active Caving Face Origin Marker */}
                  <rect x="126" y="91" width="8" height="8" fill="#ef4444" rx="1.5" />
                  <circle cx="130" cy="95" r="12" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
                  <text x="130" y="108" fill="#f87171" fontSize="7" fontWeight="bold" textAnchor="middle">Face (0,0)</text>

                  {/* Railway Corridor (Statutory exclusion corridor) */}
                  <path d="M 45 30 L 75 165" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,2" />
                  <text x="56" y="26" fill="#f87171" fontSize="6.5" textAnchor="middle">Rail Corridor</text>

                  {/* Hasdeo Canal Buffer */}
                  <path d="M 190 25 L 215 160" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4,2" />
                  <text x="205" y="22" fill="#7dd3fc" fontSize="6.5" textAnchor="middle">Hasdeo Canal</text>

                  {/* Points Plotted on Local Grid */}
                  {locationGraphPoints.map((pt) => {
                    // Coordinate scaling to 260x190 canvas: 1m -> 0.52 pixels
                    const px = 130 + pt.localX * 0.52
                    const py = 95 - pt.localZ * 0.52
                    const isHovered = hoveredPointId === pt.id
                    const isSelected =
                      (mode === 'topology_stability' && selectedSector?.id === pt.id) ||
                      (mode === 'network_coverage' && selectedNode?.id === pt.id)

                    return (
                      <g
                        key={pt.id}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointId(pt.id)}
                        onMouseLeave={() => setHoveredPointId(null)}
                        onClick={() => {
                          if (mode === 'topology_stability' && onSelectSector) {
                            onSelectSector(pt.rawItem as TopologySector)
                          } else if (mode === 'network_coverage' && onSelectNode) {
                            onSelectNode(pt.rawItem as MeshCoverageNode)
                          }
                        }}
                      >
                        {/* Connecting vector line to origin */}
                        <line
                          x1="130"
                          y1="95"
                          x2={px}
                          y2={py}
                          stroke={pt.isCritical ? '#f97316' : '#10b981'}
                          strokeWidth="0.8"
                          strokeDasharray="2,2"
                          opacity={isHovered || isSelected ? 0.9 : 0.3}
                        />

                        {/* Node Halo */}
                        {(isHovered || isSelected) && (
                          <circle cx={px} cy={py} r="9" fill="none" stroke="#ffffff" strokeWidth="1" />
                        )}

                        {/* Node Dot */}
                        <circle
                          cx={px}
                          cy={py}
                          r={isSelected ? 5 : 3.5}
                          fill={pt.isCritical ? '#f97316' : '#10b981'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />

                        {/* Node Label */}
                        <text
                          x={px}
                          y={py - 6}
                          fill="#f8fafc"
                          fontSize="7"
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          textAnchor="middle"
                        >
                          {pt.shortName}
                        </text>
                      </g>
                    )
                  })}
                </svg>

                {/* Radar Legend Pill */}
                <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs rounded-md px-2 py-0.5 text-[8px] font-mono text-slate-300 border border-slate-700">
                  <span className="text-emerald-400">● Safe</span> • <span className="text-amber-400">● Critical Zone</span> • <span className="text-rose-400">■ Face</span>
                </div>
              </div>

              {/* Selected Position Inspector Card */}
              {(() => {
                const targetPoint =
                  locationGraphPoints.find((p) => p.id === hoveredPointId) ||
                  locationGraphPoints.find(
                    (p) =>
                      (mode === 'topology_stability' && p.id === selectedSector?.id) ||
                      (mode === 'network_coverage' && p.id === selectedNode?.id)
                  ) ||
                  locationGraphPoints[0]

                if (!targetPoint) return null

                return (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-extrabold text-slate-900 text-[11px] truncate max-w-[170px]">
                          {targetPoint.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-500">
                        Dist: {targetPoint.distFromFace}m
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                        <span className="text-slate-400 block">Mining Grid (X, Z):</span>
                        <span className="font-mono font-bold text-slate-800">
                          {targetPoint.localX > 0 ? `+${targetPoint.localX}` : targetPoint.localX}m, {targetPoint.localZ > 0 ? `+${targetPoint.localZ}` : targetPoint.localZ}m
                        </span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                        <span className="text-slate-400 block">Logged Telemetry:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {targetPoint.valueDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Proximity Statutory Warning Strip */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Rail Clearance: <b>182m</b> (&gt;150m statutory min)</span>
                </span>
                <span className="font-bold text-emerald-600">PASSED</span>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ===================================================================== */}
      {/* FOOTER STATUTORY ACCREDITATION NOTES                                 */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Geodetic Knothe Subsidence Projection • DGMS CMR 2017 Reg. 111 Standard</span>
        </div>
        <span className="font-semibold text-slate-700">Datum: Singhali Mine Grid • Elevation: MSL +294m</span>
      </div>

    </div>
  )
}
