import { LoaderFunction, redirect } from "remix";
import { requireUserId } from "~/util/auth.server";
import { getRecentBucket } from "~/models/bucket";

export let loader: LoaderFunction = async ({ request }) => {
  let userId = await requireUserId(request);
  let latest = await getRecentBucket(userId);
  if (latest) {
    return redirect(`/buckets/${latest.slug}`);
  }
};

export default function Index() {
  return <div className="p-4">← Create a bucket</div>;
}
