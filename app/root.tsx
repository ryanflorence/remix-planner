import { Meta, Links, Scripts, LiveReload, Outlet } from "remix";
import ringStyles from "react-circular-progressbar/dist/styles.css";
import styles from "~/tailwind.css";

export function links() {
  return [
    { rel: "stylesheet", href: styles },
    { rel: "stylesheet", href: ringStyles },
  ];
}

export default function Root() {
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
        <Outlet />
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}
