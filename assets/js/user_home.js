/*============================================================
  SMART LIBRARY | user-home.js
==============================================================*/

const API_BASE = "http://127.0.0.1:3000";

let user = null;                 // current logged-in user (from session)
let favouriteBookIds = [];       // array of BOOK_IDs the user liked

// ✅ genres that are listed in dropdown (except All Genres + Others)
const KNOWN_GENRES = new Set([
  "Fiction",
  "Non-Fiction",
  "Science",
  "Fantasy",
  "Mystery",
  "Biography",
  "Science Fiction",
  "Finance"
]);

/*============================================================
  1) ON-PAGE SEARCH + GENRE FILTER (works on rendered cards)
==============================================================*/
document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.getSessionUser();
  if (!user) return;

  const userId = user.id;
  const searchInput = document.querySelector("#searchInput");
  const genreFilter = document.querySelector("#genreFilter");

  // If this page doesn't have these elements, just skip
  if (!searchInput || !genreFilter) return;

  // Filter function uses the current DOM content (book cards)
  const filterBooks = () => {
    const query = searchInput.value.toLowerCase().trim();
    const selected = (genreFilter.value || "").trim();

    const cards = document.querySelectorAll(".book-card");

    cards.forEach((card) => {
      const titleEl = card.querySelector(".book-header h5");
      const authorEl = card.querySelector(".book-author");
      const genreEl = card.querySelector(".small div:first-child");

      // Safe reads
      const title = (titleEl?.textContent || "").toLowerCase();
      const author = (authorEl?.textContent || "").toLowerCase();

      // Extract genre text from "<div><b>Genre:</b> X</div>"
      let cardGenre = (genreEl?.textContent || "")
        .replace("Genre:", "")
        .trim();

      // ✅ normalize genre (optional but helps)
      // Example: if db has extra spaces
      cardGenre = cardGenre.replace(/\s+/g, " ").trim();

      const matchesQuery = title.includes(query) || author.includes(query);

      // ✅ GENRE MATCH RULES
      let matchesGenre = true;

      if (selected === "All Genres" || selected === "") {
        matchesGenre = true;
      } else if (selected === "Others") {
        // ✅ "Others" = NOT in known genres
        // if genre is "-" or empty, treat as Others too (you can change this)
        if (!cardGenre || cardGenre === "-" ) {
          matchesGenre = true;
        } else {
          matchesGenre = !KNOWN_GENRES.has(cardGenre);
        }
      } else {
        // normal exact match
        matchesGenre = cardGenre === selected;
      }

      card.style.display = matchesQuery && matchesGenre ? "" : "none";
    });
  };

  // Trigger filter when typing or changing genre
  searchInput.addEventListener("input", filterBooks);
  genreFilter.addEventListener("change", filterBooks);

  // ✅ If user changes filter BEFORE books finish rendering, it may not apply.
  // So we also re-apply once after rendering (see renderBooks()).
  window.__applyBookFilter = filterBooks;
});

/*============================================================
  2) PAGE INIT: load session user + favourites, then books
==============================================================*/
document.addEventListener("DOMContentLoaded", async () => {
  user = await window.getSessionUser();
  if (user) {
    await loadFavourites();
  }

  // Load books after we know favourites, so hearts show correctly
  get_Books();
});

/*============================================================
  FIXED: getSessionUser with credentials
==============================================================*/
async function getSessionUserWithCredentials() {
  try {
    const response = await fetch(`${API_BASE}/check-session`, {
      credentials: 'include'
    });

    if (!response.ok) {
      console.error("Session check failed");
      return null;
    }

    const data = await response.json();

    if (data.loggedIn && data.user) {
      console.log("✅ Session valid, user:", data.user);
      return data.user;
    } else {
      console.log("❌ No active session");
      return null;
    }
  } catch (error) {
    console.error("Session check error:", error);
    return null;
  }
}

