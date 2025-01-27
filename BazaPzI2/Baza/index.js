const http = require("http");
const fs = require("fs");
const mime = require("mime-types");
const url = require("node:url");

const handlers = require("./handlers");

function serveStatic(req, res) {
    const method = req.method;
    if (method != "GET") return false;

    const url = req.url;
    let doc = "./public" + url;
    if (doc.endsWith("/")) doc = doc + "index.html";

    try {
        let data = fs.readFileSync(doc);
        let mt = mime.lookup(doc);
        res.writeHead(200, { "Content-type": mt });
        res.write(data);
        res.end();
        return true;
    } catch (err) {
        return false;
    }
}

function 
quest(req, res) {
    let data = "";
    req.on("data", function (part) {
        data = data + part;
    });

    req.on("end", function () {
        const headers = req.headers;
        let q = new url.URL(req.url, "http://localhost/");
        let pathname = q.pathname;
        const method = req.method;
        let handled = false;
        let handler = handlers.get(pathname);

        if (handler != undefined) {
            if (req.headers["content-type"] == "application/json") {
                data = JSON.parse(data);
            }
            handled = handler(req, res, q, data);
        }

        if (!handled) {
            handled = serveStatic(req, res);
        }

        if (!handled) {
            res.statusCode = 404;
            res.end();
        }
    });
}

const server = http.createServer(handleRequest);
server.listen(8080);