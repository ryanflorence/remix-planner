import { db } from "~/util/db.server";

export async function ensureUserAccount(email: string) {
  let user = await db.user.findUnique({ where: { email } });

  if (user) return user;

  return db.user.create({
    data: { email },
  });
}
