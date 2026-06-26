import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserDocument } from '../schemas';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserDocument => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as UserDocument;
  },
);
