# 🎵 Mexlify Música [![Node.js CI](https://github.com/vC3sar/Mexlify_Musica/actions/workflows/node.js.yml/badge.svg)](https://github.com/vC3sar/Mexlify_Musica/actions/workflows/node.js.yml)

**Mexlify Música** es una aplicación de escritorio para Windows desarrollada con **Electron** que permite **escuchar música sin anuncios**, **buscar canciones** en YouTube, **descargar audio en MP3** y **mostrar tu actividad en Discord** mediante **Rich Presence**.  
Todo esto sin recopilar datos personales ni incluir publicidad.

---

## 🚀 Características Principales

- 🎧 **Escucha música sin anuncios**
- 🔎 **Búsqueda inteligente** con corrección automática de nombres (API de iTunes + Redis)
- 💾 **Descarga canciones** en formato `.mp3`
- 🖼️ **Portadas automáticas** y metadatos integrados
- 💬 **Integración con Discord RPC** (Rich Presence)
- 🧠 **Caché inteligente** local y remoto (Redis)
- 🧩 **Interfaz limpia** y sin distracciones
- ⚙️ **Compatible con Windows 10/11**

---

## 🧱 Tecnologías Utilizadas

- Electron — Motor principal de la aplicación
- yt-dlp — Extracción de metadatos y descarga de audio
- ffmpeg-static — Conversión a formato MP3
- Discord RPC — Presencia en Discord
- Node.js — Backend de ejecución
- API personalizada de Redis/iTunes — Corrección de títulos y metadatos de canciones

---

## 🖥️ Instalación

### 🔧 Requisitos previos

- Node.js v22 o superior  
- npm o yarn  
- Windows 10/11 no trabaja con linux debido al PATH de ffmpeg personalizado con .exe

### 📦 Instalación y ejecución

```
# Clonar el repositorio
git clone https://github.com/vaensystems/mexlify-music.git
cd mexlify-music

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Compilar versión final
npm run build
```

La aplicación generará un archivo ejecutable `.exe` dentro de `/dist`.

---

## 🕹️ Integración con Discord

Mexlify Música muestra en tu perfil de Discord lo que estás escuchando.  
Para habilitarlo:

1. Crea una aplicación en el Portal de Desarrolladores de Discord.
2. Copia el Client ID
3. Reemplázalo en el código:
   ```js
   const CLIENT_ID = "TU_CLIENT_ID_AQUI";
   ```
4. Inicia la app y verás algo como:  
   > 🎶 “Escuchando: Canción actual — Mexlify Music”

---

## 📁 Estructura del Proyecto

```
Mexlify/
├── main.js
├── preload.js
├── index.html
├── logo.png
├── package.json
└── /node_modules
```

---

## 🧩 API y Funcionalidades Internas

- Búsqueda de canciones con Redis + iTunes
- Descarga de audio en MP3
- Streaming directo sin descarga
- Caché local y remoto para resultados más rápidos

---

## 🔒 Términos y Condiciones de Uso

### 1. Uso de la Aplicación
Mexlify Música es una aplicación de escritorio gratuita para escuchar música sin anuncios.  
Está destinada únicamente a uso personal.  
No está permitido modificar, redistribuir o vender la aplicación sin autorización.

### 2. Propiedad Intelectual
Mexlify es un proyecto de código abierto, pero la marca, logo e interfaz están protegidos por derechos de autor.  
El contenido musical pertenece a sus respectivos autores.

### 3. Privacidad
Mexlify no recopila información personal.  
Puedes unirte a la comunidad en Discord para soporte técnico o sugerencias.

### 4. Limitación de Responsabilidad
La aplicación se ofrece “tal cual”, sin garantía de ningún tipo.  
Los desarrolladores no se hacen responsables de daños directos o indirectos derivados del uso del software.

### 5. Modificaciones
Los términos pueden cambiar sin previo aviso. Las actualizaciones se publicarán en Mexlify.top.

### 6. Contacto
📬 info@Mexlify.top

---

## 🧾 Licencia

Este proyecto se distribuye bajo una licencia de código abierto modificada, permitiendo su uso personal y educativo.  
Queda prohibida su redistribución con fines comerciales sin consentimiento del autor.

© 2025 VAEN Systems  
Mexlify.top

---

## 🌐 Aviso Legal

Mexlify actúa únicamente como intermediario técnico para acceder a contenido público de YouTube.  
No aloja, modifica ni distribuye dicho contenido.  
El uso de Mexlify implica la aceptación de los Términos de Servicio de YouTube.

---

## 💬 Comunidad

Únete a la comunidad de Mexlify en Discord:  
👉 [https://discord.gg/JRTtZWhDF8](https://discord.gg/JRTtZWhDF8)

---

Versión: 1.0.0 Alpha
Última actualización: 03 de Octubre de 2025  
Desarrollado por: VAEN Systems
