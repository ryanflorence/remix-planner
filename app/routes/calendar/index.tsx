import { LoaderFunction, redirect } from "remix";
import { requireAuthSession } from "~/util/auth.server";
import { format } from "date-fns";

export let loader: LoaderFunction = async ({ request }) => {
  await requireAuthSession(request);
  // TODO: use the user's timezone, not the server's
  let today = new Date();
  return redirect(`/calendar/${format(today, "yyyy-MM-dd")}`);
};
