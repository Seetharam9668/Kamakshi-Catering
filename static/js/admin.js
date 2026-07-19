/* ═══════════════════════════════════════════════════════════════════════════
   admin.js — Kamakshi Catering Admin Panel
   Handles: bookings, reviews, gallery, and menu management (v4)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Custom Confirm Modal ── */
(function() {
  var overlay, modal;
  var _resolve;
  var _lastFocusedEl = null;

  function buildModal() {
    if (document.getElementById('kcModalOverlay')) return;
    overlay = document.createElement('div');
    overlay.className = 'kc-modal-overlay';
    overlay.id = 'kcModalOverlay';
    overlay.innerHTML =
      '<div class="kc-modal" id="kcModal" role="alertdialog" aria-modal="true" ' +
           'aria-labelledby="kcModalTitle" aria-describedby="kcModalMsg" tabindex="-1">' +
        '<div class="kc-modal-icon" id="kcModalIcon"></div>' +
        '<div class="kc-modal-title" id="kcModalTitle"></div>' +
        '<div class="kc-modal-msg" id="kcModalMsg"></div>' +
        '<div class="kc-modal-actions">' +
          '<button class="kc-btn-cancel" id="kcBtnCancel">Cancel</button>' +
          '<button class="kc-btn-confirm" id="kcBtnConfirm"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById('kcBtnCancel').addEventListener('click', function() { closeModal(false); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(false); });

    document.addEventListener('keydown', function(e) {
      var o = document.getElementById('kcModalOverlay');
      if (!o || !o.classList.contains('open')) return;
      if (e.key === 'Escape') { closeModal(false); return; }
      if (e.key === 'Tab') trapFocus(e);
    });
  }

  /* Keep Tab / Shift+Tab cycling within the modal while it's open. */
  function trapFocus(e) {
    var modalEl = document.getElementById('kcModal');
    if (!modalEl) return;
    var focusable = modalEl.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function closeModal(result) {
    var o = document.getElementById('kcModalOverlay');
    if (o) o.classList.remove('open');
    document.body.classList.remove('kc-modal-open');

    // Restore focus to whatever had it before the modal opened.
    if (_lastFocusedEl && typeof _lastFocusedEl.focus === 'function') {
      _lastFocusedEl.focus();
    }
    _lastFocusedEl = null;

    if (_resolve) { _resolve(result); _resolve = null; }
  }

  /* kcConfirm(opts) → Promise<bool>
   * opts: { title, message, confirmText, cancelText, icon (fa class),
   *         type: 'danger'|'warning', focusCancel (bool) }
   */
  window.kcConfirm = function(opts) {
    buildModal();
    var o = document.getElementById('kcModalOverlay');
    document.getElementById('kcModalTitle').textContent = opts.title || 'Are you sure?';
    document.getElementById('kcModalMsg').textContent   = opts.message || '';
    var iconEl = document.getElementById('kcModalIcon');
    iconEl.className = 'kc-modal-icon ' + (opts.type || 'danger');
    iconEl.innerHTML = '<i class="fas ' + (opts.icon || 'fa-exclamation-triangle') + '"></i>';

    var cancelBtn = document.getElementById('kcBtnCancel');
    cancelBtn.textContent = opts.cancelText || 'Cancel';

    var confirmBtn = document.getElementById('kcBtnConfirm');
    confirmBtn.className = 'kc-btn-confirm ' + (opts.type || 'danger');
    confirmBtn.disabled = false;
    var confirmIconClass = opts.icon || 'fa-exclamation-triangle';
    var confirmLabel = opts.confirmText || 'Confirm';
    confirmBtn.innerHTML = '<i class="fas ' + confirmIconClass + '"></i> ' + confirmLabel;

    confirmBtn.onclick = function() {
      // Simple case (unchanged behavior): resolve immediately, caller does its own work after the modal closes.
      if (!opts.loadingAction) { closeModal(true); return; }

      // loadingAction case: keep the modal open, show a spinner + loading label on the
      // confirm button while the async work runs, then close once it settles.
      cancelBtn.disabled = true;
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (opts.loadingText || 'Processing...');

      Promise.resolve()
        .then(opts.loadingAction)
        .then(function() {
          cancelBtn.disabled = false;
          closeModal(true);
        })
        .catch(function() {
          // Let the caller's own error toast explain what happened; just restore the modal
          // to its normal, retryable state instead of leaving it stuck mid-spin.
          cancelBtn.disabled = false;
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = '<i class="fas ' + confirmIconClass + '"></i> ' + confirmLabel;
        });
    };

    // Remember what was focused so we can restore it when the modal closes.
    _lastFocusedEl = document.activeElement;

    document.body.classList.add('kc-modal-open');
    o.classList.add('open');

    // Move focus into the modal — the safer button by default when opts.focusCancel is set.
    if (opts.focusCancel) { cancelBtn.focus(); } else { confirmBtn.focus(); }

    return new Promise(function(resolve) { _resolve = resolve; });
  };
})();


/* ── Tab switching ── */
document.querySelectorAll(".tab-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    if (btn.classList.contains("active")) return; // already on this section

    guardGalleryNavigation(function() {
      document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
      document.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.remove("active"); });
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   BOOKING SUB-TABS & SEARCH
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Sub-tab switching ── */
(function() {
  document.querySelectorAll('.booking-subtab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.booking-subtab').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.booking-subpanel').forEach(function(p) { p.classList.remove('active'); });
      btn.classList.add('active');
      var panel = document.getElementById('subpanel-' + btn.dataset.subtab);
      if (panel) panel.classList.add('active');
    });
  });
})();


