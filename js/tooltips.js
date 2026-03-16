// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Tooltip System
// ══════════════════════════════════════════════════════════════════

/**
 * Initialize tooltips on all [data-tip] elements
 * Call this after rendering dynamic content (tables, stats)
 */
function initTooltips() {
  // Remove any existing tooltip popup
  const existing = document.getElementById('tip-popup');
  if (existing) existing.remove();

  document.querySelectorAll('[data-tip]').forEach(el => {
    // Avoid double-binding
    if (el._tipBound) return;
    el._tipBound = true;

    // Desktop: hover
    el.addEventListener('mouseenter', showTip);
    el.addEventListener('mouseleave', hideTip);
    // Mobile: click toggle
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const popup = document.getElementById('tip-popup');
      if (popup && popup._targetEl === el) {
        hideTip();
      } else {
        showTip.call(el);
      }
    });
  });

  // Close on click outside
  document.addEventListener('click', hideTip);
}

function showTip() {
  hideTip(); // Close any existing

  const key = this.getAttribute('data-tip');
  const text = t(key);
  if (!text || text === key) return; // No translation found

  const popup = document.createElement('div');
  popup.id = 'tip-popup';
  popup.className = 'tip-popup';
  popup.textContent = text;
  popup._targetEl = this;
  document.body.appendChild(popup);

  // Position relative to icon
  const rect = this.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();

  let top = rect.top - popupRect.height - 8;
  let left = rect.left + rect.width / 2 - popupRect.width / 2;

  // If above viewport, show below
  if (top < 8) {
    top = rect.bottom + 8;
    popup.classList.add('below');
  }
  // Keep within viewport horizontally
  if (left < 8) left = 8;
  if (left + popupRect.width > window.innerWidth - 8) {
    left = window.innerWidth - popupRect.width - 8;
  }

  popup.style.top = top + window.scrollY + 'px';
  popup.style.left = left + 'px';

  requestAnimationFrame(() => popup.classList.add('visible'));
}

function hideTip() {
  const popup = document.getElementById('tip-popup');
  if (popup) popup.remove();
}

/**
 * Helper to create a tooltip icon span (for use in dynamic HTML)
 * @param {string} tipKey - i18n key for the tooltip text
 * @returns {string} HTML string
 */
function tipIcon(tipKey) {
  return `<span class="tip-icon" data-tip="${tipKey}">ⓘ</span>`;
}
