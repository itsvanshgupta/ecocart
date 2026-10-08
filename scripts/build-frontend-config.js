/**
 * Generates the static browser configuration during a Vercel build.
 * Only public values belong here. Secrets remain backend-only.
 */
const fs = require('fs');
const path = require('path');

const required = ['ECOCART_SUPABASE_URL', 'ECOCART_SUPABASE_PUBLISHABLE_KEY'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(`Missing Vercel environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const config = {
  apiBaseUrl: (process.env.ECOCART_API_BASE_URL || '').replace(/\/$/, ''),
  supabaseUrl: process.env.ECOCART_SUPABASE_URL,
  supabaseAnonKey: process.env.ECOCART_SUPABASE_PUBLISHABLE_KEY,
};

fs.writeFileSync(
  path.join(__dirname, '..', 'frontend', 'config.js'),
  `// Generated during deployment. Do not edit or commit.\nwindow.ECOCART_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
);
console.log('Generated frontend/config.js from deployment environment variables.');
