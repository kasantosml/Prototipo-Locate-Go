/**
 * SETTINGS APP — app.js
 * =====================
 * Arquitetura modular. Cada módulo é isolado e independente.
 * Persistência via localStorage (módulo Storage).
 *
 * Módulos:
 *  Storage     → Abstração do localStorage
 *  Toast       → Notificações visuais temporárias
 *  Modal       → Controle de bottom-sheets
 *  Profile     → Perfil do usuário
 *  Distance    → Slider de raio de busca
 *  Location    → GPS real (watchPosition + Nominatim + Overpass)
 *  Category    → Chips de categoria de interesse
 *  Toggles     → Switches on/off
 *  Theme       → Alternância de tema claro/escuro/auto
 *  Language    → Seleção de idioma
 *  NavActions  → Header: voltar / salvar tudo
 *  App         → Inicializador principal
 */

'use strict';

/* =========================================================
   MÓDULO: Storage
   Camada fina sobre o localStorage, com tratamento de erros.
   ========================================================= */
const Storage = {
  /**
   * Lê e desserializa um valor do localStorage.
   * @param {string} key
   * @param {*} fallback - valor padrão quando a chave não existe
   * @returns {*}
   */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Serializa e grava um valor no localStorage.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Storage] Falha ao salvar:', key, e);
    }
  }
};

/* =========================================================
   MÓDULO: Toast
   Exibe mensagens temporárias na parte inferior da tela.
   ========================================================= */
const Toast = (() => {
  const el = document.getElementById('toast');
  let timer = null;

  /**
   * Mostra o toast por `duration` milissegundos.
   * @param {string} message
   * @param {number} duration
   */
  function show(message, duration = 2200) {
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('show'), duration);
  }

  return { show };
})();

/* =========================================================
   MÓDULO: Modal
   Controla abertura e fechamento das bottom-sheets.
   ========================================================= */
const Modal = (() => {
  function open(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('open');
    const firstInput = overlay.querySelector('input, select, button:not(.btn-icon)');
    setTimeout(() => firstInput?.focus(), 320);
  }

  function close(id) {
    document.getElementById(id)?.classList.remove('open');
  }

  /** Fecha ao clicar fora do card. */
  function initOverlayClose() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });
  }

  return { open, close, initOverlayClose };
})();

/* =========================================================
   MÓDULO: Profile
   Exibe e permite editar nome, e-mail e avatar do usuário.
   ========================================================= */
