/**
 * three.js renderer for one reach viewport. MuJoCo is Z-up (we set camera.up to
 * +Z and read body world transforms straight from the sim — positions need no
 * axis swizzle, only the quaternion component order (w,x,y,z)→(x,y,z,w)).
 *
 * Renders: a solid arm (8 STL meshes positioned per-frame from MuJoCo body
 * transforms), a semi-transparent "ghost" arm (the planner's predicted next pose),
 * a draggable target sphere (the EE command), an EE actual sphere (green when on
 * target, red when off), and a short EE trail.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { MESH_ATTACH, MESH_URL, BASE_HEIGHT } from './reachModel'
import { HIT_RADIUS } from './reachData'
import { fetchAsset } from './diagnostics'
import type { ArmFrame, BodyXform } from './ReachArm'

const TRAIL_LEN = 48
const TARGET_RADIUS = 0.03
const EE_RADIUS = 0.022

// EE-marker palette — deliberately NOT red/green (those mean before/after here).
// The end-effector marker is a cyan dot that brightens to white-cyan when it lands
// inside the hit radius of the target.
const EE_COLOR = '#22b8cf' // cyan — end-effector, off target
const EE_COLOR_HIT = '#a5f3fc' // bright cyan — end-effector on target
// Camera home pose (so Reset can restore the view, not just the EE target).
const CAM_POS: [number, number, number] = [0.9, -0.9, 1.95]
const CAM_TARGET: [number, number, number] = [0.0, 0.1, 1.55]

/** Resolve a CSS custom property to a hex color usable by three.js. */
function cssColor(varName: string, fallback: string): THREE.Color {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return new THREE.Color(raw || fallback)
}

interface ArmMeshSet {
  group: THREE.Group
  meshes: { mesh: THREE.Mesh; bodyIndex: number; localPos: THREE.Vector3; localQuat: THREE.Quaternion }[]
}

export interface ReachSceneOptions {
  solidColorVar: string
  solidColorFallback: string
  /** Called with the new base-relative target when the user drags the sphere. */
  onTargetDrag?: (target: [number, number, number]) => void
}

