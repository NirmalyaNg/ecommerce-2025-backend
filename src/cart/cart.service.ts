import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cart, CartDocument } from './schema/cart.schema';
import { Model, Types } from 'mongoose';
import { AddToCartDto } from './dto/add-to-cart.dto';
import * as crypto from 'crypto';
import { Product } from 'src/product/schema/product.schema';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>) {}

  // Add to Cart
  async addToCart(addToCartDto: AddToCartDto): Promise<Cart> {
    const { cartId, productId, quantity } = addToCartDto;
    let cart: CartDocument | null = null;

    if (cartId) {
      cart = await this.cartModel.findOne({ cartId });
      if (cart) {
        const existingItem = cart.items.find((item) => item.product?.toString() === productId);

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          cart.items.push({
            product: new Types.ObjectId(productId),
            quantity: quantity ?? 1,
          });
          cart.totalQuantity += quantity ?? 1;
        }

        return cart.save();
      }
    }

    const newCart = new this.cartModel({
      cartId: this.generateCartId(),
      items: [{ product: new Types.ObjectId(productId), quantity: quantity ?? 1 }],
      totalQuantity: quantity ?? 1,
    });

    return newCart.save();
  }

  // Get Cart By id
  async getCartById(cartId: string): Promise<Cart> {
    const cart = await this.cartModel
      .findOne({ cartId })
      .populate({
        path: 'items.product',
        model: Product.name,
      })
      .lean();
    if (!cart) {
      throw new NotFoundException(`Cart with id: ${cartId} not found!`);
    }
    return cart;
  }

  private generateCartId() {
    return `C${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
