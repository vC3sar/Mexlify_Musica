document.addEventListener("DOMContentLoaded", () => {
  // ======= Fondo dinámico central =======
  const box = document.querySelector(".glass-box");
  const input = document.getElementById("bgInput");
  const btnChangeBG = document.getElementById("changeBg");

  const savedUrl = localStorage.getItem("bgUrl");
  if (savedUrl) {
    input.value = savedUrl; // Muestra la URL en el input
    box.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${savedUrl}')`;
    box.style.backgroundPosition = "top";
    box.style.backgroundSize = "cover";
    box.style.backgroundRepeat = "no-repeat";
  }

  btnChangeBG.addEventListener("click", () => {
    const currentUrl = localStorage.getItem("bgUrl");
    const url = input.value.trim();
    if (!url) return;
    localStorage.setItem("bgUrl", url);
    box.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${url}')`;
    box.style.backgroundPosition = "top";
    box.style.backgroundSize = "cover";
    box.style.backgroundRepeat = "no-repeat";
    console.log("bg setted");
  });

  const btnRemoveBG = document.getElementById("removeBg");
  btnRemoveBG.addEventListener("click", () => {
    localStorage.removeItem("bgUrl");
    box.style.backgroundImage = "";
    input.value = "";
    console.log("bg removed");
  });

  // ======= Imagen de fondo del reproductor =======

  const playerStyle = document.getElementById("playerCard"); // Elemento que tendrá el background
  const inputStyle = document.getElementById("imgInput"); // Input para la URL
  const btnStyle = document.getElementById("setImgBtn"); // Botón para asignar
  const songTitle = document.getElementById("songTitle");

  // Al iniciar la app, revisa si existe playerImg en localStorage
  const savedImg = localStorage.getItem("playerImg");
  if (savedImg) {
    inputStyle.value = savedImg; // Muestra la URL en el input
    setTimeout(() => {
      console.log("Opacity set to 50%");
      document.getElementById("cover").style.opacity = "50%"; // baja opacidad de la carátula
    }, 500); // espera medio segundo para asegurar que la imagen se haya cargado
    player.style.backgroundColor = "transparent";
    playerStyle.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${savedImg}')`;
    playerStyle.style.backgroundPosition = "top";
    playerStyle.style.backgroundSize = "cover";
    playerStyle.style.backgroundRepeat = "no-repeat";
    songTitle.style.backgroundColor = "rgba(255, 255, 255, 0.2) ";
    songTitle.style.padding = "2px 6px";
  }

  // Al hacer click en el botón, guarda la URL si es diferente
  btnStyle.addEventListener("click", () => {
    document.getElementById("cover").style.backgroundColor = "";
    const url = inputStyle.value.trim();
    if (!url) return; // No hacer nada si está vacío
    if (url === localStorage.getItem("playerImg")) return; // No hacer nada si es igual
    localStorage.setItem("playerImg", url);
    playerStyle.style.backgroundColor = "";
    playerStyle.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${url}')`;
    playerStyle.style.backgroundPosition = "top";
    playerStyle.style.backgroundSize = "cover";
    playerStyle.style.backgroundRepeat = "no-repeat";
    songTitle.style.backgroundColor = " rgba(255, 255, 255, 0.2) ";
    songTitle.style.padding = "2px 6px";
    setTimeout(() => {
      console.log("Opacity set to 50%");
      document.getElementById("cover").style.opacity = "50%";
      document.getElementById("cover").style.transition = "opacity 0.5s ease";
    }, 500);
  });

  const btnRemStyle = document.getElementById("removeImgBtn");
  btnRemStyle.addEventListener("click", () => {
    localStorage.removeItem("playerImg");
    playerStyle.style.backgroundImage = "";
    inputStyle.value = "";
    songTitle.style.backgroundColor = "";
    songTitle.style.padding = "";
    document.getElementById("cover").style.opacity = "100%"; // restaura opacidad de la carátula
  });
  // Función para actualizar el color de fondo basado en la imagen del reproductor siempre y cuando no haya una imagen personalizada
  document.getElementById("player").onplay = function () {
    console.log("Player loaded");
    console.log("Saved img:", savedImg);
    if (!savedImg) {
      updatePlayerBgColor();
    }
  };
  function updatePlayerBgColor() {
    console.log("Updating player bg color");

    const img = document.getElementById("cover");

    // Asegúrate de que la imagen esté completamente cargada antes de procesarla
    if (img.complete) {
      const colorThief = new ColorThief();

      // Extrae una paleta de colores de la imagen (toma 10 colores)
      const palette = colorThief.getPalette(img, 10); // Cambia el valor para obtener más o menos colores

      console.log("Color palette:", palette);

      // Calcula el promedio de los colores extraídos
      let r = 0,
        g = 0,
        b = 0;
      palette.forEach((color) => {
        r += color[0];
        g += color[1];
        b += color[2];
      });

      const averageColor = [
        Math.floor(r / palette.length),
        Math.floor(g / palette.length),
        Math.floor(b / palette.length),
      ];

      console.log("Average color:", averageColor);

      // Aplica el color promedio como fondo
      const playerCard = document.getElementById("playerCard");
      if (playerCard) {
        playerCard.style.backgroundColor = `rgb(${averageColor.join(
          ","
        )}, 0.7)`;
      }
    } else {
      // Si la imagen no está cargada, vuelve a intentarlo
      img.onload = updatePlayerBgColor; // Espera hasta que la imagen cargue completamente
      img.onerror = function () {
        console.error("Error loading image.");
      };
    }
  }

  // ======= Fin fondo dinámico =======
});

