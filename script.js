/* script.js */
/* Requiere: data/vehiculos.js que expone "vehiculos" array. */

if (history.scrollRestoration) {
  history.scrollRestoration = "manual";
}

// Variables modal galería
let container,
  modal,
  btnCerrar,
  imagenPrincipal,
  carrousel,
  // Variables de video
  youtubeContainer,
  youtubeIframe,
  localVideoContainer,
  localVideo,
  // Otras variables del modal
  modalTitle,
  modalDesc,
  modalPrice,
  modalContact;

// Variables Navbar
let hamburger, navLinks;

// Variables modal info y slider
let infoModal, infoModalImg, btnInfoModalCerrar, btnInfoPrev, btnInfoNext;
let infoModalButtons = [];
let infoImagePaths = [];
let currentInfoImageIndex = 0;

// (AÑADIDO PARA SWIPE)
let touchStartX = 0;
let touchEndX = 0;

let lastFocusedEl = null; // Elemento que tenía foco antes de abrir un modal
let currentVehiculo = null; // Vehículo actual en modal galería
let currentIndex = 0; // Índice imagen actual en modal galería
let releaseFocusTrap = null; // Función para liberar el focus trap

// --- Helpers ---
const lockBodyScroll = () =>
  (document.documentElement.style.overflow = "hidden");
const unlockBodyScroll = () => (document.documentElement.style.overflow = "");
const isFocusable = (el) => el && typeof el.focus === "function";

