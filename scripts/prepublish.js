#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function validatePackage() {
  console.log('🔍 Validating package before publish...\n');
  
  const errors = [];
  const warnings = [];
  
  // Check package.json
  try {
    const packageJson = JSON.parse(await fs.readFile(join(rootDir, 'package.json'), 'utf8'));
    
    // Required fields
    if (!packageJson.name) errors.push('Missing package name');
    if (!packageJson.version) errors.push('Missing package version');
    if (!packageJson.description) errors.push('Missing package description');
    if (!packageJson.author) warnings.push('Missing author information');
    if (!packageJson.license) errors.push('Missing license');
    if (!packageJson.repository) warnings.push('Missing repository information');
    
    // Check version format
    if (packageJson.version && !/^\d+\.\d+\.\d+/.test(packageJson.version)) {
      errors.push('Invalid version format (should be semver)');
    }
    
    console.log(`✓ Package: ${packageJson.name}@${packageJson.version}`);
  } catch (error) {
    errors.push(`Failed to read package.json: ${error.message}`);
  }
  
  // Check required files
  const requiredFiles = ['README.md', 'LICENSE', 'CHANGELOG.md'];
  for (const file of requiredFiles) {
    try {
      await fs.access(join(rootDir, file));
      console.log(`✓ Found ${file}`);
    } catch {
      errors.push(`Missing required file: ${file}`);
    }
  }
  
  // Check dist directory
  try {
    const distFiles = await fs.readdir(join(rootDir, 'dist'));
    if (distFiles.length === 0) {
      errors.push('Empty dist directory - did you run npm run build?');
    } else {
      console.log(`✓ Found ${distFiles.length} files in dist/`);
    }
  } catch {
    errors.push('Missing dist directory - did you run npm run build?');
  }
  
  // Report results
  console.log('\n📊 Validation Results:');
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`   - ${w}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`   - ${e}`));
    console.log('\n❌ Package validation failed! Fix the errors above before publishing.');
    process.exit(1);
  } else {
    console.log('\n✅ Package is ready for publishing!');
    console.log('\nNext steps:');
    console.log('1. Review the package contents: npm pack --dry-run');
    console.log('2. Publish to npm: npm publish');
  }
}

validatePackage().catch(error => {
  console.error('Validation script error:', error);
  process.exit(1);
});