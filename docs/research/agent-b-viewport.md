# Agent B — Viewport: 3D Rendering & Interaction Patterns

Stack assumed: React 18 + TS + Vite, @react-three/fiber v8, @react-three/drei v9, three ~0.169, Zustand.
Could not verify against installed types (node_modules absent at research time) or fetch docs (WebFetch
returned a model error). Version-sensitive items are marked **[verify]**.

---

## 1. Atom & bond rendering

### Shared geometry — create once at module scope, never in JSX

```ts
// shared.ts
import * as THREE from 'three'

export const SPHERE = new THREE.SphereGeometry(1, 32, 24)
export const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false) // along +Y, height 1
```

The unit cylinder is the key trick: one geometry serves every bond; per-mesh `scale={[r, len, r]}`
sets radius and length. Non-uniform scale is fine — three corrects normals via the normal matrix.

`dispose={null}` on the mesh stops R3F's auto-dispose from destroying the shared resource when a
single atom unmounts.

```tsx
<mesh geometry={SPHERE} material={mat} position={p} scale={radius} dispose={null} />
```

**Pitfall:** `<primitive object={SPHERE} attach="geometry" />` without `dispose={null}` will dispose
the geometry on unmount and silently break every other atom. Prefer the `geometry={...}` prop form above.

### CPK material

One `meshPhysicalMaterial` per element colour, memoised in a `Map<string, THREE.Material>`. Clone a
material only for the hovered/selected atom (max 2 extras) so the base materials stay shared.

```tsx
<meshPhysicalMaterial
  color={cpkColor}
  roughness={0.28}
  metalness={0.0}
  clearcoat={1}
  clearcoatRoughness={0.08}
  reflectivity={0.5}
  envMapIntensity={1.1}
/>
```

Clearcoat roughly doubles shading cost and looks flat without an env map → §5 is mandatory, not optional.
Fine up to a few hundred atoms.

CPK colours and van der Waals radii (Å) for scale factors:

```ts
export const CPK: Record<string, string> = {
  H: '#FFFFFF', C: '#909090', N: '#3050F8', O: '#FF0D0D', F: '#90E050',
  P: '#FF8000', S: '#FFFF30', Cl: '#1FF01F', Br: '#A62929', I: '#940094',
}
export const VDW: Record<string, number> = {
  H: 1.20, C: 1.70, N: 1.55, O: 1.52, F: 1.47, P: 1.80, S: 1.80, Cl: 1.75, Br: 1.85, I: 1.98,
}
// ball-and-stick render radius ≈ 0.22–0.30 × VDW
```

### Cylinder orientation — quaternion from unit +Y

```ts
const UP = new THREE.Vector3(0, 1, 0)
const _dir = new THREE.Vector3(), _mid = new THREE.Vector3()

export function bondTransform(a: THREE.Vector3, b: THREE.Vector3) {
  _mid.addVectors(a, b).multiplyScalar(0.5)
  _dir.subVectors(b, a)
  const length = _dir.length()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, _dir.normalize())
  return { position: _mid.clone(), quaternion, length }
}
```

`setFromUnitVectors` handles the antiparallel case (dir === −Y) internally — three picks an
orthogonal axis when `dot + 1 < epsilon`, so no NaN. Safe to call unconditionally.

Apply as `<mesh position={position} quaternion={quaternion} scale={[radius, length, radius]}>`.

For frequent updates (dragging), mutate refs in `useFrame`/`useLayoutEffect` rather than passing new
objects through props — avoids GC churn and React reconciliation per frame.

### Multi-cylinder layout for double / triple bonds

