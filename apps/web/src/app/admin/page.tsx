'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  Truck,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Clock,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { fetchAdminDashboard } from '@/lib/api';

export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const mounted = useIsMounted();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => fetchAdminDashboard(token || undefined),
    enabled: mounted && !!token && user?.role === 'ADMIN',
  });

  if (isLoading) {
    return (
      <div className="p-10 border border-[#DFD8CB] rounded-md bg-[#FCFAF6] text-center space-y-3">
        <div className="inline-block h-6 w-6 border-2 border-[#233D22] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#1E221B]">Loading operational metrics and database ledgers...</p>
      </div>
    );
  }

  if (isError || !data || !data.users) {
    return (
      <div className="p-8 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md text-center max-w-lg mx-auto mt-12 space-y-3">
        <AlertTriangle className="w-8 h-8 text-[#BD8728] mx-auto" />
        <h2 className="text-base font-serif font-bold text-[#1E221B]">Error Retrieving Administrative Ledger</h2>
        <p className="text-xs text-[#5D6352]">
          {error instanceof Error ? error.message : 'Database metrics could not be aggregated.'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] rounded text-xs font-semibold inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header with Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B]">Operational Governance Console</h1>
          <p className="text-xs text-[#5D6352] mt-0.5">Live database aggregations, liquidity tracking, and settlement audit logs</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-3.5 py-1.5 bg-[#FCFAF6] hover:bg-[#EFE9DC] border border-[#DFD8CB] text-[#1E221B] rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>{isFetching ? 'Synchronizing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* KPI Cards Grid (4 columns layout avoiding 3-card AI slop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users KPI */}
        <div className="p-4 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D6352]">Registered Users</span>
            <div className="p-1.5 bg-[#F4F0E6] text-[#233D22] rounded border border-[#DFD8CB]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-serif font-bold text-[#1E221B]">{data.users.total}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#233D22]/10 text-[#233D22]">
              {data.users.active} Active
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#DFD8CB] text-[10px]">
            <div>
              <span className="text-[#5D6352] block">Farmers</span>
              <span className="font-bold text-[#1E221B]">{data.users.farmers}</span>
            </div>
            <div>
              <span className="text-[#5D6352] block">FPOs</span>
              <span className="font-bold text-[#1E221B]">{data.users.fpos}</span>
            </div>
            <div>
              <span className="text-[#5D6352] block">Buyers</span>
              <span className="font-bold text-[#1E221B]">{data.users.buyers}</span>
            </div>
          </div>
        </div>

        {/* Marketplace Listings KPI */}
        <div className="p-4 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D6352]">Trade Listings</span>
            <div className="p-1.5 bg-[#F4F0E6] text-[#233D22] rounded border border-[#DFD8CB]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-serif font-bold text-[#1E221B]">{data.marketplace.totalProducts}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#233D22]/10 text-[#233D22]">
              {data.marketplace.active} Live
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#DFD8CB] text-[10px]">
            <div>
              <span className="text-[#5D6352] block">Out of Stock</span>
              <span className="font-bold text-[#BD8728]">{data.marketplace.outOfStock}</span>
            </div>
            <div>
              <span className="text-[#5D6352] block">Rejected</span>
              <span className="font-bold text-[#9A3412]">{data.marketplace.rejected}</span>
            </div>
            <div>
              <span className="text-[#5D6352] block">Verified</span>
              <span className="font-bold text-[#233D22]">{data.marketplace.verifiedSellers}</span>
            </div>
          </div>
        </div>

        {/* Orders & Volume KPI */}
        <div className="p-4 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D6352]">Order Trade Volume</span>
            <div className="p-1.5 bg-[#F4F0E6] text-[#233D22] rounded border border-[#DFD8CB]">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-serif font-bold text-[#1E221B]">{data.orders.total}</span>
            <span className="text-[11px] font-bold text-[#233D22]">
              ₹{data.orders.totalVolume.toLocaleString('en-IN')} GMV
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#DFD8CB] text-[10px]">
            <div>
              <span className="text-[#5D6352] block">Pending</span>
              <span className="font-bold text-[#BD8728]">{data.orders.byStatus['PENDING'] || 0}</span>
            </div>
            <div>
              <span className="text-[#5D6352] block">Shipped</span>
              <span className="font-bold text-[#1E221B]">{data.orders.byStatus['SHIPPED'] || 0}</span>
            </div>
            <div>
              <span className="text-[#5D6352] block">Delivered</span>
              <span className="font-bold text-[#233D22]">{data.orders.byStatus['DELIVERED'] || 0}</span>
            </div>
          </div>
        </div>

        {/* Payments KPI */}
        <div className="p-4 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D6352]">Settlement Escrow</span>
            <div className="p-1.5 bg-[#F4F0E6] text-[#233D22] rounded border border-[#DFD8CB]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-serif font-bold text-[#1E221B]">
              ₹{data.payments.totalSettledAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#DFD8CB] text-[10px]">
            <div>
              <span className="text-[#5D6352] block">Completed</span>
              <span className="font-bold text-[#233D22]">{data.payments.byStatus['COMPLETED'] || 0}</span>
            </div>
            <div>
              <span className="text-[#5D6352] block">Pending</span>
              <span className="font-bold text-[#BD8728]">{data.payments.byStatus['PENDING'] || 0}</span>
            </div>
            <div>
              <span className="text-[#5D6352] block">Refunded</span>
              <span className="font-bold text-[#5D6352]">{data.payments.byStatus['REFUNDED'] || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operations & Queue Panels (2 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Logistics Panel */}
        <div className="p-5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md space-y-3">
          <div className="flex items-center justify-between border-b border-[#DFD8CB] pb-2.5">
            <span className="text-xs font-serif font-bold text-[#1E221B] flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#233D22]" />
              <span>Logistics & Freight Telematics</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D6352]">
              {data.logistics.totalShipments} Total Consignments
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded bg-[#F4F0E6] border border-[#DFD8CB]">
              <span className="text-[10px] text-[#5D6352] uppercase font-bold block">Created</span>
              <span className="text-base font-bold text-[#1E221B]">{data.logistics.byStatus['CREATED'] || 0}</span>
            </div>
            <div className="p-2.5 rounded bg-[#F4F0E6] border border-[#DFD8CB]">
              <span className="text-[10px] text-[#5D6352] uppercase font-bold block">In Transit</span>
              <span className="text-base font-bold text-[#BD8728]">{data.logistics.byStatus['IN_TRANSIT'] || 0}</span>
            </div>
            <div className="p-2.5 rounded bg-[#F4F0E6] border border-[#DFD8CB]">
              <span className="text-[10px] text-[#5D6352] uppercase font-bold block">Delivered</span>
              <span className="text-base font-bold text-[#233D22]">{data.logistics.byStatus['DELIVERED'] || 0}</span>
            </div>
            <div className="p-2.5 rounded bg-[#F4F0E6] border border-[#DFD8CB]">
              <span className="text-[10px] text-[#5D6352] uppercase font-bold block">Exceptions</span>
              <span className="text-base font-bold text-[#9A3412]">{data.logistics.byStatus['FAILED'] || 0}</span>
            </div>
          </div>
        </div>

        {/* Moderation Queue Alert Panel */}
        <div className="p-5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md space-y-3">
          <div className="flex items-center justify-between border-b border-[#DFD8CB] pb-2.5">
            <span className="text-xs font-serif font-bold text-[#1E221B] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#BD8728]" />
              <span>Moderation & Dispute Queue</span>
            </span>
            <Link
              href="/admin/reports"
              className="text-[11px] font-bold text-[#233D22] hover:underline inline-flex items-center gap-1"
            >
              <span>Open Queue</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded bg-[#F4F0E6] border border-[#DFD8CB]">
              <span className="text-[10px] text-[#5D6352] uppercase font-bold block">Pending Buyer Reports</span>
              <span className="text-lg font-bold text-[#BD8728]">{data.moderation.pendingReports}</span>
            </div>
            <div className="p-3 rounded bg-[#F4F0E6] border border-[#DFD8CB]">
              <span className="text-[10px] text-[#5D6352] uppercase font-bold block">Rejected Lot Filings</span>
              <span className="text-lg font-bold text-[#9A3412]">{data.moderation.rejectedProducts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Administrative Audit Activity */}
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#DFD8CB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#233D22]" />
            <h2 className="text-xs font-serif font-bold text-[#1E221B]">Privileged Governance Ledger</h2>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-bold text-[#233D22] hover:underline inline-flex items-center gap-1"
          >
            <span>Full Audit Trail</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-[#DFD8CB]">
          {data.recentActivity && data.recentActivity.length > 0 ? (
            data.recentActivity.map((log) => (
              <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F4F0E6]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F4F0E6] text-[#233D22] border border-[#DFD8CB]">
                    {log.action}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-[#1E221B]">
                      {log.entityType} ID: {log.entityId}
                    </span>
                    <span className="block text-[11px] text-[#5D6352]">
                      Actor: {log.actor?.email || log.actorUserId || 'Administrator'}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-[#5D6352] shrink-0 font-mono">
                  {new Date(log.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-[#5D6352]">No recent administrative mutations recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
}
