import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
function getPackageVersion(): string {
  try {
    // Try to read from the root package.json (development)
    const packagePath = join(__dirname, '../../package.json');
    const packageData = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageData.version || '0.1.0';
  } catch {
    // If that fails, try to read from the installed package (production)
    try {
      const packagePath = join(__dirname, '../../../package.json');
      const packageData = JSON.parse(readFileSync(packagePath, 'utf-8'));
      return packageData.version || '0.1.0';
    } catch {
      // Fallback version if package.json can't be read
      return '0.1.0';
    }
  }
}

export const VERSION = getPackageVersion();
