import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/format'
import { Icon, type IconName } from './Icon'

interface Destination {
  label: string
  group: string
  to: string
  icon: IconName
  adminOnly?: boolean
}

const DESTINATIONS: Destination[] = [
  { label: 'My Shift', group: 'Tasker', to: '/', icon: 'clock' },
  { label: 'My Production', group: 'Tasker', to: '/tracker', icon: 'chart' },
  { label: 'My Attendance', group: 'Tasker', to: '/history', icon: 'history' },
  { label: 'Extra Tasks', group: 'Tasker', to: '/tasks', icon: 'clipboard' },
  { label: 'Dashboard', group: 'Admin', to: '/admin', icon: 'dashboard', adminOnly: true },
  { label: 'Attendance', group: 'Admin', to: '/admin/attendance', icon: 'clock', adminOnly: true },
  { label: 'Submissions', group: 'Admin', to: '/admin/submissions', icon: 'clipboard', adminOnly: true },
  { label: 'Taskers', group: 'Admin', to: '/admin/taskers', icon: 'users', adminOnly: true },
  { label: 'Reports', group: 'Admin', to: '/admin/reports', icon: 'chart', adminOnly: true },
  { label: 'Import attendance', group: 'Admin', to: '/admin/import', icon: 'download', adminOnly: true },
  { label: 'Reference Lists', group: 'Admin', to: '/admin/lookups', icon: 'database', adminOnly: true },
  { label: 'Activity Log', group: 'Admin', to: '/admin/activity', icon: 'history', adminOnly: true },
]

/**
 * Search and jump, opened with Ctrl/Cmd-K.
 *
 * Searches pages always, and taskers as well when an admin is signed in --
 * finding one person out of a few hundred is the search an admin actually
 * performs, and going Taskers -> filter -> scroll to do it is three steps too
 * many.
 *
 * Built on a plain overlay rather than <dialog> because it needs to open on a
 * keystroke from anywhere without stealing focus back from the input.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      // Focus after paint, or the keystroke that opened it lands in the input.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const trimmed = query.trim()

  // Only searched for admins, and only once there is something to search for.
  const taskers = useQuery({
    queryKey: ['command-palette', 'taskers', trimmed],
    queryFn: () => adminApi.taskers({ search: trimmed, per_page: 5 }),
    enabled: open && isAdmin && trimmed.length >= 2,
    staleTime: 30_000,
  })

  const results = useMemo(() => {
    const pages = DESTINATIONS.filter((d) => (isAdmin ? true : !d.adminOnly)).filter((d) =>
      trimmed === '' ? true : d.label.toLowerCase().includes(trimmed.toLowerCase()),
    )

    const people = (taskers.data?.data ?? []).map((user) => ({
      label: user.name,
      group: 'Taskers',
      to: `/admin/taskers/${user.id}`,
      icon: 'users' as IconName,
      hint: user.email,
    }))

    return [...pages.map((p) => ({ ...p, hint: undefined })), ...people]
  }, [trimmed, isAdmin, taskers.data])

  useEffect(() => setActive(0), [results.length])

  const go = (to: string) => {
    navigate(to)
    onClose()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % Math.max(results.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + results.length) % Math.max(results.length, 1))
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault()
      go(results[active].to)
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[oklch(8%_0.01_270_/_0.6)] px-4 pt-[12vh] backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-label="Search"
        className="modal-panel w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-raised shadow-float"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="external" size={16} className="shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isAdmin ? 'Search pages and taskers…' : 'Search pages…'}
            className="w-full bg-transparent py-3.5 text-sm text-body outline-none placeholder:text-faint"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-xs text-faint sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">
              Nothing matches “{trimmed}”.
            </p>
          ) : (
            results.map((item, index) => (
              <button
                key={`${item.group}-${item.to}`}
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => go(item.to)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  index === active ? 'bg-brand-soft text-brand' : 'text-body hover:bg-sunken',
                )}
              >
                <Icon
                  name={item.icon}
                  size={16}
                  className={cn('shrink-0', index === active ? 'text-brand' : 'text-faint')}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                  {item.hint && (
                    <span className="block truncate text-xs text-muted">{item.hint}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs tracking-wider text-faint uppercase">
                  {item.group}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line bg-sunken px-4 py-2 text-xs text-faint">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
        </div>
      </div>
    </div>
  )
}

/** Wires Ctrl/Cmd-K to open the palette from anywhere. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((o) => !o)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
