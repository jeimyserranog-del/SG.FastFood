/* ================= CONFIGURACIÓN ================= */
const WHATSAPP_NUMBER = "573112143342";
const DATOS_TRANSFERENCIA = { banco: "PENDIENTE", titular: "PENDIENTE", numero: "3112143342", llave: "@jeimy5551" };
const PRODUCTOS = {
  sencilla: { nombre: "Hamburguesa Sencilla", precio: 12000 },
  doble: { nombre: "Hamburguesa Doble Carne", precio: 16000 }
};
const PRECIO_COMBO = 6000;
// Pon en false si quieres probar el envío fuera de horario
const BLOQUEAR_FUERA_DE_HORARIO = true;

/* ================= UTILIDADES ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pesos = n => "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ================= HORARIO (hora de Colombia) ================= */
function estaAbierto() {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date());
  const dia = p.find(x => x.type === "weekday").value;
  const hora = parseInt(p.find(x => x.type === "hour").value, 10) % 24;
  return ["Thu", "Fri", "Sat"].includes(dia) && hora >= 15 && hora < 22;
}
function pintarEstado() {
  const ab = estaAbierto(), e = $("#estado");
  e.className = "estado " + (ab ? "abierto" : "cerrado");
  $("#estadoTitulo").textContent = ab ? "🟢 ESTAMOS TOMANDO PEDIDOS" : "🔴 EN ESTE MOMENTO NO ESTAMOS TOMANDO PEDIDOS";
}
pintarEstado();
setInterval(pintarEstado, 60000);

/* ================= CARRITO ================= */
let carrito = [];
try { carrito = JSON.parse(localStorage.getItem("carritoHamburguesas")) || []; } catch (e) { carrito = []; }
// limpiar datos inválidos
carrito = carrito.filter(i => PRODUCTOS[i.id] && i.qty > 0);
const guardar = () => { try { localStorage.setItem("carritoHamburguesas", JSON.stringify(carrito)); } catch (e) {} };
const subtotal = i => i.qty * (PRODUCTOS[i.id].precio + (i.combo ? PRECIO_COMBO : 0));
const total = () => carrito.reduce((s, i) => s + subtotal(i), 0);
const cantidadTotal = () => carrito.reduce((s, i) => s + i.qty, 0);

function agregar(id, qty, combo) {
  const linea = carrito.find(i => i.id === id && i.combo === combo);
  if (linea) linea.qty += qty; else carrito.push({ id, qty, combo });
  guardar(); renderCarrito();
  const b = $("#abrirCarrito"); b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  toast("¡Agregado al carrito! 🍔");
}

function renderCarrito() {
  $("#contadorCarrito").textContent = cantidadTotal();
  const cont = $("#listaCarrito");
  if (!carrito.length) {
    cont.innerHTML = '<p class="vacio">Tu carrito está vacío 🍔</p>';
  } else {
    cont.innerHTML = carrito.map((i, idx) => `
      <div class="item">
        <div class="item-top"><span>🍔 ${PRODUCTOS[i.id].nombre}</span><span>${pesos(PRODUCTOS[i.id].precio)} c/u</span></div>
        <small>Cantidad: ${i.qty}</small>
        ${i.combo ? `<small>+ ${i.qty} combo${i.qty > 1 ? "s" : ""} (papas + gaseosa) · ${pesos(PRECIO_COMBO)} c/u</small>` : ""}
        <div class="item-bot">
          <div class="qty"><button data-c="menos" data-i="${idx}" aria-label="Disminuir">−</button><b>${i.qty}</b><button data-c="mas" data-i="${idx}" aria-label="Aumentar">+</button></div>
          <span class="sub">${pesos(subtotal(i))}</span>
          <button class="del" data-c="del" data-i="${idx}" aria-label="Eliminar">🗑</button>
        </div>
      </div>`).join("");
  }
  $("#totalCarrito").textContent = pesos(total());
}

$("#listaCarrito").addEventListener("click", e => {
  const b = e.target.closest("button[data-c]"); if (!b) return;
  const i = carrito[b.dataset.i]; if (!i) return;
  if (b.dataset.c === "mas") i.qty++;
  if (b.dataset.c === "menos") i.qty--;
  if (b.dataset.c === "del") i.qty = 0;
  carrito = carrito.filter(x => x.qty > 0);
  guardar(); renderCarrito();
});
$("#btnVaciar").addEventListener("click", () => { carrito = []; guardar(); renderCarrito(); });

/* ================= TARJETAS DEL MENÚ ================= */
function actualizarTarjeta(card) {
  const q = +$(".q", card).textContent, combo = $(".chk", card).checked;
  const t = q * (PRODUCTOS[card.dataset.id].precio + (combo ? PRECIO_COMBO : 0));
  $('[data-a="agregar"]', card).textContent = `AGREGAR AL CARRITO · ${pesos(t)}`;
}
$$(".card").forEach(card => {
  actualizarTarjeta(card);
  $(".chk", card).addEventListener("change", () => actualizarTarjeta(card));
  card.addEventListener("click", e => {
    const a = e.target.dataset.a; if (!a) return;
    const q = $(".q", card); let n = +q.textContent;
    if (a === "mas") n = Math.min(n + 1, 20);
    if (a === "menos") n = Math.max(n - 1, 1);
    q.textContent = n;
    if (a === "agregar") {
      agregar(card.dataset.id, n, $(".chk", card).checked);
      q.textContent = 1; $(".chk", card).checked = false;
    }
    actualizarTarjeta(card);
  });
});

