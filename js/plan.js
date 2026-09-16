const STATUS_LABELS = {
  confirmed: "Confirmed",
  open: "Open",
  idea: "Idea",
  plan: "Plan",
};

const els = {
  travelers: document.getElementById("travelers"),
  title: document.getElementById("site-title"),
  headline: document.getElementById("headline"),
  intro: document.getElementById("plan-intro"),
  page: document.getElementById("plan"),
};

init();

async function init() {
  try {
    const response = await fetch("data/plan.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Could not load plan.json (${response.status})`);
    }
    const data = await response.json();
    renderMeta(data.meta);
    renderDays(data);
  } catch (error) {
    els.page.innerHTML = `<p class="error">Couldn’t load the day plan. Refresh and try again. ${escapeHtml(error.message)}</p>`;
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
  }
  if (meta.intro && els.intro) {
    els.intro.textContent = meta.intro;
  }
}

function renderDays(data) {
  const days = data.days || [];
  if (!days.length) {
    els.page.innerHTML = `<p class="empty">No days in the plan yet.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  days.forEach((day) => fragment.appendChild(dayCard(day)));
  if (data.comingSoon) {
    fragment.appendChild(comingSoonCard(data.comingSoon));
  }
  els.page.replaceChildren(fragment);
}

function dayCard(day) {
  const article = document.createElement("article");
  article.className = "day-card plan-day";
  article.id = day.id || "";

  const slots = (day.slots || []).map(slotRow).join("");
  article.innerHTML = `
    <div class="day-card__top">
      <div>
        <h2 class="day-card__when">${escapeHtml(day.label || "")}</h2>
        ${day.title ? `<p class="day-card__place">${escapeHtml(day.title)}${day.place ? ` · ${escapeHtml(day.place)}` : ""}</p>` : ""}
      </div>
    </div>
    ${day.theme ? `<p class="plan-theme">${escapeHtml(day.theme)}</p>` : ""}
    ${slots ? `<ol class="plan-slots">${slots}</ol>` : ""}
  `;
  return article;
}

function slotRow(slot) {
  const status = slot.status || "plan";
  const href = slotHref(slot);
  const title = href
    ? `<a class="inline-link" href="${escapeAttr(href)}">${escapeHtml(slot.title)}</a>`
    : escapeHtml(slot.title);
  const points = (slot.points || [])
    .map((point) => `<li>${escapeHtml(point)}</li>`)
    .join("");

  return `
    <li class="plan-slot" data-status="${escapeAttr(status)}">
      <p class="plan-slot__time">${escapeHtml(slot.time || "")}</p>
      <div class="plan-slot__body">
        <div class="plan-slot__top">
          <p class="plan-slot__title">${title}</p>
          ${statusChip(status)}
        </div>
        ${slot.detail ? `<p class="day-item__detail">${escapeHtml(slot.detail)}</p>` : ""}
        ${points ? `<ul class="plan-points">${points}</ul>` : ""}
      </div>
    </li>
  `;
}

function comingSoonCard(block) {
  const article = document.createElement("article");
  article.className = "day-card plan-day plan-day--soon";
  article.innerHTML = `
    <div class="day-card__top">
      <div>
        <h2 class="day-card__when">${escapeHtml(block.title || "Coming soon")}</h2>
        ${block.detail ? `<p class="day-card__place">${escapeHtml(block.detail)}</p>` : ""}
      </div>
      <span class="status status--plan">Coming soon</span>
    </div>
  `;
  return article;
}

function slotHref(slot) {
  if (slot.href) return slot.href;
  if (slot.placeId) return `/#${slot.placeId}`;
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
