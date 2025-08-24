import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateShippingAddressDto {
  @IsNotEmpty({ message: 'Firstname is required' })
  @IsString({ message: 'Firstname must be a string' })
  @MinLength(2, { message: 'Firstname must have at least 2 characters' })
  firstName: string;

  @IsNotEmpty({ message: 'Lastname is required' })
  @IsString({ message: 'Lastname must be a string' })
  lastName: string;

  @IsNotEmpty({ message: 'Address Line 1 is required' })
  @IsString({ message: 'Address Line 1 must be a string' })
  @MinLength(10, { message: 'Address Line 1 must have at least 10 characters' })
  addressLine1: string;

  @IsOptional()
  @IsString({ message: 'Address Line 2 must be a string' })
  addressLine2?: string;

  @IsNotEmpty({ message: 'City is required' })
  @IsString({ message: 'City must be a string' })
  city: string;

  @IsNotEmpty({ message: 'Country is required' })
  @IsString({ message: 'Country must be a string' })
  country: string;

  @IsNotEmpty({ message: 'State is required' })
  @IsString({ message: 'State must be a string' })
  state: string;

  @IsNotEmpty({ message: 'Zip code is required' })
  @IsString({ message: 'Zip code must be a string' })
  zipCode: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'saveForFuture must be a boolean' })
  saveForFuture?: boolean;
}
