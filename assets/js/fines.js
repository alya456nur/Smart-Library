document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.getSessionUser();
  if (!user) return;

  const unpaidList = document.getElementById("unpaidList");
  const paidList = document.getElementById("paidList");
  const unpaidEmpty = document.getElementById("unpaidEmpty");
  const paidEmpty = document.getElementById("paidEmpty");

  const unpaidCountText = document.getElementById("unpaidCountText");
  const unpaidTotalText = document.getElementById("unpaidTotalText");
  const paidCountText = document.getElementById("paidCountText");
  const paidTotalText = document.getElementById("paidTotalText");

  const rm = (n) => `RM${Number(n || 0).toFixed(2)}`;
  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "numeric", year: "numeric" })
      : "-";

  const setText = (el, value) => {
    if (el) el.textContent = value;
  };

  // ✅ Map DB fine types -> UI label + tag style
  function getFineTypeUI(fineType) {
    const t = String(fineType || "").trim().toLowerCase();

    // Your DB values:
    // Book Damaged, Book Lost, Late Return
    if (t === "book damaged") return { label: "Damaged", tagClass: "tag-purple" };
    if (t === "book lost") return { label: "Lost", tagClass: "tag-dark" };
    if (t === "late return") return { label: "Overdue", tagClass: "tag-orange" };

    // fallback if unexpected value
    return { label: fineType || "Fine", tagClass: "tag-orange" };
  }

  // ===== Pay Modal elements (must exist in fines.html) =====
  const payModalEl = document.getElementById("payFineModal");
  const payFineIdText = document.getElementById("payFineIdText");
  const payFineAmountText = document.getElementById("payFineAmountText");
  const payMethodSelect = document.getElementById("payMethodSelect");
  const confirmPayBtn = document.getElementById("confirmPayBtn");

  const payModal = payModalEl ? new bootstrap.Modal(payModalEl) : null;

  let selectedFine = null;

  async function loadUnpaid() {
    try {
      const res = await fetch(`http://127.0.0.1:3000/api/fines/unpaid/${user.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load unpaid fines");

      const fines = await res.json();

      unpaidList.innerHTML = "";
      unpaidEmpty.style.display = fines.length ? "none" : "block";

      let total = 0;
      setText(unpaidCountText, `${fines.length} fine(s)`);

      fines.forEach((f) => {
        total += Number(f.AMOUNT || 0);

        const typeUI = getFineTypeUI(f.FINE_TYPE);

        const card = document.createElement("div");
        card.className = "fine-card";
        card.innerHTML = `
          <div class="fine-row">
            <div class="flex-grow-1">
              <div class="fine-tags">
                <span class="tag-pill ${typeUI.tagClass}">${typeUI.label}</span>
                <span class="tag-pill tag-red">Unpaid</span>
              </div>

              <div class="fine-meta">
                <div class="meta-block">
                  <div class="meta-label">Book</div>
                  <div class="meta-value">${f.TITLE || "-"}</div>
                </div>

                <div class="meta-block">
                  <div class="meta-label">Amount</div>
                  <div class="meta-value">${rm(f.AMOUNT)}</div>
                </div>

                <div class="meta-block">
                  <div class="meta-label">Issued Date</div>
                  <div class="meta-value">${formatDate(f.ISSUED_DATE)}</div>
                </div>
              </div>
            </div>
          </div>
        `;

        unpaidList.appendChild(card);
      });

      setText(unpaidTotalText, rm(total));
    } catch (err) {
      console.error("Unpaid fines load error:", err);
      unpaidList.innerHTML = "";
      unpaidEmpty.style.display = "block";
      setText(unpaidCountText, "0 fine(s)");
      setText(unpaidTotalText, rm(0));
    }
  }

  async function loadPaid() {
    try {
      const res = await fetch(`http://127.0.0.1:3000/api/fines/paid/${user.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load paid fines");

      const rows = await res.json();

      paidList.innerHTML = "";
      paidEmpty.style.display = rows.length ? "none" : "block";

      let total = 0;
      setText(paidCountText, `${rows.length} fine(s)`);

      rows.forEach((p) => {
        total += Number(p.AMOUNT || 0);

        const typeUI = getFineTypeUI(p.FINE_TYPE);

        const card = document.createElement("div");
        card.className = "fine-card";
        card.innerHTML = `
          <div class="fine-tags">
            <span class="tag-pill ${typeUI.tagClass}">${typeUI.label}</span>
            <span class="tag-pill tag-green">Paid</span>
          </div>

          <div class="fine-meta">
            <div class="meta-block">
              <div class="meta-label">Book</div>
              <div class="meta-value">${p.TITLE || "-"}</div>
            </div>

            <div class="meta-block">
              <div class="meta-label">Amount</div>
              <div class="meta-value">${rm(p.AMOUNT)}</div>
            </div>

            <div class="meta-block">
              <div class="meta-label">Paid Date</div>
              <div class="meta-value">${formatDate(p.PAYMENT_DATE)}</div>
            </div>

            <div class="meta-block">
              <div class="meta-label">Method</div>
              <div class="meta-value">${p.METHOD || "-"}</div>
            </div>
          </div>
        `;

        paidList.appendChild(card);
      });

      setText(paidTotalText, rm(total));
    } catch (err) {
      console.error("Paid fines load error:", err);
      paidList.innerHTML = "";
      paidEmpty.style.display = "block";
      setText(paidCountText, "0 fine(s)");
      setText(paidTotalText, rm(0));
    }
  }

  // Confirm Pay in modal
  if (confirmPayBtn) {
    confirmPayBtn.addEventListener("click", async () => {
      if (!selectedFine || !selectedFine.FINE_ID) {
        alert("No fine selected.");
        return;
      }

      const method = payMethodSelect ? payMethodSelect.value : "Cash";

      confirmPayBtn.disabled = true;
      confirmPayBtn.textContent = "Processing...";

      try {
        const res = await fetch("http://127.0.0.1:3000/api/fines/pay", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fineId: selectedFine.FINE_ID, payMethod: method }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Payment failed");

        if (payModal) payModal.hide();

        selectedFine = null;
        await loadUnpaid();
        await loadPaid();

        alert(`Payment successful! Receipt: ${data.receiptId || "-"}`);
      } catch (err) {
        console.error(err);
        alert(err.message || "Failed to pay fine");
      } finally {
        confirmPayBtn.disabled = false;
        confirmPayBtn.textContent = "Confirm Pay";
      }
    });
  }

  await loadUnpaid();
  await loadPaid();
});
