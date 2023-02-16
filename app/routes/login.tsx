import { useEffect, useState } from "react";
import { Form, useActionData, useLoaderData, useTransition } from "@remix-run/react";
import { Button, TextInput } from "~/components/forms";
export {
  loginAction as action,
  loginLoader as loader,
} from "~/util/auth.server";

export default function Index() {
  let loaderData = useLoaderData();
  let actionData = useActionData();
  let transition = useTransition();

  return (
    <div className="flex h-full justify-center items-center">
      <div className="text-center">
        <div>
          <h1 className="text-5xl font-black text-black">Planner</h1>
          <div className="text-2xl">Get your 💩 together</div>
        </div>
        <div className="h-8" />
        <div className="h-12">
          {actionData === "ok" ? (
            <p
              className="text-xl text-indigo-500 rounded p-1"
              aria-live="polite"
            >
              Check your email to log in!
            </p>
          ) : (
            <Form method="post" className="flex gap-1">
              <input
                type="hidden"
                name="landingPage"
                value={loaderData.landingPage}
              />
              <TextInput
                placeholder="you@example.com"
                aria-label="email address"
                type="email"
                required
                name="email"
                className="w-60"
              />
              <Button
                type="submit"
                disabled={transition.state === "submitting"}
                className="w-32"
              >
                {transition.state === "submitting" ? (
                  <LoadingDots />
                ) : (
                  "Sign in"
                )}
              </Button>
            </Form>
          )}
        </div>

        <div className="h-[25vh]" />
      </div>
    </div>
  );
}

function LoadingDots() {
  let [n, setN] = useState(1);

  useEffect(() => {
    let id = setTimeout(() => setN(n + 1), 250);
    return () => clearTimeout(id);
  }, [n]);

  return <span>{Array.from({ length: n % 4 }).fill(".")}</span>;
}
