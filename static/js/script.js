/**
 * Kamakshi Catering — Main JavaScript
 */

document.addEventListener("DOMContentLoaded", () => {

  /* ── Navbar scroll effect ── */
  const navbar      = document.getElementById("navbar");
  const scrollTopBtn= document.getElementById("scrollTop");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 60) {
      navbar.classList.add("scrolled");
      scrollTopBtn.classList.add("visible");
    } else {
      navbar.classList.remove("scrolled");
      scrollTopBtn.classList.remove("visible");
    }
  });

  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ── Mobile hamburger (animated X + slide-down) ── */
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("navLinks");

  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = navLinks.classList.toggle("open");
    hamburger.classList.toggle("open", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen);
  });

  /* Close on nav link click */
  navLinks.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

  /* Close on outside click */
  document.addEventListener("click", (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove("open");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });

  /* Close on Escape */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      navLinks.classList.remove("open");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });

  /* ── Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ── Intersection Observer — reveal on scroll ── */
  const revealEls = document.querySelectorAll(
    ".about-card, .service-card, .menu-card, .gal-card, .info-card, .review-form-wrap"
  );
  revealEls.forEach(el => el.classList.add("reveal"));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add("visible"), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => observer.observe(el));

  /* ── Star Rating ── */
  const starSelector = document.getElementById("starSelector");
  const ratingInput  = document.getElementById("ratingInput");
  const stars        = starSelector ? starSelector.querySelectorAll("span") : [];
  let selectedRating = 0;

  stars.forEach(star => {
    star.addEventListener("mouseover", () => {
      const val = parseInt(star.dataset.v);
      stars.forEach(s => {
        s.classList.toggle("hover", parseInt(s.dataset.v) <= val);
        s.classList.remove("active");
      });
    });
    star.addEventListener("mouseout", () => {
      stars.forEach(s => {
        s.classList.remove("hover");
        s.classList.toggle("active", parseInt(s.dataset.v) <= selectedRating);
      });
    });
    star.addEventListener("click", () => {
      selectedRating    = parseInt(star.dataset.v);
      ratingInput.value = selectedRating;
      stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= selectedRating));
    });
  });

  /* ── Photo preview ── */
  const reviewPhotoInput = document.getElementById("reviewPhoto");
  const photoPreview     = document.getElementById("photoPreview");
  const photoLabelText   = document.getElementById("photoLabelText");

  if (reviewPhotoInput) {
    reviewPhotoInput.addEventListener("change", () => {
      const file = reviewPhotoInput.files[0];
      if (!file) {
        photoPreview.classList.add("hidden");
        photoLabelText.textContent = "Click to upload a photo from your event";
        return;
      }
      photoLabelText.textContent = file.name;
      const reader = new FileReader();
      reader.onload = e => {
        photoPreview.src = e.target.result;
        photoPreview.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── Fetch and Render Reviews ── */
  const reviewsGrid = document.getElementById("reviewsGrid");

  async function loadReviews() {
    try {
      const res  = await fetch("/reviews");
      const data = await res.json();
      renderReviews(data.reviews || []);
    } catch (err) {
      reviewsGrid.innerHTML = '<p class="reviews-loading">Could not load reviews.</p>';
    }
  }

  function renderReviews(reviews) {
    if (!reviews.length) {
      reviewsGrid.innerHTML = '<p class="reviews-loading">No reviews yet. Be the first to share your experience!</p>';
      return;
    }
    const initial = reviews.slice(0, 3);
    const rest    = reviews.slice(3);
    reviewsGrid.innerHTML = initial.map(r => buildCardHTML(r)).join("");
    if (rest.length > 0) {
      const hiddenDiv = document.createElement("div");
      hiddenDiv.id = "hiddenReviews";
      hiddenDiv.style.display = "none";
      hiddenDiv.innerHTML = rest.map(r => buildCardHTML(r)).join("");
      reviewsGrid.appendChild(hiddenDiv);
      const btn = document.createElement("div");
      btn.className = "view-all-wrap";
      btn.innerHTML = `<button class="view-all-btn" onclick="
        document.getElementById('hiddenReviews').style.display='contents';
        this.parentElement.style.display='none';
      ">View All Reviews (${rest.length} more)</button>`;
      reviewsGrid.appendChild(btn);
    }
  }

  function buildCardHTML(r) {
    const photoHtml = r.photo_url
      ? `<div class="rv-photo"><img src="${r.photo_url}" alt="${escHtml(r.customer_name)}'s photo" loading="lazy"/></div>`
      : "";
    return `
      <div class="review-card">
        <div class="rv-header">
          <div>
            <div class="rv-name">${escHtml(r.customer_name)}</div>
            <div class="rv-date">${escHtml(r.created_at)}</div>
          </div>
          <div class="rv-avatar">${r.customer_name.charAt(0).toUpperCase()}</div>
        </div>
        <div class="rv-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
        <div class="rv-msg">${escHtml(r.review_message)}</div>
        ${photoHtml}
      </div>`;
  }

  function prependReview(r) {
    const div  = document.createElement("div");
    div.innerHTML = buildCardHTML(r);
    const card = div.firstElementChild;
    const emptyMsg = reviewsGrid.querySelector(".reviews-loading");
    if (emptyMsg) reviewsGrid.innerHTML = "";
    reviewsGrid.insertBefore(card, reviewsGrid.firstChild);
  }

  loadReviews();

  /* ── Submit Review ── */
  const submitReviewBtn = document.getElementById("submitReview");
  const reviewSuccess   = document.getElementById("reviewSuccess");
  const reviewError     = document.getElementById("reviewError");

  if (submitReviewBtn) {
    submitReviewBtn.addEventListener("click", async () => {
      const name    = document.getElementById("reviewName").value.trim();
      const rating  = parseInt(ratingInput.value);
      const message = document.getElementById("reviewMsg").value.trim();
      const photo   = reviewPhotoInput ? reviewPhotoInput.files[0] : null;

      reviewSuccess.classList.add("hidden");
      reviewError.classList.add("hidden");

      if (!name)    { showError(reviewError, "Please enter your name."); return; }
      if (!rating)  { showError(reviewError, "Please select a star rating."); return; }
      if (!message) { showError(reviewError, "Please write your review message."); return; }

      submitReviewBtn.disabled = true;
      submitReviewBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      const fd = new FormData();
      fd.append("customer_name",  name);
      fd.append("rating",         rating);
      fd.append("review_message", message);
      if (photo) fd.append("photo", photo);

      try {
        const res  = await fetch("/add-review", { method: "POST", body: fd });
        const data = await res.json();
        if (data.success) {
          reviewSuccess.classList.remove("hidden");
          document.getElementById("reviewName").value = "";
          document.getElementById("reviewMsg").value  = "";
          if (reviewPhotoInput) reviewPhotoInput.value = "";
          if (photoPreview)     photoPreview.classList.add("hidden");
          if (photoLabelText)   photoLabelText.textContent = "Click to upload a photo from your event";
          selectedRating    = 0;
          ratingInput.value = 0;
          stars.forEach(s => s.classList.remove("active", "hover"));
          prependReview(data.review);
        } else {
          showError(reviewError, data.error || "Submission failed. Please try again.");
        }
      } catch (err) {
        showError(reviewError, "Network error. Please try again.");
      } finally {
        submitReviewBtn.disabled = false;
        submitReviewBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Review';
      }
    });
  }

  /* ── Fixed height for textareas ── */
  const bMsg  = document.getElementById("bMsg");
  const bMenu = document.getElementById("bMenu");
  if (bMsg)  { bMsg.style.height  = "90px"; bMsg.style.resize  = "none"; bMsg.style.overflow  = "auto"; }
  if (bMenu) { bMenu.style.height = "90px"; bMenu.style.resize = "none"; bMenu.style.overflow = "auto"; }

  /* ══════════════════════════════════════════════════════════════
     PHONE NUMBER VALIDATION
  ══════════════════════════════════════════════════════════════ */
  const bPhoneInput = document.getElementById("bPhone");

  if (bPhoneInput) {

    /* Strip non-digits and cap at 10 characters while typing */
    bPhoneInput.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "").slice(0, 10);
      /* Live counter hint */
      const hint = document.getElementById("phoneHint");
      if (hint && this.value.length > 0) {
        const remaining = 10 - this.value.length;
        if (remaining > 0) {
          hint.textContent = remaining + " more digit" + (remaining === 1 ? "" : "s") + " needed";
          hint.style.color = "#e65100";
          this.style.borderColor = "";
        } else {
          /* 10 digits entered — validate prefix */
          if (/^[6-9]\d{9}$/.test(this.value)) {
            hint.textContent = "✓ Valid mobile number";
            hint.style.color = "#2e7d32";
            this.style.borderColor = "#a5d6a7";
          } else {
            hint.textContent = "⚠ Must start with 6, 7, 8, or 9";
            hint.style.color = "#c62828";
            this.style.borderColor = "#ef9a9a";
          }
        }
      } else if (hint) {
        hint.textContent = "";
        this.style.borderColor = "";
      }
    });

    /* Full validation on blur */
    bPhoneInput.addEventListener("blur", function () {
      const val = this.value.trim();
      let hint = document.getElementById("phoneHint");

      /* Create hint element if it doesn't exist yet */
      if (!hint) {
        hint = document.createElement("p");
        hint.id = "phoneHint";
        hint.style.cssText = "font-size:0.8rem; margin-top:5px; font-weight:600; transition: color 0.2s;";
        this.parentNode.appendChild(hint);
      }

      if (!val) {
        hint.textContent = "";
        this.style.borderColor = "";
      } else if (!/^[6-9]\d{9}$/.test(val)) {
        hint.textContent = "⚠ Enter a valid 10-digit Indian mobile number starting with 6–9";
        hint.style.color = "#c62828";
        this.style.borderColor = "#ef9a9a";
      } else {
        hint.textContent = "✓ Valid mobile number";
        hint.style.color = "#2e7d32";
        this.style.borderColor = "#a5d6a7";
      }
    });

    /* Clear styling on focus, create hint if needed */
    bPhoneInput.addEventListener("focus", function () {
      this.style.borderColor = "";
      let hint = document.getElementById("phoneHint");
      if (!hint) {
        hint = document.createElement("p");
        hint.id = "phoneHint";
        hint.style.cssText = "font-size:0.8rem; margin-top:5px; font-weight:600; transition: color 0.2s;";
        this.parentNode.appendChild(hint);
      }
      /* Reset hint text on focus so user can re-type cleanly */
      if (this.value.length === 0) hint.textContent = "";
    });
  }

  /* ── Submit Booking ── */
  const submitBookingBtn = document.getElementById("submitBooking");
  const bookingSuccess   = document.getElementById("bookingSuccess");
  const bookingError     = document.getElementById("bookingError");

  if (submitBookingBtn) {
    submitBookingBtn.addEventListener("click", async () => {
      const full_name  = document.getElementById("bName").value.trim();
      const phone      = document.getElementById("bPhone").value.trim();
      const event_type = document.getElementById("bEvent").value;
      const event_date = document.getElementById("bDate").value;
      const guests     = document.getElementById("bGuests").value;
      const address    = document.getElementById("bAddress") ? document.getElementById("bAddress").value.trim() : "";
      const menu       = document.getElementById("bMenu").value.trim();
      const message    = document.getElementById("bMsg").value.trim();

      bookingSuccess.classList.add("hidden");
      bookingError.classList.add("hidden");

      /* ── Field-by-field validation ── */
      if (!full_name) {
        showError(bookingError, "Please enter your full name.");
        bookingError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!phone) {
        showError(bookingError, "Please enter your phone number.");
        bookingError.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("bPhone").focus();
        return;
      }

      /* Indian mobile number: 10 digits, starts with 6–9 */
      if (!/^[6-9]\d{9}$/.test(phone)) {
        showError(bookingError, "Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).");
        bookingError.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("bPhone").focus();
        /* Also highlight the field */
        document.getElementById("bPhone").style.borderColor = "#ef9a9a";
        return;
      }

      if (!event_type) {
        showError(bookingError, "Please select an event type.");
        bookingError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!event_date) {
        showError(bookingError, "Please select an event date.");
        bookingError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!guests || parseInt(guests) < 40) {
        showError(bookingError, "Minimum 40 guests required for booking.");
        bookingError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!address) {
        showError(bookingError, "Please enter the event address.");
        bookingError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!menu) {
        showError(bookingError, "Please enter the menu.");
        bookingError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      /* ── All valid — submit ── */
      submitBookingBtn.disabled = true;
      submitBookingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      try {
        const res  = await fetch("/book-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name, phone, event_type, event_date,
            guests: parseInt(guests) || 0,
            address, menu, message
          }),
        });
        const data = await res.json();

        if (data.success) {
          bookingSuccess.classList.remove("hidden");

          /* Reset all fields */
          document.getElementById("bName").value   = "";
          document.getElementById("bPhone").value  = "";
          document.getElementById("bEvent").value  = "";
          document.getElementById("bDate").value   = "";
          document.getElementById("bGuests").value = "";
          if (document.getElementById("bAddress")) document.getElementById("bAddress").value = "";
          document.getElementById("bMenu").value   = "";
          document.getElementById("bMsg").value    = "";

          /* Clear phone hint and border after successful submit */
          const phoneHint = document.getElementById("phoneHint");
          if (phoneHint) phoneHint.textContent = "";
          if (bPhoneInput) bPhoneInput.style.borderColor = "";

          /* Build and send WhatsApp message */
          const waMsg =
            ` *New Booking — Kamakshi Catering*\n\n` +
            ` Name        : ${full_name}\n` +
            ` Phone       : ${phone}\n` +
            ` Event       : ${event_type}\n` +
            ` Date        : ${event_date}\n` +
            ` Guests      : ${guests || 0}\n` +
            ` Address     : ${address || '—'}\n` +
            ` Menu        : ${menu || '—'}\n` +
            ` Instructions: ${message || '—'}\n\n` +
            `_Please confirm this booking. Thank you!_`;

          setTimeout(() => {
            window.open(`https://wa.me/919866197455?text=${encodeURIComponent(waMsg)}`, "_blank");
          }, 800);

        } else {
          showError(bookingError, data.error || "Booking failed. Please try again.");
        }

      } catch (err) {
        showError(bookingError, "Network error. Please try again.");
      } finally {
        submitBookingBtn.disabled = false;
        submitBookingBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirm Booking Order';
      }
    });
  }

  /* ── Utility ── */
  function showError(el, msg) { el.textContent = msg; el.classList.remove("hidden"); }
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

});

