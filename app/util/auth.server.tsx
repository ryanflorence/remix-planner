import crypto from "crypto";
import { renderToStaticMarkup } from "react-dom/server";
import createMailgun from "mailgun-js";
import type { ActionFunction, LoaderFunction, Session } from "remix";
import { createCookieSessionStorage, json, redirect } from "remix";

/*******************************************************************************
 * Before we can do anything, we need to make sure the environment has
 * everything we need. If anything is missing, we just prevent the app from
 * starting up.
 */
if (typeof process.env.ORIGIN !== "string")
  throw new Error("Missing `process.env.ORIGIN`");

if (typeof process.env.SESSION_SECRET !== "string")
  throw new Error("Missing `process.env.SESSION_SECRET`");

if (typeof process.env.MAGIC_LINK_SALT !== "string")
  throw new Error("Missing `process.env.MAGIC_LINK_SALT`");

if (typeof process.env.MAILGUN_KEY !== "string")
  throw new Error("Missing process.env.MAILGUN_KEY");

if (typeof process.env.MAILGUN_DOMAIN !== "string")
  throw new Error("Missing `process.env.MAILGUN_DOMAIN`");

/*******************************************************************************
 * 1. It all starts with a "user session". A session is a fancy type of cookie
 * that references data either in the cookie directly or in some other storage
 * like a database (and the cookie holds value that can access the other
 * storage). In our case we're going to keep the data in the cookie itself since
 * we don't know what kind of database you've got.
 */
let authSession = createCookieSessionStorage({
  cookie: {
    secrets: [process.env.SESSION_SECRET],
    path: "/",
    sameSite: "lax",
  },
});

// 30 days
let sessionMaxAge = /*seconds*/ 60 * /*hrs*/ 24 * /*days*/ 30;

/*******************************************************************************
 * 2. The whole point of authentication is to make sure we have a valid user
 * before showing them some pages. This function protects pages from
 * unauthenticated users. You call this from any loader/action that needs
 * authentication.
 *
 * This function will return the user session (with a way to refresh it, we'll
 * talk about that when you get to (7)). If there isn't a session, it redirects
 * to the "/login" route by throwing a redirect response.
 *
 * Because you can `throw` a response in Remix, your loaders and actions don't
 * have to worry about doing the redirects themselves. Code in the loader will
 * stop executing and this function peforms a redirect right here.
 *
 * 6. All future requests to loaders/actions that require a user session will
 * call this function and they'll get the session instead of a login redirect.
 * Sessions are stored with cookies which have a "max age" value. This is how
 * long you want the browser to hang on to the cookie. The `refresh` function
 * allows loaders and actions to "refresh" the max age so it's always "since the
 * user last used it". If we didn't refresh, then sessions would always expire
 * even if the user is on your site every day.
 */
export async function requireAuthSession(request: Request): Promise<Session> {
  let auth = await getAuthSession(request);

  if (!auth) {
    throw redirect("/login", {
      status: 303,
      headers: {
        "auth-redirect": getReferrer(request),
      },
    });
  }

  return auth;
}

export async function getAuthSession(
  request: Request
): Promise<null | Session> {
  let cookie = request.headers.get("cookie");
  let session = await authSession.getSession(cookie);

  if (!session.has("auth")) {
    return null;
  }

  // let refresh = async () =>
  //   new Headers({
  //     "Set-Cookie": await authSession.commitSession(session, {
  //       maxAge: sessionMaxAge,
  //     }),
  //   });

  return session;
}

/*******************************************************************************
 * 3. The user is redirected to this loader from `getAuthSession` if they
 * haven't logged in yet. It renders the route with a "referrer" so the token
 * can log them into the right page later.
 */
export let loginLoader: LoaderFunction = async ({ request }) => {
  return json({ landingPage: getReferrer(request) });
};

/*******************************************************************************
 * 4. After the user submits the form with their email address, we read the POST
 * body from the request, validate it, send the email, and finally render the
 * same route again but this time with action data. The UI then tells them to
 * check their email. We also set the email into the session so we can be sure
 * it's the same person clicking the link.
 */
export let loginAction: ActionFunction = async ({ request }) => {
  let body = Object.fromEntries(new URLSearchParams(await request.text()));

  if (typeof body.email !== "string" || body.email.indexOf("@") === -1) {
    throw json("Missing email", { status: 400 });
  }

  if (typeof body.landingPage !== "string") {
    throw json("Missing landing page", { status: 400 });
  }

  let cookie = request.headers.get("cookie");
  let session = await authSession.getSession(cookie);
  // make a token out of anything, probably should use UUID
  let token = encrypt(body.email);
  session.set("token", token);

  await sendMagicLinkEmail(body.email, body.landingPage, token);

  return json("ok", {
    headers: {
      "Set-Cookie": await authSession.commitSession(session),
    },
  });
};