```ts
const _up = new THREE.Vector3(), _perp = new THREE.Vector3()

/** Stable perpendicular to the bond axis. */
export function bondPerp(dir: THREE.Vector3) {
  _up.set(0, 1, 0)
  if (Math.abs(dir.dot(_up)) > 0.9) _up.set(1, 0, 0)
  return _perp.crossVectors(dir, _up).normalize().clone()
}

const OFFSETS: Record<number, number[]> = { 1: [0], 2: [-0.5, 0.5], 3: [-1, 0, 1] }

export function bondStrands(
  a: THREE.Vector3, b: THREE.Vector3, order: number,
  spacing = 0.16, radius = 0.09,
) {
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  dir.normalize()
  const perp = bondPerp(dir)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)

  // inset strands for multiple bonds so they don't poke out of the atom spheres.
  // Clamp so a very short bond can't invert (inset must stay < len/2).
  const inset = order > 1 ? Math.min(0.18, len * 0.12, len * 0.3) : 0
  const sA = new THREE.Vector3().copy(a).addScaledVector(dir, inset)
  const sB = new THREE.Vector3().copy(b).addScaledVector(dir, -inset)
  const mid = new THREE.Vector3().addVectors(sA, sB).multiplyScalar(0.5)
  const strandLen = sA.distanceTo(sB)
  const r = order === 1 ? radius : radius * 0.62

  return OFFSETS[order].map(k => ({
    position: mid.clone().addScaledVector(perp, k * spacing),
    quaternion: q,
    scale: [r, strandLen, r] as [number, number, number],
  }))
}
```

Refinement if the double bond looks wrong from some angles: replace the arbitrary `perp` with the
in-plane direction — project the average of the two atoms' *other* neighbour vectors onto the plane
normal to the bond. Costs one extra neighbour lookup per bond; visually correct from every side.
Ship the simple version first.

Aromatic: render 2 strands, or 1 strand + a torus ring offset toward the ring centroid.

### Instancing escape hatch

Above ~200 atoms use drei `<Instances limit={n}>` / `<Instance>` (instancing, per-instance colour,
pointer events still work). Caveat: no per-instance `emissive`, so highlight via colour multiply or an
overlay mesh. Below that, shared geometry + shared materials is enough.

---

## 2. Camera & OrbitControls

```tsx
<OrbitControls
  makeDefault
  enableDamping
  dampingFactor={0.08}
  rotateSpeed={0.7}
  zoomSpeed={0.9}
  panSpeed={0.7}
  minDistance={1.5}
  maxDistance={60}
  maxPolarAngle={Math.PI * 0.92}
/>
```

`makeDefault` publishes the instance into R3F state (`state.controls`), which GizmoHelper and any
`useThree(s => s.controls)` consumer then pick up. Without it, programmatic camera moves fight the controls.

### Disabling during atom drag — store flag drives the `enabled` prop

```tsx
const dragging = useMolStore(s => s.draggingId !== null)
// ...
<OrbitControls makeDefault enabled={!dragging} enableDamping />
```

Reliable because OrbitControls only *begins* rotating on the pointermove after pointerdown; React has
flushed `enabled={false}` by then. Keep `draggingId` a primitive in the store so this selector is cheap.

Zero-re-render alternative, for hot paths:

```ts
const controls = useThree(s => s.controls) as any
// pointerdown:
controls.enabled = false
// pointerup:
controls.enabled = true
controls.update()   // clears residual damping inertia
```

`e.stopPropagation()` in the mesh handler is still needed — it stops the event reaching objects behind
the atom, but it does **not** stop OrbitControls (that listens on the canvas DOM node directly).

### Reset / frame pattern

```ts
const _dir = new THREE.Vector3()

export function frameTarget(
  camera: THREE.Camera, controls: any, target: THREE.Vector3, radius: number, pad = 1.6,
) {
  _dir.subVectors(camera.position, controls.target).normalize() // keep the current view angle
  const persp = camera as THREE.PerspectiveCamera
  const dist = (radius / Math.sin(THREE.MathUtils.degToRad(persp.fov * 0.5))) * pad
  camera.position.copy(target).addScaledVector(_dir, dist)
  controls.target.copy(target)
  controls.update()
}
```

`radius` = bounding-sphere radius of the selection; compute from a `THREE.Box3` over the atoms
(`box.getBoundingSphere(sphere)`). For an `OrthographicCamera` set `camera.zoom = height / (2*radius)`
+ `camera.updateProjectionMatrix()` instead of moving the position.

