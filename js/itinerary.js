const STATUS_LABELS = {
  confirmed: "Confirmed",
  "need-to-book": "Need to book",
  tbd: "TBD",
  assumed: "Assumed",
};

const els = {
  travelers: document.getElementById("travelers"),
  title: document.getElementById("site-title"),
  headline: document.getElementById("headline"),
  openTasks: document.getElementById("open-tasks"),
  days: document.getElementById("days"),
};

init();

async function init() {
  try {
    const response = await fetch("data/itinerary.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Could not load itinerary.json (${response.status})`);
    }
    const data = await response.json();
    renderMeta(data.meta);
    renderOpenTasks(data.openTasks || []);
    renderDays(data.days || []);
  } catch (error) {
    els.days.innerHTML = `<p class="error">Couldn’t load the itinerary. Refresh and try again. ${escapeHtml(error.message)}</p>`;
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
  if (meta.lede) {
    els.headline.textContent = meta.lede;
  } else if (meta.headline) {
    els.headline.textContent = meta.headline;
  }
}

function renderOpenTasks(tasks) {
  if (!els.openTasks) return;
  if (!tasks.length) {
    els.openTasks.closest(".open-tasks")?.classList.add("open-tasks--empty");
    return;
  }

  const fragment = document.createDocumentFragment();
  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "open-task";
    const status = task.status || "need-to-book";
    const link = taskLink(task);
    item.innerHTML = `
      <div class="open-task__text">
        <p class="open-task__title">${link}</p>
        ${task.when ? `<p class="open-task__when">${escapeHtml(task.when)}</p>` : ""}
      </div>
      ${statusChip(status)}
    `;
    fragment.appendChild(item);
  });
  els.openTasks.replaceChildren(fragment);
}

function renderDays(days) {
  if (!days.length) {
    els.days.innerHTML = `<p class="empty">No days in the itinerary yet.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  days.forEach((day) => {
    const article = document.createElement("article");
    const status = day.status || "tbd";
    article.className = "day-card";
    article.dataset.status = status;
    article.id = day.id || day.date;

    const items = (day.items || [])
      .map((item) => {
        const itemStatus = item.status || status;
        const link = taskLink(item);
        return `
          <li class="day-item">
            <div class="day-item__body">
              <p class="day-item__title">${link}</p>
              ${item.detail ? `<p class="day-item__detail">${escapeHtml(item.detail)}</p>` : ""}
            </div>
            ${statusChip(itemStatus)}
          </li>
        `;
      })
      .join("");

    article.innerHTML = `
      <div class="day-card__top">
        <div>
          <h2 class="day-card__when">${escapeHtml(day.label || day.date)}</h2>
          ${day.place ? `<p class="day-card__place">${escapeHtml(day.place)}</p>` : ""}
        </div>
        ${statusChip(status)}
      </div>
      ${items ? `<ul class="day-items">${items}</ul>` : ""}
    `;
    fragment.appendChild(article);
  });

  els.days.replaceChildren(fragment);
}

function taskLink(entry) {
  const label = escapeHtml(entry.title || entry.text || "");
  const href = entryHref(entry);
  if (!href) return label;
  return `<a class="inline-link" href="${escapeAttr(href)}">${label}</a>`;
}

function entryHref(entry) {
  if (entry.href) return entry.href;
  if (entry.placeId) return `index.html#${entry.placeId}`;
  return "";
}

function statusChip(status) {
  const label = STATUS_LABELS[status] || status;
  return `<span class="status status--${escapeAttr(status)}">${escapeHtml(label)}</span>`;
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
