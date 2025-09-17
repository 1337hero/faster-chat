import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { config } from 'dotenv';

// Load environment variables
config();

// Import routes
import { chatRouter } from './routes/chat.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('/api/*', cors());

// API routes
app.route('/api', chatRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: '../frontend/dist' }));

  // Fallback to index.html for SPA routing
  app.get('*', serveStatic({ path: '../frontend/dist/index.html' }));
}

// Start server
const port = parseInt(process.env.PORT || '3001', 10);

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
