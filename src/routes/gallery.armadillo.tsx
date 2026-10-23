import { Link, createFileRoute } from '@tanstack/react-router'
import { MarsArmadillo } from '@/components/MarsArmadillo'

export const Route = createFileRoute('/gallery/armadillo')({
  component: ArmadilloPage,
  head: () => ({
    meta: [{ title: 'Armadillo · Gallery' }],
  }),
})

function ArmadilloPage() {
  return (
    <article className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[0.62rem] font-medium tracking-[0.5em] text-white/60 uppercase">
          Armadillo
        </h1>
        <Link
          to="/gallery"
          className="text-[0.58rem] tracking-[0.28em] text-white/25 uppercase transition-colors hover:text-white"
        >
          ← index
        </Link>
      </div>

      <figure className="m-0 flex flex-col gap-4">
        <div className="overflow-hidden rounded-sm bg-white ring-1 ring-white/15">
          <MarsArmadillo className="block h-auto w-full" />
        </div>
        <figcaption className="text-[0.58rem] leading-relaxed tracking-[0.22em] text-white/30 uppercase">
          Fishnet tights · jaywalking · 800 × 600 · hand-written SVG
        </figcaption>
      </figure>
    </article>
  )
}
