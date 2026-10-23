import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/gallery/')({
  component: GalleryIndex,
})

const ITEMS = [
  {
    to: '/gallery/armadillo',
    title: 'Armadillo',
    subtitle: '渔网袜 · 火星 · 横穿马路',
  },
] as const

function GalleryIndex() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[0.62rem] font-medium tracking-[0.5em] text-white/60 uppercase">Index</h1>
        <p className="text-[0.6rem] leading-relaxed tracking-[0.22em] text-white/25 uppercase">
          手工 SVG 插画
        </p>
      </div>

      <ul className="grid gap-3">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="group flex items-baseline justify-between gap-4 border border-white/10 px-5 py-4 transition-colors hover:border-white/30 hover:bg-white/5"
            >
              <span className="text-sm tracking-[0.12em] text-white/70 group-hover:text-white">
                {item.title}
              </span>
              <span className="text-[0.58rem] tracking-[0.22em] text-white/25 uppercase">
                {item.subtitle}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
