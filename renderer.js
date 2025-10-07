const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsContainer = document.getElementById("results");
const downloadedContainer = document.getElementById("downloaded");
const debugLog = document.getElementById("debugLog");

const cover = document.getElementById("cover");
const songTitle = document.getElementById("songTitle");
const songArtist = document.getElementById("songArtist");
const player = document.getElementById("player");

let currentAudio = null;

// Función para log debug
function logDebug(...args) {
  console.log("[DEBUG]", ...args);
  if (debugLog) debugLog.innerText += args.join(" ") + "\n";
}

// Reproducir canción (stream o local) y actualizar UI
async function playSong(song, localPath = null) {
  cover.src = song.thumbnail || "default-cover.png";
  songTitle.textContent = song.title;
  songArtist.textContent = song.uploader;

  // Detener audio anterior
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
  }

  try {
    if (localPath) {
      player.src = localPath;
      logDebug("Reproduce desde renderer.js localpath");
    } else {
      logDebug("Reproduciendo desde streamurl");
      const streamUrl = await window.electronAPI.streamSong(song);
      player.src = streamUrl;
    }
    await player.play();
    currentAudio = player;
  } catch (err) {
    logDebug("Error al reproducir:", err);
  }
}

// Buscar canciones
searchBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) return;
  resultsContainer.innerHTML = "<p>Buscando...</p>";

  try {
    const songs = await window.electronAPI.searchSong(query);
    resultsContainer.innerHTML = "";

    if (songs.length === 0) {
      resultsContainer.innerHTML = "<p>No se encontraron resultados</p>";
      return;
    }

    songs.forEach((song) => {
      const div = document.createElement("div");
      div.classList.add("songItem");
      div.innerHTML = `
                <img src="${song.thumbnail}" width="100" />
                <strong>${song.title}</strong> - ${song.uploader} (${
        song.duration || "0"
      }s)
                <button class="downloadBtn">Descargar</button>
                <button class="streamBtn">Reproducir</button>
            `;
      resultsContainer.appendChild(div);

      // Descargar
      div.querySelector(".downloadBtn").addEventListener("click", async () => {
        div.querySelector(".downloadBtn").disabled = true;
        const res = await window.electronAPI.downloadSong(song);
        alert(res.message);
        div.querySelector(".downloadBtn").disabled = false;
        loadDownloadedSongs();
      });

      // Reproducir streaming
      div.querySelector(".streamBtn").addEventListener("click", async () => {
        await playSong(song);
      });
    });
  } catch (err) {
    resultsContainer.innerHTML = "<p>Error en búsqueda</p>";
    logDebug("Error en searchBtn:", err);
  }
});

// Cargar canciones descargadas
async function loadDownloadedSongs() {
  downloadedContainer.innerHTML = "";
  try {
    const songs = await window.electronAPI.getDownloaded();
    const downloadsDir = await window.electronAPI.getAppPath(); // <-- AQUI

    songs.forEach((song) => {
      const div = document.createElement("div");
      div.classList.add("songItem");
      div.innerHTML = `
                <img src="music/${song.thumbnail}" width="100" />
                <strong>${song.title}</strong> - ${song.uploader} (${
        song.duration || "0"
      }s)
                <button class="playBtn">Reproducir</button>
            `;
      downloadedContainer.appendChild(div);

      div.querySelector(".playBtn").addEventListener("click", () => {
        const url = `file://${downloadsDir}/music/${song.filename}`;
        playSong(song, url);
      });
    });
  } catch (err) {
    logDebug("Error cargando descargadas:", err);
  }
}

async function deleteDownload(filename) {
  return await ipcRenderer.invoke("deleteDownload", filename);
}
// Inicializar
loadDownloadedSongs();
window.electronAPI.setDebug(true);
