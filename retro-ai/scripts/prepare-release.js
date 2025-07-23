#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get command line arguments
const args = process.argv.slice(2);
const releaseType = args[0] || 'patch'; // patch, minor, or major

// Valid release types
const validTypes = ['patch', 'minor', 'major'];

if (!validTypes.includes(releaseType)) {
  console.error(`Invalid release type: ${releaseType}`);
  console.error('Valid types are: patch, minor, major');
  process.exit(1);
}

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Get current version
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.');

// Calculate new version
let [major, minor, patch] = versionParts.map(v => parseInt(v));

switch (releaseType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor++;
    patch = 0;
    break;
  case 'patch':
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;

console.log(`Current version: ${currentVersion}`);
console.log(`New version: ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('\nVersion updated in package.json');
console.log('\nNext steps:');
console.log('1. Review and commit the version change');
console.log('2. Create a pull request to merge into main');
console.log('3. After merging, the production release workflow will automatically create a release');