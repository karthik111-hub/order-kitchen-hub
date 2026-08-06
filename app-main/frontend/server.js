const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8082;
const HOST = '0.0.0.0';

// Serve static exported files
const distPath = path.join(__dirname, 'dist');

if (!fs.existsSync(distPath)) {
  console.error('ERROR: dist folder not found. Make sure to run: yarn web:export');
  process.exit(1);
}

app.use(express.static(distPath));

// Handle React Router - all routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] Expo web server running on http://${HOST}:${PORT}`);
  console.log(`[${new Date().toISOString()}] Serving static files from: ${distPath}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