/* ── Booking search with 300ms debounce ── */
(function() {
  var searchInput  = document.getElementById('bookingSearchInput');
  var clearBtn     = document.getElementById('bookingSearchClear');
  var notice       = document.getElementById('searchResultNotice');
  var queryDisplay = document.getElementById('searchQueryDisplay');
  var noResults    = document.getElementById('searchNoResults');
  var subtabsEl    = document.getElementById('bookingSubtabs');
  var pendingCount   = document.getElementById('pendingCount');
  var completedCount = document.getElementById('completedCount');

  if (!searchInput) return;

  var debounceTimer = null;

  searchInput.addEventListener('input', function() {
    var q = searchInput.value.trim();
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() { runSearch(q); }, 300);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function() { clearBookingSearch(); });
  }

  function runSearch(q) {
    if (!q) {
      restoreOriginalView();
      return;
    }

    fetch('/admin/search-bookings?q=' + encodeURIComponent(q))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.success) {
          showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Search failed.', 'orange');
          return;
        }

        var totalFound = data.pending.length + data.completed.length;

        /* Enter search mode on the parent panel */
        var bookingsPanel = document.getElementById('tab-bookings');
        if (bookingsPanel) bookingsPanel.classList.add('search-mode');

        /* Show/hide notice */
        if (notice) { notice.style.display = 'flex'; }
        if (queryDisplay) queryDisplay.textContent = q;
        if (noResults)   noResults.style.display = totalFound === 0 ? 'flex' : 'none';

        /* Hide sub-tab bar when searching */
        if (subtabsEl) subtabsEl.style.display = 'none';

        /* Render into both tbody elements */
        renderBookingRows('pendingTableBody',   data.pending,   true);
        renderBookingRows('completedTableBody', data.completed, false);

        /* Show/hide subpanels based on whether they have results */
        var pendingPanel   = document.getElementById('subpanel-pending');
        var completedPanel = document.getElementById('subpanel-completed');

        /* Always activate pending panel (it handles its own empty state via search-mode CSS) */
        if (pendingPanel) {
          if (data.pending.length > 0) {
            pendingPanel.classList.add('active');
          } else {
            /* Keep in DOM for section label but suppress the empty-state block */
            pendingPanel.classList.remove('active');
          }
        }
        if (completedPanel) {
          if (data.completed.length > 0) {
            completedPanel.classList.add('active');
          } else {
            completedPanel.classList.remove('active');
          }
        }

        /* Update counts in sub-tab buttons */
        if (pendingCount)   pendingCount.textContent   = data.pending.length;
        if (completedCount) completedCount.textContent = data.completed.length;
      })
      .catch(function() {
        showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Network error during search.', 'orange');
      });
  }

  /* Called by the "Clear" button in the notice bar, or when input is emptied */
  window.clearBookingSearch = function() {
    searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    restoreOriginalView();
  };

  function restoreOriginalView() {
    /* Remove search mode */
    var bookingsPanel = document.getElementById('tab-bookings');
    if (bookingsPanel) bookingsPanel.classList.remove('search-mode');

    if (notice)    notice.style.display    = 'none';
    if (noResults) noResults.style.display = 'none';
    if (subtabsEl) subtabsEl.style.display = '';

    /* Restore original server-rendered rows */
    restoreOriginalRows('pendingTableBody',   window._originalPendingRows);
    restoreOriginalRows('completedTableBody', window._originalCompletedRows);

    /* Re-activate only the currently selected sub-tab panel */
    var activeSubtab = document.querySelector('.booking-subtab.active');
    document.querySelectorAll('.booking-subpanel').forEach(function(p) { p.classList.remove('active'); });
    if (activeSubtab) {
      var panel = document.getElementById('subpanel-' + activeSubtab.dataset.subtab);
      if (panel) panel.classList.add('active');
    }

    /* Restore original counts */
    if (pendingCount)   pendingCount.textContent   = pendingCount.dataset.original   || pendingCount.textContent;
    if (completedCount) completedCount.textContent = completedCount.dataset.original || completedCount.textContent;
  }
})();


/* ── Snapshot original rows on page load so we can restore them ── */
document.addEventListener('DOMContentLoaded', function() {
  function snapshotBody(id) {
    var tbody = document.getElementById(id);
    return tbody ? tbody.innerHTML : '';
  }
  window._originalPendingRows   = snapshotBody('pendingTableBody');
  window._originalCompletedRows = snapshotBody('completedTableBody');

  /* Stash original counts for restore */
  var pc = document.getElementById('pendingCount');
  var cc = document.getElementById('completedCount');
  if (pc) pc.dataset.original   = pc.textContent;
  if (cc) cc.dataset.original   = cc.textContent;
});


