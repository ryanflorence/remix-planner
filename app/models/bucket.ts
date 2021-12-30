import { db } from "~/models/db.server";
import slugify from "slugify";

export async function getBuckets(userId: string) {
  return db.bucket.findMany({
    where: { userId },
  });
}

export async function createBucket(userId: string, name: string) {
  return db.bucket.create({
    data: { userId, name, slug: slugify(name, { lower: true }) },
  });
}

export function getRecentBucket(userId: string) {
  return db.bucket.findFirst({
    where: { userId },
    orderBy: { updatedAt: "asc" },
  });
}
