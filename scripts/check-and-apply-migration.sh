#!/bin/bash
# Script to check and apply the installation_date migration

echo "🔍 Checking if installation_date column exists..."

# Check if column exists
COLUMN_EXISTS=$(psql $DATABASE_URL -t -c "SELECT 1 FROM information_schema.columns WHERE table_name = 'meters' AND column_name = 'installation_date';" 2>/dev/null || echo "0")

if [ "$COLUMN_EXISTS" = "1" ]; then
    echo "✅ Column installation_date already exists"
else
    echo "❌ Column installation_date does not exist. Applying migration..."

    # Apply migration
    psql $DATABASE_URL -f add-installation-date-column.sql

    if [ $? -eq 0 ]; then
        echo "✅ Migration applied successfully!"
    else
        echo "❌ Migration failed!"
        exit 1
    fi
fi

echo ""
echo "📊 Current meters table structure:"
psql $DATABASE_URL -c "\d meters" | head -20

echo ""
echo "🔍 Checking existing data:"
psql $DATABASE_URL -c "SELECT id, contador, installation_date FROM meters WHERE installation_date IS NOT NULL LIMIT 5;"