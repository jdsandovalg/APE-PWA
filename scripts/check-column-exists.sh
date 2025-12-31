#!/bin/bash
# Script to check if installation_date column exists using Supabase REST API

# Load environment variables from pwa directory
cd "$(dirname "$0")/pwa"
source .env.local 2>/dev/null || source .env 2>/dev/null || true

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Missing Supabase environment variables"
    echo "Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set"
    exit 1
fi

echo "🔍 Checking if installation_date column exists..."
echo "Using Supabase URL: $VITE_SUPABASE_URL"

# Try to select a meter with installation_date field
RESPONSE=$(curl -s -H "apikey: $VITE_SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
     "$VITE_SUPABASE_URL/rest/v1/meters?select=installation_date&limit=1")

if echo "$RESPONSE" | grep -q "installation_date"; then
    echo "✅ Column installation_date exists!"
    echo ""
    echo "📊 Checking existing data:"
    EXISTING_DATA=$(curl -s -H "apikey: $VITE_SUPABASE_ANON_KEY" \
         -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
         "$VITE_SUPABASE_URL/rest/v1/meters?select=id,contador,installation_date&installation_date=not.is.null&limit=5")

    if [ "$EXISTING_DATA" = "[]" ] || [ -z "$EXISTING_DATA" ]; then
        echo "ℹ️  No meters have installation_date set yet"
    else
        echo "✅ Found meters with installation_date:"
        echo "$EXISTING_DATA" | jq -r '.[] | "- \(.contador): \(.installation_date)"' 2>/dev/null || echo "$EXISTING_DATA"
    fi
else
    echo "❌ Column installation_date does NOT exist!"
    echo ""
    echo "🚀 Please apply the migration by running this SQL in your Supabase dashboard:"
    echo ""
    cat ../add-installation-date-column.sql
    echo ""
    echo "📍 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
    echo "📄 Create new query and paste the SQL above"
fi