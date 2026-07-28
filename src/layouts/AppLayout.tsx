import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useMotion } from '@/hooks/useMotion'
import { cn } from '@/utils/format'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Logo } from '@/components/ui/Logo'
import { CommandPalette, useCommandPalette } from '@/components/ui/CommandPalette'

interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Navigation is grouped rather than one flat list.
 *
 * Eight undifferentiated links read as a dump of everything the app can do;
 * grouped, an admin finds "the reporting one" without reading all eight.
 */
const TASKER_NAV: NavGroup[] = [
  {
    label: 'Tonight',
    items: [{ to: '/', label: 'My Shift', icon: 'clock', end: true }],
  },
  {
    label: 'My Record',
    items: [
      { to: '/tracker', label: 'Production', icon: 'chart' },
      { to: '/history', label: 'Attendance', icon: 'history' },
      { to: '/tasks', label: 'Extra Tasks', icon: 'clipboard' },
    ],
  },
]

const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/attendance', label: 'Attendance', icon: 'clock' },
      { to: '/admin/submissions', label: 'Submissions', icon: 'clipboard' },
      { to: '/admin/taskers', label: 'Taskers', icon: 'users' },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/admin/reports', label: 'Reports', icon: 'chart' },
      { to: '/admin/import', label: 'Import', icon: 'download' },
      { to: '/admin/lookups', label: 'Reference Lists', icon: 'database' },
      { to: '/admin/activity', label: 'Activity Log', icon: 'history' },
    ],
  },
]

