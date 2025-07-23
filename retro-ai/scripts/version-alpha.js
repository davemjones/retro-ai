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
  .substring(0, 12); // YYYYMMDDHHM

// Get short commit hash
const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

// Create alpha version
const alphaVersion = `${currentVersion}-alpha.${build}+${commit}`;

console.log(`Current version: ${currentVersion}`);
console.log(`Alpha version: ${alphaVersion}`);
console.log(`Build: ${build}`);
console.log(`Commit: ${commit}`);

// Output the version for use in CI/CD
console.log(`\n::set-output name=version::${alphaVersion}`);