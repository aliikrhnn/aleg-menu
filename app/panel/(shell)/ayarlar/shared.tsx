'use client';

import React from 'react';

// ============================================================
// Paylaşılan form bileşenleri
// ============================================================

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="block uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.12em',
            fontWeight: 700,
            color: 'var(--ink-3)',
          }}
        >
          {label}
          {required && <span className="text-accent ml-1">*</span>}
        </span>
        {hint && (
          <span className="text-[10px] text-ink-3" style={{ fontFamily: 'var(--f-mono)' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  disabled,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
  prefix?: string;
}) {
  if (prefix) {
    return (
      <div className="flex items-stretch">
        <span
          className="flex items-center px-3 text-sm text-ink-3"
          style={{
            background: 'var(--paper-3)',
            border: '1px solid var(--line)',
            borderRight: 'none',
            borderRadius: '10px 0 0 10px',
            fontFamily: 'var(--f-mono)',
          }}
        >
          {prefix}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className="flex-1 h-11 px-3.5 text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
          style={{
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            borderRadius: '0 10px 10px 0',
          }}
        />
      </div>
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      className="w-full h-11 px-3.5 rounded-[10px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-card transition-colors"
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
      }}
    />
  );
}

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className="w-full px-3.5 py-2.5 rounded-[10px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-card transition-colors resize-none"
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
      }}
    />
  );
}

export function Card({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <div
      className="rounded-[14px] p-5 md:p-6"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      {title && (
        <div className="mb-4">
          <h3
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h3>
          {description && (
            <p className="text-ink-2 text-[13px] mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint && <div className="text-[11px] text-ink-3 mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
        style={{
          background: checked ? 'var(--accent)' : 'var(--line-2)',
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
          style={{
            left: checked ? '22px' : '2px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        />
      </button>
    </div>
  );
}