const Profile = (() => {
  const elName = document.getElementById('profile-name');
  const elEmail = document.getElementById('profile-email');
  const elAvatar = document.getElementById('profile-avatar');
  const inputName = document.getElementById('input-name');
  const inputEmail = document.getElementById('input-email');

  const DEFAULTS = {
    name: 'Abner Souza',
    email: 'abner@exemplo.com'
  };

  function load() {
    const data = Storage.get('profile', DEFAULTS);
    elName.textContent = data.name || DEFAULTS.name;
    elEmail.textContent = data.email || DEFAULTS.email;
    // Avatar gerado pelo DiceBear com base no nome
    const seed = encodeURIComponent(data.name || DEFAULTS.name);
    elAvatar.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4`;
  }

  function fillModal() {
    const data = Storage.get('profile', DEFAULTS);
    inputName.value = data.name || '';
    inputEmail.value = data.email || '';
  }

  function save() {
    const name = inputName.value.trim();
    const email = inputEmail.value.trim();
    if (!name || !email) { Toast.show('⚠️ Preencha todos os campos'); return; }
    Storage.set('profile', { name, email });
    load();
    Modal.close('modal-edit-profile');
    Toast.show('✅ Perfil atualizado!');
  }

  function logout() {
    localStorage.clear();
    Modal.close('modal-logout');
    Toast.show('👋 Até logo!');
    setTimeout(() => location.reload(), 1200);
  }

  function init() {
    load();
    document.getElementById('btn-edit-profile').addEventListener('click', () => { fillModal(); Modal.open('modal-edit-profile'); });
    document.getElementById('btn-edit-avatar').addEventListener('click', () => { fillModal(); Modal.open('modal-edit-profile'); });
    document.getElementById('btn-modal-save').addEventListener('click', save);
    document.getElementById('btn-modal-cancel').addEventListener('click', () => Modal.close('modal-edit-profile'));
    document.getElementById('btn-close-modal').addEventListener('click', () => Modal.close('modal-edit-profile'));
    document.getElementById('btn-logout').addEventListener('click', () => Modal.open('modal-logout'));
    document.getElementById('btn-logout-cancel').addEventListener('click', () => Modal.close('modal-logout'));
    document.getElementById('btn-logout-confirm').addEventListener('click', logout);
  }

  return { init };
})();

/* =========================================================
   MÓDULO: Distance
   Slider de raio de busca com fill colorido dinâmico.
   O valor é lido pelo módulo Location ao buscar locais.
   ========================================================= */
const Distance = (() => {
  const slider = document.getElementById('distance-slider');
  const badge = document.getElementById('distance-badge');

  function updateFill(val) {
    const min = Number(slider.min);
    const max = Number(slider.max);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background =
      `linear-gradient(to right, var(--accent) ${pct}%, var(--bg-input) ${pct}%)`;
  }

  function update(val) {
    badge.textContent = `${val} km`;
    updateFill(val);
    badge.style.transform = 'scale(1.12)';
    setTimeout(() => (badge.style.transform = 'scale(1)'), 200);
  }

  /** Retorna o raio atual em metros (para uso no Location). */
  function getRadiusMeters() {
    return Number(slider.value) * 1000;
  }

  function init() {
    const saved = Storage.get('distance', 10);
    slider.value = saved;
    update(saved);

    slider.addEventListener('input', () => {
      const val = Number(slider.value);
      update(val);
      Storage.set('distance', val);
    });
  }

  return { init, getRadiusMeters };
})();

/* =========================================================
   MÓDULO: Location
   ─────────────────────────────────────────────────────────
   GPS real com watchPosition + Nominatim + Overpass API.
   Mirrors Overpass com fallback automático em caso de falha.
   ========================================================= */
const Location = (() => {

  /* ── DOM ── */
  const btn = document.getElementById('btn-location');
  const statusTxt = document.getElementById('location-status-text');
  const indicator = document.getElementById('location-indicator');
  const gpsTextEl = document.getElementById('gps-text');
  const placesContainer = document.getElementById('places-container');

  /* ── Estado ── */
  let watchId = null;
  let isActive = false;
  let lastLat = null;
  let lastLon = null;
  let fetchTimer = null;

  /* ─────────────────────────────────────────────────────
     MIRRORS Overpass — tentados em sequência se falhar
  ───────────────────────────────────────────────────── */
  const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter'
  ];

  /* ─────────────────────────────────────────────────────
     MAPEAMENTO categoria → pares tag/value Overpass
     Inclui variações regionais brasileiras (ex: lanchonete)
  ───────────────────────────────────────────────────── */
  const CATEGORY_MAP = {
    restaurants: [
      { tag: 'amenity', value: 'restaurant' },
      { tag: 'amenity', value: 'cafe' },
      { tag: 'amenity', value: 'fast_food' },
      { tag: 'amenity', value: 'bar' },
      { tag: 'amenity', value: 'food_court' },
      { tag: 'amenity', value: 'ice_cream' }
    ],
    stores: [
      { tag: 'shop', value: 'supermarket' },
      { tag: 'shop', value: 'clothes' },
      { tag: 'shop', value: 'convenience' },
      { tag: 'shop', value: 'bakery' },
      { tag: 'shop', value: 'butcher' },
      { tag: 'shop', value: 'general' },
      { tag: 'shop', value: 'variety_store' },
      { tag: 'amenity', value: 'marketplace' }
    ],
    events: [
      { tag: 'amenity', value: 'theatre' },
      { tag: 'amenity', value: 'cinema' },
      { tag: 'leisure', value: 'stadium' },
      { tag: 'amenity', value: 'nightclub' },
      { tag: 'tourism', value: 'attraction' }
    ],
    health: [
      { tag: 'amenity', value: 'hospital' },
      { tag: 'amenity', value: 'clinic' },
      { tag: 'amenity', value: 'pharmacy' },
      { tag: 'amenity', value: 'dentist' },
      { tag: 'amenity', value: 'doctors' },
      { tag: 'amenity', value: 'health_post' }
    ],
    education: [
      { tag: 'amenity', value: 'school' },
      { tag: 'amenity', value: 'university' },
      { tag: 'amenity', value: 'library' },
      { tag: 'amenity', value: 'college' },
      { tag: 'amenity', value: 'kindergarten' }
    ],
    sports: [
      { tag: 'leisure', value: 'sports_centre' },
      { tag: 'leisure', value: 'fitness_centre' },
      { tag: 'leisure', value: 'pitch' },
      { tag: 'leisure', value: 'swimming_pool' },
      { tag: 'leisure', value: 'playground' }
    ],
    culture: [
      { tag: 'tourism', value: 'museum' },
      { tag: 'amenity', value: 'arts_centre' },
      { tag: 'amenity', value: 'place_of_worship' },
      { tag: 'tourism', value: 'gallery' },
      { tag: 'historic', value: 'monument' }
    ],
    services: [
      { tag: 'amenity', value: 'bank' },
      { tag: 'amenity', value: 'atm' },
      { tag: 'amenity', value: 'post_office' },
      { tag: 'amenity', value: 'fuel' },
      { tag: 'amenity', value: 'police' },
      { tag: 'amenity', value: 'fire_station' }
    ],
    nature: [
      { tag: 'leisure', value: 'park' },
      { tag: 'leisure', value: 'garden' },
      { tag: 'leisure', value: 'nature_reserve' },
      { tag: 'natural', value: 'beach' }
    ]
  };

  /* ─────────────────────────────────────────────────────
     MAPEAMENTO valor Overpass → { label, icon }
  ───────────────────────────────────────────────────── */
  const TAG_META = {
    restaurant: { label: 'Restaurante', icon: 'bi-cup-hot-fill' },
    cafe: { label: 'Café', icon: 'bi-cup-hot-fill' },
    fast_food: { label: 'Lanchonete', icon: 'bi-bag-fill' },
    bar: { label: 'Bar', icon: 'bi-cup-straw' },
    food_court: { label: 'Praça de Alimentação', icon: 'bi-shop' },
    ice_cream: { label: 'Sorveteria', icon: 'bi-cup-hot-fill' },
    supermarket: { label: 'Mercado', icon: 'bi-cart-fill' },
    clothes: { label: 'Roupas', icon: 'bi-bag-heart-fill' },
    convenience: { label: 'Conveniência', icon: 'bi-shop-window' },
    bakery: { label: 'Padaria', icon: 'bi-egg-fried' },
    butcher: { label: 'Açougue', icon: 'bi-scissors' },
    general: { label: 'Loja Geral', icon: 'bi-grid-fill' },
    variety_store: { label: 'Variedades', icon: 'bi-stars' },
    marketplace: { label: 'Mercado Público', icon: 'bi-shop' },
    theatre: { label: 'Teatro', icon: 'bi-film' },
    cinema: { label: 'Cinema', icon: 'bi-camera-reels-fill' },
    stadium: { label: 'Estádio', icon: 'bi-trophy-fill' },
    nightclub: { label: 'Balada', icon: 'bi-music-note-beamed' },
    attraction: { label: 'Atração', icon: 'bi-star-fill' },
    hospital: { label: 'Hospital', icon: 'bi-hospital-fill' },
    clinic: { label: 'Clínica', icon: 'bi-heart-pulse-fill' },
    pharmacy: { label: 'Farmácia', icon: 'bi-capsule' },
    dentist: { label: 'Dentista', icon: 'bi-emoji-smile-fill' },
    doctors: { label: 'Médico', icon: 'bi-person-fill' },
    health_post: { label: 'Posto de Saúde', icon: 'bi-heart-pulse-fill' },
    school: { label: 'Escola', icon: 'bi-mortarboard-fill' },
    university: { label: 'Universidade', icon: 'bi-book-fill' },
    library: { label: 'Biblioteca', icon: 'bi-journals' },
    college: { label: 'Faculdade', icon: 'bi-mortarboard-fill' },
    kindergarten: { label: 'Creche', icon: 'bi-balloon-fill' },
    sports_centre: { label: 'Centro Esportivo', icon: 'bi-dribbble' },
    fitness_centre: { label: 'Academia', icon: 'bi-bicycle' },
    pitch: { label: 'Campo', icon: 'bi-trophy-fill' },
    swimming_pool: { label: 'Piscina', icon: 'bi-water' },
    playground: { label: 'Parquinho', icon: 'bi-balloon-fill' },
    museum: { label: 'Museu', icon: 'bi-bank2' },
    arts_centre: { label: 'Centro Cultural', icon: 'bi-palette-fill' },
    place_of_worship: { label: 'Igreja/Templo', icon: 'bi-building-fill' },
    gallery: { label: 'Galeria', icon: 'bi-image-fill' },
    monument: { label: 'Monumento', icon: 'bi-building' },
    bank: { label: 'Banco', icon: 'bi-bank' },
    atm: { label: 'Caixa Eletrônico', icon: 'bi-credit-card-fill' },
    post_office: { label: 'Correios', icon: 'bi-envelope-fill' },
    fuel: { label: 'Posto de Gasolina', icon: 'bi-truck-front-fill' },
    police: { label: 'Delegacia', icon: 'bi-shield-fill' },
    fire_station: { label: 'Bombeiros', icon: 'bi-fire' },
    park: { label: 'Parque', icon: 'bi-tree-fill' },
    garden: { label: 'Jardim', icon: 'bi-flower1' },
    nature_reserve: { label: 'Reserva Natural', icon: 'bi-tree' },
    beach: { label: 'Praia', icon: 'bi-water' }
  };

  /* ─────────────────────────────────────────────────────
     Chaves de classificação em ordem de prioridade
  ───────────────────────────────────────────────────── */
  const CLASSIFY_KEYS = ['amenity', 'shop', 'leisure', 'tourism', 'historic', 'natural'];

  function resolveMeta(tags) {
    for (const key of CLASSIFY_KEYS) {
      const val = tags[key];
      if (val && TAG_META[val]) return TAG_META[val];
    }
    return { label: 'Local', icon: 'bi-geo-alt-fill' };
  }

  /* ─────────────────────────────────────────────────────
     DISTÂNCIA — Haversine, retorna km numérico
  ───────────────────────────────────────────────────── */
  function calcKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180)
      * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDist(km) {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    if (km < 10) return `${km.toFixed(1)}km`;
    return `${Math.round(km)}km`;
  }

  /* ─────────────────────────────────────────────────────
     COORDENADAS de um elemento (node direto ou way/center)
  ───────────────────────────────────────────────────── */
  function getCoords(el) {
    if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
    if (el.center?.lat != null) return { lat: el.center.lat, lon: el.center.lon };
    return null;
  }

  /* ─────────────────────────────────────────────────────
     UI helpers
  ───────────────────────────────────────────────────── */
  function setButtonActive(active) {
    btn.dataset.active = String(active);
    btn.setAttribute('aria-pressed', String(active));
    btn.innerHTML = active
      ? '<i class="bi bi-geo-alt-fill"></i><span>Desativar</span>'
      : '<i class="bi bi-geo-alt-fill"></i><span>Ativar</span>';
  }

  function showIndicator(html) { indicator.classList.add('visible'); indicator.innerHTML = html; }
  function hideIndicator() { indicator.classList.remove('visible'); }
  function setStatus(t) { statusTxt.textContent = t; }
  function setGpsText(t) { if (gpsTextEl) gpsTextEl.textContent = t; }

  function showLoading() {
    placesContainer.innerHTML = `
      <div class="empty-places">
        <i class="bi bi-arrow-repeat" style="font-size:22px;display:block;margin-bottom:8px;
           animation:spin 1s linear infinite;color:var(--accent)"></i>
        Buscando locais próximos…
      </div>`;
  }

  function showEmpty(msg) {
    placesContainer.innerHTML =
      `<div class="empty-places">${msg || 'Nenhum local encontrado. Tente aumentar o raio de busca.'}</div>`;
  }

  function showError(detail) {
    placesContainer.innerHTML = `
      <div class="empty-places">
        ⚠️ Erro ao buscar locais.<br>
        <small style="opacity:.7">${detail || 'Verifique sua conexão.'}</small>
      </div>`;
  }

  function showInactive() {
    placesContainer.innerHTML =
      `<div class="empty-places">Ative sua localização para buscar lugares próximos</div>`;
  }

  /* ─────────────────────────────────────────────────────
     MONTA A QUERY OVERPASS
     Apenas nodes com name para garantir lat/lon direto.
     Raio mínimo de 5km para garantir resultados em cidades
     menores com dados OSM menos densos.
  ───────────────────────────────────────────────────── */
  function buildQuery(lat, lon, radiusM, categories) {
    const seen = new Set();
    const filters = [];

    categories.forEach(catId => {
      (CATEGORY_MAP[catId] || []).forEach(rule => {
        const k = `${rule.tag}=${rule.value}`;
        if (!seen.has(k)) { seen.add(k); filters.push(rule); }
      });
    });

    if (!filters.length) return null;

    // Raio mínimo: 5km — aumenta cobertura sem onerar a API
    const r = Math.max(radiusM, 5000);

    // node + way (com center) para cobertura máxima
    const blocks = filters.flatMap(({ tag, value }) => [
      `node["${tag}"="${value}"](around:${r},${lat},${lon});`,
      `way["${tag}"="${value}"](around:${r},${lat},${lon});`
    ]).join('\n  ');

    return `[out:json][timeout:30];\n(\n  ${blocks}\n);\nout center qt;`;
  }

  /* ─────────────────────────────────────────────────────
     FETCH COM FALLBACK DE MIRRORS
     Tenta cada mirror em sequência; para no primeiro sucesso.
  ───────────────────────────────────────────────────── */
  async function fetchOverpass(query) {
    let lastErr;
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          body: query,
          headers: { 'Content-Type': 'text/plain' },
          signal: AbortSignal.timeout(20000) // 20s por mirror
        });

        // Valida content-type antes de parsear como JSON
        const ct = res.headers.get('content-type') || '';
        const text = await res.text();

        if (!ct.includes('json') && !text.trim().startsWith('{')) {
          throw new Error(`Resposta não-JSON do mirror ${mirror}`);
        }

        const data = JSON.parse(text);
        console.info(`[Location] Overpass OK via ${mirror} — ${(data.elements || []).length} elementos`);
        return data;

      } catch (err) {
        console.warn(`[Location] Mirror falhou: ${mirror}`, err.message);
        lastErr = err;
      }
    }
    throw lastErr || new Error('Todos os mirrors Overpass falharam');
  }

  /* ─────────────────────────────────────────────────────
     GEOCODIFICAÇÃO REVERSA — Nominatim
  ───────────────────────────────────────────────────── */
  async function reverseGeocode(lat, lon) {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    return {
      city: addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Cidade desconhecida',
      state: addr.state || ''
    };
  }

  /* ─────────────────────────────────────────────────────
     BUSCA + RENDERIZA LOCAIS
  ───────────────────────────────────────────────────── */
  async function fetchAndRender(lat, lon) {
    const categories = Storage.get('categories', ['restaurants', 'events']);

    if (!categories.length) {
      showEmpty('Selecione ao menos uma categoria de interesse acima.');
      return;
    }

    const radiusM = Distance.getRadiusMeters();
    const query = buildQuery(lat, lon, radiusM, categories);

    if (!query) { showEmpty(); return; }

    showLoading();

    try {
      const data = await fetchOverpass(query);
      const elements = data.elements || [];

      // 1. Filtra: precisa de name E coordenadas válidas
      const valid = elements.filter(el => {
        if (!el.tags?.name) return false;
        return getCoords(el) !== null;
      });

      if (!valid.length) {
        showEmpty(`Nenhum local encontrado num raio de ${Math.round(Distance.getRadiusMeters() / 1000)}km. Tente aumentar o raio.`);
        return;
      }

      // 2. Deduplica por nome (node e way do mesmo lugar)
      const namesSeen = new Set();
      const unique = valid.filter(el => {
        const k = el.tags.name.trim().toLowerCase();
        if (namesSeen.has(k)) return false;
        namesSeen.add(k);
        return true;
      });

      // 3. Ordena por distância real
      const sorted = unique
        .map(el => {
          const c = getCoords(el);
          return { ...el, _km: calcKm(lat, lon, c.lat, c.lon) };
        })
        .sort((a, b) => a._km - b._km)
        .slice(0, 15);

      renderCards(sorted);

    } catch (err) {
      console.error('[Location] fetchAndRender:', err);
      showError(err.message);
    }
  }

  /* ─────────────────────────────────────────────────────
     RENDERIZA OS CARDS
  ───────────────────────────────────────────────────── */
  function renderCards(places) {
    placesContainer.innerHTML = '';
    const frag = document.createDocumentFragment();

    places.forEach((place, i) => {
      const meta = resolveMeta(place.tags);
      const name = place.tags.name.trim();
      const dist = formatDist(place._km);

      const card = document.createElement('div');
      card.className = 'place-card';
      card.style.animationDelay = `${i * 0.04}s`;
      card.innerHTML = `
        <div class="place-left">
          <div class="place-icon"><i class="bi ${meta.icon}"></i></div>
          <div class="place-info">
            <div class="place-name">${name}</div>
            <div class="place-category">${meta.label}</div>
          </div>
        </div>
        <div class="place-distance">
          <i class="bi bi-signpost-2-fill" style="font-size:10px;opacity:.6"></i>
          ${dist}
        </div>`;
      frag.appendChild(card);
    });

    placesContainer.appendChild(frag);
  }

  /* ─────────────────────────────────────────────────────
     ATIVAR GPS
  ───────────────────────────────────────────────────── */
  function activate() {
    if (!navigator.geolocation) {
      setStatus('GPS não suportado');
      Toast.show('⚠️ Seu dispositivo não suporta geolocalização');
      return;
    }

    isActive = true;
    setButtonActive(true);
    setStatus('Buscando localização…');
    showIndicator('<span class="pulse-dot"></span><span>Conectando ao GPS…</span>');
    setGpsText('Aguardando sinal…');
    showLoading();
    Storage.set('locationActive', true);

    watchId = navigator.geolocation.watchPosition(
      /* sucesso */
      async (pos) => {
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        lastLat = lat;
        lastLon = lon;

        setGpsText(`GPS ativo • precisão ${Math.round(accuracy)}m`);
        Storage.set('userLocation', { latitude: lat, longitude: lon, accuracy, timestamp: new Date().toISOString() });

        // Geocodificação reversa (não bloqueia a busca de locais)
        reverseGeocode(lat, lon)
          .then(({ city, state }) => {
            setStatus(`${city}, ${state}`);
            showIndicator(`<span class="pulse-dot"></span><span>📍 ${city}, ${state} — ativo</span>`);
          })
          .catch(() => {
            setStatus('Localização ativa');
            showIndicator('<span class="pulse-dot"></span><span>📍 GPS conectado</span>');
          });

        // Debounce: espera 1.5s antes de chamar Overpass
        clearTimeout(fetchTimer);
        fetchTimer = setTimeout(() => fetchAndRender(lat, lon), 1500);
      },

      /* erro */
      (err) => {
        isActive = false;
        setButtonActive(false);
        hideIndicator();
        Storage.set('locationActive', false);
        showInactive();

        const msgs = {
          1: '🚫 Permissão de GPS negada. Habilite nas configurações do navegador.',
          2: '📡 Sinal GPS indisponível.',
          3: '⏱️ Tempo esgotado ao obter localização.'
        };
        const msg = msgs[err.code] || '❌ Erro ao obter localização.';
        setStatus(msg.replace(/^.{2}\s/, ''));
        Toast.show(msg, 3500);
        console.error('[Location] GPS error:', err);
      },

      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  /* ─────────────────────────────────────────────────────
     DESATIVAR GPS
  ───────────────────────────────────────────────────── */
  function deactivate() {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    clearTimeout(fetchTimer);
    isActive = false; lastLat = null; lastLon = null;
    setButtonActive(false);
    setStatus('Localização desativada');
    hideIndicator();
    setGpsText('Aguardando sinal GPS…');
    showInactive();
    Storage.set('locationActive', false);
    Toast.show('🔕 Localização desativada');
  }

  /* ─────────────────────────────────────────────────────
     REFETCH — chamado por Category ao mudar seleção
  ───────────────────────────────────────────────────── */
  function refetchIfActive() {
    if (isActive && lastLat !== null) {
      clearTimeout(fetchTimer);
      fetchTimer = setTimeout(() => fetchAndRender(lastLat, lastLon), 600);
    }
  }

  /* ── INIT ── */
  function init() {
    btn.addEventListener('click', () => isActive ? deactivate() : activate());

    if (Storage.get('locationActive', false)) {
      activate();
    } else {
      showInactive();
    }
  }

  return { init, refetchIfActive };
})();

/* =========================================================
   MÓDULO: Category
   Chips de interesse do usuário.
   Ao alterar, solicita atualização dos locais próximos.
   ========================================================= */
const Category = (() => {
  const grid = document.getElementById('category-grid');

  const CATEGORIES = [
    { id: 'restaurants', label: 'Restaurantes', icon: 'bi-cup-hot-fill' },
    { id: 'stores', label: 'Lojas', icon: 'bi-bag-fill' },
    { id: 'events', label: 'Eventos', icon: 'bi-calendar-event-fill' },
    { id: 'health', label: 'Saúde', icon: 'bi-heart-pulse-fill' },
    { id: 'education', label: 'Educação', icon: 'bi-book-fill' },
    { id: 'sports', label: 'Esportes', icon: 'bi-trophy-fill' },
    { id: 'culture', label: 'Cultura', icon: 'bi-palette-fill' },
    { id: 'services', label: 'Serviços', icon: 'bi-tools' },
    { id: 'nature', label: 'Natureza', icon: 'bi-tree-fill' }
  ];

  function createChip(cat, selectedSet) {
    const btn = document.createElement('button');
    btn.className = 'category-chip' + (selectedSet.has(cat.id) ? ' selected' : '');
    btn.dataset.id = cat.id;
    btn.setAttribute('aria-pressed', String(selectedSet.has(cat.id)));
    btn.innerHTML = `<i class="bi ${cat.icon}"></i>${cat.label}`;

    btn.addEventListener('click', () => {
      const isSelected = btn.classList.toggle('selected');
      btn.setAttribute('aria-pressed', String(isSelected));

      const current = new Set(Storage.get('categories', []));
      isSelected ? current.add(cat.id) : current.delete(cat.id);
      Storage.set('categories', [...current]);

      Toast.show(isSelected ? `✅ ${cat.label} adicionado` : `❌ ${cat.label} removido`);

      // Atualiza os locais próximos conforme nova seleção
      Location.refetchIfActive();
    });

    return btn;
  }

  function init() {
    const selected = new Set(Storage.get('categories', ['restaurants', 'events']));
    const frag = document.createDocumentFragment();
    CATEGORIES.forEach(cat => frag.appendChild(createChip(cat, selected)));
    grid.appendChild(frag);
  }

  return { init };
})();

/* =========================================================
   MÓDULO: Toggles
   Todos os switches on/off da tela, gerenciados em lote.
   ========================================================= */
const Toggles = (() => {
  const TOGGLES = [
    { id: 'toggle-notifications', key: 'notificationsEnabled', def: true, onMsg: '🔔 Notificações ativadas', offMsg: '🔕 Notificações desativadas' },
    { id: 'toggle-emails', key: 'emailsEnabled', def: false, onMsg: '📧 E-mails ativados', offMsg: '📧 E-mails desativados' },
    { id: 'toggle-promos', key: 'promosEnabled', def: false, onMsg: '🎁 Promoções ativadas', offMsg: '🎁 Promoções desativadas' },
    { id: 'toggle-hide-location', key: 'hideLocation', def: false, onMsg: '👁️ Localização ocultada', offMsg: '👁️ Localização visível' },
    { id: 'toggle-private-account', key: 'privateAccount', def: false, onMsg: '🔒 Conta definida como privada', offMsg: '🔓 Conta definida como pública' }
  ];

  function init() {
    TOGGLES.forEach(({ id, key, def, onMsg, offMsg }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.checked = Storage.get(key, def);
      el.addEventListener('change', () => {
        Storage.set(key, el.checked);
        Toast.show(el.checked ? onMsg : offMsg);
      });
    });
  }

  return { init };
})();

/* =========================================================
   MÓDULO: Theme
   Alterna tema claro / escuro / automático (sistema).
   ========================================================= */
const Theme = (() => {
  const html = document.documentElement;
  const options = document.querySelectorAll('.theme-option');
  let mq = null;

  function applyTheme(theme) {
    if (mq) { mq.removeEventListener('change', onSystem); mq = null; }
    if (theme === 'auto') {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
      html.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
      mq.addEventListener('change', onSystem);
    } else {
      html.setAttribute('data-theme', theme);
    }
  }

  function onSystem(e) {
    html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }

  function updateButtons(theme) {
    options.forEach(btn => {
      const active = btn.dataset.theme === theme;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function init() {
    const saved = Storage.get('theme', 'light');
    applyTheme(saved);
    updateButtons(saved);
    options.forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.theme;
        Storage.set('theme', t);
        applyTheme(t);
        updateButtons(t);
        const label = { light: '☀️ Tema claro', dark: '🌙 Tema escuro', auto: '⚙️ Tema automático' };
        Toast.show(label[t]);
      });
    });
  }

  return { init };
})();

/* =========================================================
   MÓDULO: Language
   Dropdown de idioma (simulação — sem tradução real).
   ========================================================= */
const Language = (() => {
  const select = document.getElementById('lang-select');
  const descEl = document.getElementById('lang-desc');
  const LABELS = {
    'pt-BR': 'Português (Brasil)',
    'en-US': 'English (US)',
    'es-ES': 'Español',
    'fr-FR': 'Français',
    'de-DE': 'Deutsch'
  };

  function init() {
    const saved = Storage.get('language', 'pt-BR');
    select.value = saved;
    descEl.textContent = LABELS[saved] || saved;
    select.addEventListener('change', () => {
      const lang = select.value;
      Storage.set('language', lang);
      descEl.textContent = LABELS[lang] || lang;
      Toast.show(`🌐 Idioma: ${LABELS[lang]}`);
    });
  }

  return { init };
})();

/* =========================================================
   MÓDULO: NavActions
   Ações do header: botão voltar e botão salvar tudo.
   ========================================================= */
const NavActions = (() => {
  function init() {
    document.getElementById('btn-save-all').addEventListener('click', () => {
      Toast.show('💾 Configurações salvas!', 2500);
      const btn = document.getElementById('btn-save-all');
      btn.style.background = 'rgba(16,185,129,0.2)';
      btn.style.color = 'var(--success)';
      setTimeout(() => { btn.style.background = ''; btn.style.color = ''; }, 1200);
    });
  }

  return { init };
})();

/* =========================================================
   CSS runtime — animação de spin para o ícone de loading
   (evita editar o arquivo CSS)
   ========================================================= */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
})();

/* =========================================================
   APP — Inicializador principal
   Ordem importa: Theme antes de tudo (evita flash).
   Location depois de Distance (depende de getRadiusMeters).
   Category depois de Location (chama refetchIfActive).
   ========================================================= */
const App = {
  init() {
    Theme.init();
    Profile.init();
    Distance.init();
    Location.init();   // depende de Distance.getRadiusMeters
    Category.init();   // depende de Location.refetchIfActive
    Toggles.init();
    Language.init();
    Modal.initOverlayClose();
    NavActions.init();

    console.info('[SettingsApp] Todos os módulos inicializados ✓');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}