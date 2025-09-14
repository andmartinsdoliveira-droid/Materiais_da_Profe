/**
 * SISTEMA DE CARRINHO - LOJA EDUCACIONAL
 * Versão: 4.1 - Final Corrigido
 * Data: Dezembro 2024
 * 
 * Funcionalidades:
 * - Carrinho persistente com localStorage
 * - Controle de quantidade (bloqueado para evitar duplicatas)
 * - Modal de checkout funcional
 * - Integração com Mercado Pago
 * - Checkout manual
 * - Notificações visuais
 * - Compatibilidade com todas as páginas
 */

// ==================== CONFIGURAÇÕES DO CARRINHO ====================

const CartConfig = {
  STORAGE_KEY: 'espacoEducador_carrinho',
  MAX_QUANTITY: 1, // Máximo 1 item por produto (evita duplicatas)
  BACKEND_URL: window.BACKEND_URL || 'https://backend-materiais-da-profe.onrender.com',
  MERCADO_PAGO_PUBLIC_KEY: 'SUA_PUBLIC_KEY_AQUI'
};

// ==================== CLASSE PRINCIPAL DO CARRINHO ====================

class ShoppingCart {
  constructor() {
    this.items = this.loadFromStorage();
    this.isModalOpen = false;
    this.currentCheckoutStep = 1;
    this.customerData = {};
    this.init();
  }
  
  /**
   * Inicializa o carrinho
   */
  init() {
    this.updateCounter();
    this.bindEvents();
    this.createCheckoutModal();
    // Garantir que o modal do carrinho comece sempre fechado
    const carrinhoModal = document.getElementById('carrinhoModal');
    if (carrinhoModal) {
      try { carrinhoModal.style.display = 'none'; } catch (e) { /* silent */ }
    }
    try { document.body.style.overflow = ''; } catch (e) { /* silent */ }
  }

