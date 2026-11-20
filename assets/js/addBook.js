// addBook.js (with full error checks)

// ========== GLOBAL VARIABLES ==========
let authorLookupTimeout = null;
const API_BASE = "http://127.0.0.1:3000";

// ========== VALIDATION HELPERS ==========
function setFieldError(inputEl, message, feedbackElId = null) {
  if (inputEl) inputEl.style.borderColor = "red";
  if (feedbackElId) {
    const fb = document.getElementById(feedbackElId);
    if (fb) {
      fb.textContent = message || "";
      fb.style.color = "red";
    }
  }
}

function setFieldOk(inputEl, message, feedbackElId = null) {
  if (inputEl) inputEl.style.borderColor = "green";
  if (feedbackElId) {
    const fb = document.getElementById(feedbackElId);
    if (fb) {
      fb.textContent = message || "";
      fb.style.color = "green";
    }
  }
}

function clearFieldState(inputEl, feedbackElId = null) {
  if (inputEl) inputEl.style.borderColor = "";
  if (feedbackElId) {
    const fb = document.getElementById(feedbackElId);
    if (fb) fb.textContent = "";
  }
}

function normalizeSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function isValidIsbnLoose(isbn) {
  // Accept ISBN-10/13 digits with optional hyphens/spaces
  // Not doing checksum here (simple and practical for client-side)
  const cleaned = isbn.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(cleaned) && !/^\d{13}$/.test(cleaned)) return false;
  return true;
}

function getErrorMessageFromFetch(res, data) {
  if (data && typeof data.message === "string" && data.message.trim()) return data.message;
  if (res.status === 400) return "Bad request. Please check your inputs.";
  if (res.status === 401) return "You are not logged in or session expired.";
  if (res.status === 403) return "You do not have permission to do this action.";
  if (res.status === 404) return "API not found (wrong URL).";
  if (res.status >= 500) return "Server error. Please try again.";
  return "Request failed.";
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}


