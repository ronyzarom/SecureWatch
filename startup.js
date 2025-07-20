#!/usr/bin/env node

// Root startup redirector for Render deployment
// This file redirects to the actual backend startup script

console.log('🚀 Starting SecureWatch backend...');
console.log('📂 Redirecting to backend/startup.js');

// Import and execute the backend startup
require('./backend/startup.js'); 