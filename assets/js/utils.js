/**
 * Funções Utilitárias
 * Conjunto de funções auxiliares para uso geral na aplicação
 */

// ==================== FORMATAÇÃO ====================

/**
 * Formata um preço para exibição
 * @param {number|string} price - Preço a ser formatado
 * @returns {string} Preço formatado (ex: "R$ 19,90")
 */
function formatPrice(price) {
    if (!price) return 'R$ 0,00';
    const numPrice = parseFloat(price.toString().replace(',', '.'));
    return `R$ ${numPrice.toFixed(2).replace('.', ',')}`;
}

/**
 * Formata um número de telefone brasileiro
 * @param {string} phone - Número de telefone
 * @returns {string} Telefone formatado
 */
function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
}

/**
 * Formata uma data para exibição
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data formatada (dd/mm/aaaa)
 */
function formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('pt-BR');
}

/**
 * Formata uma data e hora para exibição
 * @param {Date|string} datetime - Data e hora a ser formatada
 * @returns {string} Data e hora formatadas (dd/mm/aaaa hh:mm)
 */
function formatDateTime(datetime) {
    if (!datetime) return '';
    
    const d = new Date(datetime);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleString('pt-BR');
}

// ==================== VALIDAÇÃO ====================

/**
 * Valida um endereço de e-mail
 * @param {string} email - E-mail a ser validado
 * @returns {boolean} True se válido
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida um número de telefone brasileiro
 * @param {string} phone - Telefone a ser validado
 * @returns {boolean} True se válido
 */
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Valida se uma string não está vazia
 * @param {string} str - String a ser validada
 * @param {number} minLength - Comprimento mínimo (padrão: 1)
 * @returns {boolean} True se válida
 */
function validateRequired(str, minLength = 1) {
    return str && str.trim().length >= minLength;
}

/**
 * Valida um CPF brasileiro
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} True se válido
 */
function validateCPF(cpf) {
    const cleaned = cpf.replace(/\D/g, '');
    
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleaned)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.charAt(10))) return false;
    
    return true;
}

// ==================== MANIPULAÇÃO DE DOM ====================

/**
 * Escapa HTML para prevenir XSS
 * @param {string} text - Texto a ser escapado
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Remove todos os filhos de um elemento
 * @param {HTMLElement} element - Elemento a ser limpo
 */
function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Adiciona uma classe CSS a um elemento
 * @param {HTMLElement|string} element - Elemento ou seletor
 * @param {string} className - Nome da classe
 */
function addClass(element, className) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) el.classList.add(className);
}

/**
 * Remove uma classe CSS de um elemento
 * @param {HTMLElement|string} element - Elemento ou seletor
 * @param {string} className - Nome da classe
 */
function removeClass(element, className) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) el.classList.remove(className);
}

/**
 * Alterna uma classe CSS em um elemento
 * @param {HTMLElement|string} element - Elemento ou seletor
 * @param {string} className - Nome da classe
 */
function toggleClass(element, className) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) el.classList.toggle(className);
}

/**
 * Mostra um elemento
 * @param {HTMLElement|string} element - Elemento ou seletor
 */
function showElement(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) el.style.display = 'block';
}

/**
 * Esconde um elemento
 * @param {HTMLElement|string} element - Elemento ou seletor
 */
function hideElement(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) el.style.display = 'none';
}

// ==================== UTILITÁRIOS DE REDE ====================

/**
 * Faz uma requisição GET
 * @param {string} url - URL da requisição
 * @returns {Promise} Promise com a resposta
 */
async function fetchGet(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na requisição GET:', error);
        throw error;
    }
}

/**
 * Faz uma requisição POST
 * @param {string} url - URL da requisição
 * @param {Object} data - Dados a serem enviados
 * @returns {Promise} Promise com a resposta
 */
async function fetchPost(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro na requisição POST:', error);
        throw error;
    }
}

// ==================== UTILITÁRIOS DE ARMAZENAMENTO ====================

/**
 * Salva dados no localStorage
 * @param {string} key - Chave
 * @param {*} data - Dados a serem salvos
 */
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
    }
}

