import { createTRPCRouter } from "./create-context";
import { adminRouter } from "./routes/admin";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
