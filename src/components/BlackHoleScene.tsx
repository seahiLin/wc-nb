import { useEffect, useRef, useState } from 'react'
import { BLACK_HOLE_FRAG, BLUR_FRAG, BRIGHT_FRAG, COMPOSITE_FRAG, QUAD_VERT } from './black-hole-shaders'

/* Three.js is pulled from a CDN at runtime rather than declared as a dependency:
   this app is built with `npm ci`, so package.json and the lockfile have to stay
   in sync, and the renderer only ever runs in the browser. */

const CDN_SOURCES = [
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
  'https://unpkg.com/three@0.170.0/build/three.module.js',
  'https://esm.sh/three@0.170.0',
]

let threePromise: Promise<any> | null = null

function importThree(url: string): Promise<any> {
  // The literal comment keeps bundlers from trying to resolve this at build time.
  return import(/* @vite-ignore */ url)
}

function loadThree(): Promise<any> {
  if (!threePromise) {
    threePromise = (async () => {
      for (const url of CDN_SOURCES) {
        try {
          const module = await importThree(url)
          if (module?.WebGLRenderer) return module
        } catch {
          // try the next mirror
        }
      }
      threePromise = null
      throw new Error('three.js could not be loaded')
    })()
  }
  return threePromise
}

export function BlackHoleScene() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let raf = 0
    let teardown: (() => void) | undefined

    void (async () => {
      let THREE: any
      try {
        THREE = await loadThree()
      } catch {
        return // the CSS fallback stays visible
      }
      if (disposed) return

      let renderer: any
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' })
      } catch {
        return
      }
      renderer.setPixelRatio(1)
      renderer.domElement.className = 'bh-canvas'
      host.appendChild(renderer.domElement)

      const quadScene = new THREE.Scene()
      const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      const quadGeometry = new THREE.PlaneGeometry(2, 2)

      const small = Math.min(host.clientWidth || 1280, host.clientHeight || 800) < 620

      const uniforms = {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uCamPos: { value: new THREE.Vector3(0, 0, 20) },
        uCamRight: { value: new THREE.Vector3(1, 0, 0) },
        uCamUp: { value: new THREE.Vector3(0, 1, 0) },
        uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
        uTanHalfFov: { value: Math.tan((40 * Math.PI) / 360) },
        uPixelAngle: { value: 0.001 },
        uDiskInner: { value: 3.0 },
        uDiskOuter: { value: 8.0 },
        uDiskBrightness: { value: 2.6 },
        uBeaming: { value: 3.0 },
        uSteps: { value: small ? 150 : 240 },
        uSpin: { value: 0.55 },
        uTemp: { value: 6500.0 },
      }

      const passBase = { vertexShader: QUAD_VERT, depthTest: false, depthWrite: false }

      const sceneMaterial = new THREE.ShaderMaterial({ ...passBase, uniforms, fragmentShader: BLACK_HOLE_FRAG })
      const brightMaterial = new THREE.ShaderMaterial({
        ...passBase,
        uniforms: { tDiffuse: { value: null }, uThreshold: { value: 1.1 }, uKnee: { value: 0.9 } },
        fragmentShader: BRIGHT_FRAG,
      })
      const blurMaterial = new THREE.ShaderMaterial({
        ...passBase,
        uniforms: {
          tDiffuse: { value: null },
          uTexel: { value: new THREE.Vector2(1, 1) },
          uDir: { value: new THREE.Vector2(1, 0) },
        },
        fragmentShader: BLUR_FRAG,
      })
      const compositeMaterial = new THREE.ShaderMaterial({
        ...passBase,
        uniforms: {
          tScene: { value: null },
          tBloom: { value: null },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uBloom: { value: 0.6 },
          uExposure: { value: 1.0 },
          uGrain: { value: 0.028 },
        },
        fragmentShader: COMPOSITE_FRAG,
      })

      const quad = new THREE.Mesh(quadGeometry, sceneMaterial)
      quad.frustumCulled = false
      quadScene.add(quad)

      const rtOptions = {
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
      }
      const sceneRT = new THREE.WebGLRenderTarget(1, 1, rtOptions)
      const bloomA = new THREE.WebGLRenderTarget(1, 1, rtOptions)
      const bloomB = new THREE.WebGLRenderTarget(1, 1, rtOptions)

      /* A fixed pixel budget keeps the cost of the geodesic integrator roughly
         constant across screen sizes; `quality` scales it down further if this
         GPU cannot keep up. */
      let quality = 1
      let camDistance = 20

      function resize() {
        const cssW = host.clientWidth || window.innerWidth
        const cssH = host.clientHeight || window.innerHeight
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const aspect = cssW / Math.max(cssH, 1)

        const budget = small ? 0.5e6 : 1.15e6
        const native = cssW * dpr * cssH * dpr
        const scale = quality * Math.min(1, Math.sqrt(budget / Math.max(native, 1)))
        const w = Math.max(64, Math.round(cssW * dpr * scale))
        const h = Math.max(64, Math.round(cssH * dpr * scale))

        renderer.setSize(w, h, false)
        uniforms.uResolution.value.set(w, h)
        compositeMaterial.uniforms.uResolution.value.set(w, h)
        sceneRT.setSize(w, h)

        const bw = Math.max(16, Math.round(w / 2))
        const bh = Math.max(16, Math.round(h / 2))
        bloomA.setSize(bw, bh)
        bloomB.setSize(bw, bh)
        blurMaterial.uniforms.uTexel.value.set(1 / bw, 1 / bh)

        // Narrow viewports pull the camera back so the shadow keeps a sensible
        // share of the frame instead of being squeezed by the short axis.
        const fit = Math.min(1, Math.max(0.35, aspect / 1.6))
        camDistance = 20 + (1 - fit) * 11
        uniforms.uPixelAngle.value = (2 * uniforms.uTanHalfFov.value) / h
      }
      resize()

      // -------------------------------------------------------------- camera
      const camPos = new THREE.Vector3()
      const fwd = new THREE.Vector3()
      const right = new THREE.Vector3()
      const up = new THREE.Vector3()
      const worldUp = new THREE.Vector3(0, 1, 0)

      const pointer = { x: 0, y: 0 }
      const pointerTarget = { x: 0, y: 0 }
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1

      function updateCamera(elapsed: number) {
        const azimuth = elapsed * 0.055 + pointer.x * 0.5
        const inclination = 0.26 + Math.sin(elapsed * 0.08) * 0.03 + pointer.y * 0.18
        const distance = camDistance * (1 + Math.sin(elapsed * 0.05) * 0.02)
        const flat = Math.cos(inclination) * distance

        camPos.set(Math.cos(azimuth) * flat, Math.sin(inclination) * distance, Math.sin(azimuth) * flat)
        fwd.copy(camPos).negate().normalize()
        right.crossVectors(fwd, worldUp).normalize()
        up.crossVectors(right, fwd).normalize()

        uniforms.uCamPos.value.copy(camPos)
        uniforms.uCamFwd.value.copy(fwd)
        uniforms.uCamRight.value.copy(right)
        uniforms.uCamUp.value.copy(up)
      }

      // -------------------------------------------------------------- render
      function renderFrame(elapsed: number) {
        quad.material = sceneMaterial
        renderer.setRenderTarget(sceneRT)
        renderer.render(quadScene, quadCamera)

        quad.material = brightMaterial
        brightMaterial.uniforms.tDiffuse.value = sceneRT.texture
        renderer.setRenderTarget(bloomA)
        renderer.render(quadScene, quadCamera)

        quad.material = blurMaterial
        for (let i = 0; i < 2; i++) {
          blurMaterial.uniforms.tDiffuse.value = bloomA.texture
          blurMaterial.uniforms.uDir.value.set(1, 0)
          renderer.setRenderTarget(bloomB)
          renderer.render(quadScene, quadCamera)

          blurMaterial.uniforms.tDiffuse.value = bloomB.texture
          blurMaterial.uniforms.uDir.value.set(0, 1)
          renderer.setRenderTarget(bloomA)
          renderer.render(quadScene, quadCamera)
        }

        quad.material = compositeMaterial
        compositeMaterial.uniforms.tScene.value = sceneRT.texture
        compositeMaterial.uniforms.tBloom.value = bloomA.texture
        compositeMaterial.uniforms.uTime.value = elapsed
        renderer.setRenderTarget(null)
        renderer.render(quadScene, quadCamera)
      }

      let elapsed = 0
      let last = performance.now()
      let shown = false
      let frames = 0
      let frameTime = 16
      let downgrades = 0

      function tick() {
        raf = requestAnimationFrame(tick)

        const now = performance.now()
        const rawDt = now - last
        const dt = Math.min(rawDt / 1000, 0.1)
        last = now
        elapsed += dt * motion

        const ease = Math.min(1, dt * 2.2)
        pointer.x += (pointerTarget.x - pointer.x) * ease
        pointer.y += (pointerTarget.y - pointer.y) * ease

        uniforms.uTime.value = elapsed
        updateCamera(elapsed)
        renderFrame(elapsed)

        if (!shown) {
          shown = true
          setReady(true)
        }

        frameTime = frameTime * 0.92 + Math.min(rawDt, 120) * 0.08
        frames++
        if (frames % 90 === 0) {
          if (frameTime > 26 && downgrades < 3) {
            downgrades++
            quality = Math.max(0.5, quality * 0.8)
            uniforms.uSteps.value = Math.max(90, Math.round(uniforms.uSteps.value * 0.85))
            resize()
          } else if (frameTime < 12 && quality < 1) {
            quality = Math.min(1, quality * 1.1)
            resize()
          }
        }
      }

      const onPointerMove = (event: PointerEvent) => {
        pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1
        pointerTarget.y = -((event.clientY / window.innerHeight) * 2 - 1)
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true })

      // Stop integrating geodesics while the tab is hidden.
      const onVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(raf)
          raf = 0
        } else if (!raf && !disposed) {
          last = performance.now()
          raf = requestAnimationFrame(tick)
        }
      }
      document.addEventListener('visibilitychange', onVisibility)

      const resizeObserver = new ResizeObserver(() => resize())
      resizeObserver.observe(host)

      raf = requestAnimationFrame(tick)

      teardown = () => {
        resizeObserver.disconnect()
        window.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('visibilitychange', onVisibility)
        sceneRT.dispose()
        bloomA.dispose()
        bloomB.dispose()
        quadGeometry.dispose()
        sceneMaterial.dispose()
        brightMaterial.dispose()
        blurMaterial.dispose()
        compositeMaterial.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    })()

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      teardown?.()
    }
  }, [])

  return (
    <div ref={hostRef} className="relative h-full w-full overflow-hidden bg-black">
      <div className={`bh-fallback ${ready ? 'bh-fallback--hidden' : ''}`} aria-hidden="true" />
    </div>
  )
}
