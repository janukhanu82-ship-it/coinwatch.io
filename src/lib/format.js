export function fmtPrice(p) {
  const n = Number(p);
  if (!Number.isFinite(n) || n === 0) return '0';
  const a = Math.abs(n);
  if (a >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (a >= 1) return String(+n.toFixed(4));
  if (a >= 0.01) return String(+n.toFixed(5));
  if (a >= 0.0001) return String(+n.toFixed(7));
  return n.toPrecision(4);
}

export function fmtUsd(v, suffix = '') {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B${suffix}`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M${suffix}`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(2)}K${suffix}`;
  return `$${n.toFixed(2)}${suffix}`;
}

export function fmtVol(v) {
  const n = Number(v) || 0;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M USDT`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K USDT`;
  return `${n.toFixed(2)} USDT`;
}

export function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtDateTime(ms) {
  const d = new Date(ms);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${fmtTime(ms)}`;
}

export function pct(n, digits = 2) {
  const v = Number(n) || 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
}
