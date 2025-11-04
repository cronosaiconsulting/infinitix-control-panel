# Railway CLI - Complete Technical Documentation

## Table of Contents
1. [Installation](#installation)
2. [Authentication](#authentication)
3. [Core Concepts](#core-concepts)
4. [Complete Command Reference](#complete-command-reference)
5. [GraphQL API Usage](#graphql-api-usage)
6. [Common Workflows](#common-workflows)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)

---

## Installation

### Ubuntu/Linux Installation Methods

#### Method 1: Using Install Script (Recommended)
```bash
curl -fsSL https://railway.app/install.sh | sh
```

#### Method 2: Using NPM
```bash
npm install -g @railway/cli
```

#### Method 3: Manual Binary Installation
```bash
# Download the latest release
wget https://github.com/railwayapp/cli/releases/download/v4.11.0/railway-v4.11.0-x86_64-unknown-linux-gnu.tar.gz

# Extract
tar -xzf railway-v4.11.0-x86_64-unknown-linux-gnu.tar.gz

# Move to PATH
sudo mv railway /usr/local/bin/

# Verify installation
railway --version
```

#### Method 4: Using Homebrew (if available)
```bash
brew install railway
```

### Verify Installation
```bash
railway --version
```

---

## Authentication

### Interactive Login
```bash
railway login
```
This opens a browser window to `https://railway.com/cli-login` for authentication.

### Non-Interactive Authentication (CI/CD)
For automated environments, use API tokens:

```bash
# Set the token as an environment variable
export RAILWAY_TOKEN=your_api_token_here

# Or for project-specific tokens
export RAILWAY_API_TOKEN=your_project_token_here
```

**Important Notes:**
- Account or Team Tokens: Set via `RAILWAY_API_TOKEN` environment variable
- Project Tokens: Currently the only supported token type for API usage
- Create tokens at: Railway Dashboard → Settings → Tokens

### Check Authentication Status
```bash
railway whoami
```

### Logout
```bash
railway logout
```

---

## Core Concepts

### Projects
A Railway project contains your services, environments, and deployments.

### Environments
Separate instances of your project (e.g., production, staging, development).

### Services
Individual components of your project (e.g., web app, database, API).

### Linking
Associating your local directory with a Railway project and environment for easier command execution.

---

## Complete Command Reference

### Project Management

#### `railway init`
Create a new project from the command line.

```bash
railway init

# Options:
# - Prompts for project name
# - Prompts to select team
# - Creates new project in selected team
```

**Example:**
```bash
$ railway init
✓ Select team: My Team
✓ Enter project name: my-new-project
✓ Created project my-new-project
```

#### `railway link`
Associate an existing project with the current directory.

```bash
railway link

# Interactive mode - prompts for:
# 1. Team selection
# 2. Project selection
# 3. Environment selection
```

**Link to Specific Project:**
```bash
railway link <project-id>
```

**Options:**
- `--environment, -e <name>`: Specify environment to link
- `--service, -s <name>`: Specify service to link

**Example:**
```bash
$ railway link
✓ Select team: My Team
✓ Select project: my-existing-project
✓ Select environment: production
✓ Linked to my-existing-project (production)
```

#### `railway unlink`
Remove the link between the current directory and Railway project.

```bash
railway unlink
```

#### `railway status`
Display information about the currently linked project.

```bash
railway status
```

**Output includes:**
- Project name and ID
- Environment name
- Service name (if linked)
- Deployment status

#### `railway list`
List all projects in your Railway account.

```bash
railway list
```

---

### Environment Management

#### `railway environment`
Change the active environment for the linked project.

```bash
railway environment

# Interactive mode - prompts for environment selection
```

**Select Specific Environment:**
```bash
railway environment <environment-name>
```

**Example:**
```bash
$ railway environment
✓ Select environment:
  production
  staging
> development
```

---

### Service Management

#### `railway service`
Link to a specific service in your project.

```bash
railway service

# Interactive mode - prompts for service selection
```

**Link to Specific Service:**
```bash
railway service <service-name>
```

#### `railway add`
Add a new service to your project.

```bash
railway add
```

**Add Database Service:**
```bash
railway add --database <type>

# Supported types:
# - postgres
# - mysql
# - redis
# - mongo
```

**Add from Docker Image:**
```bash
railway add --image <docker-image>
```

**Add from GitHub Repository:**
```bash
railway add --repo <github-repo-url>
```

**Options:**
- `--name <service-name>`: Specify service name
- `--variables <key=value>`: Set environment variables

**Examples:**
```bash
# Add PostgreSQL database
railway add --database postgres --name my-postgres-db

# Add service from Docker image
railway add --image nginx:latest --name web-server

# Add service from GitHub repo
railway add --repo https://github.com/user/repo --name my-app
```

---

### Deployment

#### `railway up`
Upload and deploy the current directory to Railway.

```bash
railway up
```

**Options:**
- `--detach, -d`: Deploy without watching logs (returns immediately)
- `--service <name>`: Deploy to specific service
- `--environment, -e <name>`: Deploy to specific environment

**Examples:**
```bash
# Deploy and watch logs
railway up

# Deploy and return immediately
railway up --detach

# Deploy to specific service
railway up --service api

# Deploy to specific environment
railway up --environment production
```

#### `railway deploy`
Provision a template into your project.

```bash
railway deploy <template-code>
```

**Options:**
- `--variables <key=value>`: Set template variables

**Example:**
```bash
railway deploy postgres --variables DB_NAME=mydb
```

---

### Local Development

#### `railway run`
Run a command locally using Railway environment variables.

```bash
railway run <command>
```

**Examples:**
```bash
# Run Node.js app with Railway variables
railway run node server.js

# Run Python script
railway run python app.py

# Run npm dev script
railway run npm run dev

# Run database migrations
railway run npm run migrate
```

**Important Notes:**
- Fetches all environment variables from linked service
- Sealed variables are NOT included
- Perfect for local development with production config

#### `railway shell`
Open a subshell with Railway environment variables loaded.

```bash
railway shell
```

**Options:**
- `--service, -s <name>`: Load variables from specific service

**Example:**
```bash
$ railway shell
Railway variables loaded into shell
$ echo $DATABASE_URL
postgresql://user:pass@host:5432/db
```

---

### Remote Execution

#### `railway connect <service>`
Start an interactive shell session inside a deployed service.

```bash
railway connect <service-name>
```

**Example:**
```bash
# Connect to web service
railway connect web

# You'll be dropped into /bin/bash or /bin/sh
```

**Use Cases:**
- Debug deployed containers
- Run database migrations
- Inspect file system
- Check running processes

---

### Logs and Monitoring

#### `railway logs`
View deployment logs from the command line.

```bash
railway logs
```

**Options:**
- `--service, -s <name>`: View logs for specific service
- `--environment, -e <name>`: View logs from specific environment
- `--deployment, -d <id>`: View logs for specific deployment
- `--follow, -f`: Follow log output in real-time

**Examples:**
```bash
# View latest logs
railway logs

# View logs for specific service
railway logs --service api

# Follow logs in real-time
railway logs --follow

# View logs for specific deployment
railway logs --deployment dep_abc123
```

---

### Domain Management

#### `railway domain`
Manage domains for your services.

```bash
railway domain
```

**Generate Railway Domain:**
```bash
railway domain generate
```

**Add Custom Domain:**
```bash
railway domain add <custom-domain.com>
```

**Options:**
- `--service, -s <name>`: Specify service for domain

**Examples:**
```bash
# Generate a Railway-provided domain
railway domain generate --service web

# Add custom domain
railway domain add myapp.com --service web

# List domains
railway domain
```

---

### Variable Management

#### `railway variables`
Manage environment variables for your services.

```bash
railway variables
```

**Set Variable:**
```bash
railway variables set <KEY>=<value>
```

**Delete Variable:**
```bash
railway variables delete <KEY>
```

**Options:**
- `--service, -s <name>`: Manage variables for specific service
- `--environment, -e <name>`: Manage variables for specific environment

**Examples:**
```bash
# List all variables
railway variables

# Set a variable
railway variables set API_KEY=abc123

# Set multiple variables
railway variables set API_KEY=abc123 DB_HOST=localhost

# Delete a variable
railway variables delete API_KEY
```

**Important Notes:**
- Sealed variable values are NOT shown in `railway variables` output
- Sealed variables are NOT available via `railway run`
- Use RAW Editor in dashboard to paste .env or JSON files

---

### Database Shortcuts

#### `railway connect <database-type>`
Quick connect to database services.

```bash
# PostgreSQL
railway connect postgres

# MySQL
railway connect mysql

# Redis
railway connect redis

# MongoDB
railway connect mongo
```

---

### Utility Commands

#### `railway docs`
Open Railway documentation in browser.

```bash
railway docs
```

#### `railway open`
Open the current project in Railway dashboard.

```bash
railway open
```

**Options:**
- `--service, -s <name>`: Open specific service in dashboard

#### `railway completion`
Generate shell completion scripts.

```bash
# Bash
railway completion bash > /etc/bash_completion.d/railway

# Zsh
railway completion zsh > /usr/local/share/zsh/site-functions/_railway

# Fish
railway completion fish > ~/.config/fish/completions/railway.fish
```

#### `railway version`
Display CLI version.

```bash
railway version
```

#### `railway down`
Stop a running deployment.

```bash
railway down
```

**Options:**
- `--service, -s <name>`: Stop specific service
- `--deployment, -d <id>`: Stop specific deployment

---

## GraphQL API Usage

Railway's backend can be accessed directly via GraphQL API.

### API Endpoint
```
https://backboard.railway.app/graphql/v2
```

### Authentication
```bash
# Set token
export RAILWAY_TOKEN=your_token_here

# Make request
curl -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { me { email } }"}'
```

### Common GraphQL Operations

#### Get User Info
```graphql
query {
  me {
    id
    email
    name
  }
}
```

#### List Projects
```graphql
query {
  projects {
    edges {
      node {
        id
        name
        description
      }
    }
  }
}
```

#### Create Project
```graphql
mutation {
  projectCreate(input: {
    name: "My New Project"
    teamId: "team-id-here"
  }) {
    id
    name
  }
}
```

#### Update Project
```graphql
mutation {
  projectUpdate(id: "project-id", input: {
    name: "Updated Project Name"
  }) {
    id
    name
  }
}
```

#### Create Environment
```graphql
mutation {
  environmentCreate(input: {
    projectId: "project-id"
    name: "staging"
  }) {
    id
    name
  }
}
```

#### Set Environment Variable
```graphql
mutation {
  variableUpsert(input: {
    projectId: "project-id"
    environmentId: "environment-id"
    serviceId: "service-id"
    name: "API_KEY"
    value: "secret-value"
  }) {
    id
    name
  }
}
```

#### Deploy Service
```graphql
mutation {
  serviceCreate(input: {
    projectId: "project-id"
    source: {
      repo: "github.com/user/repo"
    }
  }) {
    id
    name
  }
}
```

### API Usage Example with curl
```bash
#!/bin/bash

RAILWAY_TOKEN="your_token_here"
API_URL="https://backboard.railway.app/graphql/v2"

# Create a project
curl -X POST $API_URL \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($name: String!) { projectCreate(input: { name: $name }) { id name } }",
    "variables": {
      "name": "My API Project"
    }
  }'
```

---

## Common Workflows

### Workflow 1: Deploy a New Project

```bash
# 1. Navigate to your project directory
cd ~/my-app

# 2. Initialize Railway project
railway init

# 3. Deploy
railway up

# 4. Generate a public domain
railway domain generate

# 5. View logs
railway logs --follow
```

### Workflow 2: Link Existing Project

```bash
# 1. Navigate to project directory
cd ~/existing-app

# 2. Link to Railway project
railway link

# 3. Select environment
railway environment production

# 4. Deploy
railway up
```

### Workflow 3: Local Development with Railway Variables

```bash
# 1. Link to project
railway link

# 2. Run locally with Railway env vars
railway run npm run dev

# Or start a shell with vars loaded
railway shell
```

### Workflow 4: Add Database to Project

```bash
# 1. Link to project
railway link

# 2. Add PostgreSQL
railway add --database postgres

# 3. View connection string
railway variables | grep DATABASE_URL

# 4. Use in local development
railway run npm run migrate
```

### Workflow 5: Multi-Environment Deployment

```bash
# Deploy to staging
railway environment staging
railway up

# Deploy to production
railway environment production
railway up
```

### Workflow 6: Add Service from GitHub

```bash
# 1. Link to project
railway link

# 2. Add service from GitHub repo
railway add --repo https://github.com/user/my-api --name api-service

# 3. Set environment variables
railway variables set API_KEY=abc123 --service api-service

# 4. Generate domain
railway domain generate --service api-service
```

---

## Environment Variables

### Railway-Provided Variables

Railway automatically provides these variables to your services:

| Variable | Description |
|----------|-------------|
| `RAILWAY_ENVIRONMENT` | Current environment name |
| `RAILWAY_ENVIRONMENT_ID` | Environment ID |
| `RAILWAY_PROJECT_ID` | Project ID |
| `RAILWAY_PROJECT_NAME` | Project name |
| `RAILWAY_SERVICE_ID` | Service ID |
| `RAILWAY_SERVICE_NAME` | Service name |
| `RAILWAY_DEPLOYMENT_ID` | Current deployment ID |
| `RAILWAY_REPLICA_ID` | Replica ID (for scaled services) |
| `RAILWAY_PUBLIC_DOMAIN` | Generated public domain |
| `RAILWAY_STATIC_URL` | Static URL for the service |
| `PORT` | Port your service should listen on |

### Database Connection Variables

When you add a database, Railway provides connection variables:

**PostgreSQL:**
- `DATABASE_URL`: Full connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: Individual components

**MySQL:**
- `DATABASE_URL`: Full connection string
- `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

**Redis:**
- `REDIS_URL`: Full connection string
- `REDIS_HOST`, `REDIS_PORT`

**MongoDB:**
- `MONGO_URL`: Full connection string
- `MONGODB_URI`

### Setting Variables via Dashboard

1. Navigate to project → service → Variables tab
2. Click "New Variable"
3. Enter name and value
4. Or use "RAW Editor" to paste from .env file

### Setting Variables via CLI

```bash
railway variables set KEY=value
```

### Variable Precedence

1. Service-specific variables
2. Environment-specific variables
3. Project-wide variables
4. Railway-provided system variables

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: `railway: command not found`

**Solution:**
```bash
# Add to PATH (Ubuntu/Linux)
export PATH="$HOME/.railway/bin:$PATH"

# Add to shell profile
echo 'export PATH="$HOME/.railway/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

#### Issue: `No project linked`

**Solution:**
```bash
# Link to a project
railway link

# Or initialize a new project
railway init
```

#### Issue: `Authentication required`

**Solution:**
```bash
# Login interactively
railway login

# Or set token for CI/CD
export RAILWAY_TOKEN=your_token_here
```

#### Issue: `Build failed`

**Solutions:**
1. Check logs: `railway logs`
2. Verify build command in `railway.toml` or service settings
3. Check for missing environment variables
4. Ensure correct Node.js/Python version specified

#### Issue: `Service not accessible`

**Solutions:**
1. Ensure service is listening on `0.0.0.0:$PORT`
2. Generate a domain: `railway domain generate`
3. Check service health: `railway status`
4. View logs for errors: `railway logs --follow`

#### Issue: `Cannot connect to database`

**Solutions:**
1. Verify database service is running: `railway status`
2. Check connection string: `railway variables | grep DATABASE_URL`
3. Ensure database service is in same project/environment
4. Test connection: `railway connect postgres`

#### Issue: `Environment variables not available locally`

**Solution:**
```bash
# Use railway run to load variables
railway run npm start

# Or start a shell with variables
railway shell
```

#### Issue: `Deployment is slow`

**Solutions:**
1. Check build logs: `railway logs`
2. Optimize Docker build with layer caching
3. Use `.railwayignore` to exclude unnecessary files
4. Consider using smaller base images

---

## Advanced Configuration

### railway.toml

Create a `railway.toml` file in your project root for advanced configuration:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[services]]
name = "web"
source = "."

[[services]]
name = "api"
source = "./api"
```

### .railwayignore

Exclude files from deployment (similar to .gitignore):

```
node_modules/
.git/
*.log
.env.local
.DS_Store
```

---

## Best Practices

1. **Use Environment Variables**: Never hardcode secrets
2. **Link Projects**: Use `railway link` for easier command execution
3. **Test Locally**: Use `railway run` to test with production variables
4. **Monitor Logs**: Regularly check `railway logs` for errors
5. **Use Environments**: Separate staging and production
6. **Database Backups**: Use Railway's built-in backup features
7. **Version Control**: Commit `railway.toml` to git
8. **CI/CD**: Use project tokens for automated deployments
9. **Resource Limits**: Monitor usage in dashboard
10. **Security**: Use sealed variables for sensitive data

---

## Additional Resources

- **Official Documentation**: https://docs.railway.com
- **CLI Reference**: https://docs.railway.com/reference/cli-api
- **GitHub Repository**: https://github.com/railwayapp/cli
- **Community Discord**: https://discord.gg/railway
- **Status Page**: https://status.railway.app
- **Blog**: https://blog.railway.com

---

## Version Information

This documentation covers Railway CLI v4.11.0 and Railway Platform as of November 2025.

For the latest updates, visit the official Railway documentation at https://docs.railway.com
