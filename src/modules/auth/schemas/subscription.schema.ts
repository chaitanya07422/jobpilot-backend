import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type PlanId = 'starter' | 'pro' | 'enterprise';

@Schema({ _id: false })
export class Subscription {
  @Prop({ type: String, enum: ['starter', 'pro', 'enterprise'] })
  planId?: PlanId;

  @Prop({ default: false })
  active: boolean;

  @Prop()
  activatedAt?: Date;

  @Prop()
  expiresAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
