import { Link, createFileRoute } from '@tanstack/react-router'
import { PelicanBike } from '@/components/PelicanBike'

export const Route = createFileRoute('/pelican')({
  head: () => ({ meta: [{ title: 'Pelican on a Bicycle' }] }),
  component: PelicanPage,
})

/* 骑自行车的鹈鹕 · 单文件 SVG

   车轮自转、双腿踩踏、身体起伏、每 6 秒翘头一次，
   全部由 SVG 内部的 SMIL 与 CSS 动画驱动，无 JavaScript，永久循环。 */

function PelicanPage() {
  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-black text-stone-200">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 50% 22%, rgba(255, 186, 96, 0.12) 0%, rgba(90, 52, 24, 0.06) 32%, transparent 68%)',
        }}
      />

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col gap-8 px-6 py-8 sm:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-[0.58rem] tracking-[0.32em] text-white/40 uppercase transition hover:text-white/80"
          >
            ← Event Horizon
          </Link>
          <span className="text-[0.58rem] tracking-[0.32em] text-white/25 uppercase">smil · css</span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#f6f2e7] shadow-[0_40px_120px_-40px_rgba(255,180,90,0.35)]">
            <PelicanBike className="block h-auto w-full" />
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[0.68rem] font-medium tracking-[0.55em] text-white/65 uppercase sm:text-xs">
              Pelican · Bicycle
            </h1>
            <p className="text-[0.6rem] leading-relaxed tracking-[0.22em] text-white/30 uppercase">
              车轮自转 · 双腿踩踏 · 身体起伏 · 每 6 秒翘头
            </p>
            <p className="max-w-md text-[0.58rem] leading-relaxed tracking-[0.18em] text-white/20 uppercase">
              Fully self-contained SVG — SMIL and CSS only, no JavaScript, loops forever
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
