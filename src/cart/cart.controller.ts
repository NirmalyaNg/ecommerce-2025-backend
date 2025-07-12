import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart, CartDocument } from './schema/cart.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addToCart(@Body() addToCartDto: AddToCartDto): Promise<Cart> {
    return this.cartService.addToCart(addToCartDto);
  }

  @Get(':id')
  getCartById(@Param('id') cartId: string) {
    return this.cartService.getCartById(cartId);
  }
}