/* ================= PANEL Y VISTAS ================= */
const panel = $("#panel"), overlay = $("#overlay");
const titulos = { vCarrito: "🛒 TU CARRITO", vDatos: "📝 TUS DATOS", vResumen: "✅ CONFIRMACIÓN" };
function irA(v) {
  ["vCarrito", "vDatos", "vResumen"].forEach(id => $("#" + id).hidden = id !== v);
  $("#panelTitulo").textContent = titulos[v]; panel.scrollTop = 0;
}
function abrir() { irA("vCarrito"); panel.classList.add("on"); overlay.classList.add("on"); document.body.style.overflow = "hidden"; }
function cerrar() { panel.classList.remove("on"); overlay.classList.remove("on"); document.body.style.overflow = ""; }
$("#abrirCarrito").addEventListener("click", abrir);
$("#cerrarCarrito").addEventListener("click", cerrar);
overlay.addEventListener("click", cerrar);
document.addEventListener("keydown", e => { if (e.key === "Escape") cerrar(); });
$$("[data-ir]").forEach(b => b.addEventListener("click", () => irA(b.dataset.ir)));

$("#btnContinuar").addEventListener("click", () => {
  if (!carrito.length) return toast("Agrega al menos una hamburguesa al carrito 🍔");
  irA("vDatos");
});

/* ================= DATOS Y PAGO ================= */
const metodo = () => ($('input[name="pago"]:checked') || {}).value || "";
$$('input[name="pago"]').forEach(r => r.addEventListener("change", () => {
  const d = DATOS_TRANSFERENCIA;
  $("#infoPago").innerHTML = metodo() === "Transferencia"
    ? "<b>Datos para transferir:</b><br>" + [
        ["Banco", d.banco], ["Titular", d.titular],
        ["Número", d.numero], ["Llave", d.llave]
      ].filter(([, v]) => v && v !== "PENDIENTE").map(([k, v]) => `${k}: ${esc(v)}`).join("<br>")
    : "Pago en efectivo.";
}));

function validar() {
  if (!carrito.length) return "Agrega al menos una hamburguesa al carrito 🍔";
  if (!$("#nombre").value.trim()) return "Por favor ingresa tu nombre.";
  if (!$("#telefono").value.trim()) return "Por favor ingresa tu número de teléfono.";
  if (!metodo()) return "Selecciona un método de pago.";
  return "";
}
const datos = () => ({
  nombre: $("#nombre").value.trim(), telefono: $("#telefono").value.trim(),
  direccion: $("#direccion").value.trim() || "No indicada",
  notas: $("#notas").value.trim() || "Sin ninguna observación.", pago: metodo()
});

$("#btnRevisar").addEventListener("click", () => {
  const err = validar(); $("#error").textContent = err;
  if (err) return;
  const d = datos();
  const prods = carrito.map(i => `<p>🍔 ${i.qty}x ${PRODUCTOS[i.id].nombre}` +
    (i.combo ? `<br>🍟 ${i.qty}x Combo (papas + gaseosa)` : "") + "</p>").join("");
  $("#resumen").innerHTML = `
    <p><b>Cliente:</b><br>${esc(d.nombre)}</p>
    <p><b>Teléfono:</b><br>${esc(d.telefono)}</p>
    <p><b>Productos:</b></p>${prods}
    <p><b>TOTAL:</b><br><span class="tot">${pesos(total())}</span></p>
    <p><b>Método de pago:</b><br>${esc(d.pago)}</p>
    <p><b>Dirección:</b><br>${esc(d.direccion)}</p>
    <p><b>Notas:</b><br>${esc(d.notas)}</p>`;
  irA("vResumen");
});

/* ================= WHATSAPP ================= */
function construirMensaje() {
  const d = datos();
  const lineas = carrito.map(i => `${i.qty}x ${PRODUCTOS[i.id].nombre}` +
    (i.combo ? `\n   + ${i.qty} combo${i.qty > 1 ? "s" : ""} (papas + gaseosa)` : "")).join("\n\n");
  let msg = `Hola 👋 Quiero realizar un pedido:\n\n🍔 *MI PEDIDO*\n\n${lineas}\n\n💰 *TOTAL: ${pesos(total())}*\n\n` +
    `👤 Nombre: ${d.nombre}\n📱 Teléfono: ${d.telefono}\n📍 Dirección: ${d.direccion}\n\n💳 Método de pago: ${d.pago}\n\n` +
    `📝 Notas:\n${d.notas}\n\n¡Gracias! 🍔`;
  return msg;
}
$("#btnWhatsApp").addEventListener("click", () => {
  const err = validar();
  if (err) { irA("vDatos"); $("#error").textContent = err; return; }
  if (BLOQUEAR_FUERA_DE_HORARIO && !estaAbierto()) {
    return toast("Ahora no tomamos pedidos. Jueves a sábado, 3:00 PM a 10:00 PM.");
  }
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(construirMensaje())}`, "_blank");
});
$("#waFloat").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola 👋 Tengo una pregunta.")}`;

/* ================= TOAST ================= */
let tt;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2400);
}

renderCarrito();