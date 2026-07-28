import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/format'
import { Icon, type IconName } from '@/components/ui/Icon'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Logo } from '@/components/ui/Logo'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { SpotlightPortrait } from '@/components/public/SpotlightPortrait'
import { Typewriter } from '@/components/public/Typewriter'
import { useInView } from '@/hooks/useInView'
import { useTheme } from '@/hooks/useTheme'

/**
 * The public face of the application.
 *
 * Everything here describes what this system actually does rather than what an
 * attendance product generically claims to — the overnight business date, the
 * server-stamped clock, the three-step nightly flow. A landing page that could
 * belong to any tool is worth less than none, because the one question a
 * visitor arrives with is whether it handles *their* shift.
 */

const SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'admin', label: 'For admins' },
  { id: 'developer', label: 'Developer' },
] as const

/**
 * Swap these two files in `public/` and the section updates with no code
 * change. If either is missing the portrait falls back to its placeholder
 * rather than showing a broken image, so a not-yet-uploaded photo is harmless.
 *
 * Keep both SQUARE so the two layers stay in register under the spotlight.
 */
const DEVELOPER = {
  name: 'JAMES GASANG',
  role: 'FULL STACK AI DEVELOPER',
  art: '/ghibli.png',
  photo: '/no.jpg',
}

export default function LandingPage() {
  const active = useScrollSpy(SECTIONS.map((section) => section.id))

  return (
    <div className="app-canvas min-h-dvh bg-surface">
      <LandingHeader active={active} />

      <main id="main">
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <ForAdmins />
        <Developer />
      </main>

      <Footer />
    </div>
  )
}

/**
 * Which section the reader is currently in.
 *
 * Chooses the last heading to have crossed the top quarter of the viewport
 * rather than whichever section is "most visible". Highlighting by visible
 * area makes the marker jump backwards when a short section follows a tall
 * one, which reads as the navigation being wrong about where you are.
 */
function useScrollSpy(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.25
      let current: string | null = null

      for (const id of ids) {
        const element = document.getElementById(id)
        if (element && element.getBoundingClientRect().top <= line) current = id
      }

      setActive(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ids])

  return active
}

// ------------------------------------------------------------------- Header

function LandingHeader({ active }: { active: string | null }) {
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  // A translucent bar only reads as a bar once there is content behind it, so
  // the border and blur are held back until the page has actually scrolled.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-200',
        scrolled
          ? 'border-b border-line bg-surface/80 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[76rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left — the mark. */}
        <a href="#main" className="flex shrink-0 items-center">
          <Logo className="h-7 sm:h-8" />
        </a>

        {/* Centre — section links. Absolutely centred against the viewport
            rather than flex-centred between the logo and the actions, which
            would drift as either side changes width. */}
        <nav
          aria-label="Sections"
          className="pointer-events-none absolute inset-x-0 hidden justify-center lg:flex"
        >
          <ul className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-raised/70 p-1.5 backdrop-blur-xl">
            {SECTIONS.map((section) => {
              const isActive = active === section.id

              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'relative block rounded-full px-4 py-1.5 text-[15px] font-medium transition-colors duration-200',
                      isActive
                        ? 'bg-brand text-on-brand shadow-card'
                        : 'text-muted hover:bg-sunken hover:text-body',
                    )}
                  >
                    {section.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-sunken hover:text-body"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
          </button>

          {/* Right — sign in. The icon carries it on a phone; the word appears
              as soon as there is room, because an avatar glyph alone is a
              guess at best. */}
          <Link
            to="/login"
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-line bg-raised py-1.5 pr-4 pl-1.5',
              'text-[15px] font-semibold text-body transition-all duration-200',
              'hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card',
            )}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-brand">
              <Icon name="users" size={17} />
            </span>
            <span className="hidden sm:inline">Sign in</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-sunken hover:text-body lg:hidden"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="Sections" className="border-t border-line bg-raised px-4 py-3 lg:hidden">
          <ul className="space-y-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active === section.id ? 'true' : undefined}
                  className={cn(
                    'block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
                    active === section.id
                      ? 'bg-brand-soft text-brand'
                      : 'text-muted hover:bg-sunken hover:text-body',
                  )}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}

// --------------------------------------------------------------------- Hero