export class ReachScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private solid: ArmMeshSet | null = null
  private ghost: ArmMeshSet | null = null
  private readonly targetSphere: THREE.Mesh
  private readonly eeSphere: THREE.Mesh
  private readonly trail: THREE.Line
  private readonly trailPositions: Float32Array
  private trailCount = 0
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private dragging = false
  private readonly dragPlane = new THREE.Plane()
  private disposed = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opts: ReachSceneOptions,
  ) {
    // Require a real WebGL2 context. Some machines (no GPU accel, blocklisted
    // drivers, locked-down browsers) only offer WebGL1 or none — three.js would
    // otherwise throw a cryptic context error; fail fast with a clear message that
    // diagnostics.ts classifies as a 'webgl' failure.
    const gl2 = canvas.getContext('webgl2')
    if (!gl2) throw new Error('WebGLRenderer: WebGL2 context not available on this device')
    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl2, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.01, 50)
    this.camera.up.set(0, 0, 1) // MuJoCo is Z-up
    this.camera.position.set(...CAM_POS)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.target.set(...CAM_TARGET)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.12
    this.controls.minDistance = 0.4
    this.controls.maxDistance = 4
    this.controls.update()

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.62))
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(1.2, -1.5, 2.5)
    this.scene.add(key)
    const fill = new THREE.DirectionalLight(0x88aaff, 0.3)
    fill.position.set(-1.5, 1.0, 0.5)
    this.scene.add(fill)

    // Support pillar (the pinned base) + faint ground ring for depth.
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.9 })
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, BASE_HEIGHT, 12), pillarMat)
    pillar.position.set(0, 0, BASE_HEIGHT / 2)
    pillar.rotation.x = Math.PI / 2 // cylinder is Y-long by default; stand it up in Z
    this.scene.add(pillar)
    const grid = new THREE.GridHelper(2, 16, 0x3a342e, 0x2a2622)
    grid.rotation.x = Math.PI / 2 // grid is XZ by default; lay it in XY for Z-up
    this.scene.add(grid)

    // Front-of-robot marker: the torso faces +X. A flat arrow on the ground +
    // a "FRONT" label so the viewer can orient the fixed torso after orbiting.
    this.addFrontMarker()

    // Target sphere (EE command) — draggable.
    const targetColor = cssColor('--c-zeroshot', '#f5a623')
    this.targetSphere = new THREE.Mesh(
      new THREE.SphereGeometry(TARGET_RADIUS, 20, 16),
      new THREE.MeshStandardMaterial({ color: targetColor, transparent: true, opacity: 0.85, emissive: targetColor, emissiveIntensity: 0.25 }),
    )
    this.scene.add(this.targetSphere)

    // EE actual sphere — cyan (a colour reserved for the end-effector, distinct
    // from the red/green that denote before/after adaptation), brightens on target.
    // The wrist-body origin sits inside the arm mesh, so render it always-on-top
    // (depthTest off + high renderOrder) as a HUD-style marker pinned to the hand.
    this.eeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(EE_RADIUS, 18, 14),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(EE_COLOR),
        emissive: new THREE.Color(EE_COLOR),
        emissiveIntensity: 0.3,
        depthTest: false,
      }),
    )
    this.eeSphere.renderOrder = 10
    this.scene.add(this.eeSphere)

    // EE trail.
    this.trailPositions = new Float32Array(TRAIL_LEN * 3)
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3))
    trailGeo.setDrawRange(0, 0)
    this.trail = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({ color: cssColor('--c-zeroshot', '#f5a623'), transparent: true, opacity: 0.45 }),
    )
    this.scene.add(this.trail)

    this.bindPointer()
    this.resize()
  }

  /** Load the 8 STL meshes once and build the solid + ghost arm groups. */
  async loadArm(): Promise<void> {
    const loader = new STLLoader()
    const geoms = new Map<string, THREE.BufferGeometry>()
    await Promise.all(
      Array.from(new Set(MESH_ATTACH.map((m) => m.mesh))).map(async (name) => {
        const buf = await (await fetchAsset(MESH_URL(name))).arrayBuffer()
        const geo = loader.parse(buf)
        geo.computeVertexNormals()
        geoms.set(name, geo)
      }),
    )
    if (this.disposed) {
      geoms.forEach((g) => g.dispose())
      return
    }

    const solidColor = cssColor(this.opts.solidColorVar, this.opts.solidColorFallback)
    this.solid = this.buildArmSet(geoms, solidColor, 1.0, false)
    this.ghost = this.buildArmSet(geoms, new THREE.Color(0xc8c0b4), 0.22, true)
    this.scene.add(this.solid.group)
    this.scene.add(this.ghost.group)
  }

  private buildArmSet(
    geoms: Map<string, THREE.BufferGeometry>,
    color: THREE.Color,
    opacity: number,
    ghost: boolean,
  ): ArmMeshSet {
    const group = new THREE.Group()
    const meshes: ArmMeshSet['meshes'] = []
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: ghost ? 0.9 : 0.55,
      metalness: ghost ? 0.0 : 0.15,
      transparent: opacity < 0.999,
      opacity,
      depthWrite: !ghost,
    })
    for (const att of MESH_ATTACH) {
      const geo = geoms.get(att.mesh)
      if (!geo) continue
      const mesh = new THREE.Mesh(geo, mat)
      meshes.push({
        mesh,
        bodyIndex: att.bodyIndex,
        localPos: new THREE.Vector3(att.pos[0], att.pos[1], att.pos[2]),
        localQuat: new THREE.Quaternion(att.quat[1], att.quat[2], att.quat[3], att.quat[0]), // (w,x,y,z)→(x,y,z,w)
      })
      group.add(mesh)
    }
    return { group, meshes }
  }

  /**
   * Marker showing which way the fixed torso faces (+X = forward). Placed on a
   * horizontal plane THROUGH THE TORSO (z ≈ BASE_HEIGHT), not on the distant
   * floor, so it stays inside the default working-zone framing. A flat emissive
   * arrow pointing +X plus a small "FRONT" sprite let the viewer re-orient the
   * fixed torso after orbiting.
   */
  private addFrontMarker(): void {
    const markerColor = new THREE.Color('#9c8f7e')
    const group = new THREE.Group()
    const mat = () =>
      new THREE.MeshStandardMaterial({
        color: markerColor, emissive: markerColor, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.9, depthWrite: false,
      })

    // Arrow shaft + head as flat shapes lying in the XY plane, pointing +X.
    // Kept small so it's a subtle orientation cue, not a scene-dominating object.
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.003), mat())
    shaft.position.set(0.14, 0, 0)
    group.add(shaft)

    const head = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.06, 3), mat())
    head.rotation.z = -Math.PI / 2 // cone points +Y by default → tip to +X, flat in XY
    head.position.set(0.25, 0, 0)
    group.add(head)

    const label = this.makeTextSprite('FRONT')
    if (label) {
      label.scale.set(0.16, 0.04, 1)
      label.position.set(0.34, 0, 0.04)
      group.add(label)
    }

    // Emanate from the pelvis (pillar top, z = BASE_HEIGHT) pointing forward, so it
    // visually anchors to the fixed base rather than floating in empty space.
    group.position.set(0.04, 0, BASE_HEIGHT)
    this.scene.add(group)
  }

  /** Build a small canvas-texture text sprite (cheap, no font loading). */
  private makeTextSprite(text: string): THREE.Sprite | null {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 64
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.font = 'bold 44px ui-monospace, monospace'
    ctx.fillStyle = '#cdbfae'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, c.width / 2, c.height / 2)
    const tex = new THREE.CanvasTexture(c)
    tex.anisotropy = 2
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
    sprite.scale.set(0.26, 0.065, 1)
    return sprite
  }

  /** Restore the camera to its home framing (used by Reset). */
  resetView(): void {
    this.camera.position.set(...CAM_POS)
    this.controls.target.set(...CAM_TARGET)
    this.controls.update()
  }

  /** Position the solid + ghost meshes from the latest MuJoCo body transforms. */
  update(frame: ArmFrame): void {
    if (this.solid) this.applyXforms(this.solid, frame.solid)
    if (this.ghost) this.applyXforms(this.ghost, frame.ghost)

    // EE actual sphere — cyan, brightening when it lands on the target (NOT
    // red/green, which here mean the before/after arms).
    this.eeSphere.position.set(frame.eePos[0], frame.eePos[1], frame.eePos[2])
    const onTarget = frame.eeErr < HIT_RADIUS
    const eeMat = this.eeSphere.material as THREE.MeshStandardMaterial
    eeMat.color.set(onTarget ? EE_COLOR_HIT : EE_COLOR)
    eeMat.emissive.set(onTarget ? EE_COLOR_HIT : EE_COLOR)
    eeMat.emissiveIntensity = onTarget ? 0.6 : 0.3

    this.pushTrail(frame.eePos)
  }

  private applyXforms(set: ArmMeshSet, xforms: BodyXform[]): void {
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const lp = new THREE.Vector3()
    for (const m of set.meshes) {
      const x = xforms[m.bodyIndex]
      if (!x) continue
      // body world: pos + quat (w,x,y,z)→(x,y,z,w)
      q.set(x.quat[1], x.quat[2], x.quat[3], x.quat[0])
      p.set(x.pos[0], x.pos[1], x.pos[2])
      // mesh world = body world ∘ local offset
      lp.copy(m.localPos).applyQuaternion(q).add(p)
      m.mesh.position.copy(lp)
      m.mesh.quaternion.copy(q).multiply(m.localQuat)
    }
  }

  /** Set the target sphere position from a base-relative target (adds base offset). */
  setTarget(target: ArrayLike<number>): void {
    this.targetSphere.position.set(target[0], target[1], target[2] + BASE_HEIGHT)
  }

  private pushTrail(eePos: [number, number, number]): void {
    // shift back by one point
    this.trailPositions.copyWithin(0, 3)
    const last = (TRAIL_LEN - 1) * 3
    this.trailPositions[last] = eePos[0]
    this.trailPositions[last + 1] = eePos[1]
    this.trailPositions[last + 2] = eePos[2]
    this.trailCount = Math.min(this.trailCount + 1, TRAIL_LEN)
    const geo = this.trail.geometry as THREE.BufferGeometry
    geo.setDrawRange(TRAIL_LEN - this.trailCount, this.trailCount)
    geo.attributes.position.needsUpdate = true
  }

  render(): void {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  resize(): void {
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  // ── Target dragging (raycast onto a view-facing plane through the target) ────
  private bindPointer(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
  }

  private setPointer(e: PointerEvent): void {
    const r = this.canvas.getBoundingClientRect()
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
    this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.setPointer(e)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObject(this.targetSphere, false)
    if (hit.length > 0) {
      this.dragging = true
      this.controls.enabled = false
      // Drag plane: faces the camera, passes through the target.
      const n = new THREE.Vector3()
      this.camera.getWorldDirection(n)
      this.dragPlane.setFromNormalAndCoplanarPoint(n, this.targetSphere.position)
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return
    this.setPointer(e)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const pt = new THREE.Vector3()
    if (this.raycaster.ray.intersectPlane(this.dragPlane, pt)) {
      this.targetSphere.position.copy(pt)
      this.opts.onTargetDrag?.([pt.x, pt.y, pt.z - BASE_HEIGHT])
    }
  }

  private onPointerUp = (): void => {
    if (!this.dragging) return
    this.dragging = false
    this.controls.enabled = true
  }

  dispose(): void {
    this.disposed = true
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    this.controls.dispose()
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
      else m?.dispose()
    })
    this.renderer.dispose()
  }
}
