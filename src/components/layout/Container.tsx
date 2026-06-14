import type { ReactNode } from 'react'
import './layout.css'

interface Props {
  children: ReactNode
  /** wide = 1380px, default = 1180px, text = readable measure. */
  width?: 'default' | 'wide' | 'text'
  className?: string
}

export function Container({ children, width = 'default', className = '' }: Props) {
  return <div className={`container container--${width} ${className}`}>{children}</div>
}