/*******************************************************************************
 * 5. When the user clicks the link in their email we validate the token. If
 * it's valid, we set "auth" in the session as we redirect to the landing page.
 * We've got a user session! If it's invalid the user will get a 400 error.
 *
 * You might also do some work with your database here, like create a user
 * record.
 *
 * Now all future requests will have a user session, so go back to (6).
 */
export let validateMagicLinkLoader: LoaderFunction = async ({ request }) => {
  let magicToken = getMagicToken(request);

  if (typeof magicToken !== "string") {
    throw invalidLink();
  }

  let cookie = request.headers.get("Cookie");
  let session = await authSession.getSession(cookie);

  let magicLinkPayload = getMagicLink(magicToken);
  // make sure it came from the device that sent the link
  if (magicLinkPayload.token !== session.get("token")) {
    throw new Response("", { status: 401, statusText: "Not Authorized" });
  }

  // might want to create user in the db
  // might want to create a db session instead of a cookie session
  // might set the user.id or session.id from a db instead of email
  if (session) session.set("auth", magicLinkPayload.email);

  return redirect(magicLinkPayload.landingPage, {
    headers: {
      "Set-Cookie": await authSession.commitSession(session, {
        maxAge: sessionMaxAge,
      }),
    },
  });
};

/*******************************************************************************
 * When the user clicks the logout button we call this action and destroy the
 * session.
 */
export let logoutAction: ActionFunction = async ({ request }) => {
  let session = await authSession.getSession();
  return json(null, {
    headers: {
      "Set-Cookie": await authSession.destroySession(session),
    },
  });
};

////////////////////////////////////////////////////////////////////////////////
function getMagicToken(request: Request) {
  let { searchParams } = new URL(request.url);
  return searchParams.get(magicLinkSearchParam);
}

function getMagicLink(magicToken: string) {
  try {
    return validateMagicLink(magicToken);
  } catch (e) {
    throw invalidLink();
  }
}

function invalidLink() {
  return json("Invalid magic link", { status: 400 });
}

function getReferrer(request: Request) {
  // This doesn't work with all remix adapters yet, so pick a good default
  let referrer = request.referrer;
  if (referrer) {
    let url = new URL(referrer);
    return url.pathname + url.search;
  }
  return "/";
}

let magicLinkSearchParam = "magic";
let linkExpirationTime = 1000 * 60 * 30;
let algorithm = "aes-256-ctr";
let ivLength = 16;

let encryptionKey = crypto.scryptSync(process.env.MAGIC_LINK_SALT, "salt", 32);

function encrypt(text: string) {
  let iv = crypto.randomBytes(ivLength);
  let cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  let encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(text: string) {
  let [ivPart, encryptedPart] = text.split(":");
  if (!ivPart || !encryptedPart) {
    throw new Error("Invalid text.");
  }

  let iv = Buffer.from(ivPart, "hex");
  let encryptedText = Buffer.from(encryptedPart, "hex");
  let decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv);
  let decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);
  return decrypted.toString();
}

type MagicLinkPayload = {
  email: string;
  landingPage: string;
  creationDate: string;
  token: string;
};

function generateMagicLink(email: string, landingPage: string, token: string) {
  let payload: MagicLinkPayload = {
    email,
    landingPage,
    creationDate: new Date().toISOString(),
    token,
  };
  let stringToEncrypt = JSON.stringify(payload);
  let encryptedString = encrypt(stringToEncrypt);
  let url = new URL(process.env.ORIGIN as string);
  url.pathname = "/auth/validate";
  url.searchParams.set(magicLinkSearchParam, encryptedString);
  return url.toString();
}

function isMagicLinkPayload(obj: any): obj is MagicLinkPayload {
  return (
    typeof obj === "object" &&
    typeof obj.email === "string" &&
    typeof obj.landingPage === "string" &&
    typeof obj.creationDate === "string"
  );
}

function validateMagicLink(link: string) {
  let decryptedString = decrypt(link);
  let payload = JSON.parse(decryptedString);

  if (!isMagicLinkPayload(payload)) {
    throw invalidLink();
  }

  let linkCreationDate = new Date(payload.creationDate);
  let expirationTime = linkCreationDate.getTime() + linkExpirationTime;

  if (Date.now() > expirationTime) {
    throw invalidLink();
  }

  return payload;
}

/*******************************************************************************
 * Email handled by mailgun
 */
let mailgun = createMailgun({
  apiKey: process.env.MAILGUN_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

async function sendMagicLinkEmail(
  email: string,
  landingPage: string,
  token: string
) {
  let link = generateMagicLink(email, landingPage, token);

  let html = renderToStaticMarkup(
    <>
      <p style={{ fontWeight: "bold" }}>Magic link demo email.</p>
      <p>(kinda cool we can use JSX to write html email yeah?!)</p>
      <p>
        Just click this <a href={link}>link</a> and you're logged in!
      </p>
    </>
  );

  if (process.env.NODE_ENV === "production") {
    return mailgun.messages().send({
      from: "Remix Magic Link Demo <ryan@remix.run>",
      to: email,
      subject: "Login to Planner!",
      html,
    });
  } else {
    console.log(html);
  }
}
