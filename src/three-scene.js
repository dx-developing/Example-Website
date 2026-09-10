import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

const DPR = window.devicePixelRatio || 1
const LOGO_PATH = 'M20 12 L20 88 L52 88 C74 88 88 72 88 50 C88 28 74 12 52 12 Z'

function markGeometry(depth = 26, seg = 24, bevelSeg = 4) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${LOGO_PATH}"/></svg>`
  const parsed = new SVGLoader().parse(svg)
  const shape = SVGLoader.createShapes(parsed.paths[0])[0]
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 4, bevelSize: 2.4, bevelSegments: bevelSeg, curveSegments: seg,
  })
  geo.scale(0.045, -0.045, 0.045) // SVG Y points down
  geo.center()
  geo.computeVertexNormals()
  return geo
}

function pointField(count, radius, spread, colorA, colorB, size = 0.05) {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const a = new THREE.Color(colorA); const b = new THREE.Color(colorB)
  for (let i = 0; i < count; i++) {
    const r = radius + (Math.random() - 0.5) * spread
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7
    pos[i * 3 + 2] = r * Math.cos(ph)
    const c = a.clone().lerp(b, Math.random())
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const m = new THREE.PointsMaterial({
    size, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  })
  return new THREE.Points(g, m)
}

export function createIntro3D(canvas) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(0, 0, 6.4)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(1.5, DPR))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture

  scene.add(new THREE.AmbientLight(0xffffff, 0.25))
  const key = new THREE.DirectionalLight(0xffe6b0, 2.6); key.position.set(4, 6, 6); scene.add(key)
  const rim = new THREE.DirectionalLight(0x7bb7f2, 1.8); rim.position.set(-6, -2, 3); scene.add(rim)
  const orbGold = new THREE.PointLight(0xffc93c, 40, 30, 2); scene.add(orbGold)
  const orbBlue = new THREE.PointLight(0x6fb0ff, 26, 30, 2); scene.add(orbBlue)

  const markGroup = new THREE.Group()
  scene.add(markGroup)
  const geo = markGeometry(26, 22, 4)

  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xffc93c, metalness: 1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.12,
    iridescence: 0.5, iridescenceIOR: 1.3, emissive: 0x4a3400, emissiveIntensity: 0.5,
    envMapIntensity: 1.5, side: THREE.DoubleSide,
  })
  markGroup.add(new THREE.Mesh(geo, gold))

  const shell = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0xffc93c, wireframe: true, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }))
  shell.scale.setScalar(1.05)
  markGroup.add(shell)

  const edges = new THREE.EdgesGeometry(geo, 25)
  const ghosts = []
  for (let i = 0; i < 4; i++) {
    const g = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: i % 2 ? 0x7bb7f2 : 0xffc93c, transparent: true, opacity: 0.22 - i * 0.045,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    g.scale.setScalar(1 + (i + 1) * 0.16)
    g.position.z = -(i + 1) * 0.5
    markGroup.add(g)
    ghosts.push(g)
  }

  const sparks = pointField(420, 2.5, 1.8, 0xffc93c, 0x7bb7f2)
  scene.add(sparks)
  markGroup.rotation.set(-0.16, -0.5, 0)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.75, 0.5, 0.82)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const state = { spin: 0, reveal: 0, mx: 0, my: 0, t: 0 }
  let raf = 0
  let running = false

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  const onMove = (e) => {
    state.mx = (e.clientX / window.innerWidth - 0.5) * 2
    state.my = (e.clientY / window.innerHeight - 0.5) * 2
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  renderer.compile(scene, camera) // warm shaders + post passes before the first animated frame
  composer.render()
  composer.render()

  const render = () => {
    state.t += 1 / 60
    state.spin += 0.01 + state.reveal * 0.4
    markGroup.rotation.y = -0.5 + state.spin + state.mx * 0.35
    markGroup.rotation.x = -0.16 + Math.sin(state.t * 0.6) * 0.12 + state.my * 0.28
    markGroup.rotation.z = Math.sin(state.t * 0.4) * 0.05
    markGroup.scale.setScalar(1 + Math.sin(state.t * 3) * 0.022 + state.reveal * 2.4)
    markGroup.position.z = state.reveal * 6
    ghosts.forEach((g, i) => {
      g.rotation.z = -state.spin * 0.25 * (i + 1)
      g.material.opacity = (0.22 - i * 0.045) * (0.6 + Math.sin(state.t * 2 + i) * 0.4)
    })
    shell.material.opacity = 0.12 + Math.sin(state.t * 4) * 0.06
    sparks.rotation.y += 0.0016
    sparks.rotation.x = Math.sin(state.t * 0.3) * 0.2
    sparks.scale.setScalar(1 + state.reveal * 2.2)
    sparks.material.opacity = 0.9 * (1 - state.reveal * 0.6)
    const o = state.t * 0.9
    orbGold.position.set(Math.cos(o) * 4, Math.sin(o * 1.3) * 2.5, Math.sin(o) * 4 + 2)
    orbBlue.position.set(Math.cos(-o * 0.8) * 4.5, Math.sin(-o) * 3, Math.cos(o * 0.6) * 3 + 1)
    camera.position.z = 6.4 + Math.sin(state.t * 0.5) * 0.15
    bloom.strength = 0.75 + state.reveal * 2.6
    gold.opacity = 1 - Math.max(0, state.reveal - 0.6) * 2.5
    gold.transparent = state.reveal > 0.6
    composer.render()
    if (running) raf = requestAnimationFrame(render)
  }

  return {
    start: () => { if (!running) { running = true; render() } },
    setReveal: (v) => { state.reveal = v },
    dispose: () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      geo.dispose(); edges.dispose()
      sparks.geometry.dispose(); sparks.material.dispose()
      scene.traverse((n) => { n.material?.dispose?.() })
      composer.dispose(); bloom.dispose()
      envRT.texture.dispose(); pmrem.dispose()
      renderer.dispose()
    },
  }
}

