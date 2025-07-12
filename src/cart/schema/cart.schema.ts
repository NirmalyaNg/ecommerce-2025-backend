import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/auth/schema/user.schema';
import { Product } from 'src/product/schema/product.schema';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ required: true, unique: true })
  cartId: string;

  @Prop({ type: Types.ObjectId, ref: User.name })
  userId?: Types.ObjectId;

  @Prop({
    type: [
      {
        product: { type: Types.ObjectId, ref: Product.name, required: true },
        quantity: { type: Number, min: 1, required: true },
      },
    ],
    _id: false,
  })
  items: {
    product: Types.ObjectId;
    quantity: number;
  }[];

  @Prop({ type: Number, default: 0 })
  totalPrice: number;

  @Prop({ type: Number, default: 0 })
  totalQuantity: number;

  @Prop({ type: Boolean, default: true })
  isActive?: boolean;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