/* ── Render an array of booking objects into a <tbody> ── */
function renderBookingRows(tbodyId, bookings, isPending) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  var panel = tbody.closest('.booking-subpanel');
  var emptyEl = panel ? panel.querySelector('.empty') : null;

  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    /* Hide the table wrapper so the empty state is visible */
    var wrap = tbody.closest('.bookings-table-wrap');
    if (wrap) wrap.style.display = 'none';
    return;
  }

  /* Ensure table is visible */
  var wrap = tbody.closest('.bookings-table-wrap');
  if (wrap) wrap.style.display = '';
  if (emptyEl) emptyEl.style.display = 'none';

  var html = '';
  bookings.forEach(function(b, idx) {
    var statusCell = isPending
      ? '<button class="done-btn" data-id="' + b.id + '" onclick="markDone(this)"><i class="fas fa-check-circle"></i> Order Done</button>'
      : '<span class="done-badge"><i class="fas fa-check-circle"></i> Order Done</span>';

    html +=
      '<tr class="search-highlight">' +
        '<td class="sno-cell">'    + (idx + 1) + '</td>' +
        '<td><div style="font-weight:700;color:#1a1a1a;">' + escAdminHtml(b.full_name) + '</div></td>' +
        '<td><a href="tel:' + escAdminHtml(b.phone) + '" class="phone-link"><i class="fas fa-phone-alt"></i> ' + escAdminHtml(b.phone) + '</a></td>' +
        '<td><span class="event-badge">' + escAdminHtml(b.event_type) + '</span></td>' +
        '<td class="date-cell">'   + escAdminHtml(b.event_date)  + '</td>' +
        '<td><span class="guests-chip">' + (b.guests || 0) + '</span></td>' +
        '<td class="addr-cell">'   + escAdminHtml(b.address  || '—') + '</td>' +
        '<td class="menu-cell">'   + escAdminHtml(b.menu     || '—') + '</td>' +
        '<td class="msg-cell">'    + escAdminHtml(b.message  || '—') + '</td>' +
        '<td class="date-cell submitted-cell">' + escAdminHtml(b.created_at) + '</td>' +
        '<td>' + statusCell + '</td>' +
      '</tr>';
  });

  tbody.innerHTML = html;
}


/* Restore a tbody to its original server-rendered HTML */
function restoreOriginalRows(tbodyId, originalHtml) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = originalHtml || '';

  /* Restore table wrapper visibility */
  var wrap = tbody.closest('.bookings-table-wrap');
  if (wrap) wrap.style.display = '';

  /* Hide any empty state that was triggered during search */
  var panel = tbody.closest('.booking-subpanel');
  if (panel) {
    var emptyEl = panel.querySelector('.empty');
    /* Only show empty if tbody is genuinely empty */
    if (emptyEl) emptyEl.style.display = tbody.children.length === 0 ? 'block' : 'none';
  }
}


/* ── Mark Done: move row from pending to completed on success ── */
function markDone(btn) {
  var id = btn.getAttribute("data-id");
  kcConfirm({
    title: 'Mark Order as Done?',
    message: 'This will be saved permanently and cannot be undone.',
    confirmText: 'Yes, Mark Done',
    icon: 'fa-check-circle',
    type: 'warning'
  }).then(function(ok) {
    if (!ok) return;
    fetch("/admin/mark-done/" + id, { method: "POST" })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          var row = btn.closest('tr');

          /* Swap button → done badge in the row */
          var badge = document.createElement("span");
          badge.className = "done-badge";
          badge.innerHTML = '<i class="fas fa-check-circle"></i> Order Done';
          btn.parentNode.replaceChild(badge, btn);

          var completedBody  = document.getElementById('completedTableBody');
          var completedPanel = document.getElementById('subpanel-completed');
          var completedWrap  = completedPanel ? completedPanel.querySelector('.bookings-table-wrap') : null;
          var completedEmpty = completedPanel ? completedPanel.querySelector('.empty') : null;

          if (row && completedBody) {
            /* Fade out of pending */
            row.style.transition = 'opacity 0.35s, transform 0.35s';
            row.style.opacity    = '0';
            row.style.transform  = 'translateX(12px)';

            setTimeout(function() {
              /* Re-number remaining pending rows */
              var pendingBody = document.getElementById('pendingTableBody');
              if (pendingBody) {
                Array.prototype.forEach.call(pendingBody.querySelectorAll('tr'), function(r, i) {
                  var sno = r.querySelector('.sno-cell');
                  if (sno) sno.textContent = i + 1;
                });
                if (pendingBody.children.length === 0) {
                  var pendingEmpty = document.getElementById('pendingEmpty');
                  if (pendingEmpty) pendingEmpty.style.display = 'block';
                  var pendingWrap = pendingBody.closest('.bookings-table-wrap');
                  if (pendingWrap) pendingWrap.style.display = 'none';
                }
              }

              /* Append moved row to completed */
              var newSno   = completedBody.children.length + 1;
              var snoCell  = row.querySelector('.sno-cell');
              if (snoCell) snoCell.textContent = newSno;
              row.style.opacity   = '0';
              row.style.transform = 'none';
              completedBody.appendChild(row);

              /* Ensure completed table is visible */
              if (completedWrap)  completedWrap.style.display  = '';
              if (completedEmpty) completedEmpty.style.display = 'none';

              /* Green flash on the moved row */
              setTimeout(function() {
                row.style.transition = 'opacity 0.35s, background 0.6s';
                row.style.opacity    = '1';
                row.style.background = '#f0fdf4';
                setTimeout(function() { row.style.background = ''; }, 1600);
              }, 30);
            }, 360);
          }

          /* Update sub-tab counters */
          var pc = document.getElementById('pendingCount');
          var cc = document.getElementById('completedCount');
          if (pc) { pc.textContent = Math.max(0, (parseInt(pc.textContent) || 0) - 1); pc.dataset.original = pc.textContent; }
          if (cc) { cc.textContent = (parseInt(cc.textContent) || 0) + 1;               cc.dataset.original = cc.textContent; }

          /* Refresh snapshots so search-clear restores the updated DOM */
          setTimeout(function() {
            var pb = document.getElementById('pendingTableBody');
            var cb = document.getElementById('completedTableBody');
            window._originalPendingRows   = pb ? pb.innerHTML : '';
            window._originalCompletedRows = cb ? cb.innerHTML : '';
          }, 400);

          showToast('<i class="fas fa-check-circle"></i> &nbsp;Order marked as done!', 'orange');
        } else {
          showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Error: ' + (data.error || "Could not update status."), 'orange');
        }
      })
      .catch(function() { showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Network error. Please try again.', 'orange'); });
  });
}


