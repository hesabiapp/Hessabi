import "express-session";

declare module "express-session" {
  interface SessionData {
    user: {
      userId: string;
      businessId: string;
      role: string;
      username: string;
    };
  }
}
