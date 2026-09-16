const STATUS_LABELS = {
  confirmed: "Confirmed",
  suggested: "Suggested",
  want: "Want",
  maybe: "Maybe",
  "need-to-book": "Need to book",
  requested: "Requested",
  hidden: "Hidden",
};

const STATUS_ORDER = ["confirmed", "suggested", "want", "maybe", "need-to-book", "requested", "hidden"];
const STORAGE_KEY = "trip-guide-status-overrides";

const state = {
  data: null,
  places: {},
  overrides: loadOverrides(),
};

const els = {
  travelers: document.getElementById("travelers"),
  title: document.getElementById("site-title"),
  headline: document.getElementById("headline"),
  intro: document.getElementById("booked-intro"),
  page: document.getElementById("booked"),
};

init();

async function init() {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeydown);

  try {
    const [bookedRes, placesRes] = await Promise.all([
      fetch("data/booked.json", { cache: "no-cache" }),
      fetch("data/places.json", { cache: "no-cache" }),
    ]);
    if (!bookedRes.ok) {
      throw new Error(`Could not load booked.json (${bookedRes.status})`);
    }
    state.data = await bookedRes.json();
    if (placesRes.ok) {
      const placesData = await placesRes.json();
      (placesData.places || []).forEach((place) => {
        state.places[place.id] = place;
      });
    }
    renderMeta(state.data.meta);
    renderPage();
  } catch (error) {
    els.page.innerHTML = `<p class="error">Couldn’t load bookings. Refresh and try again. ${escapeHtml(error.message)}</p>`;
  }
}

function loadOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const clean = {};
    Object.entries(parsed).forEach(([id, status]) => {
      if (typeof id === "string" && STATUS_LABELS[status]) {
        clean[id] = status;
      }
    });
    return clean;
  } catch {
    return {};
  }
}

function saveOverrides() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.overrides));
  } catch {
    /* Private mode or full storage — keep the in-memory pick for this session. */
  }
}

function baselineStatus(item) {
  const place = item.placeId ? state.places[item.placeId] : null;
  return place?.status || item.status || "confirmed";
}

function effectiveStatus(item) {
  if (item.placeId && state.overrides[item.placeId]) {
    return state.overrides[item.placeId];
  }
  return baselineStatus(item);
}

function isOverridden(item) {
  return Boolean(item.placeId && Object.hasOwn(state.overrides, item.placeId));
}

function setItemStatus(item, status) {
  if (!item.placeId || !STATUS_LABELS[status]) return;
  if (status === baselineStatus(item)) {
    delete state.overrides[item.placeId];
  } else {
    state.overrides[item.placeId] = status;
  }
  saveOverrides();
  closePicker();
  renderPage();
}

function renderMeta(meta) {
  if (!meta) return;
  if (meta.travelers?.length) {
    els.travelers.textContent = meta.travelers.join(" & ");
  }
  if (meta.title) {
    els.title.textContent = meta.title;
    document.title = meta.title;
  }
  if (meta.lede) {
    els.headline.textContent = meta.lede;
  }
  if (meta.intro && els.intro) {
    els.intro.textContent = meta.intro;
  }
}

function renderPage() {
  closePicker();
  const fragment = document.createDocumentFragment();
  (state.data.groups || []).forEach((group) => {
    fragment.appendChild(renderGroup(group));
  });
  if (state.data.nearby) {
    fragment.appendChild(renderGroup(state.data.nearby, true));
  }
  els.page.replaceChildren(fragment);
}

function renderGroup(group, nearby = false) {
  const section = document.createElement("section");
  section.className = nearby ? "booked-group booked-group--nearby" : "booked-group";
  section.id = group.id || "";

  const items = (group.items || []).map((item) => bookedCard(item)).join("");
  section.innerHTML = `
    <div class="booked-group__head">
      <h2 class="booked-group__label">${escapeHtml(group.label || "")}</h2>
      ${group.when ? `<p class="booked-group__when">${escapeHtml(group.when)}</p>` : ""}
    </div>
    ${group.intro ? `<p class="booked-group__intro">${escapeHtml(group.intro)}</p>` : ""}
    <div class="booked-list">${items}</div>
  `;

  section.querySelectorAll("[data-place-id]").forEach((card) => {
    const item = (group.items || []).find((entry) => entry.placeId === card.dataset.placeId);
    const button = card.querySelector("button.status");
    if (!item || !button) return;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePicker(item, button);
    });
  });

  return section;
}

