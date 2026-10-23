import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/gallery')({
  component: GalleryLayout,
})

/* 展柜：黑色主页之外的第二个入口，用来收一些小作品（SVG 插画等）。 */

const TABS = [
  { to: '/', label: 'Event Horizon' },
  { to: '/gallery/armadillo', label: 'Armadillo' },
] as const

const TAB_CLASS = 'text-[0.6rem] tracking-[0.28em] uppercase transition-colors'
const TAB_IDLE = `${TAB_CLASS} text-white/35 hover:text-white`
const TAB_ACTIVE = `${TAB_CLASS} text-white/90`

function GalleryLayout() {
  return (
    <div className="min-h-[100svh] w-full bg-black text-white/80">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4">
          <Link
            to="/gallery"
            className="text-[0.6rem] font-medium tracking-[0.45em] text-white/45 uppercase transition-colors hover:text-white"
          >
            Gallery
          </Link>
          <span className="h-3 w-px bg-white/15" aria-hidden="true" />
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={TAB_IDLE}
              activeProps={{ className: TAB_ACTIVE }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
