import { UserDocument } from '../schemas';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isNewUser: boolean;
  subscription: {
    planId?: string;
    active: boolean;
    activatedAt?: string;
    expiresAt?: string;
  };
}

export function toUserResponse(user: UserDocument): UserResponse {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    isNewUser: user.isNewUser,
    subscription: {
      planId: user.subscription?.planId,
      active: user.subscription?.active ?? false,
      activatedAt: user.subscription?.activatedAt?.toISOString(),
      expiresAt: user.subscription?.expiresAt?.toISOString(),
    },
  };
}
