import { Footer } from './components/FooterLanding'
import HeaderLanding from './components/HeaderLanding'
import { CTASection } from './components/CTASection'
import { Features } from './components/FeaturesSection'
import HeroSection from './components/Hero'
import HowItWorksSection from './components/HowItWorks'
import StatsSection from './components/StatsSection'
import SocialProofSection from './components/SocialProofSection'
import ManifestoSection from './components/ManifestoSection'
import CompareSection from './components/CompareSection'
import CountriesSection from './components/CountriesSection'
// import TeamSection from './components/TeamSection' — oculto hasta tener los 7 perfiles reales del equipo

export default function LandingPage() {
  return (
    <>
      <HeaderLanding />
      <HeroSection />
      <StatsSection />
      <SocialProofSection />
      <HowItWorksSection />
      <Features />
      {/* <TeamSection /> */}
      <ManifestoSection />
      <CompareSection />
      <CountriesSection />
      <CTASection />
      <Footer />
    </>
  )
}