export function createBackground3D(canvas) {
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.04)
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120)
  camera.position.set(0, 0, 14)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(1.4, DPR))
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const d1 = new THREE.DirectionalLight(0xffc93c, 2); d1.position.set(5, 8, 6); scene.add(d1)
  const d2 = new THREE.DirectionalLight(0x7bb7f2, 1.2); d2.position.set(-6, -4, 2); scene.add(d2)

  const geos = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.TorusGeometry(0.9, 0.32, 14, 36),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.TorusKnotGeometry(0.7, 0.24, 80, 12),
  ]
  const solid = new THREE.MeshStandardMaterial({ color: 0x1c1c1a, metalness: 0.55, roughness: 0.5, flatShading: true })
  const wire = new THREE.MeshBasicMaterial({ color: 0xffc93c, wireframe: true, transparent: true, opacity: 0.18 })

  const group = new THREE.Group()
  scene.add(group)
  const bodies = []
  for (let i = 0; i < 13; i++) {
    const mesh = new THREE.Mesh(geos[i % geos.length], i % 3 === 0 ? wire : solid)
    mesh.position.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 16 - 2)
    mesh.scale.setScalar(0.5 + Math.random() * 2)
    mesh.userData.spin = new THREE.Vector3((Math.random() - 0.5) * 0.006, (Math.random() - 0.5) * 0.006, (Math.random() - 0.5) * 0.006)
    mesh.userData.seed = Math.random() * 10
    group.add(mesh); bodies.push(mesh)
  }

  const starN = 900
  const sp = new Float32Array(starN * 3)
  for (let i = 0; i < starN; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 90
    sp[i * 3 + 1] = (Math.random() - 0.5) * 90
    sp[i * 3 + 2] = (Math.random() - 0.5) * 60 - 10
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffd98a, size: 0.09, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }))
  scene.add(stars)

  const state = { scroll: 0, mx: 0, my: 0, t: 0 }
  let raf = 0

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  const onMove = (e) => {
    state.mx = e.clientX / window.innerWidth - 0.5
    state.my = e.clientY / window.innerHeight - 0.5
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  renderer.compile(scene, camera)

  const render = () => {
    state.t += 0.01
    bodies.forEach((m) => {
      m.rotation.x += m.userData.spin.x
      m.rotation.y += m.userData.spin.y
      m.rotation.z += m.userData.spin.z
      m.position.y += Math.sin(state.t + m.userData.seed) * 0.004
    })
    group.rotation.y = state.scroll * Math.PI * 0.7 + state.mx * 0.5
    group.rotation.x = state.mx * 0.1 - state.my * 0.2
    group.position.z = state.scroll * 10
    stars.rotation.y = state.scroll * Math.PI * 0.25 + state.mx * 0.2
    stars.position.z = state.scroll * 4
    camera.position.x += (state.mx * 2 - camera.position.x) * 0.05
    camera.position.y += (-state.my * 2 - camera.position.y) * 0.05
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
    raf = requestAnimationFrame(render)
  }
  render()

  return {
    setScroll: (v) => { state.scroll = v },
    dispose: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      geos.forEach((g) => g.dispose()); starGeo.dispose()
      renderer.dispose()
    },
  }
}