Smooth version — `maath` ships as a drei dependency, so it's already bundled (no network):

```tsx
import { easing } from 'maath'
const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)

useFrame((state, dt) => {
  if (!goal.current) return
  const c = state.controls as any
  easing.damp3(state.camera.position, goal.current.pos, 0.35, dt)
  easing.damp3(c.target, goal.current.target, 0.35, dt)
  c.update()
  if (state.camera.position.distanceTo(goal.current.pos) < 1e-3) goal.current = null
})
```

---

## 3. Selection & hover

```tsx
const setHovered = useMolStore(s => s.setHovered)
const selected = useMolStore(s => s.selectedId)
const id = atom.id

<mesh
  geometry={SPHERE}
  material={mat}
  onPointerOver={e => { e.stopPropagation(); setHovered(id) }}
  onPointerOut={e => {
    e.stopPropagation()
    // guard: leave can fire for an overlapping neighbour
    if (useMolStore.getState().hoveredId === id) setHovered(null)
  }}
  onClick={e => { e.stopPropagation(); useMolStore.getState().select(id) }}
  onPointerMissed={() => useMolStore.getState().select(null)}
/>
```

- `stopPropagation()` in every handler, otherwise the ray hits every atom behind the front one.
- Put `onPointerMissed` on the `<Canvas>` for global deselect (fires on any click that hit nothing);
  the per-mesh version fires only when that mesh was missed.
- The `getState().hoveredId === id` guard in `onPointerOut` prevents the classic stuck-highlight bug
  when spheres overlap on screen.
- Call handlers off the store via `getState()` inside event callbacks — no subscription, no re-render.

Highlight values:

```ts
// hover: subtle rim
mat.emissive.set('#2563eb'); mat.emissiveIntensity = 0.35
// selected: strong
mat.emissive.set('#38bdf8'); mat.emissiveIntensity = 0.9
// neither: emissiveIntensity = 0 (leave emissive black)
```

Because emissive is per-material, either clone the material for hovered/selected (≤2 clones) or, for
instanced atoms, overlay a slightly larger additive shell:

```tsx
{isSelected && (
  <mesh scale={radius * 1.18} raycast={() => null}>
    <sphereGeometry args={[1, 24, 16]} />
    <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} depthWrite={false} side={THREE.BackSide} />
  </mesh>
)}
```

Kill raycast cost on everything non-interactive: `raycast={() => null}` on bonds, grid, labels, gizmo.

---

## 4. Dragging an atom on a camera-facing plane

```tsx
const plane = useMemo(() => new THREE.Plane(), [])
const hit = useMemo(() => new THREE.Vector3(), [])
const grabOffset = useMemo(() => new THREE.Vector3(), [])
const camNormal = useMemo(() => new THREE.Vector3(), [])
const dragging = useRef(false)

onPointerDown={e => {
  e.stopPropagation()
  e.target.setPointerCapture(e.pointerId)          // R3F-provided capture proxy
  dragging.current = true
  useMolStore.getState().setDragging(id)           // disables OrbitControls (§2)

  camNormal.copy(e.camera.getWorldDirection(new THREE.Vector3())).negate() // face the camera
  plane.setFromNormalAndCoplanarPoint(camNormal, e.object.position)
  if (e.ray.intersectPlane(plane, hit)) grabOffset.subVectors(hit, e.object.position)
  else grabOffset.set(0, 0, 0)
}}

onPointerMove={e => {
  if (!dragging.current) return
  e.stopPropagation()
  if (e.ray.intersectPlane(plane, hit)) {
    e.object.position.copy(hit.sub(grabOffset))     // direct mutation — free
    pending.current.copy(e.object.position)         // commit on a throttle, not every event
  }
}}

onPointerUp={e => {
  if (!dragging.current) return
  dragging.current = false
  e.target.releasePointerCapture(e.pointerId)
  useMolStore.getState().commitAtomPosition(id, pending.current) // one write, on release
  useMolStore.getState().setDragging(null)
}}
```

