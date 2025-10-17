/* script.js */
/* Requiere: data/vehiculos.js que expone "vehiculos" array. */

if (history.scrollRestoration) {
  history.scrollRestoration = "manual";
}

// 1. Declaramos las variables aquí (sin valor)
let container,
  modal,
  btnCerrar,
  imagenPrincipal,
  carrousel,
  modalTitle,
  modalDesc,
  modalPrice,
  modalContact,
  hamburger,
  navLinks;

let lastFocusedEl = null;
let currentVehiculo = null;
let currentIndex = 0;
let releaseFocusTrap = null;

const lockBodyScroll = () =>
  (document.documentElement.style.overflow = "hidden");
const unlockBodyScroll = () => (document.documentElement.style.overflow = "");

const isFocusable = (el) => el && typeof el.focus === "function";

function trapFocus(containerEl) {
  const focusableSelectors =
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
  const focusables = Array.from(
    containerEl.querySelectorAll(focusableSelectors)
  ).filter((el) => !el.hasAttribute("disabled"));
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
  body.className = "card-content"; // El CSS centrará el contenido

  // 1. Título y Subtítulo
  body.innerHTML = `
    <h3>${veh.marca} ${veh.modelo}</h3>
    <p class="small">${veh.anio ? veh.anio + " • " : ""}${veh.km ? veh.km + " km" : ""}</p>
    <p class="card-desc">${veh.descripcion || ""}</p> 
  `; // Mantenemos la descripción aquí por contexto

  // 2. Botones "Ver fotos" y "Ficha técnica"
  const actions = document.createElement("div");
  actions.className = "card-actions"; // El CSS ya los centra
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
  body.appendChild(actions); // Añadimos los botones al cuerpo

  // 3. Precio
  const priceElement = document.createElement("p");
  priceElement.className = "price";
  priceElement.innerHTML = `<strong>Pesos ${Number(veh.precio).toLocaleString('es-AR')}</strong>`;
  body.appendChild(priceElement); // Añadimos el precio después de los botones

  // 4. Botón de WhatsApp
  const btnWhatsapp = document.createElement("a");
  btnWhatsapp.className = "btn-whatsapp btn-whatsapp-card"; // Usamos la clase existente y añadimos una específica
  btnWhatsapp.textContent = "Consultar";
  btnWhatsapp.href = buildWhatsappLink(
    veh.whatsapp || "5492616256518",
    `Hola! Estoy interesado en el ${veh.marca} ${veh.modelo} . ¿Me das más info?`
  );
  btnWhatsapp.target = "_blank";
  btnWhatsapp.rel = "noopener";
  

  // 5. Contenedor de Ficha Técnica (oculto)
  const details = document.createElement("div");
  details.className = "card-details";
  details.id = `details-${card.dataset.id}`;
  details.hidden = true;
  details.innerHTML = renderSpecsInline(veh);
  body.appendChild(details); // Lo añadimos, aunque estará oculto
  body.appendChild(btnWhatsapp); // Añadimos el botón de WhatsApp al final

  // Ensamblado final de la tarjeta
  card.appendChild(picture);
  card.appendChild(body);

  // Listeners
  img.addEventListener("click", () => abrirModal(veh, btnFotos));
  img.addEventListener("keydown", (e) => {
    if (e.key === "Enter") abrirModal(veh, btnFotos);
  });
  btnFotos.addEventListener("click", (e) => abrirModal(veh, e.currentTarget));
  btnDetalles.addEventListener("click", (e) => { 
      // 1. Alternamos la CLASE CSS en el div de detalles
      details.classList.toggle('visible-details'); 
      
      // 2. Verificamos si AHORA está visible (si tiene la clase)
      const isVisible = details.classList.contains('visible-details');
      
      // 3. Actualizamos el atributo aria-expanded
      e.currentTarget.setAttribute("aria-expanded", String(isVisible)); 
                                      
      // 4. Si AHORA está visible, hacemos scroll
      if (isVisible) { 
        details.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

  return { card, btnFotos, btnDetalles, details }; // Devolvemos los elementos como antes por si acaso
}

function renderVehiculos() {
  if (
    !container ||
    typeof vehiculos === "undefined" ||
    !Array.isArray(vehiculos)
  ) {
    if (container)
      container.innerHTML =
        "<p class='muted' style='text-align: center;'>No hay vehículos disponibles en este momento.</p>";
    console.warn("La variable 'vehiculos' no está definida o no es un array.");
    return;
  }
  container.innerHTML = "";
  vehiculos.forEach((veh) => {
    const { card, btnFotos, btnDetalles, details } = createCard(veh);
    container.appendChild(card);

    btnFotos.addEventListener("click", (e) => abrirModal(veh, e.currentTarget));

    btnDetalles.addEventListener("click", (e) => {
      console.log(`Clic en botón de Card ID: ${card.dataset.id}. Intentando alternar Details ID: ${details.id}`);
      const expanded = e.currentTarget.getAttribute("aria-expanded") === "true";
      e.currentTarget.setAttribute("aria-expanded", String(!expanded));
      details.hidden = expanded;
      if (!expanded)
        details.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

function abrirModal(veh, triggerEl = null) {
  currentVehiculo = veh;
  lastFocusedEl = triggerEl || document.activeElement;
  currentIndex = 0;

  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "flex";
  lockBodyScroll();

  // Asegúrate de que los elementos existan antes de usarlos
  if (modalTitle) modalTitle.textContent = `${veh.marca} ${veh.modelo}`;
  if (modalDesc) modalDesc.textContent = veh.descripcion || "";
  if (modalPrice)
    modalPrice.textContent = veh.precio
      ? `Pesos ${Number(veh.precio).toLocaleString()}`
      : "";

  // Determinar la imagen principal y las demás imágenes
  const largeImages =
    veh.imagenes && veh.imagenes.length > 0
      ? veh.imagenes
      : [veh.imagenPrincipal];
  const mainSrc = largeImages[0] || veh.imagenPrincipal || ""; // Asegura que siempre haya un src

  // Asignar imagen principal DIRECTAMENTE (sin setTimeout)
  if (imagenPrincipal) {
    imagenPrincipal.src = mainSrc; // Asignar src directamente
    imagenPrincipal.alt = `${veh.marca} ${veh.modelo}`;
    imagenPrincipal.loading = "eager"; // Cargar la primera imagen rápido
  }

  // Generar carrusel
  if (carrousel) {
    carrousel.innerHTML = "";
    // Usar imágenes grandes para miniaturas si no hay thumbs específicos
    const thumbsSources =
      veh.imagenesThumbs && veh.imagenesThumbs.length > 0
        ? veh.imagenesThumbs
        : largeImages;

    thumbsSources.forEach((src, i) => {
      if (!src) return; // Saltar si la ruta está vacía
      const t = document.createElement("img");
      t.className = "thumb";
      t.src = src;
      t.alt = `${veh.marca} ${veh.modelo} foto ${i + 1}`;
      t.loading = "lazy"; // Carga perezosa para miniaturas
      t.dataset.index = i;
      // Marcar la primera miniatura como activa
      if (i === 0) {
        t.classList.add("active");
      }
      carrousel.appendChild(t);
      t.addEventListener("click", () => setMainImage(i, largeImages));
    });
  }

  // Configurar botón de WhatsApp (si existe)
  if (modalContact) {
    modalContact.href = buildWhatsappLink(
      veh.whatsapp || "5492616256518", // Usa un número por defecto si no hay específico
      `Hola! Estoy interesado en el ${veh.marca} ${veh.modelo} (${
        veh.id || ""
      }). ¿Está disponible?`
    );
    modalContact.setAttribute("rel", "noopener");
  }

  // Enfocar el primer elemento y atrapar foco
  const firstFocusable = modal.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (isFocusable(firstFocusable)) firstFocusable.focus();
  releaseFocusTrap = trapFocus(modal);

  // Listener para teclas (Escape, flechas)
  document.addEventListener("keydown", handleModalKeydown);
}

function setMainImage(index, images) {
  const imgs = Array.from(carrousel.querySelectorAll("img"));
  if (!imgs[index]) return;
  currentIndex = index;
  imagenPrincipal.src =
    images && images[index] ? images[index] : imgs[index].src;
  imgs.forEach((img) =>
    img.classList.toggle("active", img.dataset.index == index)
  );
}

function cerrarModalHandler() {
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  unlockBodyScroll();
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
    const imgs = carrousel.querySelectorAll("img");
    if (!imgs.length) return;
    const next = (currentIndex + 1) % imgs.length;
    setMainImage(next, currentVehiculo.imagenes);
  } else if (e.key === "ArrowLeft") {
    const imgs = carrousel.querySelectorAll("img");
    if (!imgs.length) return;
    const prev = (currentIndex - 1 + imgs.length) % imgs.length;
    setMainImage(prev, currentVehiculo.imagenes);
  }
}

function toggleNav() {
  const expanded = hamburger.getAttribute("aria-expanded") === "true";
  hamburger.setAttribute("aria-expanded", String(!expanded));
  navLinks.classList.toggle("active");
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Si entra en pantalla, AÑADE la clase 'visible'
        entry.target.classList.add("visible");
      } else {
        // Si sale de pantalla, QUITA la clase 'visible'
        entry.target.classList.remove("visible");
      }
    });
  },
  { threshold: 0.1 } // Puedes ajustar este umbral (0.1 = 10% visible)
);

// Observa solo los elementos estáticos al inicio
document
  .querySelectorAll(".section.fade-in")
  .forEach((el) => observer.observe(el));

function buildWhatsappLink(number, text) {
  const encoded = encodeURIComponent(text);
  return `https://api.whatsapp.com/send/?phone=${number}&text=${encoded}`;
}

function injectVehicleJsonLd(veh) {
  // Asegurarse de que la URL de la imagen sea absoluta
  let imageUrl;
  try {
    imageUrl = new URL(veh.imagenPrincipal, location.href).href;
  } catch (e) {
    console.warn(
      `URL de imagen inválida para ${veh.modelo}: ${veh.imagenPrincipal}`
    );
    imageUrl = veh.imagenPrincipal; // Usar como fallback
  }

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${veh.marca} ${veh.modelo}`,
    image: imageUrl,
    description: veh.descripcion || "",
    mpn: veh.vin || String(veh.id),
    brand: { "@type": "Brand", name: veh.marca },
    offers: {
      "@type": "Offer",
      priceCurrency: "ARS",
      price: String(veh.precio),
      availability: "https://schema.org/InStock",
    },
  };
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.text = JSON.stringify(ld);
  document.head.appendChild(s);
}

document.addEventListener("DOMContentLoaded", () => {
  // =========================================================
  // ASIGNAMOS LAS VARIABLES AQUÍ
  // =========================================================
  container = document.getElementById("vehiculos-container");
  modal = document.getElementById("modal");
  btnCerrar = document.querySelector(".cerrar");
  imagenPrincipal = document.getElementById("imagen-principal");
  carrousel = document.getElementById("carrousel");
  modalTitle = document.getElementById("modal-title");
  modalDesc = document.getElementById("modal-desc");
  modalPrice = document.getElementById("modal-price");
  modalContact = document.getElementById("modal-contact");
  hamburger = document.getElementById("hamburger");
  navLinks = document.getElementById("nav-links");

  window.scrollTo(0, 0); // Ir al inicio en cada carga

  // 1. Crea las tarjetas (si existen datos)
  if (typeof vehiculos !== "undefined" && Array.isArray(vehiculos)) {
    renderVehiculos();
    vehiculos.forEach(injectVehicleJsonLd);
  } else {
     if (container) container.innerHTML = "<p class='muted' style='text-align: center;'>No hay vehículos disponibles.</p>";
  }

  // 2. OBSERVAMOS TODO JUNTO DESPUÉS DE CARGAR Y RENDERIZAR
  const elementsToObserve = document.querySelectorAll(".card, .section.fade-in");
  elementsToObserve.forEach((el) => {
    el.classList.remove('visible'); 
    observer.observe(el);
  });

  // =========================================================
  // 3. ASIGNAMOS LOS EVENT LISTENERS AQUÍ
  // =========================================================
  if (btnCerrar) {
    btnCerrar.addEventListener("click", cerrarModalHandler);
  }
  
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrarModalHandler();
    });

    const modalCard = modal.querySelector(".modal-card");
    if (modalCard) {
      modalCard.addEventListener("click", (e) => e.stopPropagation());
    }
  }

  if (hamburger) {
    hamburger.addEventListener("click", toggleNav);
    hamburger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") toggleNav();
    });
  }

  if (navLinks) {
    // Cierra el menú si se hace clic en un enlace del menú
    document.querySelectorAll(".nav-links a").forEach((link) => {
      link.addEventListener("click", () => {
        if (navLinks.classList.contains("active")) {
          toggleNav(); // Llama a la función que cierra el menú
        }
      });
    });

    // =========================================================
    // NUEVO LISTENER PARA CERRAR AL CLICAR FUERA
    // =========================================================
    document.addEventListener('click', (event) => {
      // Verifica si el menú está activo Y si el clic NO fue en el menú NI en el botón hamburguesa
      const isClickInsideNav = navLinks.contains(event.target);
      const isClickOnHamburger = hamburger.contains(event.target);
      
      if (navLinks.classList.contains('active') && !isClickInsideNav && !isClickOnHamburger) {
        toggleNav(); // Cierra el menú
      }
    });
    // =========================================================
  }
});