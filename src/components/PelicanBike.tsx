/* 骑自行车的鹈鹕 · 纯 SVG 动画

   全部动效只用 SMIL（<animate> / <animateTransform>）与内联 CSS，
   没有任何脚本：车轮自转、曲柄带动双腿踩踏、身体上下起伏，
   每 6 秒绕后轮着地点来一次翘头（wheelie），无限循环。 */

const CRANK = '1.2s'
const WHEEL = '1.1s'

/* 曲柄半径 30，中轴 (410,392)，髋部 (368,292)；
   以下 d 值由两段式腿部（大腿 78 + 小腿 82）反解得到，
   踏板每转 45° 一帧，与曲柄旋转线性同步。 */
const NEAR_LEG = [
  'M368 292 L444 310 L440 392',
  'M368 292 L435 331 L431 413',
  'M368 292 L428 342 L410 422',
  'M368 292 L428 341 L389 413',
  'M368 292 L435 331 L380 392',
  'M368 292 L444 310 L389 371',
  'M368 292 L446 288 L410 362',
  'M368 292 L446 290 L431 371',
]

const legValues = (frames: string[]) => [...frames, frames[0]].join(';')
const LEG_TIMES = '0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1'

function Wheel({ cx, cy }: { cx: number; cy: number }) {
  const d = 55 // 78 / √2，辐条对角偏移
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        from={`0 ${cx} ${cy}`}
        to={`360 ${cx} ${cy}`}
        dur={WHEEL}
        repeatCount="indefinite"
      />
      <circle cx={cx} cy={cy} r="88" fill="none" stroke="#2b3a42" strokeWidth="11" />
      <circle cx={cx} cy={cy} r="79" fill="none" stroke="#a8b8bf" strokeWidth="4" />
      <g stroke="#c3cfd5" strokeWidth="2.5" strokeLinecap="round">
        <line x1={cx} y1={cy - 76} x2={cx} y2={cy + 76} />
        <line x1={cx - 76} y1={cy} x2={cx + 76} y2={cy} />
        <line x1={cx - d} y1={cy - d} x2={cx + d} y2={cy + d} />
        <line x1={cx - d} y1={cy + d} x2={cx + d} y2={cy - d} />
      </g>
      <circle cx={cx} cy={cy} r="8" fill="#2b3a42" />
      <circle cx={cx} cy={cy} r="3" fill="#a8b8bf" />
    </g>
  )
}

