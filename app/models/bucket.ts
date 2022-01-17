import { db } from "~/models/db.server";
import slugify from "slugify";

export async function getBucketWithTasksBySlug(userId: string, slug: string) {
  return db.bucket.findFirst({
    where: { userId, slug },
    include: { tasks: true },
  });
}

export async function getBucket(id: string) {
  return db.bucket.findFirst({ where: { id } });
}

export async function deleteBucket(id: string) {
  return db.bucket.delete({ where: { id } });
}

export async function getBuckets(userId: string) {
  return db.bucket.findMany({
    where: { userId },
    orderBy: { updatedAt: "asc" },
  });
}

export async function createBucket(
  userId: string,
  id: string,
  name: string = ""
) {
  return db.bucket.create({
    data: { id, userId, name, slug: slugify(name, { lower: true }) },
  });
}

export async function updateBucketName(id: string, name: string) {
  return db.bucket.update({
    where: { id },
    data: { name, slug: slugify(name, { lower: true }) },
  });
}

export function getRecentBucket(userId: string) {
  return db.bucket.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}
