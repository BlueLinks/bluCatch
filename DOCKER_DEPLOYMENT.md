# 🐳 BluCatch - Docker Deployment Guide

## 📋 Overview

This guide will help you deploy the BluCatch application to your home server using Docker. The containerized version is optimized for production with:

-   **Multi-stage build** for minimal image size
-   **Nginx** for efficient static file serving
-   **Gzip compression** for faster loading
-   **Security headers** for protection
-   **Health checks** for monitoring

## 🚀 Quick Start

### Prerequisites

-   Docker and Docker Compose installed on your home server
-   Basic familiarity with Docker commands

### 1. Build and Run

```bash
# Clone or copy the project to your home server
cd /path/to/blucatch

# Build and start the container
docker-compose up -d

# Check if it's running
docker-compose ps
```

### 2. Access the Application

-   **Local access**: `http://localhost:3000`
-   **Network access**: `http://YOUR_SERVER_IP:3000`

## 🔧 Configuration Options

### Port Configuration

To change the port, edit `docker-compose.yml`:

```yaml
ports:
    - "8080:80" # Change 8080 to your desired port
```

### Reverse Proxy Setup (Optional)

If you're using Traefik or another reverse proxy, the compose file includes Traefik labels:

```yaml
labels:
    - "traefik.enable=true"
    - "traefik.http.routers.pokemon-calculator.rule=Host(`pokemon-calculator.local`)"
```

## 📊 Monitoring

### Health Check

The application includes a health check endpoint:

```bash
# Check container health
docker-compose ps

# Manual health check
curl http://localhost:3000/health
```

### Logs

```bash
# View application logs
docker-compose logs -f blucatch

# View logs with timestamps
docker-compose logs -f -t blucatch
```

## 🔄 Updates

### Updating the Application

```bash
# Pull latest changes (if using git)
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Data Persistence

The application data (`public/data/`) is built into the image, so updates will include the latest Pokémon data automatically.

## 🛠️ Advanced Configuration

### Custom Nginx Configuration

To modify nginx settings, edit `nginx.conf` and rebuild:

```bash
docker-compose down
docker-compose up -d --build
```

### Environment Variables

Add environment variables to `docker-compose.yml`:

```yaml
environment:
    - NODE_ENV=production
    - CUSTOM_VAR=value
```

## 🗂️ File Structure

### Included in Container

-   ✅ `src/` - React application source
-   ✅ `public/data/` - Pokémon data files
-   ✅ `public/images/` - Game box art
-   ✅ `index.html` - Main HTML file
-   ✅ `vite.config.js` - Build configuration

### Excluded from Container

-   ❌ `scripts/` - Development scripts
-   ❌ `backups/` - Backup files
-   ❌ `*.md` - Documentation files
-   ❌ `*.log` - Log files
-   ❌ `node_modules/` - Dependencies (installed fresh)

## 🔒 Security Features

The container includes several security measures:

-   **Security headers** (X-Frame-Options, X-Content-Type-Options, etc.)
-   **Non-root user** (nginx runs as non-root)
-   **Minimal base image** (nginx:alpine)
-   **No unnecessary packages** or services

## 🚨 Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs pokemon-calculator

# Check if port is available
netstat -tulpn | grep :3000
```

### Application Not Loading

```bash
# Check if container is healthy
docker-compose ps

# Test health endpoint
curl http://localhost:3000/health

# Check nginx configuration
docker-compose exec blucatch nginx -t
```

### Performance Issues

```bash
# Check resource usage
docker stats blucatch

# Monitor logs for errors
docker-compose logs -f blucatch
```

## 📈 Performance

The containerized version is optimized for:

-   **Fast startup** (~5-10 seconds)
-   **Low memory usage** (~50-100MB)
-   **Efficient caching** (1-year cache for static assets)
-   **Gzip compression** (reduces transfer size by ~70%)

## 🔄 Backup and Restore

### Creating Backups

```bash
# Backup the entire project
tar -czf blucatch-backup-$(date +%Y%m%d).tar.gz .

# Backup just the data
cp -r public/data/ blucatch-data-backup-$(date +%Y%m%d)/
```

### Restoring from Backup

```bash
# Stop the container
docker-compose down

# Restore files
tar -xzf blucatch-backup-YYYYMMDD.tar.gz

# Rebuild and start
docker-compose up -d --build
```

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f blucatch`
2. Verify the health check: `curl http://localhost:3000/health`
3. Check container status: `docker-compose ps`
4. Review this guide for troubleshooting steps

---

**Happy Pokémon hunting! 🎮✨**