/* ── Menu live counter ── */
document.addEventListener("change", function(e) {
  if (e.target.classList.contains("menu-item-cb")) {
    const count = document.querySelectorAll(".menu-item-cb:checked").length;
    const el    = document.getElementById("menuSelectedCount");
    if (el) el.textContent = count;
  }
});

function addSelectedToMenu() {
  const checked = document.querySelectorAll(".menu-item-cb:checked");
  if (!checked.length) {
    const menuNote = document.querySelector(".menu-select-note");
    if (menuNote) {
      menuNote.scrollIntoView({ behavior: "smooth", block: "center" });
      menuNote.classList.add("menu-note-highlight");
      setTimeout(() => menuNote.classList.remove("menu-note-highlight"), 2500);
    }
    return;
  }
  const items = Array.from(checked).map(cb => cb.value);
  const bMenu = document.getElementById("bMenu");
  if (bMenu) {
    const existing = bMenu.value.trim();
    bMenu.value = existing ? existing + ", " + items.join(", ") : items.join(", ");
  }
  const successEl = document.getElementById("menuAddSuccess");
  if (successEl) {
    successEl.classList.remove("hidden");
    setTimeout(() => successEl.classList.add("hidden"), 4000);
  }
  const bookingSection = document.getElementById("contact");
  if (bookingSection) {
    setTimeout(() => bookingSection.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   GALLERY — fetch, skeleton loading, uniform card grid, and lightbox
   (moved here from the inline script that used to live in index.html)
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return; // gallery section isn't on this page

  const GALLERY_PAGE_SIZE = 12; // single source of truth for batch size — never hardcode 12 elsewhere

  let galleryItems  = [];  // cached from the single /gallery fetch — the lightbox reuses this, no extra requests
  let renderedCount = 0;   // how many of galleryItems are currently in the DOM
  let currentIndex  = 0;

  const overlay     = document.getElementById("lightboxOverlay");
  const box         = document.getElementById("lightboxBox");
  const imgEl       = document.getElementById("lightboxImg");
  const captionEl   = document.getElementById("lightboxCaption");
  const counterEl   = document.getElementById("lightboxCounter");
  const closeBtn    = document.getElementById("lightboxClose");
  const prevBtn     = document.getElementById("lightboxPrev");
  const nextBtn     = document.getElementById("lightboxNext");
  const loadMoreBtn = document.getElementById("galleryLoadMoreBtn");
  let lastFocusedEl = null;

  /* ── Skeleton placeholders shown while /gallery loads (and on Retry) ── */
  function renderSkeletons(count) {
    grid.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const sk = document.createElement("div");
      sk.className = "gal-skeleton";
      sk.setAttribute("aria-hidden", "true");
      grid.appendChild(sk);
    }
  }

  /* ── Build a single gallery card for the given TRUE index into galleryItems ── */
  function buildGalleryCard(item, index) {
    const card = document.createElement("div");
    card.className = "gal-card";
    card.dataset.index = index;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Open " + (item.caption || "gallery photo") + " in full view");

    const inner = document.createElement("div");
    inner.className = "gal-inner";

    const img = document.createElement("img");
    img.className = "gal-img-loading"; // starts invisible; fades in once actually loaded (see below)
    img.src = item.photo_url;   // same original file used everywhere — the thumbnail crop is CSS-only
    img.alt = item.caption || "Gallery photo";
    img.loading = "lazy";
    img.decoding = "async";

    const revealImg = () => img.classList.add("gal-img-loaded");
    if (img.complete) {
      revealImg(); // already in the browser cache — no "load" event will fire, so reveal immediately
    } else {
      img.addEventListener("load", revealImg, { once: true });
    }

    inner.appendChild(img);

    if (item.caption) {
      const label = document.createElement("span");
      label.className = "gal-label";
      label.textContent = item.caption;
      inner.appendChild(label);
    }

    card.appendChild(inner);
    return card;
  }

  /* ── Append the next GALLERY_PAGE_SIZE cards from the already-cached galleryItems
     (no new /gallery request — reuses the array fetched once by loadGallery) ── */
  function appendGalleryBatch() {
    const nextItems = galleryItems.slice(renderedCount, renderedCount + GALLERY_PAGE_SIZE);
    if (!nextItems.length) return null;

    let firstNewCard = null;
    nextItems.forEach((item, i) => {
      const trueIndex = renderedCount + i; // preserves lightbox indexing across batches
      const card = buildGalleryCard(item, trueIndex);
      grid.appendChild(card);
      if (i === 0) firstNewCard = card;
    });

    renderedCount += nextItems.length;
    updateLoadMoreButton();
    return firstNewCard;
  }

  /* ── Build the first batch from the cached data (called after a fresh fetch/Retry) ── */
  function renderGallery(items) {
    grid.innerHTML = "";
    renderedCount = 0;

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "gal-empty";
      empty.textContent = "No gallery photos yet.";
      grid.appendChild(empty);
      if (loadMoreBtn) loadMoreBtn.classList.add("hidden");
      return;
    }

    appendGalleryBatch();
  }

  /* ── Load More button: label + visibility driven entirely by renderedCount ── */
  function updateLoadMoreButton() {
    if (!loadMoreBtn) return;

    const total = galleryItems.length;
    if (total <= GALLERY_PAGE_SIZE || renderedCount >= total) {
      loadMoreBtn.classList.add("hidden");
      return;
    }

    loadMoreBtn.classList.remove("hidden");
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Load More (" + renderedCount + " of " + total + " shown)";
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      loadMoreBtn.disabled = true; // disabled while the batch is appended
      const firstNewCard = appendGalleryBatch();
      if (firstNewCard) {
        // Smoothly bring the first newly appended image into view instead of a hard jump
        firstNewCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  /* ── Friendly error state with a Retry button ── */
  function renderError() {
    grid.innerHTML = "";
    if (loadMoreBtn) loadMoreBtn.classList.add("hidden");

    const wrap = document.createElement("div");
    wrap.className = "gal-error";

    const icon = document.createElement("i");
    icon.className = "fas fa-exclamation-circle";
    wrap.appendChild(icon);
    wrap.appendChild(document.createTextNode("Could not load the gallery right now."));
    wrap.appendChild(document.createElement("br"));

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "gal-retry-btn";
    retryBtn.innerHTML = '<i class="fas fa-redo"></i> Retry';
    retryBtn.addEventListener("click", loadGallery);
    wrap.appendChild(retryBtn);

    grid.appendChild(wrap);
  }

  /* ── Fetch the gallery once; cached data is reused by the lightbox afterwards ── */
  function loadGallery() {
    renderSkeletons(8);
    if (loadMoreBtn) loadMoreBtn.classList.add("hidden");
    fetch("/gallery")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !data.gallery) {
          renderError();
          return;
        }
        galleryItems = data.gallery;
        renderGallery(galleryItems);
      })
      .catch(() => {
        renderError();
      });
  }

  /* ── Lightbox: open / close ── */
  function openLightbox(index) {
    if (!overlay || !galleryItems.length) return;
    currentIndex = index;
    updateLightboxContent();

    lastFocusedEl = document.activeElement;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // prevent background scrolling while open
    if (closeBtn) closeBtn.focus();

    document.addEventListener("keydown", handleLightboxKeydown);
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleLightboxKeydown);

    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus(); // restore focus to whatever opened the lightbox
    }
    lastFocusedEl = null;
  }

  function updateLightboxContent() {
    const item = galleryItems[currentIndex];
    if (!item || !imgEl) return;
    imgEl.src = item.photo_url;  // the ORIGINAL image — not the cropped thumbnail
    imgEl.alt = item.caption || "Gallery photo";
    if (captionEl) captionEl.textContent = item.caption || "";
    if (counterEl) counterEl.textContent = (currentIndex + 1) + " / " + galleryItems.length;
  }

  function showPrev() {
    if (!galleryItems.length) return;
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    updateLightboxContent();
  }

  function showNext() {
    if (!galleryItems.length) return;
    currentIndex = (currentIndex + 1) % galleryItems.length;
    updateLightboxContent();
  }

  function handleLightboxKeydown(e) {
    if (e.key === "Escape")          closeLightbox();
    else if (e.key === "ArrowLeft")  showPrev();
    else if (e.key === "ArrowRight") showNext();
  }

  /* Open the lightbox on click or keyboard activation (Enter / Space) of a card */
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".gal-card");
    if (card) openLightbox(parseInt(card.dataset.index, 10));
  });
  grid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".gal-card");
    if (!card) return;
    e.preventDefault();
    openLightbox(parseInt(card.dataset.index, 10));
  });

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (prevBtn)  prevBtn.addEventListener("click", showPrev);
  if (nextBtn)  nextBtn.addEventListener("click", showNext);

  /* Clicking the dark overlay itself (not the image/box) closes the lightbox */
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeLightbox();
    });
  }

  /* ── Touch swipe navigation (mobile) ── */
  let touchStartX = 0;
  if (box) {
    box.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    box.addEventListener("touchend", (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) < 40) return; // ignore small taps/scrolls
      if (deltaX > 0) showPrev(); else showNext();
    }, { passive: true });
  }

  loadGallery();
})();