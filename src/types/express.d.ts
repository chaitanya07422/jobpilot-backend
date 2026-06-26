import { UserDocument } from '../modules/auth/schemas';

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserDocument;
  }
}
