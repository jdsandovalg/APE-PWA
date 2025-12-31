#!/bin/bash
# Script to apply the installation_date column migration to Supabase
# Run this after deploying the SQL migration

echo "🔧 Applying installation_date migration..."
echo ""
echo "📋 Steps to apply:"
echo "1. Go to your Supabase dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Run the following SQL:"
echo ""
cat ../add-installation-date-column.sql
echo ""
echo "4. Verify the column was added:"
echo "   SELECT column_name FROM information_schema.columns"
echo "   WHERE table_name = 'meters' AND column_name = 'installation_date';"
echo ""
echo "5. For existing meters, you can set the installation date manually:"
echo "   UPDATE meters SET installation_date = '2024-12-16' WHERE id = 'YOUR_METER_ID';"
echo ""
echo "✅ Migration applied successfully!"