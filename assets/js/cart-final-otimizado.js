/**
 * SISTEMA DE CARRINHO - LOJA EDUCACIONAL
 * Versão: 4.3-PROD - Ajustes para produção (init_point) + preço robusto + CPF
 * Data: Outubro 2025
 */

// ==================== CONFIGURAÇÕES DO CARRINHO ====================
const CartConfig = {
  STORAGE_KEY: 'materiaisdaprofe_carrinho',
  MAX_QUANTITY: 1, // Máximo 1 item por produto (evita duplicatas)
  APPS_SCRIPT_BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxePs6JdZksbIGZ7SsbqxNOuZ0f9asF1-LdNJsDWDPZTc4zjpCN_Kb6aelvlUexiDk9dA/exec', // URL DO APPS SCRIPT PARA PRODUTOS
  MAKE_WEBHOOK_URL: 'https://hook.us2.make.com/1dw287n9fsyhlkrhrw1n82ry0uhg8j9d', // URL DO WEBHOOK DO MAKE PARA PAGAMENTO (deve usar token de PRODUÇÃO no cenário)
};

// ==================== CLASSE PRINCIPAL DO CARRINHO ====================

class ShoppingCart {
  constructor( ) {
    this.items = this.loadFromStorage();
    this.isModalOpen = false;
    this.currentCheckoutStep = 1;
    this.customerData = {};
    this.init();
  }

  init() {
    this.updateCounter();
    this.bindEvents();
    this.createCheckoutModal();
    const carrinhoModal = document.getElementById('carrinhoModal');
    if (carrinhoModal) {
      try { carrinhoModal.style.display = 'none'; } catch (e) {}
    }
    try { document.body.style.overflow = ''; } catch (e) {}
  }

