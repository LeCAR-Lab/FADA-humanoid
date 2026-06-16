import { assetUrl } from '../../lib/assetUrl'
import { LAB } from '../../data/authors'
import { SITE } from '../../data/content'
import { Container } from '../layout/Container'
import { CmuWordmark } from '../hero/CmuWordmark'
import './footer.css'

export function Footer() {
  return (
    <footer className="footer dark">
      <Container width="wide">
        <div className="footer__top">
          <div className="footer__brand">
            <span className="footer__acronym">FADA</span>
            <p className="footer__line">{SITE.title}</p>
          </div>

          <div className="footer__logos">
            <a href={LAB.url} target="_blank" rel="noopener noreferrer" className="footer__lab">
              <img
                src={assetUrl('logos/lecar-lab.png')}
                alt={LAB.name}
                loading="lazy"
                width={2262}
                height={804}
              />
            </a>
            <a href="https://www.cmu.edu/" target="_blank" rel="noopener noreferrer" className="footer__cmu">
              <CmuWordmark height={26} color="var(--chalk)" />
            </a>
          </div>
        </div>

        <div className="footer__bottom">
          <p>
            © 2026 {LAB.name}, {LAB.institution}.
          </p>
          <p className="footer__credit">
            Built for the public release. Page design by the FADA authors.
          </p>
        </div>
      </Container>
    </footer>
  )
}
