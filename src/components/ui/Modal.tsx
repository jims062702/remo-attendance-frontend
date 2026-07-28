import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/utils/format'
import { Button } from './Button'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** A short label above the title — the record type, a date, a status. */
  eyebrow?: ReactNode
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

/**
 * Built on the native <dialog> element, which gives focus trapping, Escape to
 * close and inertness of the page behind it for free — all things a div-based
 * modal has to reimplement and usually gets wrong for keyboard users.
 *
 * The header and footer are pinned while only the body scrolls, so the title
 * and the primary action stay reachable in a long submission rather than
 * scrolling away with the content.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  eyebrow,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // Escape fires the dialog's own cancel event; route it through onClose so
  // React state stays in step with the DOM.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    const handleCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }

    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClick={(event) => {
        // Clicking the backdrop closes; clicking the panel must not.
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        // m-auto is load-bearing: Tailwind's preflight sets margin:0 on every
        // element, which overrides the user-agent's `dialog { margin: auto }`
        // and pins an open dialog to the top-left corner.
        'modal-panel m-auto w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line',
        'bg-raised p-0 text-body shadow-float',
        'backdrop:bg-[oklch(15%_0.02_270_/_0.55)] backdrop:backdrop-blur-[2px]',
        SIZES[size],
      )}
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-1.5 text-xs font-semibold tracking-wider text-brand uppercase">
                {eyebrow}
              </div>
            )}
            <h2 id="modal-title" className="text-xl font-semibold tracking-tight text-body">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 shrink-0 rounded-lg p-2 text-faint transition-colors hover:bg-sunken hover:text-body"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        {/* Only the body scrolls, so the title and actions stay put. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-sunken px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </Modal>
  )
}
