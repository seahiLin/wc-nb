import { useEffect, useRef, useState } from 'react'

/* 事件视界 —— 一个纯 Three.js 的黑洞。
   坍缩的核心与扁平的吸积盘，盘面绕黑洞高速旋转，光子环把弯曲的光缝成一道细环，
   引力透镜把背景星场拉成绕行核心的弧线。鼠标可以轻微改变视角，没有鼠标时自动漂移。 */

type ThreeModule = typeof import('three')

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// 吸积盘：环带状的亮带 + 差速旋转 + 多普勒式的前后明暗差
const diskFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uHot;
  uniform vec3 uCool;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);

    // 环带范围：内缘紧贴光子环，外缘渐隐
    float inner = 0.30;
    float outer = 0.98;
    float band = smoothstep(inner, inner + 0.10, r) * (1.0 - smoothstep(outer - 0.45, outer, r));
    if (band <= 0.001) discard;

    // 开普勒式差速旋转：越靠近核心转得越快
    float spin = uTime * (0.30 + 0.85 / max(r, 0.25));
    float swirl = a * 3.0 + spin;

    // 沿旋转方向拉长的丝状纹理
    vec2 q = vec2(swirl * 1.7, r * 7.0 - uTime * 0.25);
    float wisps = fbm(q);
    wisps = mix(wisps, fbm(q * 2.7 + 12.4), 0.45);

    float streak = smoothstep(0.30, 0.85, wisps);

    // 亮带：靠近内缘的白热过渡
    float heat = pow(1.0 - smoothstep(inner, inner + 0.55, r), 1.6);
    vec3 color = mix(uCool, uHot, clamp(streak * 0.65 + heat * 0.9, 0.0, 1.0));

    // 前侧（朝向观众的下半边）更亮，模拟多普勒增亮
    float doppler = mix(0.45, 1.45, smoothstep(-0.55, 0.55, -p.y));
    float intensity = band * (0.22 + streak * 1.25) * doppler;

    // 内缘那一圈过曝的白
    intensity += pow(1.0 - smoothstep(0.0, 0.09, r - inner), 2.0) * band * 0.9;

    gl_FragColor = vec4(color * intensity, clamp(intensity, 0.0, 1.0));
  }
`

// 背景星场 + 引力透镜：靠近核心的星点被拉成弧线，核心附近留出纯黑
const starFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uCenter;
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 289.1))) * 127.1);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p *= 2.11;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = (vUv - uCenter) * vec2(uAspect, 1.0);
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    // 透镜：把极坐标向外压缩，越近核心弧线拉得越长
    float bend = 1.0 / (1.0 + 0.35 / max(r, 0.05));
    vec2 warped = vec2(cos(a + bend * 0.9), sin(a + bend * 0.9)) * pow(r, 1.0 - 0.55 * bend);

    // 极坐标星点：天然就是环绕核心的弧
    float bands = 90.0;
    vec2 cell = vec2(a / 6.28318 * bands + r * 2.5, r * 34.0);
    cell = cell * 1.0 + vec2(bend * 4.0, 0.0);
    float star = 0.0;
    for (int i = 0; i < 2; i++) {
      vec2 c = cell * (1.0 + float(i) * 1.7) + float(i) * 9.0;
      vec2 g = fract(c) - 0.5;
      float h = hash(floor(c));
      float spark = smoothstep(0.10, 0.0, length(g)) * step(0.72, h);
      spark *= 0.55 + 0.45 * sin(uTime * (0.6 + h * 2.2) + h * 31.4);
      star += spark;
    }
    star *= smoothstep(0.16, 0.42, r);

    // 远处的星云尘埃
    float dust = fbm(warped * 3.2 + 4.0) * smoothstep(0.05, 0.9, r);
    vec3 nebula = mix(vec3(0.05, 0.07, 0.14), vec3(0.16, 0.09, 0.22), dust) * dust * 0.55;

    // 核心处吞噬一切
    float shadow = smoothstep(0.055, 0.20, r);
    vec3 color = (nebula + vec3(0.86, 0.90, 1.0) * star * 1.5) * shadow;

    gl_FragColor = vec4(color, 1.0);
  }
`