export function createAssemble3D(canvas) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.set(0, 0, 7)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(1.5, DPR))
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const l1 = new THREE.DirectionalLight(0xffe6b0, 2.4); l1.position.set(4, 6, 6); scene.add(l1)
  const l2 = new THREE.DirectionalLight(0x7bb7f2, 1.4); l2.position.set(-6, -3, 3); scene.add(l2)

  const geo = markGeometry(22, 18, 3)
  const solid = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xffc93c, metalness: 0.85, roughness: 0.22, transparent: true, opacity: 0,
  }))
  const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0xffc93c, wireframe: true, transparent: true, opacity: 0.5,
  }))
  const dGroup = new THREE.Group()
  dGroup.add(solid, wire)
  scene.add(dGroup)

  const shardGeo = new THREE.TetrahedronGeometry(0.34)
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, metalness: 0.3, roughness: 0.6, flatShading: true })
  const shards = []
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(shardGeo, shardMat)
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
    m.userData.from = dir.clone().multiplyScalar(4 + Math.random() * 4)
    m.userData.rot = new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6)
    scene.add(m)
    shards.push(m)
  }

  const state = { p: 0, t: 0, mx: 0, my: 0, active: true }
  let raf = 0

  const resize = () => {
    const w = canvas.clientWidth || 480
    const h = canvas.clientHeight || 480
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  const onMove = (e) => {
    state.mx = (e.clientX / window.innerWidth - 0.5) * 2
    state.my = (e.clientY / window.innerHeight - 0.5) * 2
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  renderer.compile(scene, camera)

  const ease = (x) => 1 - Math.pow(1 - x, 3)

  const render = () => {
    raf = requestAnimationFrame(render)
    if (!state.active) return
    state.t += 1 / 60
    const p = ease(state.p)
    dGroup.rotation.y = (1 - p) * 6 + state.t * 0.15 + state.mx * 0.4
    dGroup.rotation.x = (1 - p) * 3 + state.my * 0.3
    dGroup.scale.setScalar(0.2 + p * 0.8)
    solid.material.opacity = Math.max(0, (p - 0.55) / 0.45)
    wire.material.opacity = 0.5 * (1 - Math.max(0, (p - 0.4) / 0.5))
    shards.forEach((m, i) => {
      const local = THREE.MathUtils.clamp((p - i / shards.length * 0.4) * 1.6, 0, 1)
      m.position.copy(m.userData.from).multiplyScalar(1 - local)
      m.rotation.set(m.userData.rot.x * (1 - local), m.userData.rot.y * (1 - local), m.userData.rot.z * (1 - local))
      m.scale.setScalar(0.9 * (1 - local) + 0.0001)
      m.visible = local < 0.98
    })
    renderer.render(scene, camera)
  }
  render()

  return {
    setProgress: (v) => { state.p = THREE.MathUtils.clamp(v, 0, 1) },
    setActive: (v) => { state.active = v },
    dispose: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      geo.dispose(); shardGeo.dispose()
      scene.traverse((n) => n.material?.dispose?.())
      renderer.dispose()
    },
  }
}

