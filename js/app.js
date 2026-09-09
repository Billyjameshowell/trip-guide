const STATUS_LABELS = {
  confirmed: "Confirmed",
  suggested: "Suggested",
  maybe: "Maybe",
  "need-to-book": "Need to book",
  requested: "Requested",
  hidden: "Hidden",
};

const STATUS_ORDER = ["confirmed", "suggested", "maybe", "need-to-book", "requested", "hidden"];
const STORAGE_KEY = "trip-guide-status-overrides";

const state = {
  data: null,
  city: "all",
  activity: "all",
  showHidden: false,
  overrides: loadOverrides(),
};

const els = {
  travelers: document.getElementById("travelers"),
  title: document.getElementById("site-title"),
  headline: document.getElementById("headline"),
  nights: document.getElementById("london-nights"),
  stayBudget: document.getElementById("stay-budget"),
  stayOverBudget: document.getElementById("stay-over-budget"),
  held: document.getElementById("held"),
  disclaimer: document.getElementById("disclaimer"),
  cityFilters: document.getElementById("city-filters"),
  activityFilters: document.getElementById("activity-filters"),
  deviceFilters: document.getElementById("device-filters"),
  resultCount: document.getElementById("result-count"),
  places: document.getElementById("places"),
};

init();

async function init() {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeydown);

  try {
    const response = await fetch("data/places.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Could not load places.json (${response.status})`);
    }
    state.data = await response.json();
    renderMeta(state.data.meta);
    renderFilters(state.data);
    renderPlaces();
  } catch (error) {
    els.places.innerHTML = `<p class="error">Could not load the guide. Serve the folder over HTTP (GitHub Pages or a local static server) so <code>data/places.json</code> can load. ${escapeHtml(error.message)}</p>`;
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

function effectiveStatus(place) {
  return state.overrides[place.id] || place.status;
}

function isOverridden(place) {
  return Object.hasOwn(state.overrides, place.id);
}

function setPlaceStatus(place, status) {
  if (!STATUS_LABELS[status]) return;
  if (status === place.status) {
    delete state.overrides[place.id];
  } else {
    state.overrides[place.id] = status;
  }
  saveOverrides();
  closePicker();
  renderFilters(state.data);
  renderPlaces();
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
  if (meta.headline || meta.when) {
    els.headline.textContent = [meta.headline, meta.when].filter(Boolean).join(" · ");
  }
  if (meta.londonNights) els.nights.textContent = meta.londonNights;
  if (meta.stayBudget && els.stayBudget) els.stayBudget.textContent = meta.stayBudget;
  if (meta.stayOverBudget && els.stayOverBudget) els.stayOverBudget.textContent = meta.stayOverBudget;
  if (meta.held) els.held.textContent = meta.held;
  if (meta.disclaimer) els.disclaimer.textContent = meta.disclaimer;
}

function renderFilters(data) {
  const cities = data.cities || unique(data.places.map((place) => place.city));
  const activities = data.activities || unique(data.places.map((place) => place.activity));

  els.cityFilters.replaceChildren(
    chipButton("All cities", "all", "city"),
    ...cities.map((city) => chipButton(city, city, "city"))
  );
  els.activityFilters.replaceChildren(
    chipButton("All activities", "all", "activity"),
    ...activities.map((activity) => chipButton(activity, activity, "activity"))
  );

  const hiddenCount = (data.places || []).filter((place) => effectiveStatus(place) === "hidden").length;
  const hiddenLabel = hiddenCount ? `Show hidden (${hiddenCount})` : "Show hidden";
  const hiddenChip = document.createElement("button");
  hiddenChip.type = "button";
  hiddenChip.className = "chip";
  hiddenChip.id = "show-hidden";
  hiddenChip.textContent = hiddenLabel;
  hiddenChip.setAttribute("aria-pressed", String(state.showHidden));
  hiddenChip.addEventListener("click", () => {
    state.showHidden = !state.showHidden;
    renderFilters(state.data);
    renderPlaces();
  });
  els.deviceFilters.replaceChildren(hiddenChip);
}

function chipButton(label, value, kind) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.setAttribute("aria-pressed", String(state[kind] === value));
  button.addEventListener("click", () => {
    state[kind] = value;
    updatePressed(kind === "city" ? els.cityFilters : els.activityFilters, value);
    renderPlaces();
  });
  return button;
}

function updatePressed(group, value) {
  group.querySelectorAll(".chip").forEach((button, index) => {
    const isAll = index === 0;
    const matches = isAll ? value === "all" : button.textContent === value;
    button.setAttribute("aria-pressed", String(matches));
  });
}

