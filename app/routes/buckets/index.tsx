import { LoaderFunction, redirect } from "remix";
import { requireUserId } from "~/util/auth.server";
import { createBucket, getRecentBucket } from "~/models/bucket";
import cuid from "cuid";

// FIXME: https://github.com/remix-run/remix/issues/1291
export { handleTaskAction as action } from "~/actions/actions.server";

export let loader: LoaderFunction = async ({ request }) => {
  let userId = await requireUserId(request);
  let latest = await getRecentBucket(userId);
  if (latest) {
    return redirect(`/buckets/${latest.slug}`);
  } else {
    let bucket = await createBucket(userId, cuid(), "Family");
    return redirect(`/buckets/${bucket.slug}`);
  }
};