Points that matter:

- `e.ray` is a `THREE.Ray` in world space, already unprojected for you — never compute it manually.
- `e.target.setPointerCapture(e.pointerId)` is R3F's own capture mechanism; it keeps delivering move/up
  to this handler even when the cursor leaves the sphere. Use `e.target`, not `e.nativeEvent.target`.
- `grabOffset` stops the atom snapping to the cursor (otherwise it jumps to the pointer on grab).
- Rebuild the plane **once on pointerdown**, not per move — if you rebuild from the current camera
  direction each frame the plane rotates with the camera and the atom drifts.
- Orientation of the normal is irrelevant to the intersection (`intersectPlane` handles both); it only
  matters that the ray isn't parallel. Camera-facing gives the most predictable drag.
- Mutate `e.object.position` directly during the drag and write to Zustand **once on pointerup** (or on
  a 16–33 ms throttle). This is the single biggest perf decision in the interaction layer.

---

## 5. Offline-safe environment lighting

`<Environment preset="...">` and `<Environment files="...">` **both fetch over the network** (drei pulls
presets from a CDN — market.pmnd.rs / raw.githack). Use the `children` form only: drei renders the
children into a cube render target locally. Zero network.

```tsx
<Environment resolution={256} frames={1} background={false}>
  {/* key softbox above-front */}
  <Lightformer intensity={2.4} position={[0, 5, -6]} scale={[12, 8, 1]} color="#ffffff" />
  {/* cool fill from the left */}
  <Lightformer intensity={1.1} position={[-6, 1, 3]} rotation-y={Math.PI / 3} scale={[7, 3, 1]} color="#8ec5ff" />
  {/* warm rim from the right */}
  <Lightformer intensity={1.1} position={[6, 1, 3]} rotation-y={-Math.PI / 3} scale={[7, 3, 1]} color="#ffd7ad" />
  {/* ring overhead — gives clearcoat its signature round highlight */}
  <Lightformer form="ring" intensity={3} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={2.5} color="#ffffff" />
  {/* dark floor so reflections have contrast */}
  <Lightformer form="rect" intensity={0.2} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[14, 14, 1]} color="#0b1220" />
</Environment>
```

- `frames={1}` renders the env map once. Static rig → keep it. Only `frames={Infinity}` if lightformers move.
- `resolution={256}` is plenty and cheap.
- `background={false}` means it lights only; set the visible background with
  `<color attach="background" args={['#05070b']} />` inside the Canvas.
- Lightformers are `meshBasicMaterial` emitters, so `intensity` is effectively HDR brightness — values
  above 1 are normal and are what make clearcoat read as glossy.
- Lightformers orient toward `target` (default `[0,0,0]`), which is why explicit `rotation` is optional.

Light rig (three r155+ is physically correct; `useLegacyLights` is gone in r169 — **[verify]** on your
exact build):

```tsx
<ambientLight intensity={0.18} />
<directionalLight position={[6, 9, 6]} intensity={1.5} castShadow
  shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
<directionalLight position={[-7, 3, -5]} intensity={0.45} color="#4a7fff" />  {/* cool rim */}
<pointLight position={[0, -4, 2]} intensity={30} decay={2} color="#ff9d5c" /> {/* warm under-fill */}
```

`pointLight`/`spotLight` intensity is in candela under physical lighting, so single-digit values read as
nearly black — use ~20–80 with `decay={2}`. `directionalLight`/`ambientLight` stay in the 0.1–2 range.
Getting this wrong is the #1 cause of "my scene is pitch black".

---

## 6. Grid, gizmo, reflective floor

### Grid

```tsx
<Grid
  position={[0, -2.6, 0]}
  cellSize={0.5}
  cellThickness={0.5}
  cellColor="#16202c"
  sectionSize={2.5}
  sectionThickness={1}
  sectionColor="#2f6db3"
  fadeDistance={28}
  fadeStrength={1.5}
  followCamera={false}
  infiniteGrid
  raycast={() => null}
/>
```

