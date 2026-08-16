// shared helpers used by all three pages

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  var raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function saveLogin(data) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = '/';
}

// wraps fetch so every call sends the token and throws the API's own message
async function api(path, method, body) {
  var options = { method: method || 'GET', headers: {} };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  var token = getToken();
  if (token) {
    options.headers.Authorization = 'Bearer ' + token;
  }

  var res = await fetch('/api' + path, options);
  var data = await res.json();

  if (!res.ok) {
    // the token expires after 7 days, so clear it instead of showing "invalid token" forever
    if (res.status === 401 && token) logoutQuietly();
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function logoutQuietly() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function buildNav() {
  var user = getUser();
  var nav = document.querySelector('.site-head nav');
  if (!nav) return;

  if (user) {
    nav.innerHTML =
      '<a href="/docs.html">API</a>' +
      '<span class="who">' + escapeHtml(user.name) + '</span>' +
      '<a href="#" id="logoutLink">Log out</a>';
    document.getElementById('logoutLink').onclick = function (e) {
      e.preventDefault();
      logout();
    };
  } else {
    nav.innerHTML =
      '<a href="/docs.html">API</a>' +
      '<a class="button-link" href="/login.html">Log in</a>';
  }
}

// the little circle next to a name
function avatar(name, size) {
  var letter = (name || '?').trim().charAt(0);
  return '<span class="avatar' + (size === 'big' ? ' big' : '') + '">' + escapeHtml(letter) + '</span>';
}

function readingTime(text) {
  var words = (text || '').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}

function showError(el, text) {
  el.className = 'msg error';
  el.textContent = text;
  el.hidden = false;
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text == null ? '' : text;
  return div.innerHTML;
}

function formatDate(value) {
  var d = new Date(value);
  var mins = Math.round((Date.now() - d) / 60000);

  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  if (mins < 60 * 24) return Math.round(mins / 60) + ' hr ago';
  if (mins < 60 * 24 * 7) return Math.round(mins / (60 * 24)) + ' days ago';

  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', buildNav);
