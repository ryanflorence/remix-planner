import { Outlet, redirect, json } from "remix";
import type { LoaderFunction } from "remix";
import { requireAuthSession } from "~/util/auth.server";
import { ensureUserAccount } from "~/util/account.server";
import { getBacklog } from "~/models/task";
import { format } from "date-fns";
import { CACHE_CONTROL } from "~/util/http";

export let loader: LoaderFunction = async ({ request, params }) => {
  if (!params.day) {
    let today = new Date();
    return redirect(`/calendar/${format(today, "yyyy-MM-dd")}`);
  }

  let session = await requireAuthSession(request);
  let user = await ensureUserAccount(session.get("auth"));
  let backlog = await getBacklog(user.id);
  return json(backlog, {
    headers: { "Cache-Control": CACHE_CONTROL.safePrefetch },
  });
};

export default function Calendar() {
  return <Outlet />;
}
