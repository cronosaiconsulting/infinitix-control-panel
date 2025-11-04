# Deployment Guide - Infinitix Control Panel

## Railway Deployment (Recommended)

Railway provides the easiest way to deploy this application with automatic SSL, custom domains, and environment management.

### Method 1: Deploy from GitHub (Recommended)

1. **Sign up for Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `cronosaiconsulting/infinitix-control-panel`
   - Select the branch: `claude/railway-infinitix-chatbot-demo-011CUoXGGfdJ9pPMQgYGhwZU`

3. **Railway Auto-Detection**
   - Railway will automatically detect the Node.js application
   - It will run `npm install` and `npm start`
   - The `PORT` environment variable is provided automatically

4. **Generate Domain**
   - Click on your service
   - Go to "Settings" → "Networking"
   - Click "Generate Domain"
   - Your app will be available at `xxx.railway.app`

5. **Custom Domain (Optional)**
   - Go to "Settings" → "Networking"
   - Click "Add Custom Domain"
   - Enter your domain (e.g., `infinitix.occsportplus.com`)
   - Add the DNS records shown by Railway to your domain provider

6. **Test the Deployment**
   - Visit your Railway URL
   - Click "START DEMO"
   - Watch the conversations unfold in real-time!

### Method 2: Deploy with Railway CLI

**Note**: Due to network restrictions preventing CLI installation in the current environment, use Method 1 (GitHub) or follow these manual steps on your local machine:

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Generate Domain**
   ```bash
   railway domain generate
   ```

### Method 3: Railway API (if API key issues resolved)

If you can resolve the Railway API authentication issues:

```bash
# Set your Railway API token
export RAILWAY_TOKEN=your_token_here

# Use the helper script
./railway-api.sh create_project "Infinitix Control Panel"

# Get the project ID from response
export PROJECT_ID=xxx

# Create environment
./railway-api.sh create_environment $PROJECT_ID "production"

# Link GitHub repo (manual step in Railway dashboard)
```

---

## Manual Deployment Steps (Any Platform)

### Prerequisites

- Node.js 18+ installed
- Git installed
- A server with public IP (VPS, EC2, etc.)

### 1. Clone Repository

```bash
git clone https://github.com/cronosaiconsulting/infinitix-control-panel.git
cd infinitix-control-panel
git checkout claude/railway-infinitix-chatbot-demo-011CUoXGGfdJ9pPMQgYGhwZU
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Set Environment Variables

```bash
export PORT=3000
export NODE_ENV=production
```

### 4. Start Application

```bash
npm start
```

### 5. Setup Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/server.js --name infinitix-control-panel

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 6. Setup Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name infinitix.occsportplus.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### 7. Setup SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d infinitix.occsportplus.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Heroku Deployment

### 1. Create Heroku App

```bash
heroku create infinitix-control-panel
```

### 2. Set Buildpack

```bash
heroku buildpacks:set heroku/nodejs
```

### 3. Deploy

```bash
git push heroku claude/railway-infinitix-chatbot-demo-011CUoXGGfdJ9pPMQgYGhwZU:main
```

### 4. Open App

```bash
heroku open
```

---

## Vercel Deployment (Alternative)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
vercel
```

### 3. Configure

- Add `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ]
}
```

**Note**: Vercel has limitations with WebSocket support. Railway or traditional VPS recommended for full functionality.

---

## Docker Deployment

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### 2. Build Image

```bash
docker build -t infinitix-control-panel .
```

### 3. Run Container

```bash
docker run -d -p 3000:3000 --name infinitix infinitix-control-panel
```

### 4. Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

---

## Post-Deployment Checklist

- [ ] Application is accessible via public URL
- [ ] WebSocket connections working
- [ ] START DEMO button functions correctly
- [ ] Conversations load in real-time
- [ ] All 10 demo conversations complete successfully
- [ ] Health endpoint returns 200: `/health`
- [ ] HTTPS/SSL configured (for production)
- [ ] Domain name configured (optional)
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Backups configured (if using database)

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
# Railway
railway logs