Pitfalls: it's a custom-shader plane rendered in the transparent pass → sort order fights other
transparent objects (labels, bond overlays). It does not receive shadows. `infiniteGrid` ignores `args`.
Coplanar with a reflective floor = z-fighting; offset by ≥0.005 or use one, not both.
`followCamera` costs extra per frame and looks odd when orbiting — leave off.

### Gizmo triad

```tsx
<GizmoHelper alignment="bottom-right" margin={[72, 72]}>
  <GizmoViewport
    axisColors={['#ff4d6d', '#22e06b', '#3b9eff']}
    labelColor="#0b1220"
    axisHeadScale={0.85}
  />
</GizmoHelper>
```

Requires `makeDefault` on OrbitControls: GizmoHelper's default `onUpdate` animates the camera and calls
`controls.update()` through R3F's default controls. Custom snap:

```tsx
<GizmoHelper alignment="bottom-right" margin={[72,72]}
  onUpdate={({ camera, controls }) => { /* tween camera, then controls.update() */ }}>
```

It renders a second scene pass each frame (cheap). Under `frameloop="demand"` you must `invalidate()`
or the gizmo freezes.

### Reflective floor

```tsx
<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.62, 0]} raycast={() => null}>
  <planeGeometry args={[80, 80]} />
  <MeshReflectorMaterial
    resolution={512}
    blur={[0, 0]}          // blur = 2 extra fullscreen passes; [0,0] is much cheaper
    mixBlur={0.6}
    mixStrength={10}
    mirror={0.45}          // required, 0–1
    roughness={0.85}
    metalness={0.35}
    depthScale={1.1}
    minDepthThreshold={0.4}
    maxDepthThreshold={1.4}
    color="#080b11"
  />
</mesh>
```

Cost reality: it re-renders the entire scene into the reflection RT **every frame** and has no `frames`
prop to limit that. So: `resolution` 256–512, `blur={[0,0]}` (or `[120,40]` max), and consider gating
reflections behind a "quality" toggle for big molecules. If the frame budget is tight, a plain dark
`meshStandardMaterial` + the Grid reads as nearly the same shot and costs one pass.

Cheaper shadow substitute: drei `<ContactShadows resolution={256} frames={Infinity} opacity={0.5} blur={2} />`
— but `frames={Infinity}` also re-renders each frame, so during atom drags prefer `frames={1}` with a
manual `invalidate` on drag end, or skip it.

---

## 7. Atom labels with no network font

drei `<Text>` is troika-three-text, and **troika's default font is fetched from a CDN URL**. Offline it
hangs or throws. Either bundle a `.woff`/`.ttf` into `public/` and pass `font="/fonts/Inter.woff"`, or
skip the dependency entirely with a canvas-texture sprite. The sprite is the safe hackathon choice.

