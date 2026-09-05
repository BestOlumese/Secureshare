import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import Transparency from "@/components/landing/Transparency";
import Comparison from "@/components/landing/Comparison";
import FAQ from "@/components/landing/FAQ";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Transparency />
      <Comparison />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
