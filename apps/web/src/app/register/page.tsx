'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sprout, UserPlus, Mail, Lock, User, Phone, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, Tractor, Users, ShoppingBag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/providers/auth-provider';
import { registerUser } from '@/lib/api';

type AccountRole = 'FARMER' | 'FPO' | 'BUYER';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  const [role, setRole] = useState<AccountRole>('FARMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name or business name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { token, user: authUser } = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
      });

      setAuth(token, authUser);

      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl);
      } else if (role === 'FARMER' || role === 'FPO') {
        router.push('/seller/orders');
      } else {
        router.push('/marketplace');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Registration failed. Please verify your information and try again.',
      );
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

          <Link href="/login">
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <span>Sign In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Registration Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Subtle decorative radial background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />

        <div className="w-full max-w-lg">
          <Card className="border-border/80 bg-card/95 backdrop-blur shadow-xl rounded-2xl">
            <CardHeader className="space-y-1.5 pb-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-2 border border-emerald-500/20">
                <UserPlus className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Join SIH26033 Marketplace
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Connect directly between farmers, FPOs, and wholesale/retail buyers
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

              {/* Role Selection Cards */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Select Account Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('FARMER')}
                    disabled={isSubmitting}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center sm:items-start text-center sm:text-left ${
                      role === 'FARMER'
                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 shadow-sm'
                        : 'border-border hover:border-border/80 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <Tractor className={`h-4 w-4 mb-1.5 ${role === 'FARMER' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-bold block">Farmer</span>
                    <span className="text-[10px] opacity-80 hidden sm:block">Direct producer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('FPO')}
                    disabled={isSubmitting}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center sm:items-start text-center sm:text-left ${
                      role === 'FPO'
                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 shadow-sm'
                        : 'border-border hover:border-border/80 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <Users className={`h-4 w-4 mb-1.5 ${role === 'FPO' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-bold block">FPO</span>
                    <span className="text-[10px] opacity-80 hidden sm:block">Cooperative group</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('BUYER')}
                    disabled={isSubmitting}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col items-center sm:items-start text-center sm:text-left ${
                      role === 'BUYER'
                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 shadow-sm'
                        : 'border-border hover:border-border/80 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <ShoppingBag className={`h-4 w-4 mb-1.5 ${role === 'BUYER' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-bold block">Buyer</span>
                    <span className="text-[10px] opacity-80 hidden sm:block">Wholesale / Retail</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="reg-name" className="block text-xs font-semibold text-foreground">
                    {role === 'FPO' ? 'FPO / Collective Name' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <Input
                      id="reg-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder={role === 'FPO' ? 'Kisan Samridhi Producer Co.' : 'Ramesh Kumar'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10 h-10 text-sm rounded-lg"
                    />
                    <User className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="reg-email" className="block text-xs font-semibold text-foreground">
                      Email Address
                    </label>
                    <div className="relative">
                      <Input
                        id="reg-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        className="pr-10 h-10 text-sm rounded-lg"
                      />
                      <Mail className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="reg-mobile" className="block text-xs font-semibold text-foreground">
                      Mobile Number <span className="text-muted-foreground text-[11px] font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Input
                        id="reg-mobile"
                        type="tel"
                        autoComplete="tel"
                        placeholder="9876543210"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        disabled={isSubmitting}
                        className="pr-10 h-10 text-sm rounded-lg"
                      />
                      <Phone className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="reg-password" className="block text-xs font-semibold text-foreground">
                      Password (min 8 chars)
                    </label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
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

                  <div className="space-y-1.5">
                    <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-foreground">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        id="reg-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="pr-10 h-10 text-sm rounded-lg"
                      />
                      <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account as {role}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
              <p>
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  Log in
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground">
          Loading registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
