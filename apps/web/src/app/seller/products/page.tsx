'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  fetchSellerProducts,
  updateProduct,
  updateProductInventory,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
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
  Edit3,
  Boxes,
  Trash2,
  MapPin,
  ImageOff,
  CheckCircle2,
  X,
  Loader2,
  UploadCloud,
  Image as ImageIcon,
  ExternalLink,
  Store,
  Layers,
  AlertCircle,
} from 'lucide-react';

export default function SellerProductsPage() {
  return (
    <RoleGuard allowedRoles={['FARMER', 'FPO']}>
      <SellerProductsContent />
    </RoleGuard>
  );
}

function SellerProductsContent() {
  const { token, user } = useAuth();

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['seller-products', token],
    queryFn: () => fetchSellerProducts(token || undefined),
    enabled: !!token,
  });

  const products: SellerProductItem[] = response?.data || [];

  // Modal states
  const [editingProduct, setEditingProduct] = useState<SellerProductItem | null>(null);
  const [stockProduct, setStockProduct] = useState<SellerProductItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<SellerProductItem | null>(null);

  // Form states for modals
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editVariety, setEditVariety] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED'>('ACTIVE');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [newStock, setNewStock] = useState<number>(0);
  const [stockError, setStockError] = useState<string | null>(null);
  const [isStockUpdating, setIsStockUpdating] = useState(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image upload states for edit modal
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const openEditModal = (p: SellerProductItem) => {
    setEditingProduct(p);
    setEditPrice(p.price);
    setEditVariety(p.varietyType || '');
    setEditNotes(p.notes || '');
    setEditDescription(p.description || '');
    setEditStatus((p.status as any) || 'ACTIVE');
    setEditError(null);
    setImageError(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct || !token) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be under 5 MB.');
      return;
    }

    setIsUploadingImage(true);
    setImageError(null);
    try {
      await uploadProductImage(editingProduct.id, file, token);
      const refreshed = await refetch();
      const updatedProducts: SellerProductItem[] = refreshed.data?.data || [];
      const updatedProduct = updatedProducts.find((p) => p.id === editingProduct.id);
      if (updatedProduct) {
        setEditingProduct(updatedProduct);
      }
    } catch (err: any) {
      setImageError(err?.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleImageDelete = async (imageId: string) => {
    if (!editingProduct || !token) return;
    setIsDeletingImage(imageId);
    setImageError(null);
    try {
      await deleteProductImage(editingProduct.id, imageId, token);
      const refreshed = await refetch();
      const updatedProducts: SellerProductItem[] = refreshed.data?.data || [];
      const updatedProduct = updatedProducts.find((p) => p.id === editingProduct.id);
      if (updatedProduct) {
        setEditingProduct(updatedProduct);
      }
    } catch (err: any) {
      setImageError(err?.message || 'Failed to delete image');
    } finally {
      setIsDeletingImage(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct || !token) return;
    if (editPrice <= 0) {
      setEditError('Asking price must be greater than ₹0');
      return;
    }
    setIsUpdating(true);
    setEditError(null);
    try {
      await updateProduct(
        editingProduct.id,
        {
          price: Number(editPrice),
          varietyType: editVariety.trim() || undefined,
          notes: editNotes.trim() || undefined,
          description: editDescription.trim() || undefined,
          status: editStatus,
        },
        token
      );
      setEditingProduct(null);
      setActionSuccess(`Updated '${editingProduct.name}' successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      refetch();
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update listing');
    } finally {
      setIsUpdating(false);
    }
  };

  const openStockModal = (p: SellerProductItem) => {
    setStockProduct(p);
    setNewStock(p.inventory?.availableQuantity ?? 0);
    setStockError(null);
  };

  const handleSaveStock = async () => {
    if (!stockProduct || !token) return;
    if (newStock < 0) {
      setStockError('Available quantity cannot be negative');
      return;
    }
    setIsStockUpdating(true);
    setStockError(null);
    try {
      await updateProductInventory(
        stockProduct.id,
        { availableQuantity: Number(newStock) },
        token
      );
      setStockProduct(null);
      setActionSuccess(`Updated stock for '${stockProduct.name}' to ${newStock} ${stockProduct.unit}.`);
      setTimeout(() => setActionSuccess(null), 4000);
      refetch();
    } catch (err: any) {
      setStockError(err?.message || 'Failed to update inventory');
    } finally {
      setIsStockUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct || !token) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteProduct(deletingProduct.id, token);
      setDeletingProduct(null);
      setActionSuccess(`Listing '${deletingProduct.name}' deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete listing');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B] flex flex-col font-sans">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-6xl flex-1">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#DFD8CB]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C8D9C8] bg-[#EDF3ED] px-3 py-1 text-xs font-semibold text-[#233D22] mb-2">
              <Layers className="h-3.5 w-3.5 text-[#3B532B]" />
              <span>Producer Portal: Inventory & Lot Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1E221B]">
              Listed Harvest Produce Lots
            </h1>
            <p className="text-xs text-[#5D6352] mt-1">
              Maintain your certified harvest listings, synchronize available batch quantities, and monitor spot marketplace inquiries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/seller/products/new">
              <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs gap-1.5 h-9 rounded-md">
                <PackagePlus className="h-4 w-4" />
                <span>Onboard Produce Lot</span>
              </Button>
            </Link>
            <Link href="/seller/intelligence">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 h-9 border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B] hover:bg-[#EBE7DC]">
                <span>Mandi Price Benchmarks</span>
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 h-9 border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B] hover:bg-[#EBE7DC]">
                <Store className="h-3.5 w-3.5 text-[#233D22]" />
                <span>Marketplace</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Action Success Toast */}
        {actionSuccess && (
          <div className="mb-6 rounded-md border border-[#C8D9C8] bg-[#EDF3ED] p-4 flex items-center justify-between gap-3 text-xs font-semibold text-[#233D22]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#233D22]" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-[#233D22] hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
            <p className="text-xs text-[#5D6352]">Loading registered produce lots...</p>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <Card className="rounded-lg border border-[#D98282] bg-[#FDF2F2] p-8 text-center space-y-3 max-w-lg mx-auto">
            <AlertCircle className="h-8 w-8 text-[#8C2323] mx-auto" />
            <h3 className="text-base font-serif font-bold text-[#1E221B]">Unable to Retrieve Listed Produce</h3>
            <p className="text-xs text-[#5D6352]">{(error as Error)?.message}</p>
            <Button size="sm" onClick={() => refetch()} className="bg-[#233D22] hover:bg-[#1a2d19] text-white mt-2 rounded-md">
              Retry Connection
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && products.length === 0 && (
          <Card className="rounded-lg border border-dashed border-[#DFD8CB] bg-[#FCFAF6] p-12 text-center max-w-lg mx-auto my-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EDF3ED] text-[#233D22] border border-[#C8D9C8] mb-4 mx-auto">
              <PackagePlus className="h-6 w-6" />
            </div>
            <h2 className="text-base font-serif font-bold text-[#1E221B]">No Produce Lots Published Yet</h2>
            <p className="mt-1.5 text-xs text-[#5D6352]">
              You have not registered any harvest lots under this producer account ({user?.email}). List your first produce batch to participate in spot procurement and regional landed-cost benchmarking.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/seller/products/new">
                <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs gap-1.5 h-9 rounded-md">
                  <PackagePlus className="h-4 w-4" />
                  <span>Onboard Produce Lot</span>
                </Button>
              </Link>
              <Link href="/seller/intelligence">
                <Button variant="outline" size="sm" className="text-xs h-9 rounded-md border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B]">
                  Mandi Intelligence
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Products Grid */}
        {!isLoading && !isError && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((item) => {
              const stock = item.inventory?.availableQuantity ?? 0;
              const isAvailable = item.status === 'ACTIVE' && stock > 0;
              const imgUrl = item.primaryImage || item.images?.[0]?.url;

              return (
                <Card
                  key={item.id}
                  className="flex flex-col h-full overflow-hidden border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAE5D9] flex items-center justify-center border-b border-[#DFD8CB]">
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt={item.name}
                        className="h-full w-full object-cover object-center"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#8C867A] p-4 text-center">
                        <ImageOff className="h-8 w-8 mb-1 opacity-50" />
                        <span className="text-[11px]">No Photo Assigned</span>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-[#FCFAF6] border-[#DFD8CB] text-[#1E221B]">
                        {item.category?.name || 'Produce'}
                      </Badge>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      {isAvailable ? (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-[#233D22] text-white border-[#233D22]">
                          VERIFIED LOT • {stock} {item.unit}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-[#FAF6EC] text-[#9A6818] border-[#E8DEC8]">
                          {item.status === 'OUT_OF_STOCK' || stock <= 0 ? 'Out of Stock' : item.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="flex flex-1 flex-col p-4 justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif font-bold text-base text-[#1E221B] line-clamp-1">
                          {item.name}
                        </h3>
                        {item.varietyType && (
                          <span className="text-[10px] font-medium border border-[#DFD8CB] bg-[#F7F5EE] text-[#5D6352] px-2 py-0.5 rounded shrink-0">
                            {item.varietyType}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] font-medium text-[#3B532B] line-clamp-1">
                          Grade: {item.notes}
                        </p>
                      )}

                      <p className="text-xs text-[#5D6352] line-clamp-2">
                        {item.description || 'Verified agricultural produce lot.'}
                      </p>

                      {/* Origin indicator */}
                      {(item.state || item.district) && (
                        <div className="flex items-center gap-1 text-[11px] text-[#5D6352] pt-1">
                          <MapPin className="h-3 w-3 text-[#3B532B] shrink-0" />
                          <span>Origin: {item.district || item.state}, {item.state}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#DFD8CB] space-y-3">
                      <div className="flex items-center justify-between bg-[#F4F0E6] p-2.5 rounded border border-[#E0D9CB]">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-[#5D6352] block">
                            Offer Price
                          </span>
                          <span className="text-sm font-bold text-[#1E221B]">
                            ₹{item.price.toLocaleString('en-IN')}{' '}
                            <span className="text-xs font-normal text-[#5D6352]">/{item.unit.toLowerCase()}</span>
                          </span>
                        </div>

                        <Link href={`/marketplace/products/${item.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs gap-1 text-[#233D22] hover:bg-[#EAE5D9] h-7 px-2"
                          >
                            <span>Lot Assaying</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>

                      {/* Seller Action Controls */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(item)}
                          className="text-[11px] h-8 px-2 gap-1 border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] hover:bg-[#EBE7DC] rounded-md"
                        >
                          <Edit3 className="h-3 w-3 text-[#5D6352]" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStockModal(item)}
                          className="text-[11px] h-8 px-2 gap-1 border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] hover:bg-[#EBE7DC] rounded-md"
                        >
                          <Boxes className="h-3 w-3 text-[#233D22]" />
                          <span>Stock</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDeletingProduct(item);
                            setDeleteError(null);
                          }}
                          className="text-[11px] h-8 px-2 gap-1 border-[#D98282] text-[#8C2323] hover:bg-[#FDF2F2] rounded-md"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 pb-8 bg-black/60 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-lg bg-[#FCFAF6] border border-[#DFD8CB] p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD8CB]">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-[#233D22]" />
                <h3 className="text-base font-serif font-bold text-[#1E221B]">
                  Edit Lot: {editingProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-[#5D6352] hover:text-[#1E221B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 text-xs text-[#8C2323] bg-[#FDF2F2] border border-[#D98282] rounded-md">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1E221B]">
                    Asking Price (₹/{editingProduct.unit.toLowerCase()})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    className="h-9 text-sm bg-[#F7F5EE] border-[#DFD8CB]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1E221B]">Listing Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="flex h-9 w-full rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 py-1 text-sm focus-visible:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1E221B]">Variety / Cultivar</label>
                  <Input
                    value={editVariety}
                    onChange={(e) => setEditVariety(e.target.value)}
                    placeholder="e.g. Sharbati 306"
                    className="h-9 text-sm bg-[#F7F5EE] border-[#DFD8CB]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1E221B]">Quality Grade / Specifications</label>
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="e.g. Certified Grade A"
                    className="h-9 text-sm bg-[#F7F5EE] border-[#DFD8CB]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1E221B]">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="flex w-full rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 py-2 text-sm focus-visible:outline-none"
                />
              </div>

              {/* Product Images Section */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1E221B] flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-[#233D22]" />
                    Harvest Lot Photos
                  </label>
                  <label
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded cursor-pointer transition-colors ${
                      isUploadingImage
                        ? 'bg-[#EAE5D9] text-[#8C867A] cursor-not-allowed'
                        : 'bg-[#233D22] hover:bg-[#1a2d19] text-white'
                    }`}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" />
                    )}
                    <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={isUploadingImage}
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>

                {imageError && (
                  <div className="p-2 text-[11px] text-[#8C2323] bg-[#FDF2F2] border border-[#D98282] rounded">
                    {imageError}
                  </div>
                )}

                {editingProduct.images && editingProduct.images.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {editingProduct.images.map((img) => (
                      <div
                        key={img.id}
                        className="relative group rounded overflow-hidden border border-[#DFD8CB] aspect-square bg-[#EAE5D9]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt="Product lot"
                          className="h-full w-full object-cover"
                        />
                        {img.isPrimary && (
                          <span className="absolute top-1 left-1 bg-[#233D22] text-white text-[8px] font-bold px-1 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleImageDelete(img.id)}
                          disabled={isDeletingImage === img.id}
                          className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-[#8C2323] transition-opacity"
                          title="Remove image"
                        >
                          {isDeletingImage === img.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded bg-[#F7F5EE] border border-dashed border-[#DFD8CB] text-[#5D6352]">
                    <ImageOff className="h-4 w-4 opacity-50 shrink-0" />
                    <span className="text-[11px]">No harvest photos uploaded yet. High quality photos improve buyer procurement conversion.</span>
                  </div>
                )}

                <p className="text-[10px] text-[#5D6352]">
                  Accepted: JPEG, PNG, WebP • Maximum 5 MB per image
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DFD8CB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingProduct(null)}
                className="text-xs h-9 px-4 border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isUpdating}
                onClick={handleSaveEdit}
                className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs h-9 px-5 gap-1.5 rounded-md"
              >
                {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Lot Parameters</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE STOCK MODAL */}
      {stockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="relative w-full max-w-sm rounded-lg bg-[#FCFAF6] border border-[#DFD8CB] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD8CB]">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-[#233D22]" />
                <h3 className="text-base font-serif font-bold text-[#1E221B]">Update Available Stock</h3>
              </div>
              <button
                onClick={() => setStockProduct(null)}
                className="text-[#5D6352] hover:text-[#1E221B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {stockError && (
              <div className="p-3 text-xs text-[#8C2323] bg-[#FDF2F2] border border-[#D98282] rounded-md">
                {stockError}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs text-[#5D6352]">
                Produce: <strong className="text-[#1E221B]">{stockProduct.name}</strong>
              </div>
              <label className="text-xs font-semibold text-[#1E221B] block">
                Available Stock ({stockProduct.unit})
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(parseFloat(e.target.value) || 0)}
                className="h-10 text-base font-bold bg-[#F7F5EE] border-[#DFD8CB]"
              />
              <p className="text-[11px] text-[#5D6352]">
                Stock adjustments are immediately synchronized with spot procurement orders.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DFD8CB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStockProduct(null)}
                className="text-xs h-9 px-4 border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isStockUpdating}
                onClick={handleSaveStock}
                className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs h-9 px-5 gap-1.5 rounded-md"
              >
                {isStockUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Stock</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="relative w-full max-w-sm rounded-lg bg-[#FCFAF6] border border-[#D98282] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FDF2F2] text-[#8C2323] border border-[#D98282] shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#1E221B]">Remove Produce Lot</h3>
                <p className="text-xs text-[#5D6352]">This action cannot be undone.</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 text-xs text-[#8C2323] bg-[#FDF2F2] border border-[#D98282] rounded-md">
                {deleteError}
              </div>
            )}

            <p className="text-xs text-[#5D6352]">
              Are you sure you want to permanently remove lot <strong className="text-[#1E221B]">{deletingProduct.name}</strong> from your active marketplace listings?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DFD8CB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingProduct(null)}
                className="text-xs h-9 px-4 border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isDeleting}
                onClick={handleDelete}
                className="bg-[#8C2323] hover:bg-[#721c1c] text-white text-xs h-9 px-5 gap-1.5 rounded-md"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Removal</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
