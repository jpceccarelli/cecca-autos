/* Admin - gestión en localStorage */
const form = document.getElementById("veh-form");
const lista = document.getElementById("lista");
const resetBtn = document.getElementById("reset-form");
const exportBtn = document.getElementById("export-json");
const importFile = document.getElementById("import-file");
const imgFileInput = document.getElementById("img-file");

function load() {
  const raw = localStorage.getItem("vehiculos");
  if (raw) return JSON.parse(raw);
  // si no existe, tomamos los por defecto definidos en data/vehiculos.js
  return window.vehiculosDefault
    ? JSON.parse(JSON.stringify(window.vehiculosDefault))
    : [];
}
function save(data) {
  localStorage.setItem("vehiculos", JSON.stringify(data));
  // notificar a la página pública si está abierta en otra pestaña:
  localStorage.setItem("vehiculos_last_updated", Date.now());
}
let items = load();

function renderList() {
  lista.innerHTML = "";
  if (!items.length) {
    lista.innerHTML = '<p class="muted">No hay vehículos</p>';
    return;
  }
  items
    .slice()
    .reverse()
    .forEach((v) => {
      const row = document.createElement("div");
      row.className = "veh-row";
      row.innerHTML = `
      <img src="${v.imagenPrincipal}" alt="">
      <div class="veh-meta">
        <strong>${v.marca} ${v.modelo}</strong><div class="muted">USD ${Number(
        v.precio
      ).toLocaleString()}</div>
      </div>
      <div class="veh-actions">
        <button class="btn-secondary small js-edit" data-id="${
          v.id
        }">Editar</button>
        <button class="btn-secondary small js-del" data-id="${
          v.id
        }">Borrar</button>
      </div>
    `;
      row
        .querySelector(".js-edit")
        .addEventListener("click", () => fillForm(v.id));
      row.querySelector(".js-del").addEventListener("click", () => {
        if (confirm("¿Eliminar vehículo?")) {
          items = items.filter((x) => x.id !== v.id);
          save(items);
          renderList();
          notifyRefresh();
        }
      });
      lista.appendChild(row);
    });
}

function fillForm(id) {
  const v = items.find((x) => x.id === id);
  if (!v) return;
  document.getElementById("veh-id").value = v.id;
  document.getElementById("tipo").value = v.tipo;
  document.getElementById("marca").value = v.marca;
  document.getElementById("modelo").value = v.modelo;
  document.getElementById("precio").value = v.precio;
  document.getElementById("descripcion").value = v.descripcion;
  document.getElementById("whatsapp").value = v.whatsapp || "";
  document.getElementById("img-url").value = v.imagenPrincipal || "";
  document.getElementById("imagenes").value = (v.imagenes || []).join(",");
  document.getElementById("form-title").textContent = "Editar vehículo";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const idVal = document.getElementById("veh-id").value;
  const tipo = document.getElementById("tipo").value;
  const marca = document.getElementById("marca").value.trim();
  const modelo = document.getElementById("modelo").value.trim();
  const precio = Number(document.getElementById("precio").value) || 0;
  const descripcion = document.getElementById("descripcion").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const imgUrl = document.getElementById("img-url").value.trim();
  const imagenesRaw = document.getElementById("imagenes").value.trim();

  let imagenPrincipal = imgUrl;
  // si cargaron archivo, convertirlo a base64 y usarlo
  if (imgFileInput.files && imgFileInput.files[0]) {
    imagenPrincipal = await fileToBase64(imgFileInput.files[0]);
  }
  const imagenes = imagenesRaw
    ? imagenesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  // si no hay imagenes, ponemos la principal en el array
  if (!imagenes.length && imagenPrincipal) imagenes.push(imagenPrincipal);

  if (idVal) {
    // editar
    const id = Number(idVal);
    items = items.map((it) =>
      it.id === id
        ? {
            ...it,
            tipo,
            marca,
            modelo,
            precio,
            descripcion,
            whatsapp,
            imagenPrincipal,
            imagenes,
          }
        : it
    );
  } else {
    const id = Date.now();
    items.push({
      id,
      tipo,
      marca,
      modelo,
      precio,
      descripcion,
      whatsapp,
      imagenPrincipal,
      imagenes,
    });
  }
  save(items);
  renderList();
  resetForm();
  notifyRefresh();
});

resetBtn.addEventListener("click", () => {
  resetForm();
});

function resetForm() {
  form.reset();
  document.getElementById("veh-id").value = "";
  document.getElementById("form-title").textContent = "Nuevo vehículo";
}

// exportar JSON
exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(items, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vehiculos-export.json";
  a.click();
  URL.revokeObjectURL(url);
});

// importar JSON
importFile.addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const parsed = JSON.parse(r.result);
      if (Array.isArray(parsed)) {
        items = parsed;
        save(items);
        renderList();
        notifyRefresh();
        alert("Importado correctamente");
      } else alert("Formato inválido");
    } catch (err) {
      alert("Error al parsear JSON");
    }
  };
  r.readAsText(f);
});

// helper: file -> base64
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej();
    fr.readAsDataURL(file);
  });
}

// notificar a ventana pública (si está abierta) al cambiar items: usamos storage event en otras pestañas
function notifyRefresh() {
  // refrescar misma pestaña (opcional)
  // también otras pestañas escuchan key 'vehiculos_last_updated'
  localStorage.setItem("vehiculos_last_updated", Date.now());
}

// inicial
renderList();

// si detectan cambios desde otra pestaña, refrescamos
window.addEventListener("storage", (e) => {
  if (e.key === "vehiculos_last_updated") {
    items = load();
    renderList();
  }
});
