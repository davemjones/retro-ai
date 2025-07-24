#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Get current version
const currentVersion = packageJson.version;

// Generate build number from date
const now = new Date();
const build = now.toISOString()
  .replace(/[-:T]/g, '')
  .substring(0, 12); // YYYYMMDDHHMM

// Get short commit hash
let commit = 'dev';
try {
  commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Warning: Git not available, using fallback commit hash');
}

// Create alpha version
const alphaVersion = `${currentVersion}-alpha.${build}+${commit}`;

// Create build info object
const buildInfo = {
  version: alphaVersion,
  baseVersion: currentVersion,
  buildTimestamp: build,
  commitHash: commit,
  buildDate: now.toISOString(),
  nodeVersion: process.version
};

// Write build info to lib/build-info.json
const buildInfoPath = path.join(__dirname, '..', 'lib', 'build-info.json');
const libDir = path.dirname(buildInfoPath);

// Ensure lib directory exists
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// Write build info file
fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n');

console.log(`Current version: ${currentVersion}`);
console.log(`Alpha version: ${alphaVersion}`);
console.log(`Build: ${build}`);
console.log(`Commit: ${commit}`);
console.log(`Build info written to: ${buildInfoPath}`);

// Output the version for use in CI/CD
console.log(`\n::set-output name=version::${alphaVersion}`);