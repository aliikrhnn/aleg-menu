'use client';

import { useEffect, useState } from 'react';

export function LiveClock({
  style,
  className,
  showSeconds = false,
  suppressHydrationWarning = true,
}: {
  style?: React.CSSProperties;
  className?: string;
  showSeconds?: boolean;
  suppressHydrationWarning?: boolean;
}) {
  // Server'da ve ilk client render'da boş string — mismatch olmasın
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      const ss = now.getSeconds().toString().padStart(2, '0');
      setTime(showSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`);
    };

    update();
    // Saniye gösteriyorsak 1sn, yoksa dakikaya senkron
    if (showSeconds) {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    } else {
      // İlk önce bir sonraki dakikanın başına kadar bekle, sonra 60sn'de bir güncelle
      const now = new Date();
      const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      const timeout = setTimeout(() => {
        update();
        const interval = setInterval(update, 60000);
        // Cleanup için interval'i ref'e saklamak yerine component unmount'ta temizlenir
        return () => clearInterval(interval);
      }, msUntilNextMinute);
      return () => clearTimeout(timeout);
    }
  }, [showSeconds]);

  return (
    <span
      className={className}
      style={style}
      suppressHydrationWarning={suppressHydrationWarning}
    >
      {time || '\u00A0\u00A0:\u00A0\u00A0'}
    </span>
  );
}