//load custom gradient from localStorage
document.addEventListener("DOMContentLoaded", () => {
  const savedColor1 = localStorage.getItem("gradientColor1");
  const savedColor2 = localStorage.getItem("gradientColor2");
  if (savedColor1 && savedColor2) {
    document.getElementById("color1").value = savedColor1;
    document.getElementById("color2").value = savedColor2;
    gradientController.setGradient(savedColor1, savedColor2);
  } else {
    gradientController.logCurrentGradient(true); // true para resetear a valores por defecto
  }
});
const gradientController = {
  // Obtiene el background actual (linear-gradient)
  getCurrentGradient() {
    return getComputedStyle(document.body).backgroundImage;
  },

  // Convierte color RGB a HEX
  rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = Number(x).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  },

  // Convierte HEX a RGB
  hexToRgb(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((x) => x + x)
        .join("");
    }
    const num = parseInt(hex, 16);
    return [num >> 16, (num >> 8) & 255, num & 255];
  },

  // Convierte string "rgb(8,0,20)" a HEX "#080014"
  rgbStringToHex(rgbStr) {
    const nums = rgbStr.match(/\d+/g);
    if (!nums) return rgbStr;
    return this.rgbToHex(nums[0], nums[1], nums[2]);
  },

  // Establece el degradado con colores (admite HEX o RGB string)
  setGradient(color1, color2) {
    // Si no se pasan valores, toma los del input
    if (!color1 || !color2) {
      color1 = document.getElementById("color1").value;
      color2 = document.getElementById("color2").value;
    }
    // Permite valores en formato rgb(r,g,b)
    if (/rgb\(/i.test(color1)) {
      color1 = this.rgbStringToHex(color1);
    }
    if (/rgb\(/i.test(color2)) {
      color2 = this.rgbStringToHex(color2);
    }
    document.body.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
    localStorage.setItem("gradientColor1", color1);
    localStorage.setItem("gradientColor2", color2);
    console.log("Gradient set to:", this.getCurrentGradient());
  },

  // Muestra el degradado actual en la consola
  logCurrentGradient(resetColors = false) {
    // Si no se quiere mantener los colores actuales, resetea
    if (resetColors) {
      console.log("Resetting colors to default");
      const color1 = document.getElementById("color1");
      const color2 = document.getElementById("color2");
      color1.value = "#080014";
      color2.value = "#080014";
      localStorage.removeItem("gradientColor1");
      localStorage.removeItem("gradientColor2");
      return this.setGradient(color1.value, color2.value);
    }
    console.log(this.getCurrentGradient());
    color1.value = this.rgbStringToHex(
      getComputedStyle(document.body).backgroundImage.match(
        /rgb\(\d+,\s*\d+,\s*\d+\)/g
      )[0]
    );
    color2.value = this.rgbStringToHex(
      getComputedStyle(document.body).backgroundImage.match(
        /rgb\(\d+,\s*\d+,\s*\d+\)/g
      )[1]
    );
  },
};

// JavaScript funcional de tabs
const settings = {
  openTab(tabId, element) {
    // Oculta todos los tabs
    const tabs = document.querySelectorAll("#tabGeneral, #tabTheme");
    tabs.forEach((tab) => {
      tab.style.display = "none";
    });
    // Muestra el tab seleccionado
    document.getElementById(tabId).style.display = "block";
    // Resalta el botón seleccionado
    const buttons = document.querySelectorAll(".tablinkSettings");
    buttons.forEach((btn) => btn.classList.remove("active"));
    element.classList.add("active");
  },
};

// Opcional: autoabrir el tab por defecto al cargar
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("defaultTab").click();
});

window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("spinner-overlay").classList.add("hide");
    setTimeout(() => {
      document.getElementById("spinner-overlay").style.display = "none";
    }, 400); // Duración del fade-out (debe coincidir con la transición del CSS)
  }, 1000); // El spinner permanece visible 2 segundos
});

// declarar variable para saber si activar la voz - variable global por defecto false
let voiceEnabled = false;

// función para activar o desactivar la voz
document
  .getElementById("toggleVoiceBtn")
  .addEventListener("click", toggleVoice);
function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  const status = voiceEnabled ? "activada" : "desactivada";
  localStorage.setItem("voiceEnabled", status);
  console.log(`Voz ${status}`);
  const voiceStatus = document.getElementById("toggleVoiceBtn");
  voiceStatus.textContent = voiceEnabled ? "Desactivar voz" : "Activar voz";
  const voiceLabel = document.getElementById("voiceLabel");
  voiceLabel.textContent = `Voz ${status}`;
}
function say(text) {
  /* use google tts for voice personalized https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=Se%20esta%20reproduciendo%20so%20far%20so%20fake&tl=es-MX */
  const audio = new Audio(
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(
      text
    )}&tl=es-MX`
  );
  audio.play({
    speed: 1.1,
  });
}

function saySong(message) {
  if (message === "test") {
    say("Hola, soy Mexlify, tu reproductor de música.");
    console.log("Test de voz ejecutado");
    return;
  }
  if (!voiceEnabled) return;
  const audio = new Audio(
    "resources/ahoraseestareproduciendunanuevacancion.mp3"
  );
  audio.preload = "auto"; // 👈 asegura que se descargue antes de reproducir

  audio.addEventListener("canplaythrough", () => {
    audio.play().then(() => {
      audio.addEventListener("ended", () => {
        say(message);
      });
    });
  });
}
let testVoiceRunning = false;
// botón para probar la voz
document.getElementById("testVoiceBtn").addEventListener("click", () => {
  if (testVoiceRunning) return;
  saySong("test");
  testVoiceRunning = true;
  const testStatus = document.getElementById("testVoiceBtn");
  testStatus.textContent = "Test de voz en curso...";
  setTimeout(() => {
    testStatus.textContent = "Probar voz";
    testVoiceRunning = false;
  }, 4700);
});

