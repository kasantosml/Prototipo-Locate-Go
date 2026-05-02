/**
 * SETTINGS APP — app.js
 * =====================
 * Arquitetura modular com módulos independentes por funcionalidade.
 * Todos os dados são persistidos no localStorage.
 *
 * Módulos:
 *  Storage   → Abstração do localStorage
 *  Toast     → Notificações visuais temporárias
 *  Modal     → Controle de modais (bottom sheets)
 *  Profile   → Perfil do usuário
 *  Distance  → Slider de raio de busca
 *  Location  → Ativação/desativação de GPS
 *  Category  → Chips de categoria
 *  Toggles   → Switches on/off (notificações, privacidade)
 *  Theme     → Alternância de tema (claro/escuro/auto)
 *  Language  → Seleção de idioma
 *  App       → Inicializador principal
 */

'use strict';

/* =========================================================
   MÓDULO: Storage
   Abstrai o localStorage, tratando erros de parsing
   ========================================================= */
const Storage = {
  /**
   * Carrega uma chave do localStorage.
   * @param {string} key
   * @param {*} fallback - valor padrão se não existir
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
   * Salva qualquer valor (serializado em JSON) no localStorage.
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
   Exibe mensagens temporárias na parte inferior da tela
   ========================================================= */
const Toast = (() => {
  const el = document.getElementById('toast');
  let timer = null;

  /**
   * Exibe o toast com uma mensagem por `duration` ms.
   * @param {string} message
   * @param {number} duration - milissegundos (padrão: 2200)
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
   Controla abertura/fechamento das bottom sheets modais
   ========================================================= */
const Modal = (() => {
  /**
   * Abre um modal pelo seu ID.
   * @param {string} id
   */
  function open(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('open');
    // Foca no primeiro input do modal (acessibilidade)
    const firstInput = overlay.querySelector('input, select, button:not(.btn-icon)');
    setTimeout(() => firstInput?.focus(), 320);
  }

  /**
   * Fecha um modal pelo seu ID.
   * @param {string} id
   */
  function close(id) {
    document.getElementById(id)?.classList.remove('open');
  }

  /**
   * Fecha ao clicar no overlay (fora do card).
   */
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
   Gerencia exibição e edição dos dados do usuário
   ========================================================= */
const Profile = (() => {
  // Seletores do DOM
  const elName   = document.getElementById('profile-name');
  const elEmail  = document.getElementById('profile-email');
  const elAvatar = document.getElementById('profile-avatar');
  const inputName  = document.getElementById('input-name');
  const inputEmail = document.getElementById('input-email');

  // Dados padrão (mockados)
  const DEFAULTS = {
    name:   'Abner Souza',
    email:  'abner@exemplo.com',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Abner&backgroundColor=b6e3f4'
  };

  /**
   * Carrega os dados salvos no localStorage e atualiza o DOM.
   */
  function load() {
    const data = Storage.get('profile', DEFAULTS);
    elName.textContent  = data.name  || DEFAULTS.name;
    elEmail.textContent = data.email || DEFAULTS.email;
    // Regenera avatar com seed baseado no nome
    const seed = encodeURIComponent(data.name || DEFAULTS.name);
    elAvatar.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4`;
  }

  /**
   * Preenche os inputs do modal com os dados atuais.
   */
  function fillModal() {
    const data = Storage.get('profile', DEFAULTS);
    inputName.value  = data.name  || '';
    inputEmail.value = data.email || '';
  }

  /**
   * Salva as alterações do modal e fecha-o.
   */
  function save() {
    const name  = inputName.value.trim();
    const email = inputEmail.value.trim();

    if (!name || !email) {
      Toast.show('⚠️ Preencha todos os campos');
      return;
    }

    Storage.set('profile', { name, email });
    load(); // Re-renderiza
    Modal.close('modal-edit-profile');
    Toast.show('✅ Perfil atualizado!');
  }

  /**
   * Simula logout (limpa os dados e recarrega).
   */
  function logout() {
    localStorage.clear();
    Modal.close('modal-logout');
    Toast.show('👋 Até logo!');
    setTimeout(() => location.reload(), 1200);
  }

  /**
   * Inicializa todos os listeners do módulo de perfil.
   */
  function init() {
    load();

    document.getElementById('btn-edit-profile').addEventListener('click', () => {
      fillModal();
      Modal.open('modal-edit-profile');
    });

    document.getElementById('btn-edit-avatar').addEventListener('click', () => {
      fillModal();
      Modal.open('modal-edit-profile');
    });

    document.getElementById('btn-modal-save').addEventListener('click', save);
    document.getElementById('btn-modal-cancel').addEventListener('click', () => Modal.close('modal-edit-profile'));

    document.getElementById('btn-logout').addEventListener('click', () => Modal.open('modal-logout'));
    document.getElementById('btn-logout-cancel').addEventListener('click', () => Modal.close('modal-logout'));
    document.getElementById('btn-logout-confirm').addEventListener('click', logout);

    document.getElementById('btn-close-modal').addEventListener('click', () => Modal.close('modal-edit-profile'));
  }

  return { init };
})();

/* =========================================================
   MÓDULO: Distance
   Controla o slider de raio de busca
   ========================================================= */
const Distance = (() => {
  const slider = document.getElementById('distance-slider');
  const badge  = document.getElementById('distance-badge');

  /**
   * Atualiza o preenchimento visual do slider (gradient).
   * @param {number} val
   */
  function updateSliderFill(val) {
    const min = Number(slider.min);
    const max = Number(slider.max);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--bg-input) ${pct}%)`;
  }

  /**
   * Atualiza badge e fill do slider.
   * @param {number} val
   */
  function update(val) {
    badge.textContent = `${val} km`;
    updateSliderFill(val);

    // Animação do badge ao mudar
    badge.style.transform = 'scale(1.1)';
    setTimeout(() => (badge.style.transform = 'scale(1)'), 200);
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

  return { init };
})();

/* =========================================================
   MÓDULO: Location
   Simula ativação/desativação do GPS
   ========================================================= */
const Location = (() => {
  const btn       = document.getElementById('btn-location');
  const statusTxt = document.getElementById('location-status-text');
  const indicator = document.getElementById('location-indicator');

  /**
   * Atualiza a UI baseada no estado atual (ativo/inativo).
   * @param {boolean} active
   */
  function setUI(active) {
    btn.dataset.active = String(active);
    btn.setAttribute('aria-pressed', String(active));

    if (active) {
      btn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> <span>Ativo</span>';
      statusTxt.textContent = 'Localização ativada';
      indicator.classList.add('visible');
      indicator.innerHTML = '<span class="pulse-dot"></span><span>📍 Jaicós, PI — sinal ativo</span>';
    } else {
      btn.innerHTML = '<i class="bi bi-geo-alt"></i> <span>Ativar</span>';
      statusTxt.textContent = 'Localização desativada';
      indicator.classList.remove('visible');
    }
  }

  function init() {
    const saved = Storage.get('locationActive', false);
    setUI(saved);

    btn.addEventListener('click', () => {
      const isActive = btn.dataset.active === 'true';
      const next = !isActive;

      Storage.set('locationActive', next);
      setUI(next);
      Toast.show(next ? '📍 Localização ativada' : '🔕 Localização desativada');
    });
  }

  return { init };
})();

/* =========================================================
   MÓDULO: Category
   Renderiza e gerencia os chips de categoria de interesse
   ========================================================= */
const Category = (() => {
  const grid = document.getElementById('category-grid');

  // Definição das categorias disponíveis
  const CATEGORIES = [
    { id: 'restaurants', label: 'Restaurantes', icon: 'bi-cup-hot-fill' },
    { id: 'stores',      label: 'Lojas',         icon: 'bi-bag-fill' },
    { id: 'events',      label: 'Eventos',        icon: 'bi-calendar-event-fill' },
    { id: 'health',      label: 'Saúde',          icon: 'bi-heart-pulse-fill' },
    { id: 'education',   label: 'Educação',       icon: 'bi-book-fill' },
    { id: 'sports',      label: 'Esportes',       icon: 'bi-trophy-fill' },
    { id: 'culture',     label: 'Cultura',        icon: 'bi-palette-fill' },
    { id: 'services',    label: 'Serviços',       icon: 'bi-tools' },
    { id: 'nature',      label: 'Natureza',       icon: 'bi-tree-fill' },
  ];

  /**
   * Cria e retorna o elemento DOM de um chip.
   * @param {{ id, label, icon }} cat
   * @param {Set<string>} selectedSet
   * @returns {HTMLButtonElement}
   */
  function createChip(cat, selectedSet) {
    const btn = document.createElement('button');
    btn.className = 'category-chip' + (selectedSet.has(cat.id) ? ' selected' : '');
    btn.dataset.id = cat.id;
    btn.setAttribute('aria-pressed', String(selectedSet.has(cat.id)));
    btn.innerHTML = `<i class="bi ${cat.icon}"></i>${cat.label}`;

    btn.addEventListener('click', () => {
      const isSelected = btn.classList.toggle('selected');
      btn.setAttribute('aria-pressed', String(isSelected));

      // Atualiza o conjunto salvo
      const current = new Set(Storage.get('categories', []));
      isSelected ? current.add(cat.id) : current.delete(cat.id);
      Storage.set('categories', [...current]);

      Toast.show(isSelected ? `✅ ${cat.label} adicionado` : `❌ ${cat.label} removido`);
    });

    return btn;
  }

  function init() {
    const selected = new Set(Storage.get('categories', ['restaurants', 'events']));

    // Fragmento para performance (uma única inserção no DOM)
    const frag = document.createDocumentFragment();
    CATEGORIES.forEach(cat => frag.appendChild(createChip(cat, selected)));
    grid.appendChild(frag);
  }

  return { init };
})();

/* =========================================================
   MÓDULO: Toggles
   Gerencia todos os switches on/off
   ========================================================= */
const Toggles = (() => {
  /**
   * Configuração centralizada de todos os toggles.
   * Cada entrada: { id, key, onMsg, offMsg }
   */
  const TOGGLES = [
    {
      id:     'toggle-notifications',
      key:    'notificationsEnabled',
      onMsg:  '🔔 Notificações ativadas',
      offMsg: '🔕 Notificações desativadas',
      def:    true
    },
    {
      id:     'toggle-emails',
      key:    'emailsEnabled',
      onMsg:  '📧 E-mails ativados',
      offMsg: '📧 E-mails desativados',
      def:    false
    },
    {
      id:     'toggle-promos',
      key:    'promosEnabled',
      onMsg:  '🎁 Promoções ativadas',
      offMsg: '🎁 Promoções desativadas',
      def:    false
    },
    {
      id:     'toggle-hide-location',
      key:    'hideLocation',
      onMsg:  '👁️ Localização ocultada',
      offMsg: '👁️ Localização visível',
      def:    false
    },
    {
      id:     'toggle-private-account',
      key:    'privateAccount',
      onMsg:  '🔒 Conta definida como privada',
      offMsg: '🔓 Conta definida como pública',
      def:    false
    }
  ];

  function init() {
    TOGGLES.forEach(({ id, key, onMsg, offMsg, def }) => {
      const el = document.getElementById(id);
      if (!el) return;

      // Restaura estado salvo
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
   Alterna entre tema claro, escuro e automático (sistema)
   ========================================================= */
const Theme = (() => {
  const html    = document.documentElement;
  const options = document.querySelectorAll('.theme-option');
  let mediaQuery = null;

  /**
   * Aplica o tema visual ao <html>.
   * @param {'light'|'dark'|'auto'} theme
   */
  function applyTheme(theme) {
    // Remove listener de sistema se existir
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', onSystemChange);
      mediaQuery = null;
    }

    if (theme === 'auto') {
      // Segue a preferência do sistema operacional
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      html.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', onSystemChange);
    } else {
      html.setAttribute('data-theme', theme);
    }
  }

  /** Callback para quando o tema do sistema muda. */
  function onSystemChange(e) {
    html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }

  /**
   * Atualiza os botões para refletir a opção selecionada.
   * @param {'light'|'dark'|'auto'} theme
   */
  function updateButtons(theme) {
    options.forEach(btn => {
      const isActive = btn.dataset.theme === theme;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function init() {
    const saved = Storage.get('theme', 'light');
    applyTheme(saved);
    updateButtons(saved);

    options.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        Storage.set('theme', theme);
        applyTheme(theme);
        updateButtons(theme);

        const labels = { light: '☀️ Tema claro', dark: '🌙 Tema escuro', auto: '⚙️ Tema automático' };
        Toast.show(labels[theme]);
      });
    });
  }

  return { init };
})();

/* =========================================================
   MÓDULO: Language
   Simulação de seleção de idioma (sem tradução real)
   ========================================================= */
const Language = (() => {
  const select  = document.getElementById('lang-select');
  const descEl  = document.getElementById('lang-desc');

  // Mapa de códigos para rótulos amigáveis
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
   Ações do header (botão voltar, botão salvar tudo)
   ========================================================= */
const NavActions = (() => {
  function init() {
    // Botão voltar (simulado)
    document.getElementById('btn-back').addEventListener('click', () => {
      Toast.show('← Voltando ao app…');
    });

    // Botão salvar tudo (atalho visual)
    document.getElementById('btn-save-all').addEventListener('click', () => {
      Toast.show('💾 Configurações salvas!', 2500);

      // Micro-animação de confirmação no botão
      const btn = document.getElementById('btn-save-all');
      btn.style.background = 'var(--success-soft)';
      btn.style.color      = 'var(--success)';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.color      = '';
      }, 1200);
    });
  }

  return { init };
})();

/* =========================================================
   INICIALIZADOR PRINCIPAL
   Garante que o DOM esteja pronto antes de inicializar
   ========================================================= */
const App = {
  init() {
    // Ordem importa: Theme primeiro para evitar flash
    Theme.init();
    Profile.init();
    Distance.init();
    Location.init();
    Category.init();
    Toggles.init();
    Language.init();
    Modal.initOverlayClose();
    NavActions.init();

    console.info('[SettingsApp] Todos os módulos inicializados ✓');
  }
};

// Aguarda o DOM estar completamente carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
