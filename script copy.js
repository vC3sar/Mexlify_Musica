const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsList = document.getElementById("resultsList");
const downloadsList = document.getElementById("downloadsList");
const player = document.getElementById("player");
const cover = document.getElementById("cover");
const songTitle = document.getElementById("songTitle");
const songArtist = document.getElementById("songArtist");

let currentAudio = null;

function debugLog(...args) {
  console.log("[DEBUG]", ...args);
}
let queue = [];
let currentIndex = -1; // Ninguna al inicio
function cleanSongTitle(title) {
  return title
    .replace(
      /\b(video|oficial|lyrics|clip|feat\.?|ft\.?|remix|version|deluxe)\b/gi,
      ""
    )
    .replace(/[\(\[\{].*?[\)\]\}]/g, "")
    .replace(/[-_|\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function handleExpiredStream(currentSong) {
  if (!currentSong) return;

  debugLog("Renovando URL de streaming para:", currentSong.title);

  try {
    const newStreamUrl = await window.electronAPI.streamSong(currentSong);
    player.src = newStreamUrl;
    player
      .play()
      .catch((err) => debugLog("Error al reproducir tras renovar:", err));
  } catch (err) {
    debugLog("No se pudo renovar URL:", err);
    alert("La canción expiró y no se pudo renovar.");
    // Opcional: pasar a la siguiente canción
    playNextInQueue();
  }
}

// Función unificada para reproducir cualquier canción
async function playSong(song, isDownloaded = false) {
  debugLog("Reproduciendo:", song.title);

  const progressBar = document.getElementById("progressBar");
  progressBar.disabled = false;

  cover.src = isDownloaded ? `${song.thumbnail}` : song.thumbnail;
  songTitle.textContent = cleanSongTitle(song.title);
  songArtist.textContent = song.uploader;

  let songTitleText = songTitle.textContent;
  let songArtistText = songArtist.textContent;

  // Extraer "nombre base" quitando Jr/Sr/feat
  let baseArtist = songArtistText
    .replace(/\b(Jr|Sr|feat\.?|ft\.?)\b/gi, "")
    .trim();

  // Regex global e insensible a mayúsculas/minúsculas
  let regex = new RegExp(baseArtist, "gi");

  // Reemplazar todas las coincidencias del nombre base
  let songTitleDC = songTitleText.replace(regex, "");

  // Limpiar dobles espacios, guiones y paréntesis vacíos
  songTitleDC = songTitleDC
    .replace(/\s{2,}/g, " ") // dobles espacios
    .replace(/\s*[-–—]\s*/g, " ") // guiones sobrantes
    .replace(/(^|\s),\s*/g, "$1") // elimina comas al inicio o después de espacios
    .replace(/\(\s*\)/g, "") // paréntesis vacíos
    .trim();
  console.log("thumbnail", song.thumbnail);
  // Enviar a Discord
  setTimeout(async () => {
    await window.electronAPI.setDiscordActivity(
      `Reproduciendo 🎶 | (${formatTime(player.duration)})`,
      `${songTitleDC} - ${songArtistText}`,
      song.thumbnail,
      false
    );
  }, 5 * 1000);

  console.dir(song);
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
  }
  if (song?.filename?.includes(".mp3")) {
    isDownloaded = true;
  }
  if (isDownloaded) {
    console.log(song);
    const newStreamUrl = await window.electronAPI.streamSong(song);
    player.src = newStreamUrl;
    player
      .play()
      .catch((err) => debugLog("Error al reproducir tras renovar:", err));
  } else {
    console.dir("no esta descargada");
    const streamUrl = await window.electronAPI.streamSong(song);
    player.src = streamUrl;
  }
  console.log("isdownload", isDownloaded);

  player.play().catch((err) => {
    handleExpiredStream(song);
    if (isDownloaded) {
      return debugLog("Reproduciendo musica descargada...");
    }
    debugLog("Audio: URL posiblemente expirada o no soportada", err);
  });
  currentAudio = player;

  // 👉 Actualizar índice si la canción estaba en la cola
  const indexInQueue = queue.findIndex((s) => s.url === song.url);
  if (indexInQueue !== -1) {
    currentIndex = indexInQueue;
  } else {
    // Si no estaba en cola, reiniciamos con esta canción
    queue = [song];
    currentIndex = 0;
    renderQueue();
  }
}

player.addEventListener("ended", () => {
  if (currentIndex < queue.length - 1) {
    currentIndex++;
    playSong(queue[currentIndex]);
  } else {
    debugLog("Fin de la cola");
  }
});
function renderQueue() {
  const queueElement = document.getElementById("queueList");
  if (!queueElement) return;

  queueElement.innerHTML = "";
  queue.forEach((song, index) => {
    const li = document.createElement("li");
    li.classList.add("queue-item");

    // Contenido con imagen, botón de play y título
    li.innerHTML = `
      <img class="queue-thumb" src="${song.thumbnail}" alt="${song.title}">
      <span class="song-title">${song.title}</span>
    `;

    // Resaltar la canción que se está reproduciendo
    if (index === currentIndex) {
      li.classList.add("playing");
    }

    li.querySelector(".song-title").addEventListener("click", () => {
      currentIndex = index;
      playSong(queue[currentIndex]);
      renderQueue();
    });

    li.querySelector(".queue-thumb").addEventListener("click", () => {
      currentIndex = index;
      playSong(queue[currentIndex]);
      renderQueue();
    });

    queueElement.appendChild(li);
  });
}

// Cargar canciones descargadas
async function loadDownloaded() {
  const downloaded = await window.electronAPI.getDownloaded();
  downloadsList.innerHTML = "";

  if (downloaded.length === 0) {
    downloadsList.innerHTML = "<li>No hay descargas aún</li>";
    return;
  }

  downloaded.forEach((song) => {
    const li = document.createElement("li");

    // Si no hay thumbnail, usamos un placeholder
    const thumbnail = song.Thumbnail || "default-thumbnail.png";

    // Duración en formato minutos:segundos
    const duration = song.Duration
      ? `${Math.floor(song.Duration / 60)}:${String(
          song.Duration % 60
        ).padStart(2, "0")}`
      : "N/A";

    li.innerHTML = `
      <img src="${thumbnail}" alt="Thumbnail">
      <div class="song-info">
        <b>${song.Title || "Título desconocido"}</b><br>
        ${song.Uploader || "Artista desconocido"} (${duration})
      </div>
      <div class="song-actions">
        <button class="play">Reproducir</button>
        <button class="queue"><i class="fa-solid fa-plus"></i></button>
      </div>
    `;
    downloadsList.appendChild(li);

    // Reproducir canción
    li.querySelector(".play").addEventListener("click", () => {
      playSong(
        {
          title: song.Title,
          uploader: song.Uploader,
          duration: song.Duration,
          filename: song.Filename,
          thumbnail: song.Thumbnail,
        },
        true
      );
    });

    // Agregar a la cola
    li.querySelector(".queue").addEventListener("click", () => {
      addToQueue(song, true);
    });
  });
}
// Función de búsqueda y reproducción directa
function cleanQuery(query, maxChars = 40) {
  let cleaned = query;
  maxChars = 28;
  // Quitar paréntesis y corchetes con su contenido
  cleaned = cleaned.replace(/\([^)]+\)/g, "");
  cleaned = cleaned.replace(/\[[^\]]+\]/g, "");

  // Quitar "feat." y variaciones
  //  cleaned = cleaned.replace(/feat\.?[^,]*,/gi, "");
  cleaned = cleaned.replace(/feat\.?[^&]*&/gi, "");
  cleaned = cleaned.replace(/feat\.?[^-]*-/gi, "");
  cleaned = cleaned.replace(/feat\.?[^$]*$/gi, "");

  // Quitar "Remix", "Mixed", "Edit", etc.
  cleaned = cleaned.replace(/\b(remix|mixed|edit|version)\b/gi, "");

  // Quitar caracteres extra y espacios dobles
  cleaned = cleaned.replace(/\/|\\/g, " ");
  cleaned = cleaned.replace(/,+/g, " ");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.trim();

  // Limitar a los primeros N caracteres SIN contar espacios
  let count = 0;
  let result = "";
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] !== " ") {
      count++;
    }
    if (count > maxChars) break;
    result += cleaned[i];
  }
  return result.trim();
}

