import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AddToCartDto {
  @IsOptional()
  @IsString({ message: 'CartId must be a string' })
  cartId?: string;

  @IsNotEmpty({ message: 'ProductId is required' })
  @IsMongoId({ message: 'ProductId must be valid' })
  productId: string;

  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(1, { message: 'Quantity must be >= 1' })
  quantity: number;
}
