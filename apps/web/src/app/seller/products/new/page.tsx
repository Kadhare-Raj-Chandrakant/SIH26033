'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  fetchCategories,
  createProduct,
  uploadProductImage,
  Category,
  SellerProductItem,
} from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { RoleGuard } from '@/components/auth/role-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PackagePlus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Store,
  Layers,
  MapPin,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Scale,
  FileText,
  Tag,
} from 'lucide-react';

const UNIT_OPTIONS = [
  { value: 'QUINTAL', label: 'Quintal (100 kg)' },
  { value: 'KG', label: 'Kilogram (kg)' },
  { value: 'TONNE', label: 'Metric Tonne (1,000 kg)' },
  { value: 'BOX', label: 'Box / Crate' },
  { value: 'PIECE', label: 'Piece / Count' },
  { value: 'DOZEN', label: 'Dozen (12 count)' },
  { value: 'LITER', label: 'Liter (L)' },
  { value: 'GRAM', label: 'Gram (g)' },
] as const;

const listingFormSchema = z.object({
  categoryId: z.string().min(1, 'Please select a produce category'),
  name: z
    .string()
    .min(2, 'Produce name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  varietyType: z.string().max(100, 'Variety must not exceed 100 characters').optional(),
  price: z
    .number({ invalid_type_error: 'Price must be a valid number' })
    .min(0.01, 'Asking price must be greater than ₹0')
    .max(10000000, 'Price cannot exceed ₹10,000,000'),
  initialQuantity: z
    .number({ invalid_type_error: 'Quantity must be a valid number' })
    .min(0.01, 'Available quantity must be greater than 0')
    .max(10000000, 'Quantity cannot exceed 10,000,000'),
  unit: z.enum(
    ['KG', 'GRAM', 'QUINTAL', 'TONNE', 'LITER', 'MILLILITER', 'PIECE', 'DOZEN', 'BOX'],
    { errorMap: () => ({ message: 'Please select a valid unit' }) }
  ),
  notes: z.string().max(1000, 'Quality/grade notes must not exceed 1000 characters').optional(),
  description: z
    .string()
    .min(5, 'Please provide at least a brief description (minimum 5 characters)')
    .max(1000, 'Description must not exceed 1000 characters'),
});

type ListingFormData = z.infer<typeof listingFormSchema>;

interface SelectedImage {
  file: File;
  previewUrl: string;
}

export default function NewProductListingPage() {
  return (
    <RoleGuard allowedRoles={['FARMER', 'FPO']}>
      <NewProductListingContent />
    </RoleGuard>
  );
}

function NewProductListingContent() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<SellerProductItem | null>(null);

  const {
    data: categoriesResponse,
    isLoading: isLoadingCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
    staleTime: 10 * 60 * 1000,
  });

  const categories: Category[] = categoriesResponse?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      varietyType: '',
      price: undefined as unknown as number,
      initialQuantity: undefined as unknown as number,
      unit: 'QUINTAL',
      notes: '',
      description: '',
    },
  });

  const watchedPrice = watch('price');
  const watchedUnit = watch('unit');
  const watchedQuantity = watch('initialQuantity');

  useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [selectedImages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024;

    const newImages: SelectedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedMime.includes(file.type)) {
        setImageError(`'${file.name}' is not supported. Please select JPEG, PNG, or WebP.`);
        return;
      }
      if (file.size > maxFileSize) {
        setImageError(`'${file.name}' exceeds the 5MB file size limit.`);
        return;
      }
      newImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setSelectedImages((prev) => [...prev, ...newImages].slice(0, 4));
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const onSubmit = async (data: ListingFormData) => {
    if (!token) {
      setSubmitError('Authentication session expired. Please sign in again.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createProduct(
        {
          name: data.name.trim(),
          categoryId: data.categoryId,
          varietyType: data.varietyType?.trim() || undefined,
          price: Number(data.price),
          initialQuantity: Number(data.initialQuantity),
          unit: data.unit,
          notes: data.notes?.trim() || undefined,
          description: data.description.trim(),
        },
        token
      );

      const product = result.data;

      if (selectedImages.length > 0) {
        for (const img of selectedImages) {
          try {
            await uploadProductImage(product.id, img.file, token);
          } catch (uploadErr) {
            console.error('Image upload failed for listing:', uploadErr);
          }
        }
      }

      setCreatedProduct(product);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to list produce lot. Please verify your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B] flex flex-col font-sans">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-4xl flex-1">
        {/* Top Breadcrumb & Navigation */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#DFD8CB]">
          <Link
            href="/seller/products"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5D6352] hover:text-[#1E221B] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Produce Listings</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/seller/intelligence">
              <Button size="sm" variant="outline" className="text-xs h-8 border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B] hover:bg-[#EBE7DC]">
                <span>Mandi Benchmarks</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Success Confirmation Card */}
        {createdProduct ? (
          <Card className="rounded-lg border border-[#C8D9C8] bg-[#FCFAF6] p-8 text-center my-6 max-w-2xl mx-auto space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#EDF3ED] text-[#233D22] border border-[#C8D9C8] mx-auto">
              <CheckCircle2 className="h-8 w-8 text-[#233D22]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-bold text-[#1E221B]">Produce Lot Published Successfully</h2>
              <p className="text-sm text-[#5D6352] max-w-md mx-auto">
                Your listing for <span className="font-semibold text-[#1E221B]">{createdProduct.name}</span> is now active in the spot marketplace with{' '}
                <span className="font-semibold text-[#233D22]">
                  {createdProduct.inventory?.availableQuantity ?? watchedQuantity} {createdProduct.unit}
                </span>{' '}
                at ₹{createdProduct.price.toLocaleString('en-IN')}/{createdProduct.unit.toLowerCase()}.
              </p>
            </div>

            <div className="rounded-md border border-[#DFD8CB] bg-[#F7F5EE] p-4 text-left max-w-lg mx-auto space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#233D22]">
                <MapPin className="h-4 w-4 shrink-0 text-[#3B532B]" />
                <span>Assayed Farmgate Origin: {createdProduct.state || 'Maharashtra'}, {createdProduct.district || 'Nashik'}</span>
              </div>
              <p className="text-xs text-[#5D6352]">
                This lot is indexed into the national trade exchange. Buyers across India can inspect assaying parameters and calculate landed freight from your farmgate location.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href={`/marketplace/products/${createdProduct.id}`}>
                <Button className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs gap-1.5 h-10 px-5 rounded-md">
                  <Store className="h-4 w-4" />
                  <span>View Marketplace Assaying Sheet</span>
                </Button>
              </Link>
              <Link href="/seller/products">
                <Button variant="outline" className="text-xs gap-1.5 h-10 px-5 border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B]">
                  <span>Manage Listings</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreatedProduct(null);
                  setSelectedImages([]);
                  reset();
                }}
                className="text-xs text-[#5D6352] hover:text-[#1E221B] h-10"
              >
                Onboard Another Lot
              </Button>
            </div>
          </Card>
        ) : (
          /* Listing Form */
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C8D9C8] bg-[#EDF3ED] px-3 py-1 text-xs font-semibold text-[#233D22] mb-2">
                <PackagePlus className="h-3.5 w-3.5 text-[#3B532B]" />
                <span>Producer Portal: New Lot Onboarding</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1E221B]">
                Onboard Agricultural Produce Lot
              </h1>
              <p className="text-xs sm:text-sm text-[#5D6352] mt-1">
                Register harvest lot details, available batch volume, and farmgate asking price for institutional procurement.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#5D6352] bg-[#FCFAF6] border border-[#DFD8CB] rounded-md px-4 py-2.5">
                <MapPin className="h-4 w-4 text-[#3B532B] shrink-0" />
                <span>
                  Lot will be registered under producer account (<strong className="text-[#1E221B]">{user?.email}</strong>). Origin is verified from your KYC profile.
                </span>
              </div>
            </div>

            {submitError && (
              <div className="rounded-md border border-[#D98282] bg-[#FDF2F2] p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-[#8C2323] shrink-0 mt-0.5" />
                <div className="text-xs text-[#8C2323] space-y-1">
                  <div className="font-semibold">Listing Error</div>
                  <div>{submitError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Section 1: Produce & Category */}
              <Card className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] overflow-hidden">
                <div className="border-b border-[#DFD8CB] bg-[#F7F5EE] px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[#233D22]" />
                    <h2 className="text-xs uppercase tracking-wider font-bold text-[#1E221B]">1. Commodity & Category Classification</h2>
                  </div>
                </div>

                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Category Selector */}
                    <div className="space-y-1.5">
                      <label htmlFor="categoryId" className="text-xs font-semibold text-[#1E221B]">
                        Produce Category <span className="text-[#8C2323]">*</span>
                      </label>
                      <select
                        id="categoryId"
                        {...register('categoryId')}
                        disabled={isLoadingCategories}
                        className="flex h-10 w-full rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 py-2 text-sm text-[#1E221B] focus-visible:outline-none disabled:opacity-50"
                      >
                        <option value="">Select commodity category...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {errors.categoryId && (
                        <p className="text-[11px] text-[#8C2323]">{errors.categoryId.message}</p>
                      )}
                    </div>

                    {/* Commodity / Produce Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="text-xs font-semibold text-[#1E221B]">
                        Commodity Lot Name <span className="text-[#8C2323]">*</span>
                      </label>
                      <Input
                        id="name"
                        placeholder="e.g. Sharbati Wheat, Desi Chickpea, Pusa Basmati"
                        className="h-10 text-sm bg-[#F7F5EE] border-[#DFD8CB]"
                        {...register('name')}
                      />
                      {errors.name && (
                        <p className="text-[11px] text-[#8C2323]">{errors.name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Variety / Cultivar */}
                    <div className="space-y-1.5">
                      <label htmlFor="varietyType" className="text-xs font-semibold text-[#1E221B]">
                        Variety / Cultivar <span className="text-[#5D6352] font-normal">(Optional)</span>
                      </label>
                      <Input
                        id="varietyType"
                        placeholder="e.g. Grade A Bold, MP Lokwan"
                        className="h-10 text-sm bg-[#F7F5EE] border-[#DFD8CB]"
                        {...register('varietyType')}
                      />
                      {errors.varietyType && (
                        <p className="text-[11px] text-[#8C2323]">{errors.varietyType.message}</p>
                      )}
                    </div>

                    {/* Quality Grade / Notes */}
                    <div className="space-y-1.5">
                      <label htmlFor="notes" className="text-xs font-semibold text-[#1E221B]">
                        Quality Grade / Assaying Notes <span className="text-[#5D6352] font-normal">(Optional)</span>
                      </label>
                      <Input
                        id="notes"
                        placeholder="e.g. Moisture 11.2%, Cleaned Machine Sorted"
                        className="h-10 text-sm bg-[#F7F5EE] border-[#DFD8CB]"
                        {...register('notes')}
                      />
                      {errors.notes && (
                        <p className="text-[11px] text-[#8C2323]">{errors.notes.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Pricing & Inventory */}
              <Card className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] overflow-hidden">
                <div className="border-b border-[#DFD8CB] bg-[#F7F5EE] px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-[#233D22]" />
                    <h2 className="text-xs uppercase tracking-wider font-bold text-[#1E221B]">2. Farmgate Offer Price & Batch Volume</h2>
                  </div>
                </div>

                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label htmlFor="price" className="text-xs font-semibold text-[#1E221B]">
                        Offer Price (₹) <span className="text-[#8C2323]">*</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#5D6352] text-sm">
                          ₹
                        </div>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="e.g. 2480"
                          className="h-10 pl-7 text-sm bg-[#F7F5EE] border-[#DFD8CB]"
                          {...register('price', { valueAsNumber: true })}
                        />
                      </div>
                      {errors.price && (
                        <p className="text-[11px] text-[#8C2323]">{errors.price.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="initialQuantity" className="text-xs font-semibold text-[#1E221B]">
                        Available Batch Volume <span className="text-[#8C2323]">*</span>
                      </label>
                      <Input
                        id="initialQuantity"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="e.g. 450"
                        className="h-10 text-sm bg-[#F7F5EE] border-[#DFD8CB]"
                        {...register('initialQuantity', { valueAsNumber: true })}
                      />
                      {errors.initialQuantity && (
                        <p className="text-[11px] text-[#8C2323]">{errors.initialQuantity.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="unit" className="text-xs font-semibold text-[#1E221B]">
                        Volume Unit <span className="text-[#8C2323]">*</span>
                      </label>
                      <select
                        id="unit"
                        {...register('unit')}
                        className="flex h-10 w-full rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 py-2 text-sm text-[#1E221B] focus-visible:outline-none"
                      >
                        {UNIT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {errors.unit && (
                        <p className="text-[11px] text-[#8C2323]">{errors.unit.message}</p>
                      )}
                    </div>
                  </div>

                  {Boolean(
                    watchedPrice &&
                      !isNaN(watchedPrice) &&
                      watchedPrice > 0 &&
                      watchedQuantity &&
                      !isNaN(watchedQuantity) &&
                      watchedQuantity > 0
                  ) && (
                    <div className="rounded-md border border-[#E0D9CB] bg-[#F4F0E6] p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Scale className="h-5 w-5 text-[#233D22] shrink-0" />
                        <div>
                          <div className="text-xs font-serif font-bold text-[#1E221B]">
                            Total Lot Valuation: ₹{(watchedPrice * watchedQuantity).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-[#5D6352]">
                            Ex-farm rate: ₹{watchedPrice} per {watchedUnit.toLowerCase()} • Batch size: {watchedQuantity} {watchedUnit.toLowerCase()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-[#FCFAF6] border-[#DFD8CB] text-[#233D22] shrink-0">
                        Spot Ready
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 3: Description & Harvest Details */}
              <Card className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] overflow-hidden">
                <div className="border-b border-[#DFD8CB] bg-[#F7F5EE] px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#233D22]" />
                    <h2 className="text-xs uppercase tracking-wider font-bold text-[#1E221B]">3. Harvest Specification & Storage Details</h2>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="description" className="text-xs font-semibold text-[#1E221B]">
                      Harvest Condition & Packaging <span className="text-[#8C2323]">*</span>
                    </label>
                    <textarea
                      id="description"
                      rows={4}
                      placeholder="Specify harvest month, storage warehouse location, packaging method (e.g. 50kg HDPE gunny bags), pesticide residue status, and certified organic details..."
                      {...register('description')}
                      className="flex w-full rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 py-2 text-sm text-[#1E221B] focus-visible:outline-none"
                    />
                    {errors.description && (
                      <p className="text-[11px] text-[#8C2323]">{errors.description.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Section 4: Produce Images */}
              <Card className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] overflow-hidden">
                <div className="border-b border-[#DFD8CB] bg-[#F7F5EE] px-6 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-[#233D22]" />
                      <h2 className="text-xs uppercase tracking-wider font-bold text-[#1E221B]">4. Produce Lot Photography</h2>
                    </div>
                    <span className="text-[11px] text-[#5D6352]">Up to 4 images (JPEG, PNG, WebP ≤ 5MB)</span>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {selectedImages.map((img, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded overflow-hidden border border-[#DFD8CB] bg-[#EAE5D9] group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.previewUrl}
                            alt={`Preview ${index + 1}`}
                            className="h-full w-full object-cover object-center"
                          />
                          {index === 0 && (
                            <Badge className="absolute top-2 left-2 text-[9px] bg-[#233D22] text-white font-medium">
                              Primary Photo
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 rounded-full bg-black/70 text-white p-1 hover:bg-[#8C2323] transition-colors"
                            title="Remove image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedImages.length < 4 && (
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-[#DFD8CB] rounded-md p-6 bg-[#F7F5EE] hover:bg-[#EBE7DC] transition-colors cursor-pointer text-center"
                    >
                      <UploadCloud className="h-8 w-8 text-[#233D22] mb-2 opacity-80" />
                      <span className="text-xs font-semibold text-[#1E221B]">
                        Click or drag harvest photos to upload
                      </span>
                      <span className="text-[11px] text-[#5D6352] mt-1">
                        High resolution lot photos verify grain cleanliness and grade consistency
                      </span>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}

                  {imageError && (
                    <p className="text-[11px] text-[#8C2323] flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{imageError}</span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DFD8CB]">
                <Link href="/seller/products">
                  <Button type="button" variant="outline" className="text-xs h-10 px-5 border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B]">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs font-semibold h-10 px-6 rounded-md gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Publishing Lot...</span>
                    </>
                  ) : (
                    <>
                      <PackagePlus className="h-4 w-4" />
                      <span>Publish Produce Lot to Exchange</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