// --- Focus Trap ---
function trapFocus(containerEl) {
  const focusableSelectors =
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
  const focusables = Array.from(
    containerEl.querySelectorAll(focusableSelectors)
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
  if (!focusables.length) return () => {};
  let first = focusables[0];
  let last = focusables[focusables.length - 1];

  function handle(e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  document.addEventListener("keydown", handle);
  return () => document.removeEventListener("keydown", handle);
}

// --- Renderizado Tarjetas Vehículos ---
function renderSpecsInline(veh) {
  if (!veh.specs) return "<p class='muted'>Sin datos técnicos.</p>";
  return `<ul class="spec-list">${Object.entries(veh.specs)
    .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
    .join("")}</ul>`;
}

function createCard(veh) {
  const card = document.createElement("article");
  card.className = "card fade-in";
  card.setAttribute("tabindex", "0");
  card.dataset.id = veh.id || String(veh.vin || veh.modelo);

  const picture = document.createElement("picture");
  if (veh.imagenPrincipalWebp) {
    const s = document.createElement("source");
    s.type = "image/webp";
    s.srcset = veh.imagenPrincipalWebp;
    picture.appendChild(s);
  }
  const img = document.createElement("img");
  img.className = "card-img";
  img.src = veh.imagenThumbnail || veh.imagenPrincipal;
  img.alt = `${veh.marca} ${veh.modelo}`;
  img.loading = "lazy";
  picture.appendChild(img);

  const body = document.createElement("div");
  body.className = "card-content";

  body.innerHTML = `
    <h3>${veh.marca} ${veh.modelo}</h3>
    <p class="small">${veh.anio ? veh.anio + " • " : ""}${
    veh.km ? veh.km + " km" : ""
  }</p>
    <p class="card-desc">${veh.descripcion || ""}</p>
  `;

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const btnFotos = document.createElement("button");
  btnFotos.className = "btn btn-ghost";
  btnFotos.type = "button";
  btnFotos.textContent = "Ver fotos";
  btnFotos.dataset.id = card.dataset.id;

  const btnDetalles = document.createElement("button");
  btnDetalles.className = "btn btn-ghost";
  btnDetalles.type = "button";
  btnDetalles.setAttribute("aria-expanded", "false");
  btnDetalles.textContent = "Ficha técnica";
  btnDetalles.dataset.id = card.dataset.id;

  actions.appendChild(btnFotos);
  actions.appendChild(btnDetalles);
  body.appendChild(actions);

  const priceElement = document.createElement("p");
  priceElement.className = "price";
  priceElement.innerHTML = `<strong>Pesos ${Number(veh.precio).toLocaleString(
    "es-AR"
  )}</strong>`;
  body.appendChild(priceElement);

  const btnWhatsapp = document.createElement("a");
  btnWhatsapp.className = "btn-whatsapp btn-whatsapp-card";
  btnWhatsapp.textContent = "Whatsapp";
  btnWhatsapp.href = buildWhatsappLink(
    veh.whatsapp || "5492616256518",
    `Hola! Estoy interesado en el ${veh.marca} ${veh.modelo} . ¿Me das más info?`
  );
  btnWhatsapp.target = "_blank";
  btnWhatsapp.rel = "noopener";
  const details = document.createElement("div");
  details.className = "card-details";
  details.id = `details-${card.dataset.id}`;
  details.hidden = true; // Oculto por defecto
  details.innerHTML = renderSpecsInline(veh);
  body.appendChild(details);
  body.appendChild(btnWhatsapp);

  card.appendChild(picture);
  card.appendChild(body); // Listeners Tarjeta

  img.addEventListener("click", () => abrirModal(veh, btnFotos));
  img.addEventListener("keydown", (e) => {
    if (e.key === "Enter") abrirModal(veh, btnFotos);
  });
  btnFotos.addEventListener("click", (e) => abrirModal(veh, e.currentTarget));
  btnDetalles.addEventListener("click", (e) => {
    details.classList.toggle("visible-details");
    const isVisible = details.classList.contains("visible-details");
    e.currentTarget.setAttribute("aria-expanded", String(isVisible));
    details.hidden = !isVisible; // Actualizar hidden basado en la clase
    if (isVisible) {
      details.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  return card; // Devolver solo la tarjeta ensamblada
}

function renderVehiculos() {
  if (
    !container ||
    typeof vehiculos === "undefined" ||
    !Array.isArray(vehiculos)
  ) {
    if (container)
      container.innerHTML =
        "<p class='muted' style='text-align: center;'>No hay vehículos disponibles.</p>";
    console.warn("La variable 'vehiculos' no está definida o no es un array.");
    return;
  }
  container.innerHTML = "";
  vehiculos.forEach((veh) => {
    const card = createCard(veh); // createCard ya añade los listeners necesarios
    container.appendChild(card);
  });
}

// --- Funciones Modal Galería ---
function abrirModal(veh, triggerEl = null) {
  // console.log("ABRIENDO MODAL. Datos del vehículo:", veh); // Descomentar para debuggear

  if (!modal) return; // Chequeo adicional
  currentVehiculo = veh;
  lastFocusedEl = triggerEl || document.activeElement;
  currentIndex = 0; // Resetea a la primera imagen

  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "flex";
  lockBodyScroll();

  // Resetear la vista: mostrar imagen, ocultar AMBOS videos
  if (imagenPrincipal) imagenPrincipal.style.display = "block";
  if (youtubeContainer) youtubeContainer.style.display = "none";
  if (localVideoContainer) localVideoContainer.style.display = "none";
  if (youtubeIframe) youtubeIframe.src = "";
  if (localVideo) {
    localVideo.pause();
    localVideo.src = "";
  }

  const largeImages =
    veh.imagenes && veh.imagenes.length > 0
      ? veh.imagenes
      : [veh.imagenPrincipal];
  const mainSrc = largeImages[0] || veh.imagenPrincipal || "";

  if (imagenPrincipal) {
    imagenPrincipal.src = mainSrc;
    imagenPrincipal.alt = `${veh.marca} ${veh.modelo}`;
    imagenPrincipal.loading = "eager";
  }

  /* --- INICIO DEL CÓDIGO CORREGIDO PARA EL ORDEN --- */
  if (carrousel) {
    carrousel.innerHTML = ""; // Limpiar carrusel
    const thumbsSources =
      veh.imagenesThumbs && veh.imagenesThumbs.length > 0
        ? veh.imagenesThumbs
        : largeImages; // Usar imágenes grandes si no hay thumbs

    let videoThumbEl = null; // Guardamos referencia al thumb de video

    // 1. (NUEVO ORDEN) Añadir thumbnails de IMAGENES PRIMERO
    thumbsSources.forEach((src, i) => {
      if (!src) return;
      const t = document.createElement("img");
      t.className = "thumb";
      t.src = src;
      t.alt = `${veh.marca} ${veh.modelo} foto ${i + 1}`;
      t.loading = "lazy";
      t.dataset.index = i;

      // La primera imagen (i=0) sigue siendo la activa por defecto al abrir
      if (i === 0) t.classList.add("active");

      t.addEventListener("click", () => {
        setMainImage(i, largeImages);
        // Desactivar video thumb si existe al hacer clic en imagen
        if (videoThumbEl) videoThumbEl.classList.remove("active");
      });
      carrousel.appendChild(t);
    });

    // 2. (NUEVO ORDEN) Añadir thumbnail de VIDEO AL FINAL si existe
    if (veh.video) {
      videoThumbEl = document.createElement("div"); // <-- ¡CORREGIDO A DIV!
      videoThumbEl.className = "thumb thumb-video";
      videoThumbEl.setAttribute(
        "aria-label",
        `Video de ${veh.marca} ${veh.modelo}`
      );
      videoThumbEl.setAttribute("role", "button");
      videoThumbEl.tabIndex = 0;

      videoThumbEl.addEventListener("click", () => {
        carrousel
          .querySelectorAll("img.thumb") // Selecciona solo las imágenes
          .forEach((img) => img.classList.remove("active"));
        videoThumbEl.classList.add("active");
        setMainVideo(veh.video);
      });
      videoThumbEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          videoThumbEl.click();
        }
      });

      carrousel.appendChild(videoThumbEl); // <-- Se añade al final
    }
  }
  /* --- FIN DEL CÓDIGO CORREGIDO PARA EL ORDEN --- */

  // Enfocar el botón cerrar
  if (isFocusable(btnCerrar)) btnCerrar.focus();
  else {
    const firstFocusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (isFocusable(firstFocusable)) firstFocusable.focus();
  }
  releaseFocusTrap = trapFocus(modal);
  document.addEventListener("keydown", handleModalKeydown);
}

// Asegurarse que `images` se refiera a las imágenes grandes
function setMainImage(index, images) {
  // Ocultar videos, mostrar imagen y detenerlos
  if (youtubeContainer) youtubeContainer.style.display = "none";
  if (localVideoContainer) localVideoContainer.style.display = "none";
  if (youtubeIframe) youtubeIframe.src = "";
  if (localVideo) {
    localVideo.pause();
    localVideo.src = "";
  }
  if (imagenPrincipal) imagenPrincipal.style.display = "block";

  const videoThumb = carrousel.querySelector(".thumb-video");
  if (videoThumb) videoThumb.classList.remove("active");

  const imgs = Array.from(carrousel.querySelectorAll("img.thumb"));
  if (!imgs[index] || !images || !images[index]) return;

  currentIndex = index;
  imagenPrincipal.src = images[index];

  imgs.forEach((img, i) => img.classList.toggle("active", i === index));
}

// Función "inteligente" para ambos tipos de video
function setMainVideo(videoUrl) {
  if (!videoUrl) return;
  if (imagenPrincipal) imagenPrincipal.style.display = "none";

  // Decidir qué reproductor usar
  if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
    // Es YouTube
    if (localVideoContainer) localVideoContainer.style.display = "none";
    if (localVideo) {
      localVideo.pause();
      localVideo.src = "";
    }

    if (youtubeContainer) youtubeContainer.style.display = "block";

    try {
      const url = new URL(videoUrl);
      const videoId = url.pathname.split("/").pop();
      const cleanUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
      cleanUrl.searchParams.set("autoplay", "1");
      cleanUrl.searchParams.set("rel", "0");
      cleanUrl.searchParams.set("modestbranding", "1");

      if (youtubeIframe) youtubeIframe.src = cleanUrl.href;
    } catch (e) {
      console.error("URL de YouTube inválida:", videoUrl, e);
      if (youtubeIframe) youtubeIframe.src = videoUrl; // Fallback
    }
  } else {
    // Es un video local
    if (youtubeContainer) youtubeContainer.style.display = "none";
    if (youtubeIframe) youtubeIframe.src = "";

    if (localVideoContainer) localVideoContainer.style.display = "block";
    if (localVideo) {
      localVideo.src = videoUrl;
      localVideo.play().catch((e) => console.warn("Autoplay bloqueado:", e));
    }
  }
}

function cerrarModalHandler() {
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  unlockBodyScroll();

  // Detener AMBOS videos
  if (youtubeIframe) youtubeIframe.src = "";
  if (localVideo) {
    localVideo.pause();
    localVideo.src = "";
  }

  if (releaseFocusTrap) releaseFocusTrap();
  document.removeEventListener("keydown", handleModalKeydown);
  if (isFocusable(lastFocusedEl)) lastFocusedEl.focus();
  currentVehiculo = null;
  currentIndex = 0;
}

function handleModalKeydown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    cerrarModalHandler();
  } else if (e.key === "ArrowRight") {
    const images =
      currentVehiculo?.imagenes?.length > 0
        ? currentVehiculo.imagenes
        : [currentVehiculo?.imagenPrincipal].filter(Boolean);
    if (!images || images.length <= 1) return;
    const next = (currentIndex + 1) % images.length;
    setMainImage(next, images);
  } else if (e.key === "ArrowLeft") {
    const images =
      currentVehiculo?.imagenes?.length > 0
        ? currentVehiculo.imagenes
        : [currentVehiculo?.imagenPrincipal].filter(Boolean);
    if (!images || images.length <= 1) return;
    const prev = (currentIndex - 1 + images.length) % images.length;
    setMainImage(prev, images);
  }
}

