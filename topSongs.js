// topSongs.js
// Función para obtener y reproducir la canción más popular de un país
async function playCountry(countryCode = "mexico", type = "month") {
  try {
    const backtopBtn = document.getElementById("backtop");
    backtopBtn.style = "";
    // Llama a tu API, por ejemplo: /top?country=mx&type=month
    const resp = await fetch(
      `http://45.136.18.222:3000/top?country=${countryCode}&type=${type}`
    );
    console.dir(resp);
    if (!resp.ok) throw new Error("Error al obtener el top");
    const data = await resp.json();
    console.dir(data);
    if (!data.tracks || !data.tracks.length) {
      alert("No hay tracks para este país/tipo.");
      return;
    }

    // Crea/actualiza el contenedor para la lista
    let container = document.getElementById("country-top-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "country-top-container";
      document.body.appendChild(container);
    }
    container.innerHTML = `<h3>TOP ${
      data.count
    } - ${data.country.toUpperCase()} (${data.type
      .replace("month", "Mensual")
      .replace("year", "Anual")
      .replace("day", "Diaria")})</h3>`;

    // Crear el botón "Reproducir todo" si no existe
    if (!document.getElementById("playAllbtn")) {
      const btnPlayAll = document.createElement("button");
      btnPlayAll.id = "playAllbtn";
      btnPlayAll.className = "vaen-play-btn";
      btnPlayAll.textContent = "▶ Reproducir todo";
      container.appendChild(btnPlayAll);
    }
    // Listado de tracks
    let htmlList = "<ol>";
    data.tracks.forEach((track) => {
      htmlList += `<li style="margin-bottom:10px;">
        <i class="fa-solid fa-music"></i>
        <a target="_blank" style="font-weight:bold;text-decoration:none;">${track.trackName}</a>
        <span style="margin-left:2px;color:#444;">${track.artist}</span>
        <span style="margin-left:2px;color:#888;font-size:0.7rem;">(${track.listeners} oyentes)</span>
      </li>`;
    });
    htmlList += "</ol>";
    container.innerHTML += htmlList;

    let idxPlaying = null;
    // Agrega evento para reproducir al hacer clic en el nombre de la canción
    container.querySelectorAll("a").forEach((a, idx) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const track = data.tracks[idx];
        const query = `${track.artist} ${track.trackName}`;
        searchSongDirectPlay(query);

        // Actualiza el título del enlace solo del que esta reproduciendo para indicarlo, resetea los demas
        container.querySelectorAll("a").forEach((link, index) => {
          if (index === idx) {
            idxPlaying = link;
            link.style.color = "#c0006e";
            link.style.fontWeight = "bold";
            // añade tambien color al autor
            if (link.nextElementSibling) {
              link.nextElementSibling.style.color = "#6b003dff";
            }
          } else {
            link.style.color = "#ffff";
            link.style.fontWeight = "bold";
            if (link.nextElementSibling) {
              link.nextElementSibling.style.color = "#888";
            }
          }
        });
      });
    });

    // Ahora sí, el botón existe en el DOM y puedes añadir el event listener
    setTimeout(() => {
      let btnPlayAll = document.getElementById("playAllbtn");
      if (btnPlayAll) {
        btnPlayAll.addEventListener("click", () => {
          window.songQueue = data.tracks.map(
            (track) => `${track.artist} ${track.trackName}`
          );
          playNextInQueue();
        });
      }
    }, 1 * 100);

    // Función para reproducir la siguiente canción en la cola
    window.playNextInQueue = function () {
      if (!window.songQueue || window.songQueue.length === 0) return;
      const nextQuery = window.songQueue.shift();
      searchSongDirectPlay(nextQuery);
      // Espera a que termine la canción actual
      const player = document.getElementById("player");
      if (player) {
        player.onended = function () {
          playNextInQueue();
        };
      }
    };
  } catch (e) {
    alert("Error: " + e.message);
  }
}