export function PelicanBike({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 520"
      className={className}
      role="img"
      aria-labelledby="plc-title plc-desc"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="plc-title">A pelican riding a bicycle</title>
      <desc id="plc-desc">
        A pelican pedals a bicycle: the wheels spin, the legs pedal, the body bobs, and every few
        seconds the bike pops a wheelie. Animated with SMIL and CSS only.
      </desc>

      <defs>
        <linearGradient id="plc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef4f8" />
          <stop offset="62%" stopColor="#f6f2e7" />
          <stop offset="100%" stopColor="#efe6d3" />
        </linearGradient>
        <linearGradient id="plc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="68%" stopColor="#f8f2e4" />
          <stop offset="100%" stopColor="#e7dcc6" />
        </linearGradient>
        <linearGradient id="plc-beak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9c265" />
          <stop offset="100%" stopColor="#ee9b2c" />
        </linearGradient>
        <linearGradient id="plc-pouch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8ca7a" />
          <stop offset="100%" stopColor="#f2ab45" />
        </linearGradient>
      </defs>

      <style>{`
        @keyframes plc-dash {
          0%   { transform: translateX(26px); opacity: 0; }
          25%  { opacity: 0.55; }
          75%  { opacity: 0.55; }
          100% { transform: translateX(-66px); opacity: 0; }
        }
        .plc-dash { animation: plc-dash 1.6s linear infinite; }
        .plc-dash-2 { animation-delay: 0.53s; }
        .plc-dash-3 { animation-delay: 1.06s; }
      `}</style>

      <rect width="800" height="520" fill="url(#plc-sky)" />

      {/* 速度线：与骑行方向相反的残影 */}
      <g stroke="#b9ad95" strokeWidth="4" strokeLinecap="round">
        <line className="plc-dash" x1="72" y1="298" x2="142" y2="298" />
        <line className="plc-dash plc-dash-2" x1="34" y1="350" x2="94" y2="350" />
        <line className="plc-dash plc-dash-3" x1="96" y1="402" x2="156" y2="402" />
      </g>

      {/* 地面与投影 */}
      <path d="M0 469 H800 V520 H0 Z" fill="#e6ddca" />
      <path d="M0 469 H800" stroke="#cfc3aa" strokeWidth="2" />
      <ellipse cx="412" cy="471" rx="248" ry="9" fill="#c7baa0" opacity="0.55" />

      {/* 整台车 + 骑手：绕后轮着地点 (245,469) 翘头 */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 245 469;0 245 469;-17 245 469;-17 245 469;-1.5 245 469;0 245 469"
          keyTimes="0;0.55;0.66;0.78;0.88;1"
          calcMode="spline"
          keySplines="0 0 1 1;0.34 0 0.4 1;0 0 1 1;0.42 0 0.7 1;0.4 0 0.6 1"
          dur="6s"
          repeatCount="indefinite"
        />

        <Wheel cx={245} cy={375} />
        <Wheel cx={575} cy={375} />

        {/* 远侧腿（在车架之后） */}
        <path
          d={NEAR_LEG[4]}
          fill="none"
          stroke="#d9882a"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <animate
            attributeName="d"
            values={legValues([...NEAR_LEG.slice(4), ...NEAR_LEG.slice(0, 4)])}
            keyTimes={LEG_TIMES}
            dur={CRANK}
            repeatCount="indefinite"
          />
        </path>

        {/* 远侧曲柄 + 踏板 */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="180 410 392;540 410 392"
            dur={CRANK}
            repeatCount="indefinite"
          />
          <line x1="410" y1="392" x2="440" y2="392" stroke="#1d2a30" strokeWidth="7" strokeLinecap="round" />
        </g>
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="180 410 392;540 410 392"
            dur={CRANK}
            repeatCount="indefinite"
          />
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-180 440 392;-540 440 392"
              dur={CRANK}
              repeatCount="indefinite"
            />
            <rect x="424" y="386" width="32" height="7" rx="3.5" fill="#1d2a30" />
            <ellipse cx="440" cy="383" rx="12" ry="6" fill="#d9882a" />
          </g>
        </g>

        {/* 链条与车架 */}
        <g stroke="#5a6b73" strokeWidth="3" fill="none">
          <path d="M410 370 L245 366" />
          <path d="M410 414 L245 384" />
        </g>
        <g fill="none" stroke="#2f6f7e" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
          <path d="M410 392 L245 375" />
          <path d="M348 268 L245 375" />
          <path d="M410 392 L348 268" />
          <path d="M348 268 L546 258" />
          <path d="M410 392 L556 312" />
          <path d="M546 258 L556 312" />
          <path d="M556 312 C564 330 570 352 575 375" />
        </g>
        <circle cx="410" cy="392" r="22" fill="none" stroke="#2b3a42" strokeWidth="5" />
        <circle cx="245" cy="375" r="10" fill="none" stroke="#2b3a42" strokeWidth="4" />
        <path
          d="M306 266 C310 250 330 244 350 248 L372 253 C380 255 379 266 370 267 L320 271 C308 272 302 271 306 266 Z"
          fill="#2b3a42"
        />
        <g fill="none" stroke="#2b3a42" strokeWidth="9" strokeLinecap="round">
          <path d="M546 258 L560 238" />
          <path d="M552 240 C566 230 582 230 592 238" />
        </g>

        {/* 近侧曲柄 */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 410 392;360 410 392"
            dur={CRANK}
            repeatCount="indefinite"
          />
          <line x1="410" y1="392" x2="440" y2="392" stroke="#23323b" strokeWidth="8" strokeLinecap="round" />
        </g>

        {/* 近侧腿 */}
        <path
          d={NEAR_LEG[0]}
          fill="none"
          stroke="#ef9a2e"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <animate
            attributeName="d"
            values={legValues(NEAR_LEG)}
            keyTimes={LEG_TIMES}
            dur={CRANK}
            repeatCount="indefinite"
          />
        </path>

        {/* 近侧踏板 + 蹼足 */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 410 392;360 410 392"
            dur={CRANK}
            repeatCount="indefinite"
          />
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 440 392;-360 440 392"
              dur={CRANK}
              repeatCount="indefinite"
            />
            <rect x="424" y="386" width="32" height="7" rx="3.5" fill="#23323b" />
            <ellipse cx="440" cy="383" rx="12" ry="6" fill="#ef9a2e" />
          </g>
        </g>

        {/* 鹈鹕本体：轻微上下起伏 */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;0 -5;0 0;0 -5;0 0"
            keyTimes="0;0.25;0.5;0.75;1"
            calcMode="spline"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
            dur={CRANK}
            repeatCount="indefinite"
          />

          {/* 尾羽 */}
          <path
            d="M268 238 C236 218 206 206 182 202 C194 216 200 226 196 236 C214 238 222 246 218 256 C240 252 256 258 266 266 Z"
            fill="#fdfaf2"
            stroke="#d9cdb6"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* 身体 */}
          <ellipse cx="322" cy="246" rx="96" ry="61" fill="url(#plc-body)" transform="rotate(-6 322 246)" />

          {/* 脖子 */}
          <path
            d="M366 232 C380 202 400 180 424 168"
            fill="none"
            stroke="#d9cdb6"
            strokeWidth="42"
            strokeLinecap="round"
          />
          <path
            d="M366 232 C380 202 400 180 424 168"
            fill="none"
            stroke="#fdfaf2"
            strokeWidth="37"
            strokeLinecap="round"
          />

          {/* 头 */}
          <path
            d="M424 134 C412 125 402 128 398 137 C409 139 418 143 424 149 Z"
            fill="#f3ebd9"
            stroke="#d9cdb6"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="450" cy="156" r="31" fill="#fdfaf2" stroke="#d9cdb6" strokeWidth="2" />

          {/* 喙与喉囊 */}
          <path
            d="M462 156 C506 158 560 162 600 156 C594 184 572 204 540 204 C502 204 468 182 462 156 Z"
            fill="url(#plc-pouch)"
            stroke="#d98c26"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M462 142 C508 140 560 148 600 156 C560 162 506 158 462 156 Z"
            fill="url(#plc-beak)"
            stroke="#d98c26"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* 眼睛 */}
          <circle cx="455" cy="141" r="5.5" fill="#1e2a31" />
          <circle cx="456.8" cy="139.2" r="1.8" fill="#ffffff" opacity="0.9" />

          {/* 翅膀：搭在车把上 */}
          <path
            d="M294 234 C336 202 398 196 452 210 C496 220 538 230 564 238 C570 240 570 248 562 250 C520 260 440 270 372 268 C326 266 296 254 292 242 Z"
            fill="#f3ebd9"
            stroke="#d9cdb6"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <g fill="none" stroke="#d9cdb6" strokeWidth="2.5" strokeLinecap="round">
            <path d="M300 240 C322 232 348 226 374 222" />
            <path d="M316 250 C350 244 390 240 430 236" />
            <path d="M340 262 C380 258 420 252 462 246" />
          </g>
        </g>
      </g>
    </svg>
  )
}