  bindEvents() {
    document.getElementById('carrinhoBtn')?.addEventListener('click', () => this.toggleCart());
    document.getElementById('fecharCarrinho')?.addEventListener('click', () => this.closeCart());
    document.getElementById('limparCarrinho')?.addEventListener('click', () => this.clearCart());
    document.getElementById('finalizarCompra')?.addEventListener('click', () => this.showCheckoutForm());
    const modal = document.getElementById('carrinhoModal');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeCart();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen) this.closeCart();
    });
  }

  addItem(produto) {
    if (!produto || !produto.ID) {
      this.showNotification('Erro: Produto inválido', 'error');
      return false;
    }
    const existingItem = this.items.find(item => item.id == produto.ID);
    if (existingItem) {
      this.showNotification(`${produto.Nome} já está no carrinho!`, 'warning');
      return false;
    }
    const newItem = {
      id: produto.ID,
      title: produto.Nome,
      unit_price: this.parsePriceToNumber(produto.Preço),
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

  updateQuantity(productId, quantity) {
    const item = this.items.find(item => item.id == productId);
    if (item) {
      item.quantity = Math.min(Math.max(1, parseInt(quantity) || 1), CartConfig.MAX_QUANTITY);
      this.saveToStorage();
      this.renderCartItems();
    }
  }

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

  getItems() { return this.items; }
  getTotalItems() { return this.items.reduce((total, item) => total + item.quantity, 0); }
  getTotalValue() { return this.items.reduce((total, item) => total + (item.unit_price * item.quantity), 0); }

  toggleCart() { this.isModalOpen ? this.closeCart() : this.openCart(); }

  openCart() {
    const modal = document.getElementById('carrinhoModal');
    if (modal) {
      this.renderCartItems();
      modal.style.display = 'flex';
      this.isModalOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeCart() {
    const modal = document.getElementById('carrinhoModal');
    if (modal) {
      modal.style.display = 'none';
      this.isModalOpen = false;
      document.body.style.overflow = '';
      this.hideCheckoutForm();
    }
  }

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
            `<img src="${item.image}" alt="${item.title}" onerror="this.parentElement.innerHTML='📚'"/>` : 
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
    if (totalElement) {
      totalElement.textContent = this.formatPrice(this.getTotalValue()).replace('R$ ', '');
    }
  }

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

  createCheckoutModal() {
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
              <div class="form-group"><label class="form-label">Nome Completo *</label><input type="text" id="customerName" class="form-input" required></div>
              <div class="form-group"><label class="form-label">E-mail *</label><input type="email" id="customerEmail" class="form-input" required></div>
              <div class="form-group"><label class="form-label">Telefone (WhatsApp)</label><input type="tel" id="customerPhone" class="form-input" placeholder="(11) 99999-9999"></div>
              <div class="form-group"><label class="form-label">Observações</label><textarea id="orderNotes" class="form-input" rows="3" placeholder="Informações adicionais..."></textarea></div>
              <div class="checkout-total"><strong>Total: R$ <span id="checkoutTotal">0,00</span></strong></div>
            </form>
          </div>
          <div id="checkoutStep2" class="checkout-step" style="display:none;">
            <h4>Resumo do Pedido</h4>
            <div id="resumoPedidoItens"></div>
            <div class="checkout-total"><strong>Total: R$ <span id="resumoPedidoTotal">0,00</span></strong></div>
            <button id="btnPagarMercadoPago" class="btn btn-success btn-lg" style="width:100%; margin-top: 1rem;">Pagar com Mercado Pago</button>
            <button id="btnVoltarEtapa1" class="btn btn-outline" style="width:100%; margin-top: 0.5rem;">Voltar e editar dados</button>
          </div>
        </div>
        <div class="modal-footer">
          <div style="width:100%; display:flex; gap:1rem; justify-content:flex-end;">
            <button id="cancelarCheckout" class="btn btn-outline">Cancelar</button>
            <button id="avancarEtapa1" class="btn btn-success">Continuar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('fecharCheckout').onclick = () => this.hideCheckoutForm();
    document.getElementById('cancelarCheckout').onclick = () => this.hideCheckoutForm();
    document.getElementById('avancarEtapa1').onclick = () => this.continuarCheckout();
    document.getElementById('btnVoltarEtapa1').onclick = () => this.mostrarCheckoutStep(1);
    document.getElementById('btnPagarMercadoPago').onclick = () => this.processCheckout();
    modal.addEventListener('click', (e) => { if (e.target === modal) this.hideCheckoutForm(); });
  }

  showCheckoutForm() {
    if (this.items.length === 0) {
      this.showNotification('Adicione itens ao carrinho antes de finalizar a compra', 'warning');
      return;
    }
    const modal = document.getElementById('checkoutModal');
    if (modal) {
      document.getElementById('checkoutTotal').textContent = this.formatPrice(this.getTotalValue()).replace('R$ ', '');
      this.mostrarCheckoutStep(1);
      if (this.customerData) {
        document.getElementById('customerName').value = this.customerData.name || '';
        document.getElementById('customerEmail').value = this.customerData.email || '';
        document.getElementById('customerPhone').value = this.customerData.phone || '';
      }
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  hideCheckoutForm() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  continuarCheckout() {
    const name = document.getElementById('customerName')?.value?.trim();
    const email = document.getElementById('customerEmail')?.value?.trim();
    const phone = document.getElementById('customerPhone')?.value?.trim();

    if (!name || !email) {
      this.showNotification('Por favor, preencha seu nome e e-mail.', 'error');
      return;
    }
    if (!this.validateEmail(email)) {
      this.showNotification('Por favor, insira um e-mail válido.', 'error');
      return;
    }

    this.customerData = { name, email, phone };
    this.mostrarCheckoutStep(2);
  }

  mostrarCheckoutStep(step) {
    const step1 = document.getElementById('checkoutStep1');
    const step2 = document.getElementById('checkoutStep2');
    const avancarBtn = document.getElementById('avancarEtapa1');

    if (!step1 || !step2) return;

    if (step === 1) {
      step1.style.display = 'block';
      step2.style.display = 'none';
      if (avancarBtn) avancarBtn.style.display = 'inline-block';
      this.currentCheckoutStep = 1;
    } else if (step === 2) {
      this.gerarResumoPedido();
      step1.style.display = 'none';
      step2.style.display = 'block';
      if (avancarBtn) avancarBtn.style.display = 'none';
      this.currentCheckoutStep = 2;
    }
  }

  gerarResumoPedido() {
    const resumoItensContainer = document.getElementById('resumoPedidoItens');
    const resumoTotalElement = document.getElementById('resumoPedidoTotal');
    if (!resumoItensContainer || !resumoTotalElement) return;

    if (this.items.length === 0) {
      resumoItensContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
      resumoTotalElement.textContent = '0,00';
      return;
    }

    resumoItensContainer.innerHTML = this.items.map(item => `
      <div class="resumo-item">
        <span>${this.escapeHtml(item.title)} x ${item.quantity}</span>
        <span>${this.formatPrice(item.unit_price * item.quantity)}</span>
      </div>
    `).join('');

    resumoTotalElement.textContent = this.formatPrice(this.getTotalValue()).replace('R$ ', '');
  }

  async processCheckout() {
    const payBtn = document.getElementById('btnPagarMercadoPago');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.dataset.originalText = payBtn.textContent;
      payBtn.textContent = 'Processando...';
    }

    try {
      const orderData = {
        customer: this.customerData,
        items: this.items.map(item => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        total: this.getTotalValue()
      };

      const appsScriptResponse = await fetch(CartConfig.APPS_SCRIPT_BACKEND_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(orderData),
      });

      if (!appsScriptResponse.ok) {
        throw new Error(`Erro no Apps Script: ${appsScriptResponse.status} ${appsScriptResponse.statusText}`);
      }
      const appsScriptResult = await appsScriptResponse.json();

      if (appsScriptResult.status === 'SUCCESS' && appsScriptResult.checkoutUrl) {
        const makeWebhookResponse = await fetch(CartConfig.MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...orderData,
            appsScriptOrderId: appsScriptResult.orderId,
            checkoutUrl: appsScriptResult.checkoutUrl
          }),
        });

        if (!makeWebhookResponse.ok) {
          throw new Error(`Erro no Make.com: ${makeWebhookResponse.status} ${makeWebhookResponse.statusText}`);
        }
        const makeWebhookResult = await makeWebhookResponse.json();

        if (makeWebhookResult.status === 'SUCCESS' && makeWebhookResult.paymentUrl) {
          this.showNotification('Redirecionando para o pagamento...', 'info');
          window.location.href = makeWebhookResult.paymentUrl;
          this.clearCart();
        } else {
          this.showNotification('Erro ao gerar link de pagamento.', 'error');
          console.error('Erro Make.com:', makeWebhookResult);
        }
      } else {
        this.showNotification('Erro ao processar pedido no Apps Script.', 'error');
        console.error('Erro Apps Script:', appsScriptResult);
      }

    } catch (error) {
      console.error('Erro no checkout:', error);
      this.showNotification('Erro ao processar pedido. Tente novamente.', 'error');
    } finally {
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = payBtn.dataset.originalText || 'Pagar com Mercado Pago';
      }
    }
  }

  parsePriceToNumber(valor) {
    if (typeof valor === 'number') return valor;
    if (typeof valor === 'string') {
      const cleaned = valor.replace(/\./g, '').replace(/,/g, '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  saveToStorage() { try { localStorage.setItem(CartConfig.STORAGE_KEY, JSON.stringify(this.items)); } catch (e) { console.error('Erro ao salvar carrinho:', e); } }
  loadFromStorage() { try { const stored = localStorage.getItem(CartConfig.STORAGE_KEY); return stored ? JSON.parse(stored) : []; } catch (e) { console.error('Erro ao carregar carrinho:', e); return []; } }
  validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  formatPrice(price) { return `R$ ${(parseFloat(price) || 0).toFixed(2).replace('.', ',')}`; }
  escapeHtml(text) { const div = document.createElement('div'); div.textContent = text || ''; return div.innerHTML; }

  showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.cart-notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `cart-notification cart-notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      padding: 1rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInRight 0.3s ease;
      cursor: pointer;
    `;

    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;

    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      float: right;
      font-size: 1.5rem;
      font-weight: bold;
      margin-left: 10px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => notification.remove();
    notification.appendChild(closeBtn);

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);

    notification.onclick = () => notification.remove();
  }
}

