'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Sprout,
  Search,
  ShieldCheck,
  ShoppingCart,
  Package,
  Sparkles,
  User,
  LogOut,
  Tractor,
  Layers,
  Store,
  Menu,
  X,
  LogIn,
  UserPlus,
  Building2,
  Users,
  FileCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  // Cart count only fetched for active Buyer sessions
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
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                SIH<span className="text-emerald-600">26033</span>
              </span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">
                Direct Farmer & FPO Marketplace
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links — Strictly Role Partitioned */}
          <nav className="hidden items-center gap-4 lg:gap-5 md:flex">
            {/* 1. Logged-out Visitor Navigation */}
            {isVisitor && (
              <>
                <Link
                  href="/marketplace"
                  className={`text-sm font-medium transition-colors ${
                    isLinkActive('/marketplace')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-foreground/80 hover:text-emerald-600'
                  }`}
                >
                  Browse Marketplace
                </Link>
                <Link
                  href="/categories"
                  className={`text-sm font-medium transition-colors ${
                    isLinkActive('/categories')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  Categories
                </Link>
                <Link
                  href="/fpo"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/fpo') && !pathname?.startsWith('/fpo/dashboard')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Directory</span>
                </Link>
              </>
            )}

            {/* 2. Buyer Account Navigation */}
            {isBuyer && (
              <>
                <Link
                  href="/marketplace"
                  className={`text-sm font-medium transition-colors ${
                    isLinkActive('/marketplace')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-foreground/80 hover:text-emerald-600'
                  }`}
                >
                  Marketplace
                </Link>
                <Link
                  href="/fpo/buy-requests"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/fpo/buy-requests')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <Package className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Bulk Sourcing</span>
                </Link>
                <Link
                  href="/fpo"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === '/fpo'
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Directory</span>
                </Link>
                <Link
                  href="/orders"
                  className={`text-sm font-medium transition-colors ${
                    isLinkActive('/orders')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  My Orders
                </Link>
              </>
            )}

            {/* 3. Farmer Account Navigation */}
            {isFarmer && (
              <>
                <Link
                  href="/fpo/join"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/fpo/join')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-foreground/80 hover:text-emerald-600'
                  }`}
                >
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Join FPO</span>
                </Link>
                <Link
                  href="/fpo/commit"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/fpo/commit')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Commit Produce</span>
                </Link>
                <Link
                  href="/fpo"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === '/fpo'
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Directory</span>
                </Link>
                <Link
                  href="/seller/products"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/seller/products')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 text-emerald-600" />
                  <span>My Direct Listings</span>
                </Link>
                <Link
                  href="/seller/orders"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/seller/orders')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <Tractor className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Fulfillment</span>
                </Link>
              </>
            )}

            {/* 4. FPO Account Navigation */}
            {isFpo && (
              <>
                <Link
                  href="/fpo/dashboard"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/fpo/dashboard')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-foreground/80 hover:text-emerald-600'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Dashboard</span>
                </Link>
                <Link
                  href="/fpo"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === '/fpo'
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <span>FPO Directory</span>
                </Link>
                <Link
                  href="/seller/orders"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/seller/orders')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <Tractor className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Bulk Orders</span>
                </Link>
                <Link
                  href="/marketplace"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/marketplace')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Marketplace</span>
                </Link>
              </>
            )}

            {/* 5. Admin Navigation */}
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className={`text-sm font-medium transition-colors ${
                    pathname === '/admin'
                      ? 'text-emerald-600 font-semibold'
                      : 'text-foreground/80 hover:text-emerald-600'
                  }`}
                >
                  Admin Overview
                </Link>
                <Link
                  href="/admin/fpo"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isLinkActive('/admin/fpo')
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Verification</span>
                </Link>
                <Link
                  href="/fpo"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === '/fpo'
                      ? 'text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-emerald-600'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Directory</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Right Side Header Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search Shortcut */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSearchClick}
            className="gap-1.5 hidden sm:inline-flex border-border/80 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-xs h-9 px-3"
            title="Search produce in marketplace"
          >
            <Search className="h-3.5 w-3.5 text-emerald-600" />
            <span>Search</span>
          </Button>

          {/* Logged-out Visitor Actions */}
          {isVisitor && (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground h-9 px-3">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 shadow-sm">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register</span>
                </Button>
              </Link>
            </div>
          )}

          {/* Buyer Actions */}
          {isBuyer && (
            <div className="flex items-center gap-2">
              {/* Cart Button */}
              <Link href="/cart">
                <Button
                  size="sm"
                  className="relative gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 text-xs h-9 px-3.5"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Cart</span>
                  {cartItemCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-zinc-950">
                      {cartItemCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Buyer Identity Badge */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold text-[10px] uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                  Buyer
                </span>
                <span className="font-medium truncate max-w-[130px]" title={user?.email}>
                  {user?.email}
                </span>
              </div>

              {/* Sign Out */}
              <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}

          {/* Farmer Actions */}
          {isFarmer && (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-semibold text-[10px] uppercase tracking-wider bg-amber-600 text-white px-1.5 py-0.2 rounded">
                  Farmer
                </span>
                <span className="font-medium truncate max-w-[140px]" title={user?.email}>
                  {user?.email}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
                title="Sign out of seller account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}

          {/* FPO Actions */}
          {isFpo && (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-semibold text-[10px] uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                  FPO Admin
                </span>
                <span className="font-medium truncate max-w-[140px]" title={user?.email}>
                  {user?.email}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
                title="Sign out of FPO account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-xs text-purple-900 dark:text-purple-200">
                <span className="font-semibold text-[10px] uppercase tracking-wider bg-purple-600 text-white px-1.5 py-0.2 rounded">
                  Admin
                </span>
                <span className="font-medium truncate max-w-[140px]" title={user?.email}>
                  {user?.email}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
                title="Sign out of admin account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/80 bg-background/95 px-4 py-4 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {/* Mobile Identity for logged in users */}
          {isAuthenticated && user && (
            <div className="p-3 rounded-xl bg-muted/60 text-xs flex items-center justify-between">
              <span className="font-medium text-foreground truncate max-w-[180px]">
                {user.email}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                {user.role}
              </Badge>
            </div>
          )}

          {/* Mobile Nav Links based on Role */}
          <div className="flex flex-col space-y-2 text-sm font-medium">
            {isVisitor && (
              <>
                <Link
                  href="/marketplace"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-foreground"
                >
                  Browse Marketplace
                </Link>
                <Link
                  href="/categories"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  Categories
                </Link>
                <Link
                  href="/fpo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  FPO Directory
                </Link>
                <div className="pt-2 flex flex-col gap-2">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="sm" variant="outline" className="w-full justify-center">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white justify-center">
                      Register
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {isBuyer && (
              <>
                <Link
                  href="/marketplace"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-foreground"
                >
                  Marketplace
                </Link>
                <Link
                  href="/fpo/buy-requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Package className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Bulk Sourcing</span>
                </Link>
                <Link
                  href="/fpo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Directory</span>
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  My Orders
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center justify-between"
                >
                  <span>My Cart</span>
                  {cartItemCount > 0 && (
                    <span className="h-5 w-5 rounded-full bg-amber-400 text-black text-[11px] font-bold flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-destructive border-destructive/30 justify-center gap-1.5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </>
            )}

            {isFarmer && (
              <>
                <Link
                  href="/fpo/join"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-foreground flex items-center gap-2"
                >
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Join FPO</span>
                </Link>
                <Link
                  href="/fpo/commit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Commit Produce</span>
                </Link>
                <Link
                  href="/fpo/commit#listings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Layers className="h-3.5 w-3.5 text-emerald-600" />
                  <span>My FPO Listings</span>
                </Link>
                <Link
                  href="/fpo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Directory</span>
                </Link>
                <Link
                  href="/seller/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>My Direct Listings</span>
                </Link>
                <Link
                  href="/seller/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Tractor className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Fulfillment</span>
                </Link>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-destructive border-destructive/30 justify-center gap-1.5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </>
            )}

            {isFpo && (
              <>
                <Link
                  href="/fpo/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-foreground flex items-center gap-2"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Dashboard</span>
                </Link>
                <Link
                  href="/fpo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Directory</span>
                </Link>
                <Link
                  href="/seller/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Tractor className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Bulk Orders</span>
                </Link>
                <Link
                  href="/marketplace"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Marketplace</span>
                </Link>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-destructive border-destructive/30 justify-center gap-1.5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </>
            )}

            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-foreground flex items-center gap-2"
                >
                  <span>Admin Overview</span>
                </Link>
                <Link
                  href="/admin/fpo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Verification</span>
                </Link>
                <Link
                  href="/fpo"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>FPO Directory</span>
                </Link>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-destructive border-destructive/30 justify-center gap-1.5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

