import { users_role } from '@prisma/client';

export interface JwtPayload {
  sub: string;        
  email: string;
  role: users_role;
}
