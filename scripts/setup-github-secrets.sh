#!/bin/bash
# Script to configure GitHub secrets for the video pipeline
# Run this script to set up all required secrets

echo "Configuring GitHub secrets for Vetor Blog video pipeline..."

# Check if gh is authenticated
if ! gh auth status > /dev/null 2>&1; then
    echo "Error: GitHub CLI not authenticated. Run 'gh auth login' first."
    exit 1
fi

# Function to set a secret
set_secret() {
    local name=$1
    local value=$2
    if [ -n "$value" ]; then
        echo "Setting $name..."
        echo "$value" | gh secret set "$name"
    else
        echo "Warning: $name is empty, skipping..."
    fi
}

# Read from .env.local
if [ -f .env.local ]; then
    echo "Reading from .env.local..."
    
    # Extract values from .env.local
    SITE_BASE=$(grep "^SITE_BASE=" .env.local | cut -d'=' -f2-)
    CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d'=' -f2-)
    NEXT_PUBLIC_SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d'=' -f2-)
    SUPABASE_SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d'=' -f2-)
    GEMINI_API_KEY=$(grep "^GEMINI_API_KEY=" .env.local | cut -d'=' -f2-)
    GROQ_API_KEY=$(grep "^GROQ_API_KEY=" .env.local | cut -d'=' -f2-)
    OPENROUTER_API_KEY=$(grep "^OPENROUTER_API_KEY=" .env.local | cut -d'=' -f2-)
    YOUTUBE_CLIENT_ID=$(grep "^YOUTUBE_CLIENT_ID=" .env.local | cut -d'=' -f2-)
    YOUTUBE_CLIENT_SECRET=$(grep "^YOUTUBE_CLIENT_SECRET=" .env.local | cut -d'=' -f2-)
    YOUTUBE_REFRESH_TOKEN=$(grep "^YOUTUBE_REFRESH_TOKEN=" .env.local | cut -d'=' -f2-)
    
    # Set secrets
    set_secret "SITE_BASE" "$SITE_BASE"
    set_secret "CRON_SECRET" "$CRON_SECRET"
    set_secret "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
    set_secret "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
    set_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"
    set_secret "GROQ_API_KEY" "$GROQ_API_KEY"
    set_secret "OPENROUTER_API_KEY" "$OPENROUTER_API_KEY"
    set_secret "YOUTUBE_CLIENT_ID" "$YOUTUBE_CLIENT_ID"
    set_secret "YOUTUBE_CLIENT_SECRET" "$YOUTUBE_CLIENT_SECRET"
    set_secret "YOUTUBE_REFRESH_TOKEN" "$YOUTUBE_REFRESH_TOKEN"
    
    echo "Done! All secrets configured."
else
    echo "Error: .env.local not found!"
    exit 1
fi