  /**
   * Vincula eventos do carrinho
   */
  bindEvents() {
    // Botão do carrinho
    const cartBtn = document.getElementById('carrinhoBtn');
    if (cartBtn) {
      cartBtn.addEventListener('click', () => this.toggleCart());
    }

    // Fechar modal
    const closeBtn = document.getElementById('fecharCarrinho');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeCart());
    }

    // Limpar carrinho
    const clearBtn = document.getElementById('limparCarrinho');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearCart());
    }

    // Finalizar compra
    const checkoutBtn = document.getElementById('finalizarCompra');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => this.showCheckoutForm());
    }

    // Fechar modal clicando fora
    const modal = document.getElementById('carrinhoModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeCart();
      });
    }

    // Tecla ESC para fechar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.closeCart();
      }
    });
  }

  /**
   * Adiciona item ao carrinho
   */
  addItem(produto) {
    if (!produto || !produto.ID) {
      this.showNotification('Erro: Produto inválido', 'error');
      return false;
    }

    // Verifica se o item já existe
    const existingItem = this.items.find(item => item.id == produto.ID);
    
    if (existingItem) {
      this.showNotification(`${produto.Nome} já está no carrinho!`, 'warning');
      return false;
    }

    // Adiciona novo item
    const newItem = {
      id: produto.ID,
      title: produto.Nome,
      unit_price: parseFloat(produto.Preço) || 0,
      quantity: 1,
      image: produto.URL_Imagem || produto.Imagens?.[0] || '',
      description: produto.Descrição || ''
    };

    this.items.push(newItem);
    this.saveToStorage();
    this.updateCounter();
    this.showNotification(`${produto.Nome} adicionado ao carrinho!`, 'success');
    
    return true;
  }

  /**
   * Remove item do carrinho
   */
  removeItem(productId) {
    const index = this.items.findIndex(item => item.id == productId);
    if (index > -1) {
      const removedItem = this.items.splice(index, 1)[0];
      this.saveToStorage();
      this.updateCounter();
      this.renderCartItems();
      this.showNotification(`${removedItem.title} removido do carrinho`, 'info');
    }
  }

  /**
   * Atualiza quantidade do item (limitado a 1)
   */
  updateQuantity(productId, quantity) {
    const item = this.items.find(item => item.id == productId);
    if (item) {
      // Força quantidade máxima de 1
      item.quantity = Math.min(Math.max(1, parseInt(quantity) || 1), CartConfig.MAX_QUANTITY);
      this.saveToStorage();
      this.renderCartItems();
    }
  }

  /**
   * Limpa o carrinho
   */
  clearCart() {
    if (this.items.length === 0) {
      this.showNotification('O carrinho já está vazio', 'info');
      return;
    }

    if (confirm('Tem certeza que deseja limpar o carrinho?')) {
      this.items = [];
      this.saveToStorage();
      this.updateCounter();
      this.renderCartItems();
      this.showNotification('Carrinho limpo!', 'info');
    }
  }

  /**
   * Obtém itens do carrinho
   */
  getItems() {
    return this.items;
  }

  /**
   * Obtém total de itens
   */
  getTotalItems() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Obtém valor total
   */
  getTotalValue() {
    return this.items.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
  }

  /**
   * Abre/fecha o carrinho
   */
  toggleCart() {
    if (this.isModalOpen) {
      this.closeCart();
    } else {
      this.openCart();
    }
  }

  /**
   * Abre o carrinho
   */
  openCart() {
    const modal = document.getElementById('carrinhoModal');
    if (modal) {
      this.renderCartItems();
      modal.style.display = 'flex';
      this.isModalOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Fecha o carrinho
   */
  closeCart() {
    const modal = document.getElementById('carrinhoModal');
    if (modal) {
      modal.style.display = 'none';
      this.isModalOpen = false;
      document.body.style.overflow = '';
      this.hideCheckoutForm();
    }
  }

  /**
   * Renderiza itens do carrinho
   */
  renderCartItems() {
    const container = document.getElementById('carrinhoItens');
    const emptyContainer = document.getElementById('carrinhoVazio');
    const totalElement = document.getElementById('valorTotal');

    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = '';
      if (emptyContainer) emptyContainer.style.display = 'block';
      if (totalElement) totalElement.textContent = '0,00';
      return;
    }

    if (emptyContainer) emptyContainer.style.display = 'none';

    container.innerHTML = this.items.map(item => `
      <div class="carrinho-item" data-id="${item.id}">
        <div class="carrinho-item-imagem">
          ${item.image ? 
            `<img src="${item.image}" alt="${item.title}" onerror="this.parentElement.innerHTML='📚'">` : 
            '📚'
          }
        </div>
        <div class="carrinho-item-info">
          <h4 class="carrinho-item-titulo">${this.escapeHtml(item.title)}</h4>
          <p class="carrinho-item-descricao">${this.escapeHtml(item.description)}</p>
          <div class="carrinho-item-preco">${this.formatPrice(item.unit_price)}</div>
        </div>
        <div class="carrinho-item-controles">
          <div class="quantidade-controle">
            <button class="quantidade-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
            <span class="quantidade-valor">${item.quantity}</span>
            <button class="quantidade-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity + 1})" ${item.quantity >= CartConfig.MAX_QUANTITY ? 'disabled' : ''}>+</button>
          </div>
          <button class="remover-item-btn" onclick="cart.removeItem(${item.id})" title="Remover item">🗑️</button>
        </div>
      </div>
    `).join('');

    // Atualiza total
    if (totalElement) {
      totalElement.textContent = this.formatPrice(this.getTotalValue()).replace('R$ ', '');
    }
  }

  /**
   * Atualiza contador do carrinho
   */
  updateCounter() {
    const counter = document.getElementById('carrinhoContador');
    if (counter) {
      const totalItems = this.getTotalItems();
      if (totalItems > 0) {
        counter.textContent = totalItems;
        counter.style.display = 'flex';
      } else {
        counter.style.display = 'none';
      }
    }
  }

  /**
   * Cria modal de checkout
   */
  createCheckoutModal() {
    // Verifica se já existe
    if (document.getElementById('checkoutModal')) return;

    const modal = document.createElement('div');
    modal.id = 'checkoutModal';
    modal.className = 'modal';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Finalizar Compra</h3>
          <button id="fecharCheckout" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div id="checkoutStep1" class="checkout-step active">
            <form id="checkoutForm">
              <div class="form-group">
                <label class="form-label">Nome Completo *</label>
                <input type="text" id="customerName" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">E-mail *</label>
                <input type="email" id="customerEmail" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Telefone (WhatsApp)</label>
                <input type="tel" id="customerPhone" class="form-input" placeholder="(11) 99999-9999">
              </div>
              <div class="form-group">
                <label class="form-label">Observações</label>
                <textarea id="orderNotes" class="form-input" rows="3" placeholder="Informações adicionais sobre o pedido..."></textarea>
              </div>
              <div class="checkout-total">
                <strong>Total: R$ <span id="checkoutTotal">0,00</span></strong>
              </div>
            </form>
          </div>

          <div id="checkoutStep2" class="checkout-step" style="display:none;">
            <h4>Resumo do Pedido</h4>
            <div id="resumoPedidoItens"></div>
            <div class="checkout-total">
              <strong>Total do Pedido: R$ <span id="resumoPedidoTotal">0,00</span></strong>
            </div>
            <div id="walletBrick_container" style="margin-top:1rem;"></div>
            <button id="btnPagarMercadoPago" class="btn btn-success btn-lg" style="width:100%; margin-top: 1rem;">Pagar com Mercado Pago</button>
            <button id="btnVoltarEtapa1" class="btn btn-outline" style="width:100%; margin-top: 0.5rem;">Voltar</button>
          </div>
        </div>
        <div class="modal-footer">
          <div style="width:100%;">
            <div style="display:flex;gap:1rem;justify-content:flex-end;">
              <button id="cancelarCheckout" class="btn btn-outline">Cancelar</button>
              <button id="avancarEtapa1" class="btn btn-success">Continuar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind eventos do checkout
    document.getElementById('fecharCheckout').onclick = () => this.hideCheckoutForm();
    document.getElementById('cancelarCheckout').onclick = () => this.hideCheckoutForm();
    document.getElementById('avancarEtapa1').onclick = () => this.continuarCheckout();
    document.getElementById('btnVoltarEtapa1').onclick = () => this.mostrarCheckoutStep(1);
    document.getElementById('btnPagarMercadoPago').onclick = () => this.processCheckout();

    modal.addEventListener('click', (e) => { if (e.target === modal) this.hideCheckoutForm(); });
  }

  /**
   * Mostra formulário de checkout
   */
  showCheckoutForm() {
    if (this.items.length === 0) {
      this.showNotification('Adicione itens ao carrinho antes de finalizar a compra', 'warning');
      return;
    }

    const modal = document.getElementById('checkoutModal');
    const totalElement = document.getElementById('checkoutTotal');
    
    if (modal) {
      if (totalElement) {
        totalElement.textContent = this.formatPrice(this.getTotalValue()).replace('R$ ', '');
      }
      this.mostrarCheckoutStep(1);

      // Se existirem dados gravados do cliente, re-hidratar inputs
      if (this.customerData) {
        if (this.customerData.name) document.getElementById('customerName').value = this.customerData.name;
        if (this.customerData.email) document.getElementById('customerEmail').value = this.customerData.email;
        if (this.customerData.phone) document.getElementById('customerPhone').value = this.customerData.phone;
        if (this.customerData.notes) document.getElementById('orderNotes').value = this.customerData.notes;
      }
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Esconde formulário de checkout
   */
  hideCheckoutForm() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      this.clearCheckoutForm();
    }
  }

  /**
   * Limpa formulário de checkout
   */
  clearCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (form) {
      form.reset();
    }
  }

  /**
   * Continua para próxima etapa do checkout
   */
  continuarCheckout() {
    const name = document.getElementById('customerName')?.value?.trim();
    const email = document.getElementById('customerEmail')?.value?.trim();

    if (!name) {
      this.showNotification('Nome é obrigatório', 'error');
      return;
    }

    if (!email) {
      this.showNotification('E-mail é obrigatório', 'error');
      return;
    }

    if (!this.validateEmail(email)) {
      this.showNotification('E-mail inválido', 'error');
      return;
    }

    // Salva dados do cliente
    this.customerData = {
      name: name,
      email: email,
      phone: document.getElementById('customerPhone')?.value?.trim() || '',
      notes: document.getElementById('orderNotes')?.value?.trim() || ''
    };

    this.mostrarCheckoutStep(2);
  }

  /**
   * Mostra etapa específica do checkout
   */
  mostrarCheckoutStep(step) {
    this.currentCheckoutStep = step;
    
    const step1 = document.getElementById('checkoutStep1');
    const step2 = document.getElementById('checkoutStep2');
    const footer = document.querySelector('#checkoutModal .modal-footer');

    if (step === 1) {
      if (step1) step1.style.display = 'block';
      if (step2) step2.style.display = 'none';
      if (footer) footer.style.display = 'block';
    } else if (step === 2) {
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'block';
      if (footer) footer.style.display = 'none';
      
      this.renderResumoCheckout();
    }
  }

  /**
   * Renderiza resumo do checkout
   */
  renderResumoCheckout() {
    const container = document.getElementById('resumoPedidoItens');
    const totalElement = document.getElementById('resumoPedidoTotal');

    if (container) {
      container.innerHTML = this.items.map(item => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #eee;">
          <div>
            <strong>${this.escapeHtml(item.title)}</strong>
            <div style="font-size:0.9rem;color:#666;">Qtd: ${item.quantity}</div>
          </div>
          <div style="font-weight:bold;">${this.formatPrice(item.unit_price * item.quantity)}</div>
        </div>
      `).join('');
    }

    if (totalElement) {
      totalElement.textContent = this.formatPrice(this.getTotalValue()).replace('R$ ', '');
    }
  }

  /**
   * Processa checkout com Mercado Pago
   */
  async processCheckout() {
    if (this.items.length === 0) {
      this.showNotification('Carrinho vazio', 'error');
      return;
    }

    // Desabilita botão de pagamento durante processamento
    const payBtn = document.getElementById('btnPagarMercadoPago');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.dataset.originalText = payBtn.textContent;
      payBtn.textContent = 'Processando...';
    }

    try {
      // Dados para criar preferência no Mercado Pago
      const preferenceData = {
        items: this.items,
        payer: {
          name: this.customerData.name,
          email: this.customerData.email,
          phone: this.customerData.phone
        },
        metadata: {
          customer_name: this.customerData.name,
          customer_phone: this.customerData.phone,
          order_notes: this.customerData.notes
        }
      };

      // Chama endpoint do backend para criar preferência
      const response = await fetch(`${CartConfig.BACKEND_URL}/create_preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferenceData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.init_point) {
        // Redireciona para o Mercado Pago
        window.location.href = result.init_point;
      } else {
        throw new Error('Erro ao criar preferência de pagamento');
      }

    } catch (error) {
      console.error('Erro no checkout:', error);
      this.showNotification('Erro ao processar pagamento. Tente novamente.', 'error');
    } finally {
      // Reabilita botão
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = payBtn.dataset.originalText || 'Pagar com Mercado Pago';
      }
    }
  }

  /**
   * Salva carrinho no localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(CartConfig.STORAGE_KEY, JSON.stringify(this.items));
    } catch (error) {
      console.error('Erro ao salvar carrinho:', error);
    }
  }

  /**
   * Carrega carrinho do localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(CartConfig.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
      return [];
    }
  }

  /**
   * Valida email
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Formata preço
   */
  formatPrice(price) {
    const num = parseFloat(price) || 0;
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  }

  /**
   * Escapa HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Mostra notificação
   */
  showNotification(message, type = 'info') {
    // Remove notificações existentes
    const existing = document.querySelectorAll('.cart-notification');
    existing.forEach(n => n.remove());

    // Cria nova notificação
    const notification = document.createElement('div');
    notification.className = `cart-notification cart-notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove após 4 segundos
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  /**
   * Abre modal do carrinho (método público)
   */
  abrirModal() {
    this.openCart();
  }
}

// ==================== MANAGER DE CARRINHO ====================

class CartManager {
  constructor() {
    this.cart = null;
    this.produtos = [];
    this.init();
  }

  async init() {
    // Aguarda DOM estar pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initCart());
    } else {
      this.initCart();
    }
  }

  initCart() {
    this.cart = new ShoppingCart();
    this.loadProdutos();
  }

  async loadProdutos() {
    try {
      const response = await fetch(`${CartConfig.BACKEND_URL}/produtos`);
      if (response.ok) {
        this.produtos = await response.json();
      }
    } catch (error) {
      console.error('Erro ao carregar produtos para o carrinho:', error);
    }
  }

  adicionarItem(produtoId) {
    const produto = this.produtos.find(p => String(p.ID) === String(produtoId));
    if (produto && this.cart) {
      return this.cart.addItem(produto);
    } else {
      console.error('Produto não encontrado:', produtoId);
      return false;
    }
  }

  removerItem(produtoId) {
    if (this.cart) {
      this.cart.removeItem(produtoId);
    }
  }

  limparCarrinho() {
    if (this.cart) {
      this.cart.clearCart();
    }
  }

  abrirModal() {
    if (this.cart) {
      this.cart.abrirModal();
    }
  }

  getItens() {
    return this.cart ? this.cart.getItems() : [];
  }

  getTotal() {
    return this.cart ? this.cart.getTotalValue() : 0;
  }
}

// ==================== INICIALIZAÇÃO GLOBAL ====================

// Instância global do gerenciador de carrinho
let cartManager = null;
let cart = null;

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCart);
} else {
  initializeCart();
}

function initializeCart() {
  cartManager = new CartManager();
  cart = cartManager.cart; // Para compatibilidade com código existente
  
  // Expõe globalmente para compatibilidade
  window.CartManager = cartManager;
  window.cart = cart;
}

// Adiciona estilos CSS para animações
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .checkout-step {
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
document.head.appendChild(style);