// ==================== INSTÂNCIA GLOBAL ====================

let cart;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    cart = new ShoppingCart();
    window.cart = cart;
  });
} else {
  cart = new ShoppingCart();
  window.cart = cart;
}

// ==================== FUNÇÕES GLOBAIS DE COMPATIBILIDADE ====================

window.Cart = {
  adicionarItem: (produto) => cart?.addItem(produto),
  removerItem: (id) => cart?.removeItem(id),
  limparCarrinho: () => cart?.clearCart(),
  getItens: () => cart?.getItems() || [],
  getTotalItens: () => cart?.getTotalItems() || 0,
  getTotalValor: () => cart?.getTotalValue() || 0,
  abrirCarrinho: () => cart?.openCart(),
  fecharCarrinho: () => cart?.closeCart(),
  toggleCart: () => cart?.toggleCart()
};

window.adicionarAoCarrinho = (produtoId) => {
  if (typeof produtos !== 'undefined' && produtos.length > 0) {
    const produto = window.produtos.find(p => p.ID == produtoId);
    if (produto && cart) {
      cart.addItem(produto);
    }
  }
};

window.abrirCarrinho = () => cart?.openCart();
window.fecharCarrinho = () => cart?.closeCart();
window.limparCarrinho = () => cart?.clearCart();
window.finalizarCompra = () => cart?.showCheckoutForm();

// ==================== ESTILOS CSS ====================

const cartStyles = document.createElement('style');
cartStyles.textContent = `
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



  .carrinho-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    align-items: center;
  }

  .carrinho-item:last-child {
    border-bottom: none;
  }

  .carrinho-item-imagem {
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border-radius: 8px;
    font-size: 1.5rem;
  }

  .carrinho-item-imagem img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }

  .carrinho-item-info {
    flex: 1;
    min-width: 0;
  }

  .carrinho-item-titulo {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    color: #1f2937;
  }

  .carrinho-item-descricao {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0 0 0.5rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .carrinho-item-preco {
    font-weight: 600;
    color: #059669;
    font-size: 1rem;
  }

  .carrinho-item-controles {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .quantidade-controle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f3f4f6;
    border-radius: 6px;
    padding: 0.25rem;
  }

  .quantidade-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: #e5e7eb;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .quantidade-btn:hover:not(:disabled) {
    background: #d1d5db;
  }

  .quantidade-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .quantidade-valor {
    min-width: 20px;
    text-align: center;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .remover-item-btn {
    background: #fee2e2;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
  }

  .remover-item-btn:hover {
    background: #fecaca;
  }

  .checkout-total {
    text-align: center;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 8px;
    margin-top: 1rem;
    font-size: 1.125rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .cart-notification {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
`;

document.head.appendChild(cartStyles);

// ==================== EXPORT ====================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShoppingCart;
}

