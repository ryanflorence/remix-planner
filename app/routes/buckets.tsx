import { Outlet, json, useLoaderData } from "remix";
import type { LoaderFunction } from "remix";
import { requireUserId } from "~/controllers/auth.server";
import { getBacklog } from "~/models/task";
import { CACHE_CONTROL } from "~/util/http";
import { Task } from "@prisma/client";
import {
  HScrollChild,
  HScrollContent,
  SidebarLayout,
  SidebarNav,
} from "~/components/layouts";
import { BacklogTaskList } from "~/components/task";

export type CalendarLoaderData = {
  backlog: Task[];
};

type Backlog = Awaited<ReturnType<typeof getBacklog>>;

export let loader: LoaderFunction = async ({ request }) => {
  let userId = await requireUserId(request);
  let backlog = await getBacklog(userId);
  return json<{ backlog: Backlog }>(
    { backlog },
    {
      headers: { "Cache-Control": CACHE_CONTROL.none },
    }
  );
};

export default function Buckets() {
  let { backlog } = useLoaderData<{ backlog: Backlog }>();

  return (
    <SidebarLayout>
      <SidebarNav>
        <div className="p-4 w-[33vw]">Buckets</div>
      </SidebarNav>
      <HScrollContent>
        <HScrollChild>
          <Outlet />
        </HScrollChild>
        <HScrollChild>
          <BacklogTaskList
            // FIXME: should be the bucket's tasks
            tasks={[]}
            backlog={backlog}
          />
        </HScrollChild>
      </HScrollContent>
    </SidebarLayout>
  );
}
