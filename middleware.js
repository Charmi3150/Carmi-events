// Login voor de Carmi Events tool
const AUTH_USER = "Carmi";
const AUTH_PASS = "Events2026";

export const config = {
  matcher: "/:path*",
};

export default function middleware(request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const sep = decoded.indexOf(":");
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (user === AUTH_USER && pass === AUTH_PASS) {
        return; // geen response teruggeven = gewoon doorgaan naar de site
      }
    }
  }

  return new Response("Authenticatie vereist", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Carmi Events"' },
  });
}
