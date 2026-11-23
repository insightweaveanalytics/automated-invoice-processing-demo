const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]]
]);

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const asset = assets.get(pathname);
  if (!asset) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const filePath = path.join(root, asset[0]);
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Could not read demo asset");
      return;
    }
    response.writeHead(200, {
      "content-type": asset[1],
      "x-content-type-options": "nosniff",
      "cache-control": "no-store"
    });
    response.end(data);
  });
});

const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => {
  console.log(`Invoice Processing Demo available at http://127.0.0.1:${port}`);
  console.log("Press Ctrl+C to stop the local server.");
});
