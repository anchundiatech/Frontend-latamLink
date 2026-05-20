import { Footer } from './components/FooterLanding'
import HeaderLanding from './components/HeaderLanding'
import { CTASection } from './components/CTASection'
import { Features } from './components/FeaturesSection'
import HeroSection from './components/Hero'
import HowItWorksSection from './components/HowItWorks'
import StatsSection from './components/StatsSection'
import CompareSection from './components/CompareSection'
import CountriesSection from './components/CountriesSection'
import TeamSection from './components/TeamSection'

export default function LandingPage() {
  return (
    <>
      <HeaderLanding />
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <Features />
      <CompareSection />
      <CountriesSection />
      <TeamSection />
      <CTASection />
      <Footer />
    </>
  )
}