import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong border-transparent',
  secondary: 'bg-raised text-body border-line hover:bg-sunken',
  ghost: 'bg-transparent text-muted border-transparent hover:bg-sunken hover:text-body',
  danger: 'bg-bad text-white hover:opacity-90 border-transparent',
  success: 'bg-ok text-white hover:opacity-90 border-transparent',
}

const SIZES: Record<Size, string> = {
  // Compact on purpose: `sm` is what row actions are built from, and three of
  // them side by side is the widest column in most tables. Its padding is
  // rem-based, so it grew with the larger root size and took the table width
  // with it.
  sm: 'h-8 px-2.5 text-[13px] gap-1',
  md: 'h-11 px-4.5 text-[15px] gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // A button showing a spinner must not also be clickable, or a slow
      // network turns one clock-in into three.
      disabled={disabled || loading}
      // Tells assistive technology the control is busy, not broken.
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border font-medium',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  )
}