/* ── Delete review (scoped to reviews tab only) ── */
document.querySelectorAll("#tab-reviews .delete-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    var id = btn.getAttribute("data-id");
    kcConfirm({
      title: 'Delete This Review?',
      message: 'This review will be permanently removed and cannot be recovered.',
      confirmText: 'Delete Review',
      icon: 'fa-trash-alt',
      type: 'danger'
    }).then(function(ok) {
      if (!ok) return;
      fetch("/admin/delete-review/" + id, { method: "POST" })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            var card = document.getElementById("card-" + id);
            card.style.transition = "opacity 0.3s, transform 0.3s";
            card.style.opacity = "0";
            card.style.transform = "scale(0.95)";
            setTimeout(function() { card.remove(); }, 300);
            showToast('<i class="fas fa-check-circle"></i> &nbsp;Review deleted successfully!', 'green');
          } else {
            showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Error: ' + data.error, 'orange');
          }
        })
        .catch(function() { showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Something went wrong. Please try again.', 'orange'); });
    });
  });
});


/* ── Toast ── */
var _toastHideTimer = null;
function showToast(message, type) {
  var t = document.getElementById("toast");
  if (!t) return;

  clearTimeout(_toastHideTimer);
  t.classList.remove('toast-out');
  t.innerHTML = message;
  t.className = type + ' toast-in';
  t.style.display = "block";

  _toastHideTimer = setTimeout(function() {
    t.classList.remove('toast-in');
    t.classList.add('toast-out');
    setTimeout(function() { t.style.display = "none"; }, 220);
  }, 3000);
}


/* ── Gallery: upload validation rules (kept in one place, matches the on-page hint text) ── */
var GAL_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
var GAL_MAX_BYTES      = 5 * 1024 * 1024; // 5 MB

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/* Returns null if the file passes validation, or a friendly error string if not. */
function validateGalleryFile(file) {
  if (!file) return 'Please choose a photo first.';
  if (GAL_ALLOWED_TYPES.indexOf(file.type) === -1) {
    return 'That file type isn\'t supported. Please choose a JPG, PNG, WEBP, or GIF image.';
  }
  if (file.size > GAL_MAX_BYTES) {
    return 'That image is ' + formatFileSize(file.size) + ' — please choose a photo under 5 MB.';
  }
  return null;
}

function resetGalleryPreview() {
  window._galFileInput = null;
  var fileInput = document.getElementById('galPhotoInput');
  if (fileInput) fileInput.value = '';

  var label = document.getElementById('galFileLabel');
  if (label) label.innerHTML = '<i class="fas fa-image"></i> Choose Photo';

  var card = document.getElementById('galPreviewCard');
  if (card) card.classList.remove('show');

  var preview = document.getElementById('galPreview');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
}

/* ── Gallery: preview selected photo (with filename, size, dimensions, and a Remove control) ── */
function previewGalPhoto(input) {
  var file = input.files && input.files[0];
  var error = validateGalleryFile(file);

  if (error) {
    showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;' + error, 'orange');
    input.value = '';
    resetGalleryPreview();
    return;
  }

  window._galFileInput = input;

  var preview     = document.getElementById('galPreview');
  var label       = document.getElementById('galFileLabel');
  var card        = document.getElementById('galPreviewCard');
  var nameEl      = document.getElementById('galPreviewFilename');
  var detailsEl   = document.getElementById('galPreviewDetails');
  if (!preview || !label) return;

  if (label) label.innerHTML = '<i class="fas fa-check-circle" style="color:#2e7d32"></i> ' + file.name;
  if (nameEl) nameEl.textContent = file.name;
  if (detailsEl) detailsEl.textContent = formatFileSize(file.size) + ' · reading dimensions…';

  var reader = new FileReader();
  reader.onload = function(e) {
    preview.src = e.target.result;
    preview.style.display = 'block';
    if (card) card.classList.add('show');

    // Dimensions are only knowable once the browser actually decodes the image.
    var probe = new Image();
    probe.onload = function() {
      if (detailsEl) {
        detailsEl.textContent = formatFileSize(file.size) + ' · ' + probe.naturalWidth + ' × ' + probe.naturalHeight + ' px';
      }
    };
    probe.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ── Gallery: clear the selected photo (Remove button in the preview card) ── */
function removeGalleryPreview() {
  resetGalleryPreview();
}


/* ── Gallery: upload photo ── */
function uploadGalleryPhoto() {
  var fileInput = window._galFileInput ||
                  document.getElementById('galPhotoInput') ||
                  document.querySelector('input[type="file"]');

  var captionEl = document.getElementById('galCaption') ||
                  document.querySelector('.gal-caption-input');
  var btn       = document.querySelector('.gal-upload-btn');

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Please choose a photo first.', 'orange');
    return;
  }

  // Defense in depth: re-validate even though previewGalPhoto() already checked this file
  // (guards against a stale/edited file-input reference, not just the happy path).
  var validationError = validateGalleryFile(fileInput.files[0]);
  if (validationError) {
    showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;' + validationError, 'orange');
    return;
  }

  var caption = captionEl ? captionEl.value.trim() : '';

  var formData = new FormData();
  formData.append('photo',   fileInput.files[0]);
  formData.append('caption', caption);

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...'; }

  fetch('/admin/add-gallery', { method: 'POST', body: formData })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Photo'; }

      if (data.success) {
        var item = data.item;
        var grid = document.getElementById('adminGalGrid') ||
                   document.querySelector('.admin-gal-grid');
        var empty = document.getElementById('galEmpty') ||
                    (grid && grid.querySelector('.empty'));
        if (empty) empty.remove();

        var card = document.createElement('div');
        card.className = 'admin-gal-card gal-card-enter';
        card.id = 'gal-card-' + item.id;
        card.innerHTML =
          '<div class="admin-gal-img-wrap">' +
            '<img src="' + item.photo_url + '" alt="' + (item.caption || 'Gallery photo') + '" class="admin-gal-img"/>' +
          '</div>' +
          '<div class="admin-gal-footer">' +
            '<span class="admin-gal-caption">' + (item.caption || '(no caption)') + '</span>' +
            '<button class="delete-btn gal-del-btn" data-id="' + item.id + '">' +
              '<i class="fas fa-trash-alt"></i> Delete' +
            '</button>' +
          '</div>';
        // New uploads get sort_order = 1 on the backend, so they belong at the front.
        if (grid) grid.insertBefore(card, grid.firstChild);

        if (captionEl) captionEl.value = '';
        resetGalleryPreview(); // clears the file input, preview card, and label back to their default state

        initGalleryDragDrop(); // re-init in case grid went from empty -> populated, and refresh saved order snapshot

        showToast('<i class="fas fa-check-circle"></i> &nbsp;Gallery image uploaded successfully.', 'green');
      } else {
        // Per spec: keep the selected preview in place on failure so the admin can just retry.
        showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;' + (data.error || 'Upload failed.'), 'orange');
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Photo'; }
      // Keep the selected preview in place on failure so the admin can just retry.
      showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Network error. Please try again.', 'orange');
    });
}


