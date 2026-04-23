'use client';

import { useEffect, useRef, useState } from 'react';

export function CountUp({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  thousandSeparator = true,
  className,
  style,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  thousandSeparator?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const targetRef = useRef(value);
  const runOnceRef = useRef(false);

  useEffect(() => {
    // Aynı değer ise atla — render loop'a girmesin
    if (runOnceRef.current && targetRef.current === value) return;

    fromRef.current = runOnceRef.current ? display : 0;
    targetRef.current = value;
    startRef.current = null;
    runOnceRef.current = true;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      const current =
        fromRef.current + (targetRef.current - fromRef.current) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted = thousandSeparator
    ? display.toLocaleString('tr-TR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : display.toFixed(decimals);

  return (
    <span className={className} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
