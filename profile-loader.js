// js/profile-loader.js
// Lightweight loader for the profile partial and in-page profile behaviors
(function () {
  async function loadProfilePartial() {
    const target = document.getElementById('profileContent');
    if (!target) return;

    // ensure CSS
    if (!document.querySelector('link[href="partials/profile.css"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'partials/profile.css'; document.head.appendChild(l);
    }

    // Orders tab removed from profile partial per request



    // fetch partial (prefer src/partials then partials)
    let html = null;
    try {
      let res = await fetch('src/partials/profile.html');
      if (res.ok) html = await res.text();
      else {
        res = await fetch('partials/profile.html');
        if (res.ok) html = await res.text();
      }
    } catch (e) { console.warn('Failed to fetch profile partial', e); }

    if (!html) {
      target.innerHTML = '<div class="small-muted">Profile unavailable</div>';
      return;
    }

    target.innerHTML = html;
    bindProfileUI();
    // initial data load
    loadUser();
    loadAddresses();
  }

  async function loadUser() {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      const data = res && res.ok ? await res.json() : null;
      const user = data && data.user ? data.user : {};
      populateUserFields(user);
    } catch (e) {
      console.warn('Failed to load /api/me', e);
      populateUserFields({});
    }
  }

  function populateUserFields(user) {
    const root = document.getElementById('profileContent');
    if (!root) return;
    const avatar = root.querySelector('#profileAvatar');
    const nameEl = root.querySelector('#profileName');
    const emailEl = root.querySelector('#profileEmail');
    const phoneEl = root.querySelector('#profilePhone');
    const memberSinceEl = root.querySelector('#profileMemberSince');

    const avatarPlaceholder = root.querySelector('#avatarPlaceholder');
    if (avatar) {
      if (user && user.avatar) {
        avatar.src = user.avatar;
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
      } else {
        avatar.src = '';
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'flex';
      }
    }
    if (nameEl) nameEl.textContent = user && (user.name || user.displayName) ? (user.name || user.displayName) : '';
    if (emailEl) emailEl.textContent = user && user.email ? user.email : '';
    if (phoneEl) phoneEl.textContent = user && user.phone ? user.phone : '';
    if (memberSinceEl) memberSinceEl.textContent = user && user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '';

    const inputName = root.querySelector('#inputProfileName');
    const inputEmail = root.querySelector('#inputProfileEmail');
    const inputPhone = root.querySelector('#inputProfilePhone');
    const spanName = root.querySelector('#spanProfileName');
    const spanEmail = root.querySelector('#spanProfileEmail');
    const spanPhone = root.querySelector('#spanProfilePhone');
    const valName = user && (user.name || user.displayName) ? (user.name || user.displayName) : '';
    const valEmail = user && user.email ? user.email : '';
    const valPhone = user && user.phone ? user.phone : '';
    if (inputName) inputName.value = valName;
    if (inputEmail) inputEmail.value = valEmail;
    if (inputPhone) inputPhone.value = valPhone;
    if (spanName) spanName.textContent = valName;
    if (spanEmail) spanEmail.textContent = valEmail;
    if (spanPhone) spanPhone.textContent = valPhone;
    // settings tab removed - no settings fields to update
  }

  async function loadAddresses() {
    const root = document.getElementById('profileContent');
    if (!root) return;
    const list = root.querySelector('#addressesList');
    if (!list) return;
    list.innerHTML = '<div class="small-muted">Loading addresses...</div>';
    try {
      const res = await fetch('/api/addresses', { credentials: 'include' });
      if (!res.ok) throw new Error('no');
      const data = await res.json();
      const addrs = data.addresses || [];
      renderAddresses(addrs);
    } catch (e) {
      list.innerHTML = '<div class="small-muted">No addresses found.</div>';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>\"']/g, function (s) {
      switch (s) { case '&': return '&amp;'; case '<': return '&lt;'; case '>': return '&gt;'; case '"': return '&quot;'; case "'": return '&#39;'; default: return s; }
    });
  }

  // Toast + A11y helpers
  function ensureToastContainer() {
    if (document.getElementById('toastContainer')) return;
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.style.position = 'fixed';
    c.style.right = '12px';
    c.style.bottom = '12px';
    c.style.zIndex = 9999;
    // accessibility: announce to screen readers
    c.setAttribute('role', 'status');
    c.setAttribute('aria-live', 'polite');
    c.setAttribute('aria-atomic', 'true');
    document.body.appendChild(c);
  }

  function ensureAriaLive() {
    if (document.getElementById('profileAriaLive')) return;
    const d = document.createElement('div');
    d.id = 'profileAriaLive';
    d.setAttribute('aria-live', 'polite');
    d.setAttribute('aria-atomic', 'true');
    d.style.position = 'absolute';
    d.style.left = '-9999px';
    d.style.width = '1px';
    d.style.height = '1px';
    document.body.appendChild(d);
  }

  function announce(msg) {
    ensureAriaLive();
    const el = document.getElementById('profileAriaLive');
    if (el) el.textContent = msg;
  }

  function showToast(msg, type) {
    ensureToastContainer();
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'pc-toast ' + (type === 'error' ? 'pc-toast-error' : 'pc-toast-success');
    t.textContent = msg;
    t.style.marginTop = '8px';
    t.style.padding = '8px 12px';
    t.style.borderRadius = '8px';
    t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    t.style.background = type === 'error' ? '#f8d7da' : '#e6f0ff';
    t.style.color = type === 'error' ? '#842029' : '#073763';
    t.style.fontSize = '14px';
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 220ms ease-out'; setTimeout(() => { try { container.removeChild(t); } catch (e) {} }, 300); }, 3000);
  }

  function renderAddresses(addrs) {
    const root = document.getElementById('profileContent');
    if (!root) return;
    const list = root.querySelector('#addressesList');
    list.innerHTML = '';
    if (!addrs || addrs.length === 0) { list.innerHTML = '<div class="small-muted">No addresses found.</div>'; return; }
    addrs.forEach(a => {
      const div = document.createElement('div');
      div.className = 'address-item';
      // only show address text (no name/phone). display in requested order
      const parts = [];
      if (a.line1) parts.push(escapeHtml(a.line1));
      if (a.village) parts.push(escapeHtml(a.village));
      if (a.town) parts.push(escapeHtml(a.town));
      if (a.city) parts.push(escapeHtml(a.city));
      if (a.country) parts.push(escapeHtml(a.country));
      if (a.postal) parts.push(escapeHtml(a.postal));
      const addrText = parts.join(', ');
      const defaultBadge = a.isDefault ? '<span class="addr-badge default">Default</span>' : '';
      const setDefaultBtn = a.isDefault ? '' : `<button class="btn-ghost" data-id="${a.id}" data-action="set-default">Set as default</button>`;
      div.innerHTML = `<div style="max-width:78%"><div style="font-weight:600">${addrText}</div>${defaultBadge}</div><div class="address-actions">${setDefaultBtn}<button class="btn-ghost" data-id="${a.id}" data-action="edit">Edit</button> <button class="btn-ghost" data-id="${a.id}" data-action="delete">Delete</button></div>`;
      list.appendChild(div);
    });
  }

  // render add/edit form inside the page instead of prompts
  function renderAddressForm(opts) {
    // opts: { mode: 'add'|'edit', address: {...}, onSave: fn, onCancel: fn }
    const root = document.getElementById('profileContent'); if (!root) return;
    const container = root.querySelector('#addressFormContainer');
    container.innerHTML = '';
    const form = document.createElement('div');
    form.className = 'address-inline-form';
    const a = opts && opts.address ? opts.address : {};
    // include a visible title to ensure the new form is loaded (helps detect caching)
    form.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
        <div style="grid-column:1/3;font-weight:700;color:var(--text);">Address Form</div>
        <input id="af_line1" placeholder="Street / Line 1" value="${escapeHtml(a.line1||'')}" style="grid-column:1/3" />
        <input id="af_village" placeholder="Village" value="${escapeHtml(a.village||'')}" />
        <input id="af_town" placeholder="Town" value="${escapeHtml(a.town||'')}" />
        <input id="af_city" placeholder="City" value="${escapeHtml(a.city||'')}" />
        <input id="af_country" placeholder="Country" value="${escapeHtml(a.country||'')}" />
        <input id="af_postal" placeholder="Postal code" value="${escapeHtml(a.postal||'')}" />
        <input id="af_label" placeholder="Label (optional)" value="${escapeHtml(a.label||'')}" style="grid-column:1/2" />
        <div style="display:flex;gap:8px;align-items:center;">
          <label style="font-size:13px;display:flex;gap:6px;align-items:center;"><input type="checkbox" id="af_default" ${a.isDefault? 'checked' : ''}/> Set as default</label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="af_cancel" class="btn cancel-btn">Cancel</button>
          <button id="af_save" class="btn primary">Save</button>
        </div>
      </div>`;
    container.appendChild(form);
    // focus first input for keyboard users
    setTimeout(() => {
      const first = document.getElementById('af_line1');
      if (first) try { first.focus(); } catch (e) {}
    }, 50);

    const save = async () => {
      const saveBtnEl = document.getElementById('af_save');
      const cancelBtnEl = document.getElementById('af_cancel');
      const msg = document.createElement('div');
      msg.className = 'address-form-msg';
      msg.style.marginTop = '8px';
      msg.style.fontSize = '14px';
      msg.style.minHeight = '18px';
      form.appendChild(msg);

      const payload = {
        label: document.getElementById('af_label').value.trim(),
        line1: document.getElementById('af_line1').value.trim(),
        village: document.getElementById('af_village').value.trim(),
        town: document.getElementById('af_town').value.trim(),
        city: document.getElementById('af_city').value.trim(),
        country: document.getElementById('af_country').value.trim(),
        postal: document.getElementById('af_postal').value.trim(),
        isDefault: !!document.getElementById('af_default').checked
      };
      if (!payload.line1) { msg.textContent = 'Street / line1 required'; msg.style.color = '#b94a48'; return; }

      // disable buttons during save
      if (saveBtnEl) saveBtnEl.disabled = true;
      if (cancelBtnEl) cancelBtnEl.disabled = true;

      try {
        let res;
        if (opts && opts.mode === 'edit' && opts.address && opts.address.id) {
          res = await fetch('/api/addresses/' + encodeURIComponent(opts.address.id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
        } else {
          res = await fetch('/api/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
        }

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const errText = (json && json.error) ? json.error : await res.text().catch(() => 'Save failed');
          msg.textContent = errText || 'Save failed';
          msg.style.color = '#b94a48';
          announce('Address save failed');
          showToast(errText || 'Save failed', 'error');
        } else {
          msg.textContent = 'Saved';
          msg.style.color = '#2b6fb3';
          announce('Address saved');
          showToast('Address saved', 'success');
          // small delay so user sees success
          setTimeout(() => {
            container.innerHTML = '';
            if (typeof (opts && opts.onSave) === 'function') try { opts.onSave(); } catch (e) {}
            loadAddresses();
            // return focus to Add Address button for keyboard users
            const addBtn = document.getElementById('addAddressBtn');
            if (addBtn) try { addBtn.focus(); } catch (e) {}
          }, 350);
        }
      } catch (e) {
        msg.textContent = 'Save failed';
        msg.style.color = '#b94a48';
        announce('Address save failed');
        showToast('Save failed', 'error');
      } finally {
        if (saveBtnEl) saveBtnEl.disabled = false;
        if (cancelBtnEl) cancelBtnEl.disabled = false;
      }
    };

    document.getElementById('af_cancel').addEventListener('click', () => { container.innerHTML = ''; });
    document.getElementById('af_save').addEventListener('click', save);
  }

  function bindProfileUI() {
    const root = document.getElementById('profileContent');
    if (!root) return;

    // avatar upload & button (left column)
    const avatarInput = root.querySelector('#avatarUploadInput');
    const uploadBtn = root.querySelector('#uploadAvatarBtn');
    if (uploadBtn && avatarInput) {
      uploadBtn.style.display = '';
      uploadBtn.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', async function (e) {
        const file = e.target.files && e.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = function (ev) { const img = root.querySelector('#profileAvatar'); if (img) img.src = ev.target.result; const ph = root.querySelector('#avatarPlaceholder'); if (ph) ph.style.display = 'none'; };
        reader.readAsDataURL(file);
        try { const form = new FormData(); form.append('avatar', file); await fetch('/api/me/avatar', { method: 'POST', body: form, credentials: 'include' }); } catch (err) { console.warn('Avatar upload failed', err); }
      });
    }

    // tabs (profile-tab buttons)
    const tabs = root.querySelectorAll('.profile-tab');
    tabs.forEach(t => {
      t.addEventListener('click', function () {
        const target = this.getAttribute('data-tab');
        tabs.forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        root.querySelectorAll('.tab-panel').forEach(p => {
          const show = p.id === target;
          p.style.display = show ? 'block' : 'none';
          p.setAttribute('aria-hidden', show ? 'false' : 'true');
        });
        // show/hide left avatar column only for profile tab
        const leftCol = root.querySelector('.profile-left');
        if (leftCol) leftCol.style.display = (target === 'profileTab') ? '' : 'none';
        // show/hide left avatar column only for profile tab (settings removed)
        // no special right-container border logic
      });
    });

    // initial left column visibility based on the active tab
    (function () {
      const active = root.querySelector('.profile-tab.active');
      const current = active ? active.getAttribute('data-tab') : 'profileTab';
      const leftCol = root.querySelector('.profile-left');
      if (leftCol) leftCol.style.display = (current === 'profileTab') ? '' : 'none';
      // no settings tab - nothing to toggle for right container border
    })();

    // edit/save/cancel
    const editBtn = root.querySelector('#editProfileBtn');
    const saveBtn = root.querySelector('#saveProfileBtn');
    const cancelBtn = root.querySelector('#cancelProfileBtn');
    function enterEditMode() {
      const inputs = root.querySelectorAll('#inputProfileName, #inputProfilePhone, #inputProfileEmail');
      inputs.forEach(i => i && (i.disabled = false));
      // show inputs, hide spans
      root.querySelectorAll('.edit-input').forEach(n => n.classList.remove('hidden'));
      root.querySelectorAll('.info-value').forEach(n => n.classList.add('hidden'));
      if (saveBtn) saveBtn.classList.remove('hidden');
      if (cancelBtn) cancelBtn.classList.remove('hidden');
      if (editBtn) editBtn.classList.add('hidden');
      // focus first input
      const first = root.querySelector('#inputProfileName'); if (first) try { first.focus(); } catch (e) {}
    }
    function exitEditMode() {
      const inputs = root.querySelectorAll('#inputProfileName, #inputProfilePhone, #inputProfileEmail');
      inputs.forEach(i => i && (i.disabled = true));
      // hide inputs, show spans
      root.querySelectorAll('.edit-input').forEach(n => n.classList.add('hidden'));
      root.querySelectorAll('.info-value').forEach(n => n.classList.remove('hidden'));
      if (saveBtn) saveBtn.classList.add('hidden');
      if (cancelBtn) cancelBtn.classList.add('hidden');
      if (editBtn) editBtn.classList.remove('hidden');
    }
    if (editBtn) editBtn.addEventListener('click', () => enterEditMode());
    if (cancelBtn) cancelBtn.addEventListener('click', () => { exitEditMode(); loadUser(); });
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const inputName = root.querySelector('#inputProfileName');
      const inputPhone = root.querySelector('#inputProfilePhone');
      const inputEmail = root.querySelector('#inputProfileEmail');
      const payload = { name: inputName ? inputName.value.trim() : '', phone: inputPhone ? inputPhone.value.trim() : '', email: inputEmail ? inputEmail.value.trim() : '' };
      const saveBtnEl = saveBtn; const cancelBtnEl = cancelBtn;
      if (saveBtnEl) saveBtnEl.disabled = true; if (cancelBtnEl) cancelBtnEl.disabled = true;
      try {
        const res = await fetch('/api/me', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
        if (res.ok) {
          loadUser();
          exitEditMode();
          showToast('Profile saved', 'success');
          announce('Profile saved');
        } else {
          const json = await res.json().catch(() => null);
          const errText = (json && json.error) ? json.error : await res.text().catch(() => 'Save failed');
          showToast(errText || 'Save failed', 'error');
          announce('Profile save failed');
        }
      } catch (e) {
        console.warn('Profile save error', e);
        showToast('Save failed', 'error');
        announce('Profile save failed');
      } finally {
        if (saveBtnEl) saveBtnEl.disabled = false; if (cancelBtnEl) cancelBtnEl.disabled = false;
      }
    });

    // addresses delegated
    const addressesList = root.querySelector('#addressesList');
    if (addressesList) {
      addressesList.addEventListener('click', function (ev) {
        const btn = ev.target.closest('button'); if (!btn) return;
        const action = btn.getAttribute('data-action'); const id = btn.getAttribute('data-id');
        if (action === 'edit') editAddress(id);
        else if (action === 'delete') deleteAddress(id);
        else if (action === 'set-default') setDefault(id);
      });
    }

    const addAddressBtn = root.querySelector('#addAddressBtn');
    if (addAddressBtn) addAddressBtn.addEventListener('click', () => addAddress());
    // Ensure aria-live and toast support for accessibility and feedback
    ensureAriaLive();
    ensureToastContainer();

    // no settings-specific handlers (settings tab removed)

    // logout button (styled pill)
    const logoutBtn = root.querySelector('#logoutFromProfile');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (typeof logout === 'function') return logout();
        fetch('/logout', { method: 'POST', credentials: 'include' }).then(() => window.location.reload()).catch(() => window.location.href = '/');
      });
    }
  }

  function editAddress(id) {
    // render inline edit form
    // fetch address details to prefill
    fetch('/api/addresses', { credentials: 'include' }).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      const a = (data.addresses || []).find(x => String(x.id) === String(id));
      renderAddressForm({ mode: 'edit', address: a });
    }).catch(() => { alert('Failed to load address'); });
  }

  function deleteAddress(id) {
    if (!confirm('Delete this address?')) return; fetch('/api/addresses/' + encodeURIComponent(id), { method: 'DELETE', credentials: 'include' }).then(() => { loadAddresses(); const settingsList = document.getElementById('profileContent'); if (settingsList) { setTimeout(() => { try { window._loadProfilePartial && window._loadProfilePartial(); } catch (e){} }, 50); } }).catch(() => loadAddresses());
  }

  function setDefault(id) {
    fetch('/api/addresses/' + encodeURIComponent(id) + '/default', { method: 'POST', credentials: 'include' }).then(() => { loadAddresses(); }).catch(() => loadAddresses());
  }

  function addAddress() {
    // show inline add form
    renderAddressForm({ mode: 'add', onSave: () => { loadAddresses(); } });
  }

  // load on DOMContentLoaded so profile area is ready even if hidden
  document.addEventListener('DOMContentLoaded', function () { setTimeout(loadProfilePartial, 50); });

  // expose for debugging
  window._loadProfilePartial = loadProfilePartial;
})();
