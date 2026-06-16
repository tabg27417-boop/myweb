/* ════════════════════════════════════════
   ফেরদৌস স্টোর POS — app.js (Firebase Firestore)
   ════════════════════════════════════════ */

// ─── FIREBASE CONFIG ─────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyB6w0cFC80cAgvQFRW-CpWBhbKcm-yzpPM",
  authDomain: "postitan-a6f0f.firebaseapp.com",
  projectId: "postitan-a6f0f",
  storageBucket: "postitan-a6f0f.firebasestorage.app",
  messagingSenderId: "697934943285",
  appId: "1:697934943285:web:1fc64abdd154f6414e0d7c",
  measurementId: "G-PWEWPMBT5S"
};

const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
try { firebase.analytics(); } catch(e) {}

// ─── FIRESTORE STATUS ────────────────────
function setFbStatus(ok) {
  const dot = document.querySelector(".fb-dot");
  if (dot) dot.style.background = ok ? "#00D4AA" : "#FF3B5C";
}

// ─── COLLECTIONS ─────────────────────────
const COL = {
  products:     () => db.collection("products"),
  customers:    () => db.collection("customers"),
  suppliers:    () => db.collection("suppliers"),
  employees:    () => db.collection("employees"),
  transactions: () => db.collection("transactions"),
  settings:     () => db.collection("settings"),
  inventory:    () => db.collection("inventory_movements"),
};

// ─── LOCAL STATE (synced from Firestore) ──
let products     = [];
let customers    = [];
let suppliers    = [];
let employees    = [];
let transactions = [];
let inventoryMovements = [];

const CATEGORIES = ["সব","চাল ও দানা","দুগ্ধজাত","শাকসবজি","ফলমূল","পানীয়","নাস্তা","মসলা"];

// POS cart state
let cart = [];
let posFilter = "সব";
let posSearch = "";
let discountType = "fixed";
let discountVal = 0;
let vatPct = 0;
let payMethod = "নগদ";
let selectedCustomerId = "";
let receivedAmount = 0;

// Search states
let prodSearch = "";
let prodCat = "সব";
let custSearch = "";

