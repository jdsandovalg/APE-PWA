#!/bin/bash
# Simple script to apply the installation_date migration using Supabase CLI

echo "🔧 Applying installation_date column migration..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Apply the migration
echo "📄 Migration SQL:"
cat add-installation-date-column.sql
echo ""

echo "🚀 Applying migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "🔍 Verifying column exists:"
    supabase db inspect --schema public | grep -A 5 -B 5 installation_date || echo "Column not found in inspection"
else
    echo "❌ Migration failed!"
    echo ""
    echo "💡 Alternative: Run this SQL manually in your Supabase dashboard:"
    echo ""
    cat add-installation-date-column.sql
fi