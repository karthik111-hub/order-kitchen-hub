const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');
const indexPath = path.join(distPath, 'index.html');

console.log('[INFO] Starting server...');
console.log('[INFO] NODE_ENV:', process.env.NODE_ENV);
console.log('[INFO] PORT env:', process.env.PORT);
console.log('[INFO] Dist path:', distPath);
console.log('[INFO] Dist exists:', fs.existsSync(distPath));
console.log('[INFO] Public path:', publicPath);
console.log('[INFO] Public exists:', fs.existsSync(publicPath));

if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log('[INFO] Files in dist:', files.slice(0, 10));
}

if (fs.existsSync(publicPath)) {
  const files = fs.readdirSync(publicPath);
  console.log('[INFO] Files in public:', files);
}

console.log('[INFO] Index.html exists:', fs.existsSync(indexPath));

// Serve static files from dist with error handling
app.use(express.static(distPath, {
  index: false
}));

// Serve public folder files (images, menu, etc)
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Health check
app.get('/_health', (req, res) => {
  res.json({ status: 'ok', distExists: fs.existsSync(distPath), indexExists: fs.existsSync(indexPath) });
});

// Catch-all route for SPA
app.use((req, res, next) => {
  console.log('[LOG] Request:', req.method, req.path);
  
  if (fs.existsSync(indexPath)) {
    console.log('[LOG] Sending index.html');
    res.sendFile(indexPath);
  } else {
    console.log('[ERROR] index.html not found at:', indexPath);
    res.status(500).json({ 
      error: 'index.html not found',
      distPath,
      distExists: fs.existsSync(distPath),
      distFiles: fs.existsSync(distPath) ? fs.readdirSync(distPath).slice(0, 10) : []
    });
  }
});

// Use Railway's PORT or default to 8082
const port = process.env.PORT || 8082;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`[SUCCESS] Server running on http://${host}:${port}`);
  console.log('[SUCCESS] Ready to accept requests');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});