/* ── Gallery: delete via event delegation ── */
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.gal-del-btn');
  if (btn) deleteGalleryPhoto(btn.dataset.id, btn);
});

function deleteGalleryPhoto(id, btn) {
  kcConfirm({
    title: '🗑 Delete Gallery Image',
    message: 'Are you sure you want to permanently delete this gallery image? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    icon: 'fa-trash-alt',
    type: 'danger',
    loadingText: 'Deleting...',
    loadingAction: function() {
      return fetch('/admin/delete-gallery/' + id, { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            var card = document.getElementById('gal-card-' + id);
            if (card) {
              card.style.transition = 'opacity 0.3s, transform 0.3s';
              card.style.opacity = '0';
              card.style.transform = 'scale(0.9)';
              setTimeout(function() {
                card.remove();
                initGalleryDragDrop(); // refresh drag state + saved order snapshot after removal
                showGalleryEmptyStateIfNeeded();
              }, 300);
            } else {
              showGalleryEmptyStateIfNeeded();
            }
            showToast('<i class="fas fa-check-circle"></i> &nbsp;Gallery image deleted successfully.', 'green');
          } else {
            showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;' + (data.error || 'Delete failed.'), 'orange');
          }
        })
        .catch(function() {
          showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Network error.', 'orange');
        });
    }
  });
}

/* ── Gallery: show the empty state (camera icon + copy) once the last card is gone ──
   The Save Gallery Order button intentionally stays visible (per Phase 4 spec) — it's
   already disabled automatically by updateSaveOrderBtnState() when there's nothing to save. */
function showGalleryEmptyStateIfNeeded() {
  var grid = document.getElementById('adminGalGrid');
  if (!grid) return;
  if (grid.querySelector('.admin-gal-card')) return; // still has photos
  if (grid.querySelector('#galEmpty')) return;        // already showing

  var empty = document.createElement('div');
  empty.className = 'empty gal-empty-anim';
  empty.id = 'galEmpty';
  empty.innerHTML =
    '<div class="empty-icon">📷</div>' +
    '<p>No gallery images yet.</p>' +
    '<p>Upload your first gallery photo.</p>';
  grid.appendChild(empty);
}


/* ── Gallery: drag & drop ordering (SortableJS) ── */
window._galSortableInstance = null;
window._galSavedOrder       = null; // last known-saved order (array of ids as strings), used to restore on failure

function getGalleryCardOrder() {
  var grid = document.getElementById('adminGalGrid');
  if (!grid) return [];
  return Array.prototype.map.call(
    grid.querySelectorAll('.admin-gal-card'),
    function(card) { return card.id.replace('gal-card-', ''); }
  );
}

function arraysEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/* True only when the grid's current order differs from the last-saved order. */
function hasUnsavedGalleryOrderChanges() {
  if (window._galSavedOrder === null) return false;
  var current = getGalleryCardOrder();
  return !arraysEqual(current, window._galSavedOrder);
}

function updateSaveOrderBtnState() {
  var btn = document.getElementById('galSaveOrderBtn');
  if (!btn) return;
  btn.disabled = !hasUnsavedGalleryOrderChanges();
}

function initGalleryDragDrop() {
  var grid = document.getElementById('adminGalGrid');
  if (!grid || typeof Sortable === 'undefined') return;

  // Snapshot the current order as the "last saved" baseline.
  window._galSavedOrder = getGalleryCardOrder();

  var cards = grid.querySelectorAll('.admin-gal-card');

  // Destroy any existing instance before re-creating (e.g. after add/delete).
  if (window._galSortableInstance) {
    window._galSortableInstance.destroy();
    window._galSortableInstance = null;
  }

  if (cards.length <= 1) {
    // Nothing meaningful to reorder — disable dragging visually and functionally.
    cards.forEach(function(card) { card.classList.add('gal-drag-disabled'); });
  } else {
    cards.forEach(function(card) { card.classList.remove('gal-drag-disabled'); });
    window._galSortableInstance = new Sortable(grid, {
      animation: 150,
      ghostClass:  'gal-drag-ghost',
      chosenClass: 'gal-drag-chosen',
      dragClass:   'gal-drag-chosen',
      onEnd: function() {
        updateSaveOrderBtnState();
      }
    });
  }

  updateSaveOrderBtnState();
}

