// ══════════════════════════════════════════════════════════════════
// NVL Forecast Tool v2.0 — Onboarding Welcome Modal
// ══════════════════════════════════════════════════════════════════

const ONBOARDING_KEY = 'nvl-onboarding-done';

/**
 * Show the onboarding welcome modal
 * @param {boolean} force - If true, always show (bypass localStorage check)
 */
function showOnboarding(force = false) {
  if (!force && localStorage.getItem(ONBOARDING_KEY)) return;

  const steps = [
    { titleKey: 'onboardingStep1Title', bodyKey: 'onboardingStep1Body', icon: '🚀' },
    { titleKey: 'onboardingStep2Title', bodyKey: 'onboardingStep2Body', icon: '📁' },
    { titleKey: 'onboardingStep3Title', bodyKey: 'onboardingStep3Body', icon: '⚡' },
    { titleKey: 'onboardingStep4Title', bodyKey: 'onboardingStep4Body', icon: '💡' },
  ];

  let currentStep = 0;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.id = 'onboarding-overlay';

  function renderStep() {
    const step = steps[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;
    const bodyHtml = t(step.bodyKey).replace(/\\n/g, '<br>');

    overlay.innerHTML = `
      <div class="onboarding-modal">
        <div class="onboarding-header">
          ${isFirst ? `<h2 class="onboarding-title">${t('onboardingTitle')}</h2>` : ''}
          <div class="onboarding-step-icon">${step.icon}</div>
          <h3 class="onboarding-step-title">${t(step.titleKey)}</h3>
        </div>
        <div class="onboarding-body">${bodyHtml}</div>
        <div class="onboarding-footer">
          <div class="onboarding-dots">
            ${steps.map((_, i) => `<span class="onboarding-dot${i === currentStep ? ' active' : ''}" onclick="onboardingGoTo(${i})"></span>`).join('')}
          </div>
          <div class="onboarding-nav">
            ${isFirst
              ? `<button class="btn btn-ghost btn-sm" onclick="closeOnboarding()">${t('onboardingSkip')}</button>`
              : `<button class="btn btn-ghost btn-sm" onclick="onboardingPrev()">${t('onboardingBack')}</button>`
            }
            ${isLast
              ? `<button class="btn btn-primary btn-sm" onclick="closeOnboarding()">${t('onboardingDone')}</button>`
              : `<button class="btn btn-primary btn-sm" onclick="onboardingNext()">${t('onboardingNext')}</button>`
            }
          </div>
        </div>
      </div>
    `;
  }

  // Navigation functions (global for onclick)
  window.onboardingNext = () => { if (currentStep < steps.length - 1) { currentStep++; renderStep(); } };
  window.onboardingPrev = () => { if (currentStep > 0) { currentStep--; renderStep(); } };
  window.onboardingGoTo = (i) => { currentStep = i; renderStep(); };
  window.closeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 300);
  };

  renderStep();
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => overlay.classList.add('visible'));

  // Close on overlay click (outside modal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOnboarding();
  });
}