/**
 * Carrega dados do localStorage
 * @param {string} key - Chave
 * @param {*} defaultValue - Valor padrão se não encontrado
 * @returns {*} Dados carregados
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        return defaultValue;
    }
}

/**
 * Remove dados do localStorage
 * @param {string} key - Chave
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Erro ao remover do localStorage:', error);
    }
}

// ==================== UTILITÁRIOS DE URL ====================

/**
 * Obtém parâmetros da URL
 * @param {string} param - Nome do parâmetro
 * @returns {string|null} Valor do parâmetro
 */
function getUrlParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Atualiza um parâmetro na URL sem recarregar a página
 * @param {string} param - Nome do parâmetro
 * @param {string} value - Valor do parâmetro
 */
function updateUrlParameter(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

/**
 * Remove um parâmetro da URL sem recarregar a página
 * @param {string} param - Nome do parâmetro
 */
function removeUrlParameter(param) {
    const url = new URL(window.location);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url);
}

// ==================== UTILITÁRIOS DE COMPARTILHAMENTO ====================

/**
 * Compartilha via WhatsApp
 * @param {string} text - Texto a ser compartilhado
 * @param {string} url - URL a ser compartilhada (opcional)
 */
function shareWhatsApp(text, url = '') {
    const message = url ? `${text} ${url}` : text;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

/**
 * Compartilha via Facebook
 * @param {string} url - URL a ser compartilhada
 */
function shareFacebook(url = window.location.href) {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank');
}

/**
 * Compartilha via Twitter
 * @param {string} text - Texto a ser compartilhado
 * @param {string} url - URL a ser compartilhada (opcional)
 */
function shareTwitter(text, url = '') {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
}

/**
 * Copia texto para a área de transferência
 * @param {string} text - Texto a ser copiado
 * @returns {Promise<boolean>} True se copiado com sucesso
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Erro ao copiar para área de transferência:', error);
        return false;
    }
}

// ==================== UTILITÁRIOS DE NOTIFICAÇÃO ====================

/**
 * Mostra uma notificação toast
 * @param {string} message - Mensagem
 * @param {string} type - Tipo (success, error, warning, info)
 * @param {number} duration - Duração em ms (padrão: 5000)
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Remove notificações existentes
    const existingNotifications = document.querySelectorAll('.toast-notification');
    existingNotifications.forEach(n => n.remove());

    // Cria nova notificação
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} toast-notification`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
    `;
    notification.textContent = message;

    // Adiciona botão de fechar
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        float: right;
        font-size: 1.5rem;
        font-weight: bold;
        margin-left: 10px;
    `;
    closeBtn.onclick = () => notification.remove();
    notification.appendChild(closeBtn);

    document.body.appendChild(notification);

    // Remove automaticamente
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);

    // Remove ao clicar
    notification.onclick = () => notification.remove();
}

// ==================== UTILITÁRIOS DE LOADING ====================

/**
 * Mostra indicador de loading
 * @param {HTMLElement|string} element - Elemento ou seletor
 * @param {string} message - Mensagem de loading (opcional)
 */
function showLoading(element, message = 'Carregando...') {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    el.innerHTML = `
        <div class="loading">
            ${escapeHtml(message)}
        </div>
    `;
}

/**
 * Esconde indicador de loading
 * @param {HTMLElement|string} element - Elemento ou seletor
 */
function hideLoading(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    const loadingEl = el.querySelector('.loading');
    if (loadingEl) {
        loadingEl.remove();
    }
}

// ==================== DEBOUNCE E THROTTLE ====================

/**
 * Debounce - executa função após delay sem novas chamadas
 * @param {Function} func - Função a ser executada
 * @param {number} delay - Delay em ms
 * @returns {Function} Função debounced
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle - limita execução da função a uma vez por período
 * @param {Function} func - Função a ser executada
 * @param {number} limit - Limite em ms
 * @returns {Function} Função throttled
 */
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Adicionar estilos CSS para animações
const utilsStyle = document.createElement('style');
utilsStyle.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(utilsStyle);