function saveGalleryOrder() {
  var btn   = document.getElementById('galSaveOrderBtn');
  var order = getGalleryCardOrder();

  if (!order.length) return;

  var previousOrder = window._galSavedOrder ? window._galSavedOrder.slice() : order.slice();

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

  fetch('/admin/update-gallery-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: order })
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (btn) { btn.innerHTML = '<i class="fas fa-save"></i> Save Gallery Order'; }

      if (data.success) {
        window._galSavedOrder = order;
        if (btn) btn.disabled = true; // no pending changes right after a successful save
        showToast('<i class="fas fa-check-circle"></i> &nbsp;Gallery order updated successfully.', 'green');
      } else {
        restoreGalleryOrder(previousOrder);
        showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;' + (data.error || 'Could not save gallery order.'), 'orange');
      }
    })
    .catch(function() {
      if (btn) { btn.innerHTML = '<i class="fas fa-save"></i> Save Gallery Order'; }
      restoreGalleryOrder(previousOrder);
      showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Network error. Gallery order not saved.', 'orange');
    });
}

/* Restore the gallery grid to a previously known order (used when a save fails) */
function restoreGalleryOrder(order) {
  var grid = document.getElementById('adminGalGrid');
  if (!grid || !order) return;
  order.forEach(function(id) {
    var card = document.getElementById('gal-card-' + id);
    if (card) grid.appendChild(card);
  });
  window._galSavedOrder = order;
  updateSaveOrderBtnState();
}

/* Warn on refresh / tab close / navigating away while there are unsaved
   gallery order changes. Browsers show their own generic confirmation
   dialog (custom text is ignored by modern browsers), triggered only
   when hasUnsavedGalleryOrderChanges() is true. This covers refresh,
   closing the tab, browser Back, and typing/entering another URL. */
window.addEventListener('beforeunload', function(e) {
  if (!hasUnsavedGalleryOrderChanges()) return;
  var warningMsg = 'You have unsaved gallery order changes. Leave anyway?';
  e.preventDefault();
  e.returnValue = warningMsg;
  return warningMsg;
});

/* Custom "Unsaved Gallery Changes" modal — used ONLY for in-site navigation
   (admin tab switches, navbar links, logout). It does not replace or
   interfere with the native beforeunload dialog above. */
function showUnsavedGalleryModal() {
  return kcConfirm({
    title:       '⚠️ Unsaved Gallery Changes',
    message:     'You have unsaved gallery order changes. Please save before leaving this page.',
    icon:        'fa-exclamation-triangle',
    type:        'warning',
    cancelText:  'Stay',
    confirmText: 'Leave Without Saving',
    focusCancel: true
  });
}

/* Runs proceedFn right away if there are no unsaved gallery order changes.
   Otherwise shows the custom modal and only runs proceedFn if the admin
   picks "Leave Without Saving"; picking "Stay" leaves everything as-is. */
function guardGalleryNavigation(proceedFn) {
  if (!hasUnsavedGalleryOrderChanges()) {
    proceedFn();
    return;
  }
  showUnsavedGalleryModal().then(function(leave) {
    if (leave) proceedFn();
  });
}

/* Guard in-site navigation links in the navbar (Home/About/.../Logout) —
   these leave the admin page, so unsaved gallery order would be lost. */
document.querySelectorAll('.navbar a[href]').forEach(function(link) {
  link.addEventListener('click', function(e) {
    if (!hasUnsavedGalleryOrderChanges()) return; // no changes: let normal navigation happen
    e.preventDefault();
    var destination = link.getAttribute('href');
    showUnsavedGalleryModal().then(function(leave) {
      if (leave) window.location.href = destination;
    });
  });
});

document.addEventListener('DOMContentLoaded', function() {
  initGalleryDragDrop();
});


/* ═══════════════════════════════════════════════════════════════════════════
   MENU MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Toggle category accordion ── */
function toggleMenuCat(headerEl) {
  var block = headerEl.closest('.menu-cat-block');
  if (block) block.classList.toggle('open');
}

/* ── Add new menu item ── */
function adminAddMenuItem() {
  var nameEl     = document.getElementById('menuItemName');
  var categoryEl = document.getElementById('menuItemCategory');
  var btn        = document.getElementById('addMenuItemBtn');

  var name     = nameEl     ? nameEl.value.trim()     : '';
  var category = categoryEl ? categoryEl.value.trim() : '';

  if (!name) {
    showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Please enter an item name.', 'orange');
    if (nameEl) nameEl.focus();
    return;
  }
  if (!category) {
    showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Please enter a category.', 'orange');
    if (categoryEl) categoryEl.focus();
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...'; }

  fetch('/admin/add-menu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, category: category })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus-circle"></i> Add to Menu'; }

    if (data.success) {
      var item = data.item;

      /* Inject into existing category block or create a new one */
      var wrap = document.getElementById('menuCategoriesWrap');
      var empty = document.getElementById('menuEmpty');
      if (empty) empty.remove();

      /* Find existing category block */
      var existingBlock = findCatBlockByName(item.category);

      if (existingBlock) {
        /* Add row to existing block */
        var body = existingBlock.querySelector('.menu-cat-body');
        body.appendChild(buildMenuItemRow(item));
        /* Update count badge */
        var badge = existingBlock.querySelector('.menu-cat-count');
        if (badge) badge.textContent = parseInt(badge.textContent || 0) + 1;
        existingBlock.classList.add('open');
      } else {
        /* Create a brand new category block */
        var block = document.createElement('div');
        block.className = 'menu-cat-block open';
        block.dataset.category = item.category;
        block.innerHTML =
          '<div class="menu-cat-header" onclick="toggleMenuCat(this)">' +
            '<span class="menu-cat-title">' + escAdminHtml(item.category) + '</span>' +
            '<span class="menu-cat-meta">' +
              '<span class="menu-cat-count">1</span>' +
              '<i class="fas fa-chevron-down menu-cat-chevron"></i>' +
            '</span>' +
          '</div>' +
          '<div class="menu-cat-body"></div>';
        block.querySelector('.menu-cat-body').appendChild(buildMenuItemRow(item));
        if (wrap) wrap.appendChild(block);

        /* Also add to datalist for future autocomplete */
        var datalist = document.getElementById('categoryDatalist');
        if (datalist) {
          var opt = document.createElement('option');
          opt.value = item.category;
          datalist.appendChild(opt);
        }
      }

      /* Reset form */
      if (nameEl)     nameEl.value     = '';
      if (categoryEl) categoryEl.value = '';
      if (nameEl)     nameEl.focus();

      showToast('<i class="fas fa-check-circle"></i> &nbsp;"' + item.name + '" added to menu!', 'green');
    } else {
      showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;' + (data.error || 'Failed to add item.'), 'orange');
    }
  })
  .catch(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus-circle"></i> Add to Menu'; }
    showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Network error. Please try again.', 'orange');
  });
}

