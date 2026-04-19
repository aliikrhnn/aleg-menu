'use client';

import { useEffect } from 'react';

export function RevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <style jsx global>{`
      .reveal {
        opacity: 0;
        transform: translateY(28px);
        transition:
          opacity 0.9s ease,
          transform 0.9s ease;
      }
      .reveal.reveal-in {
        opacity: 1;
        transform: translateY(0);
      }
    `}</style>
  );
}
