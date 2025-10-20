# Auto-Deploy for Local Portainer

## The Problem
Your Portainer is at `192.168.1.210:9443` (local network), so GitHub webhooks can't reach it.

## Solution 1: Simple Pull Script (Easiest!)

Create a script on your server that pulls and redeploys:

```bash
#!/bin/bash
# /home/youruser/update-blucatch.sh

cd /path/to/your/blucatch/project
git pull origin main
docker-compose build
docker-compose up -d
echo "✅ Updated at $(date)"
```

Make it executable:
```bash
chmod +x /home/youruser/update-blucatch.sh
```

**Run manually when you push:**
```bash
ssh yourserver /home/youruser/update-blucatch.sh
```

Or set up a cron job to check every 5 minutes:
```bash
*/5 * * * * /home/youruser/update-blucatch.sh >> /var/log/blucatch-deploy.log 2>&1
```

---

## Solution 2: Portainer with Git Repository

1. **In Portainer**:
   - Go to your stack
   - Edit stack
   - Change **Build method** from "Upload" to **"Git Repository"**
   - Repository URL: `https://github.com/BlueLinks/bluCatch`
   - Reference: `refs/heads/main`
   - Compose path: `docker-compose.yml`
   - Enable **Automatic updates** 
   - Set check interval (e.g., every 5 minutes)

2. **Save and redeploy**

Now Portainer will automatically check GitHub and redeploy when it sees changes!

---

## Solution 3: Webhook Relay (Advanced)

Use a free service like **webhook.site** or **smee.io** to relay webhooks:

1. Go to https://smee.io
2. Click "Start a new channel"
3. Copy the webhook URL
4. Add to GitHub as webhook
5. On your server, run:
   ```bash
   npm install -g smee-client
   smee -u https://smee.io/YOUR_CHANNEL_ID -t http://192.168.1.210:9443/api/stacks/webhooks/7e22c671-8caa-41b4-9934-51e4ee2dbd8e
   ```

This relays public GitHub webhooks to your local Portainer!

---

## Solution 4: Watchtower (Fully Automated)

Add to your `docker-compose.yml`:

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
      - WATCHTOWER_POLL_INTERVAL=60     # Check every 60 seconds
      - WATCHTOWER_CLEANUP=true         # Remove old images
      - WATCHTOWER_LABEL_ENABLE=true    # Only watch labeled containers
    
  blucatch:
    # ... existing config ...
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
  
  blucatch-scraper:
    # ... existing config ...
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

**But wait!** For Watchtower to work with local builds, you need to:

1. Push to Docker Hub after building
2. Or use a local registry
3. Or use Portainer's Git integration (Solution 2)

---

## 🌟 My Recommendation for You

**Use Solution 2: Portainer Git Repository** because:
- ✅ No scripts needed
- ✅ Works entirely within Portainer
- ✅ No public exposure required
- ✅ Automatic checks every few minutes
- ✅ Easy to configure and monitor

Just set your stack to pull from Git and it will handle everything!

---

## Quick Test

After setup, test it:
```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "Test auto-deploy"
git push

# Wait for the check interval (e.g., 5 minutes)
# Or manually trigger update in Portainer UI
```

---

## Alternative: Manual Deploy Command

If you don't want automation, create an alias for quick deploys:

```bash
# Add to your ~/.zshrc or ~/.bashrc
alias deploy-blucatch='ssh yourserver "cd /path/to/blucatch && git pull && docker-compose build && docker-compose up -d"'
```

Then just run:
```bash
deploy-blucatch
```

