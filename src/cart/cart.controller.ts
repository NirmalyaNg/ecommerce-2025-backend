import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from './schema/cart.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { OptionalAuthGuard } from 'src/auth/guard/optional-auth.guard';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { SafeUser } from 'src/auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @UseGuards(OptionalAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  addToCart(@Body() addToCartDto: AddToCartDto, @CurrentUser() user: SafeUser): Promise<Cart> {
    if (user) {
      return this.cartService.addToCartForUser(addToCartDto, user);
    }
    return this.cartService.addToCart(addToCartDto);
  }

  @Delete()
  @UseGuards(OptionalAuthGuard)
  removeFromCart(@Body() removeFromCartDto: RemoveFromCartDto, @CurrentUser() user: SafeUser): Promise<Cart> {
    return this.cartService.removeFromCart(removeFromCartDto, user);
  }

  @Get('current')
  @UseGuards(AuthGuard('jwt'))
  getCurrentUserCart(@Query('cartId') cartId: string, @CurrentUser() user: SafeUser) {
    return this.cartService.getCurrentUserCart(cartId, user);
  }

  @Get(':id')
  getCartById(@Param('id') cartId: string) {
    return this.cartService.getCartById(cartId);
  }

  @Patch(':id/address')
  @UseGuards(AuthGuard('jwt'))
  updateShippingAddress(
    @Param('id') cartId: string,
    @Body() updateShippingAddress: UpdateShippingAddressDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.cartService.updateShippingAddress(cartId, updateShippingAddress, user);
  }
}
