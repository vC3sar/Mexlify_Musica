// server.js
const express = require("express");
const { google } = require("googleapis");
const mysql = require("mysql2");
const youtube = google.youtube("v3");

const app = express();
const port = 3000;

// Configura la conexión a MariaDB
const db = mysql.createConnection({
  host: "localhost", // Cambia esto si usas un servicio en la nube o diferente configuración
  user: "root", // Tu usuario de MariaDB
  password: "", // Tu contraseña de MariaDB
  database: "mexlify",
});

// Configura la API de YouTube
const apiKey = "AIzaSyDHUYu_bVJykYrbcZ7f_1gKB360PVdhbl8"; // Sustituye con tu clave de API

// Endpoint de búsqueda
app.get("/searchSong", async (req, res) => {
  const query = req.query.query;
  const limit = query.includes(" - ") ? 1 : 3;

  if (!query) {
    return res.status(400).send("Query parameter is required");
  }

  // Verificamos si los resultados están en la base de datos
  db.execute(
    "SELECT results FROM search_results WHERE query = ? ORDER BY created_at DESC LIMIT 1",
    [query],
    async (err, results) => {
      if (err) {
        console.error("Error al consultar la base de datos:", err);
        return res.status(500).send("Error al obtener los resultados");
      }

      if (results.length > 0) {
        // Si los resultados están cacheados, los retornamos
        console.log("Resultados obtenidos de la base de datos");
        return res.json(JSON.parse(results[0].results));
      } else {
        try {
          // Si no están en cache, buscamos en la API de YouTube
          const searchResults = await youtube.search.list({
            part: "snippet",
            q: query + " music",
            type: "video",
            maxResults: limit,
            key: apiKey,
          });

          const entries = searchResults.data.items || [];
          const detailedResults = await Promise.all(
            entries.map(async (entry) => {
              const videoDetails = await youtube.videos.list({
                part: "snippet,contentDetails",
                id: entry.id.videoId,
                key: apiKey,
              });

              const info = videoDetails.data.items[0];
              return {
                title: info.snippet.title,
                url: `https://www.youtube.com/watch?v=${info.id}`,
                duration: parseInt(
                  info.contentDetails.duration.match(/PT(\d+)S/)?.[1] || 0
                ),
                uploader: info.snippet.channelTitle,
                thumbnail: info.snippet.thumbnails.high.url,
              };
            })
          );

          // Guardamos los resultados en la base de datos (para cachearlos)
          db.execute(
            "INSERT INTO search_results (query, results) VALUES (?, ?)",
            [query, JSON.stringify(detailedResults)],
            (err) => {
              if (err) {
                console.error("Error al guardar en la base de datos:", err);
              }
            }
          );

          // Retornamos los resultados
          res.json(detailedResults);
        } catch (err) {
          console.error("Error al buscar en YouTube:", err);
          res.status(500).send("Error al obtener los resultados");
        }
      }
    }
  );
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
