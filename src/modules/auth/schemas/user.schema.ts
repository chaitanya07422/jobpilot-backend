import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuthProvider } from '../enums/auth-provider.enum';
import { Subscription, SubscriptionSchema } from './subscription.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop()
  passwordHash?: string;

  @Prop({ type: [String], enum: AuthProvider, default: [AuthProvider.Local] })
  authProviders: AuthProvider[];

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerifiedAt?: Date;

  @Prop({ default: true })
  isNewUser: boolean;

  @Prop({ type: SubscriptionSchema, default: () => ({ active: false }) })
  subscription: Subscription;
}

export const UserSchema = SchemaFactory.createForClass(User);
