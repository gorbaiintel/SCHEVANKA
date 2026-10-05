import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const OUTPUT_ZIP_NAME = 'SCHEVANKA-Gold-Terminal-Full-Build.zip';
const rootZipPath = path.resolve(rootDir, OUTPUT_ZIP_NAME);
const publicZipPath = path.resolve(rootDir, 'public', OUTPUT_ZIP_NAME);

async function buildFullProjectZip() {
  console.log('[ZIP] Creating complete build & source archive...');

  // Remove old zip first so we don't recursively include it
  if (fs.existsSync(rootZipPath)) {
    fs.unlinkSync(rootZipPath);
  }
  if (fs.existsSync(publicZipPath)) {
    fs.unlinkSync(publicZipPath);
  }

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(rootZipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => {
      const sizeBytes = fs.existsSync(rootZipPath) ? fs.statSync(rootZipPath).size : 0;
      console.log(
        `[ZIP] ✓ Created ${rootZipPath} (${(sizeBytes / 1024).toFixed(1)} KB)`
      );
      resolve();
    });

    archive.on('error', (err: Error) => {
      reject(err);
    });

    archive.pipe(output);

    // Add all top-level project files
    const topFiles = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'server.ts',
      'apk-builder.ts',
      'security-headers.middleware.ts',
      'capacitor.config.json',
      'metadata.json',
      'README.md',
      'SCHEVANKA_ARCHITECTURE_AND_OVERLAY_INDICATORS_FULL.md',
      '.env.example',
      '.gitignore',
    ];

    for (const file of topFiles) {
      const fullPath = path.resolve(rootDir, file);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: file });
      }
    }

    // Add project directories (source + compiled dist + android + scripts + public + docs + .github)
    const dirsToInclude = [
      '.github',
      'src',
      'dist',
      'public',
      'scripts',
      'BrokerBridgeSync',
      'android',
      'docs',
    ];

    for (const dir of dirsToInclude) {
      const fullDir = path.resolve(rootDir, dir);
      if (fs.existsSync(fullDir)) {
        archive.directory(fullDir, dir, (entry: any) => {
          if (entry.name.endsWith('.zip')) return false;
          return entry;
        });
      }
    }

    archive.finalize();
  });

  // Also copy to public/ so it is accessible as a static asset
  try {
    fs.copyFileSync(rootZipPath, publicZipPath);
    console.log(`[ZIP] ✓ Copied to ${publicZipPath}`);
  } catch (err) {
    console.warn('[ZIP] Could not copy to public/:', err);
  }
}

buildFullProjectZip().catch((err) => {
  console.error('[ZIP] Failed to create full zip:', err);
  process.exit(1);
});
