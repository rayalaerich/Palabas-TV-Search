/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — Your first API request
// TODO: async function testRequest(): fetch searchURL("friends"), log the status and the JSON array
async function testRequest() {
  const url = searchURL("friends");
  console.log("Request:", url);

  const response = await fetch(url);
  console.log("Status:", response.status, "ok?", response.ok);

  const data = await response.json();
  console.log(data);
  console.log("How many:", data.length);
  console.log("First show:", data[0].show.name, data[0].show.premiered);
}

testRequest();

// STEP 2 — Search and show the results
// TODO: renderResults(items), searchShows(query), and a submit listener on the form
function renderResults(items) {
  results.innerHTML = "";

  items.forEach((item) => {
    const show = item.show;
    const card = el("button", "card");
    card.type = "button";
    card.dataset.id = show.id;

    const rating = show.rating.average;

    card.append(
      createPoster(show),
      el("span", "title", show.name),
      el("span", "year", yearRange(show)),
      el("span", "genres", show.genres.join(", ")),
      el("span", "rating", rating ? `★ ${rating}` : "Not rated yet")
    );

    results.appendChild(card);
  });
}

/*
async function searchShows(query) {
  const data = await fetch(searchURL(query)).then((res) => res.json());
  renderResults(data);
}
*/

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (query === "") return;
  searchShows(query);
});

// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check

// Fetches JSON data and gives a clear message when a request fails
async function getJSON(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (networkError) {
    throw new Error(
      "Can't reach TVmaze. Check your internet, or use sample mode."
    );
  }

  if (response.status === 429) {
    throw new Error(
      "Too many requests (429). Wait 10 seconds and try again."
    );
  }

  if (!response.ok) {
    if (response.status === 404 && USE_SAMPLE_DATA && url.startsWith("data/search/")) {
      throw new Error(
        "No sample data found. Try: friends, office, breaking bad, stranger things, sherlock, thrones, or sample."
      );
    }

    throw new Error(`Request failed (HTTP ${response.status}).`);
  }

  return response.json();
}


async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");
  results.innerHTML = "";

  try {
    const data = await getJSON(searchURL(query));

    if (data.length === 0) {
      setStatus(`No shows found for "${query}".`, "error");
      return;
    }

    renderResults(data);

    const count = data.length;
    const label = count === 1 ? "show" : "shows";
    setStatus(`${count} ${label} found for "${query}".`);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)
results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) showDetails(card.dataset.id);
});

/*
async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  dialog.showModal();

  try {
    const show = await getJSON(showURL(id));
    renderDetails(show);
  } catch (error) {
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}
  */

/*
function renderDetails(show) {
  const network = show.network
    ? show.network.name
    : show.webChannel
    ? show.webChannel.name
    : "N/A";

  const runtime = show.runtime || show.averageRuntime || "N/A";
  const rating = show.rating.average
    ? `★ ${show.rating.average}`
    : "Not rated yet";

  const link = document.createElement("a");
  link.href = show.url;
  link.target = "_blank";
  link.textContent = "View on TVmaze";

  detailsBody.replaceChildren(
    createPoster(show, "original"),
    el("h2", "", show.name),
    el(
      "p",
      "meta",
      `${yearRange(show)} · ${network} · ${show.genres.join(", ")} · ${runtime} min`
    ),
    el("p", "rating", rating),
    el("p", "summary", stripTags(show.summary || "No summary available.")),
    link
  );
}
*/

// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)

