import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { isEmail } from 'validator';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, minlength: 3, trim: true })
  username: string;

  @Prop({
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (value) => isEmail(value),
      message: 'Invalid email',
    },
  })
  email: string;

  @Prop({ required: true, trim: true, minlength: 6 })
  password: string;

  @Prop({ default: false })
  isAdmin: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
