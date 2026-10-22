'use strict';
// Classic script, not an ES module: the page has to work when opened straight from file://.
(() => {
  const TEXTS = Object.freeze({
    emailRequired: 'Vyplňte e-mail.',
    emailInvalid: 'Zadejte e-mail ve tvaru jan@firma.cz.',
    nameTooLong: 'Jméno může mít nejvýše {max} znaků.',
    consentRequired: 'Pro přihlášení potvrďte souhlas se zpracováním údajů.',
    sending: 'Odesílám…',
    serverError: 'Přihlášení se nepodařilo kvůli chybě serveru. Vaše údaje zůstaly ve formuláři, zkuste to prosím znovu.',
    successMessage: 'Novinky budeme posílat na adresu {email}.',
  });
  const MAX_NAME_LENGTH = 100;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

  const format = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

  // One rule per validated control name, checked in order: required first, then format or length.
  // Each returns the error message, or '' when the value is fine.
  const RULES = Object.freeze({
    email: ({ email }) => {
      if (!email) return TEXTS.emailRequired;
      return EMAIL_PATTERN.test(email) ? '' : TEXTS.emailInvalid;
    },
    // maxlength in the HTML does not limit scripted or autofilled values, so the rule stays.
    name: ({ name }) => (name.length > MAX_NAME_LENGTH ? format(TEXTS.nameTooLong, { max: MAX_NAME_LENGTH }) : ''),
    consent: ({ consent }) => (consent ? '' : TEXTS.consentRequired),
  });

  // submitMock(data) → Promise; data = { email, name, interests: [], consent }
  function submitMock(data) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (/@error\.test$/i.test(data.email)) reject(new Error('Server error'));
        else resolve({ ok: true, email: data.email });
      }, 500);
    });
  }

  // Wires one form. If a hook is missing it wires nothing, so the form stays plain HTML (native POST).
  function poloNewsletterForm(id) {
    const form = document.getElementById(id);
    const root = form.parentElement;
    const submitButton = form.querySelector('.js-submit');
    const status = form.querySelector('.js-status');
    const serverError = root.querySelector('.js-server-error');
    const success = root.querySelector('.js-success');
    const successTitle = success?.querySelector('.js-success-title');
    const successMessage = success?.querySelector('.js-success-message');
    const resetButton = success?.querySelector('.js-reset');
    // Validated controls in DOM order, so the first invalid one is the first the user meets.
    const controls = Array.from(form.elements).filter((control) => Object.hasOwn(RULES, control.name));
    const hooks = [submitButton, status, serverError, success, successTitle, successMessage, resetButton];
    const hasAllHooks =
      hooks.every(Boolean) &&
      Object.keys(RULES).every((name) => controls.some((control) => control.name === name)) &&
      controls.every((control) => document.getElementById(`${control.id}-error`) && control.closest('.js-field'));
    if (!hasAllHooks) return;

    const submitLabel = submitButton.textContent;
    let submitting = false;

    function readData() {
      const { email, name, consent } = form.elements;
      return {
        email: email.value.trim(),
        name: name.value.trim(),
        interests: Array.from(form.querySelectorAll('[name="interests"]:checked'), (box) => box.value),
        consent: consent.checked,
      };
    }

    // Writes only on change: the error <p> is role="alert", so rewriting the same text would re-announce it.
    function renderFieldError(control, message) {
      const error = document.getElementById(`${control.id}-error`);
      if (error.textContent !== message) error.textContent = message;
      control.closest('.js-field').classList.toggle('is-invalid', Boolean(message));
    }

    function showFieldError(control, message) {
      renderFieldError(control, message);
      control.setAttribute('aria-invalid', 'true');
    }

    function clearFieldError(control) {
      renderFieldError(control, '');
      control.removeAttribute('aria-invalid');
    }

    function validateField(control) {
      const message = RULES[control.name](readData());
      if (message) showFieldError(control, message);
      else clearFieldError(control);
      return !message;
    }

    function validateAll() {
      const invalid = controls.filter((control) => !validateField(control));
      return invalid[0] || null;
    }

    const isTracked = (control) => controls.includes(control);
    const isInvalid = (control) => control.hasAttribute('aria-invalid');

    // Leaving a field validates it only when it holds something or already shows an error,
    // so tabbing through an empty form stays quiet. Focus moving to the submit button is skipped: the submit handler
    // validates anyway, and an error appearing mid-click must not be what the user sees instead of the submit.
    form.addEventListener('focusout', ({ target, relatedTarget }) => {
      if (relatedTarget === submitButton) return;
      if (isTracked(target) && (isInvalid(target) || readData()[target.name])) validateField(target);
    });

    // While a field shows an error, re-check on every change so the error clears as soon as it is fixed.
    // The first edit after a server error hides that message: it described the previous attempt.
    form.addEventListener('input', ({ target }) => {
      if (!serverError.hidden) hideServerError();
      if (isTracked(target) && isInvalid(target)) validateField(target);
    });

    // The polite status region tells screen-reader users that sending started; it is emptied afterwards.
    function startSubmitting() {
      submitting = true;
      submitButton.disabled = true;
      submitButton.textContent = TEXTS.sending;
      status.textContent = TEXTS.sending;
    }

    function stopSubmitting() {
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
      status.textContent = '';
    }

    // role="alert" announces the message and the values stay for a retry. Disabling the button dropped its focus, so
    // focus returns to it, unless the user has moved on to another control meanwhile.
    function showServerError() {
      serverError.textContent = TEXTS.serverError;
      serverError.hidden = false;
      if ([document.body, submitButton].includes(document.activeElement)) submitButton.focus();
    }

    function hideServerError() {
      serverError.hidden = true;
      serverError.textContent = '';
    }

    function showSuccess(email) {
      successMessage.textContent = format(TEXTS.successMessage, { email });
      form.hidden = true;
      success.hidden = false;
      successTitle.focus();
    }

    function resetForm() {
      form.reset();
      controls.forEach(clearFieldError);
      hideServerError();
      success.hidden = true;
      form.hidden = false;
      form.elements.email.focus();
    }

    async function handleSubmit(event) {
      event.preventDefault();
      if (submitting) return;
      hideServerError();
      const firstInvalid = validateAll();
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      // Only the request sits in try, so an error while rendering success is never reported as a server error.
      // The outcome is shown after finally has re-enabled the button, so focus can return to it.
      let result;
      let failed = false;
      try {
        startSubmitting();
        result = await submitMock(readData());
      } catch {
        failed = true;
      } finally {
        stopSubmitting();
      }
      if (failed) showServerError();
      else showSuccess(result.email);
    }

    form.addEventListener('submit', handleSubmit);
    resetButton.addEventListener('click', resetForm);
  }

  // Each form on its own, so one broken form never blocks the others.
  function initForm(el) {
    try {
      poloNewsletterForm(el.id);
    } catch {
      // Nothing can show a message before the form is wired; this form stays plain HTML (native POST).
      return;
    }
  }

  document.querySelectorAll('[data-role="polonewsletterform"]').forEach(initForm);
})();
