#!/usr/bin/env node

/**
 * This script modifies package.json files to be compatible with npm
 * by replacing "workspace:*" with "*" in dependencies
 */

const fs = require('fs');
const path = require('path');

// Process a package.json file
function processPackageJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const pkg = JSON.parse(content);
  let modified = false;

  // Process dependencies sections
  ['dependencies', 'devDependencies', 'peerDependencies'].forEach(section => {
    if (pkg[section]) {
      Object.keys(pkg[section]).forEach(dep => {
        if (pkg[section][dep] === 'workspace:*') {
          pkg[section][dep] = '*';
          modified = true;
        }
      });
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated ${filePath}`);
  }
}

// Process root package.json
const rootPackageJson = path.resolve(process.cwd(), 'package.json');
processPackageJson(rootPackageJson);

// Process all package.json files in packages directory
const packagesDir = path.resolve(process.cwd(), 'packages');
const packages = fs.readdirSync(packagesDir);

packages.forEach(pkg => {
  const packageJsonPath = path.resolve(packagesDir, pkg, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    processPackageJson(packageJsonPath);
  }
});

console.log('All package.json files updated for npm compatibility');
