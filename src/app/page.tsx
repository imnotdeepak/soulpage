import HeroSection from "@/components/hero-section";
import Features from "@/components/features-1";
import PricingSection from "@/components/pricing-section";
import CTASection from "@/components/cta-section";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <HeroSection />
      <Features />
      <CTASection />
    </div>
  );
}
