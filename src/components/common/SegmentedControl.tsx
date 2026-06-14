import './common.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

/**
 * Accessible segmented control (WAI-ARIA radiogroup) with arrow-key navigation.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: Props<T>) {
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + options.length) % options.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = options.length - 1
    else return
    e.preventDefault()
    onChange(options[next].value)
  }

  return (
    <div className={`segmented ${className}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt, i) => {
        const checked = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="segmented__opt"
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