# PM2
pm2 logs infinitix-control-panel

# Docker
docker logs infinitix
```

**Common issues:**
- Port already in use: Change PORT environment variable
- Missing dependencies: Run `npm install`
- Node version mismatch: Ensure Node.js 18+

### WebSocket Not Connecting

**Symptoms**: Real-time updates not working

**Solutions:**
1. Ensure your reverse proxy supports WebSocket (Upgrade header)
2. Check firewall rules allow WebSocket connections
3. Verify SSL/TLS configuration if using HTTPS

### Demo Not Starting

**Symptoms**: Clicking START DEMO does nothing

**Solutions:**
1. Check browser console for errors
2. Verify `/api/start-demo` endpoint is accessible
3. Check server logs for errors
4. Ensure webhook endpoint is accessible: `/webhook`

### High Memory Usage

**Symptoms**: Application consuming excessive RAM

**Solutions:**
1. Implement connection pooling for WebSocket
2. Add message cleanup for old conversations
3. Configure Redis for session storage
4. Monitor and limit concurrent connections

---

## Monitoring & Maintenance

### Health Check

```bash
curl https://your-app.railway.app/health
```

**Expected response:**
```json
{
  "status": "ok",
  "conversations": 0,
  "contacts": 1,
  "clients": 0,
  "demoRunning": false
}
```

### Performance Monitoring

**Railway Dashboard provides:**
- CPU usage
- Memory usage
- Network traffic
- Response times
- Error rates

**Additional monitoring options:**
- **Sentry**: Error tracking
- **DataDog**: APM and logs
- **New Relic**: Performance monitoring
- **Uptime Robot**: Availability monitoring

### Logging

**View logs:**
```bash
# Railway
railway logs --follow

# PM2
pm2 logs infinitix-control-panel --lines 100

# Docker
docker logs -f infinitix
```

### Backup Strategy

For production with database:

1. **Database Backups**
   - Railway provides automatic backups for PostgreSQL
   - Manual backup: `railway run pg_dump`

2. **Application Backup**
   - Git repository serves as code backup
   - Keep environment variables documented securely

3. **Media Backups**
   - If using S3, enable versioning
   - Set up cross-region replication

---

## Scaling Considerations

### Horizontal Scaling

When traffic increases:

1. **Railway**: Automatically scales based on load
2. **Multiple Instances**: Use Redis for session sharing
3. **Load Balancer**: Distribute traffic across instances

### Vertical Scaling

Upgrade resources:

1. Railway: Upgrade plan for more CPU/RAM
2. Optimize queries and caching
3. Implement connection pooling

### Database Scaling

1. Add read replicas
2. Implement caching (Redis)
3. Optimize indexes
4. Archive old conversations

---

## Security Best Practices

- [ ] Use HTTPS only (no HTTP)
- [ ] Set secure environment variables
- [ ] Enable CORS properly
- [ ] Implement rate limiting
- [ ] Regular security updates
- [ ] Monitor for suspicious activity
- [ ] Backup data regularly
- [ ] Use strong authentication
- [ ] Encrypt sensitive data
- [ ] Regular security audits

---

## Support & Resources

**Documentation:**
- Railway Docs: https://docs.railway.app
- Project README: See README.md
- Project Plan: See PROJECT_PLAN.md
- Railway CLI Docs: See RAILWAY_CLI_DOCUMENTATION.md

**Community:**
- Railway Discord: https://discord.gg/railway
- GitHub Issues: Report bugs or request features

**Contact:**
- Technical Support: Open a GitHub issue
- Business Inquiries: Contact OCC Sport Plus

---

## Next Steps

After successful deployment:

1. **Test thoroughly**: Run through all demo scenarios
2. **Monitor logs**: Watch for errors or warnings
3. **Set up alerts**: Configure notifications for downtime
4. **Plan production**: Review PROJECT_PLAN.md for WhatsApp integration
5. **Gather feedback**: Share with stakeholders
6. **Iterate**: Implement improvements based on feedback

---

**Last Updated**: November 4, 2025
**Version**: 1.0
