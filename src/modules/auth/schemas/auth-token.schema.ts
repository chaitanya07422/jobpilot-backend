import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuthTokenType } from '../enums/auth-token-type.enum';
import { User } from './user.schema';

export type AuthTokenDocument = HydratedDocument<AuthToken>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'auth_tokens',
})
export class AuthToken {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: AuthTokenType })
  type: AuthTokenType;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true, expires: 0 })
  expiresAt: Date;

  @Prop()
  usedAt?: Date;
}

export const AuthTokenSchema = SchemaFactory.createForClass(AuthToken);

AuthTokenSchema.index({ userId: 1, type: 1, usedAt: 1 });
