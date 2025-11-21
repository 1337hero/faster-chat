#!/bin/bash
# Reset database for testing user onboarding flow

echo "🗑️  Deleting database..."
rm -f server/data/chat.db

echo "✅ Database deleted!"
echo ""
echo "Next steps:"
echo "1. Start server: bun run dev"
echo "2. Go to http://localhost:3000"
echo "3. First user you create = admin"
echo "4. Test the API hookup flow"
