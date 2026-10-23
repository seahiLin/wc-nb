import { Link, createFileRoute } from '@tanstack/react-router'
import { BlackHoleScene } from '@/components/BlackHoleScene'

export const Route = createFileRoute('/')({
  component: Home,
})

/* 引力奇点 · 事件视界

   用 Three.js 在片元着色器里逐像素积分史瓦西时空的零测地线：
   背景星光被引力透镜弯折成爱因斯坦环，薄吸积盘按 Shakura-Sunyaev 温度分布
   发出黑体辐射，再叠加相对论多普勒集束与引力红移，
   最后经 ACES 色调映射与泛光合成。 */

function Home() {
  return (
    <main className="relative h-[100svh] w-full overflow-hidden bg-black">
      <BlackHoleScene />

      <div className="bh-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-6 pb-7 text-center">
        <h1 className="text-[0.68rem] font-medium tracking-[0.55em] text-white/65 uppercase sm:text-xs">
          Event Horizon
        </h1>
        <p className="text-[0.6rem] leading-relaxed tracking-[0.22em] text-white/30 uppercase">
          史瓦西度规 · 零测地线积分 · 相对论集束
        </p>
      </div>

      <div className="pointer-events-none absolute top-4 right-4 flex items-center gap-2 text-[0.58rem] tracking-[0.3em] text-white/25 uppercase">
        <span className="bh-pulse inline-block h-1.5 w-1.5 rounded-full bg-white/70" />
        live
      </div>

      <Link
        to="/pelican"
        className="group absolute top-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[0.58rem] tracking-[0.28em] text-white/45 uppercase backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10 hover:text-white/85"
      >
        <span className="text-[0.7rem] leading-none">🐦</span>
        Pelican Ride
        <span className="transition group-hover:translate-x-0.5">→</span>
      </Link>
    </main>
  )
}
