#!/usr/bin/env node

console.log('🔄 Starting SecureWatch with Customer Database Initialization...');

const { initializeCustomerDatabase } = require('./database/customer-init');

async function startup() {
  try {
    // Initialize customer database first
    console.log('🔧 Initializing customer database...');
    await initializeCustomerDatabase();
    
    // Then start the main server
    console.log('🚀 Starting main server...');
    require('./server.js');
    
  } catch (error) {
    console.error('❌ Startup failed:', error);
    console.log('⚠️  Starting server without database initialization...');
    require('./server.js');
  }
}

startup(); 