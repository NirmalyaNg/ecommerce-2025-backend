import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cart, CartDocument } from './schema/cart.schema';
import { Model, Types } from 'mongoose';
import { AddToCartDto } from './dto/add-to-cart.dto';
import * as crypto from 'crypto';
import { SafeUser } from 'src/auth/auth.service';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address';
import { Address, AddressDocument } from 'src/address/schema/address.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Address.name) private readonly addressModel: Model<AddressDocument>,
  ) {}

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
        return (await cart.save()).populate(['items.product', 'shippingAddress']);
      }
    }
    // Create new cart if not found or no cartId provided
    const newCart = new this.cartModel({
      cartId: this.generateCartId(),
      items: [{ product: new Types.ObjectId(productId), quantity }],
      totalQuantity: quantity,
    });
    return (await newCart.save()).populate(['items.product', 'shippingAddress']);
  }

  // Add to cart for logged-in user with anonymous cart merge
  async addToCartForUser(addToCartDto: AddToCartDto, user: SafeUser): Promise<Cart> {
    const { productId, quantity = 1, cartId } = addToCartDto;

    let userCart: CartDocument | null = await this.cartModel.findOne({ userId: user._id, isActive: true });
    let anonymousCart: CartDocument | null = null;

    if (cartId) {
      anonymousCart = await this.cartModel.findOne({ cartId, isActive: true });
    }

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
      anonymousCart.isActive = false;
      await anonymousCart.save();
    }

    if (!userCart && anonymousCart) {
      anonymousCart.userId = user._id;
      userCart = anonymousCart;
    }

    if (!userCart) {
      userCart = new this.cartModel({
        cartId: this.generateCartId(),
        userId: user._id,
        items: [{ product: new Types.ObjectId(productId), quantity }],
        totalQuantity: quantity,
      });

      const savedCart = await userCart.save();
      await savedCart.populate(['items.product', 'shippingAddress']);

      return savedCart.toObject();
    }

    const existingItem = userCart.items.find((item) => item.product.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      userCart.items.push({ product: new Types.ObjectId(productId), quantity });
    }
    userCart.totalQuantity += quantity;

    const savedCart = await userCart.save();
    await savedCart.populate(['items.product', 'shippingAddress']);
    return savedCart.toObject();
  }

  // Get Cart By id
  async getCartById(cartId: string): Promise<Cart> {
    const cart = await this.cartModel.findOne({ cartId }).populate(['items.product', 'shippingAddress']).lean();
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
        .populate(['items.product', 'shippingAddress'])
        .session(session);
      let anonymousCart: CartDocument | null = null;

      if (cartId) {
        anonymousCart = await this.cartModel
          .findOne({ cartId, isActive: true })
          .populate(['items.product', 'shippingAddress'])
          .session(session);
      }

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

      if (!userCart && anonymousCart) {
        anonymousCart.userId = user._id;
        await anonymousCart.save({ session });

        await session.commitTransaction();
        return anonymousCart.toObject();
      }

      if (userCart) {
        await session.commitTransaction();
        return userCart.toObject();
      }

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
        if (item.quantity <= quantity) {
          cart.totalQuantity -= quantity;
          return acc;
        }
        item.quantity -= quantity;
        cart.totalQuantity -= quantity;
      }
      acc.push(item);
      return acc;
    }, [] as any);

    const updatedCart = await cart.save();
    const populatedUpdatedCart = await updatedCart.populate(['items.product', 'shippingAddress']);

    return populatedUpdatedCart.toObject();
  }

  async updateShippingAddress(
    cartId: string,
    updateShippingAddress: UpdateShippingAddressDto,
    user: SafeUser,
  ): Promise<Cart> {
    // Check if cart is associated to user
    const cart = await this.cartModel.findOne({ cartId, userId: user._id });
    if (!cart) {
      throw new NotFoundException(`Cart with id: ${cartId} not found!`);
    }

    const { saveForFuture, ...shippingAddressDetails } = updateShippingAddress;

    let savedAddress;

    // If cart already has a shipping address, update it with latest changes
    if (cart.shippingAddress) {
      const updates = {
        ...shippingAddressDetails,
      };
      if (saveForFuture) {
        updates['userId'] = user._id;
      }
      savedAddress = await this.addressModel.findByIdAndUpdate(cart.shippingAddress, { $set: updates }, { new: true });
    } else {
      // Create new shipping address and associate it with cart
      const newAddress = new this.addressModel({
        ...shippingAddressDetails,
        userId: saveForFuture ? user._id : undefined,
      });
      savedAddress = await newAddress.save();
    }
    cart.shippingAddress = savedAddress._id;
    const savedCart = await cart.save();
    const populatedSavedCart = await savedCart.populate(['items.product', 'shippingAddress']);

    return populatedSavedCart.toObject();
  }

  private generateCartId() {
    return `C${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
