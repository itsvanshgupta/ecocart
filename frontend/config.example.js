// Copy this file to config.js and set the public browser configuration.
// Never put SUPABASE_SERVICE_ROLE_KEY, Gemini, Groq, or AWS credentials here.
window.ECOCART_CONFIG = {
  // Local: 'http://localhost:8000'. Production: your Lambda Function URL.
  apiBaseUrl: 'http://localhost:8000',
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  // Supabase's anon/publishable key is safe for a browser only when RLS is enabled.
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
};
