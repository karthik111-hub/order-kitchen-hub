const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('[INFO] Starting server...');
console.log('[INFO] Dist path:', distPath);
console.log('[INFO] Dist exists:', fs.existsSync(distPath));
console.log('[INFO] Index.html exists:', fs.existsSync(indexPath));

// Serve static files
app.use(express.static(distPath));

// Catch-all route for SPA - use regex instead of wildcard
app.get(/.*/, (req, res) => {
  console.log('[LOG] Request to:', req.path);
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

const port = process.env.PORT || 8082;
app.listen(port, '0.0.0.0', () => {
  console.log('[SUCCESS] Server running on port ' + port);
  console.log('[SUCCESS] Ready to accept requests');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});
