const STATUS_LABELS = {
  confirmed: "Confirmed",
  suggested: "Suggested",
  maybe: "Maybe",
  "need-to-book": "Need to book",
  requested: "Requested",
};

const state = {
  data: null,
  city: "all",
  activity: "all",
};

const els = {
  travelers: document.getElementById("travelers"),
  title: document.getElementById("site-title"),
  headline: document.getElementById("headline"),
  nights: document.getElementById("london-nights"),
  held: document.getElementById("held"),
  disclaimer: document.getElementById("disclaimer"),
  cityFilters: document.getElementById("city-filters"),
  activityFilters: document.getElementById("activity-filters"),
  resultCount: document.getElementById("result-count"),
  places: document.getElementById("places"),
};

init();

async function init() {
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
  const places = visiblePlaces();
  els.resultCount.textContent = `${places.length} place${places.length === 1 ? "" : "s"}`;

  if (!places.length) {
    els.places.innerHTML = `<p class="empty">No places match those filters. Clear a filter or add a place in <code>data/places.json</code>.</p>`;
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
    const cityOk = state.city === "all" || place.city === state.city;
    const activityOk = state.activity === "all" || place.activity === state.activity;
    return cityOk && activityOk;
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
  article.className = "place-card";
  article.dataset.status = place.status;
  article.id = place.id;

  const status = STATUS_LABELS[place.status] || place.status;
  const links = (place.links || [])
    .map(
      (link) =>
        `<a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
    )
    .join("");

  article.innerHTML = `
    <div class="place-card__top">
      <h4>${escapeHtml(place.name)}</h4>
      <span class="status status--${escapeAttr(place.status)}">${escapeHtml(status)}</span>
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
  return article;
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
