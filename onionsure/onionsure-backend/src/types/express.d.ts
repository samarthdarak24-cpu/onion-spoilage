import type { Role } from '@prisma/client';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by `requireAuth`. Never trust client-supplied role data. */
      user?: {
        id: string;
        username: string;
        email: string | null;
        name: string;
        role: Role;
        status: string;
        fpoId: string | null;
        centreId: string | null;
        farmerId: string | null;
        buyerId: string | null;
      };
    }
  }
}

export {};
