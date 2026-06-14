import type { Affiliation, Author, ProjectLink } from './types'

export const AFFILIATIONS: Affiliation[] = [
  { id: 1, name: 'Carnegie Mellon University', url: 'https://www.cmu.edu/' },
]

/**
 * Author order follows the paper. Angchen Xie and Nikhil Sobanbabu are
 * equal-contribution first authors.
 */
export const AUTHORS: Author[] = [
  { name: 'Angchen Xie', affiliations: [1], equalContrib: true, url: 'https://angchenxie.github.io/' },
  { name: 'Nikhil Sobanbabu', affiliations: [1], equalContrib: true, url: 'https://nike353.github.io/' },
  { name: 'Ishayu Shikhare', affiliations: [1], url: 'https://ishayushikhare.com/' },
  { name: 'Alan Wang', affiliations: [1] }, // TODO: add personal site link if available
  { name: 'Max Simchowitz', affiliations: [1], url: 'https://msimchowitz.github.io/' },
  { name: 'Guanya Shi', affiliations: [1], url: 'https://www.gshi.me/' },
]

/**
 * Header link buttons. All hrefs are placeholders for now (disabled), so only
 * the URL strings need to change once the paper / code go public.
 */
export const PROJECT_LINKS: ProjectLink[] = [
  { label: 'Paper', href: '#', icon: 'paper', disabled: true },
  { label: 'arXiv', href: '#', icon: 'arxiv', disabled: true },
  { label: 'Code', href: '#', icon: 'code', disabled: true },
  { label: 'Video', href: '#', icon: 'video', disabled: true },
]

export const LAB = {
  name: 'LeCAR Lab',
  url: 'https://lecar-lab.github.io/',
  institution: 'Carnegie Mellon University',
}