// --- Funciones Modal Info & Slider ---

function showInfoImage(index) {
  if (!infoModalImg || !infoImagePaths[index]) return;
  infoModalImg.src = infoImagePaths[index];
  currentInfoImageIndex = index;
  if (btnInfoPrev) btnInfoPrev.disabled = index === 0;
  if (btnInfoNext) btnInfoNext.disabled = index === infoImagePaths.length - 1;
}

function handleInfoSliderNav(direction) {
  const newIndex = currentInfoImageIndex + direction;
  if (newIndex >= 0 && newIndex < infoImagePaths.length) {
    showInfoImage(newIndex);
  }
}

function abrirInfoModal(triggerEl) {
  if (!infoModal || !infoModalImg || !btnInfoModalCerrar) {
    console.error("Elementos del modal de información no encontrados.");
    return;
  }

  const singleImgPath = triggerEl.dataset.img;
  const multipleImgPaths = triggerEl.dataset.imgs;

  lastFocusedEl = triggerEl || document.activeElement;
  infoModalImg.alt = triggerEl.getAttribute("aria-label") || "Información";

  infoImagePaths = [];
  currentInfoImageIndex = 0;
  infoModal.classList.remove("slider-active");
  if (btnInfoPrev) btnInfoPrev.style.display = "none";
  if (btnInfoNext) btnInfoNext.style.display = "none";
  if (btnInfoPrev) {
    const newPrevBtn = btnInfoPrev.cloneNode(true);
    btnInfoPrev.parentNode.replaceChild(newPrevBtn, btnInfoPrev);
    btnInfoPrev = newPrevBtn;
  }
  if (btnInfoNext) {
    const newNextBtn = btnInfoNext.cloneNode(true);
    btnInfoNext.parentNode.replaceChild(newNextBtn, btnInfoNext);
    btnInfoNext = newNextBtn;
  }

  if (multipleImgPaths) {
    infoImagePaths = multipleImgPaths
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    if (infoImagePaths.length > 0) {
      infoModal.classList.add("slider-active");
      if (btnInfoPrev) {
        btnInfoPrev.addEventListener("click", () => handleInfoSliderNav(-1));
        btnInfoPrev.style.display = "block";
      }
      if (btnInfoNext) {
        btnInfoNext.addEventListener("click", () => handleInfoSliderNav(1));
        btnInfoNext.style.display = "block";
      }
      showInfoImage(0);
    } else {
      console.warn("data-imgs no contiene rutas válidas:", multipleImgPaths);
      infoModalImg.src = "";
    }
  } else if (singleImgPath) {
    infoImagePaths = [singleImgPath];
    showInfoImage(0);
  } else {
    console.warn("El botón no tiene atributo 'data-img' ni 'data-imgs'.");
    infoModalImg.src = "";
    return;
  }

  infoModal.setAttribute("aria-hidden", "false");
  infoModal.style.display = "flex";
  lockBodyScroll();

  if (isFocusable(btnInfoModalCerrar)) btnInfoModalCerrar.focus();
  releaseFocusTrap = trapFocus(infoModal);
  document.addEventListener("keydown", handleInfoModalKeydown);
  if (infoModalImg) {
    infoModalImg.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    infoModalImg.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    infoModalImg.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });
  }
}