```ts
// labelTexture.ts
const CACHE = new Map<string, { tex: THREE.Texture; aspect: number }>()

export function labelTexture(text: string, key = text) {
  const hit = CACHE.get(key)
  if (hit) return hit

  const fontSize = 72, pad = 22
  const font = `600 ${fontSize}px ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  ctx.font = font
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2
  const h = fontSize + pad * 2
  canvas.width = w
  canvas.height = h

  // CRITICAL: resizing the canvas resets all 2D context state — re-set the font here.
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const r = h / 2
  ctx.beginPath()
  ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2)
  ctx.lineTo(r, h); ctx.arc(r, r, r, Math.PI / 2, -Math.PI / 2)
  ctx.closePath()
  ctx.fillStyle = 'rgba(7, 11, 17, 0.78)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#e6edf3'
  ctx.fillText(text, w / 2, h / 2 + 1)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace   // three r152+; without this colours come out wrong
  tex.anisotropy = 4
  tex.needsUpdate = true

  const entry = { tex, aspect: w / h }
  CACHE.set(key, entry)
  return entry
}
```

```tsx
export function AtomLabel({ text, position, worldHeight = 0.34 }: Props) {
  const { tex, aspect } = labelTexture(text)
  return (
    <sprite position={position} scale={[worldHeight * aspect, worldHeight, 1]} renderOrder={999} raycast={() => null}>
      <spriteMaterial map={tex} transparent depthTest={false} toneMapped={false} />
    </sprite>
  )
}
```

- `depthTest={false}` + `renderOrder={999}` keeps labels readable through the molecule. Drop `depthTest`
  to false only for always-visible labels; for dense molecules it gets noisy.
- `toneMapped={false}` is important — ACES tone mapping otherwise greys out white text.
- Cache by element symbol: ~10 textures total for the whole periodic table subset.
- Sprites auto-billboard; no `<Billboard>` needed.
- Dispose on app teardown (`tex.dispose()`), not on unmount, since the cache outlives components.

---

## 8. Bond-angle arc annotation

```ts
const IDENTITY = new THREE.Quaternion()
const _q = new THREE.Quaternion(), _step = new THREE.Quaternion(), _v = new THREE.Vector3()

/** Arc points from C→A to C→B at radius R, centred on C. */
export function angleArc(
  C: THREE.Vector3, A: THREE.Vector3, B: THREE.Vector3, R = 0.65,
): { points: THREE.Vector3[]; angleDeg: number; labelAt: THREE.Vector3 } {
  const vA = A.clone().sub(C).normalize()
  const vB = B.clone().sub(C).normalize()
  const angle = vA.angleTo(vB)

  // exact slerp; for angle < ~120° the cheaper nlerp is visually identical
  _q.setFromUnitVectors(vA, vB)

  const segments = Math.max(6, Math.ceil(angle / 0.10))
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    _step.slerpQuaternions(IDENTITY, _q, t)
    points.push(_v.copy(vA).applyQuaternion(_step).multiplyScalar(R).add(C).clone())
  }

  _step.slerpQuaternions(IDENTITY, _q, 0.5)
  const labelAt = _v.copy(vA).applyQuaternion(_step).multiplyScalar(R * 1.45).add(C).clone()

  return { points, angleDeg: THREE.MathUtils.radToDeg(angle), labelAt }
}
```

Cheaper variant for the same visual: `points.push(vA.clone().lerp(vB, t).normalize().multiplyScalar(R).add(C))`.

Render:

```tsx
import { Line } from '@react-three/drei'

const { points, angleDeg, labelAt } = useMemo(
  () => angleArc(center, posA, posB, 0.65), [center, posA, posB],
)

<group>
  <Line points={points} color="#7dd3fc" lineWidth={1.5} transparent opacity={0.9} raycast={() => null} />
  <AtomLabel text={`${angleDeg.toFixed(1)}°`} position={labelAt} worldHeight={0.26} />
