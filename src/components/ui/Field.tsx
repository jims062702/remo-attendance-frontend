import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/utils/format'

const CONTROL =
  'w-full rounded-lg border border-line bg-raised px-3.5 py-2.5 text-[15px] text-body placeholder:text-faint ' +
  'transition-colors focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted'

interface FieldProps {
  label?: string
  hint?: ReactNode
  error?: string
  required?: boolean
  children: (id: string) => ReactNode
  className?: string
}

/**
 * Label, control, hint and error in one place.
 *
 * The error replaces the hint rather than stacking beneath it, so the space
 * below a field never grows and shifts the rest of the form as the user types.
 */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId()

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-[15px] font-medium text-body">
          {label}
          {required && (
            <span className="ml-0.5 text-bad" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children(id)}

      {error ? (
        <p role="alert" className="text-[13px] font-medium text-bad">
          {error}
        </p>
      ) : (
        hint && <p className="text-[13px] text-muted">{hint}</p>
      )}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, invalid && 'border-bad', className)}
      {...props}
    />
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'cursor-pointer', invalid && 'border-bad', className)}
      {...props}
    >
      {children}
    </select>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'min-h-20 resize-y', invalid && 'border-bad', className)}
      {...props}
    />
  )
}

/**
 * A labelled from/to date range.
 *
 * The "to" input carries a min of the "from" value so the browser prevents an
 * inverted range before the API has to reject it.
 */
export function DateRange({
  from,
  to,
  onFromChange,
  onToChange,
  className,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      {/* Fixed width, not flex-1: a date input stretched across a whole row
          reads as a form that could not think of anything else to put there. */}
      <Field label="From" className="w-44 shrink-0">
        {(id) => (
          <Input
            id={id}
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => onFromChange(event.target.value)}
          />
        )}
      </Field>
      <Field label="To" className="w-44 shrink-0">
        {(id) => (
          <Input
            id={id}
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => onToChange(event.target.value)}
          />
        )}
      </Field>
    </div>
  )
}
