import { Link, useLocation } from 'react-router-dom'

/**
 * Labels for each path segment. Anything not listed is title-cased, so a new
 * route gets a sensible crumb without needing an entry here.
 */
const LABELS: Record<string, string> = {
  '': 'Home',
  admin: 'Admin',
  attendance: 'Attendance',
  submissions: 'Submissions',
  taskers: 'Taskers',
  reports: 'Reports',
  lookups: 'Reference Lists',
  import: 'Import',
  activity: 'Activity Log',
  tasks: 'Extra Tasks',
  history: 'History',
  tracker: 'Tracker History',
}

/** Segments that are containers, not pages — shown but not linked. */
const NOT_NAVIGABLE = new Set(['admin'])

function labelFor(segment: string): string {
  if (LABELS[segment]) return LABELS[segment]

  // A numeric segment is a record id; the page heading names the record, so
  // the crumb only has to say what kind of thing it is.
  if (/^\d+$/.test(segment)) return 'Details'

  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Where you are, and how to get back.
 *
 * Built from the URL rather than hand-declared per page, so it cannot drift
 * out of step with the routing. Hidden on the home route, where a single
 * "Home" crumb would say nothing.
 */
export function Breadcrumbs() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((segment, index) => ({
    label: labelFor(segment),
    href: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
    navigable: !NOT_NAVIGABLE.has(segment),
  }))

  return (
    <nav aria-label="Breadcrumb" className="mb-4 min-w-0">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        <li className="flex items-center gap-1.5">
          <Link to="/" className="text-muted transition-colors hover:text-body">
            Home
          </Link>
        </li>

        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-faint">
              /
            </span>
            {crumb.isLast ? (
              // The current page is named, not linked — a link to where you
              // already are is noise.
              <span aria-current="page" className="font-medium text-body">
                {crumb.label}
              </span>
            ) : crumb.navigable ? (
              <Link to={crumb.href} className="text-muted transition-colors hover:text-body">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-muted">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
