import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black font-sans text-zinc-900 dark:text-zinc-50 selection:bg-blue-500/30">
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
}