async function searchSongDirectPlay(query = "") {
  const searchContainer = document.getElementById("searchContainer");
  const downloadsContainer = document.getElementById("downloadsContainer");
  const qtab = document.getElementById("queuetab");
  const genreEl = document.getElementById("songGenre"); // Añade este elemento en tu HTML si quieres mostrar el género

  searchContainer.style.display = "block";
  downloadsContainer.style.display = "none";
  qtab.style.display = "none";
  searchTab.classList.add("active");
  downloadsTab.classList.remove("active");
  qtab.classList.remove("active");

  if (!query) {
    query = searchInput.value.trim();
  } else {
    searchInput.value = query;
  }
  if (!query) return;
  resultsList.innerHTML = "<li>Buscando...</li>";
  console.log("Buscando y reproduciendo:", cleanQuery(query));
  try {
    const results = await window.electronAPI.searchSong(cleanQuery(query));
    resultsList.innerHTML = "";

    if (results.length === 0) {
      resultsList.innerHTML = "<li>No se encontraron canciones</li>";
      if (genreEl) genreEl.textContent = "";
      return;
    }

    // PLAY DIRECTO DEL PRIMER RESULTADO
    let playRandom = results[Math.floor(Math.random() * results.length)];
    console.log("Reproduciendo aleatorio de los resultados:", playRandom);
    playSong(playRandom);

    // Mostrar género del primer resultado
    if (genreEl) {
      genreEl.textContent = results[0].genre
        ? `Género: ${results[0].genre}`
        : "";
      genreEl.style.display = results[0].genre ? "block" : "none";
    }

    // Renderiza los resultados igual que searchSongs
    results.forEach((song) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <img class="play" src="${song.thumbnail || ""}">
        <div class="song-info">
            <b>${song.title || "Sin título"}</b><br>
            ${song.uploader || "Desconocido"} (${song.duration || "?"}s)
            ${
              song.genre
                ? `<br><span class="genre-tag">${song.genre}</span>`
                : ""
            }
        </div>
        <div class="song-actions">
            <button class="playbtn"><i class="fa-solid fa-play"></i> Reproducir</button>
            <button class="download downloadButton"><i class="fa-solid fa-download"></i></button>
            <button class="queue"><i class="fa-solid fa-plus"></i></button>
        </div>
      `;
      resultsList.appendChild(li);

      li.querySelector(".play").addEventListener("click", () => playSong(song));
      li.querySelector(".playbtn").addEventListener("click", () =>
        playSong(song)
      );
      li.querySelector(".download").addEventListener("click", async () => {
        try {
          const res = await window.electronAPI.downloadSong(song);
          if (res.success) {
            if (res.alreadyExists) {
              debugLog(`La canción ya existe: ${song.title}`);
            } else {
              debugLog(`Descarga completada: ${song.title}`);
            }
            await loadDownloaded();
          } else {
            debugLog(`Error descargando ${song.title}: ${res.error}`);
            alert(`Error descargando ${song.title}: ${res.error}`);
          }
        } catch (err) {
          debugLog("Error en download listener:", err);
          alert(`Error inesperado descargando ${song.title}`);
        }
      });
      li.querySelector(".queue").addEventListener("click", () => {
        addToQueue(song);
      });
    });
  } catch (err) {
    resultsList.innerHTML = "<li>Error al buscar canciones</li>";
    if (genreEl) genreEl.textContent = "";
    debugLog("Error searchSongDirectPlay:", err);
    console.dir(err);
  }
}
// Función unificada para buscar canciones
async function searchSongs() {
  const searchContainer = document.getElementById("searchContainer");
  const downloadsContainer = document.getElementById("downloadsContainer");
  // Nuevo tab para la cola
  const qtab = document.getElementById("queuetab");

  searchContainer.style.display = "block"; // o "flex" según tu diseño
  downloadsContainer.style.display = "none";
  queuetab.style.display = "none";
  searchTab.classList.add("active");
  downloadsTab.classList.remove("active");
  qtab.classList.remove("active");

  const query = searchInput.value.trim();
  if (!query) return;
  resultsList.innerHTML = "<li>Buscando...</li>";

  try {
    const results = await window.electronAPI.searchSong(cleanQuery(query));
    resultsList.innerHTML = "";

    results.forEach((song) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <img class="play" src="${song.thumbnail}">
        <div class="song-info">
            <b>${song.title}</b><br>
            ${song.uploader} (${song.duration}s)
        </div>
        <div class="song-actions">
            <button class="playbtn"><i class="fa-solid fa-play"></i> Reproducir</button>
            <button class="download downloadButton"><i class="fa-solid fa-download"></i></button>
            <button class="queue"><i class="fa-solid fa-plus"></i></button>
        </div>
      `;
      resultsList.appendChild(li);

      // Reproducir directo
      li.querySelector(".play").addEventListener("click", () => playSong(song));
      li.querySelector(".playbtn").addEventListener("click", () =>
        playSong(song)
      );

      // Descargar canción desde la búsqueda
      li.querySelector(".download").addEventListener("click", async () => {
        try {
          const res = await window.electronAPI.downloadSong(song);

          if (res.success) {
            if (res.alreadyExists) {
              debugLog(`La canción ya existe: ${song.title}`);
            } else {
              debugLog(`Descarga completada: ${song.title}`);
            }

            // ✅ Actualizar la lista de descargas
            await loadDownloaded();
          } else {
            debugLog(`Error descargando ${song.title}: ${res.error}`);
            alert(`Error descargando ${song.title}: ${res.error}`);
          }
        } catch (err) {
          debugLog("Error en download listener:", err);
          alert(`Error inesperado descargando ${song.title}`);
        }
      });

      // Agregar a la cola
      li.querySelector(".queue").addEventListener("click", () => {
        addToQueue(song);
      });
    });
  } catch (err) {
    resultsList.innerHTML = "<li>Error al buscar canciones</li>";
    debugLog("Error searchSong:", err);
    console.dir(err);
  }
}

