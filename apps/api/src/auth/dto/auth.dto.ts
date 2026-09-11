import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, Matches } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid mobile number' })
  mobile?: string;

  @ApiProperty({ example: 'StrongP@ssw0rd', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ enum: ['FARMER', 'FPO', 'BUYER'], example: 'FARMER' })
  @IsEnum(Role, { message: 'Role must be FARMER, FPO, or BUYER' })
  role: Role;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
