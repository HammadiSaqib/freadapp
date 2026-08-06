/* ============================================================
   The Score Machine landing page — controller
   ============================================================ */
(function () {
  const CFG = window.SCORE_MACHINE_CONFIG;
  const PLANS = window.SCORE_MACHINE_PLANS;

  /* ---------- Referral / UTM param preservation ---------- */
  const TRACK_KEYS = ["ref","affiliate","affiliate_id","utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
  const incoming = new URLSearchParams(window.location.search);
  const trackedParams = new URLSearchParams();
  TRACK_KEYS.forEach(k => { if (incoming.get(k)) trackedParams.set(k, incoming.get(k)); });

  function appendParams(baseUrl) {
    if (!baseUrl || baseUrl.startsWith("PASTE_")) return "#";
    try {
      const u = new URL(baseUrl, window.location.origin);
      trackedParams.forEach((v, k) => { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
      return u.toString();
    } catch (e) { return baseUrl; }
  }

  /* ---------- Populate affiliate strings ---------- */
  document.querySelectorAll("[data-affiliate-name]").forEach(el => el.textContent = CFG.affiliate.name);
  document.querySelectorAll("[data-affiliate-org]").forEach(el => el.textContent = CFG.affiliate.organization);
  document.querySelectorAll("[data-affiliate-title]").forEach(el => el.textContent = CFG.affiliate.title);
  document.querySelectorAll("[data-affiliate-disclosure]").forEach(el => el.textContent = CFG.affiliate.disclosure);
  document.querySelectorAll("[data-brand-name]").forEach(el => el.textContent = CFG.brand.name);

  /* ---------- Links ---------- */
  const linkMap = {
    "data-link-login": CFG.links.loginUrl,
    "data-link-demo": CFG.links.demoUrl,
    "data-link-privacy": CFG.links.privacyUrl,
    "data-link-terms": CFG.links.termsUrl,
    "data-link-refund": CFG.links.refundPolicyUrl,
    "data-link-cancel": CFG.links.cancellationPolicyUrl,
    "data-link-referral": appendParams(CFG.affiliate.referralUrl)
  };
  Object.entries(linkMap).forEach(([attr, url]) => {
    document.querySelectorAll(`[${attr}]`).forEach(el => {
      el.setAttribute("href", url && !String(url).startsWith("PASTE_") ? url : "#");
    });
  });

  /* ---------- Pricing render ---------- */
  const priceGrid = document.getElementById("plan-grid");
  let currentBilling = "monthly";

  function fmt(n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function renderPlans() {
    priceGrid.innerHTML = PLANS.map(p => {
      const price = currentBilling === "monthly" ? p.monthly : p.yearly;
      const suffix = currentBilling === "monthly" ? "/month" : "/year";
      const checkoutKey = p.id + (currentBilling === "monthly" ? "Monthly" : "Yearly");
      const checkoutUrl = appendParams(CFG.checkout[checkoutKey]);
      const featured = p.badge ? "featured" : "";
      const elite = p.id === "elite" ? "elite" : "";
      return `
        <div class="glass glass-hover plan-card ${featured} ${elite} reveal">
          ${p.badge ? `<div class="plan-badge">${p.badge}</div>` : ""}
          <div style="font-size:13px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px;">${p.name}</div>
          <p style="color:var(--text-secondary); margin:10px 0 24px; font-size:14px; line-height:1.5; min-height: 63px;">${p.description}</p>
          <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:8px;">
            <span class="price-value grad-text">${fmt(price)}</span>
            <span class="price-suffix">${suffix}</span>
          </div>
          ${currentBilling === "yearly" ? '<div style="font-size:12px; color:var(--emerald); margin-bottom:20px;">2 months free vs monthly</div>' : '<div style="height:20px;"></div>'}
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; min-height: 56px; align-content: flex-start;">
            ${p.limits.map(l => `<span style="background:rgba(0,200,255,0.08); border:1px solid rgba(0,200,255,0.2); color:var(--cyan); padding:6px 12px; border-radius:999px; font-size:12px; font-weight:600;">${l}</span>`).join("")}
          </div>
          <ul style="list-style:none; padding:0; margin:0 0 28px; display:flex; flex-direction:column; gap:12px; flex:1;">
            ${p.features.map(f => `<li style="display:flex; gap:10px; align-items:flex-start; color:var(--text-secondary); font-size:14px; line-height:1.5;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0; margin-top:2px;"><path d="M20 6L9 17l-5-5" stroke="#00E5A8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>${f}</span></li>`).join("")}
          </ul>
          <a href="${checkoutUrl}" class="btn ${p.badge ? 'btn-primary' : 'btn-ghost'}" data-plan="${p.id}" data-billing="${currentBilling}" style="width:100%; margin-top: auto;">${p.cta}</a>
        </div>`;
    }).join("");
    initReveal();
  }

  document.querySelectorAll("[data-billing-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentBilling = btn.dataset.billingToggle;
      document.querySelectorAll("[data-billing-toggle]").forEach(b => b.classList.toggle("active", b === btn));
      renderPlans();
    });
  });

  /* ---------- Nav scroll state ---------- */
  const nav = document.querySelector(".nav");
  window.addEventListener("scroll", () => nav.classList.toggle("scrolled", window.scrollY > 20));

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  menuBtn.addEventListener("click", () => {
    const open = mobileMenu.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  mobileMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => mobileMenu.classList.remove("open")));

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach(item => {
    const q = item.querySelector(".faq-q");
    q.addEventListener("click", () => {
      const open = item.classList.toggle("open");
      q.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Disclosure modal ---------- */
  const modal = document.getElementById("disclosure-modal");
  document.querySelectorAll("[data-open-disclosure]").forEach(el => el.addEventListener("click", () => modal.classList.add("open")));
  document.querySelectorAll("[data-close-disclosure]").forEach(el => el.addEventListener("click", () => modal.classList.remove("open")));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") modal.classList.remove("open"); });

  /* ---------- QR code ---------- */
  function generateQR() {
    const target = appendParams(CFG.affiliate.qrCodeDestination);
    const container = document.getElementById("qr-inner");
    container.innerHTML = "";
    if (window.QRCode) {
      new QRCode(container, { text: target, width: 220, height: 220, colorDark: "#030712", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    } else {
      const img = document.createElement("img");
      img.alt = "Affiliate QR code";
      img.src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(target);
      container.appendChild(img);
    }
  }
  if (document.readyState === "complete") generateQR();
  else window.addEventListener("load", generateQR);

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll(".reveal:not(.visible)").forEach(el => io.observe(el));
  }

  /* ---------- Year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Boot ---------- */
  renderPlans();
  initReveal();
})();