let currentSong = null;

function addToQueue(song, isDownloaded = false) {
  let songToplay = song;
  if (isDownloaded) {
    songToplay = {
      title: song.Title,
      uploader: song.Uploader,
      duration: song.Duration,
      filename: song.Filename,
      thumbnail: song.Thumbnail,
    };
  }
  queue.push(songToplay);
  debugLog("Agregada a la cola:", songToplay.title);

  console.dir(songToplay);
  // Si no hay nada sonando, reproducimos directamente
  if (player.src === "") {
    playNextInQueue();
  }
  setTimeout(() => {
    renderQueue();
  }, 4000); // pequeño retraso para asegurar que el DOM está listo
  // Actualizar la vista de la cola
}

function playNextInQueue() {
  if (queue.length === 0) {
    currentSong = null;
    return;
  }

  currentSong = queue.shift();
  playSong(currentSong);
}

// Evento para botón
//searchButton.addEventListener("click", searchSongs);

// Evento para Enter en input
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    searchSongs();
  }
});
// Búsqueda automática tras 2 segundos de inactividad
let searchTimeout;

searchInput.addEventListener("input", () => {
  if (searchInput.value.trim() === "") return;

  clearTimeout(searchTimeout); // resetea si el usuario sigue escribiendo
  searchTimeout = setTimeout(() => {
    searchSongs();
  }, 2000); // 2000ms = 2 segundos
});

