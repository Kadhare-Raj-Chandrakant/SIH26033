'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  MapPin,
  IndianRupee,
  Building,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Category, MarketplaceQueryParams, FilterOptionsData } from '@/lib/api';

// Dataset states and their corresponding producing districts
const DATASET_STATES_AND_DISTRICTS: Record<string, string[]> = {
  'Andhra Pradesh': ['Annamayya', 'Chittor', 'Dr.B.R.A.Konaseema', 'Guntur'],
  'Gujarat': ['Mehsana', 'Morbi'],
  'Haryana': ['Ambala'],
  'Himachal Pradesh': ['Shimla'],
  'Karnataka': ['Chikkaballapur', 'Mandya'],
  'Madhya Pradesh': ['Balaghat', 'Chhatarpur', 'Indore', 'Khargone', 'Mandsaur', 'Neemuch'],
  'Rajasthan': ['Baran', 'Ganganagar'],
  'Uttar Pradesh': ['Agra'],
  'West Bengal': ['Coochbehar', 'Darjeeling'],
};

const ALL_DATASET_STATES = Object.keys(DATASET_STATES_AND_DISTRICTS).sort();

interface FilterSidebarProps {
  categories: Category[];
  filters: MarketplaceQueryParams;
  filterOptions?: FilterOptionsData;
  onFilterChange: (newFilters: Partial<MarketplaceQueryParams>) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

export function FilterSidebar({
  categories,
  filters,
  filterOptions,
  onFilterChange,
  onResetFilters,
  isLoading,
}: FilterSidebarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [minPriceInput, setMinPriceInput] = useState(filters.minPrice?.toString() || '');
  const [maxPriceInput, setMaxPriceInput] = useState(filters.maxPrice?.toString() || '');

  // Keep local inputs synchronized with URL query params
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    setMinPriceInput(filters.minPrice?.toString() || '');
  }, [filters.minPrice]);

  useEffect(() => {
    setMaxPriceInput(filters.maxPrice?.toString() || '');
  }, [filters.maxPrice]);

  const availableStates = filterOptions?.states?.length
    ? filterOptions.states
    : ALL_DATASET_STATES;

  // Available districts based on selected state
  const availableDistricts = filters.state
    ? filterOptions?.districtsByState?.[filters.state] ||
      DATASET_STATES_AND_DISTRICTS[filters.state] ||
      []
    : filterOptions?.allDistricts ||
      Array.from(new Set(Object.values(DATASET_STATES_AND_DISTRICTS).flat())).sort();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      search: searchInput.trim() || undefined,
      page: 1,
    });
  };

  const handleStateChange = (selectedState: string) => {
    onFilterChange({
      state: selectedState || undefined,
      district: undefined, // Reset district when state changes
      page: 1,
    });
  };

  const handleDistrictChange = (selectedDistrict: string) => {
    onFilterChange({
      district: selectedDistrict || undefined,
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
    setMinPriceInput('');
    setMaxPriceInput('');
    onResetFilters();
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.categoryId ||
      filters.state ||
      filters.district ||
      filters.location ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      (filters.sort && filters.sort !== 'newest')
  );

  return (
    <div className="space-y-6 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
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
        <label className="mb-2 block text-xs font-semibold text-foreground flex items-center justify-between">
          <span>Search Produce</span>
          {filters.search && (
            <span className="text-[11px] font-normal text-emerald-600">Active</span>
          )}
        </label>
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              id="marketplace-search-input"
              placeholder="Search rice, wheat, farmer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-8 text-xs h-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  onFilterChange({ search: undefined, page: 1 });
                }}
                className="absolute right-2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            id="marketplace-search-button"
            size="sm"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search Produce</span>
          </Button>
        </form>
      </div>

      {/* State Filter Dropdown */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          <span>Filter by State</span>
        </label>
        <select
          value={filters.state || ''}
          onChange={(e) => handleStateChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All States ({availableStates.length})</option>
          {availableStates.map((stateName) => (
            <option key={stateName} value={stateName}>
              {stateName}
            </option>
          ))}
        </select>
      </div>

      {/* District Filter Dropdown */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Building className="h-3.5 w-3.5 text-emerald-600" />
          <span>Filter by District</span>
        </label>
        <select
          value={filters.district || ''}
          onChange={(e) => handleDistrictChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">
            {filters.state ? `All Districts in ${filters.state}` : 'All Districts'}
          </option>
          {availableDistricts.map((distName) => (
            <option key={distName} value={distName}>
              {distName}
            </option>
          ))}
        </select>
      </div>

      {/* Categories Filter */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-foreground">
          Categories ({categories.length})
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

      {/* Price Range */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-foreground">
          Price Range (₹ / Quintal)
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
        <label className="mb-2 block text-xs font-semibold text-foreground">
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
          <option value="name_asc">Produce: A to Z</option>
          <option value="name_desc">Produce: Z to A</option>
        </select>
      </div>
    </div>
  );
}
