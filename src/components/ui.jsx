import React, { useEffect, useId, useRef, useState } from 'react';
import { CircleNotch } from '@phosphor-icons/react';

export const BRAND = 'coinwach';

/** Eight-spoke asterisk mark used as the coinwach logo. */
export function BrandMark({ className = 'w-8 h-8' }) {
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  const gid = `cw-brand-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="40" y2="40">
          <stop offset="0" stopColor="#e3f8e8" />
          <stop offset="1" stopColor="#7ee6a3" />
        </linearGradient>
      </defs>
      {spokes.map((a, i) => {
        const x = 20 + Math.cos(a) * 14;
        const y = 20 + Math.sin(a) * 14;
        return (
          <g key={i} stroke={`url(#${gid})`} strokeWidth="2.2" strokeLinecap="round">
            <line x1={20 + Math.cos(a) * 5} y1={20 + Math.sin(a) * 5} x2={x} y2={y} />
            <circle cx={x} cy={y} r="2.6" fill="#0b0b0e" />
          </g>
        );
      })}
      <circle cx="20" cy="20" r="4.2" stroke={`url(#${gid})`} strokeWidth="2.2" fill="#0b0b0e" />
    </svg>
  );
}

/** Green eyebrow pill (Behance section label). */
export function Eyebrow({ children, icon: Icon }) {
  return (
    <span className="cw-pill">
      {Icon ? <Icon weight="duotone" className="w-3.5 h-3.5" /> : <CircleNotch weight="bold" className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}

/** Page header: eyebrow pill, gradient title, description, actions on the right. */
export function PageHeader({ eyebrow, eyebrowIcon, title, description, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-3">
            <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
          </div>
        )}
        <h1 className="cw-heading-l text-[32px] md:text-[38px] pb-1">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-fog max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Flash text when the value changes (fast, minimal). */
export function FlashValue({ value, direction, className = '' }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState('');
  useEffect(() => {
    if (prev.current !== value) {
      const up = direction ?? (Number(value) >= Number(prev.current) ? 'up' : 'down');
      setFlash(up === 'up' ? 'cw-flash-up' : 'cw-flash-down');
      prev.current = value;
      const t = setTimeout(() => setFlash(''), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [value, direction]);
  return <span className={`${className} ${flash}`}>{value}</span>;
}

/** Stat card — icon disc + value on one row, label beneath (Behance "12 Years" card). */
export function StatCard({ icon: Icon, label, value, caption, tone, highlight = false }) {
  const toneClass = tone === 'up' ? 'text-mint' : tone === 'down' ? 'text-coral' : 'text-snow';
  return (
    <div className={`cw-panel cw-hover px-4 py-4 min-w-0 ${highlight ? 'cw-glow' : 'cw-glow cw-glow-soft'}`}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="cw-disc w-9 h-9 shrink-0">
            <Icon weight="duotone" className="w-[18px] h-[18px]" />
          </span>
        )}
        <span title={String(value)} className={`cw-num text-[22px] font-medium leading-none truncate ${toneClass}`}>
          <FlashValue value={value} />
        </span>
      </div>
      <div className="mt-3.5 text-[13px] text-snow/85 truncate">{label}</div>
      {caption && <div className="mt-0.5 text-[11px] text-fog-2 truncate">{caption}</div>}
    </div>
  );
}

/** Pill segmented control. options: [{ value, label, badge? }] */
export function Segmented({ options, value, onChange, size = 'md', className = '' }) {
  return (
    <div role="tablist" className={`cw-seg ${size === 'sm' ? 'cw-seg-sm' : ''} ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
          className="inline-flex items-center gap-1.5"
        >
          {o.label}
          {o.badge !== undefined && <span className="cw-num text-[10px] opacity-60">{o.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/** Connection pill. */
export function LivePill({ isConnected, label }) {
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-2 h-8 px-3 rounded-full border text-[11px] font-semibold tracking-[0.08em] uppercase ${
        isConnected ? 'border-mint/30 text-mint bg-mint/[0.06]' : 'border-white/10 text-fog bg-white/[0.02]'
      }`}
    >
      <span className="relative flex w-1.5 h-1.5">
        {isConnected && <span className="absolute inset-0 rounded-full bg-mint animate-ping opacity-70" />}
        <span className={`relative w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-mint' : 'bg-fog-2'}`} />
      </span>
      {isConnected ? 'Live' : 'Connecting'}
    </span>
  );
}

/** Panel heading with an eyebrow label. */
export function PanelTitle({ eyebrow, title, right }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        {eyebrow && <div className="text-[11px] font-medium text-mint">{eyebrow}</div>}
        <h2 className="mt-0.5 text-[20px] font-semibold tracking-tight cw-title">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/** Micro label + value. */
export function Metric({ label, value, tone = 'default', className = '' }) {
  const toneClass =
    tone === 'up'
      ? 'text-mint'
      : tone === 'down'
        ? 'text-coral'
        : tone === 'accent'
          ? 'text-terminal-cyan'
          : tone === 'muted'
            ? 'text-fog'
            : 'text-snow/90';
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-[10px] text-fog-2">{label}</div>
      <div className={`cw-num mt-0.5 text-[13px] truncate ${toneClass}`}>{value}</div>
    </div>
  );
}
