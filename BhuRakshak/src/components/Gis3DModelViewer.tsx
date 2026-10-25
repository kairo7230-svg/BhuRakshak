import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  RotateCcw,
  Play,
  Pause,
  Layers,
  Eye,
  Box,
  PlusCircle,
  Radio,
  Compass,
  Maximize2
} from 'lucide-react'
import type { PlannerNode } from './MinePlannerDashboard'

interface Gis3DModelViewerProps {
  deployedNodes: PlannerNode[]
  proposedNodes: PlannerNode[]
  simulateProposedNodes: boolean
  onToggleSimulation: () => void
  selectedNode: PlannerNode | null
  onSelectNode: (node: PlannerNode) => void
}

export default function Gis3DModelViewer({
  deployedNodes,
  proposedNodes,
  simulateProposedNodes,
  onToggleSimulation,
  selectedNode,
  onSelectNode
}: Gis3DModelViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animFrameIdRef = useRef<number | null>(null)

  // 3D View Controls & Toggles
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [activePreset, setActivePreset] = useState<'isometric' | 'top_down' | 'caving_face' | 'subterranean'>('isometric')
  const [showCoverageDomes, setShowCoverageDomes] = useState<boolean>(true)
  const [showSubterranean, setShowSubterranean] = useState<boolean>(true)
  const [showWireframe, setShowWireframe] = useState<boolean>(false)
  const [hoveredNodeName, setHoveredNodeName] = useState<string | null>(null)

  // Keep references to dynamic 3D elements for animations
  const pulsingRingsRef = useRef<THREE.Mesh[]>([])
  const proposedGroupRef = useRef<THREE.Group | null>(null)
  const blindSpotGroupRef = useRef<THREE.Group | null>(null)
  const radarWaveGroupRef = useRef<THREE.Group | null>(null)
  const terrainMeshRef = useRef<THREE.Mesh | null>(null)
  const subterraneanGroupRef = useRef<THREE.Group | null>(null)
  const domesGroupRef = useRef<THREE.Group | null>(null)
  const nodeMarkersMapRef = useRef<Map<string, THREE.Object3D>>(new Map())

  // Coordinate mapping from GPS lat/lon to 3D Local Space [-25, 25]
  const baseLat = 22.3595
  const baseLon = 82.7501
  const mapCoordsTo3D = (lat: number, lon: number): [number, number] => {
    // 1 deg lat ~ 111km, 1 deg lon ~ 103km
    const dx = (lon - baseLon) * 103000 // meters east
    const dz = (lat - baseLat) * 111000 // meters north
    // Scale 1m -> 0.05 3D units (80m radius -> 4.0 units)
    const scale = 0.05
    return [dx * scale, -dz * scale]
  }

  // Calculate terrain height Y based on Knothe Subsidence Basin equation
  const getTerrainHeight = (x: number, z: number): number => {
    // Subsidence epicenter centered around Zone A Panel 7 caving face (x: 0, z: 2)
    const r1 = Math.sqrt((x - 0) * (x - 0) + (z - 2) * (z - 2))
    // Secondary transition trough (Zone B)
    const r2 = Math.sqrt((x - 8) * (x - 8) + (z + 6) * (z + 6))

    // Knothe Gaussian subsidence trough: S(r) = -Smax * exp(-pi * r^2 / R^2)
    const cavingBowl = -4.5 * Math.exp(-(r1 * r1) / (2 * 6.5 * 6.5))
    const transitionBowl = -2.2 * Math.exp(-(r2 * r2) / (2 * 5.0 * 5.0))

    // Gentle natural surface rolling terrain
    const topography = 0.7 * Math.sin(x * 0.12) * Math.cos(z * 0.12)

    return cavingBowl + transitionBowl + topography
  }

  // Determine InSAR Color based on subsidence displacement
  const getInsarColor = (elevationDiff: number): THREE.Color => {
    // elevationDiff ranges from 0 (stable) down to -4.5 (severe caving)
    if (elevationDiff < -3.2) {
      // Deep Purple: > -90 mm/yr core subsidence
      return new THREE.Color('#9333ea')
    } else if (elevationDiff < -1.8) {
      // Crimson/Orange: -45 to -90 mm/yr shear tension
      return new THREE.Color('#ea580c')
    } else if (elevationDiff < -0.8) {
      // Amber/Gold: -10 to -45 mm/yr transition
      return new THREE.Color('#eab308')
    } else {
      // Emerald: 0 to -10 mm/yr stable
      return new THREE.Color('#10b981')
    }
  }

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 800
    const height = container.clientHeight || 580

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0a0f1d') // Ultra-deep technical slate
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.007) // Atmospheric depth fog
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000)
    camera.position.set(24, 26, 32)
    cameraRef.current = camera

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.replaceChildren(renderer.domElement)
    rendererRef.current = renderer

    // 3. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 + 0.15
    controls.minDistance = 12
    controls.maxDistance = 85
    controls.target.set(0, -2, 0)
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 1.0
    controlsRef.current = controls

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4)
    sunLight.position.set(30, 45, 20)
    sunLight.castShadow = true
    scene.add(sunLight)

    const subterraneanRimLight = new THREE.DirectionalLight(0x38bdf8, 0.8)
    subterraneanRimLight.position.set(-20, -30, -20)
    scene.add(subterraneanRimLight)

    // Floor CAD Reference Grid below subterranean horizon at Y = -12.6
    const floorGrid = new THREE.GridHelper(54, 18, 0x0ea5e9, 0x1e293b)
    floorGrid.position.y = -12.6
    const fMat = floorGrid.material as THREE.Material
    fMat.transparent = true
    fMat.opacity = 0.22
    scene.add(floorGrid)

    // 5. Generate 3D Topographic Terrain Mesh with Knothe InSAR Basin
    const terrainSize = 54
    const terrainSegs = 70
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs)
    terrainGeo.rotateX(-Math.PI / 2)

    const posAttr = terrainGeo.attributes.position
    const colors: number[] = []

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i)
      const z = posAttr.getZ(i)
      const y = getTerrainHeight(x, z)
      posAttr.setY(i, y)

      const color = getInsarColor(y)
      colors.push(color.r, color.g, color.b)
    }
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    terrainGeo.computeVertexNormals()

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.55,
      metalness: 0.15,
      wireframe: showWireframe,
      flatShading: false
    })
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat)
    terrainMesh.receiveShadow = true
    scene.add(terrainMesh)
    terrainMeshRef.current = terrainMesh

    // Add Elevation Contour Wireframe Grid Lines on Terrain
    const gridLinesMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12
    })
    const wireframeGeo = new THREE.WireframeGeometry(terrainGeo)
    const wireframeLines = new THREE.LineSegments(wireframeGeo, gridLinesMat)
    scene.add(wireframeLines)

    // 6. Subterranean Geological Strata & Longwall Mine Horizon (-185m)
    const subterraneanGroup = new THREE.Group()
    scene.add(subterraneanGroup)
    subterraneanGroupRef.current = subterraneanGroup

    // Layer 1: Sandstone Main Roof Bed (-6.0 units ~ -60m)
    const sandstoneGeo = new THREE.BoxGeometry(terrainSize * 0.96, 0.4, terrainSize * 0.96)
    const sandstoneMat = new THREE.MeshStandardMaterial({
      color: 0xa8967b,
      transparent: true,
      opacity: 0.45,
      roughness: 0.8
    })
    const sandstoneMesh = new THREE.Mesh(sandstoneGeo, sandstoneMat)
    sandstoneMesh.position.y = -6.0
    subterraneanGroup.add(sandstoneMesh)

    // Layer 2: Main Coal Seam Extraction Gallery (-12.0 units ~ -185m)
    const coalSeamGeo = new THREE.BoxGeometry(terrainSize * 0.94, 0.8, terrainSize * 0.94)
    const coalSeamMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      transparent: true,
      opacity: 0.75
    })
    const coalSeamMesh = new THREE.Mesh(coalSeamGeo, coalSeamMat)
    coalSeamMesh.position.y = -12.0
    subterraneanGroup.add(coalSeamMesh)

    // Extracted Goaf Cavity (The caved underground void underneath Zone A)
    const goafGeo = new THREE.BoxGeometry(14, 0.82, 16)
    const goafMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.35,
      roughness: 0.7
    })
    const goafMesh = new THREE.Mesh(goafGeo, goafMat)
    goafMesh.position.set(0, -12.0, 2)
    subterraneanGroup.add(goafMesh)

    // Hydraulic Chocks / Shield Supports in Underground Gallery
    // Front Edge Pillars (z = 9) - 5 pillars
    for (let cx = -6; cx <= 6; cx += 3) {
      const chockGeo = new THREE.CylinderGeometry(0.25, 0.25, 5.2, 12)
      const chockMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 })
      const chock = new THREE.Mesh(chockGeo, chockMat)
      chock.position.set(cx, -9.0, 9)
      subterraneanGroup.add(chock)
    }

    // Opposite Edge Pillars (z = -5) - 5 pillars on opposite side of bottom red square
    for (let cx = -6; cx <= 6; cx += 3) {
      const chockGeo = new THREE.CylinderGeometry(0.25, 0.25, 5.2, 12)
      const chockMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 })
      const chock = new THREE.Mesh(chockGeo, chockMat)
      chock.position.set(cx, -9.0, -5)
      subterraneanGroup.add(chock)
    }

    // 7. Node Coverage Domes Group & Pulsing Waves
    const domesGroup = new THREE.Group()
    scene.add(domesGroup)
    domesGroupRef.current = domesGroup

    pulsingRingsRef.current = []
    nodeMarkersMapRef.current.clear()

    // 8. Place 10 Active Hardware Nodes on 3D Topography
    deployedNodes.forEach((node) => {
      const [nx, nz] = mapCoordsTo3D(node.lat, node.lon)
      const ny = getTerrainHeight(nx, nz)

      const nodeGroup = new THREE.Group()
      nodeGroup.position.set(nx, ny, nz)
      nodeGroup.name = node.id
      scene.add(nodeGroup)
      nodeMarkersMapRef.current.set(node.id, nodeGroup)

      const statusColor =
        node.status === 'critical' ? 0xf43f5e : node.status === 'warning' ? 0xf59e0b : 0x10b981

      // 3D Station Tower (Cylinder Pedestal + Antenna Mast)
      const baseGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.3, 16)
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
      const baseMesh = new THREE.Mesh(baseGeo, baseMat)
      baseMesh.position.y = 0.15
      nodeGroup.add(baseMesh)

      const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8)
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
      const mastMesh = new THREE.Mesh(mastGeo, mastMat)
      mastMesh.position.y = 0.9
      nodeGroup.add(mastMesh)

      // Glowing Telemetry Beacon Sphere
      const beaconGeo = new THREE.SphereGeometry(0.3, 16, 16)
      const beaconMat = new THREE.MeshStandardMaterial({
        color: statusColor,
        emissive: statusColor,
        emissiveIntensity: 0.8,
        roughness: 0.2
      })
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat)
      beaconMesh.position.y = 1.7
      nodeGroup.add(beaconMesh)

      // Subterranean Borehole Rod (Connecting surface node to coal seam at -12)
      const rodLength = ny - (-12.0)
      if (rodLength > 0) {
        const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, rodLength, 6)
        const rodMat = new THREE.MeshStandardMaterial({
          color: statusColor,
          transparent: true,
          opacity: 0.45
        })
        const rodMesh = new THREE.Mesh(rodGeo, rodMat)
        rodMesh.position.y = -rodLength / 2
        subterraneanGroup.add(rodMesh)
        rodMesh.position.x = nx
        rodMesh.position.z = nz
      }

      // 80m Translucent Coverage Dome (Radius 4.0 units in 3D)
      const domeGeo = new THREE.SphereGeometry(4.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)
      const domeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.16,
        roughness: 0.3,
        side: THREE.DoubleSide
      })
      const domeMesh = new THREE.Mesh(domeGeo, domeMat)
      domeMesh.position.set(nx, ny, nz)
      domesGroup.add(domeMesh)

      // Pulsing LoRa Telemetry Ground Ring
      const ringGeo = new THREE.RingGeometry(0.4, 3.8, 32)
      ringGeo.rotateX(-Math.PI / 2)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.position.set(nx, ny + 0.05, nz)
      scene.add(ringMesh)
      pulsingRingsRef.current.push(ringMesh)
    })

    // 9. Coverage Blind Spots (Hazard Beacons when Simulation is OFF)
    const blindSpotGroup = new THREE.Group()
    scene.add(blindSpotGroup)
    blindSpotGroupRef.current = blindSpotGroup

    // Blind Spot 1 (Zone A NE Flank) and Blind Spot 2 (Zone B South Margin)
    const gapPositions = [
      { id: 'GAP-1', lat: 22.3608, lon: 82.7505, label: 'Blind Spot 1 (142m Gap)' },
      { id: 'GAP-2', lat: 22.3598, lon: 82.7525, label: 'Blind Spot 2 (115m Gap)' }
    ]

    gapPositions.forEach((gap) => {
      const [gx, gz] = mapCoordsTo3D(gap.lat, gap.lon)
      const gy = getTerrainHeight(gx, gz)

      const gapBeaconGeo = new THREE.ConeGeometry(1.2, 2.5, 16)
      gapBeaconGeo.rotateX(Math.PI)
      const gapBeaconMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.75
      })
      const beacon = new THREE.Mesh(gapBeaconGeo, gapBeaconMat)
      beacon.position.set(gx, gy + 3.0, gz)
      blindSpotGroup.add(beacon)

      // Red Warning Circle on ground
      const warnRingGeo = new THREE.RingGeometry(1.5, 3.5, 32)
      warnRingGeo.rotateX(-Math.PI / 2)
      const warnRingMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      })
      const warnRing = new THREE.Mesh(warnRingGeo, warnRingMat)
      warnRing.position.set(gx, gy + 0.06, gz)
      blindSpotGroup.add(warnRing)
    })

    // 10. The 2 Proposed Strategic Nodes Group (Animated In when Simulation is ON)
    const proposedGroup = new THREE.Group()
    scene.add(proposedGroup)
    proposedGroupRef.current = proposedGroup

    proposedNodes.forEach((node) => {
      const [px, pz] = mapCoordsTo3D(node.lat, node.lon)
      const py = getTerrainHeight(px, pz)

      const propNodeGroup = new THREE.Group()
      propNodeGroup.position.set(px, py, pz)
      propNodeGroup.name = node.id
      proposedGroup.add(propNodeGroup)
      nodeMarkersMapRef.current.set(node.id, propNodeGroup)

      // Proposed Tower (High-Tech Cyan Color)
      const propTowerGeo = new THREE.CylinderGeometry(0.12, 0.45, 2.2, 8)
      const propTowerMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        metalness: 0.85,
        emissive: 0x0891b2,
        emissiveIntensity: 0.5
      })
      const towerMesh = new THREE.Mesh(propTowerGeo, propTowerMat)
      towerMesh.position.y = 1.1
      propNodeGroup.add(towerMesh)

      // Radiant Cyan Pulsing Orb
      const propBeaconGeo = new THREE.SphereGeometry(0.45, 16, 16)
      const propBeaconMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.2
      })
      const orbMesh = new THREE.Mesh(propBeaconGeo, propBeaconMat)
      orbMesh.position.y = 2.4
      propNodeGroup.add(orbMesh)

      // Vertical Targeting Beam dropping from high orbit
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 30, 8)
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.45
      })
      const beamMesh = new THREE.Mesh(beamGeo, beamMat)
      beamMesh.position.y = 15
      propNodeGroup.add(beamMesh)

      // 80m Cyan Coverage Dome
      const propDomeGeo = new THREE.SphereGeometry(4.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)
      const propDomeMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide
      })
      const propDome = new THREE.Mesh(propDomeGeo, propDomeMat)
      propDome.position.set(px, py, pz)
      proposedGroup.add(propDome)

      // Subterranean Borehole String down to -12m
      const rodLength = py - (-12.0)
      const rodGeo = new THREE.CylinderGeometry(0.06, 0.06, rodLength, 8)
      const rodMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.6
      })
      const rod = new THREE.Mesh(rodGeo, rodMat)
      rod.position.set(px, py - rodLength / 2, pz)
      proposedGroup.add(rod)
    })

    // Set initial visibility of proposed & blind spots based on simulateProposedNodes state
    proposedGroup.visible = simulateProposedNodes
    blindSpotGroup.visible = !simulateProposedNodes

    // 11. Raycaster for Interactive Node Click Selection & Hover
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      // Check intersections with node markers
      const allNodes = simulateProposedNodes ? [...deployedNodes, ...proposedNodes] : deployedNodes
      for (const n of allNodes) {
        const obj = nodeMarkersMapRef.current.get(n.id)
        if (obj) {
          const intersects = raycaster.intersectObjects(obj.children, true)
          if (intersects.length > 0) {
            onSelectNode(n)
            return
          }
        }
      }
    }

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const allNodes = simulateProposedNodes ? [...deployedNodes, ...proposedNodes] : deployedNodes
      let foundName: string | null = null

      for (const n of allNodes) {
        const obj = nodeMarkersMapRef.current.get(n.id)
        if (obj) {
          const intersects = raycaster.intersectObjects(obj.children, true)
          if (intersects.length > 0) {
            foundName = `${n.name} (${n.isProposed ? 'SIMULATED' : n.status.toUpperCase()})`
            break
          }
        }
      }
      setHoveredNodeName(foundName)
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)

    // 12. Main 60FPS Render & Animation Loop
    let ringClock = 0
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate)

      ringClock += 0.02
      // Animate pulsing LoRa telemetry waves
      pulsingRingsRef.current.forEach((ring, idx) => {
        const scaleVal = 1 + 0.3 * Math.sin(ringClock * 2 + idx * 0.8)
        ring.scale.set(scaleVal, scaleVal, 1)
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.opacity = 0.3 + 0.3 * Math.cos(ringClock * 2 + idx * 0.8)
      })

      // Bobbing animation for blind spot hazard beacons
      if (blindSpotGroupRef.current && blindSpotGroupRef.current.visible) {
        blindSpotGroupRef.current.children.forEach((child, cIdx) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry) {
            child.position.y += Math.sin(ringClock * 3 + cIdx) * 0.015
            child.rotation.y += 0.02
          }
        })
      }

      // Smooth pulsing for proposed node towers
      if (proposedGroupRef.current && proposedGroupRef.current.visible) {
        proposedGroupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Group) {
            child.rotation.y += 0.01
          }
        })
      }

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // 13. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
      renderer.dispose()
      scene.clear()
    }
  }, [deployedNodes, proposedNodes])

  // Sync simulation toggle state with 3D scene
  useEffect(() => {
    if (proposedGroupRef.current) {
      proposedGroupRef.current.visible = simulateProposedNodes
    }
    if (blindSpotGroupRef.current) {
      blindSpotGroupRef.current.visible = !simulateProposedNodes
    }
  }, [simulateProposedNodes])

  // Sync autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
    }
  }, [autoRotate])

  // Sync Subterranean Strata visibility
  useEffect(() => {
    if (subterraneanGroupRef.current) {
      subterraneanGroupRef.current.visible = showSubterranean
    }
  }, [showSubterranean])

  // Sync 80m Coverage Domes visibility
  useEffect(() => {
    if (domesGroupRef.current) {
      domesGroupRef.current.visible = showCoverageDomes
    }
  }, [showCoverageDomes])

  // Sync Wireframe
  useEffect(() => {
    if (terrainMeshRef.current) {
      const mat = terrainMeshRef.current.material as THREE.MeshStandardMaterial
      mat.wireframe = showWireframe
      mat.needsUpdate = true
    }
  }, [showWireframe])

  // Camera Presets
  const setCameraPreset = (preset: 'isometric' | 'top_down' | 'subterranean' | 'caving_face') => {
    setActivePreset(preset)
    if (!cameraRef.current || !controlsRef.current) return
    const cam = cameraRef.current
    const ctrl = controlsRef.current

    if (preset === 'isometric') {
      cam.position.set(24, 26, 32)
      ctrl.target.set(0, -2, 0)
    } else if (preset === 'top_down') {
      cam.position.set(0, 48, 0.1)
      ctrl.target.set(0, 0, 0)
    } else if (preset === 'subterranean') {
      cam.position.set(28, -6, 22)
      ctrl.target.set(0, -9, 0)
    } else if (preset === 'caving_face') {
      cam.position.set(6, 6, 12)
      ctrl.target.set(0, -2, 2)
    }
    ctrl.update()
  }

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xs select-none bg-slate-950">
      
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP FLOATING DIGITAL TWIN COMMAND BAR (Professional Unified Glassmorphism) */}
      <div className="absolute top-3 left-3 right-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2.5 shadow-2xl z-10 pointer-events-auto">
        
        {/* Left: Branding & Real-Time Telemetry Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                3D Geotechnical Strata Twin
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 60 FPS
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Network: <b className="text-slate-200">{simulateProposedNodes ? '12 Nodes (10 HW + 2 Sim)' : '10 HW Nodes'}</b></span>
              <span>•</span>
              <span className={simulateProposedNodes ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {simulateProposedNodes ? '96.8% Coverage (0 Gaps)' : '74.2% Coverage (2 Gaps)'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Sleek Segmented Camera Switcher & Quick View Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Camera Presets Segmented Pill */}
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setCameraPreset('isometric')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                activePreset === 'isometric'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Isometric
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('top_down')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                activePreset === 'top_down'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Top Plan
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('caving_face')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                activePreset === 'caving_face'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Caving Face
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('subterranean')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                activePreset === 'subterranean'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                  : 'text-indigo-400 hover:text-indigo-200 hover:bg-slate-800/60'
              }`}
            >
              Underground (-185m)
            </button>
          </div>

          {/* Quick Auto-Rotate Toggle */}
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-xs'
                : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title={autoRotate ? 'Pause 3D Auto-Rotation' : 'Resume 3D Auto-Rotation'}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Camera Button */}
          <button
            type="button"
            onClick={() => setCameraPreset('isometric')}
            className="p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
            title="Reset Camera Orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* HOVER TOOLTIP IN 3D SPACE */}
      {hoveredNodeName && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/60 rounded-xl px-4 py-1.5 shadow-xl text-center pointer-events-none animate-fadeIn">
          <span className="text-xs font-black text-cyan-300 font-mono">
            {hoveredNodeName}
          </span>
          <span className="block text-[10px] text-slate-400">Click node to inspect geotechnical parameters</span>
        </div>
      )}

      {/* FLOATING LEGEND: InSAR Deformation Colors & Subterranean Strata */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl max-w-[240px] text-xs space-y-2 pointer-events-auto">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 flex items-center justify-between">
          <span>InSAR Subsidence Scale</span>
          <span className="font-mono text-[9px] text-slate-500">Sentinel-1 LOS</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-200">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#9333ea]" />
            <span>&gt; -90 mm/yr</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-200">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ea580c]" />
            <span>-45 to -90 mm</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-200">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#eab308]" />
            <span>-10 to -45 mm</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-200">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
            <span>0 to -10 mm</span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-800 space-y-1 text-[10px]">
          <div className="flex items-center gap-2 text-cyan-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Proposed Nodes (+80m Dome)</span>
          </div>
          <div className="flex items-center gap-2 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Hazard Blind Spot Beacons</span>
          </div>
          <div className="flex items-center gap-2 text-amber-300">
            <span className="w-2.5 h-1.5 bg-[#a8967b] rounded-xs" />
            <span>Coal Seam Depth (-185m)</span>
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT FLOATING CONTROLS: Simulation Action Button & Toggles */}
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2 pointer-events-auto">
        
        {/* BIG SIMULATE BUTTON */}
        <button
          type="button"
          onClick={onToggleSimulation}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg cursor-pointer ${
            simulateProposedNodes
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-cyan-500/25 ring-2 ring-cyan-400'
              : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/60 shadow-md'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>{simulateProposedNodes ? '✓ Simulation Active (+2 Nodes)' : '+ Simulate +2 Strategic Nodes'}</span>
        </button>

        {/* Layer Toggles Toolbar */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-xl flex items-center gap-1 text-slate-300 text-xs">
          
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg transition ${
              autoRotate ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title={autoRotate ? 'Pause 3D Auto-Rotation' : 'Start 3D Auto-Rotation'}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowSubterranean(!showSubterranean)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
              showSubterranean ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Subterranean Geological Strata (-185m)"
          >
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>Strata</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCoverageDomes(!showCoverageDomes)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
              showCoverageDomes ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle 80m Mesh Coverage Domes"
          >
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>80m Domes</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWireframe(!showWireframe)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
              showWireframe ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Terrain Mesh Wireframe"
          >
            <Compass className="w-3 h-3 text-amber-400" />
            <span>Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setCameraPreset('isometric')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  )
}
