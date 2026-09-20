import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FpoLegalStructure } from '@prisma/client';

export class RegisterFpoDto {
  @ApiProperty({ description: 'Official name of the FPO', example: 'Maharashtra Agro Producer Co. Ltd.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Unique official registration number (CIN / Cooperative Reg No)', example: 'U01409MH2024PTC123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  registrationNumber: string;

  @ApiProperty({ enum: FpoLegalStructure, description: 'Legal registration structure', example: FpoLegalStructure.PRODUCER_COMPANY })
  @IsEnum(FpoLegalStructure)
  legalStructure: FpoLegalStructure;

  @ApiPropertyOptional({ description: 'Registration incorporation date (ISO string)', example: '2023-01-15' })
  @IsString()
  @IsOptional()
  registrationDate?: string;

  @ApiProperty({ description: 'State of operation', example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @ApiProperty({ description: 'District of operation', example: 'Nashik' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string;

  @ApiProperty({ description: 'Registered office address', example: 'Gat No. 42, APMC Market Road, Pimpalgaon' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @ApiProperty({ description: 'Pincode', example: '422209' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  pincode: string;

  @ApiProperty({ description: 'Official contact email', example: 'contact@maharashtra-agro.org' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ description: 'Official contact phone number', example: '9822012345' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Contact phone must be a valid 10-digit Indian mobile number' })
  contactPhone: string;

  @ApiPropertyOptional({ description: 'FPO Bank Account Number', example: '50200012345678' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank IFSC Code', example: 'HDFC0001234' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  ifscCode?: string;

  @ApiPropertyOptional({ description: 'Bank Name', example: 'HDFC Bank, Nashik Branch' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Overview and description of the FPO' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Logo or banner URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}
