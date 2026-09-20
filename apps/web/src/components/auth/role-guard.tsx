'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  Tractor,
  ShoppingBag,
  Store,
} from 'lucide-react';

export interface RoleGuardProps {
  allowedRoles: ('BUYER' | 'FARMER' | 'FPO' | 'ADMIN')[];
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function RoleGuard({
  allowedRoles,
  children,
  fallbackTitle,
  fallbackMessage,
}: RoleGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
        <MarketplaceNavbar />
        <main className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  // 2. Unauthenticated Visitor State
  if (!isAuthenticated || !user) {
    const isFarmerRoute = allowedRoles.some((r) => r === 'FARMER' || r === 'FPO');
    const roleTarget = isFarmerRoute ? 'Farmer' : 'Buyer';
    const roleParam = isFarmerRoute ? 'FARMER' : 'BUYER';
    const returnUrl = encodeURIComponent(pathname || '/marketplace');

    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col">
        <MarketplaceNavbar />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <Card className="w-full max-w-lg border-border/80 bg-card shadow-xl rounded-2xl p-6 sm:p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Lock className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {fallbackTitle || `${roleTarget} Sign-In Required`}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                {fallbackMessage ||
                  `This page is protected and requires an active ${roleTarget} account. Please sign in or register to continue.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href={`/login?returnUrl=${returnUrl}`} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-sm text-xs h-10 px-5">
                  <span>Sign In to Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link
                href={`/register?role=${roleParam}&returnUrl=${returnUrl}`}
                className="w-full sm:w-auto"
              >
                <Button variant="outline" className="w-full sm:w-auto text-xs h-10 px-5 border-border/80">
                  Register as {roleTarget}
                </Button>
              </Link>
            </div>

            <div className="pt-2 border-t border-border/60 text-center">
              <Link
                href="/marketplace"
                className="text-xs text-muted-foreground hover:text-emerald-600 transition-colors inline-flex items-center gap-1 font-medium"
              >
                &larr; Back to Public Marketplace
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // 3. Role Authorization Check
  const hasAllowedRole = allowedRoles.includes(user.role as any);

  if (!hasAllowedRole) {
    const isFarmerTryingBuyerAction =
      (user.role === 'FARMER' || user.role === 'FPO') &&
      allowedRoles.includes('BUYER');

    const isBuyerTryingFarmerAction =
      user.role === 'BUYER' &&
      allowedRoles.some((r) => r === 'FARMER' || r === 'FPO');

    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col">
        <MarketplaceNavbar />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <Card className="w-full max-w-lg border-border/80 bg-card shadow-xl rounded-2xl p-6 sm:p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {isFarmerTryingBuyerAction
                  ? 'Buyer Account Required'
                  : isBuyerTryingFarmerAction
                  ? 'Farmer Account Required'
                  : 'Access Restricted'}
              </h1>

              <div className="p-3.5 rounded-xl bg-muted/60 border border-border/60 text-xs text-muted-foreground leading-relaxed text-left">
                {isFarmerTryingBuyerAction ? (
                  <p>
                    You are currently signed in with a <strong>Farmer/Producer</strong> account (
                    <span className="font-mono text-foreground">{user.email}</span>).
                    Farmer accounts list produce for sale and fulfill consignments. Purchasing features
                    (Cart, Checkout, and Buyer Orders) require a <strong>Buyer</strong> account.
                  </p>
                ) : isBuyerTryingFarmerAction ? (
                  <p>
                    You are currently signed in with a <strong>Buyer</strong> account (
                    <span className="font-mono text-foreground">{user.email}</span>). Producer
                    dashboards, listing management, and carrier fulfillment actions are reserved for
                    registered <strong>Farmers and FPOs</strong>.
                  </p>
                ) : (
                  <p>
                    Your current account role (<strong>{user.role}</strong>) does not have permission to
                    access this area.
                  </p>
                )}
              </div>
            </div>

            {/* Navigation & Action Options */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              {isFarmerTryingBuyerAction ? (
                <>
                  <Link
                    href={`/login?returnUrl=${encodeURIComponent(pathname || '/cart')}`}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5 gap-1.5 shadow-sm">
                      <ShoppingBag className="h-4 w-4" />
                      <span>Sign In as Buyer</span>
                    </Button>
                  </Link>
                  <Link href="/seller/orders" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto text-xs h-10 px-5 border-border/80 gap-1.5">
                      <Tractor className="h-4 w-4" />
                      <span>Producer Orders</span>
                    </Button>
                  </Link>
                </>
              ) : isBuyerTryingFarmerAction ? (
                <>
                  <Link
                    href={`/login?returnUrl=${encodeURIComponent(pathname || '/seller/orders')}`}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5 gap-1.5 shadow-sm">
                      <Tractor className="h-4 w-4" />
                      <span>Sign In as Farmer</span>
                    </Button>
                  </Link>
                  <Link href="/marketplace" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto text-xs h-10 px-5 border-border/80 gap-1.5">
                      <Store className="h-4 w-4" />
                      <span>Marketplace</span>
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/marketplace" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 px-5">
                    Return to Marketplace
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // 4. Authorized Access
  return <>{children}</>;
}