// Debug de eventos de audio
player.addEventListener("play", () => debugLog("Audio: Reproduciendo"));
player.addEventListener("pause", () => debugLog("Audio: Pausado"));
player.addEventListener("ended", () => debugLog("Audio: Terminado"));
player.addEventListener("error", (e) => {
  const audioError = e.target.error;
  if (!audioError) return;

  switch (audioError.code) {
    case MediaError.MEDIA_ERR_ABORTED:
    case MediaError.MEDIA_ERR_NETWORK:
      debugLog("Audio: Error ignorado temporal", audioError);
      break;

    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: // code === 4
      if (player.src === "" || !player.src) {
        debugLog("Audio: src vacío o no soportado", audioError);
        alert(
          "No se pudo reproducir la canción (src vacío o formato no soportado)."
        );
        // 👉 Aquí podrías saltar a la siguiente canción de la cola si quieres
        if (queue.length > 0 && currentIndex < queue.length - 1) {
          currentIndex++;
          playSong(queue[currentIndex]);
        }
      } else {
        debugLog("Audio: Formato no soportado", audioError);
      }
      break;

    default:
      debugLog("Audio: Error real", audioError);
  }
});

// Inicializar
loadDownloaded();
debugLog("Aplicación iniciada");

const volumeSlider = document.getElementById("volumeSlider");
const muteBtn = document.getElementById("muteBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const repeatBtn = document.getElementById("repeatBtn");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");

let lastVolume = 1;
let isMuted = false;
let isRepeating = false;
progressBar.disabled = true; // Deshabilitado hasta que se cargue una canción

// Inicializar volumen
player.volume = 0.5;
volumeSlider.value = 0.5;

