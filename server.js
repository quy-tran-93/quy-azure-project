const sql = require("mssql");
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

async function getSqlPool() {
  const connectionString = process.env.SQL_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error("SQL_CONNECTION_STRING is not set");
  }

  const pool = new sql.ConnectionPool(connectionString);
  await pool.connect();
  return pool;
}

async function insertIncident() {
  const pool = await getSqlPool();

  try {
    const request = pool.request()
      .input("ServiceName", sql.NVarChar(100), "app-scc-jd-lab-quy")
      .input("Severity", sql.NVarChar(20), "Low")
      .input("Status", sql.NVarChar(20), "AutoInserted");

    try {
      return await request.query(`
        INSERT INTO Incidents (ServiceName, Severity, Status, CreatedAt)
        OUTPUT INSERTED.IncidentId, INSERTED.ServiceName, INSERTED.Severity, INSERTED.Status, INSERTED.CreatedAt
        VALUES (@ServiceName, @Severity, @Status, GETDATE());
      `);
    } catch (error) {
      if (!error.message.includes("Cannot insert the value NULL into column 'IncidentId'")) {
        throw error;
      }

      const incidentId = Math.floor(Date.now() % 2147483647);

      return await pool.request()
        .input("IncidentId", sql.Int, incidentId)
        .input("ServiceName", sql.NVarChar(100), "app-scc-jd-lab-quy")
        .input("Severity", sql.NVarChar(20), "Low")
        .input("Status", sql.NVarChar(20), "AutoInserted")
        .query(`
          INSERT INTO Incidents (IncidentId, ServiceName, Severity, Status, CreatedAt)
          OUTPUT INSERTED.IncidentId, INSERTED.ServiceName, INSERTED.Severity, INSERTED.Status, INSERTED.CreatedAt
          VALUES (@IncidentId, @ServiceName, @Severity, @Status, GETDATE());
        `);
    }
  } finally {
    await pool.close();
  }
}

async function getLatestIncidents() {
  const pool = await getSqlPool();

  try {
    return await pool.request().query(`
      SELECT TOP (10)
        IncidentId,
        ServiceName,
        Severity,
        Status,
        CreatedAt
      FROM Incidents
      ORDER BY CreatedAt DESC, IncidentId DESC;
    `);
  } finally {
    await pool.close();
  }
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;

  if (path === "/") {
    console.log("Home page requested");
    sendText(res, 200, "Quy update - SCC JD Azure App Service lab is running.");
    return;
  }

  if (path === "/config") {
    console.log("Config endpoint requested");
    sendJson(res, 200, {
      message: process.env.LAB_MESSAGE || "LAB_MESSAGE is not set",
      environment: process.env.APP_ENV || "APP_ENV is not set",
      sqlConnectionStringConfigured: Boolean(process.env.SQL_CONNECTION_STRING)
    });
    return;
  }

  if (path === "/sql-test") {
    try {
      const result = await insertIncident();
      console.log("Inserted incident into Azure SQL Database");
      sendJson(res, 200, {
        message: "Inserted one incident into Azure SQL Database.",
        inserted: result.recordset[0]
      });
    } catch (error) {
      console.error("SQL insert failed", error);
      sendJson(res, 500, {
        message: "SQL insert failed",
        error: error.message
      });
    }
    return;
  }

  if (path === "/sql-incidents") {
    try {
      const result = await getLatestIncidents();
      console.log("Fetched latest incidents from Azure SQL Database");
      sendJson(res, 200, {
        count: result.recordset.length,
        incidents: result.recordset
      });
    } catch (error) {
      console.error("SQL query failed", error);
      sendJson(res, 500, {
        message: "SQL query failed",
        error: error.message
      });
    }
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
