import Link from 'next/link';
import { Sprout, ArrowRight, ShieldCheck, TrendingUp, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-border/70 backdrop-blur bg-background/80 sticky top-0 z-30">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight">
                SIH<span className="text-emerald-600">26033</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href="/login">
              <Button size="sm" variant="ghost" className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" variant="outline" className="text-xs sm:text-sm font-medium border-border/80 hover:bg-muted hidden sm:inline-flex">
                Register
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm text-xs sm:text-sm">
                <span>Marketplace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
          {/* Subtle decorative background gradient */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />

          <div className="container mx-auto px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Milestone 6 — Buyer Marketplace Live</span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Direct Farmer & FPO to Buyer
              <span className="block text-emerald-600 mt-2">
                Agricultural Marketplace
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Empowering farmers and Farmer Producer Organisations (FPOs) with direct market access while providing buyers with verified, transparent, and farm-fresh produce discovery.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/marketplace">
                <Button size="lg" className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-base font-semibold shadow-lg shadow-emerald-600/20">
                  <span>Explore Marketplace</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/marketplace?categoryId=">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  Browse All Categories
                </Button>
              </Link>
            </div>

            {/* Feature Highlights Grid */}
            <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left max-w-4xl mx-auto">
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground">Verified Producers</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Every farmer and FPO profile is verified with transparent location and certification status.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 mb-4">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground">Transparent Pricing</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Zero middlemen markups. Direct wholesale and retail prices configured by producers.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground">Multi-Param Discovery</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Search, filter by category, location, and price with real-time stock availability.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 bg-card text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>SIH26033 — Direct Farmer/FPO to Buyer Agricultural Marketplace Platform</p>
        </div>
      </footer>
    </div>
  );
}
