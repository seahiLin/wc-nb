/* 火星上的犰狳：渔网袜 · 横穿马路

   纯手写 SVG（无外部图片与字体），viewBox 0 0 800 600，白色底。
   渔网用 9px 的 pattern 裁到腿部描边上，所以腿是"网袜"而不是黑裤。 */

export function MarsArmadillo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 600"
      width="800"
      height="600"
      className={className}
      role="img"
      aria-label="一只穿着渔网袜的犰狳正在火星上横穿马路"
    >
      <defs>
        <linearGradient id="shellG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfa87a" />
          <stop offset="0.55" stopColor="#a37f56" />
          <stop offset="1" stopColor="#6f5236" />
        </linearGradient>
        <linearGradient id="headG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c49b6c" />
          <stop offset="1" stopColor="#8a6a48" />
        </linearGradient>
        <linearGradient id="tailG" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b18b61" />
          <stop offset="1" stopColor="#6b4e34" />
        </linearGradient>
        <linearGradient id="groundG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dd7f42" />
          <stop offset="1" stopColor="#ac4a19" />
        </linearGradient>
        <linearGradient id="roadG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5c4744" />
          <stop offset="1" stopColor="#362829" />
        </linearGradient>
        <linearGradient id="hillG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eeb08a" />
          <stop offset="1" stopColor="#cf7a45" />
        </linearGradient>
        <pattern id="net" width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 0L9 9M9 0L0 9" fill="none" stroke="#141419" strokeWidth="1.3" />
        </pattern>
        <clipPath id="shellClip">
          <ellipse cx="425" cy="440" rx="112" ry="58" />
        </clipPath>
      </defs>

      {/* background */}
      <rect width="800" height="600" fill="#ffffff" />

      {/* distant hills */}
      <path
        d="M0 388 L70 348 L142 380 L212 342 L292 378 L362 350 L442 382 L522 346 L602 380 L672 348 L752 380 L800 354 L800 434 L0 434 Z"
        fill="url(#hillG)"
        opacity="0.55"
      />

      {/* mars ground */}
      <rect x="0" y="400" width="800" height="200" fill="url(#groundG)" />
      <g fill="#93400f" opacity="0.35">
        <ellipse cx="60" cy="418" rx="26" ry="7" />
        <ellipse cx="212" cy="408" rx="18" ry="5" />
        <ellipse cx="700" cy="414" rx="30" ry="8" />
        <ellipse cx="470" cy="404" rx="14" ry="4" />
      </g>

      {/* road */}
      <rect x="0" y="424" width="800" height="10" fill="#e8b184" opacity="0.75" />
      <path d="M0 434 L800 434 L800 600 L0 600 Z" fill="url(#roadG)" />
      <g stroke="#f0d8b4" strokeWidth="6" strokeDasharray="46 40" opacity="0.8">
        <line x1="0" y1="512" x2="800" y2="512" />
      </g>
      <g stroke="#f0d8b4" strokeWidth="3" opacity="0.35">
        <line x1="0" y1="592" x2="800" y2="592" />
      </g>

      {/* roadside sign */}
      <g>
        <rect x="97" y="342" width="7" height="92" fill="#7a6f6a" />
        <rect
          x="45"
          y="292"
          width="112"
          height="56"
          rx="6"
          fill="#f7f5f0"
          stroke="#c0392b"
          strokeWidth="3"
        />
        <text
          x="101"
          y="316"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="15"
          fontWeight="700"
          fill="#c0392b"
          textAnchor="middle"
        >
          NO
        </text>
        <text
          x="101"
          y="334"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="10"
          fontWeight="700"
          fill="#c0392b"
          textAnchor="middle"
        >
          JAYWALKING
        </text>
      </g>

      {/* shadow */}
      <ellipse cx="442" cy="558" rx="152" ry="16" fill="#150d0f" opacity="0.35" />

      {/* far legs (fishnet tights) */}
      <g fill="none" strokeLinecap="round">
        <path d="M400 480 C390 504 386 526 392 548" stroke="#2a2028" strokeWidth="22" opacity="0.85" />
        <path d="M400 480 C390 504 386 526 392 548" stroke="url(#net)" strokeWidth="22" opacity="0.75" />
        <path d="M480 472 C490 496 486 522 478 548" stroke="#2a2028" strokeWidth="22" opacity="0.85" />
        <path d="M480 472 C490 496 486 522 478 548" stroke="url(#net)" strokeWidth="22" opacity="0.75" />
      </g>
      <ellipse cx="392" cy="552" rx="14" ry="8" fill="#241c26" />
      <ellipse cx="478" cy="552" rx="14" ry="8" fill="#241c26" />

      {/* tail */}
      <path
        d="M322 446 C292 438 264 448 250 472 C240 490 244 510 258 518 C250 502 254 486 266 472 C282 454 302 448 322 456 Z"
        fill="url(#tailG)"
        stroke="#5c422c"
        strokeWidth="2"
      />
      <g fill="none" stroke="#5c422c" strokeWidth="2" opacity="0.85">
        <path d="M302 444 C297 453 296 461 298 469" />
        <path d="M282 452 C276 462 274 474 278 484" />
      </g>

      {/* body shell */}
      <ellipse cx="425" cy="440" rx="112" ry="58" fill="url(#shellG)" />
      <g clipPath="url(#shellClip)">
        <g fill="none" stroke="#5c422c" strokeWidth="2.4" opacity="0.7">
          <path d="M352 386 C340 420 340 464 356 500" />
          <path d="M390 382 C380 418 380 464 394 502" />
          <path d="M428 380 C420 418 420 464 432 502" />
          <path d="M466 382 C460 418 460 464 470 502" />
          <path d="M504 388 C500 420 500 462 510 496" />
        </g>
        <path
          d="M330 424 C352 392 400 380 452 384"
          stroke="#ffffff"
          strokeWidth="7"
          fill="none"
          opacity="0.22"
          strokeLinecap="round"
        />
        <g fill="#5c422c" opacity="0.3">
          <circle cx="372" cy="452" r="2.4" />
          <circle cx="412" cy="470" r="2.2" />
          <circle cx="448" cy="446" r="2.4" />
          <circle cx="486" cy="462" r="2.2" />
          <circle cx="358" cy="416" r="2" />
          <circle cx="470" cy="414" r="2" />
        </g>
      </g>

      {/* head */}
      <path
        d="M512 404 C546 398 578 414 602 436 C607 440 604 447 597 448 C570 450 540 458 516 470 C505 475 498 466 500 452 C502 428 505 412 512 404 Z"
        fill="url(#headG)"
        stroke="#5c422c"
        strokeWidth="2"
      />
      <path
        d="M534 404 C528 390 536 382 546 392 C550 396 548 402 544 406 Z"
        fill="#a8815a"
        stroke="#5c422c"
        strokeWidth="2"
      />
      <circle cx="560" cy="428" r="4.2" fill="#2b1d14" />
      <circle cx="561.4" cy="426.6" r="1.3" fill="#ffffff" opacity="0.85" />
      <ellipse cx="599" cy="442" rx="5" ry="4" fill="#3a2a1e" transform="rotate(-12 599 442)" />
      <path d="M596 449 C584 452 570 455 558 457" fill="none" stroke="#4a3526" strokeWidth="2" opacity="0.8" />

      {/* near legs (fishnet tights) */}
      <g fill="none" strokeLinecap="round">
        <path d="M374 482 C362 506 358 528 364 550" stroke="#2f2430" strokeWidth="24" opacity="0.5" />
        <path d="M374 482 C362 506 358 528 364 550" stroke="url(#net)" strokeWidth="24" opacity="0.9" />
        <path d="M504 474 C518 498 524 524 520 550" stroke="#2f2430" strokeWidth="24" opacity="0.5" />
        <path d="M504 474 C518 498 524 524 520 550" stroke="url(#net)" strokeWidth="24" opacity="0.9" />
      </g>
      <ellipse cx="364" cy="554" rx="16" ry="9" fill="#2a2030" />
      <ellipse cx="520" cy="554" rx="16" ry="9" fill="#2a2030" />
      <g fill="#1b141c">
        <path d="M530 550 L540 546 L538 553 Z" />
        <path d="M530 556 L541 556 L538 561 Z" />
        <path d="M374 550 L384 546 L382 553 Z" />
        <path d="M374 558 L384 558 L382 563 Z" />
      </g>
    </svg>
  )
}
