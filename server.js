
const express = require('express');
const path = require('path');
const app = express();

// Der Port wird von Cloud Run über die Umgebungsvariable PORT bereitgestellt
const port = process.env.PORT || 8080;

// Statische Dateien aus dem aktuellen Verzeichnis servieren
app.use(express.static(__dirname));

// Alle anderen Anfragen an die index.html delegieren (SPA-Routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// WICHTIG: Auf 0.0.0.0 lauschen, damit der Service von außen erreichbar ist
app.listen(port, '0.0.0.0', () => {
  console.log(`Spark AI ist bereit und lauscht auf Port ${port}`);
});
