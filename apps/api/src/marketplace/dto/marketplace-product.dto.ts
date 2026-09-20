import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SafeSellerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sellerType: string;

  @ApiPropertyOptional({ nullable: true })
  businessName: string | null;

  @ApiPropertyOptional({ nullable: true })
  farmLocation: string | null;

  @ApiProperty()
  verificationStatus: string;
}

export class SafeCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;
}

export class SafeImageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  isPrimary: boolean;
}

export class MarketplaceProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ description: 'Price per unit' })
  price: number;

  @ApiProperty()
  unit: string;

  @ApiPropertyOptional({ nullable: true })
  location: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty({ description: 'Available stock quantity' })
  availableQuantity: number;

  @ApiProperty({ type: SafeCategoryDto })
  category: SafeCategoryDto;

  @ApiPropertyOptional({ nullable: true, description: 'Single primary image for the listing' })
  primaryImage?: string | null;

  @ApiProperty({ type: [SafeImageDto] })
  images: SafeImageDto[];


  @ApiProperty({ type: SafeSellerDto })
  seller: SafeSellerDto;

  @ApiPropertyOptional({ nullable: true })
  farmerName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  farmName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  state?: string | null;

  @ApiPropertyOptional({ nullable: true })
  district?: string | null;

  @ApiPropertyOptional({ nullable: true })
  marketMandi?: string | null;

  @ApiPropertyOptional({ nullable: true })
  varietyType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  sellingUnit?: string | null;

  @ApiPropertyOptional({ nullable: true })
  officialMandiModalPriceInr?: number | null;

  @ApiPropertyOptional({ nullable: true })
  illustrativeFarmerListingReferenceInr?: number | null;

  @ApiPropertyOptional({ nullable: true })
  officialPriceDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MarketplacePaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class MarketplaceProductsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [MarketplaceProductDto] })
  data: MarketplaceProductDto[];

  @ApiProperty({ type: MarketplacePaginationMetaDto })
  meta: MarketplacePaginationMetaDto;
}

export class MarketplaceProductDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MarketplaceProductDto })
  data: MarketplaceProductDto;
}
