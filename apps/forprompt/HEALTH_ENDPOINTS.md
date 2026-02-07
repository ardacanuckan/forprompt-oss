# Health Monitoring API Endpoints

This document describes the health monitoring endpoints available in the ForPrompt Next.js application. These endpoints are essential for container orchestration, load balancers, and monitoring systems.

## Endpoints Overview

| Endpoint | Purpose | Success Code | Failure Code |
|----------|---------|--------------|--------------|
| `GET /api/health` | Liveness check | 200 | - |
| `GET /api/ready` | Readiness check | 200 | 503 |

---

## GET /api/health

Basic health check endpoint that indicates whether the application is running. Use this for Docker HEALTHCHECK and load balancer health checks.

### Response

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": {
    "seconds": 3600,
    "formatted": "1h 0m 0s"
  },
  "timestamp": "2025-01-19T12:00:00.000Z",
  "environment": "production",
  "responseTime": 1
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"healthy" \| "unhealthy"` | Current health status |
| `version` | `string` | Application version (from `APP_VERSION` env var) |
| `uptime.seconds` | `number` | Server uptime in seconds |
| `uptime.formatted` | `string` | Human-readable uptime (e.g., "1d 2h 30m 45s") |
| `timestamp` | `string` | ISO 8601 timestamp of the response |
| `environment` | `string` | Current `NODE_ENV` value |
| `responseTime` | `number` | Request processing time in milliseconds |

### Usage

**Docker HEALTHCHECK:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

**docker-compose.yml:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**curl:**
```bash
curl http://localhost:3000/api/health
```

---

## GET /api/ready

Readiness check endpoint that verifies all critical dependencies are available before accepting traffic. Use this for Kubernetes readiness probes or load balancer backend health checks.

### Response (Ready)

```json
{
  "status": "ready",
  "timestamp": "2025-01-19T12:00:00.000Z",
  "responseTime": 150,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 45
    },
    "auth": {
      "status": "healthy",
      "latency": 100
    },
    "redis": {
      "status": "not_configured"
    }
  }
}
```

### Response (Not Ready)

```json
{
  "status": "not_ready",
  "timestamp": "2025-01-19T12:00:00.000Z",
  "responseTime": 5012,
  "checks": {
    "database": {
      "status": "unhealthy",
      "latency": 5000,
      "error": "Connection timeout"
    },
    "auth": {
      "status": "healthy",
      "latency": 50
    },
    "redis": {
      "status": "not_configured"
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"ready" \| "not_ready"` | Overall readiness status |
| `timestamp` | `string` | ISO 8601 timestamp |
| `responseTime` | `number` | Total request processing time in ms |
| `checks` | `object` | Individual dependency check results |

### Dependency Check Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"healthy" \| "unhealthy" \| "not_configured"` | Dependency status |
| `latency` | `number` | Check latency in milliseconds (optional) |
| `error` | `string` | Error message if unhealthy (optional) |

### Dependencies Checked

| Dependency | Required | Description |
|------------|----------|-------------|
| `database` | Yes | Convex database connectivity |
| `auth` | Yes | Clerk authentication provider |
| `redis` | No | Redis cache (only if `REDIS_URL` is configured) |

### HTTP Status Codes

- **200 OK**: All required dependencies are healthy
- **503 Service Unavailable**: One or more required dependencies are unhealthy

### Usage

**Kubernetes Readiness Probe:**
```yaml
readinessProbe:
  httpGet:
    path: /api/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 10
  failureThreshold: 3
```

**Kubernetes Liveness Probe:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 20
  timeoutSeconds: 5
  failureThreshold: 3
```

**curl:**
```bash
curl -w "%{http_code}" http://localhost:3000/api/ready
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_VERSION` | No | `"0.0.0"` | Application version for health response |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | - | Convex deployment URL |
| `CLERK_SECRET_KEY` | Yes | - | Clerk secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | - | Clerk publishable key |
| `REDIS_URL` | No | - | Redis connection URL (if using Redis) |

---

## Best Practices

### Health vs Readiness

- **Health (`/api/health`)**: Use for liveness checks. Should be fast and always return 200 if the process is running. Used to detect if a container needs to be restarted.

- **Readiness (`/api/ready`)**: Use for traffic routing. Checks if the application can accept requests. May return 503 during startup or when dependencies are unavailable.

### Monitoring

1. **Alert on health failures**: If `/api/health` returns unhealthy, the container may need attention
2. **Track readiness metrics**: Monitor `/api/ready` latency and dependency status
3. **Use response times**: Track `responseTime` field for performance monitoring

### Container Orchestration

- Use `/api/health` for Docker HEALTHCHECK and Kubernetes liveness probes
- Use `/api/ready` for Kubernetes readiness probes and load balancer health checks
- Configure appropriate timeouts (recommended: 10s for health, 15s for readiness)