// ========== ADD NEW BOOK ==========
async function addNewBook() {
  // Inputs
  const authorIdEl = document.querySelector('[name="author_id"]');
  const authorNameEl = document.querySelector('[name="author_name"]');
  const titleEl = document.querySelector('[name="title"]');
  const genreEl = document.querySelector('[name="genre"]');
  const descEl = document.querySelector('[name="desc"]');
  const publisherEl = document.querySelector('[name="publisher"]');
  const isbnEl = document.querySelector('[name="isbn"]');
  const pubDateEl = document.querySelector('[name="pub_date"]');
  const statusEl = document.querySelector('[name="status"]');
  const coverEl = document.querySelector('[name="cover"]');

  // Defensive: if HTML changed/missing field
  if (!authorIdEl || !authorNameEl || !titleEl || !genreEl || !publisherEl || !isbnEl || !statusEl || !coverEl) {
    alert("Form fields missing in HTML. Please reload the page.");
    return;
  }

  // Clear previous states
  clearFieldState(authorIdEl, "authorIdFeedback");
  clearFieldState(authorNameEl, "authorNameFeedback");
  [titleEl, genreEl, publisherEl, isbnEl].forEach(el => clearFieldState(el));

  // Values
  const authorId = normalizeSpaces(authorIdEl.value);
  const authorName = normalizeSpaces(authorNameEl.value);
  const title = normalizeSpaces(titleEl.value);
  const genre = normalizeSpaces(genreEl.value);
  const description = normalizeSpaces(descEl ? descEl.value : "");
  const publisher = normalizeSpaces(publisherEl.value);
  const isbn = normalizeSpaces(isbnEl.value);
  const publicationDate = pubDateEl ? pubDateEl.value : "";
  const bookStatus = statusEl.value;

  const coverFile = coverEl.files && coverEl.files[0] ? coverEl.files[0] : null;

  // Disable button to prevent double submit
  const addBtn = document.querySelector('button.btn.btn-primary');
  const oldBtnText = addBtn ? addBtn.textContent : "";
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.textContent = "Adding...";
  }

  try {
    // 1) Required field checks
    let hasError = false;

    if (!authorId) {
      setFieldError(authorIdEl, "Author ID is required.", "authorIdFeedback");
      hasError = true;
    }

    if (!authorName) {
      setFieldError(authorNameEl, "Author Name is required.", "authorNameFeedback");
      hasError = true;
    }

    if (!title) {
      setFieldError(titleEl, "Title is required.");
      hasError = true;
    }

    if (!genre) {
      setFieldError(genreEl, "Genre is required.");
      hasError = true;
    }

    if (!publisher) {
      setFieldError(publisherEl, "Publisher is required.");
      hasError = true;
    }

    if (!isbn) {
      setFieldError(isbnEl, "ISBN is required.");
      hasError = true;
    }

    if (hasError) {
      alert("Please fill in all required fields.");
      return;
    }

    // 2) Format checks
    // Author ID format: A + digits
    if (!/^A\d+$/.test(authorId)) {
      setFieldError(authorIdEl, "Format: A001, A123", "authorIdFeedback");
      alert("Invalid Author ID format. Use A + numbers (e.g., A001).");
      return;
    } else {
      setFieldOk(authorIdEl, "✓ Format OK", "authorIdFeedback");
    }

    // Author name minimal length
    if (authorName.length < 2) {
      setFieldError(authorNameEl, "Author name too short.", "authorNameFeedback");
      alert("Author Name must be at least 2 characters.");
      return;
    } else {
      setFieldOk(authorNameEl, "✓ OK", "authorNameFeedback");
    }

    // Title/Genre/Publisher minimal length
    if (title.length < 2) { setFieldError(titleEl, "Title too short."); alert("Title too short."); return; }
    if (genre.length < 2) { setFieldError(genreEl, "Genre too short."); alert("Genre too short."); return; }
    if (publisher.length < 2) { setFieldError(publisherEl, "Publisher too short."); alert("Publisher too short."); return; }

    // ISBN format check (loose)
    if (!isValidIsbnLoose(isbn)) {
      setFieldError(isbnEl, "ISBN must be 10 or 13 digits (hyphens allowed).");
      alert("Invalid ISBN. Use 10 or 13 digits (hyphens allowed).");
      return;
    }

    // Date check (optional)
    if (publicationDate) {
      const d = new Date(publicationDate);
      if (Number.isNaN(d.getTime())) {
        alert("Invalid publication date.");
        return;
      }
      // Optional: prevent future dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d > today) {
        const proceed = confirm("Publication date is in the future. Continue?");
        if (!proceed) return;
      }
    }

    // Book status check
    if (!["Available", "Unavailable"].includes(bookStatus)) {
      alert("Invalid Book Status selected.");
      return;
    }

    // 3) File checks (optional cover)
    if (coverFile) {
      const okTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!okTypes.includes(coverFile.type)) {
        alert("Cover must be an image (jpg/png/webp/gif).");
        return;
      }
      if (coverFile.size > 5 * 1024 * 1024) {
        alert("Cover image too large. Max 5MB.");
        return;
      }
      // Optional: filename length sanity
      if (coverFile.name && coverFile.name.length > 120) {
        alert("Cover filename too long. Please rename the file shorter.");
        return;
      }
    }

    // 5) Build FormData
    const formData = new FormData();
    formData.append("authorId", authorId);
    formData.append("authorName", authorName);
    formData.append("title", title);
    formData.append("genre", genre);
    formData.append("description", description);
    formData.append("publisher", publisher);
    formData.append("isbn", isbn);
    formData.append("publicationDate", publicationDate);
    formData.append("bookStatus", bookStatus);

    if (coverFile) formData.append("cover", coverFile);

    // 6) Send request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let response;
    try {
      response = await fetch(`${API_BASE}/api/admin/books/add`, {
        method: "POST",
        credentials: "include",
        body: formData,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await safeJson(response);

    if (!response.ok) {
      const msg = getErrorMessageFromFetch(response, data);

      // Handle common server messages
      if (msg.toLowerCase().includes("isbn")) setFieldError(isbnEl, msg);
      if (msg.toLowerCase().includes("author")) setFieldError(authorIdEl, msg, "authorIdFeedback");

      alert(msg);
      return;
    }

    // 7) Success
    alert("✅ " + (data.message || "Book added successfully"));

    window.location.href = "bookInventory.html";

  } catch (error) {
    console.error("Error adding book:", error);

    if (error.name === "AbortError") {
      alert("Request timed out. Please check your server and try again.");
    } else {
      alert("Server error. Please try again.");
    }
  } finally {
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = oldBtnText || "Add Book";
    }
  }
}

