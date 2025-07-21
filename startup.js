#!/usr/bin/env node

// Root startup redirector for Render deployment
// Uses intelligent startup script that detects deployment type

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SecureWatch with intelligent startup...');
console.log('📂 Using smart initialization script');

// Execute the intelligent startup script
const startupScript = path.join(__dirname, 'start_app.sh');
const child = spawn('bash', [startupScript], {
    stdio: 'inherit',
    env: process.env,
    cwd: __dirname
});

child.on('close', (code) => {
    console.log(`Startup script exited with code ${code}`);
    process.exit(code);
});

child.on('error', (err) => {
    console.error('Failed to start application:', err);
    process.exit(1);
}); 