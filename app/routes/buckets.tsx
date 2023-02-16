import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";

import {
  NavLink,
  Outlet,
  useFetcher,
  useFormAction,
  useLoaderData,
  useLocation,
  useMatches,
  useParams,
} from "@remix-run/react";

import { requireUserId } from "~/util/auth.server";
import { getUnassignedTasks } from "~/models/task";
import { CACHE_CONTROL } from "~/util/http";
import {
  HScrollChild,
  HScrollContent,
  SidebarLayout,
  SidebarNav,
} from "~/components/layouts";
import { UnassignedTaskList } from "~/components/tasks/unassigned";
import * as BucketModel from "~/models/bucket";
import { Actions } from "~/actions/actions";
import {
  ContentEditableField,
  EditableItem,
  EditableList,
  Header,
} from "~/components/editable-list";
import { Bucket, Task } from "@prisma/client";

// FIXME: https://github.com/remix-run/remix/issues/1291
export { handleTaskAction as action } from "~/actions/actions.server";

type BucketsLoaderData = {
  unassigned: Awaited<ReturnType<typeof getUnassignedTasks>>;
  buckets: Awaited<ReturnType<typeof BucketModel.getBuckets>>;
};

export let loader: LoaderFunction = async ({ request }) => {
  let userId = await requireUserId(request);
  let [unassigned, buckets] = await Promise.all([
    getUnassignedTasks(userId),
    BucketModel.getBuckets(userId),
  ]);
  return json<BucketsLoaderData>(
    { unassigned, buckets },
    {
      headers: { "Cache-Control": CACHE_CONTROL.none },
    }
  );
};

export default function Buckets() {
  let { unassigned, buckets } = useLoaderData<BucketsLoaderData>();

  // FIXME: Gonna move this rendering over to the bucketSlug like tasks/$day
  let bucket = useMatches().slice(-1)[0].data;
  let tasks = bucket.tasks as unknown as Task[];
  let bucketId = bucket.id;

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
          <UnassignedTaskList
            tasks={tasks}
            unassigned={unassigned}
            bucketId={bucketId}
          />
        </HScrollChild>
      </HScrollContent>
    </SidebarLayout>
  );
}

function BucketList({ buckets }: { buckets: BucketsLoaderData["buckets"] }) {
  return (
    <div className="xl:w-[33vw]">
      <Header>Buckets (WIP)</Header>
      <EditableList
        items={buckets}
        label="New Bucket"
        renderItem={(bucket) => <BucketItem key={bucket.id} bucket={bucket} />}
      />
    </div>
  );
}

export type NewBucket = {
  id: string;
  name: string;
  isNew?: boolean;
};

export type RenderedBucket = Bucket | NewBucket;

function BucketItem({ bucket: bucket }: { bucket: RenderedBucket }) {
  let params = useParams();
  let fetcher = useFetcher();
  let action = useFormAction();
  let location = useLocation();

  let deleting =
    fetcher.submission?.formData.get("_action") === Actions.DELETE_BUCKET;

  return (
    <NavLink
      to={(bucket as Bucket).slug || location}
      className={({ isActive }) =>
        // TODO: these styles are dumb because the abstractions in the wrong
        // place need to move the styles out of EditableField, actually
        // starting to think it's silly to be re-using this list for the
        // projects, it's not as similar as I was anticipating!
        "w-full" + " " + (isActive ? "bg-pink-500 text-white" : "")
      }
    >
      <EditableItem key={bucket.id} hide={deleting}>
        <ContentEditableField
          value={bucket.name}
          isNew={isNewBucket(bucket)}
          onCreate={() => {
            fetcher.submit(
              {
                _action: Actions.CREATE_BUCKET,
                id: bucket.id,
                name: "",
              },
              { method: "post", action }
            );
          }}
          onChange={(value) => {
            fetcher.submit(
              {
                _action: Actions.UPDATE_BUCKET_NAME,
                id: bucket.id,
                slug: params.bucketSlug || "",
                name: value.trim(),
              },
              { method: "post", action }
            );
          }}
          onDelete={() => {
            fetcher.submit(
              { _action: Actions.DELETE_BUCKET, id: bucket.id },
              { method: "post", action }
            );
          }}
        />
      </EditableItem>
    </NavLink>
  );
}

// TODO: make generic with isNewTask
export function isNewBucket(bucket: any): bucket is NewBucket {
  return bucket && typeof bucket.id === "string" && bucket.isNew;
}
