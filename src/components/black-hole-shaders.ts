/* GLSL for the black hole renderer.

   Units: Schwarzschild radius r_s = 1, so M = 0.5, the horizon sits at r = 1,
   the photon sphere at r = 1.5 and the ISCO at r = 3. */

export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/* Simplex noise + helpers, shared by the scene passes. */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Three octaves is enough for a background this dim, and keeps the pass cheap.
float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 3; i++) {
    sum += amp * snoise(p);
    p = p * 2.07 + vec3(11.3, 7.7, 3.1);
    amp *= 0.5;
  }
  return sum;
}

vec3 hash33(vec3 p) {
  // Hash without sine: stable at the large integer inputs the star grid feeds it.
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
`

/* Physically based ray tracer for a Schwarzschild black hole.

   Every pixel integrates a null geodesic with RK4 (the exact orbit equation
   a = -3 M h² r⃗ / r⁵ in Cartesian form), a geometrically thin accretion disk
   is sampled where the ray crosses the equatorial plane, and its emission is
   shifted by the full relativistic Doppler + gravitational factor before being
   converted through a blackbody spectrum. */
export const BLACK_HOLE_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uCamRight;
uniform vec3  uCamUp;
uniform vec3  uCamFwd;
uniform float uTanHalfFov;
uniform float uPixelAngle;
uniform float uDiskInner;
uniform float uDiskOuter;
uniform float uDiskBrightness;
uniform float uBeaming;
uniform float uSteps;
uniform float uSpin;
uniform float uTemp;

${NOISE}

// ---------------------------------------------------------------- blackbody
// Tanner Helland's approximation, linearised for the HDR pipeline.
vec3 blackbody(float kelvin) {
  float t = clamp(kelvin, 1000.0, 30000.0) / 100.0;
  vec3 c;
  if (t <= 66.0) {
    c.r = 1.0;
    c.g = (99.4708025861 * log(t) - 161.1195681661) / 255.0;
    c.b = t <= 19.0 ? 0.0 : (138.5177312231 * log(max(t - 10.0, 1e-3)) - 305.0447927307) / 255.0;
  } else {
    c.r = 329.698727446 * pow(t - 60.0, -0.1332047592) / 255.0;
    c.g = 288.1221695283 * pow(t - 60.0, -0.0755148492) / 255.0;
    c.b = 1.0;
  }
  return pow(clamp(c, 0.0, 1.0), vec3(2.2));
}

// ---------------------------------------------------------------- background
// One star candidate per cubic cell, sized in radians so every layer keeps a
// roughly constant on-screen size: no aliasing and no popping as the camera drifts.
vec3 starLayer(vec3 d, float scale, float cutoff, float gain) {
  vec3 p = d * scale;
  vec3 id = floor(p);
  vec3 f = fract(p) - 0.5;
  vec3 h = hash33(id);
  float present = step(cutoff, h.z);
  vec3 off = (hash33(id + 19.19) - 0.5) * 0.55;
  float angDist = length(f - off) / scale;

  float radius = max(uPixelAngle * 1.1, 0.12 / scale);
  float core = 1.0 - smoothstep(0.0, radius, angDist);
  float glow = (1.0 - smoothstep(0.0, radius * 2.4, angDist)) * 0.18;

  float mag = pow(h.x, 5.0) * gain;
  vec3 tint = mix(vec3(1.0, 0.78, 0.58), vec3(0.68, 0.82, 1.0), h.y);
  return tint * mag * (core + glow) * present;
}

vec3 background(vec3 d) {
  vec3 col = vec3(0.0);

  // faint interstellar gas gathered along a galactic band
  vec3 axis = normalize(vec3(0.42, 0.86, -0.30));
  float t = dot(d, axis) * 2.7;
  float band = exp(-t * t);
  float g1 = fbm(d * 2.3 + 3.0);
  float g2 = snoise(d * 6.1 - 1.7);
  float gas = smoothstep(-0.30, 0.75, g1 * 0.8 + g2 * 0.35) * band;
  col += mix(vec3(0.05, 0.08, 0.20), vec3(0.26, 0.11, 0.16), g2 * 0.5 + 0.5) * gas * 0.40;

  // dark dust lanes carved out of the glow
  float dust = smoothstep(0.0, 0.7, snoise(d * 4.2 + 8.0)) * band;
  col *= 1.0 - dust * 0.65;

  // Three star layers of different densities. A layer of scale s covers ~4πs²
  // cells, so the cutoffs are picked to land in the low thousands of stars.
  col += starLayer(d, 130.0, 0.991, 2.4);
  col += starLayer(d, 340.0, 0.996, 0.95);
  col += starLayer(d, 640.0, 0.998, 0.42);

  return col;
}

// ------------------------------------------------------------- disk emission
// A photon stays in its own orbital plane, so the disk is sampled exactly where
// the ray crosses y = 0. Emission carries the full relativistic shift.
vec3 diskSample(vec3 hit, vec3 photonDir, out float alpha) {
  float r = max(length(hit.xz), 1e-3);
  float rin = uDiskInner;
  float rout = uDiskOuter;

  float radial = smoothstep(rin, rin * 1.03, r) * (1.0 - smoothstep(rout * 0.78, rout, r));

  // Differentially rotating turbulence. The gas orbits along phiHat, i.e. in the
  // direction of decreasing atan(z, x), so the Lagrangian label of a fluid
  // element is ang + omega*t. Adding a twist in log(r) turns the arcs into
  // trailing spiral arms.
  float ang = atan(hit.z, hit.x);
  float omega = uSpin * pow(rin / r, 1.5);
  float a = ang + uTime * omega + 1.7 * log(r / rin);
  vec2 dir = vec2(cos(a), sin(a));

  float lr = log(r);
  float n1 = fbm(vec3(dir * 2.4, lr * 4.5));
  float n2 = snoise(vec3(dir * 8.0, lr * 12.0));
  float dens = clamp(0.62 + 0.5 * n1 + 0.24 * n2, 0.05, 1.6);

  // Shakura-Sunyaev temperature profile, T ∝ r^(-3/4) with the zero-torque
  // factor at the inner edge, normalised to 1 at its peak (r ≈ 1.2 r_in).
  float ratio = rin / r;
  float tss = pow(max(1.0 - sqrt(ratio), 0.0), 0.25);
  float tn = pow(ratio, 0.75) * (0.55 + 0.45 * tss) / 0.625;
  float temp = uTemp * tn;

  // relativistic kinematics of the orbiting gas
  vec3 rhat = normalize(vec3(hit.x, 0.0, hit.z));
  vec3 phiHat = normalize(cross(vec3(0.0, 1.0, 0.0), rhat));
  float speed = min(sqrt(0.5 / max(r - 1.0, 1e-2)), 0.75);
  float gamma = 1.0 / sqrt(max(1.0 - speed * speed, 1e-3));
  float dop = 1.0 / max(gamma * (1.0 + dot(phiHat * speed, photonDir)), 1e-3);
  float grav = sqrt(max(1.0 - 1.0 / r, 0.0));
  float g = dop * grav;

  // surface brightness follows the shifted blackbody: a bright inner ring, a
  // warm fading outer disk, and strong beaming on the approaching side
  float inten = pow(tn, 3.0) * pow(g, uBeaming) * dens * radial * uDiskBrightness;

  // a thin slab turns opaque when it is seen edge on
  float edge = clamp(1.0 / max(abs(photonDir.y), 0.04), 1.0, 14.0);
  alpha = clamp(1.0 - exp(-dens * radial * 0.34 * edge), 0.0, 0.97);

  return blackbody(temp * g) * inten;
}

// ------------------------------------------------------------- geodesics
vec3 accel(vec3 p, float h2) {
  float r2 = dot(p, p);
  float r5 = r2 * r2 * sqrt(r2);
  return -1.5 * h2 * p / max(r5, 1e-6);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 rd = normalize(
    uCamFwd +
    uCamRight * (ndc.x * aspect * uTanHalfFov) +
    uCamUp * (ndc.y * uTanHalfFov)
  );

  vec3 pos = uCamPos;
  vec3 vel = rd;
  vec3 Lv = cross(pos, vel);
  float h2 = dot(Lv, Lv);

  vec3 accum = vec3(0.0);
  float trans = 1.0;
  float prevY = pos.y;
  bool escaped = false;

  // Beyond this radius the remaining deflection is negligible, so the ray can be
  // handed to the sky. It is tied to the camera distance because a portrait
  // viewport starts the ray much further out than a wide one.
  float far = length(uCamPos) + 6.0;

  for (int i = 0; i < 320; i++) {
    if (float(i) >= uSteps) break;

    float r = length(pos);
    if (r < 1.0) break;                       // crossed the horizon

    if (r > far && dot(pos, vel) > 0.0) {
      escaped = true;
      break;
    }

    // Step length scales with the radius: the empty space around the camera is
    // crossed quickly, while the disk and the photon sphere stay finely sampled.
    // A geometric progression from the camera to the horizon takes ~100 steps.
    float dt = clamp(0.055 * r, 0.008, 1.2);

    vec3 dv1 = accel(pos, h2);
    vec3 dx1 = vel;
    vec3 dv2 = accel(pos + 0.5 * dt * dx1, h2);
    vec3 dx2 = vel + 0.5 * dt * dv1;
    vec3 dv3 = accel(pos + 0.5 * dt * dx2, h2);
    vec3 dx3 = vel + 0.5 * dt * dv2;
    vec3 dv4 = accel(pos + dt * dx3, h2);
    vec3 dx4 = vel + dt * dv3;

    vec3 nextPos = pos + (dt / 6.0) * (dx1 + 2.0 * dx2 + 2.0 * dx3 + dx4);
    vec3 nextVel = vel + (dt / 6.0) * (dv1 + 2.0 * dv2 + 2.0 * dv3 + dv4);

    // did this step cross the equatorial plane?
    if (prevY * nextPos.y < 0.0) {
      float t = prevY / (prevY - nextPos.y);
      vec3 hit = mix(pos, nextPos, t);
      float rh = length(hit.xz);
      if (rh > uDiskInner && rh < uDiskOuter) {
        vec3 hitDir = normalize(mix(vel, nextVel, t));
        float a;
        vec3 e = diskSample(hit, hitDir, a);
        accum += trans * e;
        trans *= 1.0 - a;
      }
    }

    prevY = nextPos.y;
    pos = nextPos;
    vel = nextVel;

    if (trans < 0.01) break;
  }

  // Rays that never escape spiral into the horizon, which is black. This also
  // stops a spent step budget from producing junk sky samples.
  if (escaped) accum += trans * background(normalize(vel));

  gl_FragColor = vec4(min(accum, vec3(3000.0)), 1.0);
}
`

/* Bright pass: keep only what is above the bloom threshold. */
export const BRIGHT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uKnee;

void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = max(max(c.r, c.g), c.b);
  float w = smoothstep(uThreshold, uThreshold + uKnee, l);
  gl_FragColor = vec4(c * w, 1.0);
}
`

/* Separable 5-tap gaussian using the bilinear weight trick. */
export const BLUR_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform vec2 uDir;

void main() {
  vec2 s = uTexel * uDir;
  vec3 acc = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
  acc += texture2D(tDiffuse, vUv + s * 1.3846153846).rgb * 0.3162162162;
  acc += texture2D(tDiffuse, vUv - s * 1.3846153846).rgb * 0.3162162162;
  acc += texture2D(tDiffuse, vUv + s * 3.2307692308).rgb * 0.0702702703;
  acc += texture2D(tDiffuse, vUv - s * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(acc, 1.0);
}
`

/* Bloom, chromatic fringing, ACES tone map, vignette, grain, gamma. */
export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform vec2  uResolution;
uniform float uTime;
uniform float uBloom;
uniform float uExposure;
uniform float uGrain;

vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 d = vUv - 0.5;
  vec2 ca = d * dot(d, d) * 0.007;

  vec3 col;
  col.r = texture2D(tScene, vUv + ca).r;
  col.g = texture2D(tScene, vUv).g;
  col.b = texture2D(tScene, vUv - ca).b;

  vec3 bloom;
  bloom.r = texture2D(tBloom, vUv + ca * 2.0).r;
  bloom.g = texture2D(tBloom, vUv).g;
  bloom.b = texture2D(tBloom, vUv - ca * 2.0).b;
  col += bloom * uBloom;

  col = aces(col * uExposure);

  float vig = length(d) * 1.42;
  col *= 1.0 - 0.38 * pow(vig, 2.6);

  col += (hash12(vUv * uResolution + fract(uTime) * 311.0) - 0.5) * uGrain;

  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  col += (hash12(vUv * uResolution + 7.0) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`