/* Build a single menu item row DOM element */
function buildMenuItemRow(item) {
  var row = document.createElement('div');
  row.className = 'menu-item-row' + (item.is_active ? '' : ' inactive');
  row.id = 'menu-row-' + item.id;

  var checkedAttr = item.is_active ? 'checked' : '';
  row.innerHTML =
    '<span class="menu-item-name">' + escAdminHtml(item.name) + '</span>' +
    '<div class="menu-item-actions">' +
      '<label class="toggle-switch" title="' + (item.is_active ? 'Active — click to hide' : 'Hidden — click to show') + '">' +
        '<input type="checkbox" ' + checkedAttr + ' onchange="toggleMenuItemActive(' + item.id + ', this.checked)"/>' +
        '<span class="toggle-slider"></span>' +
      '</label>' +
      '<button class="menu-del-btn" onclick="adminDeleteMenuItem(' + item.id + ', this)">' +
        '<i class="fas fa-trash-alt"></i>' +
      '</button>' +
    '</div>';
  return row;
}

/* Find category block by category name */
function findCatBlockByName(categoryName) {
  var blocks = document.querySelectorAll('.menu-cat-block');
  for (var i = 0; i < blocks.length; i++) {
    var titleEl = blocks[i].querySelector('.menu-cat-title');
    if (titleEl && titleEl.textContent.trim() === categoryName.trim()) {
      return blocks[i];
    }
  }
  return null;
}


/* ── Toggle menu item active/inactive ── */
function toggleMenuItemActive(id, isActive) {
  fetch('/admin/update-menu/' + id, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.success) {
      var row = document.getElementById('menu-row-' + id);
      if (row) {
        if (isActive) {
          row.classList.remove('inactive');
        } else {
          row.classList.add('inactive');
        }
      }
      var msg = isActive
        ? '<i class="fas fa-eye"></i> &nbsp;Item is now visible on website.'
        : '<i class="fas fa-eye-slash"></i> &nbsp;Item is now hidden from website.';
      showToast(msg, 'green');
    } else {
      showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;' + (data.error || 'Update failed.'), 'orange');
      /* Revert the toggle visually */
      var row = document.getElementById('menu-row-' + id);
      if (row) {
        var cb = row.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = !isActive;
        if (isActive) row.classList.add('inactive'); else row.classList.remove('inactive');
      }
    }
  })
  .catch(function() {
    showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Network error.', 'orange');
  });
}


/* ── Delete menu item ── */
function adminDeleteMenuItem(id, btn) {
  kcConfirm({
    title: 'Delete Menu Item?',
    message: 'This item will be permanently removed from the menu.',
    confirmText: 'Delete Item',
    icon: 'fa-trash-alt',
    type: 'danger'
  }).then(function(ok) {
    if (!ok) return;

    fetch('/admin/delete-menu/' + id, { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          var row = document.getElementById('menu-row-' + id);
          if (row) {
            /* Find the parent category block to update count */
            var block = row.closest('.menu-cat-block');
            row.style.transition = 'opacity 0.3s, transform 0.3s';
            row.style.opacity = '0';
            row.style.transform = 'translateX(10px)';
            setTimeout(function() {
              row.remove();
              /* Update count badge and possibly remove empty block */
              if (block) {
                var badge = block.querySelector('.menu-cat-count');
                var remaining = block.querySelectorAll('.menu-item-row').length;
                if (badge) badge.textContent = remaining;
                if (remaining === 0) {
                  block.style.transition = 'opacity 0.3s';
                  block.style.opacity = '0';
                  setTimeout(function() { block.remove(); }, 300);
                }
              }
            }, 300);
          }
          showToast('<i class="fas fa-check-circle"></i> &nbsp;Menu item deleted!', 'green');
        } else {
          showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;' + (data.error || 'Delete failed.'), 'orange');
        }
      })
      .catch(function() {
        showToast('<i class="fas fa-exclamation-circle"></i> &nbsp;Network error.', 'orange');
      });
  });
}

/* Allow pressing Enter in the menu form inputs to submit */
(function() {
  function onEnter(e) {
    if (e.key === 'Enter') adminAddMenuItem();
  }
  var nameEl = document.getElementById('menuItemName');
  var catEl  = document.getElementById('menuItemCategory');
  if (nameEl) nameEl.addEventListener('keydown', onEnter);
  if (catEl)  catEl.addEventListener('keydown', onEnter);
})();