const GALLERY_VERT = `
  uniform float uVel;
  uniform float uHover;
  uniform float uTime;
  varying vec2 vUv;
  varying float vRim;
  void main() {
    vUv = uv;
    vec3 p = position;
    float bow = sin(uv.x * 3.14159265);
    p.z += bow * (0.55 + uHover * 0.55);
    p.z += uVel * (uv.x - 0.5) * 3.0;
    p.y += sin(uv.x * 5.0 + uTime * 1.6) * (0.02 + abs(uVel) * 0.5);
    p.x += sin(uv.y * 3.0 + uTime) * 0.012;
    vRim = pow(1.0 - bow, 1.6);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const GALLERY_FRAG = `
  precision highp float;
  uniform sampler2D uMap;
  uniform float uVel;
  uniform float uHover;
  uniform float uActive;
  uniform float uReveal;
  uniform float uReflect;
  uniform vec3 uAccent;
  varying vec2 vUv;
  varying float vRim;

  float sdRound(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
  }

  void main() {
    vec2 uv = vUv;
    float sh = abs(uVel) * 0.05 + 0.0015 + uHover * 0.003;
    vec2 off = vec2((uv.x - 0.5) * sh * 2.0, 0.0);
    vec3 col = vec3(
      texture2D(uMap, uv + off).r,
      texture2D(uMap, uv).g,
      texture2D(uMap, uv - off).b
    );

    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, mix(0.4, 1.12, uActive));
    col *= mix(0.5, 1.28, uActive) + uHover * 0.2;
    col += uAccent * vRim * (0.1 + uActive * 0.2);

    vec2 c = uv - 0.5;
    float d = sdRound(c, vec2(0.5), 0.05);
    float mask = smoothstep(0.006, -0.002, d);
    float edge = smoothstep(0.018, 0.006, abs(d));
    col = mix(col, uAccent, edge * (0.22 + uActive * 0.6));
    col *= smoothstep(1.15, 0.28, length(c * 1.55));

    float alpha = mask * uReveal;
    if (uReflect > 0.5) alpha *= (1.0 - vUv.y) * 0.3 * uActive;

    gl_FragColor = vec4(col, alpha);
  }
`

const GLOW_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  void main() {
    float d = distance(vUv, vec2(0.5));
    gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * 0.26);
  }
`
const GLOW_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'

