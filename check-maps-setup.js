#!/usr/bin/env node

/**
 * Google Maps Setup Checker
 * 
 * This script checks if your Google Maps API key is properly configured.
 * Run with: node check-maps-setup.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Checking Google Maps Setup...\n');

// Check if .env file exists
const envPath = join(__dirname, '.env');
const envExists = existsSync(envPath);

console.log('📁 Checking .env file...');
if (!envExists) {
  console.log('   ❌ .env file not found');
  console.log('   ℹ️  Create a .env file in your project root\n');
  showNextSteps();
  process.exit(1);
} else {
  console.log('   ✅ .env file exists\n');
}

// Read .env file
const envContent = readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

// Check for Google Maps API keys
console.log('🔑 Checking for API keys...');

const apiKeyPatterns = [
  'VITE_GOOGLE_MAP_API',
  'VITE_GOOGLE_MAPS_API_KEY',
  'GOOGLE_MAP_API',
  'GOOGLE_MAPS_API_KEY'
];

const foundKeys = {};
let hasValidKey = false;

apiKeyPatterns.forEach(pattern => {
  const line = envLines.find(l => l.trim().startsWith(`${pattern}=`));
  if (line) {
    const value = line.split('=')[1]?.trim();
    foundKeys[pattern] = value;
    
    const isViteKey = pattern.startsWith('VITE_');
    const hasValue = value && value.length > 0 && value !== 'your_api_key_here' && value !== 'your-api-key';
    
    console.log(`   ${isViteKey && hasValue ? '✅' : '⚠️'}  ${pattern}: ${hasValue ? 'configured' : 'not configured'}`);
    
    if (isViteKey && hasValue) {
      hasValidKey = true;
      
      // Check key format
      if (value.length < 30) {
        console.log(`      ⚠️  Key seems too short (${value.length} chars, expected ~39)`);
      } else {
        console.log(`      ✓ Key length looks good (${value.length} chars)`);
      }
    } else if (!isViteKey && hasValue) {
      console.log('      ⚠️  Key must start with VITE_ to work in Vite apps');
    }
  }
});

console.log();

// Check package.json for required dependency
console.log('📦 Checking dependencies...');
const packageJsonPath = join(__dirname, 'package.json');
if (existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const hasLoader = packageJson.dependencies?.['@googlemaps/js-api-loader'];
  
  if (hasLoader) {
    console.log(`   ✅ @googlemaps/js-api-loader: ${hasLoader}\n`);
  } else {
    console.log('   ❌ @googlemaps/js-api-loader not found in dependencies');
    console.log('   ℹ️  Run: npm install @googlemaps/js-api-loader\n');
  }
}

// Summary
console.log('═══════════════════════════════════════');
if (hasValidKey) {
  console.log('✅ Google Maps is configured correctly!');
  console.log('\nNext steps:');
  console.log('1. Restart your dev server: npm run dev');
  console.log('2. Navigate to a page with a map');
  console.log('3. Check that maps load without errors\n');
  
  console.log('Optional: Test your API key');
  console.log('  Open test-google-maps.html in a browser\n');
} else {
  console.log('❌ Google Maps is NOT configured\n');
  showNextSteps();
  process.exit(1);
}

function showNextSteps() {
  console.log('Next steps to configure Google Maps:\n');
  console.log('1. Get an API key from Google Cloud Console:');
  console.log('   https://console.cloud.google.com/apis/credentials\n');
  
  console.log('2. Enable required APIs:');
  console.log('   - Maps JavaScript API');
  console.log('   - Geocoding API\n');
  
  console.log('3. Add to your .env file:');
  console.log('   VITE_GOOGLE_MAP_API=your_actual_api_key_here\n');
  
  console.log('4. Restart your dev server\n');
  
  console.log('📚 See GOOGLE_MAPS_SETUP.md for detailed instructions\n');
}

// Check for common issues
console.log('🔧 Checking for common issues...');

let issuesFound = false;

// Check if using non-VITE prefixed keys
const nonViteKeys = Object.keys(foundKeys).filter(k => !k.startsWith('VITE_'));
if (nonViteKeys.length > 0 && !hasValidKey) {
  console.log('   ⚠️  Found non-VITE prefixed keys:');
  nonViteKeys.forEach(key => {
    console.log(`      ${key} → should be VITE_${key}`);
  });
  issuesFound = true;
}

// Check if key looks like placeholder
Object.entries(foundKeys).forEach(([key, value]) => {
  if (value && (value.includes('your') || value.includes('placeholder') || value.includes('xxx'))) {
    console.log(`   ⚠️  ${key} appears to be a placeholder value`);
    console.log('      Replace it with your actual API key from Google Cloud Console');
    issuesFound = true;
  }
});

if (!issuesFound) {
  console.log('   ✅ No common issues detected\n');
} else {
  console.log();
}

console.log('═══════════════════════════════════════\n');