/*============================================================
  3) Helper: Format date to "DD MONTH YYYY"
  Example: 2024-01-30 → 30 January 2024
==============================================================*/
function formatDateDDMonthYYYY(dateValue) {
  if (!dateValue) return "-";

  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "-";

  const day = String(d.getDate()).padStart(2, "0");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

/*============================================================
  4) LOAD USER FAVOURITES (book IDs only)
==============================================================*/
async function loadFavourites() {
  try {
    const res = await fetch(`${API_BASE}/api/favourite/${user.id}`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to load favourites");

    favouriteBookIds = await res.json(); // e.g. ["B001","B010",...]
  } catch (err) {
    console.error("loadFavourites error:", err);
    favouriteBookIds = [];
  }
}

/*============================================================
  5) LIKE BUTTON TOGGLE (event delegation)
==============================================================*/
document.body.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-like");
  if (!btn || !user) return;

  const icon = btn.querySelector("i");
  const bookId = btn.dataset.bookId;

  const isFav = icon?.classList.contains("bi-heart-fill");

  const url = isFav
    ? `${API_BASE}/api/favourite/remove`
    : `${API_BASE}/api/favourite/add`;

  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, bookId }),
    });

    if (!res.ok) {
      alert("Favourite action failed");
      return;
    }

    icon.classList.toggle("bi-heart");
    icon.classList.toggle("bi-heart-fill");

    if (isFav) {
      favouriteBookIds = favouriteBookIds.filter((id) => id !== bookId);
    } else {
      favouriteBookIds.push(bookId);
    }
  } catch (err) {
    console.error("Favourite toggle error:", err);
    alert("Favourite action failed");
  }
});

/*============================================================
  6) LOAD BOOKS FROM DATABASE
==============================================================*/
function get_Books() {
  fetch(`${API_BASE}/api/books`, { credentials: "include" })
    .then((res) => res.json())
    .then(renderBooks)
    .catch((err) => console.error("get_Books error:", err));
}

/*============================================================
  7) RENDER BOOKS
==============================================================*/
function renderBooks(books) {
  const list = document.getElementById("bookList");
  if (!list) return;

  list.innerHTML = "";

  books.forEach((book) => {
    const available = book.BOOK_STATUS === "Available";
    const isFavourite = favouriteBookIds.includes(book.BOOK_ID);

    const published = formatDateDDMonthYYYY(book.PUBLICATION_DATE);

    list.innerHTML += `
      <article class="book-card">
        <div class="book-cover">
          <img src="../assets/images/${book.BOOK_IMAGE}" class="book-image" alt="cover">
        </div>

        <div class="book-info">
          <div class="book-header">
            <h5>${book.TITLE}</h5>
            <button class="btn btn-like" data-book-id="${book.BOOK_ID}" type="button">
              <i class="bi ${isFavourite ? "bi-heart-fill" : "bi-heart"}"></i>
            </button>
          </div>

          <div class="book-author">${book.AUTHOR_NAME || "-"}</div>

          <div class="small text-muted mb-2">
            <div><b>Genre:</b> ${book.GENRE || "-"}</div>
            <div><b>Publisher:</b> ${book.PUBLISHER || "-"}</div>
            <div><b>ISBN:</b> ${book.ISBN || "-"}</div>
            <div><b>Published:</b> ${published}</div>
          </div>

          <p class="book-description">${book.DESCRIPTION || ""}</p>
        </div>

        <div class="book-actions">
          <div class="book-status ${available ? "available" : "unavailable"}">
            ${book.BOOK_STATUS}
          </div>

          <button class="btn btn-sm book-borrow-btn ${
            available ? "btn-primary" : "btn-secondary"
          }"
            ${available ? "" : "disabled"}
            data-id="${book.BOOK_ID}"
            data-title="${book.TITLE}"
            data-author="${book.AUTHOR_NAME || ""}"
            data-genre="${book.GENRE || ""}"
            data-publisher="${book.PUBLISHER || ""}"
            data-isbn="${book.ISBN || ""}"
            data-cover="${book.BOOK_IMAGE || ""}"
            data-description="${book.DESCRIPTION || ""}"
            type="button"
          >
            Borrow
          </button>
        </div>
      </article>
    `;
  });

  // ✅ apply current filters after rendering
  if (typeof window.__applyBookFilter === "function") {
    window.__applyBookFilter();
  }
}
