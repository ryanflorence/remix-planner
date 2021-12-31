import {
  Meta,
  Links,
  Scripts,
  LiveReload,
  Outlet,
  useLoaderData,
  NavLink,
  useTransition,
  useLocation,
} from "remix";
import type { LoaderFunction } from "remix";
import ringStyles from "react-circular-progressbar/dist/styles.css";
import { getAuthSession } from "~/util/auth.server";
import styles from "~/tailwind.css";
import { ArchiveIcon, CalendarIcon, LogoutIcon } from "./components/icons";

export function links() {
  return [
    { rel: "stylesheet", href: styles },
    { rel: "stylesheet", href: ringStyles },
  ];
}

export function meta() {
  return { title: "Ryan's Planner" };
}

export let loader: LoaderFunction = async ({ request }) => {
  let session = await getAuthSession(request);
  return { authenticated: Boolean(session) };
};

export default function Root() {
  let { authenticated } = useLoaderData();
  let transition = useTransition();
  let location = useLocation();
  let changingPages =
    transition.location &&
    transition.location.pathname.split("/")[1] !==
      location.pathname.split("/")[1];

  return (
    <html lang="en" className="overflow-hidden w-full">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover"
        />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 fixed overflow-hidden h-full w-full">
        {authenticated ? (
          <div className="flex flex-col overflow-hidden h-full lg:flex-row">
            <nav className="flex justify-around py-3 bg-gray-900 text-gray-500 lg:flex-col lg:py-4 lg:px-4 lg:justify-start lg:gap-6">
              <PrimaryNavLink to="/calendar">
                <CalendarIcon />
              </PrimaryNavLink>
              <PrimaryNavLink to="/buckets">
                <ArchiveIcon />
              </PrimaryNavLink>
              <div className="hidden lg:block lg:flex-1" />
              <form method="post" action="/auth/logout" className="lg:">
                <button type="submit">
                  <LogoutIcon />
                </button>
              </form>
            </nav>
            <div
              className={
                "flex-1 overflow-hidden" +
                " " +
                (changingPages ? "opacity-20 transition-opacity delay-500" : "")
              }
            >
              <Outlet />
            </div>
          </div>
        ) : (
          <Outlet />
        )}
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}

function PrimaryNavLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      children={children}
      className={({ isActive }) =>
        isActive ? "text-white" : "focus:text-gray-100"
      }
    />
  );
}
