'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sprout, Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/providers/auth-provider';
import { loginUser } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, user, isAuthenticated, logout, loginAsDemoBuyer, loginAsDemoSeller } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect');

  const handlePostAuthRedirect = (role: string) => {
    // If a Farmer logs in, prevent redirection into buyer-only purchase pages
    if (role === 'FARMER' || role === 'FPO') {
      if (
        returnUrl &&
        (returnUrl.startsWith('/cart') ||
          returnUrl.startsWith('/checkout') ||
          returnUrl.startsWith('/orders') ||
          returnUrl.startsWith('/marketplace/sourcing'))
      ) {
        router.push('/seller/orders');
        return;
      }
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl);
        return;
      }
      router.push('/seller/orders');
      return;
    }

    // If a Buyer logs in, prevent redirection into farmer-only seller portals
    if (role === 'BUYER') {
      if (returnUrl && returnUrl.startsWith('/seller')) {
        router.push('/marketplace');
        return;
      }
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl);
        return;
      }
      router.push('/marketplace');
      return;
    }

    if (role === 'ADMIN') {
      router.push('/admin');
      return;
    }

    router.push('/marketplace');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { token, user: authUser } = await loginUser({
        email: email.trim(),
        password,
      });

      setAuth(token, authUser);
      handlePostAuthRedirect(authUser.role);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (type: 'buyer' | 'farmer' | 'fpo') => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (type === 'buyer') {
        await loginAsDemoBuyer();
        handlePostAuthRedirect('BUYER');
      } else {
        const role = type === 'fpo' ? 'FPO' : 'FARMER';
        await loginAsDemoSeller(role);
        handlePostAuthRedirect(role);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar Header */}
      <header className="border-b border-border/70 backdrop-blur bg-background/80 sticky top-0 z-30">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight">
                SIH<span className="text-emerald-600">26033</span>
              </span>
            </div>
          </Link>

          <Link href="/marketplace">
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <span>Browse Marketplace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Subtle decorative radial background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />

        <div className="w-full max-w-md">
          {/* Active session banner if user is already logged in */}
          {isAuthenticated && user && (
            <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Signed in as <strong>{user.email}</strong> ({user.role})
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="underline font-semibold hover:text-emerald-950 dark:hover:text-emerald-100"
              >
                Sign Out
              </button>
            </div>
          )}

          <Card className="border-border/80 bg-card/95 backdrop-blur shadow-xl rounded-2xl">
            <CardHeader className="space-y-1.5 pb-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-2 border border-emerald-500/20">
                <Lock className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Sign In to SIH26033
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Access your agricultural marketplace dashboard, products, and orders
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="block text-xs font-semibold text-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10 h-10 text-sm rounded-lg"
                    />
                    <Mail className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="block text-xs font-semibold text-foreground">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10 h-10 text-sm rounded-lg"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Quick Demo Login Helpers */}
              <div className="pt-3 border-t border-border/60">
                <p className="text-[11px] font-medium text-muted-foreground mb-2 text-center">
                  Quick Demo Sign-In (1-Click Test Access)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleQuickDemoLogin('buyer')}
                    className="p-2 border border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-lg text-center transition-colors text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span className="font-semibold block text-emerald-700 dark:text-emerald-300">Buyer</span>
                    <span className="text-[10px]">Produce Sourcing</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleQuickDemoLogin('farmer')}
                    className="p-2 border border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-lg text-center transition-colors text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span className="font-semibold block text-emerald-700 dark:text-emerald-300">Farmer</span>
                    <span className="text-[10px]">Seller Portal</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleQuickDemoLogin('fpo')}
                    className="p-2 border border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-lg text-center transition-colors text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span className="font-semibold block text-emerald-700 dark:text-emerald-300">FPO</span>
                    <span className="text-[10px]">Cooperative</span>
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
              <p>
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  Create an account
                </Link>
              </p>
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground/70">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Protected by Argon2 & JWT Authentication</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground">
          Loading authentication...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
