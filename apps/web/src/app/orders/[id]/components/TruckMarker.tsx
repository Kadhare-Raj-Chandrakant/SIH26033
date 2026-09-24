import React from 'react';
import { Truck } from 'lucide-react';

interface TruckMarkerBadgeProps {
  statusText?: string;
  speed?: string;
}

export function TruckMarkerBadge({ statusText = 'In Transit', speed = '48 km/h' }: TruckMarkerBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#233D22] text-[#FAF8F2] shadow-sm border border-[#162716] text-xs font-medium">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </span>
      <Truck className="w-3.5 h-3.5" />
      <span>{statusText}</span>
      <span className="text-white/60 font-mono text-[11px]">• {speed}</span>
    </div>
  );
}

/**
 * Returns HTML string for Leaflet DivIcon with pulsing radar wave
 */
export function getTruckDivIconHtml(): string {
  return `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
      <span style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background-color: #233D22; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 9999px; background-color: #233D22; color: #FAF8F2; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25); border: 2px solid #FAF8F2;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
      </div>
    </div>
  `;
}

export function getMandiOriginIconHtml(label: string = 'Farm Origin'): string {
  return `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <div style="background-color: #2E4221; color: #FAF8F2; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #1E221B; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
        ${label}
      </div>
      <div style="width: 10px; height: 10px; border-radius: 9999px; background-color: #2E4221; border: 2px solid #FAF8F2; margin-top: 2px;"></div>
    </div>
  `;
}

export function getDestinationHubIconHtml(label: string = 'Destination Hub'): string {
  return `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <div style="background-color: #1E221B; color: #FAF8F2; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #444; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
        ${label}
      </div>
      <div style="width: 10px; height: 10px; border-radius: 9999px; background-color: #1E221B; border: 2px solid #FAF8F2; margin-top: 2px;"></div>
    </div>
  `;
}
