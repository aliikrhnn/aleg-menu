'use client';

import { useState } from 'react';
import { Nav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { Problems } from '@/components/landing/problems';
import { OrderFlow } from '@/components/landing/orderflow';
import { Features } from '@/components/landing/features';
import { Steps } from '@/components/landing/steps';
import { Showcase } from '@/components/landing/showcase';
import { Modules } from '@/components/landing/modules';
import { Pricing } from '@/components/landing/pricing';
import { FinalCTA } from '@/components/landing/final-cta';
import { Footer } from '@/components/landing/footer';
import { DemoModal } from '@/components/landing/demo-modal';
import { WhatsAppFloat } from '@/components/landing/whatsapp-float';
import { RevealOnScroll } from '@/components/landing/reveal-on-scroll';

export default function HomePage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);
  const closeDemo = () => setDemoOpen(false);

  return (
    <main data-theme="swiss" className="min-h-screen bg-paper text-ink overflow-x-hidden">
      <Nav onDemo={openDemo} />
      <Hero onDemo={openDemo} />
      <Problems />
      <OrderFlow />
      <Features />
      <Steps />
      <Showcase />
      <Modules />

      {/* Parça 3b'de gelecek: ModuleDeepDive + MapSection + Early + FAQ */}

      <Pricing onDemo={openDemo} />
      <FinalCTA onDemo={openDemo} />
      <Footer />

      <DemoModal open={demoOpen} onClose={closeDemo} />
      <WhatsAppFloat />
      <RevealOnScroll />
    </main>
  );
}
