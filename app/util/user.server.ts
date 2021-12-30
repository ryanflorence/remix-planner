import { redirect } from "remix";
import { db } from "~/models/db.server";

export async function requireUser(email: string) {
  let user = await db.user.findUnique({ where: { email } });

  if (!user) {
    throw redirect("/login");
  }

  return user;
}

export async function ensureUserAccount(email: string) {
  let user = await db.user.findUnique({ where: { email } });

  if (user) {
    return user;
  }

  return db.user.create({ data: { email } });
}
