# Self-Hosted GitHub Runners Setup

This guide walks you through setting up self-hosted GitHub Actions runners for the Retro AI project.

## Overview

Self-hosted runners give you full control over the build environment while still leveraging GitHub's workflow orchestration. Your servers execute the CI/CD jobs instead of GitHub's cloud infrastructure.

## Benefits

- **Cost Control**: No usage limits or costs for build minutes
- **Custom Environment**: Install specific tools, databases, or configurations
- **Performance**: Potentially faster builds with dedicated resources
- **Security**: Keep sensitive operations within your network
- **Persistent Storage**: Maintain caches and artifacts between builds

## Security Considerations

⚠️ **CRITICAL**: Self-hosted runners can access your internal network and infrastructure. Only use them with:
- Private repositories (recommended)
- Trusted contributors only
- Proper network isolation
- Regular security updates

## Server Requirements

### Minimum Specifications
- **OS**: Ubuntu 20.04 LTS or later (Linux recommended)
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB free space
- **Network**: Reliable internet connection

### Software Dependencies
- **Node.js**: Version 18.x or 20.x
- **npm**: Latest version
- **Git**: 2.20+
- **Docker**: Optional but recommended for containerized builds

## Installation Steps

### 1. Prepare Your Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git build-essential

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version
npm --version
git --version
```

### 2. Create Runner User

```bash
# Create dedicated user for runner
sudo useradd -m -s /bin/bash github-runner
sudo usermod -aG sudo github-runner

# Switch to runner user
sudo su - github-runner
```

### 3. Download and Install Runner

Visit your repository settings: `https://github.com/YOUR_USERNAME/retro-ai/settings/actions/runners`

Click "New self-hosted runner" and follow the commands provided. They'll look similar to:

```bash
# Create a folder
mkdir actions-runner && cd actions-runner

# Download the latest runner package
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
```

### 4. Configure Runner

```bash
# Configure the runner (use tokens from GitHub)
./config.sh --url https://github.com/YOUR_USERNAME/retro-ai --token YOUR_REGISTRATION_TOKEN

# When prompted:
# - Enter a name for this runner: retro-ai-builder-1
# - Enter additional labels (optional): node,npm,build
# - Enter name of work folder: _work
```

### 5. Install as System Service

```bash
# Install the service
sudo ./svc.sh install

# Start the service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

## Configuration Options

### Runner Labels

Add custom labels during configuration to target specific runners:

```bash
# Examples:
# node,npm,build,production
# staging,alpha,testing
# heavy-builds,gpu-enabled
```

Use labels in workflows:
```yaml
runs-on: [self-hosted, node, production]
```

### Environment Variables

Create `.env` file in runner directory:
```bash
# /home/github-runner/actions-runner/.env
NODE_ENV=production
NPM_CONFIG_CACHE=/home/github-runner/.npm
```

### Resource Limits

Consider using systemd to limit resources:
```bash
# /etc/systemd/system/github-runner.service.d/override.conf
[Service]
MemoryLimit=8G
CPUQuota=80%
```

## Workflow Updates

The workflows have been updated to support both self-hosted and GitHub-hosted runners:

### Default Behavior
- Push events: Use self-hosted runners
- Manual trigger: Choose runner type via dropdown

### Manual Override
```bash
# Trigger workflow with GitHub-hosted runner
gh workflow run "Alpha Release" --field runner_type=ubuntu-latest
```

## Monitoring and Maintenance

### Health Checks

Create monitoring script:
```bash
#!/bin/bash
# /home/github-runner/health-check.sh

cd /home/github-runner/actions-runner

# Check if runner service is active
if ! sudo ./svc.sh status | grep -q "active (running)"; then
    echo "ERROR: Runner service is not running"
    sudo ./svc.sh start
fi

# Check disk space (warn if < 10GB free)
FREE_SPACE=$(df /home/github-runner --output=avail | tail -1)
if [ "$FREE_SPACE" -lt 10485760 ]; then
    echo "WARNING: Low disk space: $(($FREE_SPACE / 1024))MB remaining"
