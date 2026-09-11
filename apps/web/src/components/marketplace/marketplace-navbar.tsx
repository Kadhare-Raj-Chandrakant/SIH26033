'use client';

import Link from 'next/link';
import { Sprout, Search, ShieldCheck, ShoppingCart, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchCart } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';

export function MarketplaceNavbar() {
  const { isAuthenticated } = useAuth();

  const { data: cartResponse } = useQuery({
    queryKey: ['cart'],
    queryFn: () => fetchCart(),
    enabled: isAuthenticated,
    staleTime: 5000,
  });

  const cartItemCount = cartResponse?.data?.itemCount || 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/marketplace" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                SIH<span className="text-emerald-600">26033</span>
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Direct Farmer & FPO Marketplace
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-4 md:flex">
            <Link
              href="/marketplace"
              className="text-sm font-medium text-foreground transition-colors hover:text-emerald-600"
            >
              Browse Catalog
            </Link>
            <Link
              href="/orders"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-emerald-600"
            >
              My Orders
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Badge variant="farmer" className="hidden lg:inline-flex items-center gap-1 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Verified Direct Sourcing
          </Badge>

          <Link href="/marketplace">
            <Button size="sm" variant="outline" className="gap-1.5 hidden sm:inline-flex">
              <Search className="h-3.5 w-3.5" />
              <span>Explore</span>
            </Button>
          </Link>

          <Link href="/orders">
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </Button>
          </Link>

          <Link href="/cart">
            <Button
              size="sm"
              className="relative gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20"
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
        </div>
      </div>
    </header>
  );
}
