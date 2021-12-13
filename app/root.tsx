import { Meta, Links, Scripts, LiveReload, useCatch, Outlet } from "remix";
import styles from "~/tailwind.css";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

function Document({ children }: { children: React.ReactNode }) {
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
        {children}
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}

export default function App() {
  return (
    <Document>
      <Outlet />
    </Document>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <Document>
      <h1>App Error</h1>
      <pre>{error.stack}</pre>
      <p>
        Replace this UI with what you want users to see when your app throws
        uncaught errors.
      </p>
    </Document>
  );
}

export function CatchBoundary() {
  let caught = useCatch();
  return (
    <Document>
      <h1>
        {caught.status} {caught.statusText}
      </h1>
    </Document>
  );
}