function cerrarInfoModal() {
  if (!infoModal) return;

  infoModal.setAttribute("aria-hidden", "true");
  infoModal.style.display = "none";
  unlockBodyScroll();

  if (releaseFocusTrap) releaseFocusTrap();
  document.removeEventListener("keydown", handleInfoModalKeydown);

  if (btnInfoPrev) {
    const newPrevBtn = btnInfoPrev.cloneNode(true);
    btnInfoPrev.parentNode.replaceChild(newPrevBtn, btnInfoPrev);
    btnInfoPrev = newPrevBtn;
  }
  if (btnInfoNext) {
    const newNextBtn = btnInfoNext.cloneNode(true);
    btnInfoNext.parentNode.replaceChild(newNextBtn, btnInfoNext);
    btnInfoNext = newNextBtn;
  }
  infoModal.classList.remove("slider-active");

  if (isFocusable(lastFocusedEl)) lastFocusedEl.focus();

  if (infoModalImg) {
    infoModalImg.removeEventListener("touchstart", handleTouchStart);
    infoModalImg.removeEventListener("touchmove", handleTouchMove);
    infoModalImg.removeEventListener("touchend", handleTouchEnd);
  }

  infoModalImg.src = "";
  infoModalImg.alt = "Información";
  infoImagePaths = [];
  currentInfoImageIndex = 0;
}