export function AppLayout() {
  const { user, isAdmin, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const motion = useMotion()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const palette = useCommandPalette()

  // Close the mobile drawer on navigation, otherwise it covers the page the
  // user just asked for.
  useEffect(() => setMenuOpen(false), [location.pathname])

  const groups = isAdmin ? ADMIN_NAV : TASKER_NAV

  return (
    <div className="app-canvas min-h-dvh bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        Skip to content
      </a>

      {/* The rail sits on its own sunken surface, so the content area reads as
          the page and the navigation reads as chrome around it. */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col',
          'border-r border-line bg-sunken/80 backdrop-blur-xl',
          'transition-transform duration-300 ease-out lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* The logo is a full lockup -- mark plus wordmark -- so it replaces
            the letter tile and the product name together rather than sitting
            beside a second copy of the name. The role badge that used to sit
            under it now lives with the account it describes. */}
        <div className="flex h-[4.5rem] shrink-0 items-center border-b border-line px-5">
          <Logo className="h-7" />
        </div>

        {/* Groups are separated by a rule as well as a label. With eight items
            across three groups the label alone was doing all the work, and a
            label reads as a heading only once you have already found the break
            it is heading. */}
        {/*
          Sized to fit without scrolling.

          The rail is a fixed list of eight items that has to sit between a
          brand block and an account block, so its height is not negotiable the
          way page content is -- and every gap in it is rem-based, so raising
          the root size pushed the last item off the bottom. Navigation you
          have to scroll to find is navigation you cannot see, which defeats
          the point of a permanent rail.

          The measurements below are therefore deliberately tighter than the
          rest of the interface: chrome earns its density, content does not.
          `overflow-y-auto` stays for genuinely short viewports, where clipping
          the list outright would be worse.
        */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {groups.map((group, groupIndex) => (
            <div
              key={group.label}
              className={cn(
                groupIndex > 0 && 'mt-3 border-t border-line/70 pt-3',
              )}
            >
              <p className="px-3 pb-1.5 text-[11px] font-bold tracking-[0.14em] text-faint uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item, itemIndex) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    // Items arrive in sequence from the edge the rail is docked
                    // to, so the navigation reads as assembling rather than
                    // being stamped down.
                    style={{ animationDelay: `${60 + (groupIndex * 3 + itemIndex) * 35}ms` }}
                    className={({ isActive }) =>
                      cn(
                        'slide-in-left group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
                        // A fixed size rather than `text-base`, so the rail
                        // does not grow with the root size the way the pages
                        // it links to are meant to.
                        'text-[16px] transition-colors duration-150',
                        isActive
                          ? // A solid fill, not a soft tint. On the light
                            // theme --brand-soft and the rail's --sunken are
                            // one percent of lightness apart, so a tinted
                            // active state is invisible on exactly the surface
                            // it has to stand out against.
                            'bg-brand font-semibold text-on-brand shadow-raised'
                          : 'font-medium text-muted hover:bg-raised hover:text-body',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          name={item.icon}
                          size={19}
                          className={cn(
                            'shrink-0 transition-colors',
                            isActive ? 'text-on-brand' : 'text-faint group-hover:text-muted',
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* The account block is a card of its own, so signing out cannot be
            mistaken for another navigation item. */}
        <div className="shrink-0 border-t border-line p-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-raised/60 p-2.5">
            <Avatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] leading-tight font-semibold text-body">
                {user?.name}
              </p>
              <p className="truncate text-[13px] leading-tight text-muted">{user?.email}</p>
              {/* The role belongs to the account, not to the product mark. It
                  is still a pill rather than a caption: it decides which half
                  of the application you are looking at, so it should read as a
                  status and not as a third line of contact details. */}
              <span className="mt-1.5 inline-block rounded-md bg-brand-soft px-2 py-0.5 text-[11px] leading-none font-bold tracking-wide text-brand uppercase">
                {isAdmin ? 'Administrator' : 'Tasker'}
              </span>
            </div>
          </div>

          {/* Full width and full height, in the danger tone. Signing out ends
              the session and there is no undo, so it should look like the
              deliberate act it is rather than a footnote under the avatar. */}
          <button
            type="button"
            onClick={() => void signOut()}
            className={cn(
              'mt-2 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl',
              'border border-bad/30 bg-bad-soft text-[15px] font-semibold text-bad',
              'transition-colors duration-150 hover:border-bad hover:bg-bad hover:text-white',
            )}
          >
            <Icon name="logout" size={18} className="shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <div className="lg:pl-[17.5rem]">
        {/* A utility strip, not a page header: the clock and the theme toggle
            are the only things that belong to the session rather than to the
            page. Everything describing *this* page — breadcrumb, title, filters
            — lives in the content column below, so the page owns its own
            heading. Height matches the sidebar's brand block so the two line up
            across the top. */}
        <header className="sticky top-0 z-20 flex h-[4.5rem] items-center gap-3 border-b border-line bg-surface/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="-ml-1 rounded-lg p-2 text-muted hover:bg-sunken hover:text-body lg:hidden"
          >
            <Icon name="menu" size={22} />
          </button>

          <div className="flex-1" />

          <ShiftClock />

          {/* Sits beside the theme toggle because it is the same kind of thing:
              a session-level display preference. It exists because the OS
              reduced-motion setting is otherwise a silent global switch with
              nothing on screen to explain why the interface went still. */}
          <button
            type="button"
            onClick={motion.toggle}
            aria-pressed={!motion.reduced}
            aria-label={motion.reduced ? 'Turn animations on' : 'Turn animations off'}
            title={
              motion.reduced
                ? motion.preference === 'system'
                  ? 'Animations are off because your system asks for reduced motion. Click to turn them on here.'
                  : 'Animations are off. Click to turn them on.'
                : 'Animations are on. Click to turn them off.'
            }
            className="rounded-lg p-2 text-muted transition-colors hover:bg-sunken hover:text-body"
          >
            <Icon name={motion.reduced ? 'motionOff' : 'motion'} size={19} />
          </button>

          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-sunken hover:text-body"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
          </button>
        </header>

        {/* Breadcrumbs belong with the content, not in the header bar. They
            describe where this page sits, so they read as the first line of the
            page — directly above its title — rather than as another piece of
            persistent chrome sharing a row with the clock and theme toggle. */}
        {/* Keyed on the path so the entrance replays on every navigation, not
            only on first load. Without the key React reuses this node between
            routes and the animation, having already run once, never plays
            again. */}
        <main
          id="main"
          key={location.pathname}
          className="fade-in mx-auto w-full max-w-[84rem] px-4 py-6 sm:px-6 lg:px-8"
        >
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>

      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </div>
  )
}

function Avatar({ user }: { user: { name: string; avatar_url: string | null } | null }) {
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-line"
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
      {user?.name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  )
}

/**
 * A live clock in the header.
 *
 * On a night shift the current time is the most consulted thing on screen, and
 * it removes any doubt about which clock the system is using when someone
 * times in.
 */
function ShiftClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="hidden items-center gap-2 rounded-lg border border-line bg-sunken px-3 py-2 sm:flex">
      <Icon name="clock" size={16} className="text-faint" />
      <span className="numeric text-sm font-semibold text-body tabular-nums">
        {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </span>
      <span className="hidden text-xs text-muted lg:inline">
        {now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
      </span>
    </div>
  )
}
