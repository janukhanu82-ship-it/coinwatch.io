import React, { useState } from 'react';
import { CheckCircle, ShieldCheck, Bell, SlidersHorizontal, GearSix } from '@phosphor-icons/react';
import { PageHeader, Segmented } from './ui';
import { RISK_PROFILES } from '../lib/useLocalStorage';

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="cw-panel cw-glow cw-glow-soft p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="cw-disc w-10 h-10 shrink-0">
          <Icon weight="duotone" className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold cw-title">{title}</h2>
          <p className="text-[12px] text-fog-2 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-fog mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-fog-2">{hint}</span>}
    </label>
  );
}

export default function SettingsView({ risk, setRisk }) {
  const [draft, setDraft] = useState(() => ({ ...risk }));
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [cooldown, setCooldown] = useState(15);
  const [saved, setSaved] = useState(false);

  const pickProfile = (key) => setDraft((d) => ({ ...d, profile: key, ...RISK_PROFILES[key] }));

  const handleSave = () => {
    setRisk({ ...draft, configured: true, label: RISK_PROFILES[draft.profile]?.label || draft.label });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const maxLossUsd = ((Number(draft.balance) || 0) * (Number(draft.maxLoss) || 0)) / 100;

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="System preferences"
        eyebrowIcon={GearSix}
        title="Settings"
        description="Risk setup for new plans, Telegram alerts and per-symbol cooldowns."
      />

      <Section icon={ShieldCheck} title="Risk setup" description="Captured on every new Plan of Attack and used by the position sizer.">
        <div className="space-y-5">
          <Field label="Risk profile">
            <Segmented
              value={draft.profile}
              onChange={pickProfile}
              options={Object.entries(RISK_PROFILES).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Account balance (USD)">
              <input
                type="number"
                min="0"
                value={draft.balance}
                onChange={(e) => setDraft((d) => ({ ...d, balance: Number(e.target.value) }))}
                className="cw-input cw-num"
              />
            </Field>
            <Field label="Risk per trade (%)">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={draft.riskPerTrade}
                onChange={(e) => setDraft((d) => ({ ...d, riskPerTrade: Number(e.target.value) }))}
                className="cw-input cw-num"
              />
            </Field>
            <Field label="Maximum loss (%)" hint={`≈ $${maxLossUsd.toLocaleString()} at this balance`}>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={draft.maxLoss}
                onChange={(e) => setDraft((d) => ({ ...d, maxLoss: Number(e.target.value) }))}
                className="cw-input cw-num"
              />
            </Field>
          </div>
        </div>
      </Section>

      <div className="grid gap-5 @4xl:grid-cols-2">
        <Section icon={Bell} title="Telegram bot alerts" description="Push confirmed signals straight to your chat.">
          <div className="space-y-4">
            <Field label="Bot token">
              <input
                type="password"
                placeholder="7123456789:ABCdefGhIJKlmNoPQRstuvwxYZ"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="cw-input cw-num placeholder:text-fog-2"
              />
            </Field>
            <Field label="Chat ID">
              <input
                type="text"
                placeholder="123456789 or @your_channel"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="cw-input cw-num placeholder:text-fog-2"
              />
            </Field>
          </div>
        </Section>

        <Section icon={SlidersHorizontal} title="Per-symbol alert cooldown" description="Prevents alert spam while an asset is trending.">
          <div className="flex items-baseline gap-2">
            <span className="cw-num text-[30px] leading-none text-snow">{cooldown}</span>
            <span className="text-[12px] text-fog">minutes</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={cooldown}
            onChange={(e) => setCooldown(Number(e.target.value))}
            className="mt-4 w-full h-1 cursor-pointer"
            aria-label="Cooldown period in minutes"
          />
          <div className="mt-2 flex justify-between cw-num text-[10px] text-fog-2">
            <span>5m</span>
            <span>30m</span>
            <span>60m</span>
          </div>
        </Section>
      </div>

      <div className="flex items-center justify-end gap-4">
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-mint" role="status">
            <CheckCircle weight="fill" className="w-4 h-4" /> Settings saved
          </span>
        )}
        <button onClick={handleSave} className="cw-btn-primary !h-10 !px-6">
          Save changes
        </button>
      </div>
    </div>
  );
}
