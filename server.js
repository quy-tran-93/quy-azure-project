const http = require("http");

const port = process.env.PORT || 8080;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;

  if (path === "/") {
    console.log("Home page requested");
    sendText(res, 200, "SCC JD Azure App Service lab is running.");
    return;
  }

  if (path === "/config") {
    console.log("Config endpoint requested");
    sendJson(res, 200, {
      message: process.env.LAB_MESSAGE || "LAB_MESSAGE is not set",
      environment: process.env.APP_ENV || "APP_ENV is not set"
    });
    return;
  }

  if (path === "/log") {
    console.log("This is a test log from the /log endpoint");
    sendText(res, 200, "A test log has been written. Check Log stream.");
    return;
  }

  if (path === "/error") {
    console.error("Simulated production error from the /error endpoint");
    sendText(res, 500, "Simulated server error");
    return;
  }

  if (path === "/slow") {
    console.log("Slow endpoint requested");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    sendText(res, 200, "This response was delayed by 3 seconds.");
    return;
  }

  if (path === "/instance") {
    console.log("Instance endpoint requested");
    sendJson(res, 200, {
      instanceId: process.env.WEBSITE_INSTANCE_ID || "single-instance-or-local",
      siteName: process.env.WEBSITE_SITE_NAME || "local"
    });
    return;
  }

  console.warn(`Not found: ${path}`);
  sendText(res, 404, "Not found");
});

server.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
