'use client';

import { useEffect } from 'react';

export function RevealOnScroll() {
  useEffect(() => {
    // Eğer IntersectionObserver yoksa (çok eski tarayıcılar), hepsini göster
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('reveal-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // Element ekran alt kenarından 100px kala tetikle
        // threshold 0 = element 1 piksel bile görünür olunca tetiklenir
        // Bu özellikle büyük elementler için güvenilir
        rootMargin: '0px 0px -80px 0px',
        threshold: 0,
      }
    );

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observer.observe(el));

    // FALLBACK: 3 saniye sonra görünmeyen her şeyi zorla göster
    // (çok nadir edge case'lerde tetiklenmeyenler için)
    const fallbackTimer = setTimeout(() => {
      document.querySelectorAll('.reveal:not(.reveal-in)').forEach((el) => {
        el.classList.add('reveal-in');
      });
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
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

      /* Reduced motion olan kullanıcılar için */
      @media (prefers-reduced-motion: reduce) {
        .reveal {
          opacity: 1;
          transform: none;
          transition: none;
        }
      }
    `}</style>
  );
}