</group>
```

Also draw the two bond radii faintly if you want a proper angle wedge:
`<Line points={[center, posA.clone().lerp(center, ...)]} />` — or just the arc, which usually reads fine.

drei `Line` notes: it's `Line2`/`LineMaterial`, so `lineWidth` is in **pixels**, not world units, and it
needs the canvas resolution (drei's `<Line>` sets it from `useThree(size)` — a hand-rolled `LineMaterial`
does not, and then width is wrong after resize). `dashed` requires `dashSize`/`gapSize`; drei computes
line distances for you. Line2 geometry is heavier than a plain `THREE.Line` — fine for a handful of arcs,
not for annotating every angle in a 200-atom molecule.

---

## 9. Performance & interaction pitfalls

**Event spam during drag.** `onPointerMove` fires at the pointer's rate (120 Hz+). Never write to
Zustand per event: mutate `e.object.position` directly, and commit on pointerup or on a 16–33 ms gate.
A per-event store write re-renders every subscriber, i.e. the whole molecule, 120×/s.

**Zustand selector storms.** Any selector that builds a new object/array re-renders on every store
change even when nothing relevant changed.

```ts
// bad
const atoms = useMolStore(s => s.atoms.filter(a => a.selected))
// good
const selectedId = useMolStore(s => s.selectedId)              // primitive
const ids = useMolStore(useShallow(s => s.atoms.map(a => a.id))) // stable array
```

`useShallow` from `zustand/react/shallow` is the v5 API; v4 uses `shallow` from `zustand/shallow` as a
second arg — **[verify]** which major you installed. Read state inside callbacks with
`useMolStore.getState()`; that subscribes to nothing.

**Damping + drag conflict.** With `enableDamping`, inertia keeps moving the camera after pointerup and
will fight any programmatic camera write. Disable controls on drag start, re-enable and call
`controls.update()` on drag end. When you move the camera yourself (frame/reset), you must also set
`controls.target` and call `controls.update()`, or damping snaps the view back.

**PNG snapshot export.**

```tsx
<Canvas
  shadows
  dpr={[1, 2]}
  gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
  camera={{ position: [6, 4, 8], fov: 42, near: 0.1, far: 200 }}
>
```

```ts
function exportPng() {
  const { gl, scene, camera } = useMolStore.getState().viewportRefs // or a ref captured in a child
  gl.render(scene, camera)                       // MUST be immediately before the read
  const url = gl.domElement.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = 'molecule.png'
  a.click()
}
```

Without `preserveDrawingBuffer: true` the drawing buffer is cleared after compositing and you export a
black image. Even with it, the read must happen in the same task as a render — hence the explicit
`gl.render()` right before `toDataURL`. `alpha: false` gives an opaque background. Cost is small; leave
it on.

**Other things that will bite:**

- `dpr={[1, 2]}` — the single biggest perf lever on retina/4K displays.
- Raycast cost scales with segments × object count. 32×24 spheres are fine; set `raycast={() => null}`
  on bonds, grid, gizmo, labels, and the floor so only atoms are hit-tested.
- `frameloop="demand"` needs `invalidate()` after *every* state change, including store updates from
  keyboard shortcuts and panel edits. Miss one and the scene freezes. Default `"always"` is safer for a
  hackathon; switch only if you need the idle-CPU win.
- Module-level shared geometries/materials need `dispose={null}` on their meshes (§1) or the first atom
  unmount kills them for everyone.
- `<Canvas>` re-renders on every parent render — keep the Canvas element high in the tree and push all
  per-frame state into the store/refs, never into props of `<Canvas>` itself (changing `camera={{...}}`
  object identity each render recreates the camera).
- Transparent-over-transparent sorting: labels, bond overlays, Grid, and ContactShadows all render in the
  transparent pass. Use explicit `renderOrder` (labels 999) and `depthWrite={false}` on overlays.
- Textures created from canvas need `colorSpace = THREE.SRGBColorSpace`, or colours shift dark/desaturated.
- Dev-mode double-mount will create two env-map render passes on first paint; that's React StrictMode, not
  a leak — don't chase it.

---

## Suggested component split

```
src/viewport/
  shared.ts          SPHERE, UNIT_CYLINDER, CPK, VDW, bondTransform, bondStrands, angleArc
  labelTexture.ts    canvas-texture label cache + <AtomLabel/>
  Scene.tsx          <Canvas>, lights, Environment+Lightformers, Grid, GizmoHelper, floor
  Molecule.tsx       maps store atoms/bonds → <Atom/> and <Bond/>; owns nothing local
  Atom.tsx           hover/select/drag handlers (§3, §4)
  Bond.tsx           strand layout from bondStrands (§1)
  AngleAnnotation.tsx arc + degree label (§8)
  CameraRig.tsx      OrbitControls, frameTarget, damp3 tween (§2)
  useSnapshot.ts     exportPng (§9)
```

Keep all per-frame mutation in refs + `useFrame`; let Zustand hold only discrete state
(atoms, bonds, selectedId, hoveredId, draggingId) written at pointerup.