function handleInfoModalKeydown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    cerrarInfoModal();
  } else if (
    infoModal.classList.contains("slider-active") &&
    e.key === "ArrowRight"
  ) {
    handleInfoSliderNav(1);
  } else if (
    infoModal.classList.contains("slider-active") &&
    e.key === "ArrowLeft"
  ) {
    handleInfoSliderNav(-1);
  }
}

// Funciones para Swipe
function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}
function handleTouchMove(e) {
  e.preventDefault();
  touchEndX = e.changedTouches[0].screenX;
}
function handleTouchEnd() {
  if (!infoModal.classList.contains("slider-active")) return;
  const swipeThreshold = 50;
  if (touchStartX - touchEndX > swipeThreshold) {
    handleInfoSliderNav(1);
  } else if (touchEndX - touchStartX > swipeThreshold) {
    handleInfoSliderNav(-1);
  }
  touchStartX = 0;
  touchEndX = 0;
}

// --- Navbar Toggle ---
function toggleNav() {
  if (!hamburger || !navLinks) return;
  const expanded = hamburger.getAttribute("aria-expanded") === "true";
  hamburger.setAttribute("aria-expanded", String(!expanded));
  navLinks.classList.toggle("active");
}

// --- Intersection Observer (Fade-in) ---
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("visible", entry.isIntersecting);
    });
  },
  { threshold: 0.1 }
);