export function BlackHole() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let cleanup: (() => void) | undefined

    // Three.js 只用浏览器里的 WebGL，所以只在客户端按需加载
    import('three')
      .then((THREE: ThreeModule) => {
        if (disposed) return
        cleanup = mountScene(THREE, host)
      })
      .catch(() => {
        if (!disposed) setFailed(true)
      })

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [])

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {failed ? (
        // 没有 WebGL 时的退路：一枚静态的、会呼吸的暗环
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-[46vmin] w-[46vmin] rounded-full bg-black shadow-[0_0_120px_30px_rgba(255,170,90,0.22)] ring-1 ring-amber-300/30" />
        </div>
      ) : null}
    </div>
  )
}

function mountScene(THREE: ThreeModule, host: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x030305, 1)
  host.appendChild(renderer.domElement)
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 1.15, 3.6)
  camera.lookAt(0, 0, 0)

  // 背景：全屏星场与镜片
  const bgScene = new THREE.Scene()
  const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const bgUniforms = {
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: 1 },
  }
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: bgUniforms,
      vertexShader,
      fragmentShader: starFragmentShader,
      depthTest: false,
      depthWrite: false,
    }),
  )
  bgScene.add(bg)

  // 事件视界：纯黑的球
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  )
  scene.add(horizon)

  // 光子环：绕核心的一圈薄光，正对镜头
  const photonRing = new THREE.Mesh(
    new THREE.RingGeometry(0.66, 0.735, 160),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          float ring = smoothstep(0.86, 0.97, r) * (1.0 - smoothstep(0.97, 1.0, r));
          float flicker = 0.85 + 0.15 * sin(uTime * 2.2 + p.y * 6.0);
          vec3 color = mix(vec3(1.0, 0.72, 0.36), vec3(1.0, 0.98, 0.94), ring);
          gl_FragColor = vec4(color, ring * flicker);
        }
      `,
    }),
  )
  scene.add(photonRing)

  // 吸积盘：一个略倾的平面环
  const diskUniforms = {
    uTime: { value: 0 },
    uHot: { value: new THREE.Color(0xfff3dc) },
    uCool: { value: new THREE.Color(0xff7a2f) },
  }
  const disk = new THREE.Mesh(
    new THREE.RingGeometry(0.68, 3.2, 256, 64),
    new THREE.ShaderMaterial({
      uniforms: diskUniforms,
      vertexShader,
      fragmentShader: diskFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  disk.rotation.x = -Math.PI / 2
  disk.scale.y = 0.28
  scene.add(disk)

  const photonMaterial = photonRing.material as THREE.ShaderMaterial

  // 交互：指针位置带来一点视差，松手后回落到默认视角
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  const onPointerMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect()
    pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2
  }
  const onPointerLeave = () => {
    pointer.tx = 0
    pointer.ty = 0
  }
  window.addEventListener('pointermove', onPointerMove)
  host.addEventListener('pointerleave', onPointerLeave)

  const resize = () => {
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    bgUniforms.uAspect.value = width / height
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  const clock = new THREE.Clock()
  let frame = 0

  const render = () => {
    frame = requestAnimationFrame(render)
    const t = clock.getElapsedTime()

    pointer.x += (pointer.tx - pointer.x) * 0.045
    pointer.y += (pointer.ty - pointer.y) * 0.045

    camera.position.x = pointer.x * 0.55 + Math.sin(t * 0.12) * 0.12
    camera.position.y = 1.15 + pointer.y * 0.35 + Math.sin(t * 0.17) * 0.05
    camera.lookAt(0, 0, 0)

    diskUniforms.uTime.value = t
    bgUniforms.uTime.value = t
    photonMaterial.uniforms.uTime.value = t
    disk.rotation.z = t * 0.06

    renderer.autoClear = false
    renderer.clear()
    renderer.render(bgScene, bgCamera)
    renderer.render(scene, camera)
  }
  render()

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    window.removeEventListener('pointermove', onPointerMove)
    host.removeEventListener('pointerleave', onPointerLeave)
    scene.traverse((object) => {
      const mesh = object as InstanceType<ThreeModule['Mesh']>
      mesh.geometry?.dispose()
      const material = mesh.material
      if (Array.isArray(material)) material.forEach((item) => item.dispose())
      else material?.dispose()
    })
    bg.geometry.dispose()
    ;(bg.material as THREE.Material).dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
