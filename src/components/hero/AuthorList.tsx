import type { Affiliation, Author } from '../../data/types'
import './hero.css'

interface Props {
  authors: Author[]
  affiliations: Affiliation[]
}

export function AuthorList({ authors, affiliations }: Props) {
  const hasEqual = authors.some((a) => a.equalContrib)

  return (
    <div className="authors">
      <ul className="authors__list">
        {authors.map((a) => {
          const inner = (
            <>
              {a.name}
              <sup className="authors__marks">
                {a.equalContrib && <span title="Equal contribution">*</span>}
                {a.affiliations.map((id) => (
                  <span key={id}>{id}</span>
                ))}
              </sup>
            </>
          )
          return (
            <li key={a.name} className="authors__item">
              {a.url ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="authors__name">
                  {inner}
                </a>
              ) : (
                <span className="authors__name authors__name--plain">{inner}</span>
              )}
            </li>
          )
        })}
      </ul>

      <ul className="authors__affils">
        {affiliations.map((aff) => (
          <li key={aff.id}>
            <sup>{aff.id}</sup>
            {aff.url ? (
              <a href={aff.url} target="_blank" rel="noopener noreferrer">
                {aff.name}
              </a>
            ) : (
              aff.name
            )}
          </li>
        ))}
        {hasEqual && (
          <li className="authors__equal">
            <sup>*</sup> Equal contribution
          </li>
        )}
      </ul>
    </div>
  )
}
