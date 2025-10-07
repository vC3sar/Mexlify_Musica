function showModal(
  title = "Mexlify",
  message = "Se ha generado un mensaje, sin embargo no se ha especificado el contenido",
  type = "info",
  id = null
) {
  Swal.fire({
    title: `${title}`,
    html: `<div style="
      background: rgba(255, 255, 255, 0.3);
      border-radius: 16px;
      padding: 1.2rem 1.1rem;
      box-shadow: 0 8px 32px 0 rgba(60, 60, 100, 0.18);
      backdrop-filter: blur(12px) saturate(140%);
      border: 1.5px solid rgba(255, 255, 255, 0.43);
      color: #232031;
      font-size: 1.1rem;
    ">
      ${message}
    </div>`,
    confirmButtonText: "Cerrar ✖",
    confirmButtonColor: "#000",
    showCancelButton: true,
    cancelButtonText: "Volver a Intentarlo ↻",
    cancelButtonColor: "#d33",
    color: "#232031",
    background: "rgba(255, 255, 255, 0.53)",
    allowOutsideClick: true,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  }).then((result) => {
    if (result.isConfirmed && id === "terms-no") {
      window.close();
    } else {
      return window.location.reload();
    }
  });
}

// show terms and conditions on first use
document.addEventListener("DOMContentLoaded", () => {
  showTermsAndConditions();
});
// first use accept terms and conditions
function showTermsAndConditions() {
  if (localStorage.getItem("termsAccepted")) {
    return;
  }

  Swal.fire({
    title: "",
    html: `
    <div style="
      max-height: 60vh;
      overflow-y: auto;
      padding: 2rem 1.5rem 1.5rem 1.5rem;
      color: #1a133f;
      font-size: 1.08rem;
      line-height: 1.65;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 1.3rem;
      box-shadow: 0 8px 40px 0 rgba(70, 65, 105, 0.18);
      border: 1.5px solid rgba(255,255,255,0.32);
      text-align: left;
      font-family: 'Segoe UI', 'Arial', sans-serif;
      backdrop-filter: blur(18px) saturate(140%);
    ">
      <h1 style="font-size:2rem;font-weight:800;margin-bottom:1.2rem;color:#00000;text-shadow:0 2px 6px #ffffff80;">Términos y Condiciones de Uso</h1>
      <p style="margin-bottom:1.1rem;">Bienvenido a Mexlify Música. Al descargar, instalar o utilizar nuestra aplicación, aceptas los siguientes términos y condiciones. Por favor, léelos cuidadosamente antes de utilizar el servicio.</p>

      <h2 style="margin:1.4rem 0 0.7rem 0;font-weight:700;color:#5b3bb0;">Mexlify Música</h2>
      <h3 style="margin-bottom:0.5rem;color:#00000;font-weight:600;">1. Uso de la Aplicación</h3>
      <ul>
        <p>1.1 Mexlify Música es una aplicación de escritorio para Windows diseñada para escuchar música sin anuncios.</p>
        <p>1.2 El uso de la aplicación es personal y no comercial.</p>
        <p>1.3 No está permitido modificar, distribuir o vender la aplicación sin autorización expresa de los desarrolladores.</p>
      </ul>

      <h3 style="margin-bottom:0.5rem;color:#00000;font-weight:600;">2. Propiedad Intelectual</h3>
      <ul>
        <p>2.1 Mexlify es un proyecto de código abierto, pero la marca, el logo y la interfaz gráfica están protegidos por derechos de autor.</p>
        <p>2.2 El contenido musical disponible en la aplicación es propiedad de sus respectivos autores y está sujeto a sus propias licencias.</p>
      </ul>

      <h3 style="margin-bottom:0.5rem;color:#00000;font-weight:600;">3. Privacidad</h3>
      <ul>
        <p>3.1 Mexlify Música no recopila información personal sin tu consentimiento.</p>
        <p>3.2 Para soporte técnico o sugerencias, puedes unirte a nuestra comunidad en Discord.</p>
      </ul>

      <h3 style="margin-bottom:0.5rem;color:#00000;font-weight:600;">4. Limitación de Responsabilidad</h3>
      <ul>
        <p>4.1 La aplicación se proporciona "tal cual", sin garantías de ningún tipo.</p>
        <p>4.2 Mexlify no se hace responsable por daños directos o indirectos derivados del uso de la aplicación.</p>
      </ul>

      <h3 style="margin-bottom:0.5rem;color:#00000;font-weight:600;">5. Modificaciones</h3>
      <ul>
        <p>5.1 Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán publicados en esta página.</p>
      </ul>

      <h3 style="margin-bottom:0.5rem;color:#00000;font-weight:600;">6. Contacto</h3>
      <p style="margin-bottom:1.1rem;">Para dudas o sugerencias, únete a nuestra 
        <a href="https://discord.gg/hpRMKdqWRy" target="_blank" style="color:#4631c8;font-weight:500;text-decoration:underline;">comunidad en Discord</a>.
      </p>

      <hr style="border: none; border-top: 1.5px solid #6a47b555; margin: 2.1rem 0 2.1rem 0;">

      <h2 style="margin-bottom:0.7rem;font-weight:700;color:#5b3bb0;">Mexlify</h2>
      <p style="margin-bottom:0.3rem;"><b>Última actualización:</b> 03 de Octubre del 2025</p>
      <p style="margin-bottom:0.8rem;">
        Bienvenido a Mexlify, accesible en <b>Mexlify.top</b>. Al utilizar esta aplicación, usted ("el Usuario") acepta los presentes Términos de Uso. Si no está de acuerdo con estos términos, le recomendamos no utilizar Mexlify.
      </p>
      <ol>
        <p>
          <b>Descripción del Servicio</b><br>
          Mexlify es una aplicación que permite a los usuarios buscar, reproducir y gestionar playlists de contenido de audio y video disponible públicamente en YouTube. La aplicación actúa como un cliente técnico, facilitando el acceso a dichos contenidos sin almacenarlos, modificarlos ni distribuirlos directamente. Las funciones incluyen crear playlists, añadir canciones, registrar historiales de escucha y gestionar una lista de "Me gusta", todo ello vinculado a identificadores de YouTube.
        </p>
        <p>
          <b>Rol de Mexlify como Intermediario</b><br>
          Mexlify opera como un intermediario técnico, similar a un navegador o buscador, conectando al Usuario con contenido alojado en plataformas externas, principalmente YouTube. No controlamos ni intervenimos en el contenido al que se accede, cuya disponibilidad, legalidad y gestión dependen exclusivamente de dichas plataformas y sus titulares.
        </p>
        <p>
          <b>Obligaciones del Usuario</b><br>
          El Usuario se compromete a:
          <ul>
            <p>A) Utilizar Mexlify únicamente para fines personales y no comerciales, salvo autorización expresa por escrito del responsable de la aplicación.</p>
            <p>B) Cumplir con los Términos de Servicio de YouTube al reproducir o gestionar contenido a través de Mexlify.</p>
            <p>C) No emplear la aplicación para actividades ilícitas, fraudulentas o que infrinjan derechos de terceros, incluyendo derechos de propiedad intelectual.</p>
            <p>D) Proporcionar información veraz al registrarse y gestionar su cuenta, si aplica.</p>
          </ul>
          El incumplimiento de estas obligaciones será responsabilidad exclusiva del Usuario.
        </p>
        <p>
          <b>Funcionamiento y Limitaciones</b><br>
          Mexlify utiliza una base de datos para almacenar información sobre playlists, canciones (identificadas por su youtube_id) e historiales de escucha asociados al usuario autenticado mediante Supabase. Sin embargo:
          <ul>
            <p>A) El contenido multimedia (audio/video) no se almacena en Mexlify, sino que se reproduce directamente desde YouTube.</p>
            <p>B) Las funciones como "Me gusta" o historial de escucha dependen de la disponibilidad del contenido en YouTube y pueden no funcionar si este es eliminado o restringido.</p>
          </ul>
        </p>
        <p>
          <b>Exención de Responsabilidad</b><br>
          Mexlify se proporciona "tal cual" y "según disponibilidad", sin garantías expresas o implícitas. El responsable de Mexlify no asume responsabilidad por:
          <ul>
            <p>A) Fallos técnicos, interrupciones o indisponibilidad de la aplicación o del contenido de YouTube.</p>
            <p>B) La legalidad, calidad o idoneidad del contenido al que el Usuario accede.</p>
            <p>C) Acciones tomadas por YouTube u otros terceros (como suspensión de cuentas o bloqueo de acceso) derivadas del uso de Mexlify.</p>
            <p>D) Pérdidas o daños directos, indirectos o consecuentes ocasionados por el uso de la aplicación.</p>
          </ul>
          El Usuario acepta utilizar Mexlify bajo su propia responsabilidad.
        </p>
        <p>
          <b>Modificaciones y Terminación</b><br>
          El responsable de Mexlify se reserva el derecho de modificar estos Términos de Uso en cualquier momento, publicando la versión actualizada en Mexlify.top o en la aplicación. El uso continuado tras los cambios implica su aceptación. Asimismo, el acceso a Mexlify puede suspenderse o terminarse sin previo aviso y sin incurrir en responsabilidad.
        </p>
        <p>
          <b>Contacto</b><br>
          Para consultas o notificaciones, puede contactar al responsable de Mexlify en 
          <a href="mailto:info@Mexlify.top" style="color:#4631c8;font-weight:500;text-decoration:underline;">info@Mexlify.top</a>. No se garantiza una respuesta inmediata, dado el carácter no comercial del proyecto.
        </p>
        <p>
          <b>Aceptación de los Términos</b><br>
          El uso de Mexlify implica la aceptación total de estos Términos de Uso. El Usuario es responsable de sus acciones al utilizar la aplicación y de cumplir con las políticas de las plataformas externas a las que accede.
        </p>
      </ol>
      <p style="margin-top:1.3rem;font-size:0.97rem;">
        <b>Nota:</b> Mexlify no está afiliado a YouTube ni a ninguna otra plataforma de terceros. Actuamos como un cliente técnico para facilitar el acceso a contenido público, sin intervención en su gestión o distribución.
      </p>
    </div>
  `,
    width: "44rem",
    confirmButtonText: "Estoy de Acuerdo ✓",
    confirmButtonColor: "rgba(0, 158, 5, 0.92)",
    showCancelButton: true,
    cancelButtonText: "No Estoy de Acuerdo ✗",
    cancelButtonColor: "rgba(204, 0, 0, 0.92)",
    color: "#000000ff",
    background: "rgba(255, 255, 255, 0.53)",
    backdropFilter: "blur(10px)",
    borderRadius: "12px",
    padding: "1.5rem",
    allowOutsideClick: false,
    scrollbarPadding: false,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.setItem("termsAccepted", "true");
      location.reload();
    } else {
      if (result.isDismissed || result.isDenied)
        showModal(
          "Mexlify",
          "Debes aceptar los Términos y Condiciones para usar la aplicación.",
          "warning",
          "terms-no"
        );
    }
  });
}
