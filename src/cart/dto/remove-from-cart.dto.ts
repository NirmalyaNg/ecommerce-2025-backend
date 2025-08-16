import { IsMongoId, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class RemoveFromCartDto {
  @IsNotEmpty({ message: 'ProductId is required' })
  @IsMongoId({ message: 'ProductID is not valid' })
  productId: string;

  @IsNotEmpty({ message: 'Quantity is required' })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(1, { message: 'Quantity must be alteast 1' })
  quantity: number;

  @IsNotEmpty({ message: 'CartID is required' })
  @IsString({ message: 'CartID must be a string' })
  cartId: string;
}