// ========== AUTHOR LOOKUP FUNCTIONS ==========
async function lookupAuthorById(authorId) {
  const authorIdEl = document.querySelector('[name="author_id"]');
  const authorNameEl = document.querySelector('[name="author_name"]');

  if (!authorId) {
    if (authorIdEl) clearFieldState(authorIdEl, "authorIdFeedback");
    return;
  }

  if (!/^A\d+$/.test(authorId)) {
    setFieldError(authorIdEl, "Format: A001, A123", "authorIdFeedback");
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response;
    try {
      response = await fetch(`${API_BASE}/api/public/author-lookup?id=${encodeURIComponent(authorId)}`, {
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await safeJson(response);

    if (!response.ok) {
      setFieldError(authorIdEl, "Lookup failed.", "authorIdFeedback");
      return;
    }

    if (data.exists && data.authorName) {
      if (authorNameEl) authorNameEl.value = data.authorName;
      setFieldOk(authorIdEl, `✓ Found: ${data.authorName}`, "authorIdFeedback");
    } else {
      if (authorNameEl) authorNameEl.value = "";
      setFieldOk(authorIdEl, "New author - enter name", "authorIdFeedback");
    }
  } catch (error) {
    console.error("Author lookup error:", error);
    const authorIdEl2 = document.querySelector('[name="author_id"]');
    setFieldError(authorIdEl2, "Lookup error. Check connection.", "authorIdFeedback");
  }
}

async function lookupAuthorByName(authorName) {
  const authorNameEl = document.querySelector('[name="author_name"]');

  if (!authorName || authorName.length < 2) {
    if (authorNameEl) clearFieldState(authorNameEl, "authorNameFeedback");
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response;
    try {
      response = await fetch(`${API_BASE}/api/public/author-lookup?name=${encodeURIComponent(authorName)}`, {
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await safeJson(response);

    if (!response.ok) {
      setFieldError(authorNameEl, "Lookup failed.", "authorNameFeedback");
      return;
    }

    const fb = document.getElementById("authorNameFeedback");

    if (data.exists && Array.isArray(data.authors) && data.authors.length === 1) {
      const authorIdEl = document.querySelector('[name="author_id"]');
      if (authorIdEl && data.authorId) authorIdEl.value = data.authorId;

      if (fb) {
        fb.textContent = `✓ ID: ${data.authorId}`;
        fb.style.color = "green";
      }
    } else if (data.exists && Array.isArray(data.authors) && data.authors.length > 1) {
      const ids = data.authors.map(a => a.AUTHOR_ID).join(", ");
      if (fb) {
        fb.textContent = `Multiple matches: ${ids}`;
        fb.style.color = "blue";
      }
    } else {
      if (fb) {
        fb.textContent = "New author - enter ID";
        fb.style.color = "green";
      }
    }
  } catch (error) {
    console.error("Author lookup error:", error);
    const fb = document.getElementById("authorNameFeedback");
    if (fb) {
      fb.textContent = "Lookup error. Check connection.";
      fb.style.color = "red";
    }
  }
}

// ========== SETUP EVENT LISTENERS ==========
document.addEventListener("DOMContentLoaded", function () {
  const authorIdInput = document.querySelector('[name="author_id"]');
  const authorNameInput = document.querySelector('[name="author_name"]');

  if (authorIdInput) {
    authorIdInput.addEventListener("input", function () {
      clearTimeout(authorLookupTimeout);
      authorLookupTimeout = setTimeout(() => {
        lookupAuthorById(normalizeSpaces(this.value));
      }, 500);
    });

    authorIdInput.addEventListener("blur", function () {
      const v = normalizeSpaces(this.value);
      if (v) lookupAuthorById(v);
    });
  }

  if (authorNameInput) {
    authorNameInput.addEventListener("input", function () {
      clearTimeout(authorLookupTimeout);
      authorLookupTimeout = setTimeout(() => {
        lookupAuthorByName(normalizeSpaces(this.value));
      }, 500);
    });
  }
});

// ========== RESET FORM ==========
function resetAddForm() {
  if (confirm("Are you sure you want to clear all fields?")) {
    const inputs = document.querySelectorAll("input, textarea, select");
    inputs.forEach((input) => {
      if (input.type === "file") input.value = null;
      else if (input.tagName === "SELECT") input.selectedIndex = 0;
      else input.value = "";
      input.style.borderColor = "";
    });

    ["authorIdFeedback", "authorNameFeedback"].forEach((id) => {
      const elem = document.getElementById(id);
      if (elem) elem.textContent = "";
    });
  }
}
