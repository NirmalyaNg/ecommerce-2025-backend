import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

class ImageDto {
  @IsNotEmpty({ message: 'Image url is required' })
  @IsString({ message: 'Image must be a string' })
  url: string;

  @IsOptional()
  @IsString({ message: 'Image alt text must be a string' })
  altText?: string;
}

export class CreateProductDto {
  @IsNotEmpty({ message: 'Product name is required' })
  @IsString({ message: 'Product name must be a string' })
  @MinLength(3, { message: 'Product name must have atleast 3 characters' })
  @MaxLength(100, {
    message: 'Product name can have a maximum of 100 characters',
  })
  name: string;

  @IsOptional()
  @IsString({ message: 'Product Description must be a string' })
  description?: string;

  @IsNotEmpty({ message: 'Product price is required' })
  @IsNumber({}, { message: 'Product price must be a number' })
  price: number;

  @IsNotEmpty({ message: 'Product slug is required' })
  @IsString({ message: 'Product slug must be a string' })
  @MinLength(3, { message: 'Product slug must have atleast 3 characters' })
  @MaxLength(100, {
    message: 'Product slug can have a maximum of 100 characters',
  })
  slug: string;

  @IsOptional()
  @IsNumber({}, { message: 'Product discount percentage must be a number' })
  discountPercentage?: number;

  @IsNotEmpty({ message: 'Product stock is required' })
  @IsNumber({}, { message: 'Product stock must be a number' })
  @Min(1, { message: 'Product stock must be greater than 0' })
  stock: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images?: ImageDto[];

  @IsNotEmpty({ message: 'Product category is required' })
  @IsMongoId({ message: 'Product category must be a valid category id' })
  category: string;

  @IsOptional()
  @IsBoolean({ message: 'Product isActive must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
