'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchCart } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import {
  Search,
  ShoppingCart,
  User,
  LogOut,
  Menu,
  X,
  Store,
  TrendingUp,
  Building2,
  Truck,
  PlusCircle,
  Users,
  Layers,
  Package,
  ShieldCheck,
  FileText,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { LanguageSelector } from './language-selector';

export function MarketplaceNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useIsMounted();
  const { isAuthenticated, user, token, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [topSearch, setTopSearch] = useState('');

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

  const handleTopSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = topSearch.trim();
    if (query) {
      router.push(`/marketplace?search=${encodeURIComponent(query)}`);
    } else {
      router.push('/marketplace');
    }
  };

  const isLinkActive = (path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/marketplace') return pathname === '/marketplace';
    return pathname?.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#DFD8CB] bg-[#F7F5EE] shadow-xs">
      {/* Top Banner Notice */}
      <div className="border-b border-[#E0D9CB] bg-[#EDE7DA] px-4 py-1 text-xs text-[#4E5246] text-center font-medium">
        <span>Aroha National Agricultural Marketplace: Integrating 50,000+ Verified Farmers, FPOs, and Institutional Buyers across India</span>
      </div>

      {/* TIER 1: PRIMARY PLATFORM HEADER */}
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Universal Navigation */}
        <div className="flex items-center gap-6 2xl:gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-md bg-[#233D22] flex items-center justify-center text-[#F7F5EE] shadow-xs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z" fill="#2E4221" opacity="0.3"/>
                <path d="M12 22V12" />
                <path d="M12 12c0-4 3-7 7-7" />
                <path d="M12 15c-3 0-5-2-5-5 0-3 3-5 5-5" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-serif font-bold tracking-tight text-[#1E221B] leading-none">Aroha</span>
              <span className="block text-[9px] tracking-wider uppercase text-[#6B7060] font-sans font-semibold">Agricultural Exchange</span>
            </div>
          </Link>

          {/* Universal Main Navigation Links - Visible on XL+ screens to prevent collision with Search */}
          <nav className="hidden xl:flex items-center gap-4 2xl:gap-6 text-xs font-semibold uppercase tracking-wider text-[#4E5246] shrink-0">
            <Link
              href="/marketplace"
              className={`transition-colors py-1 whitespace-nowrap ${
                pathname === '/marketplace' || pathname?.startsWith('/marketplace/products')
                  ? 'text-[#233D22] font-bold border-b-2 border-[#233D22]'
                  : 'hover:text-[#1E221B]'
              }`}
            >
              Marketplace
            </Link>
            <Link
              href="/seller/intelligence"
              className={`transition-colors py-1 whitespace-nowrap ${
                pathname === '/seller/intelligence'
                  ? 'text-[#233D22] font-bold border-b-2 border-[#233D22]'
                  : 'hover:text-[#1E221B]'
              }`}
            >
              Mandi Intelligence
            </Link>
            <Link
              href="/fpo"
              className={`transition-colors py-1 whitespace-nowrap ${
                pathname === '/fpo' || (pathname?.startsWith('/fpo/') && !pathname?.startsWith('/fpo/dashboard'))
                  ? 'text-[#233D22] font-bold border-b-2 border-[#233D22]'
                  : 'hover:text-[#1E221B]'
              }`}
            >
              FPO Network
            </Link>
            <Link
              href="/orders"
              className={`transition-colors py-1 whitespace-nowrap ${
                pathname === '/orders' || pathname?.startsWith('/orders/')
                  ? 'text-[#233D22] font-bold border-b-2 border-[#233D22]'
                  : 'hover:text-[#1E221B]'
              }`}
            >
              Logistics Tracking
            </Link>
          </nav>
        </div>

        {/* Right Side Header Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Functional Top Crop Search Form */}
          <form onSubmit={handleTopSearchSubmit} className="hidden sm:flex items-center relative">
            <Search className="w-3.5 h-3.5 text-[#6B7060] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              placeholder="Search crops (e.g. Basmati, Wheat)..."
              className="h-8 pl-8 pr-7 w-32 md:w-40 xl:w-48 2xl:w-56 focus-within:w-44 xl:focus-within:w-56 2xl:focus-within:w-64 text-xs bg-[#FFFFFF] border border-[#DFD8CB] rounded-md text-[#1E221B] placeholder-[#8A8F7E] focus:outline-hidden focus:border-[#233D22] focus:ring-1 focus:ring-[#233D22] transition-all duration-200"
            />
            {topSearch && (
              <button
                type="button"
                onClick={() => setTopSearch('')}
                className="absolute right-2 text-[#8A8F7E] hover:text-[#1E221B]"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Regional Farmer Language Selector */}
          <LanguageSelector variant="navbar" />

          {/* Visitor Auth Buttons */}
          {isVisitor && (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <button suppressHydrationWarning className="h-8 px-3.5 text-xs font-semibold uppercase tracking-wider text-[#233D22] border border-[#C8C0AF] rounded-md hover:bg-[#EAE4D6] transition-colors">
                  Sign In
                </button>
              </Link>
              <Link href="/register">
                <button suppressHydrationWarning className="h-8 px-3.5 text-xs font-semibold uppercase tracking-wider bg-[#233D22] text-[#F7F5EE] rounded-md hover:bg-[#1C321B] transition-colors">
                  Register
                </button>
              </Link>
            </div>
          )}

          {/* Buyer Header Controls */}
          {isBuyer && (
            <div className="flex items-center gap-2.5">
              <Link href="/cart">
                <button className="relative flex items-center gap-1.5 h-8 px-3 bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] text-xs font-semibold rounded-md transition-colors shadow-2xs">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Cart</span>
                  {cartItemCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#BD8728] text-[10px] font-bold text-[#1E221B]">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              </Link>

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DFD8CB] bg-[#FFFFFF] text-xs text-[#283C22]">
                <span className="font-bold text-[9px] uppercase bg-[#E2EDE2] text-[#233D22] px-1.5 py-0.5 rounded">
                  Buyer
                </span>
                <span className="font-medium truncate max-w-30">{(user as any)?.name || user?.email}</span>
              </div>

              <button
                onClick={logout}
                className="h-8 px-2 text-xs text-[#6B7260] hover:text-[#1E221B] transition-colors"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Farmer Header Controls */}
          {isFarmer && (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DFD8CB] bg-[#FFFFFF] text-xs text-[#283C22]">
                <span className="font-bold text-[9px] uppercase bg-[#EAE4D6] text-[#634914] px-1.5 py-0.5 rounded">
                  Farmer
                </span>
                <span className="font-medium truncate max-w-30">{(user as any)?.name || user?.email}</span>
              </div>

              <button
                onClick={logout}
                className="h-8 px-2 text-xs text-[#6B7260] hover:text-[#1E221B] transition-colors"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* FPO Header Controls */}
          {isFpo && (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DFD8CB] bg-[#FFFFFF] text-xs text-[#283C22]">
                <span className="font-bold text-[9px] uppercase bg-[#E2EDE2] text-[#233D22] px-1.5 py-0.5 rounded">
                  FPO Admin
                </span>
                <span className="font-medium truncate max-w-30">{(user as any)?.name || user?.email}</span>
              </div>

              <button
                onClick={logout}
                className="h-8 px-2 text-xs text-[#6B7260] hover:text-[#1E221B] transition-colors"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Admin Header Controls */}
          {isAdmin && (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#DFD8CB] bg-[#FFFFFF] text-xs text-[#283C22]">
                <span className="font-bold text-[9px] uppercase bg-[#DFD8CB] text-[#1E221B] px-1.5 py-0.5 rounded">
                  Admin
                </span>
                <span className="font-medium truncate max-w-30">{user?.email}</span>
              </div>

              <button
                onClick={logout}
                className="h-8 px-2 text-xs text-[#6B7260] hover:text-[#1E221B] transition-colors"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-1.5 text-[#2A3521] border border-[#DFD8CB] rounded-md hover:bg-[#EAE4D6] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* TIER 2: ROLE-BASED DUAL SUB-NAVIGATION BAR (CLEAN CONTEXT) */}
      <div className="border-t border-[#DFD8CB] bg-[#EFE9DD] px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 py-1.5 overflow-x-auto scrollbar-none">
          
          {/* Left: Universal Back Navigation + Context Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {pathname !== '/' && (
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#C8C0AF] bg-[#FFFFFF] hover:bg-[#EAE4D6] text-[#233D22] text-xs font-semibold tracking-wide transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                title="Go back to previous page"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#233D22]" />
                <span>Back</span>
              </button>
            )}

            {isBuyer && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#233D22] text-[#FAF8F2] text-[10px] font-bold uppercase tracking-wider">
                <Store className="w-3 h-3 text-[#A8C6A5]" />
                Buyer Procurement
              </span>
            )}
            {isFarmer && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3B532B] text-[#FAF8F2] text-[10px] font-bold uppercase tracking-wider">
                <PlusCircle className="w-3 h-3 text-[#D5E6CA]" />
                Farmer Producer Portal
              </span>
            )}
            {isFpo && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#183B1E] text-[#FAF8F2] text-[10px] font-bold uppercase tracking-wider">
                <Building2 className="w-3 h-3 text-[#A8C6A5]" />
                FPO Federation Hub
              </span>
            )}
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1E221B] text-[#FAF8F2] text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-[#C8C0AF]" />
                Platform Governance
              </span>
            )}
            {isVisitor && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DFD8CB] text-[#3B4232] text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-[#233D22]" />
                Explore By Role
              </span>
            )}
          </div>

          {/* Right: Generic, Friendly Action Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2 shrink-0 text-xs font-medium">
            
            {/* 1. VISITOR TABS */}
            {isVisitor && (
              <>
                <Link
                  href="/marketplace"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/marketplace')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Buy Produce</span>
                </Link>
                <Link
                  href="/seller/products"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/seller/products')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Sell Harvest</span>
                </Link>
                <Link
                  href="/fpo"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    pathname === '/fpo'
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>FPO Directory</span>
                </Link>
                <Link
                  href="/orders"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/orders')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Track Freight</span>
                </Link>
              </>
            )}

            {/* 2. BUYER TABS */}
            {isBuyer && (
              <>
                <Link
                  href="/marketplace"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    pathname === '/marketplace' || pathname?.startsWith('/marketplace/products')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Browse Crop Lots</span>
                </Link>
                <Link
                  href="/marketplace/sourcing"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/marketplace/sourcing')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Bulk Sourcing (RFQ)</span>
                </Link>
                <Link
                  href="/orders"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/orders')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>My Orders & Tracking</span>
                </Link>
                <Link
                  href="/fpo"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    pathname === '/fpo'
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Verified FPOs</span>
                </Link>
              </>
            )}

            {/* 3. FARMER TABS */}
            {isFarmer && (
              <>
                <Link
                  href="/seller/products"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    pathname === '/seller/products'
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>My Crop Listings</span>
                </Link>
                <Link
                  href="/seller/products/new"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    pathname === '/seller/products/new'
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>List New Harvest</span>
                </Link>
                <Link
                  href="/fpo/commit"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/fpo/commit')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Pool with FPO</span>
                </Link>
                <Link
                  href="/seller/intelligence"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/seller/intelligence')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Mandi Rates</span>
                </Link>
                <Link
                  href="/seller/orders"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/seller/orders')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Fulfillment & Sales</span>
                </Link>
              </>
            )}

            {/* 4. FPO TABS */}
            {isFpo && (
              <>
                <Link
                  href="/fpo/dashboard"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    pathname === '/fpo/dashboard'
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Hub Overview</span>
                </Link>
                <Link
                  href="/fpo/dashboard/aggregation"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/fpo/dashboard/aggregation')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Batch Aggregations</span>
                </Link>
                <Link
                  href="/fpo/dashboard/listings"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/fpo/dashboard/listings')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Marketplace Batches</span>
                </Link>
                <Link
                  href="/fpo/dashboard/members"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/fpo/dashboard/members')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Member Farmers</span>
                </Link>
                <Link
                  href="/seller/orders"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/seller/orders')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatches & Orders</span>
                </Link>
              </>
            )}

            {/* 5. ADMIN TABS */}
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    pathname === '/admin'
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </Link>
                <Link
                  href="/admin/fpo"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/admin/fpo')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>FPO Verifications</span>
                </Link>
                <Link
                  href="/admin/orders"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/admin/orders')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatch Oversight</span>
                </Link>
                <Link
                  href="/marketplace"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    isLinkActive('/marketplace')
                      ? 'bg-[#233D22] text-[#FAF8F2] font-semibold'
                      : 'text-[#4A5042] hover:bg-[#E4DDCE] hover:text-[#1E221B]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Marketplace Catalog</span>
                </Link>
              </>
            )}

          </nav>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#DFD8CB] bg-[#F7F5EE] px-4 py-4 space-y-3 text-sm">
          {/* Regional Farmer Language Selector for Mobile */}
          <LanguageSelector variant="mobile" />

          {/* Mobile Search Form */}
          <form
            onSubmit={(e) => {
              handleTopSearchSubmit(e);
              setMobileMenuOpen(false);
            }}
            className="flex items-center relative mb-2"
          >
            <Search className="w-4 h-4 text-[#6B7060] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              placeholder="Search crops, commodities..."
              className="h-9 pl-9 pr-3 w-full text-xs bg-[#FFFFFF] border border-[#DFD8CB] rounded-md text-[#1E221B] placeholder-[#8A8F7E] focus:outline-hidden focus:border-[#233D22]"
            />
          </form>

          <div className="font-bold text-[10px] uppercase tracking-wider text-[#6B7060]">Universal Navigation</div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/marketplace" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded bg-[#EDE7DA] font-medium text-xs">Marketplace</Link>
            <Link href="/seller/intelligence" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded bg-[#EDE7DA] font-medium text-xs">Mandi Intelligence</Link>
            <Link href="/fpo" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded bg-[#EDE7DA] font-medium text-xs">FPO Directory</Link>
            <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded bg-[#EDE7DA] font-medium text-xs">Logistics Tracking</Link>
          </div>

          <div className="pt-2 border-t border-[#DFD8CB]">
            <div className="font-bold text-[10px] uppercase tracking-wider text-[#6B7060] mb-2">
              {isBuyer ? 'Buyer Tools' : isFarmer ? 'Farmer Tools' : isFpo ? 'FPO Hub' : isAdmin ? 'Admin Controls' : 'Quick Actions'}
            </div>
            {isBuyer && (
              <div className="space-y-1">
                <Link href="/marketplace" className="block py-1 font-medium">Browse Crop Lots</Link>
                <Link href="/marketplace/sourcing" className="block py-1 font-medium">Bulk Sourcing (RFQ)</Link>
                <Link href="/orders" className="block py-1 font-medium">My Orders & Tracking</Link>
              </div>
            )}
            {isFarmer && (
              <div className="space-y-1">
                <Link href="/seller/products" className="block py-1 font-medium">My Crop Listings</Link>
                <Link href="/seller/products/new" className="block py-1 font-medium">List New Harvest</Link>
                <Link href="/fpo/commit" className="block py-1 font-medium">Pool with FPO</Link>
                <Link href="/seller/orders" className="block py-1 font-medium">Fulfillment & Sales</Link>
              </div>
            )}
            {isFpo && (
              <div className="space-y-1">
                <Link href="/fpo/dashboard" className="block py-1 font-medium">Hub Overview</Link>
                <Link href="/fpo/dashboard/aggregation" className="block py-1 font-medium">Batch Aggregations</Link>
                <Link href="/fpo/dashboard/listings" className="block py-1 font-medium">Marketplace Batches</Link>
                <Link href="/fpo/dashboard/members" className="block py-1 font-medium">Member Farmers</Link>
              </div>
            )}
            {isVisitor && (
              <div className="space-y-1">
                <Link href="/marketplace" className="block py-1 font-medium">Buy Produce (Procurement)</Link>
                <Link href="/seller/products" className="block py-1 font-medium">Sell Harvest (Farmers)</Link>
                <Link href="/fpo" className="block py-1 font-medium">FPO Network</Link>
              </div>
            )}
          </div>

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
