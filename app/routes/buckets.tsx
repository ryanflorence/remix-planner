import { Outlet, json, useLoaderData, Form, ActionFunction } from "remix";
import type { LoaderFunction } from "remix";
import { requireAuthSession, requireUserId } from "~/util/auth.server";
import { getUnassignedTasks } from "~/models/task";
import { CACHE_CONTROL, parseStringFormData } from "~/util/http";
import {
  HScrollChild,
  HScrollContent,
  SidebarLayout,
  SidebarNav,
} from "~/components/layouts";
import { UnassignedTaskList } from "~/components/tasks/unassigned";
import { AppButton, TextInput } from "~/components/forms";
import { PlusIcon } from "~/components/icons";
import * as Bucket from "~/models/bucket";
import { Actions } from "~/actions/actions";
import invariant from "tiny-invariant";

type BucketsLoaderData = {
  unassigned: Awaited<ReturnType<typeof getUnassignedTasks>>;
  buckets: Awaited<ReturnType<typeof Bucket.getBuckets>>;
};

export let loader: LoaderFunction = async ({ request }) => {
  let userId = await requireUserId(request);
  let [unassigned, buckets] = await Promise.all([
    getUnassignedTasks(userId),
    Bucket.getBuckets(userId),
  ]);
  return json<BucketsLoaderData>(
    { unassigned, buckets },
    {
      headers: { "Cache-Control": CACHE_CONTROL.none },
    }
  );
};

export let action: ActionFunction = async ({ request }) => {
  let session = await requireAuthSession(request);
  let userId = session.get("userId");

  let data = await parseStringFormData(request);

  switch (data._action) {
    case Actions.CREATE_BUCKET: {
      invariant(data.name, "expected data.name");
      return Bucket.createBucket(userId, data.name);
    }
    default: {
      throw new Response("Bad Request", { status: 400 });
    }
  }
};

export default function Buckets() {
  let { unassigned, buckets } = useLoaderData<BucketsLoaderData>();

  return (
    <SidebarLayout>
      <SidebarNav>
        <BucketList buckets={buckets} />
      </SidebarNav>
      <HScrollContent>
        <HScrollChild>
          <Outlet />
        </HScrollChild>
        <HScrollChild>
          <UnassignedTaskList tasks={[]} unassigned={unassigned} />
        </HScrollChild>
      </HScrollContent>
    </SidebarLayout>
  );
}

function BucketList({ buckets }: { buckets: BucketsLoaderData["buckets"] }) {
  return (
    <div className="xl:w-[33vw]">
      <div>
        {buckets.map((bucket) => (
          <div key={bucket.id}>{bucket.name}</div>
        ))}
      </div>

      <NewBucketForm />
    </div>
  );
}

function NewBucketForm() {
  return (
    <div className="px-4 py-4 w-full">
      <Form method="post" className="flex gap-2">
        <input type="hidden" name="_action" value={Actions.CREATE_BUCKET} />
        <TextInput name="name" required className="w-1/2" />
        <AppButton type="submit" className="w-1/2">
          Create Bucket <PlusIcon />
        </AppButton>
      </Form>
    </div>
  );
}
