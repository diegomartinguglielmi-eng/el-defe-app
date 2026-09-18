const root = "./ui-operativa-base";
const port = Number(process.env.PORT || 8080);
Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    if (path.startsWith("/el-defe-app/")) path = path.slice("/el-defe-app".length);
    const safe = path.replace(/^\/+/, "");
    if (safe.includes("..")) return new Response("Bad request", { status: 400 });
    let file = Bun.file(root + "/" + safe);
    if (!(await file.exists())) {
      file = Bun.file(root + "/index.html");
      if (!(await file.exists())) return new Response("Not found", { status: 404 });
    }
    return new Response(file);
  }
});
console.log("Static staging UI on port " + port);