function Hero() {
  return (
    <section className="mx-auto w-full max-w-[76rem] px-4 pt-16 pb-16 sm:px-6 lg:px-8 lg:pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <span className="rise-in inline-flex items-center gap-2 rounded-full border border-line bg-raised/70 px-3 py-1.5 text-[13px] font-semibold text-muted backdrop-blur">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
          </span>
          Built for the 10 PM – 6 AM shift
        </span>

        <h1
          className="rise-in mt-6 text-[42px] leading-[1.05] font-semibold tracking-tight text-body sm:text-[56px]"
          style={{ animationDelay: '60ms' }}
        >
          Attendance that understands
          <br className="hidden sm:block" />{' '}
          <span className="text-brand">a shift crossing midnight</span>
        </h1>

        <p
          className="rise-in mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-muted"
          style={{ animationDelay: '120ms' }}
        >
          Clock in and out on the server’s clock, declare what you produced, and let the hours work
          themselves out. A shift that starts at 10 PM and ends at 6 AM is one shift — not two
          half-days split across a spreadsheet.
        </p>

        {/* One call to action, not three.
            Sign-in lives in the header, where it is sticky and visible from
            every section — repeating it here and again at the foot of the page
            made the same button appear three times on one screen without ever
            adding a way to act that was not already on offer. */}
        <div
          className="rise-in mt-9 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: '180ms' }}
        >
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-raised px-6 text-base font-semibold text-body transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card"
          >
            See how it works
            <Icon name="arrowRight" size={17} />
          </a>
        </div>

        <p className="mt-5 text-[13px] text-faint">
          Google sign-in only. Signing in never creates an account — an administrator authorises your
          address first.
        </p>
      </div>

      <ShiftStrip />
    </section>
  )
}

/**
 * The business-date rule, drawn.
 *
 * This is the single idea the whole system is built around and the hardest one
 * to convey in a sentence, so it is shown as the timeline it describes.
 */
function ShiftStrip() {
  const marks = [
    { at: '10:00 PM', label: 'Shift starts', strong: true },
    { at: '12:00 AM', label: 'Date changes', strong: false },
    { at: '6:00 AM', label: 'Shift ends', strong: true },
  ]

  return (
    <ScrollReveal delay={80}>
      <div className="hero-panel relative mx-auto mt-16 max-w-4xl overflow-hidden rounded-2xl border border-line p-6 shadow-raised sm:p-8">
        <div className="flex items-center gap-2">
          <Icon name="calendar" size={16} className="text-brand" />
          <p className="text-xs font-bold tracking-[0.14em] text-faint uppercase">
            One shift, one record
          </p>
        </div>

        <div className="mt-6">
          <div className="relative h-2 w-full rounded-full bg-sunken">
            <div className="grow-x absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-brand to-brand-strong" />
            {/* Midnight sits inside the bar, not at its edge -- which is the
                whole point being made. */}
            <span
              className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-raised"
              style={{ left: '25%' }}
              aria-hidden="true"
            />
          </div>

          <div className="mt-3 flex justify-between">
            {marks.map((mark) => (
              <div key={mark.at} className="last:text-right">
                <p
                  className={cn(
                    'numeric text-[15px] font-semibold tabular-nums',
                    mark.strong ? 'text-body' : 'text-faint',
                  )}
                >
                  {mark.at}
                </p>
                <p className="text-[13px] text-muted">{mark.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
          A clock-out at 6:02 AM on Tuesday still belongs to Monday night. Every record is filed
          against the date the shift <strong className="text-body">started</strong>, so hours land on
          the night people think of themselves as having worked.
        </p>
      </div>
    </ScrollReveal>
  )
}

// -------------------------------------------------------------------- Stats

/**
 * The figures count when they are reached, not when the page loads.
 *
 * A counter that runs on mount has finished long before a reader scrolls to
 * it, so the animation plays to an empty room and the reader arrives at a
 * static number.
 */
function Stats() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 })

  const stats = [
    { value: 8, suffix: 'h', label: 'Shift length', hint: '10 PM to 6 AM, as one record' },
    { value: 60, suffix: '', label: 'Desks mapped', hint: 'Picked from a plan of the floor' },
    { value: 3, suffix: '', label: 'Steps a night', hint: 'Attendance, tracker, time out' },
    { value: 100, suffix: '%', label: 'Server-stamped', hint: 'No client clock is ever trusted' },
  ]

  return (
    <section className="border-y border-line bg-raised/40 py-14">
      <div ref={ref} className="mx-auto w-full max-w-[76rem] px-4 sm:px-6 lg:px-8">
        <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 90} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <p className="numeric text-[44px] leading-none font-semibold tracking-tight text-brand tabular-nums">
                  <AnimatedNumber
                    value={stat.value}
                    start={inView}
                    format={(n) => `${Math.round(n)}${stat.suffix}`}
                  />
                </p>
                <p className="mt-3 text-[15px] font-semibold text-body">{stat.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{stat.hint}</p>
              </dd>
            </ScrollReveal>
          ))}
        </dl>
      </div>
    </section>
  )
}

// ------------------------------------------------------------- How it works

