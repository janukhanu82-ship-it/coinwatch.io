import React from 'react';
import { Radar, Radio, Eye, Star } from 'lucide-react';

export default function TabBar({ activeTab, onSelectTab, counts }) {
  const tabs = [
    {
      id: 'radar',
      label: 'RADAR',
      icon: Radar,
      count: counts?.radar ?? 0,
      showCount: true,
    },
    {
      id: 'feed',
      label: 'LIVE FEED',
      icon: Radio,
      count: counts?.feed ?? 0,
      showCount: true,
    },
    {
      id: 'watchlist',
      label: 'WATCHLIST',
      icon: Eye,
      count: counts?.watchlist ?? 0,
      showCount: true,
    },
    {
      id: 'favorites',
      label: 'FAVORITES',
      icon: Star,
      count: counts?.favorites ?? 0,
      showCount: true,
    },
  ];

  return (
    <nav className="bg-terminal-card border-b border-terminal-border font-mono uppercase text-xs px-3 sm:px-4 flex items-center gap-1 sm:gap-2 select-none overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 transition-all duration-150 border-b-2 whitespace-nowrap outline-none ${
              isActive
                ? 'border-terminal-cyan text-white font-bold bg-terminal-dark/70 shadow-inner'
                : 'border-transparent text-terminal-muted hover:text-terminal-text hover:bg-terminal-hover/40'
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                isActive ? 'text-terminal-cyan animate-pulse' : 'text-terminal-muted'
              }`}
            />
            <span className="tracking-wider">{tab.label}</span>
            {tab.showCount && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isActive
                    ? 'bg-terminal-cyan/15 text-terminal-cyan border border-terminal-cyan/30'
                    : 'bg-terminal-dark text-terminal-muted border border-terminal-border'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
