import { initTRPC, TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get('authorization');
  let userId: string | null = null;
  let userEmail: string | null = null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      userId = data.user.id;
      userEmail = data.user.email || null;
    }
  }

  return {
    req: opts.req,
    userId,
    userEmail,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userEmail || !ADMIN_EMAILS.includes(ctx.userEmail)) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Admin access required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      userEmail: ctx.userEmail,
    },
  });
});

export const adminProcedure = t.procedure.use(isAdmin);
