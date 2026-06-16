import { Hero } from './components/hero/Hero'
import { Nav } from './components/layout/Nav'
import { Footer } from './components/footer/Footer'
import { OverviewSection } from './components/sections/OverviewSection'
import { AbstractSection } from './components/sections/AbstractSection'
import { MethodSection } from './components/sections/MethodSection'
import { ArchitectureSection } from './components/sections/ArchitectureSection'
import { ResultsVideoSection } from './components/sections/ResultsVideoSection'
import { QuantitativeSection } from './components/sections/QuantitativeSection'
import { DataCollectionSection } from './components/sections/DataCollectionSection'
import { CitationSection } from './components/sections/CitationSection'
import MujocoViewerSection from './phase2/MujocoViewerSection'

/**
 * Page composition. Section order:
 * Hero → [dark] Overview video → Abstract → Method → Architecture →
 * [dark] Results video → [dark] Quantitative → Data collection →
 * [dark] Phase-2 viewer → Citation → Footer.
 */
export function App() {
  return (
    <>
      <Nav />
      <Hero />
      <main>
        <OverviewSection />
        <AbstractSection />
        <MethodSection />
        <ArchitectureSection />
        <ResultsVideoSection />
        <QuantitativeSection />
        <DataCollectionSection />
        <MujocoViewerSection />
        <CitationSection />
      </main>
      <Footer />
    </>
  )
}