function renderPlaces() {
  closePicker();
  const places = visiblePlaces();
  const hiddenCount = (state.data.places || []).filter((place) => effectiveStatus(place) === "hidden").length;
  const hiddenBit = !state.showHidden && hiddenCount ? ` · ${hiddenCount} hidden on this device` : "";
  els.resultCount.textContent = `${places.length} place${places.length === 1 ? "" : "s"}${hiddenBit}`;

  if (!places.length) {
    const empty = hiddenCount && !state.showHidden
      ? `<p class="empty">No places match those filters. Turn on <strong>Show hidden</strong> if you hid options on this device.</p>`
      : `<p class="empty">No places match those filters. Clear a filter or add a place in <code>data/places.json</code>.</p>`;
    els.places.innerHTML = empty;
    return;
  }

  const fragment = document.createDocumentFragment();
  groupPlaces(places).forEach((cityGroup) => {
    const cityEl = document.createElement("section");
    cityEl.className = "city-block";
    cityEl.innerHTML = `<h2 class="city-title">${escapeHtml(cityGroup.city)}</h2>`;

    cityGroup.neighborhoods.forEach((hood) => {
      const hoodEl = document.createElement("div");
      hoodEl.className = "neighborhood-block";
      hoodEl.innerHTML = `<h3 class="neighborhood-title">${escapeHtml(hood.neighborhood)}</h3>`;

      hood.activities.forEach((bucket) => {
        const activityEl = document.createElement("div");
        activityEl.innerHTML = `<p class="activity-title">${escapeHtml(bucket.activity)}</p>`;
        const list = document.createElement("div");
        list.className = "card-list";
        bucket.places.forEach((place) => list.appendChild(placeCard(place)));
        activityEl.appendChild(list);
        hoodEl.appendChild(activityEl);
      });

      cityEl.appendChild(hoodEl);
    });

    fragment.appendChild(cityEl);
  });

  els.places.replaceChildren(fragment);
}

function visiblePlaces() {
  return state.data.places.filter((place) => {
    const status = effectiveStatus(place);
    const cityOk = state.city === "all" || place.city === state.city;
    const activityOk = state.activity === "all" || place.activity === state.activity;
    const hiddenOk = state.showHidden || status !== "hidden";
    return cityOk && activityOk && hiddenOk;
  });
}

function groupPlaces(places) {
  const cities = [];
  const cityIndex = new Map();

  places.forEach((place) => {
    if (!cityIndex.has(place.city)) {
      cityIndex.set(place.city, { city: place.city, neighborhoods: [], hoodIndex: new Map() });
      cities.push(cityIndex.get(place.city));
    }
    const cityGroup = cityIndex.get(place.city);
    const hoodName = place.neighborhood || "Area TBC";
    if (!cityGroup.hoodIndex.has(hoodName)) {
      cityGroup.hoodIndex.set(hoodName, { neighborhood: hoodName, activities: [], activityIndex: new Map() });
      cityGroup.neighborhoods.push(cityGroup.hoodIndex.get(hoodName));
    }
    const hood = cityGroup.hoodIndex.get(hoodName);
    if (!hood.activityIndex.has(place.activity)) {
      hood.activityIndex.set(place.activity, { activity: place.activity, places: [] });
      hood.activities.push(hood.activityIndex.get(place.activity));
    }
    hood.activityIndex.get(place.activity).places.push(place);
  });

  return cities;
}

function placeCard(place) {
  const article = document.createElement("article");
  const status = effectiveStatus(place);
  article.className = "place-card";
  article.dataset.status = status;
  article.id = place.id;
  if (status === "hidden") article.classList.add("place-card--hidden");

  const statusLabel = STATUS_LABELS[status] || status;
  const links = (place.links || [])
    .map(
      (link) =>
        `<a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
    )
    .join("");

  article.innerHTML = `
    <div class="place-card__top">
      <h4>${escapeHtml(place.name)}</h4>
      <div class="status-wrap">
        <button
          type="button"
          class="status status--${escapeAttr(status)}"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-label="Change status for ${escapeAttr(place.name)}. Current status: ${escapeAttr(statusLabel)}"
        >${escapeHtml(statusLabel)} <span class="status__caret" aria-hidden="true">▾</span></button>
        ${isOverridden(place) ? `<p class="status-cue">saved on this device</p>` : ""}
      </div>
    </div>
    ${place.address ? `<p class="address">${escapeHtml(place.address)}</p>` : ""}
    <p class="description">${escapeHtml(place.description)}</p>
    ${place.note ? `<p class="note">${escapeHtml(place.note)}</p>` : ""}
    <ul class="tags">
      <li>${escapeHtml(place.city)}</li>
      <li>${escapeHtml(place.neighborhood || "Area TBC")}</li>
      <li>${escapeHtml(place.activity)}</li>
    </ul>
    ${links ? `<div class="links">${links}</div>` : ""}
  `;

  const statusButton = article.querySelector(".status");
  statusButton.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePicker(place, statusButton);
  });

  return article;
}

function togglePicker(place, button) {
  const wrap = button.closest(".status-wrap");
  const existing = wrap.querySelector(".status-picker");
  if (existing) {
    closePicker();
    return;
  }

  closePicker();
  const picker = document.createElement("div");
  picker.className = "status-picker";
  picker.dataset.placeId = place.id;
  picker.innerHTML = `<p class="status-picker__label" id="status-picker-label-${escapeAttr(place.id)}">Update status</p>`;

  const list = document.createElement("div");
  list.className = "status-picker__options";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-labelledby", `status-picker-label-${place.id}`);

  const current = effectiveStatus(place);
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
      setPlaceStatus(place, value);
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
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
