'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchCart } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';

export function MarketplaceNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useIsMounted();
  const { isAuthenticated, user, token, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isBuyer = mounted && isAuthenticated && user?.role === 'BUYER';
  const isFarmer = mounted && isAuthenticated && user?.role === 'FARMER';
  const isFpo = mounted && isAuthenticated && user?.role === 'FPO';
  const isAdmin = mounted && isAuthenticated && user?.role === 'ADMIN';
  const isVisitor = mounted && !isAuthenticated;

  const { data: cartResponse } = useQuery({
    queryKey: ['cart', token],
    queryFn: () => fetchCart(token || undefined),
    enabled: isBuyer && !!token,
    staleTime: 5000,
  });

  const cartItemCount = (isBuyer && cartResponse?.data?.itemCount) || 0;

  const handleSearchClick = () => {
    const input = document.getElementById('marketplace-search-input') as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      router.push('/marketplace');
    }
  };

  const isLinkActive = (path: string) => {
    if (path === '/marketplace') return pathname === '/marketplace';
    return pathname?.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#DFD8CB] bg-[#F7F5EE]">
      {/* Top Banner Notice */}
      <div className="border-b border-[#E0D9CB] bg-[#EDE7DA] px-4 py-1.5 text-xs text-[#4E5246] text-center font-medium">
        <span>Aroha National Agricultural Marketplace: Integrating 50,000+ Verified Farmers, FPOs, and Institutional Buyers across India</span>
      </div>

      <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#233D22] flex items-center justify-center text-[#F7F5EE]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z" fill="#2E4221" opacity="0.3"/>
                <path d="M12 22V12" />
                <path d="M12 12c0-4 3-7 7-7" />
                <path d="M12 15c-3 0-5-2-5-5 0-3 3-5 5-5" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-serif font-bold tracking-tight text-[#1E221B]">Aroha</span>
              <span className="block text-[10px] tracking-wider uppercase text-[#6B7060] font-sans font-semibold">Agricultural Exchange</span>
            </div>
          </Link>

          {/* Desktop Navigation Links — Role Partitioned */}
          <nav className="hidden items-center gap-5 md:flex text-sm font-medium text-[#3E4336]">
            {/* 1. Logged-out Visitor */}
            {isVisitor && (
              <>
                <Link
                  href="/marketplace"
                  className={`transition-colors ${
                    isLinkActive('/marketplace')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Marketplace
                </Link>
                <Link
                  href="/categories"
                  className={`transition-colors ${
                    isLinkActive('/categories')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Categories
                </Link>
                <Link
                  href="/fpo"
                  className={`transition-colors ${
                    isLinkActive('/fpo')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  FPO Directory
                </Link>
              </>
            )}

            {/* 2. Buyer Navigation */}
            {isBuyer && (
              <>
                <Link
                  href="/marketplace"
                  className={`transition-colors ${
                    isLinkActive('/marketplace')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Marketplace
                </Link>
                <Link
                  href="/marketplace/sourcing"
                  className={`transition-colors ${
                    isLinkActive('/marketplace/sourcing')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Bulk Sourcing
                </Link>
                <Link
                  href="/fpo"
                  className={`transition-colors ${
                    pathname === '/fpo'
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  FPO Directory
                </Link>
                <Link
                  href="/orders"
                  className={`transition-colors ${
                    isLinkActive('/orders')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  My Orders
                </Link>
              </>
            )}

            {/* 3. Farmer Navigation */}
            {isFarmer && (
              <>
                <Link
                  href="/seller/products"
                  className={`transition-colors ${
                    isLinkActive('/seller/products')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  My Direct Listings
                </Link>
                <Link
                  href="/seller/orders"
                  className={`transition-colors ${
                    isLinkActive('/seller/orders')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Fulfillment
                </Link>
                <Link
                  href="/fpo/commit"
                  className={`transition-colors ${
                    isLinkActive('/fpo/commit')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Commit Produce
                </Link>
                <Link
                  href="/seller/intelligence"
                  className={`transition-colors ${
                    isLinkActive('/seller/intelligence')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Mandi Intelligence
                </Link>
                <Link
                  href="/fpo"
                  className={`transition-colors ${
                    pathname === '/fpo'
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  FPO Directory
                </Link>
              </>
            )}

            {/* 4. FPO Navigation */}
            {isFpo && (
              <>
                <Link
                  href="/fpo/dashboard"
                  className={`transition-colors ${
                    isLinkActive('/fpo/dashboard')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  FPO Dashboard
                </Link>
                <Link
                  href="/fpo/dashboard/listings"
                  className={`transition-colors ${
                    isLinkActive('/fpo/dashboard/listings')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Batch Listings
                </Link>
                <Link
                  href="/seller/orders"
                  className={`transition-colors ${
                    isLinkActive('/seller/orders')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Orders
                </Link>
                <Link
                  href="/seller/intelligence"
                  className={`transition-colors ${
                    isLinkActive('/seller/intelligence')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Mandi Intelligence
                </Link>
                <Link
                  href="/marketplace"
                  className={`transition-colors ${
                    isLinkActive('/marketplace')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Marketplace
                </Link>
              </>
            )}

            {/* 5. Admin Navigation */}
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className={`transition-colors ${
                    pathname === '/admin'
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  href="/admin/fpo"
                  className={`transition-colors ${
                    isLinkActive('/admin/fpo')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  FPO Verifications
                </Link>
                <Link
                  href="/admin/orders"
                  className={`transition-colors ${
                    isLinkActive('/admin/orders')
                      ? 'text-[#1E221B] font-bold pb-1 border-b-2 border-[#233D22]'
                      : 'hover:text-[#1E221B]'
                  }`}
                >
                  Dispatches
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Right Side Header Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Search Button */}
          <button
            onClick={handleSearchClick}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium text-[#484E40] border border-[#DFD8CB] bg-[#FFFFFF] rounded-md hover:bg-[#F2EFE7]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span>Search Crops</span>
          </button>

          {/* Visitor Actions */}
          {isVisitor && (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <button suppressHydrationWarning className="h-9 px-4 text-xs font-semibold uppercase tracking-wider text-[#233D22] border border-[#C8C0AF] rounded-md hover:bg-[#EAE4D6]">
                  Sign In
                </button>
              </Link>
              <Link href="/register">
                <button suppressHydrationWarning className="h-9 px-4 text-xs font-semibold uppercase tracking-wider bg-[#233D22] text-[#F7F5EE] rounded-md hover:bg-[#1C321B]">
                  Register
                </button>
              </Link>
            </div>
          )}

          {/* Buyer Actions */}
          {isBuyer && (
            <div className="flex items-center gap-2.5">
              <Link href="/cart">
                <button className="relative flex items-center gap-1.5 h-9 px-3.5 bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] text-xs font-semibold rounded-md">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  <span>Cart</span>
                  {cartItemCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#BD8728] text-[10px] font-bold text-[#1E221B]">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              </Link>

              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DFD8CB] bg-[#FFFFFF] text-xs text-[#283C22]">
                <span className="font-bold text-[10px] uppercase bg-[#E2EDE2] text-[#233D22] px-1.5 py-0.5 rounded">
                  Buyer
                </span>
                <span className="font-medium truncate max-w-[130px]">{(user as any)?.name || user?.email}</span>
              </div>

              <button
                onClick={logout}
                className="h-9 px-2.5 text-xs text-[#6B7260] hover:text-[#1E221B]"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Farmer Actions */}
          {isFarmer && (
            <div className="flex items-center gap-2.5">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DFD8CB] bg-[#FFFFFF] text-xs text-[#283C22]">
                <span className="font-bold text-[10px] uppercase bg-[#EAE4D6] text-[#634914] px-1.5 py-0.5 rounded">
                  Farmer
                </span>
                <span className="font-medium truncate max-w-[130px]">{(user as any)?.name || user?.email}</span>
              </div>

              <button
                onClick={logout}
                className="h-9 px-2.5 text-xs text-[#6B7260] hover:text-[#1E221B]"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* FPO Actions */}
          {isFpo && (
            <div className="flex items-center gap-2.5">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DFD8CB] bg-[#FFFFFF] text-xs text-[#283C22]">
                <span className="font-bold text-[10px] uppercase bg-[#E2EDE2] text-[#233D22] px-1.5 py-0.5 rounded">
                  FPO Admin
                </span>
                <span className="font-medium truncate max-w-[130px]">{(user as any)?.name || user?.email}</span>
              </div>

              <button
                onClick={logout}
                className="h-9 px-2.5 text-xs text-[#6B7260] hover:text-[#1E221B]"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex items-center gap-2.5">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DFD8CB] bg-[#FFFFFF] text-xs text-[#283C22]">
                <span className="font-bold text-[10px] uppercase bg-[#DFD8CB] text-[#1E221B] px-1.5 py-0.5 rounded">
                  Admin
                </span>
                <span className="font-medium truncate max-w-[130px]">{user?.email}</span>
              </div>

              <button
                onClick={logout}
                className="h-9 px-2.5 text-xs text-[#6B7260] hover:text-[#1E221B]"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#2A3521] border border-[#DFD8CB] rounded-md"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#DFD8CB] bg-[#F7F5EE] px-4 py-4 space-y-2 text-sm">
          <Link href="/marketplace" className="block py-1 font-medium">Marketplace</Link>
          <Link href="/categories" className="block py-1 font-medium">Categories</Link>
          <Link href="/fpo" className="block py-1 font-medium">FPO Directory</Link>
          {(isFarmer || isFpo || isAdmin) && <Link href="/seller/intelligence" className="block py-1 font-medium">Mandi Intelligence</Link>}
          {isBuyer && <Link href="/orders" className="block py-1 font-medium">My Orders</Link>}
          {isFarmer && <Link href="/seller/orders" className="block py-1 font-medium">Fulfillment</Link>}
          {isFpo && <Link href="/fpo/dashboard" className="block py-1 font-medium">FPO Dashboard</Link>}
          {isAdmin && <Link href="/admin" className="block py-1 font-medium">Admin Overview</Link>}

          <div className="pt-2 border-t border-[#DFD8CB]">
            {isVisitor ? (
              <div className="flex gap-2">
                <Link href="/login" className="flex-1">
                  <button suppressHydrationWarning className="w-full py-2 text-xs font-semibold uppercase border border-[#C8C0AF] rounded-md">Sign In</button>
                </Link>
                <Link href="/register" className="flex-1">
                  <button suppressHydrationWarning className="w-full py-2 text-xs font-semibold uppercase bg-[#233D22] text-[#F7F5EE] rounded-md">Register</button>
                </Link>
              </div>
            ) : (
              <button
                onClick={logout}
                className="w-full py-2 text-xs font-semibold uppercase border border-[#C8C0AF] text-[#6B7260] rounded-md"
              >
                Sign Out ({user?.role})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
