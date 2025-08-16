import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cart, CartDocument } from './schema/cart.schema';
import { Model, Types } from 'mongoose';
import { AddToCartDto } from './dto/add-to-cart.dto';
import * as crypto from 'crypto';
import { Product } from 'src/product/schema/product.schema';
import { SafeUser } from 'src/auth/auth.service';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>) {}

  // Add to Cart
  async addToCart(addToCartDto: AddToCartDto): Promise<Cart> {
    const { cartId, productId, quantity = 1 } = addToCartDto;
    let cart: CartDocument | null = null;

    if (cartId) {
      cart = await this.cartModel.findOne({ cartId, isActive: true });
      if (cart) {
        const existingItem = cart.items.find((item) => item.product?.toString() === productId);
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          cart.items.push({ product: new Types.ObjectId(productId), quantity });
        }
        cart.totalQuantity += quantity;
        return (await cart.save()).populate({
          path: 'items.product',
          model: Product.name,
        });
      }
    }
    // Create new cart if not found or no cartId provided
    const newCart = new this.cartModel({
      cartId: this.generateCartId(),
      items: [{ product: new Types.ObjectId(productId), quantity }],
      totalQuantity: quantity,
    });
    return (await newCart.save()).populate({
      path: 'items.product',
      model: Product.name,
    });
  }

  // Add to cart for logged-in user with anonymous cart merge
  async addToCartForUser(addToCartDto: AddToCartDto, user: SafeUser): Promise<Cart> {
    const { productId, quantity = 1, cartId } = addToCartDto;

    // Explicit type: CartDocument | null
    let userCart: CartDocument | null = await this.cartModel.findOne({ userId: user._id, isActive: true });
    let anonymousCart: CartDocument | null = null;

    if (cartId) {
      anonymousCart = await this.cartModel.findOne({ cartId, isActive: true });
    }

    // Merge anonymous cart and user cart if both exists and differenct.
    if (userCart && anonymousCart && !userCart._id.equals(anonymousCart._id)) {
      for (const anonItem of anonymousCart.items) {
        const existingItem = userCart.items.find((item) => item.product.toString() === anonItem.product.toString());

        if (existingItem) {
          existingItem.quantity += anonItem.quantity;
        } else {
          userCart.items.push({ product: anonItem.product, quantity: anonItem.quantity });
        }

        userCart.totalQuantity += anonItem.quantity;
      }
      // Deactivate anonymous cart
      anonymousCart.isActive = false;
      await anonymousCart.save();
    }

    // If user cart is not present and anonymous cart is present, associate anonymous cart to user
    if (!userCart && anonymousCart) {
      anonymousCart.userId = user._id;
      userCart = anonymousCart;
    }

    // If neither user cart not anonymous cart is present, create new cart and associate with user
    if (!userCart) {
      userCart = new this.cartModel({
        cartId: this.generateCartId(),
        userId: user._id,
        items: [{ product: new Types.ObjectId(productId), quantity }],
        totalQuantity: quantity,
      });

      const savedCart = await userCart.save();
      await savedCart.populate({
        path: 'items.product',
        model: Product.name,
      });

      return savedCart.toObject();
    }

    // If only user cart is present, add item is not already exists or else increase quantity
    const existingItem = userCart.items.find((item) => item.product.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      userCart.items.push({ product: new Types.ObjectId(productId), quantity });
    }
    userCart.totalQuantity += quantity;

    const savedCart = await userCart.save();
    await savedCart.populate({
      path: 'items.product',
      model: Product.name,
    });
    return savedCart.toObject();
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

  async getCurrentUserCart(cartId: string, user: SafeUser): Promise<Cart | null> {
    const session = await this.cartModel.startSession();
    session.startTransaction();

    try {
      let userCart = await this.cartModel
        .findOne({ userId: user._id, isActive: true })
        .populate({
          path: 'items.product',
          model: Product.name,
        })
        .session(session);
      let anonymousCart: CartDocument | null = null;

      if (cartId) {
        anonymousCart = await this.cartModel
          .findOne({ cartId, isActive: true })
          .populate({
            path: 'items.product',
            model: Product.name,
          })
          .session(session);
      }

      // Case 1: Merge anonymous cart into user cart
      if (userCart && anonymousCart && !userCart._id.equals(anonymousCart._id)) {
        anonymousCart.items?.forEach((anonItem) => {
          const existingItem = userCart.items?.find(
            (cartItem) => cartItem.product?.toString() === anonItem.product?.toString(),
          );
          if (existingItem) {
            existingItem.quantity += anonItem.quantity;
          } else {
            userCart.items.push({ product: anonItem.product, quantity: anonItem.quantity });
          }
          userCart.totalQuantity = (userCart.totalQuantity || 0) + anonItem.quantity;
        });

        anonymousCart.isActive = false;
        await anonymousCart.save({ session });
        await userCart.save({ session });

        await session.commitTransaction();
        return userCart.toObject();
      }

      // Case 2: No userCart but anonymousCart exists → assign it to the user
      if (!userCart && anonymousCart) {
        anonymousCart.userId = user._id;
        await anonymousCart.save({ session });

        await session.commitTransaction();
        return anonymousCart.toObject();
      }

      // Case 3: Only userCart exists
      if (userCart) {
        await session.commitTransaction();
        return userCart.toObject();
      }

      // Case 4: No carts found
      await session.commitTransaction();
      return null;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async removeFromCart(removeFromCartDto: RemoveFromCartDto, user: SafeUser): Promise<Cart> {
    const { cartId, productId, quantity } = removeFromCartDto;

    const cart = await this.cartModel.findOne({ cartId });
    if (!cart || (user && cart.userId?.toString() !== user?._id?.toString())) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.reduce((acc, item) => {
      if (item.product._id?.toString() === productId) {
        // Case: remove completely if quantity <= requested remove quantity
        if (item.quantity <= quantity) {
          cart.totalQuantity -= quantity;
          return acc; // skip adding → removes item
        }
        // Case: just decrement
        item.quantity -= quantity;
        cart.totalQuantity -= quantity;
      }
      acc.push(item);
      return acc;
    }, [] as any);

    const updatedCart = await cart.save();
    const populatedUpdatedCart = await updatedCart.populate({
      path: 'items.product',
      model: Product.name,
    });

    return populatedUpdatedCart.toObject();
  }

  private generateCartId() {
    return `C${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
