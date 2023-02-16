import { redirect } from "@remix-run/node";
import { Link } from "@remix-run/react";
export { logoutAction as action } from "~/util/auth.server";

// FIXME: if you redirect here it doesn't reload all data, it acts like a normal
// data diff!
// export function loader() {
//   return redirect("/");
// }

export default function Logout() {
  return (
    <div>
      <h1>You've been logged out.</h1>
      <p>
        <Link to="/">Go home</Link>
      </p>
    </div>
  );
}
