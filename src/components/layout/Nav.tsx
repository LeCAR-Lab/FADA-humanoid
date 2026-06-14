import { useEffect, useState } from 'react'
import './layout.css'

interface NavItem {
  id: string
  label: string
}

const ITEMS: NavItem[] = [
  { id: 'abstract', label: 'Abstract' },
  { id: 'method', label: 'Method' },
  { id: 'results', label: 'Results' },
  { id: 'quantitative', label: 'Numbers' },
  { id: 'citation', label: 'Cite' },
]

/**
 * Sticky in-page nav. Appears after scrolling past the hero, highlights the
 * section currently in view, and smooth-scrolls on click.
 */
export function Nav() {
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState<string>('abstract')

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.7)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    ITEMS.forEach((it) => {
      const el = document.getElementById(it.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <nav className={`pagenav ${visible ? 'is-visible' : ''}`} aria-label="Section navigation">
      <a href="#top" className="pagenav__brand">
        FADA
      </a>
      <ul className="pagenav__list">
        {ITEMS.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} className={`pagenav__link ${active === it.id ? 'is-active' : ''}`}>
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
