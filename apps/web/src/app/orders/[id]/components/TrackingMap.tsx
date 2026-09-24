'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RouteData, ShipmentStatus, SHIPMENT_PROGRESS } from '@/lib/api';
import {
  getTruckDivIconHtml,
  getMandiOriginIconHtml,
  getDestinationHubIconHtml,
  TruckMarkerBadge,
} from './TruckMarker';
import { Navigation, Route as RouteIcon, ShieldCheck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface TrackingMapProps {
  route: RouteData | null;
  shipmentStatus: ShipmentStatus;
  originName?: string;
  destName?: string;
  isLoading?: boolean;
}

export function TrackingMap({
  route,
  shipmentStatus,
  originName = 'Farm Mandi',
  destName = 'Terminal Warehouse',
  isLoading = false,
}: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainerRef.current || !route) return;

    let isSubscribed = true;

    // Dynamically load leaflet on client only
    import('leaflet').then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      // Clean up previous map instance if re-rendering
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
      const latLngs: [number, number][] = route.geometry.coordinates.map(
        ([lon, lat]) => [lat, lon],
      );

      if (latLngs.length === 0) return;

      const originPoint = latLngs[0];
      const destPoint = latLngs[latLngs.length - 1];

      // Initialize map
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      });
      mapInstanceRef.current = map;

      // Add OpenStreetMap Standard Tile Layer (Free, reliable, no API key or watermarks required)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Draw Transit Corridor Polyline
      const polyline = L.polyline(latLngs, {
        color: '#233D22',
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: route.source === 'fallback' ? '6, 8' : undefined,
      }).addTo(map);

      // Add Origin Marker
      const originIcon = L.divIcon({
        className: 'origin-marker-container',
        html: getMandiOriginIconHtml(originName),
        iconSize: [100, 36],
        iconAnchor: [50, 32],
      });
      L.marker(originPoint, { icon: originIcon }).addTo(map);

      // Add Destination Marker
      const destIcon = L.divIcon({
        className: 'dest-marker-container',
        html: getDestinationHubIconHtml(destName),
        iconSize: [110, 36],
        iconAnchor: [55, 32],
      });
      L.marker(destPoint, { icon: destIcon }).addTo(map);

      // Compute Truck Marker interpolated position based on SHIPMENT_PROGRESS
      const progress = SHIPMENT_PROGRESS[shipmentStatus] ?? 0.5;
      const targetIndex = Math.min(
        Math.max(0, Math.floor(progress * (latLngs.length - 1))),
        latLngs.length - 1,
      );
      const truckPos = latLngs[targetIndex] || originPoint;

      // Add Truck Marker with radar pulse
      const truckIcon = L.divIcon({
        className: 'truck-marker-container',
        html: getTruckDivIconHtml(),
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker(truckPos, { icon: truckIcon }).addTo(map);

      // Fit map viewport to corridor bounds with generous padding
      map.fitBounds(polyline.getBounds(), {
        padding: [50, 50],
        maxZoom: 12,
      });
    });

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mounted, route, shipmentStatus, originName, destName]);

  const progressPercent = Math.round(
    (SHIPMENT_PROGRESS[shipmentStatus] ?? 0.5) * 100,
  );

  return (
    <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] overflow-hidden flex flex-col shadow-sm">
      {/* Map Header Status Bar */}
      <div className="p-4 border-b border-[#ECE5D8] flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F2]">
        <div className="flex items-center gap-3">
          <TruckMarkerBadge
            statusText={shipmentStatus.replace(/_/g, ' ')}
            speed={route?.source === 'osrm' ? '54 km/h' : 'Est. Transit'}
          />

          <span className="text-xs text-[#6B7260]">
            Progress: <strong className="text-[#1E221B]">{progressPercent}% Completed</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {route && (
            <>
              <div className="flex items-center gap-1 text-[#233D22] font-semibold">
                <RouteIcon className="w-3.5 h-3.5" />
                <span>{route.distanceKm} km</span>
              </div>
              <span className="text-[#DFD8CB]">|</span>
              <div className="flex items-center gap-1 text-[#5D6352]">
                <Navigation className="w-3.5 h-3.5" />
                <span>~{route.durationHours} hrs</span>
              </div>
              <span className="text-[#DFD8CB]">|</span>
            </>
          )}

          {/* Subtly informative status badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              route?.source === 'osrm'
                ? 'bg-[#E8F0E2] text-[#233D22] border border-[#CCDBCB]'
                : 'bg-[#F4EFE6] text-[#7A5B18] border border-[#E8DCBF]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                route?.source === 'osrm' ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            />
            {route?.source === 'osrm' ? 'Live Highway Route' : 'Corridor Estimate'}
          </span>
        </div>
      </div>

      {/* Map Canvas Viewport */}
      <div className="relative w-full h-105 bg-[#EAE4D6]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#FAF8F2]/80 backdrop-blur-xs space-y-2">
            <div className="w-6 h-6 border-2 border-[#233D22] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-serif font-bold text-[#1E221B]">
              Tracing Highway Telematics Corridor...
            </p>
          </div>
        )}

        <div
          ref={mapContainerRef}
          className="w-full h-full [&_.leaflet-tile-pane]:saturate-[0.85] [&_.leaflet-tile-pane]:contrast-[0.95]"
        />
      </div>

      {/* Corridor Legend Footer */}
      <div className="px-4 py-2.5 bg-[#FAF8F2] border-t border-[#ECE5D8] flex items-center justify-between text-[11px] text-[#6B7260]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E4221]"></span>
            <span>Origin: {originName}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E221B]"></span>
            <span>Destination: {destName}</span>
          </span>
        </div>

        <span className="flex items-center gap-1 text-[10px] text-[#7A8070]">
          <ShieldCheck className="w-3 h-3 text-[#233D22]" />
          Verified Agricultural Transit Corridor
        </span>
      </div>
    </div>
  );
}
