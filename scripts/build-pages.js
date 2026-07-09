#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

const staticFiles = [
  'index.html',
  'app.js',
  'lineup-engine.js',
  'batting-order.js',
  'bench-view.js',
  'team-sync.js',
  'rules.js',
  'firebase-sync.js',
  'styles.css',
  'favicon.ico',
  'CNAME',
  'vendor/qrcode.js'
];

const generatedFiles = [
  'firebase-config.js'
];

function firebaseConfigFromEnv(env = process.env) {
  return {
    apiKey: env.FIREBASE_API_KEY || '',
    authDomain: env.FIREBASE_AUTH_DOMAIN || '',
    projectId: env.FIREBASE_PROJECT_ID || '',
    appId: env.FIREBASE_APP_ID || '',
    appCheckSiteKey: env.FIREBASE_APPCHECK_SITE_KEY || ''
  };
}

function copyFileToDist(relativePath, distDir) {
  const source = path.join(rootDir, relativePath);
  const target = path.join(distDir, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error(`Fichier statique introuvable pour le déploiement: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function buildPages(options = {}) {
  const distDir = path.resolve(options.distDir || path.join(rootDir, 'dist'));
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  staticFiles.forEach(file => copyFileToDist(file, distDir));
  const config = firebaseConfigFromEnv(options.env || process.env);
  fs.writeFileSync(
    path.join(distDir, 'firebase-config.js'),
    `export default ${JSON.stringify(config, null, 2)};\n`,
    'utf8'
  );
  return {
    distDir,
    files: staticFiles.concat(generatedFiles)
  };
}

if (require.main === module) {
  buildPages({ distDir: process.argv[2] });
}

module.exports = {
  buildPages,
  firebaseConfigFromEnv,
  generatedFiles,
  staticFiles
};