export function createGallery3D(canvas, sources) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
  camera.position.set(0, 0, 9)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(1.6, DPR))
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const accents = [0xffc93c, 0x7bdff2, 0xc8a2ff, 0xff9d7a, 0x9ff0cf, 0xff9fd6].map((h) => new THREE.Color(h))

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 18),
    new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0xffc93c) } },
    }),
  )
  glow.position.z = -5
  scene.add(glow)

  const dust = pointField(220, 7, 6, 0xffe6a8, 0x8fd0ff, 0.035)
  scene.add(dust)

  const loader = new THREE.TextureLoader()
  const PW = 3.4; const PH = 4.3; const GAP = 0.55
  const step = PW + GAP
  const group = new THREE.Group()
  scene.add(group)

  const geoPlane = new THREE.PlaneGeometry(PW, PH, 60, 44)

  const planes = sources.map((src, i) => {
    const tex = loader.load(src)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
    const uniforms = {
      uMap: { value: tex }, uVel: { value: 0 }, uHover: { value: 0 }, uActive: { value: 0 },
      uTime: { value: 0 }, uReveal: { value: 0 }, uReflect: { value: 0 },
      uAccent: { value: accents[i % accents.length] },
    }
    const mat = new THREE.ShaderMaterial({ vertexShader: GALLERY_VERT, fragmentShader: GALLERY_FRAG, transparent: true, uniforms })
    const mesh = new THREE.Mesh(geoPlane, mat)
    mesh.position.x = i * step

    const refl = new THREE.Mesh(geoPlane, mat.clone())
    refl.material.uniforms.uReflect.value = 1
    refl.position.y = -PH - 0.05
    refl.scale.y = -1
    mesh.add(refl)
    mesh.userData.refl = refl.material

    group.add(mesh)
    return mesh
  })
  const totalW = (sources.length - 1) * step

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.6, 0.7)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const state = { progress: 0, vel: 0, t: 0, hover: -1, reveal: 0, active: true }
  let raf = 0

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    camera.position.z = 9 * Math.max(1, 1.25 / camera.aspect)
  }
  window.addEventListener('resize', resize)
  resize()

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect()
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1
    const half = camera.position.z * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.aspect
    state.hover = Math.round((nx * half - group.position.x) / step)
  }
  const onLeave = () => { state.hover = -1 }
  canvas.addEventListener('pointermove', onMove, { passive: true })
  canvas.addEventListener('pointerleave', onLeave)

  renderer.compile(scene, camera)
  const lerp = (a, b, t) => a + (b - a) * t

  const render = () => {
    raf = requestAnimationFrame(render)
    if (!state.active) return
    state.t += 1 / 60
    state.vel *= 0.9

    group.position.x = -state.progress * totalW
    dust.rotation.y += 0.0009
    dust.rotation.x = Math.sin(state.t * 0.2) * 0.15
    glow.material.uniforms.uColor.value.lerp(accents[Math.round(state.progress * (planes.length - 1))], 0.05)
    bloom.strength = 0.32 + Math.abs(state.vel) * 0.5

    planes.forEach((m, i) => {
      const norm = (i * step + group.position.x) / step
      const dist = Math.abs(norm)
      const active = Math.max(0, 1 - dist * 0.85)

      m.position.x = i * step - norm * step * 0.34
      m.position.z = -Math.min(dist, 3) * 1.35
      m.rotation.y = THREE.MathUtils.clamp(-norm * 0.62, -1, 1)
      m.scale.setScalar(lerp(m.scale.x, 0.82 + active * 0.22, 0.15))

      const hovering = state.hover === i ? 1 : 0
      for (const u of [m.material.uniforms, m.userData.refl.uniforms]) {
        u.uTime.value = state.t
        u.uVel.value += (state.vel - u.uVel.value) * 0.2
        u.uHover.value += (hovering - u.uHover.value) * 0.12
        u.uActive.value += (active - u.uActive.value) * 0.12
        u.uReveal.value += (state.reveal - u.uReveal.value) * 0.08
      }
    })

    composer.render()
  }
  render()

  return {
    setProgress: (v) => { state.progress = THREE.MathUtils.clamp(v, 0, 1) },
    setVelocity: (v) => { state.vel = THREE.MathUtils.clamp(v, -1.5, 1.5) },
    setReveal: (v) => { state.reveal = v },
    setActive: (v) => { state.active = v },
    dispose: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      geoPlane.dispose()
      planes.forEach((m) => { m.material.uniforms.uMap.value.dispose(); m.material.dispose(); m.userData.refl.dispose() })
      glow.geometry.dispose(); glow.material.dispose()
      dust.geometry.dispose(); dust.material.dispose()
      composer.dispose(); bloom.dispose()
      renderer.dispose()
    },
  }
}
