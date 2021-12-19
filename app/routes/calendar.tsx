import { Outlet, redirect, json } from "remix";
import type { LoaderFunction } from "remix";
import { requireAuthSession } from "~/util/auth.server";
import { getBacklog } from "~/models/task";
import { format } from "date-fns";
import { CACHE_CONTROL } from "~/util/http";

export let loader: LoaderFunction = async ({ request, params }) => {
  if (!params.day) {
    let today = new Date();
    return redirect(`/calendar/${format(today, "yyyy-MM-dd")}`);
  }

  let session = await requireAuthSession(request);
  let userId = session.get("id");
  let backlog = await getBacklog(userId);

  return json(backlog, {
    headers: { "Cache-Control": CACHE_CONTROL.none },
  });
};

export default function Calendar() {
  return <Outlet />;
}
