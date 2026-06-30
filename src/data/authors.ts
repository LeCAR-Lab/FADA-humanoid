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
 * Header link buttons. Paper and arXiv both point at the arXiv listing (the PDF
 * and abstract pages) so visitors always get the full-quality original. Code
 * stays disabled until the repo is public.
 */
export const PROJECT_LINKS: ProjectLink[] = [
  { label: 'Paper', href: 'https://arxiv.org/pdf/2606.28476', icon: 'paper', disabled: false },
  { label: 'arXiv', href: 'https://arxiv.org/abs/2606.28476', icon: 'arxiv', disabled: false },
  { label: 'Code', href: '#', icon: 'code', disabled: true },
]

export const LAB = {
  name: 'LeCAR Lab',
  url: 'https://lecar-lab.github.io/',
  institution: 'Carnegie Mellon University',
}
