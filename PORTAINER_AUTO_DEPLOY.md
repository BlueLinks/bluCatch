# Portainer Auto-Deploy Setup

## Overview

Automatically redeploy your app when you push to GitHub.

## Method 1: Portainer Webhook (Easy)

### Step 1: Enable Webhook in Portainer

1. Go to Portainer → **Stacks** → Click your stack (e.g., `blucatch`)
2. Scroll down to find the **Webhook** section
3. Click **Create a webhook**
4. Copy the webhook URL (looks like: `https://your-portainer.com/api/webhooks/xxx`)

### Step 2: Add Webhook to GitHub

1. Go to your GitHub repo: `https://github.com/BlueLinks/bluCatch`
2. Click **Settings** → **Webhooks** → **Add webhook**
3. Configure:
    - **Payload URL**: Paste the Portainer webhook URL
    - **Content type**: `application/json`
    - **Which events**: Select "Just the push event"
    - **Active**: ✓ Checked
4. Click **Add webhook**

### Step 3: Test It

1. Push a commit to GitHub
2. GitHub will trigger the webhook
3. Portainer will:
    - Pull latest images
    - Recreate containers
    - Your app updates automatically! 🎉

---

## Method 2: Watchtower (⭐ Best for Local Networks)

**Perfect if Portainer is on your local network!** No public exposure needed.

### Add Watchtower to docker-compose.yml

```yaml
services:
    # ... your existing services ...

    watchtower:
        image: containrrr/watchtower
        container_name: watchtower
        restart: unless-stopped
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
        environment:
            - WATCHTOWER_POLL_INTERVAL=300 # Check every 5 minutes
            - WATCHTOWER_CLEANUP=true # Remove old images
            - WATCHTOWER_INCLUDE_STOPPED=true
        command: blucatch blucatch-scraper # Only watch these containers
```

### How It Works:

-   Watchtower checks for new images every 5 minutes
-   When you push code and rebuild images, it auto-updates containers
-   No webhook needed!

---

## Method 3: GitHub Actions + Docker Hub (Most Automated)

### Step 1: Create GitHub Action

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
    push:
        branches: [main]

jobs:
    build:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3

            - name: Login to Docker Hub
              uses: docker/login-action@v2
              with:
                  username: ${{ secrets.DOCKER_USERNAME }}
                  password: ${{ secrets.DOCKER_PASSWORD }}

            - name: Build and push
              uses: docker/build-push-action@v4
              with:
                  context: .
                  push: true
                  tags: |
                      yourusername/blucatch:latest
                      yourusername/blucatch:${{ github.sha }}

            - name: Trigger Portainer webhook
              run: |
                  curl -X POST ${{ secrets.PORTAINER_WEBHOOK_URL }}
```

### Step 2: Add GitHub Secrets

In your repo settings, add:

-   `DOCKER_USERNAME`
-   `DOCKER_PASSWORD`
-   `PORTAINER_WEBHOOK_URL`

### Step 3: Update docker-compose.yml

```yaml
services:
    blucatch:
        image: yourusername/blucatch:latest # Pull from Docker Hub
        # ... rest of config
```

---

## Recommended Setup for You

**I recommend Method 1 (Portainer Webhook)** because:

✅ Simple and fast
✅ No additional containers needed
✅ Deploys only when you push (controlled)
✅ Works with your existing docker-compose.yml

### Quick Setup:

1. **In Portainer**: Stack → Enable Webhook → Copy URL
2. **In GitHub**: Settings → Webhooks → Add webhook with Portainer URL
3. **Done!** Push code → Auto-deploy 🚀

---

## Important Notes

### Rebuilding After Code Changes

When using webhooks, Portainer pulls and restarts containers, but it needs updated images.

**Option A: Build on server**

```bash
# SSH into your server
cd /path/to/project
git pull
docker-compose build
docker-compose up -d
```

**Option B: Use Portainer's built-in build**
In Portainer, enable "Build method: Repository" so it pulls from Git and builds automatically.

**Option C: Use GitHub Actions** (Method 3 above) to auto-build and push images to Docker Hub

### For Your Setup

Since you're using `docker-compose build`, you'll want to:

1. **Enable Git repository in Portainer Stack**:

    - Edit Stack → Switch to "Repository" build method
    - Add your GitHub repo URL
    - Portainer will pull and build automatically on webhook

2. **Or use GitHub Actions** to build and push to Docker Hub

---

## Testing

After setup, test by pushing a small change:

```bash
echo "# Test" >> README.md
git add README.md
git commit -m "Test auto-deploy"
git push
```

Then check:

-   GitHub webhook shows green checkmark ✓
-   Portainer shows stack updating
-   Your app reloads with changes

---

## Troubleshooting

### Webhook not triggering?

-   Check GitHub webhook "Recent Deliveries"
-   Verify webhook URL is correct
-   Check Portainer is accessible from internet

### Stack not updating?

-   Ensure webhook is enabled on the stack
-   Check Portainer logs
-   Verify images are being rebuilt

### Want to disable auto-deploy temporarily?

-   Disable the webhook in GitHub (uncheck "Active")
-   Or remove the webhook entirely
