# Docker Setup Guide for Retro AI

This guide explains how to run Retro AI using Docker Compose with best practices for both development and production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [pgAdmin Access](#pgadmin-access)
- [Environment Variables](#environment-variables)
- [Docker Profiles](#docker-profiles)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Quick Start

### Development

1. Copy the example environment file:
```bash
cp .env.docker.example .env.docker
```

2. Update `.env.docker` with development values:
```bash
NODE_ENV=development
DB_PASSWORD=devpassword
PGADMIN_PASSWORD=admin
BETTER_AUTH_SECRET=dev-secret-key
```

3. Start the services:
```bash
docker-compose up
```

This will start:
- Next.js app on http://localhost:3000
- Socket.io on http://localhost:3001
- PostgreSQL on localhost:5432
- pgAdmin on http://localhost:5050

### Production

1. Copy and configure environment file:
```bash
cp .env.docker.example .env.docker
# Edit .env.docker with production values
```

2. Generate secure secrets:
```bash
# Generate Better Auth secret
openssl rand -base64 32

# Generate strong passwords for database and pgAdmin
```

3. Start production services:
```bash
docker-compose --profile production up -d
```

## Cloudflare Tunnel Deployment (Coolify)

If you're using Cloudflare Tunnel through Coolify or similar platforms, use the optimized configuration that excludes nginx to avoid double proxy conflicts:

### Why a Separate Configuration?

Cloudflare Tunnel already provides:
- Reverse proxy functionality
- SSL/TLS termination at the edge
- DDoS protection
- Load balancing

Having nginx in addition creates a double proxy situation that causes conflicts and adds unnecessary latency.

### Using docker-compose.cloudflare.yml

1. **Use the Cloudflare-optimized compose file**:
```bash
docker-compose -f docker-compose.cloudflare.yml up -d
```

2. **Configure Cloudflare Tunnel in Coolify**:
   - Point to `http://app:3000` for the main application
   - Configure `http://app:3001` for Socket.io (or use subdomain routing)
   - No external ports needed - everything routes through the tunnel

3. **Environment Variables in Coolify**:
```bash
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
BETTER_AUTH_SECRET=<your-secret>
DATABASE_URL=postgresql://retroai:password@db:5432/retroai
RESEND_API_KEY=re_your_key
```

4. **Access pgAdmin** (SSH tunnel only for security):
```bash
ssh -L 5050:pgadmin:80 your-server.com
# Then access http://localhost:5050
```


## Architecture Overview

The Docker setup includes the following services:

### Core Services
- **app**: Next.js application with Socket.io server
- **db**: PostgreSQL 15 database
- **pgadmin**: Database administration tool (internal network only)

### Optional Services
- **nginx**: Reverse proxy for production (profile: production)
- **redis**: Caching layer (profile: cache)

### Networks
- **retro-internal**: Internal network for database and backend services (isolated)
- **retro-frontend**: Frontend network for web-facing services

## Development Setup

The `docker-compose.override.yml` file automatically applies development-specific configurations:

### Features
- Hot reload with volume mounts
- Exposed database port for external tools
- pgAdmin accessible on port 5050
- Node.js debugger on port 9229
- Email via Resend API (console logging in development if not configured)

### Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Application | http://localhost:3000 | N/A |
| Socket.io | http://localhost:3001 | N/A |
| pgAdmin | http://localhost:5050 | admin@localhost / admin |
| PostgreSQL | localhost:5432 | retroai / devpassword |

## Production Setup

### 1. Environment Configuration

Create a production `.env.docker` file:

```bash
NODE_ENV=production
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
BETTER_AUTH_SECRET=<generated-secret>
DB_PASSWORD=<strong-password>
PGADMIN_PASSWORD=<strong-password>
RESEND_API_KEY=re_your_actual_key
EMAIL_FROM=noreply@your-domain.com
```

### 2. SSL Configuration

For HTTPS, place SSL certificates in `docker/nginx/ssl/`:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

### 3. Start Services

```bash
# Start with production profile
docker-compose --profile production up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Database Migrations

Migrations run automatically on startup. To run manually:

```bash
docker-compose exec app npx prisma migrate deploy
```

## pgAdmin Access

pgAdmin is configured for internal network access only to enhance security.

### Development Access
- URL: http://localhost:5050
- Email: admin@localhost
- Password: admin

### Production Access

pgAdmin should NOT be exposed to the internet. Access methods:

#### Option 1: SSH Tunnel (Recommended)
```bash
ssh -L 5050:localhost:5050 your-server.com
# Then access http://localhost:5050
```

#### Option 2: Docker Exec
```bash
docker exec -it retro-ai-pgadmin /bin/sh
```

#### Option 3: Internal Network Only
Configure nginx to proxy pgAdmin with IP restrictions (see nginx config).

### Pre-configured Database

The database connection is pre-configured in pgAdmin. After login:
1. Expand "Servers" → "Docker Containers"
2. Select "Retro AI Database"
3. Enter database password when prompted

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BETTER_AUTH_SECRET` | Authentication secret | Generate with `openssl rand -base64 32` |
| `DB_PASSWORD` | PostgreSQL password | Strong password |
| `PGADMIN_PASSWORD` | pgAdmin login password | Strong password |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | production |
| `DB_NAME` | Database name | retroai |
| `DB_USER` | Database user | retroai |
| `SOCKET_PORT` | Socket.io port | 3001 |
| `NGINX_HTTP_PORT` | HTTP port | 80 |
| `NGINX_HTTPS_PORT` | HTTPS port | 443 |

## Docker Profiles

Use profiles to enable optional services:

```bash
# Default (app, db only)
docker-compose up

# With pgAdmin
docker-compose --profile tools up

# With nginx (production)
docker-compose --profile production up

# With Redis cache
docker-compose --profile cache up

# Multiple profiles
docker-compose --profile tools --profile cache up
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database logs
docker-compose logs db

# Verify database is healthy
docker-compose ps

# Test connection
docker-compose exec db psql -U retroai -d retroai
```

#### 2. pgAdmin Cannot Connect
```bash
# Ensure database is running
docker-compose ps db

# Check network connectivity
docker-compose exec pgadmin ping db

# Verify credentials in .env.docker
```

#### 3. Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Change port in .env.docker or docker-compose.override.yml
```

#### 4. Permission Denied
```bash
# Fix volume permissions
sudo chown -R $(id -u):$(id -g) .
```

### Useful Commands

```bash
# View all logs
docker-compose logs -f

# Restart a specific service
docker-compose restart app

# Execute command in container
docker-compose exec app npm run lint

# Clean up everything
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Check resource usage
docker stats
```

## Security Considerations

### Production Checklist

- [ ] Strong, unique passwords for all services
- [ ] SSL certificates configured for HTTPS
- [ ] pgAdmin not exposed to internet
- [ ] Database port not exposed externally
- [ ] Environment variables secured
- [ ] Regular security updates for images
- [ ] Resource limits configured
- [ ] Logging and monitoring enabled

### Best Practices

1. **Never expose pgAdmin to the internet** - Use SSH tunnels or VPN
2. **Use secrets management** - Consider Docker secrets or external vaults
3. **Regular backups** - Implement automated database backups
4. **Update regularly** - Keep Docker images updated
5. **Monitor logs** - Set up log aggregation and monitoring
6. **Network isolation** - Use internal networks for sensitive services
7. **Rate limiting** - Configure nginx rate limiting for APIs

### Database Backups

```bash
# Backup database
docker-compose exec db pg_dump -U retroai retroai > backup.sql

# Restore database
docker-compose exec -T db psql -U retroai retroai < backup.sql

# Automated backup script
docker-compose exec db sh -c 'pg_dump -U retroai retroai | gzip > /backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz'
```

## Maintenance

### Updating Services

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Remove unused images
docker image prune -a
```

### Monitoring

```bash
# Check container health
docker-compose ps

# View resource usage
docker stats

# Check logs for errors
docker-compose logs --tail=100 | grep ERROR
```

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker-compose logs [service]`
3. Open an issue on GitHub with relevant log output