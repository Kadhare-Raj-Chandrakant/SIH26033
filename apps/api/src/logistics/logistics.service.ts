import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShipmentStatus, OrderStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  LogisticsProviderAdapter,
  CreateShipmentPayload,
  ShipmentResult,
  ShipmentStatusResult,
  LogisticsProviderException,
  EstimateLogisticsPayload,
  LogisticsEstimateResult,
} from './interfaces/logistics-provider.interface.js';
import { MockLogisticsProvider } from './providers/mock-logistics.provider.js';
import { GetRouteDto } from './dto/get-route.dto.js';
import {
  generate7PointFallbackRoute,
  RouteGeometryResult,
} from './utils/route-fallback.util.js';

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);
  private readonly adapter: LogisticsProviderAdapter;
  private readonly districtCoords: Record<string, [number, number]> = {};
  private readonly routeCache = new Map<
    string,
    { data: RouteGeometryResult; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_ENTRIES = 500;

  constructor(
    private readonly configService: ConfigService,
    private readonly mockProvider: MockLogisticsProvider,
  ) {
    const providerName = this.configService.get<string>('LOGISTICS_PROVIDER', 'mock').toLowerCase();
    if (providerName === 'mock') {
      this.adapter = this.mockProvider;
    } else {
      this.logger.warn(`Unknown provider '${providerName}', falling back to MockLogisticsProvider.`);
      this.adapter = this.mockProvider;
    }

    this.loadDistrictCoords();
  }

  private loadDistrictCoords() {
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const candidates = [
        path.resolve(currentDir, './data/district-coords.json'),
        path.resolve(process.cwd(), 'apps/api/src/logistics/data/district-coords.json'),
        path.resolve(process.cwd(), 'src/logistics/data/district-coords.json'),
      ];
      const foundPath = candidates.find((p) => fs.existsSync(p));
      if (foundPath) {
        const raw = fs.readFileSync(foundPath, 'utf-8');
        Object.assign(this.districtCoords, JSON.parse(raw));
        this.logger.log(`Loaded ${Object.keys(this.districtCoords).length} district coordinates.`);
      } else {
        this.logger.warn('district-coords.json not found in candidate paths.');
      }
    } catch (err: any) {
      this.logger.error('Failed to load district coordinates', err);
    }
  }

  /**
   * Resolve district name to [latitude, longitude] centroid
   */
  resolveCoordinates(district?: string): [number, number] | null {
    if (!district) return null;
    const clean = district.trim().toLowerCase();
    if (this.districtCoords[clean]) {
      return this.districtCoords[clean];
    }
    for (const [key, coords] of Object.entries(this.districtCoords)) {
      if (clean.includes(key) || key.includes(clean)) {
        return coords;
      }
    }
    return null;
  }

  get providerName(): string {
    return this.adapter.providerName;
  }

  getProviderName(): string {
    return this.adapter.providerName;
  }

  /**
   * Dispatch a shipment creation request to the active logistics provider adapter
   */
  async createShipment(payload: CreateShipmentPayload): Promise<ShipmentResult> {
    try {
      this.logger.log(`Dispatching shipment creation for order: ${payload.orderNumber}`);
      return await this.adapter.createShipment(payload);
    } catch (error) {
      if (error instanceof LogisticsProviderException) {
        this.logger.error(`Logistics provider failed to create shipment: ${error.message}`);
        throw new BadGatewayException(
          `Logistics provider failed: ${error.message}`,
        );
      }
      this.logger.error('Unexpected error during shipment creation', error);
      throw new BadGatewayException('Failed to create shipment with logistics carrier.');
    }
  }

  /**
   * Query the logistics carrier for latest shipment tracking and status
   */
  async getShipmentStatus(
    providerShipmentId: string,
    currentStatus?: ShipmentStatus,
  ): Promise<ShipmentStatusResult> {
    try {
      return await this.adapter.getShipmentStatus(providerShipmentId, currentStatus);
    } catch (error) {
      this.logger.error(`Failed to fetch shipment status for ${providerShipmentId}`, error);
      throw new BadGatewayException('Failed to retrieve shipment tracking from carrier.');
    }
  }

  /**
   * Request shipment cancellation from logistics provider
   */
  async cancelShipment(providerShipmentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      return await this.adapter.cancelShipment(providerShipmentId);
    } catch (error) {
      this.logger.error(`Failed to cancel shipment ${providerShipmentId}`, error);
      throw new BadGatewayException('Failed to cancel shipment with logistics carrier.');
    }
  }

  /**
   * Calculate distance, transit time, and freight cost estimate
   */
  async estimateLogistics(payload: EstimateLogisticsPayload): Promise<LogisticsEstimateResult> {
    try {
      return await this.adapter.estimateLogistics(payload);
    } catch (error) {
      this.logger.error('Failed to calculate logistics estimate', error);
      throw new BadGatewayException('Failed to calculate logistics estimate with carrier adapter.');
    }
  }

  findFarmerMandiLane(state: string, district: string, mandiIdOrOptionOrName: string) {
    if (this.adapter instanceof MockLogisticsProvider) {
      return this.adapter.findFarmerMandiLane(state, district, mandiIdOrOptionOrName);
    }
    return null;
  }

  findBuyerBulkLane(
    originState: string,
    originDistrict: string,
    destState: string,
    destCity?: string,
    destDistrict?: string,
  ) {
    if (this.adapter instanceof MockLogisticsProvider) {
      return this.adapter.findBuyerBulkLane(originState, originDistrict, destState, destCity, destDistrict);
    }
    return null;
  }

  /**
   * Controlled business mapping from platform ShipmentStatus to OrderStatus
   */
  mapShipmentStatusToOrderStatus(shipmentStatus: ShipmentStatus): OrderStatus | null {
    switch (shipmentStatus) {
      case ShipmentStatus.CREATED:
      case ShipmentStatus.PICKUP_PENDING:
      case ShipmentStatus.PICKED_UP:
        return OrderStatus.SHIPPED;
      case ShipmentStatus.IN_TRANSIT:
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return OrderStatus.IN_TRANSIT;
      case ShipmentStatus.DELIVERED:
        return OrderStatus.DELIVERED;
      case ShipmentStatus.CANCELLED:
        return OrderStatus.CANCELLED;
      default:
        return null;
    }
  }

  /**
   * Fetch transit corridor route with OSRM, 24h memory cache, and 7-point arc fallback
   */
  async getRoute(dto: GetRouteDto): Promise<RouteGeometryResult> {
    let originLat = dto.originLat;
    let originLon = dto.originLon;
    let destLat = dto.destLat;
    let destLon = dto.destLon;

    // Resolve origin from district/state if coordinates omitted
    if ((originLat == null || originLon == null) && dto.originDistrict) {
      const coords = this.resolveCoordinates(dto.originDistrict);
      if (coords) {
        originLat = coords[0];
        originLon = coords[1];
      }
    }

    // Resolve destination from district/city if coordinates omitted
    if ((destLat == null || destLon == null) && dto.destDistrict) {
      const coords = this.resolveCoordinates(dto.destDistrict);
      if (coords) {
        destLat = coords[0];
        destLon = coords[1];
      }
    }

    // Sensible Maharashtra agricultural corridor defaults if unresolvable
    if (originLat == null || originLon == null) {
      originLat = 20.1469; // Lasalgaon, Nashik
      originLon = 74.2264;
    }
    if (destLat == null || destLon == null) {
      destLat = 19.0771; // Vashi APMC Terminal, Navi Mumbai
      destLon = 72.9986;
    }

    const cacheKey = `${originLat.toFixed(3)},${originLon.toFixed(3)}->${destLat.toFixed(3)},${destLon.toFixed(3)}`;
    const cached = this.routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return { ...cached.data, source: 'cached' };
    }

    // Attempt OSRM public routing API with 3-second timeout
    try {
      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const payload = (await response.json()) as any;
        if (payload.routes && payload.routes.length > 0) {
          const route = payload.routes[0];
          const result: RouteGeometryResult = {
            geometry: route.geometry,
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            durationHours: Math.round((route.duration / 3600) * 10) / 10,
            source: 'osrm',
          };

          // Cache management with LRU eviction
          if (this.routeCache.size >= this.MAX_CACHE_ENTRIES) {
            const oldestKey = this.routeCache.keys().next().value;
            if (oldestKey) this.routeCache.delete(oldestKey);
          }
          this.routeCache.set(cacheKey, { data: result, timestamp: Date.now() });

          return result;
        }
      }
    } catch (err: any) {
      this.logger.warn(`OSRM routing unavailable (${err.message}). Using synthetic 7-point corridor fallback.`);
    }

    // Synthetic highway arc fallback
    return generate7PointFallbackRoute(originLat, originLon, destLat, destLon);
  }
}

