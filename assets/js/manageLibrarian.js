function goToAdd() {
  window.location.href = "signUp.html";
}

document.addEventListener("DOMContentLoaded", () => {
  loadLibrarians();
});

async function loadLibrarians() {
  const tbody = document.getElementById("librarianTableBody");
  const emptyState = document.getElementById("emptyLibState");
  if (!tbody) return;

  try {
    const res = await fetch("http://127.0.0.1:3000/api/admin/librarians", {
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to load librarians");
      return;
    }

    tbody.innerHTML = "";

    if (!data.length) {
      if (emptyState) emptyState.classList.remove("d-none");
      return;
    }
    if (emptyState) emptyState.classList.add("d-none");

    data.forEach(lib => {
      const tr = document.createElement("tr");

      const fullName = `${lib.LIB_FNAME || ""} ${lib.LIB_LNAME || ""}`.trim();

      tr.innerHTML = `
        <td>${lib.LIB_ID}</td>
        <td>${fullName.toUpperCase()}</td>
        <td>${lib.LIB_CONTACT || "-"}</td>
        <td>${lib.LIB_EMAIL || "-"}</td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    alert("Server error while loading librarians");
  }
}
