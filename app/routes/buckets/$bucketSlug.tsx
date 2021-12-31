import { json, LoaderFunction, useLoaderData } from "remix";
import invariant from "tiny-invariant";
import { requireUserId } from "~/util/auth.server";
import { CACHE_CONTROL } from "~/util/http";
import * as BucketModel from "~/models/bucket";
import { BucketTaskList } from "~/components/tasks/bucket";
import { useParentData } from "~/components/use-parent-data";
import { Task } from "@prisma/client";

export { handleTaskAction as action } from "~/actions/actions.server";

type BucketWithTasks = Awaited<
  ReturnType<typeof BucketModel.getBucketWithTasksBySlug>
>;

export let loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.bucketSlug, "Expected params.bucketSlug");

  let userId = await requireUserId(request);
  let bucket = await BucketModel.getBucketWithTasksBySlug(
    userId,
    params.bucketSlug
  );

  return json<BucketWithTasks>(bucket, {
    headers: { "Cache-Control": CACHE_CONTROL.none },
  });
};

export default function Bucket() {
  let { unassigned } = useParentData<{ unassigned: Task[] }>();
  let bucket = useLoaderData<BucketWithTasks>();
  invariant(bucket, "expected bucket");

  return (
    <BucketTaskList
      bucketName={bucket.name}
      bucketId={bucket.id}
      tasks={bucket.tasks}
      unassigned={unassigned}
    />
  );
}
