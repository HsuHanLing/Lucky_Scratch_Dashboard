import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const port = Number(process.argv[2] || process.env.PORT || 4182);
const host = process.env.HOST || "127.0.0.1";
const root = path.resolve(import.meta.dirname);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".csv", "text/csv; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

function resolveRequestPath(requestUrl = "/") {
  const rawPath = requestUrl.split("?")[0] || "/";
  const decoded = decodeURIComponent(rawPath === "/" ? "/index.html" : rawPath);
  const relativePath = decoded.replace(/^[/\\]+/, "");
  const fullPath = path.resolve(root, relativePath);
  return fullPath.startsWith(root) ? fullPath : null;
}

const server = http.createServer(async (request, response) => {
  try {
    const filePath = resolveRequestPath(request.url);
    if (!filePath) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const body = await fs.readFile(filePath);
    const type = contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end(error.message);
  }
});

server.listen(port, host, () => {
  console.log(`Lucky Draw dashboard running at http://${host}:${port}`);
});
