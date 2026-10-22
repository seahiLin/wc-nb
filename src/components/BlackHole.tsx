import { useEffect, useRef, useState } from 'react'

/* 事件视界 —— 一个纯 Three.js 的黑洞。
   一次全屏渲染：光线在核心附近被弯曲，吸积盘的远端被抬到核心上方形成标志性的拱形，
   光子环紧贴阴影边缘。整体走电影感：炽白的冷色核心、琥珀色的外层、细腻的星尘。 */

type ThreeModule = typeof import('three')

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  varying vec2 vUv;

  #define PI 3.14159265359
  #define TILT 0.30          // 吸积盘的倾角：越小越接近正侧视
  #define HORIZON 0.205      // 事件视界的视半径
  #define DISK_IN 0.255      // 盘内缘
  #define DISK_OUT 1.05      // 盘外缘

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
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

  // 简单的色调映射，避免过曝的死白
  vec3 tonemap(vec3 c) {
    return c / (1.0 + c);
  }

  // 围绕核心弯曲采样空间：越近核心偏折越大，远景被微微转过去
  vec2 lens(vec2 p) {
    float r = length(p);
    float bend = 0.16 / (r * r + 0.045);
    return p * (1.0 + 0.055 / (r + 0.06)) + normalize(p + 1e-5) * bend * 0.05;
  }

  // 星场：细小的点光 + 稀疏的亮星
  vec3 stars(vec2 sp, float r) {
    float acc = 0.0;
    for (int k = 0; k < 3; k++) {
      float scale = 34.0 + float(k) * 46.0;
      vec2 cell = sp * scale + float(k) * 17.3;
      vec2 g = fract(cell) - 0.5;
      float h = hash(floor(cell));
      float dotSize = 0.055 + 0.03 * float(k);
      float spark = smoothstep(dotSize, 0.0, length(g)) * step(0.90 - float(k) * 0.02, h);
      float twinkle = 0.65 + 0.35 * sin(uTime * (0.5 + h * 2.4) + h * 42.0);
      acc += spark * twinkle * (1.0 + float(k) * 0.6);
    }
    // 核心附近恒星被拉长：沿切向堆叠成弧
    float haloGlow = smoothstep(0.9, 0.18, r) * 0.35;
    return vec3(0.86, 0.90, 1.0) * (acc + haloGlow * 0.25);
  }

  // 吸积盘：极坐标下用丝状噪声拉出流动的亮带
  vec3 disk(vec2 p, out float alpha) {
    alpha = 0.0;
    // 绕 x 轴旋转，把盘压扁成椭圆
    vec2 q = vec2(p.x, p.y / TILT);
    float r = length(q);
    if (r < DISK_IN || r > DISK_OUT) return vec3(0.0);

    float a = atan(q.y, q.x);

    // 内外缘柔和过渡
    float edgeIn = smoothstep(DISK_IN, DISK_IN + 0.045, r);
    float edgeOut = 1.0 - smoothstep(DISK_OUT - 0.42, DISK_OUT, r);
    float body = edgeIn * edgeOut;

    // 开普勒差速：越近核心转得越快
    float spin = uTime * (0.22 + 0.55 / max(r, 0.3));
    float swirl = a * 2.4 + spin;

    // 沿旋转方向拉伸的细丝
    vec2 s = vec2(swirl * 2.0, log(r) * 7.0 - uTime * 0.05);
    float wisp = fbm(s * 1.6);
    wisp = mix(wisp, fbm(s * 4.1 + 9.2), 0.5);
    float band = smoothstep(0.32, 0.78, wisp);

    // 温度：内缘白热，向外转为琥珀，最外缘暗红
    float t = clamp((r - DISK_IN) / (DISK_OUT - DISK_IN), 0.0, 1.0);
    vec3 hot = vec3(1.0, 0.97, 0.92);
    vec3 warm = vec3(1.0, 0.62, 0.26);
    vec3 cool = vec3(0.52, 0.18, 0.07);
    vec3 color = mix(hot, warm, smoothstep(0.0, 0.34, t));
    color = mix(color, cool, smoothstep(0.34, 1.0, t));

    // 亮度：内缘极亮，向外快速衰减
    float falloff = pow(1.0 - t, 1.9) * 0.92 + 0.075;
    float bright = body * (0.16 + band * 1.35) * falloff;

    // 多普勒增亮：盘的一侧朝向观测者
    float doppler = mix(0.55, 1.7, smoothstep(-0.6, 0.6, -p.x));
    bright *= doppler;

    // 内缘那一圈极窄的白热亮线
    bright += pow(1.0 - smoothstep(0.0, 0.055, r - DISK_IN), 2.2) * body * 0.85;

    alpha = clamp(bright, 0.0, 1.0);
    return color * bright;
  }

  void main() {
    // 屏幕坐标：y 向上，按高度归一，保证圆不变形
    vec2 uv = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float scale = 1.0 / min(uResolution.y / uResolution.x, 1.0) * 0.5;
    vec2 p = uv * (1.0 + scale * 0.18);
    p *= 1.0 - uPointer * 0.035;

    float r = length(p);

    // 天空
    vec2 sp = lens(p) * 1.7 + vec2(0.0, 0.12);
    vec3 color = stars(sp, r);

    // 远处的星际尘埃：极淡的冷紫，给纯黑一点深度
    float dust = fbm(sp * 1.4 + 3.7) * smoothstep(0.15, 1.2, r);
    color += mix(vec3(0.02, 0.03, 0.07), vec3(0.07, 0.04, 0.11), dust) * dust;

    // 吸积盘：远端被引力抬升，略高于阴影中心，形成标志性的拱形
    float diskAlpha;
    vec2 diskP = p;
    diskP.y -= smoothstep(0.0, 0.55, r) * 0.028;
    vec3 diskCol = disk(diskP, diskAlpha);
    color = color * (1.0 - diskAlpha * 0.85) + diskCol;

    // 光子环：紧贴阴影的一圈细亮环
    float ringR = HORIZON * 1.055;
    float ring = smoothstep(0.026, 0.002, abs(r - ringR));
    float ringGlow = smoothstep(0.11, 0.0, abs(r - ringR)) * 0.42;
    vec3 ringColor = mix(vec3(1.0, 0.90, 0.74), vec3(1.0, 1.0, 1.0), 0.55);
    color += ringColor * (ring * 1.15 + ringGlow);

    // 阴影：视界内部吞噬一切，边缘做微弱的软过渡
    float shadow = smoothstep(HORIZON * 0.97, HORIZON * 1.06, r);
    color *= shadow;

    // 暗角 + 色调映射
    color *= 1.0 - smoothstep(0.55, 1.35, r) * 0.55;
    color = tonemap(color * 1.25);
    color = pow(color, vec3(0.92));

    // 细微的胶片颗粒，压掉渐变的色带
    color += (hash(uv * uResolution + uTime) - 0.5) * 0.012;

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
        // 没有 WebGL 时的退路：一枚静态的暗环
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-[42vmin] w-[42vmin] rounded-full bg-black shadow-[0_0_120px_28px_rgba(255,176,96,0.18)] ring-1 ring-amber-200/25" />
        </div>
      ) : null}
    </div>
  )
}

function mountScene(THREE: ThreeModule, host: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x020204, 1)
  host.appendChild(renderer.domElement)
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0, 0) },
  }

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader: skyFragmentShader,
      depthTest: false,
      depthWrite: false,
    }),
  )
  scene.add(sky)

  // 交互：指针位置让画面轻微视差
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
    uniforms.uResolution.value.set(width, height)
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  const clock = new THREE.Clock()
  let frame = 0

  const render = () => {
    frame = requestAnimationFrame(render)
    const t = clock.getElapsedTime()

    pointer.x += (pointer.tx - pointer.x) * 0.04
    pointer.y += (pointer.ty - pointer.y) * 0.04

    uniforms.uTime.value = t
    uniforms.uPointer.value.set(
      pointer.x + Math.sin(t * 0.11) * 0.06,
      pointer.y + Math.sin(t * 0.16) * 0.04,
    )

    renderer.render(scene, camera)
  }
  render()

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    window.removeEventListener('pointermove', onPointerMove)
    host.removeEventListener('pointerleave', onPointerLeave)
    sky.geometry.dispose()
    ;(sky.material as InstanceType<ThreeModule['ShaderMaterial']>).dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
