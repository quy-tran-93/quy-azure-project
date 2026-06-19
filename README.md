# SCC JD Node Lab

Small Node.js app for testing Azure App Service basics.

## Endpoints

- `/` - confirms the app is running.
- `/config` - reads App Service environment variables.
- `/log` - writes a test log.
- `/error` - returns HTTP 500 for error metrics.
- `/slow` - waits 3 seconds to test response time.
- `/instance` - shows the App Service instance id.

## Local Run

```bash
npm start
```

Open `http://localhost:8080`.
