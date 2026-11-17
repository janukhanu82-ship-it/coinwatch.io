import React, { useState } from 'react';
import { Settings, Bell, Shield, Sliders, CheckCircle2 } from 'lucide-react';

export default function SettingsView() {
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [cooldown, setCooldown] = useState(15);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 font-mono select-none max-w-3xl">
      <div>
        <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase mb-1">
          SYSTEM PREFERENCES
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">
          Settings
        </h1>
        <p className="text-xs text-[#8E9BAE] mt-1">
          Configure real-time alerts, telegram bot notifications, and sensitivity thresholds.
        </p>
      </div>

      <div className="bg-[#0C101A] border border-[#1A2234] rounded-2xl p-6 space-y-6 shadow-xl">
        {/* Telegram Alerts */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-[#1A2234] pb-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span>TELEGRAM BOT ALERTS</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[#8E9BAE] mb-1 block">TELEGRAM BOT TOKEN</label>
              <input
                type="password"
                placeholder="e.g. 7123456789:ABCdefGhIJKlmNoPQRstuvwxYZ"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="w-full bg-[#07090E] border border-[#1A2234] rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500/60 font-mono"
              />
            </div>

            <div>
              <label className="text-[#8E9BAE] mb-1 block">TELEGRAM CHAT ID</label>
              <input
                type="text"
                placeholder="e.g. 123456789 or @your_channel"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full bg-[#07090E] border border-[#1A2234] rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500/60 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Cooldown Settings */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-[#1A2234] pb-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>PER-SYMBOL ALERT COOLDOWN</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#8E9BAE]">
              <span>Cooldown Period</span>
              <span className="text-emerald-400 font-bold">{cooldown} Minutes</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="w-full h-1.5 bg-[#151B28] rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <p className="text-[10px] text-[#5A6882]">Prevents alert spam when an asset is actively trending or swinging.</p>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-[#1A2234] flex items-center justify-between">
          <span className="text-xs text-emerald-400 font-bold">
            {saved ? "✓ Settings saved successfully!" : ""}
          </span>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
