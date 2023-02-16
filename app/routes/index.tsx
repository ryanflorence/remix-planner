import { LoaderFunction, redirect } from "@remix-run/node";
import { requireAuthSession } from "~/util/auth.server";

export let loader: LoaderFunction = async ({ request }) => {
  await requireAuthSession(request);
  return redirect("/calendar");
};
