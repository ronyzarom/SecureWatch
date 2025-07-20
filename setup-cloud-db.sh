#!/bin/bash

# Setup cloud database schema for Training Management
# Run this script to initialize the PostgreSQL database on Render

DATABASE_URL="postgresql://securewatch_user:xal1E0T4RYToxkRwtRHMNXH33cW4zW1z@dpg-d1tcmkruibrs73fc3tu0-a.oregon-postgres.render.com/securewatch"

echo "🚀 Setting up Training Management Database Schema on Render..."
echo "============================================================"

echo "📊 Applying training management schema..."
psql "$DATABASE_URL" -f backend/database/training-management-schema.sql

echo "📚 Seeding initial training data..."
psql "$DATABASE_URL" -f backend/database/seed-training-data.sql

echo "✅ Database setup complete!"
echo "🎯 Training Management system is now ready for production use."
