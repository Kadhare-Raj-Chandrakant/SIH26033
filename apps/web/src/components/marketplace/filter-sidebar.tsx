'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, RotateCcw, MapPin, IndianRupee } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Category, MarketplaceQueryParams } from '@/lib/api';

interface FilterSidebarProps {
  categories: Category[];
  filters: MarketplaceQueryParams;
  onFilterChange: (newFilters: Partial<MarketplaceQueryParams>) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

export function FilterSidebar({
  categories,
  filters,
  onFilterChange,
  onResetFilters,
  isLoading,
}: FilterSidebarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [locationInput, setLocationInput] = useState(filters.location || '');
  const [minPriceInput, setMinPriceInput] = useState(filters.minPrice?.toString() || '');
  const [maxPriceInput, setMaxPriceInput] = useState(filters.maxPrice?.toString() || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      search: searchInput.trim() || undefined,
      page: 1,
    });
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      location: locationInput.trim() || undefined,
      page: 1,
    });
  };

  const handlePriceApply = () => {
    const min = minPriceInput ? parseFloat(minPriceInput) : undefined;
    const max = maxPriceInput ? parseFloat(maxPriceInput) : undefined;

    onFilterChange({
      minPrice: min !== undefined && !isNaN(min) && min >= 0 ? min : undefined,
      maxPrice: max !== undefined && !isNaN(max) && max >= 0 ? max : undefined,
      page: 1,
    });
  };

  const handleCategoryClick = (categoryId?: string) => {
    onFilterChange({
      categoryId: filters.categoryId === categoryId ? undefined : categoryId,
      page: 1,
    });
  };

  const handleReset = () => {
    setSearchInput('');
    setLocationInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    onResetFilters();
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.categoryId ||
      filters.location ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      (filters.sort && filters.sort !== 'newest')
  );

  return (
    <div className="space-y-6 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      {/* Header with Reset */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3.5">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="xs"
            onClick={handleReset}
            disabled={isLoading}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset All
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div>
        <label className="mb-2 block text-xs font-medium text-foreground">
          Search Produce
        </label>
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Input
            type="text"
            placeholder="Search tomato, wheat..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pr-9 text-xs"
          />
          <button
            type="submit"
            className="absolute right-2 text-muted-foreground hover:text-foreground"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Categories */}
      <div>
        <label className="mb-2 block text-xs font-medium text-foreground">
          Categories
        </label>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={!filters.categoryId ? 'default' : 'outline'}
            className="cursor-pointer text-xs py-1 transition-all"
            onClick={() => handleCategoryClick(undefined)}
          >
            All Produce
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={filters.categoryId === cat.id ? 'default' : 'outline'}
              className={`cursor-pointer text-xs py-1 transition-all ${
                filters.categoryId === cat.id
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'hover:border-emerald-500/50'
              }`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Location Filter */}
      <div>
        <label className="mb-2 block text-xs font-medium text-foreground">
          Location / Region
        </label>
        <form onSubmit={handleLocationSubmit} className="relative flex items-center">
          <Input
            type="text"
            placeholder="e.g. Vadodara, Nashik"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            className="pr-9 text-xs"
          />
          <button
            type="submit"
            className="absolute right-2 text-muted-foreground hover:text-foreground"
            aria-label="Filter location"
          >
            <MapPin className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Price Range */}
      <div>
        <label className="mb-2 block text-xs font-medium text-foreground">
          Price Range (₹)
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IndianRupee className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              type="number"
              placeholder="Min"
              min="0"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="pl-7 text-xs"
            />
          </div>
          <span className="text-muted-foreground text-xs">—</span>
          <div className="relative flex-1">
            <IndianRupee className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              type="number"
              placeholder="Max"
              min="0"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="pl-7 text-xs"
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePriceApply}
          disabled={isLoading}
          className="mt-2.5 w-full text-xs"
        >
          Apply Price
        </Button>
      </div>

      {/* Sort Selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-foreground">
          Sort Order
        </label>
        <select
          value={filters.sort || 'newest'}
          onChange={(e) =>
            onFilterChange({
              sort: e.target.value as MarketplaceQueryParams['sort'],
              page: 1,
            })
          }
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="newest">Newest Arrivals</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name: A to Z</option>
          <option value="name_desc">Name: Z to A</option>
        </select>
      </div>
    </div>
  );
}