/* ═══════════════════════════════════════════════════════════════════════════
   MENU CATEGORY — searchable custom dropdown (Phase 5)
   Data source stays the existing #categoryDatalist, populated exactly as before
   (server-rendered + appended to by adminAddMenuItem() on new categories). This
   only changes how it's presented and selected — #menuItemCategory.value is still
   the single source of truth adminAddMenuItem() reads, so no backend changes.
   No unrestricted free typing: a value is only committed by picking an existing
   match or the explicit "Add New Category" option — never by typing alone.
   ═══════════════════════════════════════════════════════════════════════════ */
(function() {
  var input    = document.getElementById('menuItemCategory');
  var datalist = document.getElementById('categoryDatalist');
  var dropdown = document.getElementById('kcCatDropdown');
  var arrowBtn = document.getElementById('kcCatArrowBtn');
  var popover  = document.getElementById('kcCatPopover');
  var searchEl = document.getElementById('kcCatSearchInput');
  var listbox  = document.getElementById('kcCatListbox');
  if (!input || !datalist || !dropdown || !popover || !searchEl || !listbox) return;

  var NEW_CAT = '__kc_new_category__';
  var activeIndex = -1;

  function getAllCategories() {
    return Array.prototype.map.call(datalist.querySelectorAll('option'), function(o) { return o.value; })
      .filter(function(v) { return v && v.trim(); });
  }

  function isOpen() { return !popover.hidden; }

  function openPopover() {
    if (isOpen()) return;
    popover.hidden = false;
    dropdown.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
    searchEl.value = input.value || '';
    renderOptions(searchEl.value);
    setTimeout(function() { searchEl.focus(); searchEl.select(); }, 0);
  }

  function closePopover() {
    if (!isOpen()) return;
    popover.hidden = true;
    dropdown.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  }

  function renderOptions(query) {
    var all = getAllCategories();
    var q = (query || '').trim().toLowerCase();
    var matches = q ? all.filter(function(c) { return c.toLowerCase().indexOf(q) !== -1; }) : all;
    var exactMatch = all.some(function(c) { return c.toLowerCase() === q; });

    listbox.innerHTML = '';
    activeIndex = -1;

    matches.forEach(function(cat) {
      var li = document.createElement('li');
      li.className = 'kc-cat-option';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.value = cat;
      li.textContent = cat;
      li.addEventListener('mousedown', function(e) {
        e.preventDefault(); // keep focus on the search box until the click is handled
        selectCategory(cat);
      });
      listbox.appendChild(li);
    });

    // Explicit "Add New Category" row — the only way a brand-new value can be committed.
    if (q && !exactMatch) {
      var addLi = document.createElement('li');
      addLi.className = 'kc-cat-option kc-cat-option-new';
      addLi.setAttribute('role', 'option');
      addLi.setAttribute('aria-selected', 'false');
      addLi.dataset.value = NEW_CAT;
      addLi.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Category: "' + escAdminHtml(query.trim()) + '"';
      addLi.addEventListener('mousedown', function(e) {
        e.preventDefault();
        selectCategory(query.trim());
      });
      listbox.appendChild(addLi);
    }

    if (!listbox.children.length) {
      var none = document.createElement('li');
      none.className = 'kc-cat-option kc-cat-option-empty';
      none.textContent = 'Type to search categories';
      listbox.appendChild(none);
    }
  }

  function selectCategory(cat) {
    input.value = cat;
    closePopover();
    input.focus();
  }

  function highlight(index) {
    var opts = listbox.querySelectorAll('.kc-cat-option:not(.kc-cat-option-empty)');
    opts.forEach(function(o) { o.classList.remove('active'); o.setAttribute('aria-selected', 'false'); });
    if (index >= 0 && index < opts.length) {
      opts[index].classList.add('active');
      opts[index].setAttribute('aria-selected', 'true');
      opts[index].scrollIntoView({ block: 'nearest' });
      activeIndex = index;
    } else {
      activeIndex = -1;
    }
  }

  /* Open on click of the field or its arrow */
  input.addEventListener('click', openPopover);
  arrowBtn.addEventListener('click', function() {
    if (isOpen()) { closePopover(); input.focus(); } else { openPopover(); }
  });

  /* Space / Arrow keys open it — Enter is left alone so the existing
     "Enter submits the form" behavior on this field keeps working unchanged. */
  input.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openPopover();
    }
  });

  searchEl.addEventListener('input', function() { renderOptions(searchEl.value); });

  searchEl.addEventListener('keydown', function(e) {
    var opts = listbox.querySelectorAll('.kc-cat-option:not(.kc-cat-option-empty)');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (opts.length) highlight(Math.min(activeIndex + 1, opts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (opts.length) highlight(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var chosen = null;
      if (activeIndex >= 0 && opts[activeIndex]) {
        chosen = opts[activeIndex];
      } else if (opts.length === 1) {
        // Exactly one candidate on screen (an existing match or "Add New") — Enter picks it,
        // the same convenience a native select offers, without ever inventing a value silently.
        chosen = opts[0];
      }
      if (chosen) {
        var val = chosen.dataset.value;
        selectCategory(val === NEW_CAT ? searchEl.value.trim() : val);
      }
    } else if (e.key === 'Escape') {
      closePopover();
      input.focus();
    } else if (e.key === 'Tab') {
      closePopover();
    }
  });

  /* Click outside closes it without committing any change */
  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target)) closePopover();
  });
})();


/* ── HTML escape helper ── */
function escAdminHtml(str) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}


/* ── Hamburger Menu Toggle ── */
(function() {
  var hamburger = document.getElementById('navHamburger');
  var navLinks  = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', function(e) {
    e.stopPropagation();
    var isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  navLinks.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' || e.target.closest('a')) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', function(e) {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
})();