// ⏯ Play/Pause
playPauseBtn.addEventListener("click", () => {
  if (player.paused) {
    player.play();
    playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    player.pause();
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
});

// 🔁 Repetir
repeatBtn.addEventListener("click", () => {
  isRepeating = !isRepeating;
  console.log("Repetir:", isRepeating);
  if (isRepeating) {
    repeatBtn.style.backgroundColor = "#1db954";
    debugLog("Modo repetición activado");
  } else {
    repeatBtn.style.backgroundColor = "rgba(255,255,255,0.1)";
    debugLog("Modo repetición desactivado");
  }
  player.loop = isRepeating;
});

// 🔊 Mute/Unmute
muteBtn.addEventListener("click", () => {
  if (isMuted) {
    player.volume = lastVolume;
    volumeSlider.value = lastVolume;
    muteBtn.textContent = "🔊";
    isMuted = false;
  } else {
    lastVolume = player.volume;
    player.volume = 0;
    volumeSlider.value = 0;
    muteBtn.textContent = "🔇";
    isMuted = true;
  }
});

// 🎚 Control volumen
volumeSlider.addEventListener("input", (e) => {
  player.volume = e.target.value;
  if (player.volume > 0) {
    lastVolume = player.volume;
    muteBtn.textContent = "🔊";
    isMuted = false;
  } else {
    muteBtn.textContent = "🔇";
  }
});

// ⏱ Actualizar barra de progreso y tiempos
player.addEventListener("timeupdate", async () => {
  let valueTemp = (player.currentTime / player.duration) * 100 || 0;
  progressBar.value = valueTemp;
  currentTimeEl.textContent = formatTime(player.currentTime);
});

// Función mejorada para obtener una canción aleatoria de un artista en iTunes
async function getRandomSongByArtist(artistName, excludeTrackName = null) {
  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(
      artistName
    )}&entity=song&limit=10`
  );
  const data = await response.json();
  let songs = data.results;
  if (excludeTrackName) {
    songs = songs.filter((song) => {
      return song.trackName.toLowerCase() !== excludeTrackName.toLowerCase();
    });
  }
  console.log("Canciones antes de filtrar:", songs);
  // Filtrar canciones que contengan todas las partes del nombre del artista (no solo una)
  // Normaliza: quita espacios y puntuación, pasa a minúsculas
  function normalize(str) {
    return str.replace(/[^\wáéíóúüñ]/gi, "").toLowerCase();
  }

  // Divide por comas y espacios, y filtra partes vacías
  const artistParts = artistName
    .split(/,|\s+/)
    .map((part) => normalize(part))
    .filter(Boolean);

  // Filtra las canciones donde al menos la mitad de los "parts" estén presentes
  songs = songs.filter((song) => {
    const normalizedArtist = normalize(song.artistName);
    const matches = artistParts.filter((part) =>
      normalizedArtist.includes(part)
    );
    return matches.length >= Math.ceil(artistParts.length / 2);
  });

  // Excluir la canción actual si es necesario
  if (songs.length === 0) return null;
  console.log("canciones encontradas", songs);
  const randomIndex = Math.floor(Math.random() * songs.length);
  const selectedSong = songs[randomIndex];
  // Devuelve más datos, incluyendo el género
  return {
    trackName: selectedSong.trackName,
    artistName: selectedSong.artistName,
    genre: selectedSong.primaryGenreName || null,
    cover:
      selectedSong.artworkUrl100?.replace("100x100bb.jpg", "500x500bb.jpg") ||
      null,
  };
}

// Ejemplo de uso integrado:
async function playRandomSongByArtistDirect() {
  const title = document.getElementById("songTitle").textContent;
  const artist = document.getElementById("songArtist").textContent;
  const song = await getRandomSongByArtist(artist);
  if (song) {
    const songToPlay = `${song.artistName}`;
    // Ahora puedes pasar el género si tu función lo soporta

    await searchSongDirectPlay(songToPlay, title);
    // Si searchSongDirectPlay solo espera el query, puedes modificarla para aceptar también el género
    // Ejemplo: await searchSongDirectPlay(songToPlay, song.genre);
  } else {
    console.log("No se encontraron canciones.");
  }
}

player.addEventListener("ended", () => {
  playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  if (!isRepeating) {
    currentAudio = null;
  }
  progressBar.value = 0;
  currentTimeEl.textContent = "0:00";

  setTimeout(async () => {
    await window.electronAPI.setDiscordActivity(
      `En hub | (${formatTime(player.duration)})`,
      `Esperando canción...`,
      "logo_app_mexlify_center",
      false
    );
  }, 5 * 1000);

  // Ejemplo de uso:
  playRandomSongByArtistDirect();
});

// ⏱ Mostrar duración total
player.addEventListener("loadedmetadata", async () => {
  totalTimeEl.textContent = formatTime(player.duration);
});

// 🎵 Buscar en la barra
progressBar.addEventListener("input", () => {
  player.currentTime = (progressBar.value / 100) * player.duration;
});

player.addEventListener("play", () => {
  playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  setTimeout(async () => {
    await window.electronAPI.setDiscordActivity(
      `En reproducción | (${formatTime(player.duration)})`,
      `${document.getElementById("songTitle").textContent} - ${
        document.getElementById("songArtist").textContent
      }`,
      `${document.getElementById("cover").src}`,
      false
    );
  }, 5 * 1000);
  renderQueue(); // actualizar resaltado en la cola
});

player.addEventListener("pause", () => {
  setTimeout(async () => {
    await window.electronAPI.setDiscordActivity(
      `En pausa | (${formatTime(player.duration)})`,
      `${document.getElementById("songTitle").textContent} - ${
        document.getElementById("songArtist").textContent
      }`,
      `${document.getElementById("cover").src}`,
      false
    );
  }, 5 * 1000);
  playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
});

// 🕒 Formato mm:ss
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

const searchTab = document.getElementById("searchTab");
const downloadsTab = document.getElementById("downloadsTab");
const searchContainer = document.getElementById("searchContainer");
const downloadsContainer = document.getElementById("downloadsContainer");
// Nuevo tab para la cola
const queueTabButton = document.getElementById("queueTabButton"); // tu botón del tab
const queueTab = document.getElementById("queuetab");

// Tabs existentes
searchTab.addEventListener("click", () => {
  searchContainer.style.display = "block"; // o "flex" según tu diseño
  downloadsContainer.style.display = "none";
  queueTab.style.display = "none";
  searchTab.classList.add("active");
  downloadsTab.classList.remove("active");
  queueTab.classList.remove("active");
});

downloadsTab.addEventListener("click", () => {
  searchContainer.style.display = "none";
  downloadsContainer.style.display = "block";
  queuetab.style.display = "none";
  downloadsTab.classList.add("active");
  searchTab.classList.remove("active");
  queueTab.classList.remove("active");
});

queueTabButton.addEventListener("click", () => {
  searchContainer.style.display = "none";
  downloadsContainer.style.display = "none";
  queueTab.style.display = "block";
  queueTabButton.classList.add("active");
  searchTab.classList.remove("active");
  downloadsTab.classList.remove("active");
});

let frames = 0;
let lastTime = performance.now();

function measureFPS() {
  frames++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    // cada 1 segundo
    console.log("[Renderer] FPS real:", frames);
    frames = 0;
    lastTime = now;
  }
  requestAnimationFrame(measureFPS);
}

//measureFPS();

const box = document.querySelector(".glass-box");
const input = document.getElementById("bgInput");
const btnChangeBG = document.getElementById("changeBg");

// Aplicar fondo guardado al cargar
const savedUrl = localStorage.getItem("bgUrl");
if (savedUrl) {
  box.style.backgroundImage = `url('${savedUrl}')`;
  box.style.backgroundPosition = "top";
  box.style.backgroundSize = "cover";
  box.style.backgroundRepeat = "no-repeat";

  // Para el overlay negro con linear-gradient:
  box.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${savedUrl}')`;
}
// Guardar y aplicar nueva URL
btnChangeBG.addEventListener("click", () => {
  const currentUrl = localStorage.getItem("bgUrl");
  // Si ya hay un bg guardado, borrarlo
  if (currentUrl && input.value.trim() == "") {
    box.style.backgroundImage = "";
    localStorage.removeItem("bgUrl");
    return console.log("bg borrado");
  }

  const url = input.value.trim();
  if (!url) return;

  // Guardar URL en localStorage
  localStorage.setItem("bgUrl", url);

  // Aplicar inmediatamente al background
  box.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${url}')`;
  box.style.backgroundPosition = "top";
  box.style.backgroundSize = "cover";
  box.style.backgroundRepeat = "no-repeat";

  console.log("bg setted");
});
