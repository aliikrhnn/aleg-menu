'use client';

import { useState, useEffect } from 'react';
import {
  BackgroundPatternLayer,
  WelcomeRitual,
  CornerOrnament,
} from '@/lib/menu-theme-decorations';
import type { ThemeDefinition } from '@/lib/menu-themes';

type Props = {
  theme: ThemeDefinition;
  businessName: string;
  isPreview: boolean;
  children: React.ReactNode;
};

const WELCOME_RITUAL_KEY_PREFIX = 'aleg-welcome-shown-';
// 2 saat içinde tekrar gösterme
const WELCOME_TTL_MS = 2 * 60 * 60 * 1000;

export function MenuThemeWrapper({
  theme,
  businessName,
  isPreview,
  children,
}: Props) {
  const [showRitual, setShowRitual] = useState(false);
  const [ritualReady, setRitualReady] = useState(false);

  // Welcome ritual kontrolü - sadece ilk ziyarette
  useEffect(() => {
    if (isPreview) {
      // Önizlemede her tema değişimde tekrar göster (kısa süre)
      setShowRitual(true);
      setRitualReady(true);
      return;
    }

    try {
      const key = `${WELCOME_RITUAL_KEY_PREFIX}${theme.id}`;
      const shownAt = window.localStorage.getItem(key);
      const now = Date.now();
      const recentlyShown =
        shownAt && now - parseInt(shownAt, 10) < WELCOME_TTL_MS;

      if (!recentlyShown) {
        setShowRitual(true);
        window.localStorage.setItem(key, String(now));
      }
    } catch {
      // Yoksay
    }
    setRitualReady(true);
  }, [isPreview, theme.id]);

  return (
    <>
      <BackgroundPatternLayer theme={theme} />
      {/* Vintage / Mediterranean köşe süslemeleri (sadece o temalarda görünür) */}
      <div
        aria-hidden
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}
      >
        <CornerOrnament theme={theme} position="top-left" />
        <CornerOrnament theme={theme} position="top-right" />
        <CornerOrnament theme={theme} position="bottom-left" />
        <CornerOrnament theme={theme} position="bottom-right" />
      </div>
      {ritualReady && showRitual && (
        <WelcomeRitual
          theme={theme}
          businessName={businessName}
          onDone={() => setShowRitual(false)}
        />
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </>
  );
}
