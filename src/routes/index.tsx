import { createFileRoute } from '@tanstack/react-router'
import { BlackHole } from '../components/BlackHole'

export const Route = createFileRoute('/')({
  component: Home,
})

/* 主页 · 事件视界
   全屏的 Three.js 黑洞：纯黑核心、旋转的吸积盘与弯曲的星场。
   画面上只留一行小字，其余交给引力。 */

function Home() {
  return (
    <main className="relative h-screen min-h-screen w-full overflow-hidden bg-[#030305]">
      <BlackHole />

      {/* 一层暗角，让边缘沉进宇宙 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_35%,rgba(3,3,5,0.85)_100%)]" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-6 text-center">
        <p className="text-[0.6rem] font-light tracking-[0.55em] text-stone-400/70 uppercase sm:text-xs">
          Event Horizon
        </p>
        <p className="max-w-md text-[0.65rem] leading-relaxed font-light tracking-[0.2em] text-stone-500/60 sm:text-[0.7rem]">
          光在这里停下，时间也随之失去方向
        </p>
      </div>
    </main>
  )
}
