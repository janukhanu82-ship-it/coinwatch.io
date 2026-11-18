import React, { useEffect, useRef } from 'react';

const PALETTE = {
  up: { rgb: [126, 230, 163], css: '#7ee6a3', soft: 'rgba(169,205,170,0.30)' },
  down: { rgb: [242, 112, 124], css: '#f2707c', soft: 'rgba(242,112,124,0.22)' },
};

const rand = (a, b) => a + Math.random() * (b - a);

/**
 * Layered motion effect for the strongest mover card.
 * Parent must be `relative overflow-hidden` with a border radius.
 * - canvas: rising (pump) / falling (dump) embers with trails, diagonal light streaks, sparkle glints
 * - aurora: slow drifting colour bloom
 */
export default function MoverFX({ direction = 'up', intensity = 1 }) {
  const canvasRef = useRef(null);
  const pal = PALETTE[direction] || PALETTE.up;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const up = direction !== 'down';
    const [r, g, b] = pal.rgb;
    const col = (a) => `rgba(${r},${g},${b},${a})`;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let last = performance.now();

    const embers = [];
    const streaks = [];
    const glints = [];

    const spawnEmber = (initial) => ({
      x: rand(0, w),
      y: initial ? rand(0, h) : up ? h + rand(0, 20) : -rand(0, 20),
      vx: rand(-0.12, 0.28),
      vy: (up ? -1 : 1) * rand(0.25, 0.95),
      r: rand(0.6, 1.9),
      phase: rand(0, Math.PI * 2),
      life: 0,
      max: rand(140, 320),
      hot: Math.random() < 0.18,
    });

    const spawnStreak = (initial) => {
      const len = rand(70, 190);
      return {
        x: initial ? rand(-len, w) : -len - rand(0, w * 0.6),
        y: rand(-10, h + 10),
        len,
        speed: rand(1.6, 4.4),
        width: rand(0.6, 1.4),
        alpha: rand(0.25, 0.7),
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const emberCount = Math.round(((w * h) / 4200) * intensity);
      embers.length = 0;
      for (let i = 0; i < Math.min(emberCount, 140); i++) embers.push(spawnEmber(true));
      streaks.length = 0;
      for (let i = 0; i < Math.round(4 * intensity); i++) streaks.push(spawnStreak(true));
    };

    // Streak angle: rising for pumps, descending for dumps
    const angle = (up ? -1 : 1) * 0.32;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const draw = (dt) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      // Light streaks
      for (const s of streaks) {
        s.x += s.speed * dt;
        if (s.x - s.len > w + 40) Object.assign(s, spawnStreak(false));
        const hx = s.x;
        const hy = s.y + (s.x - w / 2) * (sinA / cosA) * 0.35;
        const tx = hx - s.len * cosA;
        const ty = hy - s.len * sinA;
        const grad = ctx.createLinearGradient(tx, ty, hx, hy);
        grad.addColorStop(0, col(0));
        grad.addColorStop(0.75, col(s.alpha * 0.55));
        grad.addColorStop(1, `rgba(255,255,255,${s.alpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }

      // Embers with short trails
      for (const p of embers) {
        p.life += dt;
        p.phase += 0.04 * dt;
        p.x += (p.vx + Math.sin(p.phase) * 0.15) * dt;
        p.y += p.vy * dt;
        const t = p.life / p.max;
        const fade = t < 0.15 ? t / 0.15 : t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1;
        if (t >= 1 || p.y < -20 || p.y > h + 20) {
          Object.assign(p, spawnEmber(false));
          continue;
        }
        const tw = 0.6 + 0.4 * Math.sin(p.phase * 3);
        const a = fade * tw * (p.hot ? 0.95 : 0.6);
        // trail
        ctx.strokeStyle = col(a * 0.35);
        ctx.lineWidth = p.r * 0.9;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 7, p.y - p.vy * 7);
        ctx.stroke();
        // halo
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (p.hot ? 7 : 4.5));
        halo.addColorStop(0, col(a * 0.55));
        halo.addColorStop(1, col(0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (p.hot ? 7 : 4.5), 0, Math.PI * 2);
        ctx.fill();
        // core
        ctx.fillStyle = p.hot ? `rgba(255,255,255,${a})` : col(a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sparkle glints
      if (Math.random() < 0.035 * dt * intensity) {
        glints.push({ x: rand(w * 0.05, w * 0.95), y: rand(h * 0.1, h * 0.9), life: 0, max: rand(28, 55), s: rand(4, 9) });
      }
      for (let i = glints.length - 1; i >= 0; i--) {
        const gl = glints[i];
        gl.life += dt;
        const t = gl.life / gl.max;
        if (t >= 1) {
          glints.splice(i, 1);
          continue;
        }
        const a = Math.sin(t * Math.PI);
        const s = gl.s * (0.6 + a * 0.6);
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gl.x - s, gl.y);
        ctx.lineTo(gl.x + s, gl.y);
        ctx.moveTo(gl.x, gl.y - s);
        ctx.lineTo(gl.x, gl.y + s);
        ctx.stroke();
        const halo = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, s * 1.6);
        halo.addColorStop(0, col(a * 0.6));
        halo.addColorStop(1, col(0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(gl.x, gl.y, s * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
    };

    const loop = (now) => {
      const dt = Math.min(3, (now - last) / 16.67);
      last = now;
      if (visible && !document.hidden) draw(dt);
      raf = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    if (reduce) {
      draw(1);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [direction, intensity, pal]);

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ '--fx': pal.css }} aria-hidden="true">
      {/* drifting bloom */}
      <div
        className="cw-aurora absolute -inset-1/4"
        style={{
          background: `radial-gradient(45% 50% at 22% 22%, ${pal.soft}, transparent 70%)`,
        }}
      />
      {/* faint grid revealed by the bloom */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(70% 80% at 50% 50%, #000, transparent 80%)',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