function bookedCard(item) {
  const status = effectiveStatus(item);
  const statusLabel = STATUS_LABELS[status] || status;
  const placeHref = item.placeId ? `/#${item.placeId}` : "";
  const title = placeHref
    ? `<a class="inline-link" href="${escapeAttr(placeHref)}">${escapeHtml(item.title)}</a>`
    : escapeHtml(item.title);
  const notes = (item.notes || [])
    .map((note) => `<li>${escapeHtml(note)}</li>`)
    .join("");
  const extraLinks = (item.links || [])
    .map(
      (link) =>
        `<a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
    )
    .join("");
  const maps = item.address
    ? `<a href="${escapeAttr(mapsUrl(item.address))}" target="_blank" rel="noopener noreferrer">Maps</a>`
    : "";
  const phone = item.phone
    ? `<a href="${escapeAttr('tel:' + (item.tel || item.phone))}">${escapeHtml(item.phone)}</a>`
    : "";
  const links = [maps, phone, extraLinks].filter(Boolean).join("");
  const editable = Boolean(item.placeId);

  return `
    <article class="place-card booked-card" data-status="${escapeAttr(status)}" ${
      item.placeId ? `data-place-id="${escapeAttr(item.placeId)}" id="${escapeAttr(item.placeId)}"` : ""
    }>
      <div class="place-card__top">
        <h3 class="booked-card__title">${title}</h3>
        <div class="status-wrap">
          ${
            editable
              ? `<button
                  type="button"
                  class="status status--${escapeAttr(status)}"
                  aria-haspopup="listbox"
                  aria-expanded="false"
                  aria-label="Change status for ${escapeAttr(item.title)}. Current status: ${escapeAttr(statusLabel)}"
                >${escapeHtml(statusLabel)} <span class="status__caret" aria-hidden="true">▾</span></button>`
              : `<span class="status status--${escapeAttr(status)}">${escapeHtml(statusLabel)}</span>`
          }
          ${isOverridden(item) ? `<p class="status-cue">changed here</p>` : ""}
        </div>
      </div>
      ${item.when ? `<p class="booked-card__when">${escapeHtml(item.when)}</p>` : ""}
      ${item.address ? `<p class="address">${escapeHtml(item.address)}</p>` : ""}
      ${notes ? `<ul class="booked-notes">${notes}</ul>` : ""}
      ${links ? `<div class="links">${links}</div>` : ""}
    </article>
  `;
}

function togglePicker(item, button) {
  const wrap = button.closest(".status-wrap");
  const existing = wrap.querySelector(".status-picker");
  if (existing) {
    closePicker();
    return;
  }

  closePicker();
  const picker = document.createElement("div");
  picker.className = "status-picker";
  picker.dataset.placeId = item.placeId;
  picker.innerHTML = `<p class="status-picker__label" id="status-picker-label-${escapeAttr(item.placeId)}">Update status</p>`;

  const list = document.createElement("div");
  list.className = "status-picker__options";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-labelledby", `status-picker-label-${item.placeId}`);

  const current = effectiveStatus(item);
  STATUS_ORDER.forEach((value) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `status-option status--${value}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(value === current));
    option.dataset.status = value;
    option.textContent = STATUS_LABELS[value];
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      setItemStatus(item, value);
    });
    list.appendChild(option);
  });

  picker.appendChild(list);
  wrap.appendChild(picker);
  button.setAttribute("aria-expanded", "true");
  list.querySelector('[aria-selected="true"]')?.focus();
}

function closePicker() {
  document.querySelectorAll(".status-picker").forEach((picker) => picker.remove());
  document.querySelectorAll(".status[aria-expanded='true']").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function onDocumentClick(event) {
  if (event.target.closest(".status-picker") || event.target.closest(".status")) return;
  closePicker();
}

function onDocumentKeydown(event) {
  if (event.key === "Escape") closePicker();
}

function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