async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  dialog.showModal();

  try {
    const start = performance.now();

    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id)),
    ]);

    console.log(`3 requests in ${Math.round(performance.now() - start)} ms`);

    renderDetails(show, cast, seasons);
  } catch (error) {
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

/*
function renderDetails(show, cast, seasons) {
  const network = show.network
    ? show.network.name
    : show.webChannel
    ? show.webChannel.name
    : "N/A";

  const runtime = show.runtime || show.averageRuntime || "N/A";
  const rating = show.rating.average
    ? `★ ${show.rating.average}`
    : "Not rated yet";

  const link = document.createElement("a");
  link.href = show.url;
  link.target = "_blank";
  link.textContent = "View on TVmaze";

  // Seasons text
  const seasonsText =
    seasons.length === 1 ? "1 season" : `${seasons.length} seasons`;

  // Cast list (max 6)
  const castList = document.createElement("ul");
  cast.slice(0, 6).forEach((member) => {
    const li = el("li", "", `${member.person.name} `);
    li.append(el("span", "", `as ${member.character.name}`));
    castList.append(li);
  });

  detailsBody.replaceChildren(
    createPoster(show, "original"),
    el("h2", "", show.name),
    el(
      "p",
      "meta",
      `${yearRange(show)} · ${network} · ${show.genres.join(", ")} · ${runtime} min`
    ),
    el("p", "rating", rating),
    el("p", "seasons", seasonsText),
    el("p", "summary", stripTags(show.summary || "No summary available.")),
    el("h3", "", "Cast"),
    castList,
    link
  );
}
  */

//TASK 6
//Add one feature of your own: C · Favorites

const favoritesKey = "palabas-favorites";

// Gets the list of favorite shows from localStorage
function getFavorites() {
  const data = localStorage.getItem(favoritesKey);
  return data ? JSON.parse(data) : [];
}

// Saves a show to favorites
function addFavorite(id, name) {
  const favorites = getFavorites();
  // Avoid duplicates
  if (!favorites.some((fav) => fav.id === id)) {
    favorites.push({ id, name });
    localStorage.setItem(favoritesKey, JSON.stringify(favorites));
  }
  renderFavorites();
}

// Removes a show from favorites
function removeFavorite(id) {
  const favorites = getFavorites().filter((fav) => fav.id !== id);
  localStorage.setItem(favoritesKey, JSON.stringify(favorites));
  renderFavorites();
}

// Renders the favorites list on the page
function renderFavorites() {
  let container = document.getElementById("favorites");

  // Create the container if it doesn't exist yet
  if (!container) {
    container = document.createElement("div");
    container.id = "favorites";
    container.innerHTML = "<h3>My Favorites</h3><ul id='favorites-list'></ul>";
    // Put it above the search form or below the header
    document.querySelector("main")?.prepend(container) || document.body.prepend(container);
  }

  const list = document.getElementById("favorites-list");
  list.innerHTML = "";

  const favorites = getFavorites();

  if (favorites.length === 0) {
    list.innerHTML = "<li>No favorites yet</li>";
    return;
  }

  favorites.forEach((fav) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <button class="fav-show" data-id="${fav.id}">${fav.name}</button>
      <button class="remove-fav" data-id="${fav.id}">✕</button>
    `;
    list.appendChild(li);
  });
}

function renderDetails(show, cast, seasons) {
  const network = show.network
    ? show.network.name
    : show.webChannel
    ? show.webChannel.name
    : "N/A";

  const runtime = show.runtime || show.averageRuntime || "N/A";
  const rating = show.rating.average
    ? `★ ${show.rating.average}`
    : "Not rated yet";

  const link = document.createElement("a");
  link.href = show.url;
  link.target = "_blank";
  link.textContent = "View on TVmaze";

  // Seasons text
  const seasonsText =
    seasons.length === 1 ? "1 season" : `${seasons.length} seasons`;

  // Cast list (max 6)
  const castList = document.createElement("ul");
  cast.slice(0, 6).forEach((member) => {
    const li = el("li", "", `${member.person.name} `);
    li.append(el("span", "", `as ${member.character.name}`));
    castList.append(li);
  });

  // Favorite button
  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.textContent = "☆ Add to Favorites";
  favBtn.style.margin = "10px 0";
  favBtn.addEventListener("click", () => {
    addFavorite(String(show.id), show.name);
    favBtn.textContent = "★ Added to Favorites";
    favBtn.disabled = true;
  });

  detailsBody.replaceChildren(
    createPoster(show, "original"),
    el("h2", "", show.name),
    el(
      "p",
      "meta",
      `${yearRange(show)} · ${network} · ${show.genres.join(", ")} · ${runtime} min`
    ),
    el("p", "rating", rating),
    el("p", "seasons", seasonsText),
    el("p", "summary", stripTags(show.summary || "No summary available.")),
    favBtn,
    el("h3", "", "Cast"),
    castList,
    link
  );
}

// Show favorites when the page loads
renderFavorites();

// Optional: click a favorite to open its details
document.addEventListener("click", (event) => {
  if (event.target.classList.contains("fav-show")) {
    showDetails(event.target.dataset.id);
  }
  if (event.target.classList.contains("remove-fav")) {
    removeFavorite(event.target.dataset.id);
  }
});