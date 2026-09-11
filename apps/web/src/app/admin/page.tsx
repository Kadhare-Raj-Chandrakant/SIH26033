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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
          <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data || !data.users) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center max-w-lg mx-auto mt-12">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-200 mb-2">Error Loading Dashboard</h2>
        <p className="text-sm text-slate-400 mb-5">
          {error instanceof Error ? error.message : 'Data could not be retrieved'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Operational Dashboard</h1>
          <p className="text-xs text-slate-400">Live database aggregations & moderation queues</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium inline-flex items-center gap-2 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Users KPI */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Registered Users</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-slate-100">{data.users.total}</span>
            <span className="text-xs text-emerald-400 font-medium">
              {data.users.active} Active
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Farmers</span>
              <span className="font-semibold text-slate-300">{data.users.farmers}</span>
            </div>
            <div>
              <span className="text-slate-500 block">FPOs</span>
              <span className="font-semibold text-slate-300">{data.users.fpos}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Buyers</span>
              <span className="font-semibold text-slate-300">{data.users.buyers}</span>
            </div>
          </div>
        </div>

        {/* Marketplace Products KPI */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Marketplace Listings</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-slate-100">{data.marketplace.totalProducts}</span>
            <span className="text-xs text-emerald-400 font-medium">{data.marketplace.active} Live</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Out of Stock</span>
              <span className="font-semibold text-amber-400">{data.marketplace.outOfStock}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Rejected</span>
              <span className="font-semibold text-red-400">{data.marketplace.rejected}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Verified Sellers</span>
              <span className="font-semibold text-emerald-400">{data.marketplace.verifiedSellers}</span>
            </div>
          </div>
        </div>

        {/* Orders & Volume KPI */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Orders & Volume</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-slate-100">{data.orders.total}</span>
            <span className="text-xs text-slate-400">
              ₹{data.orders.totalVolume.toLocaleString('en-IN')} GMV
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Pending</span>
              <span className="font-semibold text-amber-400">{data.orders.byStatus['PENDING'] || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Shipped</span>
              <span className="font-semibold text-blue-400">{data.orders.byStatus['SHIPPED'] || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Delivered</span>
              <span className="font-semibold text-emerald-400">{data.orders.byStatus['DELIVERED'] || 0}</span>
            </div>
          </div>
        </div>

        {/* Payments KPI */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Settled Payments</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-slate-100">
              ₹{data.payments.totalSettledAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-400">
              {data.payments.byStatus['COMPLETED'] || 0} completed
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Pending</span>
              <span className="font-semibold text-amber-400">{data.payments.byStatus['PENDING'] || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Failed</span>
              <span className="font-semibold text-red-400">{data.payments.byStatus['FAILED'] || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Refunded</span>
              <span className="font-semibold text-slate-400">{data.payments.byStatus['REFUNDED'] || 0}</span>
            </div>
          </div>
        </div>

        {/* Logistics KPI */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current Logistics Status</span>
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-slate-100">
              {data.logistics.byStatus['IN_TRANSIT'] || 0}
            </span>
            <span className="text-xs text-slate-400">of {data.logistics.totalShipments} total</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Created</span>
              <span className="font-semibold text-slate-300">{data.logistics.byStatus['CREATED'] || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Delivered</span>
              <span className="font-semibold text-emerald-400">{data.logistics.byStatus['DELIVERED'] || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Failed</span>
              <span className="font-semibold text-red-400">{data.logistics.byStatus['FAILED'] || 0}</span>
            </div>
          </div>
        </div>

        {/* Moderation Queue Alert KPI */}
        <div className="p-5 bg-amber-950/20 border border-amber-800/40 rounded-xl hover:border-amber-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Pending Moderation</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-amber-300">{data.moderation.pendingReports}</span>
            <span className="text-xs text-amber-400 font-medium">reports require review</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-amber-900/40 text-[11px]">
            <span className="text-amber-200/80">
              {data.moderation.rejectedProducts} rejected listings
            </span>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
            >
              Open Queue
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Administrative Audit Activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-200">Recent Privileged Activity</h2>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
          >
            View Full Audit Trail
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-800/80">
          {data.recentActivity && data.recentActivity.length > 0 ? (
            data.recentActivity.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {log.action}
                  </span>
                  <div>
                    <span className="text-xs font-medium text-slate-200">
                      {log.entityType} ID: {log.entityId}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Actor: {log.actor?.email || log.actorUserId || 'Admin'}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">
                  {new Date(log.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">No recent administrative mutations logged.</div>
          )}
        </div>
      </div>
    </div>
  );
}