function HowItWorks() {
  const steps = [
    {
      icon: 'desktop' as IconName,
      title: 'Attendance & PC',
      body: 'Say how many hours you can commit and pick the desk you are sitting at from a map of the floor. Choosing it starts your clock on server time.',
    },
    {
      icon: 'clipboard' as IconName,
      title: 'Tracker entry',
      body: 'Declare what you produced, one block per project — tasks, task IDs, complexity and screenshots. Your hours are never typed; they come from the clock.',
    },
    {
      icon: 'clock' as IconName,
      title: 'Time out',
      body: 'Stop the clock whenever the night actually ends. Total hours are computed and stored for you, and a missed clock-out is flagged rather than counted as zero.',
    },
  ]

  return (
    <section id="how-it-works" className="scroll-mt-24 py-20">
      <div className="mx-auto w-full max-w-[76rem] px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <SectionHeading
            eyebrow="For taskers"
            title="Three steps, once a night"
            description="The nightly flow tells you where you are, what each step records, and why a step you have not reached yet is locked."
          />
        </ScrollReveal>

        <ol className="mt-12 grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <ScrollReveal key={step.title} delay={index * 120} as="li">
              <div className="group relative h-full overflow-hidden rounded-2xl border border-line bg-raised p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-raised">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition-transform duration-200 group-hover:scale-105">
                    <Icon name={step.icon} size={21} />
                  </span>
                  <span className="numeric text-[13px] font-bold tracking-[0.14em] text-faint uppercase tabular-nums">
                    Step {index + 1}
                  </span>
                </div>

                <h3 className="mt-4 text-[19px] font-semibold tracking-tight text-body">
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------- Features

function Features() {
  const features = [
    {
      icon: 'lock' as IconName,
      title: 'Server time, always',
      body: 'Every clock event is stamped by the server. A wrong clock on a laptop can never change anyone’s hours.',
    },
    {
      icon: 'mapPin' as IconName,
      title: 'A map of the floor',
      body: 'Pick your PC from the room as it is actually laid out, with taken desks greyed out and who has them.',
    },
    {
      icon: 'bolt' as IconName,
      title: 'Hours computed, never typed',
      body: 'Totals are derived from the clock and stored server-side. A missed clock-out stays empty rather than counting as a zero that drags averages down.',
    },
    {
      icon: 'layers' as IconName,
      title: 'Production by project',
      body: 'One entry per night covering every project worked, with task IDs, send-backs and screenshots kept against the right one.',
    },
    {
      icon: 'moon' as IconName,
      title: 'Dark by default',
      body: 'This workforce runs through the night. A full-white dashboard at 3 AM is hostile, so the dark theme is the normal case here.',
    },
    {
      icon: 'shield' as IconName,
      title: 'One clock per shift',
      body: 'A database constraint — not a check that could race — guarantees nobody can time in twice for the same night.',
    },
  ]

  return (
    <section id="features" className="scroll-mt-24 border-t border-line bg-raised/40 py-20">
      <div className="mx-auto w-full max-w-[76rem] px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <SectionHeading
            eyebrow="What it does"
            title="The rules are enforced, not requested"
            description="Frontend validation exists for convenience. Every rule that matters is enforced on the server, where it cannot be worked around."
          />
        </ScrollReveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={(index % 3) * 90}>
              <div className="group h-full bg-raised p-6 transition-colors duration-200 hover:bg-sunken/50">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand transition-transform duration-200 group-hover:scale-110">
                  <Icon name={feature.icon} size={19} />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-body">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{feature.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// --------------------------------------------------------------- For admins

function ForAdmins() {
  // The mock dashboard's figures were plain text, so they sat still while
  // every other number on the page counted. They now animate on the same
  // terms as the rest: whenever the panel is actually being looked at.
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.35 })

  const rollCall = [
    { label: 'Present', value: 88, tone: 'bg-brand' },
    { label: 'Late', value: 9, tone: 'bg-warn' },
    { label: 'Not yet in', value: 3, tone: 'bg-line' },
  ]

  const points = [
    'A live floor view: who is on shift, how far through their committed hours, and tonight’s roll call.',
    'Repeated absences surfaced automatically — four in a rolling thirty days flags a tasker for review.',
    'Attendance imported from Excel with every row validated and shown to you before anything is written.',
    'Management-grade workbooks that record the exact range and filters they were generated with.',
  ]

  return (
    <section id="admin" className="scroll-mt-24 py-20">
      <div className="mx-auto grid w-full max-w-[76rem] gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        <ScrollReveal direction="left">
          <SectionHeading
            align="left"
            eyebrow="For administrators"
            title="The floor, at a glance"
            description="Built around one question asked in a fixed order: what is happening right now, what has tonight produced, and how does that compare with the last month."
          />

          <ul className="mt-8 space-y-4">
            {points.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
                  <Icon name="check" size={13} strokeWidth={3} />
                </span>
                <span className="text-[15px] leading-relaxed text-muted">{point}</span>
              </li>
            ))}
          </ul>
        </ScrollReveal>

        {/* A sketch of the dashboard rather than a screenshot: a real capture
            would carry real names and would go stale the first time the UI
            moved. */}
        <ScrollReveal direction="right" delay={120}>
          <div
            ref={ref}
            className="hero-panel relative overflow-hidden rounded-2xl border border-line p-6 shadow-raised"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raised/70 px-2.5 py-1 text-xs font-bold tracking-[0.12em] text-body uppercase backdrop-blur">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
                </span>
                Live
              </span>
              <span className="text-xs text-muted">Tonight’s shift</span>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <span className="numeric text-[52px] leading-[0.85] font-semibold tracking-tight text-body tabular-nums">
                <AnimatedNumber value={42} start={inView} format={(n) => `${Math.round(n)}`} />
              </span>
              <span className="numeric pb-1 text-lg leading-none font-medium text-faint tabular-nums">
                / 48
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">timed in and still working</p>

            <div className="mt-6 space-y-3">
              {rollCall.map((row, index) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-muted">{row.label}</span>
                    <span className="numeric font-semibold text-body tabular-nums">
                      <AnimatedNumber
                        value={row.value}
                        start={inView}
                        format={(n) => `${Math.round(n)}%`}
                      />
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                    {/* Keyed on visibility so the bar re-grows alongside the
                        figure instead of animating once and staying put. */}
                    <div
                      key={inView ? 'in' : 'out'}
                      className={cn('h-full rounded-full', inView && 'grow-x', row.tone)}
                      style={{
                        width: inView ? `${row.value}%` : '0%',
                        animationDelay: `${index * 120}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- Developer

function Developer() {
  // The name re-types whenever the section is on screen, matching the reveals
  // and counters elsewhere on the page.
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 })

  return (
    <section
      id="developer"
      ref={ref}
      className="scroll-mt-24 border-t border-line bg-raised/40 py-20"
    >
      <div className="mx-auto grid w-full max-w-[76rem] gap-12 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:px-8">
        {/* Left — the words. */}
        <ScrollReveal direction="left">
          <p className="text-xs font-bold tracking-[0.14em] text-brand uppercase">Developer</p>

          {/*
            The name and the role share one line, alternating.

            No `tracking-tight`, because both are set in capitals: negative
            tracking is a fix for the loose gaps between lowercase letters at
            display sizes, and applied to capitals — already tightly fitted —
            it jams the letterforms together.

            Sized down from 40px so the longer of the two phrases still fits on
            a single line in this column. The heading reserves the width of the
            longest phrase, so a wrap there would leave a permanent empty line
            under the short one.
          */}
          <h2 className="mt-3 text-[26px] leading-tight font-semibold text-body sm:text-[34px]">
            <Typewriter text={[DEVELOPER.name, DEVELOPER.role]} active={inView} />
          </h2>

          {/* The role used to sit here as a static line. It now takes its turn
              in the heading above, so repeating it would show it twice. */}

          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
            Built to replace a Google Forms and Sheets workflow that could not tell one overnight
            shift from two calendar days. Every rule that matters lives on the server, the hours are
            computed rather than typed, and the whole thing is designed to be read at 3 AM.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {[
              { icon: 'github' as IconName, label: 'GitHub', href: '#developer' },
              { icon: 'linkedin' as IconName, label: 'LinkedIn', href: '#developer' },
              { icon: 'mail' as IconName, label: 'Email', href: '#developer' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-4 py-2.5 text-[15px] font-semibold text-body transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card"
              >
                <Icon name={link.icon} size={17} className="text-muted" />
                {link.label}
              </a>
            ))}
          </div>
        </ScrollReveal>

        {/* Right — the portrait. */}
        <ScrollReveal direction="right" delay={120}>
          <div className="mx-auto w-full max-w-sm">
            <SpotlightPortrait
              art={DEVELOPER.art}
              photo={DEVELOPER.photo}
              alt={`Illustrated portrait of ${DEVELOPER.name}`}
            />
            <p className="mt-3 text-center text-[13px] text-muted">
              Move your cursor across the illustration to reveal the photograph beneath it.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex w-full max-w-[76rem] flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo className="h-6" />

        <p className="text-[13px] text-muted">
          Attendance, tasking and productivity for overnight teams.
        </p>
      </div>
    </footer>
  )
}

// ------------------------------------------------------------------ Shared

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string
  title: string
  description: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center')}>
      <p className="text-xs font-bold tracking-[0.14em] text-brand uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-tight text-body sm:text-[38px]">
        {title}
      </h2>
      <p className="mt-3 text-[17px] leading-relaxed text-muted">{description}</p>
    </div>
  )
}