// ─── TOAST ───────────────────────────────
function showToast(msg, type = "success") {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── HELPERS ─────────────────────────────
const ICONS = {
  plus:     "M12 5v14 M5 12h14",
  edit:     "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:    "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  check:    "M20 6 9 17l-5-5",
  refresh:  "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  printer:  "M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z",
  warn:     "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  money:    "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  cart:     "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  pkg:      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  users:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  trend:    "M23 6l-9.5 9.5-5-5L1 18",
  receipt:  "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 18v-6 M9 15h6",
};

function svgIcon(d, size = 16, color = "currentColor") {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

function btn(text, cls, onclick, icon = "") {
  const ico = icon ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg>` : "";
  return `<button class="btn ${cls}" onclick="${onclick}">${ico}${text}</button>`;
}

function badge(text, color) {
  return `<span class="badge badge-${color}">${text}</span>`;
}

function statCard(label, value, iconD, color, sub = "", trend = "") {
  return `
  <div class="stat-card">
    <div class="stat-card-glow" style="background:${color}11"></div>
    <div class="stat-top">
      <span class="stat-label">${label}</span>
      <div class="stat-icon" style="background:${color}22;color:${color}">${svgIcon(iconD, 16, color)}</div>
    </div>
    <div class="stat-value">${value}</div>
    ${sub ? `<div class="stat-sub ${trend}">${trend==="up"?"↑ ":trend==="down"?"↓ ":""}${sub}</div>` : ""}
  </div>`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB");
}

// ─── ROUTER ──────────────────────────────
let currentPage = "dashboard";

function navigate(page) {
  currentPage = page;
  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 768) {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("show");
  }
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  const content = document.getElementById("pageContent");
  content.classList.toggle("pos-mode", page === "pos");
  content.innerHTML = "";
  const renders = {
    dashboard: renderDashboard,
    pos:       renderPOS,
    products:  renderProducts,
    inventory: renderInventory,
    customers: renderCustomers,
    suppliers: renderSuppliers,
    employees: renderEmployees,
    reports:   renderReports,
    settings:  renderSettings,
  };
  (renders[page] || renderDashboard)();
}

// ─── MODAL ───────────────────────────────
function openModal(title, bodyHTML, width) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = bodyHTML;
  const w = Math.min(width || 600, window.innerWidth - 32);
  document.getElementById("modalBox").style.maxWidth = w + "px";
  document.getElementById("modalBackdrop").style.display = "flex";
}
function closeModal() {
  document.getElementById("modalBackdrop").style.display = "none";
}

// ─── FIREBASE DATA LOADERS ────────────────
async function loadAll() {
  try {
    const [pSnap, cSnap, sSnap, eSnap, tSnap, iSnap] = await Promise.all([
      COL.products().orderBy("createdAt","desc").get(),
      COL.customers().orderBy("name").get(),
      COL.suppliers().orderBy("name").get(),
      COL.employees().orderBy("name").get(),
      COL.transactions().orderBy("date","desc").limit(100).get(),
      COL.inventory().orderBy("date","desc").limit(50).get(),
    ]);
    products     = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    customers    = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    suppliers    = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    employees    = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    transactions = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    inventoryMovements = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setFbStatus(true);
  } catch(e) {
    console.error("Firestore load error:", e);
    setFbStatus(false);
    showToast("Firebase সংযোগ সমস্যা: " + e.message, "error");
  }
}

// ─── DASHBOARD ───────────────────────────
function renderDashboard() {
  const todaySales = transactions.slice(0, 8).reduce((s,t) => s + (t.total||0), 0);
  const lowStock   = products.filter(p => p.stock <= p.minStock);
  const expSoon    = products.filter(p => p.expiry && (new Date(p.expiry) - new Date()) / 86400000 < 14);

  const weekDays = ["সোম","মঙ্গল","বুধ","বৃহঃ","শুক্র","শনি","রবি"];
  const weekVals = [8400, 12200, 9800, 15600, 18900, 22100, 14300];
  const maxV = Math.max(...weekVals);
  const bars = weekDays.map((d, i) => `
    <div class="bar-col">
      <div class="bar-label-top">৳${(weekVals[i]/1000).toFixed(1)}k</div>
      <div class="bar-bar" style="background:${i===5?"#00D4AA":"#00D4AA44"};height:${(weekVals[i]/maxV*100)}px"></div>
      <div class="bar-label-bot">${d}</div>
    </div>`).join("");

  const recentTxn = transactions.slice(0, 5).map(t => `
    <div class="dash-txn-row">
      <div>
        <div class="dash-txn-id">${t.id}</div>
        <div class="dash-txn-meta">${t.customer || "ওয়াক-ইন"} • ${t.items||0} আইটেম</div>
      </div>
      <div style="text-align:right">
        <div class="dash-txn-amount">৳${(t.total||0).toLocaleString()}</div>
        ${badge(t.payment||"নগদ", t.payment==="নগদ"?"accent":t.payment==="কার্ড"?"info":"gold")}
      </div>
    </div>`).join("") || `<div style="color:var(--text-muted);text-align:center;padding:20px">কোনো লেনদেন নেই</div>`;

  const alertsHTML = (lowStock.length > 0 || expSoon.length > 0) ? `
  <div class="two-col-grid" style="margin-bottom:24px">
    ${lowStock.length > 0 ? `
    <div class="alert alert-warn">
      <div class="alert-title" style="color:#FF6B35">${svgIcon(ICONS.warn)} কম স্টক (${lowStock.length})</div>
      ${lowStock.map(p => `<div class="alert-row"><span>${p.image||"📦"} ${p.name}</span>${badge(p.stock+" "+(p.unit||""),"warn")}</div>`).join("")}
    </div>` : ""}
    ${expSoon.length > 0 ? `
    <div class="alert alert-danger">
      <div class="alert-title" style="color:#FF3B5C">${svgIcon(ICONS.warn)} মেয়াদ উত্তীর্ণ (${expSoon.length})</div>
      ${expSoon.map(p => `<div class="alert-row"><span>${p.image||"📦"} ${p.name}</span>${badge(p.expiry,"danger")}</div>`).join("")}
    </div>` : ""}
  </div>` : "";

  document.getElementById("pageContent").innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">ড্যাশবোর্ড</div>
        <div class="page-sub">${new Date().toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
      </div>
      <div style="display:flex;gap:8px">
        ${btn("রিফ্রেশ","btn btn-outline-muted btn-sm","refreshData()",ICONS.refresh)}
      </div>
    </div>
    <div class="stat-grid">
      ${statCard("আজকের বিক্রয়",`৳${todaySales.toLocaleString()}`,ICONS.money,"#00D4AA")}
      ${statCard("মোট লেনদেন",transactions.length,ICONS.cart,"#4E9EFF")}
      ${statCard("মোট পণ্য",products.length,ICONS.pkg,"#FFB344",lowStock.length+"টি কম স্টক")}
      ${statCard("মোট কাস্টমার",customers.length,ICONS.users,"#A78BFA")}
    </div>
    ${alertsHTML}
    <div class="dash-charts">
      <div class="card"><div class="card-body">
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:20px">সাপ্তাহিক বিক্রয়</div>
        <div class="bar-chart">${bars}</div>
      </div></div>
      <div class="card"><div class="card-body">
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:16px">সাম্প্রতিক লেনদেন</div>
        <div class="dash-txn-list">${recentTxn}</div>
      </div></div>
    </div>`;
}

async function refreshData() {
  showToast("ডেটা আপডেট হচ্ছে...", "info");
  await loadAll();
  navigate(currentPage);
  showToast("✅ ডেটা আপডেট হয়েছে");
}

// ─── POS ─────────────────────────────────
function renderPOS() {
  const el = document.getElementById("pageContent");
  el.innerHTML = `
  <div class="pos-layout">
    <div class="pos-products">
      <div style="display:flex;gap:10px">
        <div class="search-wrap" style="flex:1">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" id="posSearch" placeholder="পণ্য, বারকোড খুঁজুন..." oninput="onPosSearch(this.value)" value="${posSearch}">
        </div>
      </div>
      <div class="cat-chips" id="catChips"></div>
      <div class="product-grid" id="productGrid"></div>
    </div>
    <div class="pos-cart" id="posCart">
      <div class="cart-header">
        <div class="cart-title-row">
          <span class="cart-title">🛒 কার্ট (<span id="cartCount">0</span>)</span>
          <button class="btn btn-ghost-danger btn-sm" onclick="clearCart()">মুছুন</button>
        </div>
        <select class="cart-customer" id="cartCustomer" onchange="onCustomerChange(this.value)">
          <option value="">👤 ওয়াক-ইন কাস্টমার</option>
          ${customers.map(c=>`<option value="${c.id}">${c.name} (${c.phone})</option>`).join("")}
        </select>
      </div>
      <div class="cart-items" id="cartItems">
        <div class="cart-empty"><div class="cart-empty-icon">🛒</div><div>কার্ট খালি</div><div style="font-size:12px">পণ্যে ক্লিক করে যুক্ত করুন</div></div>
      </div>
      <div class="cart-footer">
        <div class="discount-row">
          <select id="discType" onchange="discountType=this.value;updateSummary()">
            <option value="fixed">৳ নির্দিষ্ট</option>
            <option value="percent">% শতাংশ</option>
          </select>
          <input type="number" placeholder="ছাড়" id="discVal" oninput="discountVal=+this.value;updateSummary()" style="flex:1;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none">
          <input type="number" placeholder="ভ্যাট %" id="vatInput" class="vat-input" oninput="vatPct=+this.value;updateSummary()" style="padding:7px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none">
        </div>
        <div class="summary-box">
          <div class="summary-row"><span>সাবটোটাল</span><span id="sumSub">৳০.০০</span></div>
          <div class="summary-row"><span>ছাড়</span><span id="sumDisc" style="color:var(--danger)">-৳০.০০</span></div>
          <div class="summary-row"><span>ভ্যাট</span><span id="sumVat">+৳০.০০</span></div>
          <div class="summary-total"><span>সর্বমোট</span><span id="sumTotal">৳০.০০</span></div>
        </div>
        <div class="pay-methods">
          ${["নগদ","মোবাইল ব্যাংকিং","কার্ড"].map(m=>`<button class="pay-method-btn${m==="নগদ"?" active":""}" onclick="selectPayMethod(this,'${m}')">${m==="নগদ"?"💵":m==="কার্ড"?"💳":"📱"} ${m}</button>`).join("")}
        </div>
        <div id="cashSection">
          <input type="number" class="received-input" id="receivedInput" placeholder="প্রাপ্ত পরিমাণ" oninput="receivedAmount=+this.value;updateChange()">
          <div class="change-row" id="changeRow" style="display:none">
            <span style="color:var(--text-muted)">ফেরত</span>
            <span id="changeAmt" style="font-family:var(--mono)">৳০.০০</span>
          </div>
        </div>
        <button class="checkout-btn" id="checkoutBtn" disabled onclick="checkout()">✓ বিক্রয় সম্পন্ন — ৳০.০০</button>
      </div>
    </div>
  </div>`;

  renderCatChips();
  renderProductGrid();
  renderCart();
}

function renderCatChips() {
  const el = document.getElementById("catChips");
  if (!el) return;
  el.innerHTML = CATEGORIES.map(c =>
    `<button class="cat-chip${posFilter===c?" active":""}" onclick="setPosFilter('${c}')">${c}</button>`
  ).join("");
}

function setPosFilter(c) { posFilter = c; renderCatChips(); renderProductGrid(); }
function onPosSearch(v) { posSearch = v; renderProductGrid(); }

function renderProductGrid() {
  const el = document.getElementById("productGrid");
  if (!el) return;
  const filtered = products.filter(p =>
    (posFilter==="সব"||p.category===posFilter) &&
    (p.name.includes(posSearch)||(p.barcode||"").includes(posSearch)||(p.sku||"").toLowerCase().includes(posSearch.toLowerCase()))
  );
  if (filtered.length === 0) {
    el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">কোনো পণ্য পাওয়া যায়নি</div>`;
    return;
  }
  el.innerHTML = filtered.map(p => `
    <button class="product-card${p.stock<=0?" out-of-stock":""}" onclick="${p.stock<=0?"":"addToCart('"+p.id+"')"}">
      <div class="product-emoji">${p.image||"📦"}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">৳${p.sellPrice}</div>
      <div class="product-stock${p.stock<=(p.minStock||0)?" low":""}">স্টক: ${p.stock} ${p.unit||""}</div>
    </button>`).join("");
}

function addToCart(id) {
  const p = products.find(x => x.id===id);
  if (!p || p.stock<=0) return;
  const ex = cart.find(x => x.id===id);
  if (ex) {
    if (ex.qty >= p.stock) { showToast("স্টক পর্যাপ্ত নয়!","error"); return; }
    ex.qty++;
  } else cart.push({ ...p, qty:1 });
  renderCart();
}

function updateQty(id, qty) {
  if (qty <= 0) cart = cart.filter(x => x.id!==id);
  else { const i = cart.find(x=>x.id===id); if(i) i.qty=qty; }
  renderCart();
}

function clearCart() { cart = []; discountVal=0; vatPct=0; receivedAmount=0; renderCart(); }

function renderCart() {
  const countEl = document.getElementById("cartCount");
  if (countEl) countEl.textContent = cart.reduce((s,i)=>s+i.qty,0);
  const el = document.getElementById("cartItems");
  if (!el) return;
  if (cart.length === 0) {
    el.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><div>কার্ট খালি</div><div style="font-size:12px">পণ্যে ক্লিক করে যুক্ত করুন</div></div>`;
  } else {
    el.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-emoji">${item.image||"📦"}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-calc">৳${item.sellPrice} × ${item.qty} = ৳${(item.sellPrice*item.qty).toLocaleString()}</div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="updateQty('${item.id}',${item.qty-1})">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty('${item.id}',${item.qty+1})">+</button>
        </div>
      </div>`).join("");
  }
  updateSummary();
}

function getCartTotals() {
  const sub  = cart.reduce((s,i)=>s+i.sellPrice*i.qty,0);
  const disc = discountType==="percent" ? sub*discountVal/100 : Number(discountVal);
  const vat  = (sub-disc)*vatPct/100;
  const total= sub-disc+vat;
  return { sub, disc, vat, total };
}

function updateSummary() {
  const { sub, disc, vat, total } = getCartTotals();
  const s = (n) => `৳${n.toFixed(2)}`;
  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set("sumSub",s(sub)); set("sumDisc",`-${s(disc)}`); set("sumVat",`+${s(vat)}`); set("sumTotal",s(total));
  const b = document.getElementById("checkoutBtn");
  if (b) { b.textContent = `✓ বিক্রয় সম্পন্ন — ${s(total)}`; b.disabled = cart.length===0; }
  updateChange();
}

function updateChange() {
  const { total } = getCartTotals();
  const ch = receivedAmount - total;
  const row = document.getElementById("changeRow");
  if (receivedAmount > 0 && row) {
    row.style.display = "flex";
    const el = document.getElementById("changeAmt");
    if (el) { el.textContent = `৳${Math.max(0,ch).toFixed(2)}`; el.style.color = ch>=0?"#00D4AA":"#FF3B5C"; }
  } else if (row) row.style.display = "none";
}

function selectPayMethod(btn, m) {
  payMethod = m;
  document.querySelectorAll(".pay-method-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const cs = document.getElementById("cashSection");
  if (cs) cs.style.display = m==="নগদ"?"block":"none";
}

function onCustomerChange(val) { selectedCustomerId = val; }

async function checkout() {
  if (cart.length===0) return;
  const { sub, disc, vat, total } = getCartTotals();
  const customer = customers.find(c=>c.id===selectedCustomerId);
  const txnId = `INV-${Date.now()}`;
  const txn = {
    invoiceId: txnId,
    date: new Date().toISOString(),
    customer: customer?.name||"ওয়াক-ইন",
    customerId: selectedCustomerId||"",
    items: cart.length,
    subtotal: sub, discount: disc, tax: vat, total,
    payment: payMethod, cashier: "অ্যাডমিন ইউজার",
    cartSnapshot: cart.map(i=>({ id:i.id, name:i.name, qty:i.qty, sellPrice:i.sellPrice, image:i.image||"📦" })),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    // Save transaction
    const txnRef = await COL.transactions().add(txn);
    txn.id = txnRef.id;

    // Update stock for each item
    const batch = db.batch();
    for (const item of cart) {
      const prod = products.find(p=>p.id===item.id);
      if (prod) {
        batch.update(COL.products().doc(item.id), { stock: Math.max(0, prod.stock - item.qty) });
        // Log inventory movement
        batch.set(COL.inventory().doc(), {
          product: item.name,
          productId: item.id,
          type: "out",
          qty: item.qty,
          note: `বিক্রয় ${txnId}`,
          date: new Date().toISOString(),
          user: "অ্যাডমিন ইউজার",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        // Update local
        prod.stock = Math.max(0, prod.stock - item.qty);
      }
    }
    await batch.commit();

    transactions.unshift({ id: txnRef.id, ...txn });
    showReceipt({ id: txnId, ...txn });
    cart = []; discountVal=0; vatPct=0; receivedAmount=0;
    renderCart();
    showToast("✅ বিক্রয় সফলভাবে সম্পন্ন হয়েছে!");
  } catch(e) {
    showToast("❌ বিক্রয় সংরক্ষণে সমস্যা: " + e.message,"error");
  }
}

function showReceipt(txn) {
  const items = (txn.cartSnapshot||[]).map(i=>`
    <div class="receipt-row"><span>${i.name} × ${i.qty}</span><span>৳${(i.sellPrice*i.qty).toFixed(2)}</span></div>`).join("");
  const html = `
    <div class="receipt-body">
      <div class="receipt-header">
        <div class="receipt-store">ফেরদৌস স্টোর</div>
        <div style="color:var(--text-muted);font-size:12px">ঢাকা, বাংলাদেশ</div>
        <div style="color:var(--text-muted);font-size:12px">${new Date(txn.date).toLocaleString("en-GB")}</div>
        <div style="font-weight:700;margin-top:4px">${txn.invoiceId||txn.id}</div>
      </div>
      <div class="receipt-divider"></div>
      ${items}
      <div class="receipt-divider"></div>
      <div class="receipt-row"><span>সাবটোটাল</span><span>৳${(txn.subtotal||0).toFixed(2)}</span></div>
      <div class="receipt-row"><span>ছাড়</span><span>-৳${(txn.discount||0).toFixed(2)}</span></div>
      <div class="receipt-row"><span>ভ্যাট</span><span>+৳${(txn.tax||0).toFixed(2)}</span></div>
      <div class="receipt-divider"></div>
      <div class="receipt-row total"><span>সর্বমোট</span><span>৳${(txn.total||0).toFixed(2)}</span></div>
      <div class="receipt-row"><span>পেমেন্ট পদ্ধতি</span><span>${txn.payment||""}</span></div>
      <div class="receipt-footer-text">ফেরদৌস স্টোর থেকে কেনাকাটার জন্য ধন্যবাদ!</div>
    </div>
    <div class="modal-footer">
      ${btn("প্রিন্ট করুন","btn btn-accent","window.print()",ICONS.printer)}
      ${btn("বন্ধ করুন","btn btn-outline-muted","closeModal()")}
    </div>`;
  openModal("🧾 রসিদ", html, 420);
}

// ─── PRODUCTS ────────────────────────────
function renderProducts() {
  const lowIds = new Set(products.filter(p=>p.stock<=p.minStock).map(p=>p.id));
  const filtered = products.filter(p =>
    (prodCat==="সব"||p.category===prodCat) &&
    (p.name.includes(prodSearch)||(p.sku||"").toLowerCase().includes(prodSearch.toLowerCase()))
  );

  const rows = filtered.map(p => {
    const days = p.expiry ? (new Date(p.expiry)-new Date())/86400000 : 9999;
    const expColor = days<7?"danger":days<30?"warn":"muted";
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">${p.image||"📦"}</span><div><div style="font-weight:600">${p.name}</div><div style="font-size:11px;color:var(--text-muted)">${p.barcode||""}</div></div></div></td>
      <td class="mono" style="color:var(--text-muted)">${p.sku||""}</td>
      <td>${badge(p.category||"","info")}</td>
      <td class="mono" style="color:var(--text-sub)">৳${p.buyPrice||0}</td>
      <td class="mono" style="color:var(--accent);font-weight:700">৳${p.sellPrice||0}</td>
      <td style="color:${lowIds.has(p.id)?"var(--danger)":"var(--text)"};font-weight:${lowIds.has(p.id)?700:400}">${p.stock} ${p.unit||""}</td>
      <td>${p.expiry?badge(p.expiry,expColor):"—"}</td>
      <td>${lowIds.has(p.id)?badge("কম স্টক","danger"):badge("স্টকে আছে","accent")}</td>
      <td><div style="display:flex;gap:6px;flex-wrap:wrap">
        ${btn("","btn btn-soft-info btn-sm",`openProductModal('${p.id}')`,ICONS.edit)}
        ${btn("","btn btn-soft-danger btn-sm",`deleteProduct('${p.id}')`,ICONS.trash)}
      </div></td>
    </tr>`;
  }).join("");

  document.getElementById("pageContent").innerHTML = `
    <div class="page-header">
      <div><div class="page-title">পণ্য</div><div class="page-sub">মোট ${products.length}টি পণ্য</div></div>
      ${btn("পণ্য যুক্ত করুন","btn btn-accent","openProductModal(null)",ICONS.plus)}
    </div>
    <div class="search-bar">
      <div class="search-wrap"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" placeholder="পণ্য খুঁজুন..." value="${prodSearch}" oninput="prodSearch=this.value;renderProducts()">
      </div>
      <select class="form-select" style="min-width:150px" onchange="prodCat=this.value;renderProducts()">
        ${CATEGORIES.map(c=>`<option${prodCat===c?" selected":""}>${c}</option>`).join("")}
      </select>
    </div>
    <div class="table-wrap" style="overflow-x:auto">
      <table>
        <thead><tr>${["পণ্য","এসকেইউ","ক্যাটাগরি","ক্রয়","বিক্রয়","স্টক","মেয়াদ","অবস্থা",""].map(h=>`<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows || `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">কোনো পণ্য নেই। পণ্য যুক্ত করুন।</td></tr>`}</tbody>
      </table>
    </div>`;
}

function openProductModal(id) {
  const p = id ? products.find(x=>x.id===id) : null;
  const EMOJIS = ["🌾","🥛","🍅","🫘","🫙","🍬","🧂","🧅","🍌","🍵","🍪","🥚","🧴","🫐","🍎","🥕","📦","🧹","🪣","🧻","🫧","🥤","🍞","🫓"];
  const emojiPicker = EMOJIS.map(e=>`<button class="emoji-btn${(p?.image||"📦")===e?" active":""}" type="button" onclick="selectEmoji(this,'${e}')">${e}</button>`).join("");
  const html = `
    <div class="form-grid-2">
      <div class="span-2" style="display:flex;gap:12px;align-items:center">
        <div id="selectedEmoji" style="font-size:40px">${p?.image||"📦"}</div>
        <div style="flex:1"><div class="form-label" style="margin-bottom:8px">আইকন</div><div class="emoji-picker">${emojiPicker}</div></div>
      </div>
      <div class="form-group"><label class="form-label">পণ্যের নাম *</label><input class="form-input" id="f_name" value="${p?.name||""}" placeholder="পণ্যের নাম"></div>
      <div class="form-group"><label class="form-label">এসকেইউ</label><input class="form-input" id="f_sku" value="${p?.sku||""}" placeholder="RIC001"></div>
      <div class="form-group"><label class="form-label">ক্যাটাগরি</label>
        <select class="form-select" id="f_cat">${CATEGORIES.slice(1).map(c=>`<option${p?.category===c?" selected":""}>${c}</option>`).join("")}</select>
      </div>
      <div class="form-group"><label class="form-label">একক</label>
        <select class="form-select" id="f_unit">${["কেজি","গ্রাম","লিটার","মিলি","পিস","প্যাকেট","বোতল","বক্স","ডজন","ব্যাগ"].map(u=>`<option${p?.unit===u?" selected":""}>${u}</option>`).join("")}</select>
      </div>
      <div class="form-group"><label class="form-label">ক্রয় মূল্য (৳)</label><input class="form-input" id="f_buy" type="number" min="0" value="${p?.buyPrice||""}" placeholder="0"></div>
      <div class="form-group"><label class="form-label">বিক্রয় মূল্য (৳) *</label><input class="form-input" id="f_sell" type="number" min="0" value="${p?.sellPrice||""}" placeholder="0"></div>
      <div class="form-group"><label class="form-label">স্টক পরিমাণ</label><input class="form-input" id="f_stock" type="number" min="0" value="${p?.stock||0}" placeholder="0"></div>
      <div class="form-group"><label class="form-label">সর্বনিম্ন স্টক সতর্কতা</label><input class="form-input" id="f_min" type="number" min="0" value="${p?.minStock||10}" placeholder="10"></div>
      <div class="form-group"><label class="form-label">বারকোড</label><input class="form-input" id="f_bar" value="${p?.barcode||""}" placeholder="8901234567890"></div>
      <div class="form-group"><label class="form-label">মেয়াদ শেষের তারিখ</label><input class="form-input" id="f_exp" type="date" value="${p?.expiry||""}"></div>
    </div>
    <div class="modal-footer">
      ${btn("বাতিল","btn btn-outline-muted","closeModal()")}
      ${btn(p?"আপডেট করুন":"যুক্ত করুন","btn btn-accent",`saveProduct('${id||""}')`,ICONS.check)}
    </div>`;
  openModal(p?"পণ্য সম্পাদনা":"নতুন পণ্য যুক্ত করুন", html, 640);
}

function selectEmoji(btn, e) {
  document.querySelectorAll(".emoji-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("selectedEmoji").textContent = e;
}

async function saveProduct(id) {
  const img = document.getElementById("selectedEmoji")?.textContent || "📦";
  const name = document.getElementById("f_name")?.value?.trim();
  const sellPrice = +document.getElementById("f_sell")?.value;
  if (!name) { showToast("পণ্যের নাম দিন!","error"); return; }
  if (!sellPrice) { showToast("বিক্রয় মূল্য দিন!","error"); return; }

  const obj = {
    image: img,
    name,
    sku:       document.getElementById("f_sku")?.value||"",
    category:  document.getElementById("f_cat")?.value||"",
    unit:      document.getElementById("f_unit")?.value||"পিস",
    buyPrice:  +document.getElementById("f_buy")?.value||0,
    sellPrice,
    stock:     +document.getElementById("f_stock")?.value||0,
    minStock:  +document.getElementById("f_min")?.value||10,
    barcode:   document.getElementById("f_bar")?.value||"",
    expiry:    document.getElementById("f_exp")?.value||"",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    if (id) {
      await COL.products().doc(id).update(obj);
      products = products.map(p=>p.id===id?{...p,...obj}:p);
      showToast("✅ পণ্য আপডেট হয়েছে!");
    } else {
      obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await COL.products().add(obj);
      products.unshift({ id: ref.id, ...obj });
      showToast("✅ পণ্য যুক্ত হয়েছে!");
    }
    closeModal();
    renderProducts();
  } catch(e) {
    showToast("❌ সমস্যা হয়েছে: " + e.message,"error");
  }
}

async function deleteProduct(id) {
  if (!confirm("এই পণ্যটি মুছে ফেলতে চান?")) return;
  try {
    await COL.products().doc(id).delete();
    products = products.filter(p=>p.id!==id);
    renderProducts();
    showToast("✅ পণ্য মুছে ফেলা হয়েছে!");
  } catch(e) {
    showToast("❌ সমস্যা: " + e.message,"error");
  }
}

// ─── INVENTORY ───────────────────────────
function renderInventory() {
  const lowStock = products.filter(p=>p.stock<=(p.minStock||0));
  const outStock = products.filter(p=>p.stock===0);
  const totalVal = products.reduce((s,p)=>s+(p.buyPrice||0)*(p.stock||0),0);

  document.getElementById("pageContent").innerHTML = `
    <div class="page-header">
      <div><div class="page-title">ইনভেন্টরি</div><div class="page-sub">স্টক ব্যবস্থাপনা</div></div>
      ${btn("স্টক সমন্বয়","btn btn-accent","openAdjustModal(null)",ICONS.refresh)}
    </div>
    <div class="stat-grid">
      ${statCard("মোট পণ্য",products.length,ICONS.pkg,"#00D4AA")}
      ${statCard("কম স্টক",lowStock.length,ICONS.warn,"#FF6B35")}
      ${statCard("স্টক শেষ",outStock.length,ICONS.warn,"#FF3B5C")}
      ${statCard("স্টক মূল্য","৳"+totalVal.toLocaleString(),ICONS.money,"#4E9EFF")}
    </div>
    ${lowStock.length>0?`
    <div class="alert alert-warn" style="margin-bottom:24px">
      <div class="alert-title" style="color:#FF6B35">${svgIcon(ICONS.warn)} ⚠️ কম স্টক (${lowStock.length})</div>
      <div class="inv-low-grid">
        ${lowStock.map(p=>`
        <div class="inv-low-card">
          <div class="inv-low-emoji">${p.image||"📦"}</div>
          <div class="inv-low-name">${p.name}</div>
          <div class="inv-low-bottom">
            ${badge(p.stock+" "+(p.unit||""),"warn")}
            ${btn("রিস্টক","btn btn-accent btn-sm",`openAdjustModal('${p.id}')`)}
          </div>
        </div>`).join("")}
      </div>
    </div>`:""}
    <div class="table-wrap" style="overflow-x:auto">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);font-weight:700;font-size:15px">স্টক ইতিহাস</div>
      <table>
        <thead><tr>${["পণ্য","ধরন","পরিমাণ","নোট","তারিখ","ব্যবহারকারী"].map(h=>`<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${inventoryMovements.length===0?`<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted)">কোনো রেকর্ড নেই</td></tr>`:
          inventoryMovements.map(m=>`<tr>
            <td>${m.product||""}</td>
            <td>${badge(m.type==="in"?"▲ স্টক ইন":"▼ স্টক আউট",m.type==="in"?"accent":"danger")}</td>
            <td class="mono" style="color:${m.type==="in"?"var(--accent)":"var(--danger)"}">${m.type==="in"?"+":"-"}${m.qty}</td>
            <td style="color:var(--text-muted)">${m.note||""}</td>
            <td style="color:var(--text-muted)">${m.date?formatDate(m.date):""}</td>
            <td style="color:var(--text-muted)">${m.user||""}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function openAdjustModal(pid) {
  const html = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group"><label class="form-label">পণ্য</label>
        <select class="form-select" id="adj_prod">
          <option value="">পণ্য নির্বাচন করুন...</option>
          ${products.map(p=>`<option value="${p.id}"${p.id===pid?" selected":""}>${p.image||"📦"} ${p.name} (${p.stock} ${p.unit||""})</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">ধরন</label>
        <select class="form-select" id="adj_type"><option value="in">স্টক ইন (+)</option><option value="out">স্টক আউট (-)</option></select>
      </div>
      <div class="form-group"><label class="form-label">পরিমাণ</label><input class="form-input" type="number" id="adj_qty" placeholder="পরিমাণ" min="1"></div>
      <div class="form-group"><label class="form-label">নোট</label><input class="form-input" id="adj_note" placeholder="কারণ লিখুন..."></div>
    </div>
    <div class="modal-footer">
      ${btn("বাতিল","btn btn-outline-muted","closeModal()")}
      ${btn("প্রয়োগ করুন","btn btn-accent","applyAdjust()",ICONS.check)}
    </div>`;
  openModal("স্টক সমন্বয়", html, 440);
}

async function applyAdjust() {
  const pid  = document.getElementById("adj_prod").value;
  const type = document.getElementById("adj_type").value;
  const qty  = +document.getElementById("adj_qty").value;
  const note = document.getElementById("adj_note").value;
  if (!pid || !qty) { showToast("পণ্য ও পরিমাণ দিন!","error"); return; }
  const prod = products.find(p=>p.id===pid);
  if (!prod) return;
  const newStock = type==="in" ? prod.stock+qty : Math.max(0,prod.stock-qty);
  try {
    await COL.products().doc(pid).update({ stock: newStock });
    await COL.inventory().add({
      product: prod.name, productId: pid, type, qty, note: note||"",
      date: new Date().toISOString(), user: "অ্যাডমিন ইউজার",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    products = products.map(p=>p.id===pid?{...p,stock:newStock}:p);
    const mov = { product:prod.name, type, qty, note:note||"", date:new Date().toISOString(), user:"অ্যাডমিন ইউজার" };
    inventoryMovements.unshift(mov);
    closeModal(); renderInventory();
    showToast("✅ স্টক আপডেট হয়েছে!");
  } catch(e) {
    showToast("❌ সমস্যা: " + e.message,"error");
  }
}

// ─── CUSTOMERS ───────────────────────────
function renderCustomers() {
  const filtered = customers.filter(c=>c.name.includes(custSearch)||c.phone.includes(custSearch));
  document.getElementById("pageContent").innerHTML = `
    <div class="page-header">
      <div><div class="page-title">কাস্টমার</div><div class="page-sub">${customers.length} জন</div></div>
      ${btn("কাস্টমার যুক্ত করুন","btn btn-accent","openCustomerModal(null)",ICONS.plus)}
    </div>
    <div class="search-bar">
      <div class="search-wrap"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" placeholder="নাম বা ফোন দিয়ে খুঁজুন..." value="${custSearch}" oninput="custSearch=this.value;renderCustomers()">
      </div>
    </div>
    <div class="card-grid">
      ${filtered.length===0?`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">কোনো কাস্টমার নেই</div>`:
      filtered.map(c=>`
      <div class="info-card">
        <div class="info-card-head">
          <div class="info-card-meta">
            <div class="info-avatar">👤</div>
            <div><div class="info-name">${c.name}</div><div class="info-phone">${c.phone}</div></div>
          </div>
          ${btn("","btn btn-soft-info btn-sm",`openCustomerModal('${c.id}')`,ICONS.edit)}
        </div>
        <div class="info-stats">
          <div class="info-stat"><div class="info-stat-label">মোট ক্রয়</div><div class="info-stat-value" style="color:var(--accent)">৳${(c.totalPurchase||0).toLocaleString()}</div></div>
          <div class="info-stat"><div class="info-stat-label">পয়েন্ট</div><div class="info-stat-value" style="color:var(--gold)">${c.points||0} ⭐</div></div>
        </div>
        ${c.due>0?`<div class="due-box"><span style="color:var(--danger)">বাকি</span><span class="mono" style="color:var(--danger);font-weight:700">৳${c.due}</span></div>`:""}
        <div class="join-date">যোগদান: ${c.joinDate||""}</div>
      </div>`).join("")}
    </div>`;
}

function openCustomerModal(id) {
  const c = id ? customers.find(x=>x.id===id) : null;
  const html = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group"><label class="form-label">পূর্ণ নাম *</label><input class="form-input" id="cf_name" value="${c?.name||""}" placeholder="কাস্টমারের নাম"></div>
      <div class="form-group"><label class="form-label">ফোন নম্বর *</label><input class="form-input" id="cf_phone" value="${c?.phone||""}" placeholder="01XXXXXXXXX"></div>
      <div class="form-group"><label class="form-label">ইমেইল</label><input class="form-input" id="cf_email" value="${c?.email||""}" placeholder="email@example.com"></div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">পয়েন্ট</label><input class="form-input" type="number" id="cf_pts" value="${c?.points||0}"></div>
        <div class="form-group"><label class="form-label">বাকি (৳)</label><input class="form-input" type="number" id="cf_due" value="${c?.due||0}"></div>
      </div>
    </div>
    <div class="modal-footer">
      ${btn("বাতিল","btn btn-outline-muted","closeModal()")}
      ${btn(c?"আপডেট করুন":"যুক্ত করুন","btn btn-accent",`saveCustomer('${id||""}')`,ICONS.check)}
    </div>`;
  openModal(c?"কাস্টমার সম্পাদনা":"কাস্টমার যুক্ত করুন", html);
}

async function saveCustomer(id) {
  const obj = {
    name:  document.getElementById("cf_name")?.value?.trim(),
    phone: document.getElementById("cf_phone")?.value?.trim(),
    email: document.getElementById("cf_email")?.value||"",
    points: +document.getElementById("cf_pts")?.value||0,
    due:    +document.getElementById("cf_due")?.value||0,
  };
  if (!obj.name||!obj.phone) { showToast("নাম ও ফোন নম্বর দিন!","error"); return; }
  try {
    if (id) {
      await COL.customers().doc(id).update({ ...obj, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      customers = customers.map(c=>c.id===id?{...c,...obj}:c);
      showToast("✅ কাস্টমার আপডেট হয়েছে!");
    } else {
      obj.totalPurchase = 0;
      obj.joinDate = new Date().toISOString().split("T")[0];
      obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await COL.customers().add(obj);
      customers.push({ id:ref.id, ...obj });
      showToast("✅ কাস্টমার যুক্ত হয়েছে!");
    }
    closeModal(); renderCustomers();
  } catch(e) {
    showToast("❌ সমস্যা: " + e.message,"error");
  }
}

// ─── SUPPLIERS ───────────────────────────
function renderSuppliers() {
  document.getElementById("pageContent").innerHTML = `
    <div class="page-header">
      <div><div class="page-title">সাপ্লায়ার</div><div class="page-sub">${suppliers.length} জন সাপ্লায়ার</div></div>
      ${btn("সাপ্লায়ার যুক্ত করুন","btn btn-accent","openSupplierModal(null)",ICONS.plus)}
    </div>
    <div class="card-grid">
      ${suppliers.length===0?`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">কোনো সাপ্লায়ার নেই</div>`:
      suppliers.map(s=>`
      <div class="info-card">
        <div class="info-card-head">
          <div><div class="info-name">${s.name}</div><div class="info-phone">${s.contact||""}</div><div style="font-size:12px;color:var(--text-muted)">${s.address||""}</div></div>
          ${btn("","btn btn-soft-info btn-sm",`openSupplierModal('${s.id}')`,ICONS.edit)}
        </div>
        <div class="info-stats">
          <div class="info-stat"><div class="info-stat-label">মোট ক্রয়</div><div class="info-stat-value" style="color:var(--accent)">৳${(s.totalPurchase||0).toLocaleString()}</div></div>
          <div class="info-stat" style="${s.due>0?"background:var(--danger-dim);border:1px solid #FF3B5C33":""}"><div class="info-stat-label">বাকি</div><div class="info-stat-value" style="color:${s.due>0?"var(--danger)":"var(--accent)"}">৳${(s.due||0).toLocaleString()}</div></div>
        </div>
      </div>`).join("")}
    </div>`;
}

function openSupplierModal(id) {
  const s = id ? suppliers.find(x=>x.id===id) : null;
  const html = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group"><label class="form-label">কোম্পানির নাম *</label><input class="form-input" id="sf_name" value="${s?.name||""}" placeholder="সাপ্লায়ারের নাম"></div>
      <div class="form-group"><label class="form-label">যোগাযোগ</label><input class="form-input" id="sf_contact" value="${s?.contact||""}" placeholder="01XXXXXXXXX"></div>
      <div class="form-group"><label class="form-label">ইমেইল</label><input class="form-input" id="sf_email" value="${s?.email||""}" placeholder="supplier@email.com"></div>
      <div class="form-group"><label class="form-label">ঠিকানা</label><input class="form-input" id="sf_addr" value="${s?.address||""}" placeholder="সম্পূর্ণ ঠিকানা"></div>
      <div class="form-group"><label class="form-label">বাকি (৳)</label><input class="form-input" type="number" id="sf_due" value="${s?.due||0}"></div>
    </div>
    <div class="modal-footer">
      ${btn("বাতিল","btn btn-outline-muted","closeModal()")}
      ${btn(s?"আপডেট করুন":"যুক্ত করুন","btn btn-accent",`saveSupplier('${id||""}')`,ICONS.check)}
    </div>`;
  openModal(s?"সাপ্লায়ার সম্পাদনা":"সাপ্লায়ার যুক্ত করুন", html);
}

async function saveSupplier(id) {
  const obj = {
    name:    document.getElementById("sf_name")?.value?.trim(),
    contact: document.getElementById("sf_contact")?.value||"",
    email:   document.getElementById("sf_email")?.value||"",
    address: document.getElementById("sf_addr")?.value||"",
    due:    +document.getElementById("sf_due")?.value||0,
  };
  if (!obj.name) { showToast("কোম্পানির নাম দিন!","error"); return; }
  try {
    if (id) {
      await COL.suppliers().doc(id).update({ ...obj, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      suppliers = suppliers.map(s=>s.id===id?{...s,...obj}:s);
      showToast("✅ সাপ্লায়ার আপডেট হয়েছে!");
    } else {
      obj.totalPurchase = 0;
      obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await COL.suppliers().add(obj);
      suppliers.push({ id:ref.id, ...obj });
      showToast("✅ সাপ্লায়ার যুক্ত হয়েছে!");
    }
    closeModal(); renderSuppliers();
  } catch(e) {
    showToast("❌ সমস্যা: " + e.message,"error");
  }
}

// ─── EMPLOYEES ───────────────────────────
function renderEmployees() {
  const roleColor = r => r==="অ্যাডমিন"?"#FF3B5C":r==="ম্যানেজার"?"#FFB344":"#00D4AA";
  const roleIcon  = r => r==="অ্যাডমিন"?"👑":r==="ম্যানেজার"?"🎯":"💼";
  const badgeOf   = r => r==="অ্যাডমিন"?"danger":r==="ম্যানেজার"?"gold":"accent";

  document.getElementById("pageContent").innerHTML = `
    <div class="page-header">
      <div><div class="page-title">কর্মচারী</div><div class="page-sub">স্টাফ ব্যবস্থাপনা</div></div>
      ${btn("স্টাফ যুক্ত করুন","btn btn-accent","openEmpModal(null)",ICONS.plus)}
    </div>
    <div class="card-grid">
      ${employees.length===0?`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">কোনো কর্মচারী নেই</div>`:
      employees.map(e=>`
      <div class="emp-card">
        <div class="emp-head">
          <div class="emp-icon" style="background:${roleColor(e.role||"")}22">${roleIcon(e.role||"")}</div>
          <div><div class="emp-name">${e.name}</div><div class="emp-username">@${e.username||""}</div></div>
          <div class="emp-edit">${btn("","btn btn-soft-info btn-sm",`openEmpModal('${e.id}')`,ICONS.edit)}</div>
        </div>
        <div class="emp-badges">${badge(e.role||"","accent")}${badge(e.status||"সক্রিয়","accent")}</div>
        <div class="emp-meta"><div>${e.phone||""}</div><div>${e.joinDate||""}</div></div>
      </div>`).join("")}
    </div>`;
}

function openEmpModal(id) {
  const e = id ? employees.find(x=>x.id===id) : null;
  const ROLES = ["অ্যাডমিন","ম্যানেজার","ক্যাশিয়ার"];
  const html = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="form-group"><label class="form-label">পূর্ণ নাম *</label><input class="form-input" id="ef_name" value="${e?.name||""}" placeholder="নাম"></div>
      <div class="form-group"><label class="form-label">ইউজারনেম</label><input class="form-input" id="ef_user" value="${e?.username||""}" placeholder="username"></div>
      <div class="form-group"><label class="form-label">ফোন</label><input class="form-input" id="ef_phone" value="${e?.phone||""}" placeholder="01XXXXXXXXX"></div>
      <div class="form-group"><label class="form-label">পদবি</label><select class="form-select" id="ef_role">${ROLES.map(r=>`<option${e?.role===r?" selected":""}>${r}</option>`).join("")}</select></div>
    </div>
    <div class="modal-footer">
      ${btn("বাতিল","btn btn-outline-muted","closeModal()")}
      ${btn(e?"আপডেট করুন":"যুক্ত করুন","btn btn-accent",`saveEmp('${id||""}')`,ICONS.check)}
    </div>`;
  openModal(e?"কর্মচারী সম্পাদনা":"কর্মচারী যুক্ত করুন", html, 440);
}

async function saveEmp(id) {
  const obj = {
    name:     document.getElementById("ef_name")?.value?.trim(),
    username: document.getElementById("ef_user")?.value||"",
    phone:    document.getElementById("ef_phone")?.value||"",
    role:     document.getElementById("ef_role")?.value||"ক্যাশিয়ার",
  };
  if (!obj.name) { showToast("নাম দিন!","error"); return; }
  try {
    if (id) {
      await COL.employees().doc(id).update({ ...obj, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      employees = employees.map(e=>e.id===id?{...e,...obj}:e);
      showToast("✅ কর্মচারী আপডেট হয়েছে!");
    } else {
      obj.joinDate = new Date().toISOString().split("T")[0];
      obj.status = "সক্রিয়";
      obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await COL.employees().add(obj);
      employees.push({ id:ref.id, ...obj });
      showToast("✅ কর্মচারী যুক্ত হয়েছে!");
    }
    closeModal(); renderEmployees();
  } catch(e) {
    showToast("❌ সমস্যা: " + e.message,"error");
  }
}

// ─── REPORTS ─────────────────────────────
let reportPeriod = "weekly";
function renderReports() {
  const totalRev  = transactions.reduce((s,t)=>s+(t.total||0),0);
  const totalCost = products.reduce((s,p)=>s+(p.buyPrice||0)*(p.stock||0),0);
  const avgOrder  = transactions.length ? (totalRev/transactions.length).toFixed(0) : 0;
  const periodLabel = { daily:"দৈনিক", weekly:"সাপ্তাহিক", monthly:"মাসিক" };

  const trendBars = Array.from({length:30},(_,i)=>{
    const v = Math.floor(Math.random()*8000)+2000;
    return `<div class="trend-bar" style="flex:1;background:${i>24?"#00D4AA":"#00D4AA55"};height:${v/100}px;min-height:4px"></div>`;
  }).join("");

  const topProds = products.slice(0,5).map((p,i)=>`
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:11px;font-weight:700;color:var(--text-muted);width:16px">#${i+1}</span>
      <span style="font-size:20px">${p.image||"📦"}</span>
      <span style="flex:1;font-size:13px">${p.name}</span>
      <div style="text-align:right"><div class="mono" style="color:var(--accent);font-weight:700">৳${(p.sellPrice*(20-i*3)).toLocaleString()}</div></div>
    </div>`).join("") || `<div style="color:var(--text-muted);padding:20px;text-align:center">কোনো পণ্য নেই</div>`;

  const txnRows = transactions.slice(0,15).map(t=>`<tr>
    <td class="mono" style="color:var(--accent);font-weight:600">${t.invoiceId||t.id}</td>
    <td style="color:var(--text-muted)">${t.date?formatDate(t.date):""}</td>
    <td>${t.customer||"ওয়াক-ইন"}</td>
    <td class="mono" style="color:var(--accent);font-weight:700">৳${(t.total||0)}</td>
    <td>${badge(t.payment||"নগদ",t.payment==="নগদ"?"accent":t.payment==="কার্ড"?"info":"gold")}</td>
  </tr>`).join("") || `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">কোনো লেনদেন নেই</td></tr>`;

  document.getElementById("pageContent").innerHTML = `
    <div class="page-header">
      <div><div class="page-title">রিপোর্ট</div><div class="page-sub">ব্যবসায়িক বিশ্লেষণ</div></div>
      <div class="period-pills">
        ${["daily","weekly","monthly"].map(p=>`<button class="period-pill${reportPeriod===p?" active":""}" onclick="reportPeriod='${p}';renderReports()">${periodLabel[p]}</button>`).join("")}
      </div>
    </div>
    <div class="stat-grid">
      ${statCard("মোট আয়","৳"+totalRev.toLocaleString(),ICONS.money,"#00D4AA")}
      ${statCard("মোট অর্ডার",transactions.length,ICONS.receipt,"#4E9EFF")}
      ${statCard("গড় অর্ডার","৳"+avgOrder,ICONS.trend,"#FFB344")}
      ${statCard("স্টক মূল্য","৳"+totalCost.toLocaleString(),ICONS.pkg,"#A78BFA")}
    </div>
    <div class="card" style="margin-bottom:24px"><div class="card-body">
      <div style="font-size:15px;font-weight:700;margin-bottom:24px">বিক্রয় প্রবণতা</div>
      <div class="trend-chart">${trendBars}</div>
      <div class="trend-labels"><span>৩০ দিন আগে</span><span>আজ</span></div>
    </div></div>
    <div class="two-col-grid" style="margin-bottom:24px">
      <div class="card"><div class="card-body">
        <div style="font-size:15px;font-weight:700;margin-bottom:16px">সর্বাধিক বিক্রিত</div>
        ${topProds}
      </div></div>
      <div class="table-wrap" style="overflow-x:auto">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);font-weight:700;font-size:15px">সাম্প্রতিক লেনদেন</div>
        <table>
          <thead><tr>${["ইনভয়েস","তারিখ","কাস্টমার","সর্বমোট","পেমেন্ট"].map(h=>`<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${txnRows}</tbody>
        </table>
      </div>
    </div>`;
}

// ─── SETTINGS ────────────────────────────
let settingsState = {
  storeName:"ফেরদৌস স্টোর", address:"ঢাকা, বাংলাদেশ",
  phone:"01700000000", email:"ferdausstore@gmail.com",
  currency:"BDT (৳)", vat:"0", footer:"কেনাকাটার জন্য ধন্যবাদ!",
  darkMode:true
};

function renderSettings() {
  const tog = (key, label, desc) => `
    <div class="toggle-row">
      <div><div class="toggle-label">${label}</div><div class="toggle-desc">${desc}</div></div>
      <button class="toggle-switch${settingsState[key]?" on":""}" onclick="toggleSetting('${key}')"><div class="toggle-knob"></div></button>
    </div>`;

  document.getElementById("pageContent").innerHTML = `
  <div class="settings-wrap">
    <div class="page-title" style="margin-bottom:0">সেটিংস</div>
    <div class="settings-section">
      <h3>🏪 দোকানের তথ্য</h3>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">দোকানের নাম</label><input class="form-input" id="st_name" value="${settingsState.storeName}"></div>
        <div class="form-group"><label class="form-label">ফোন</label><input class="form-input" id="st_phone" value="${settingsState.phone}"></div>
        <div class="form-group span-2"><label class="form-label">ইমেইল</label><input class="form-input" id="st_email" value="${settingsState.email}"></div>
        <div class="form-group span-2"><label class="form-label">ঠিকানা</label><input class="form-input" id="st_addr" value="${settingsState.address}"></div>
      </div>
    </div>
    <div class="settings-section">
      <h3>💰 কর ও মুদ্রা</h3>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">মুদ্রা</label>
          <select class="form-select" id="st_cur">${["BDT (৳)","USD ($)","EUR (€)"].map(c=>`<option${settingsState.currency===c?" selected":""}>${c}</option>`).join("")}</select>
        </div>
        <div class="form-group"><label class="form-label">ডিফল্ট ভ্যাট %</label><input class="form-input" type="number" id="st_vat" value="${settingsState.vat}"></div>
      </div>
    </div>
    <div class="settings-section">
      <h3>🧾 রসিদ</h3>
      <div class="form-group"><label class="form-label">ফুটার বার্তা</label><input class="form-input" id="st_footer" value="${settingsState.footer}"></div>
    </div>
    <div class="settings-section">
      <h3>🎨 থিম</h3>
      ${tog("darkMode","ডার্ক মোড","অ্যাপে ডার্ক থিম ব্যবহার করুন")}
    </div>
    ${btn("সেটিংস সংরক্ষণ করুন","btn btn-accent btn-lg","saveSettings()",ICONS.check)}
  </div>`;
}

function toggleSetting(key) { settingsState[key] = !settingsState[key]; renderSettings(); }

async function saveSettings() {
  settingsState.storeName = document.getElementById("st_name").value;
  settingsState.phone     = document.getElementById("st_phone").value;
  settingsState.email     = document.getElementById("st_email").value;
  settingsState.address   = document.getElementById("st_addr").value;
  settingsState.currency  = document.getElementById("st_cur").value;
  settingsState.vat       = document.getElementById("st_vat").value;
  settingsState.footer    = document.getElementById("st_footer").value;
  try {
    await COL.settings().doc("main").set({ ...settingsState, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    showToast("✅ সেটিংস সংরক্ষিত হয়েছে!");
  } catch(e) {
    showToast("❌ সমস্যা: " + e.message,"error");
  }
}

// ─── INIT ────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {

  // Sidebar toggle
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  sidebarToggle.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("show");
    } else {
      sidebar.classList.toggle("collapsed");
    }
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  });

  // Nav clicks
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.addEventListener("click", () => navigate(b.dataset.page));
  });

  // Modal close
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", e => {
    if (e.target === document.getElementById("modalBackdrop")) closeModal();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  // Load Firebase data then render
  await loadAll();
  navigate("dashboard");
});
