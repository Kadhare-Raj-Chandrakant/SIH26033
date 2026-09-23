'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchBuyerOrders } from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { RoleGuard } from '@/components/auth/role-guard';

export default function OrdersPage() {
  return (
    <RoleGuard allowedRoles={['BUYER']}>
      <OrdersPageContent />
    </RoleGuard>
  );
}

function OrdersPageContent() {
  const mounted = useIsMounted();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);

  const {
    data: ordersResponse,
    isLoading: ordersLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => fetchBuyerOrders({ page, limit: 10 }, token || undefined),
    enabled: mounted && isAuthenticated,
  });

  const ordersData = ordersResponse?.data;
  const orders = ordersData?.orders || [];
  const meta = ordersData?.meta;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FBF4E6] text-[#7A5B18] border border-[#E8DCBF]">
            Escrow Pending
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E8F0E2] text-[#233D22] border border-[#CCDBCB]">
            Confirmed & Funded
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FDF2F2] text-[#9B1C1C] border border-[#E5B5B5]">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F7F5EE] text-[#4E5446] border border-[#DFD8CB]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      <MarketplaceNavbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 pb-4 border-b border-[#DFD8CB]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#556448] block mb-1">
            Commercial Transactions
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B]">
            Buyer Trade Ledger & Purchase Contracts
          </h1>
          <p className="text-xs text-[#6B7260] mt-1">
            Track farmgate dispatches, weighbridge assay verification status, and historical procurement contracts.
          </p>
        </div>

        {/* Loading */}
        {(!mounted || authLoading || ordersLoading) && (
          <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
            <p className="text-sm font-serif font-bold text-[#1E221B]">
              Loading Purchase Contracts & Trade Ledger...
            </p>
          </div>
        )}

        {/* Error */}
        {isError && !ordersLoading && (
          <div className="p-8 text-center border border-[#E5B5B5] rounded-lg bg-[#FDF2F2]">
            <h3 className="font-serif font-bold text-base text-[#9B1C1C]">Failed to Load Orders</h3>
            <p className="text-xs text-[#771D1D] mt-1">{(error as Error)?.message}</p>
          </div>
        )}

        {/* Empty */}
        {!ordersLoading && !isError && orders.length === 0 && (
          <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
            <h2 className="text-xl font-serif font-bold text-[#1E221B]">No Trade Contracts Found</h2>
            <p className="mt-2 text-xs text-[#6B7260] max-w-sm mx-auto leading-relaxed">
              You have not confirmed any agricultural trade contracts yet. Browse the live marketplace to reserve crop batches directly.
            </p>
            <Link href="/marketplace" className="inline-block mt-5">
              <button className="h-10 px-5 text-xs font-bold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2] rounded">
                Browse Marketplace Listings
              </button>
            </Link>
          </div>
        )}

        {/* Orders List */}
        {!ordersLoading && !isError && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-5 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ECE5D8]">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-[#7A8070]">
                      Contract Ref: {order.orderNumber || order.id}
                    </span>
                    <p className="text-xs text-[#5D6352]">
                      Date: {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                    <span className="text-base font-serif font-bold text-[#1E221B]">
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Items in order */}
                <div className="py-3 divide-y divide-[#ECE5D8] text-xs">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#1E221B]">
                          {item.productName || 'Produce Lot'}
                        </span>
                        <span className="text-[#6B7260] block text-[11px]">
                          {item.quantity} {item.unit?.toLowerCase() || 'qtl'} @ ₹{item.unitPrice}/unit
                        </span>
                      </div>
                      <span className="font-semibold text-[#1E221B]">
                        ₹{item.totalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#ECE5D8] flex items-center justify-between text-xs">
                  <span className="text-[#6B7260]">
                    Destination: {order.shippingAddressSnapshot?.city || 'Regional Hub'}, {order.shippingAddressSnapshot?.state || 'India'}
                  </span>
                  <Link href={`/orders/${order.id}`}>
                    <button className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider border border-[#233D22] text-[#233D22] rounded hover:bg-[#EAE4D6]">
                      View Contract Details →
                    </button>
                  </Link>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 text-xs text-[#6B7260]">
                <span>Page {page} of {meta.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 border border-[#DFD8CB] bg-[#FFFFFF] rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                    disabled={page >= meta.totalPages}
                    className="px-3 py-1 border border-[#DFD8CB] bg-[#FFFFFF] rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DFD8CB] bg-[#FAF8F2] py-8 text-center text-xs text-[#6B7260]">
        <div className="max-w-7xl mx-auto px-4">
          <p>Aroha Agricultural Marketplace Buyer Trade Ledger & Escrow Contracts</p>
        </div>
      </footer>
    </div>
  );
}