// --- Utils ---
function buildWhatsappLink(number, text) {
  const encoded = encodeURIComponent(text);
  return `https://api.whatsapp.com/send/?phone=${number}&text=${encoded}`;
}

// --- DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", () => {
  // console.log("PÁGINA CARGADA. Revisando 'vehiculos':", typeof vehiculos, vehiculos); // Descomentar para debuggear
  // Asignación de variables
  container = document.getElementById("vehiculos-container");
  modal = document.getElementById("modal");
  btnCerrar = modal?.querySelector(".cerrar");
  imagenPrincipal = document.getElementById("imagen-principal");
  carrousel = document.getElementById("carrousel");
  // (ACTUALIZADO)
  youtubeContainer = document.getElementById("youtube-container");
  youtubeIframe = document.getElementById("youtube-iframe");
  localVideoContainer = document.getElementById("local-video-container");
  localVideo = document.getElementById("local-video");
  hamburger = document.getElementById("hamburger");
  navLinks = document.getElementById("nav-links"); // Variables modal info y slider
  infoModal = document.getElementById("info-modal");
  infoModalImg = document.getElementById("info-modal-img");
  btnInfoModalCerrar = infoModal?.querySelector(".info-modal-cerrar");
  btnInfoPrev = infoModal?.querySelector(".info-modal-prev"); // Asignar aquí
  btnInfoNext = infoModal?.querySelector(".info-modal-next"); // Asignar aquí
  infoModalButtons = document.querySelectorAll(".btn-info-modal");

  window.scrollTo(0, 0); // Renderizado inicial

  if (typeof vehiculos !== "undefined" && Array.isArray(vehiculos)) {
    renderVehiculos();
  } else {
    if (container)
      container.innerHTML =
        "<p class='muted' style='text-align: center;'>No hay vehículos disponibles.</p>";
  }

  const elementsToObserve = document.querySelectorAll(
    ".card, .section.fade-in"
  );
  elementsToObserve.forEach((el) => {
    observer.observe(el);
  });

  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModalHandler);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrarModalHandler();
    });
    const modalCard = modal.querySelector(".modal-card");
    if (modalCard)
      modalCard.addEventListener("click", (e) => e.stopPropagation());
  }

  if (infoModal && btnInfoModalCerrar) {
    btnInfoModalCerrar.addEventListener("click", cerrarInfoModal);
    infoModal.addEventListener("click", (e) => {
      if (e.target === infoModal) cerrarInfoModal();
    });
    const infoModalContent = infoModal.querySelector(".info-modal-content");
    if (infoModalContent)
      infoModalContent.addEventListener("click", (e) => e.stopPropagation());
  }
  infoModalButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      abrirInfoModal(e.currentTarget);
    });
  });

  if (hamburger) {
    hamburger.addEventListener("click", toggleNav);
    hamburger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") toggleNav();
    });
  }
  if (navLinks) {
    document.querySelectorAll(".nav-links a").forEach((link) => {
      link.addEventListener("click", () => {
        if (navLinks.classList.contains("active")) toggleNav();
      });
    });
    document.addEventListener("click", (event) => {
      const isClickInsideNav = navLinks?.contains(event.target);
      const isClickOnHamburger = hamburger?.contains(event.target);
      if (
        navLinks?.classList.contains("active") &&
        !isClickInsideNav &&
        !isClickOnHamburger
      ) {
        toggleNav();
      }
    });
  }
}); // Fin DOMContentLoaded


