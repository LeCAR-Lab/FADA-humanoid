import type { ReactNode } from 'react'
import './common.css'

interface Props {
  /** A CSS color or var() used for the dot + accent. */
  color?: string
  children: ReactNode
  /** Filled = solid background; outline = subtle. */
  variant?: 'dot' | 'filled' | 'outline'
  className?: string
}

export function Chip({ color = 'currentColor', children, variant = 'dot', className = '' }: Props) {
  return (
    <span
      className={`chip chip--${variant} ${className}`}
      style={{ ['--chip-color' as string]: color }}
    >
      {variant === 'dot' && <span className="chip__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}
