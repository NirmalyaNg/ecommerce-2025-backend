import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schema/cart.schema';
import { ProductModule } from 'src/product/product.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [ProductModule, AuthModule, MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }])],
  providers: [CartService],
  controllers: [CartController],
})
export class CartModule {}