fi

# Check for runner updates (check monthly)
if [ -f ".last_update_check" ]; then
    LAST_CHECK=$(cat .last_update_check)
    CURRENT=$(date +%s)
    if [ $((CURRENT - LAST_CHECK)) -gt 2592000 ]; then # 30 days
        echo "INFO: Consider checking for runner updates"
        echo $CURRENT > .last_update_check
    fi
else
    echo $(date +%s) > .last_update_check
fi
```

### Automated Maintenance

Add to crontab:
```bash
# Check runner health every 5 minutes
*/5 * * * * /home/github-runner/health-check.sh >> /var/log/github-runner.log 2>&1

# Clean up old logs weekly
0 2 * * 0 find /home/github-runner/actions-runner/_diag -name "*.log" -mtime +7 -delete

# Clean npm cache monthly
0 3 1 * * /home/github-runner/.npm && npm cache clean --force
```

## Troubleshooting

### Common Issues

1. **Runner offline**
   ```bash
   # Check service status
   sudo systemctl status actions.runner.retro-ai.retro-ai-builder-1.service
   
   # Restart service
   cd /home/github-runner/actions-runner
   sudo ./svc.sh stop
   sudo ./svc.sh start
   ```

2. **Node.js/npm issues**
   ```bash
   # Verify Node.js version
   node --version
   
   # Clear npm cache
   npm cache clean --force
   
   # Reinstall if needed
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **Permission issues**
   ```bash
   # Ensure runner user owns all files
   sudo chown -R github-runner:github-runner /home/github-runner/
   
   # Check sudo permissions
   sudo -u github-runner sudo -l
   ```

4. **Network/firewall issues**
   ```bash
   # Test GitHub connectivity
   curl -I https://api.github.com
   
   # Check if runner can reach GitHub
   ./run.sh --check
   ```

### Logs and Debugging

```bash
# Service logs
sudo journalctl -u actions.runner.retro-ai.retro-ai-builder-1.service -f

# Runner logs
tail -f /home/github-runner/actions-runner/_diag/Runner_*.log

# Workflow job logs (during execution)
tail -f /home/github-runner/actions-runner/_work/_actions/actions/checkout/v*/dist/index.js
```

## Security Best Practices

1. **Network Security**
   - Use firewall to restrict outbound connections
   - Consider VPN or private network setup
   - Regularly audit network access

2. **Runner Security**
   - Keep runner software updated
   - Use dedicated user account
   - Limit sudo permissions
   - Regular security patches

3. **Repository Security**
   - Use private repositories only (recommended)
   - Enable branch protection rules
   - Require PR reviews
   - Monitor runner usage

4. **Environment Security**
   - Store secrets in GitHub Secrets (not on runner)
   - Clean up temporary files
   - Regular malware scans

## Scaling and High Availability

### Multiple Runners
```bash
# Set up multiple runners with different labels
./config.sh --name retro-ai-builder-1 --labels production,heavy
./config.sh --name retro-ai-builder-2 --labels staging,testing
```

### Load Balancing
GitHub automatically distributes jobs across available runners with matching labels.

### Backup Strategy
- Runner configuration: `/home/github-runner/actions-runner/.runner`
- Backup registration tokens (encrypted)
- Document runner setup process

## Migration from GitHub-Hosted

1. **Gradual Migration**
   - Start with develop-ci.yml workflow
   - Test thoroughly before production workflows
   - Keep GitHub-hosted as fallback option

2. **Performance Comparison**
   - Monitor build times
   - Compare resource usage
   - Measure reliability

3. **Cost Analysis**
   - Calculate server costs vs GitHub Actions minutes
   - Factor in maintenance time
   - Consider scaling needs

## Questions?

For runner setup issues:
1. Check GitHub's official [self-hosted runner documentation](https://docs.github.com/en/actions/hosting-your-own-runners)
2. Review runner logs in `_diag/` directory
3. Contact repository administrators
4. Create issue for persistent problems