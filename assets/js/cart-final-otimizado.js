/**
 * SISTEMA DE CARRINHO - LOJA EDUCACIONAL
 * Versão: 4.3-PROD - Fluxo idêntico ao antigo (Make -> init_point) + toasts no topo
 * Data: Outubro 2025
 */

// ==================== CONFIGURAÇÕES DO CARRINHO ====================
const CartConfig = {
  STORAGE_KEY: 'materiaisdaprofe_carrinho',
  MAX_QUANTITY: 1, // Máximo 1 item por produto (evita duplicatas)
  // URLs do arquivo antigo (as que funcionavam)
  APPS_SCRIPT_BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxePs6JdZksbIGZ7SsbqxNOuZ0f9asF1-LdNJsDWDPZTc4zjpCN_Kb6aelvlUexiDk9dA/exec',
  MAKE_WEBHOOK_URL: 'https://hook.us2.make.com/vacsfmao14l99567z40vrty9fg29b78m',
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

  init() {
    this.updateCounter();
    this.bindEvents();
    this.createCheckoutModal();

    // Garantir que o modal do carrinho feche corretamente se existir no HTML legado
    const carrinhoModal = document.getElementById('carrinhoModal');
    if (carrinhoModal) {
      try { carrinhoModal.style.display = 'none'; } catch (e) {}
    }
    try { document.body.style.overflow = ''; } catch (e) {}

    // Garante contêiner dos toasts no topo
    this.ensureToastContainer();
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
      // normalização robusta de preço (suporta "7,90" e "7.90")
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
          ${item.image
            ? `<img src="${item.image}" alt="${this.escapeHtml(item.title)}" onerror="this.parentElement.innerHTML='📚'"/>`
            : '📚'
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
                <textarea id="orderNotes" class="form-input" rows="3" placeholder="Informações adicionais..."></textarea>
              </div>
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
        document.getElementById('orderNotes').value = this.customerData.notes || '';
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

  mostrarCheckoutStep(step) {
    const step1 = document.getElementById('checkoutStep1');
    const step2 = document.getElementById('checkoutStep2');
    const footer = document.querySelector('#checkoutModal .modal-footer');
    if (!step1 || !step2 || !footer) return;

    if (step === 1) {
      step1.style.display = 'block';
      step2.style.display = 'none';
      footer.style.display = 'flex';
      this.currentCheckoutStep = 1;
    } else if (step === 2) {
      this.gerarResumoPedido();
      step1.style.display = 'none';
      step2.style.display = 'block';
      footer.style.display = 'none';
      this.currentCheckoutStep = 2;
    }
  }

  continuarCheckout() {
    const name = document.getElementById('customerName')?.value?.trim();
    const email = document.getElementById('customerEmail')?.value?.trim();
    const phone = document.getElementById('customerPhone')?.value?.trim();
    const notes = document.getElementById('orderNotes')?.value?.trim();

    if (!name || !email) {
      this.showNotification('Por favor, preencha seu nome e e-mail.', 'error');
      return;
    }
    if (!this.validateEmail(email)) {
      this.showNotification('Por favor, insira um e-mail válido.', 'error');
      return;
    }

    this.customerData = { name, email, phone, notes };
    this.mostrarCheckoutStep(2);
  }

  gerarResumoPedido() {
    const resumoItensContainer = document.getElementById('resumoPedidoItens');
    const resumoTotalElement = document.getElementById('resumoPedidoTotal');
    if (!resumoItensContainer || !resumoTotalElement) return;

    resumoItensContainer.innerHTML = this.items.map(item => `
      <div class="resumo-item">
        <span>${this.escapeHtml(item.title)} x ${item.quantity}</span>
        <span>${this.formatPrice(item.unit_price * item.quantity)}</span>
      </div>
    `).join('');

    resumoTotalElement.textContent = this.formatPrice(this.getTotalValue()).replace('R$ ', '');
  }

  // ==================== CHECKOUT (Make -> init_point) ====================
  async processCheckout() {
    const payBtn = document.getElementById('btnPagarMercadoPago');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.dataset.originalText = payBtn.textContent;
      payBtn.textContent = 'Processando...';
    }

    try {
      // 1) Monta payer (nome, email, telefone)
      const payerData = {
        name: this.customerData.name,
        email: this.customerData.email,
        phone: {
          area_code: this.customerData.phone ? this.customerData.phone.replace(/\D/g, '').substring(0, 2) : "",
          number: this.customerData.phone ? this.customerData.phone.replace(/\D/g, '').substring(2) : ""
        }
      };

      // 2) Payload para o Make (idêntico ao que funcionava)
      const dadosParaMake = {
        items: this.items.map(item => ({
          id: String(item.id),
          title: item.title,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          description: item.description,
          picture_url: item.image,
          currency_id: "BRL"
        })),
        payer: payerData,
        metadata: {
          notes: this.customerData.notes
        }
      };

      // 3) Chama Make diretamente (como no arquivo antigo)
      const response = await fetch(CartConfig.MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(dadosParaMake),
      });

      if (!response.ok) {
        let errorMsg = `Falha na comunicação com o servidor (${response.status})`;
        // tenta json de erro se houver
        try {
          if (response.headers.get('content-type')?.includes('application/json')) {
            const errJson = await response.json();
            errorMsg = errJson?.message || errJson?.error || errorMsg;
          }
        } catch (_) {/* ignore */}
        throw new Error(errorMsg);
      }

      // 4) Espera { init_point } (produção Mercado Pago)
      let resultado = {};
      if (response.headers.get('content-type')?.includes('application/json')) {
        try { resultado = await response.json(); } catch (_) {}
      }

      const paymentLink = resultado.init_point;
      if (paymentLink) {
        // limpa carrinho e redireciona
        this.items = [];
        this.saveToStorage();
        this.updateCounter();
        window.location.href = paymentLink;
      } else {
        throw new Error('Link de pagamento não foi gerado (init_point ausente).');
      }

    } catch (error) {
      console.error("Erro ao processar checkout via Make.com:", error);
      const isCors = (error?.message || '').toLowerCase().includes('failed to fetch');
      this.showNotification(
        isCors ? 'Falha de rede/CORS ao chamar o serviço de pagamento. Tente novamente.' : (error.message || 'Ops! Não foi possível iniciar o pagamento.'),
        'error'
      );
    } finally {
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = payBtn.dataset.originalText || 'Pagar com Mercado Pago';
      }
    }
  }

  // ==================== STORAGE/HELPERS ====================
  saveToStorage() {
    try { localStorage.setItem(CartConfig.STORAGE_KEY, JSON.stringify(this.items)); }
    catch (e) { console.error('Erro ao salvar carrinho:', e); }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(CartConfig.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Erro ao carregar carrinho:', e);
      return [];
    }
  }

  validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

  formatPrice(price) { return `R$ ${(parseFloat(price) || 0).toFixed(2).replace('.', ',')}`; }

  escapeHtml(text) { const div = document.createElement('div'); div.textContent = text || ''; return div.innerHTML; }

  // helper para interpretar preços "7,90" / "7.90" / "7"
  parsePriceToNumber(valor) {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    const str = String(valor).trim().replace(/\s/g, '');
    // troca vírgula por ponto, remove qualquer caractere extra
    const normalized = str.replace(',', '.').replace(/[^0-9.]/g, '');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  // ==================== NOTIFICAÇÕES (TOPO DA TELA) ====================
  ensureToastContainer() {
    if (!document.getElementById('cartToastContainer')) {
      const c = document.createElement('div');
      c.id = 'cartToastContainer';
      c.style.position = 'fixed';
      c.style.top = '20px';
      c.style.right = '20px';
      c.style.display = 'flex';
      c.style.flexDirection = 'column';
      c.style.gap = '10px';
      c.style.zIndex = '99999';
      document.body.appendChild(c);
    }
  }

  showNotification(message, type = 'info') {
    this.ensureToastContainer();

    const container = document.getElementById('cartToastContainer');

    const notification = document.createElement('div');
    notification.className = `cart-notification cart-notification-${type}`;
    notification.textContent = message;

    // botão fechar (opcional)
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.style.marginLeft = '12px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '18px';
    closeBtn.onclick = () => {
      notification.style.animation = 'slideOutRight 200ms ease forwards';
      setTimeout(() => notification.remove(), 180);
    };

    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'space-between';
    wrap.style.gap = '8px';
    wrap.appendChild(notification);
    wrap.appendChild(closeBtn);

    // animação de entrada
    wrap.style.animation = 'slideInRight 250ms ease';
    container.appendChild(wrap);

    // auto-dismiss
    setTimeout(() => {
      if (wrap && wrap.parentNode) {
        wrap.style.animation = 'slideOutRight 200ms ease forwards';
        setTimeout(() => wrap.remove(), 180);
      }
    }, 5000);
  }
}

// ==================== INSTÂNCIA E FUNÇÕES GLOBAIS ====================
let cart;
document.addEventListener('DOMContentLoaded', () => {
  cart = new ShoppingCart();
  window.cart = cart;
});

// A função adicionarAoCarrinho usa a URL do Apps Script para buscar o produto (fallback)
window.adicionarAoCarrinho = async (produtoId) => {
  if (typeof produtos === 'undefined' || !Array.isArray(produtos) || produtos.length === 0) {
    try {
      const response = await fetch(CartConfig.APPS_SCRIPT_BACKEND_URL);
      if (!response.ok) throw new Error('Falha ao carregar produtos do Apps Script.');
      window.produtos = await response.json(); // Popula a variável global 'produtos'
    } catch (error) {
      console.error('Erro ao carregar produtos para adicionar ao carrinho:', error);
      cart?.showNotification('Erro ao carregar produtos. Tente novamente.', 'error');
      return;
    }
  }

  const produto = window.produtos.find(p => p.ID == produtoId);
  if (produto && cart) {
    cart.addItem(produto);
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
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  @keyframes slideOutRight {
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(100%); opacity: 0; }
  }

  /* Itens do carrinho */
  .carrinho-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    align-items: center;
  }
  .carrinho-item:last-child { border-bottom: none; }
  .carrinho-item-imagem {
    width: 60px; height: 60px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: #f3f4f6; border-radius: 8px; font-size: 1.5rem;
  }
  .carrinho-item-imagem img {
    width: 100%; height: 100%; object-fit: cover; border-radius: 8px;
  }
  .carrinho-item-info { flex: 1; min-width: 0; }
  .carrinho-item-titulo { font-size: 1rem; font-weight: 600; margin: 0 0 0.25rem 0; color: #1f2937; }
  .carrinho-item-descricao {
    font-size: 0.875rem; color: #6b7280; margin: 0 0 0.5rem 0;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .carrinho-item-preco { font-weight: 600; color: #059669; font-size: 1rem; }
  .carrinho-item-controles { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }

  .quantidade-controle {
    display: flex; align-items: center; gap: 0.5rem;
    background: #f3f4f6; border-radius: 6px; padding: 0.25rem;
  }
  .quantidade-btn {
    width: 28px; height: 28px; border: none; background: #e5e7eb; border-radius: 4px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    font-weight: 600; transition: all 0.2s ease;
  }
  .quantidade-btn:hover:not(:disabled) { background: #d1d5db; }
  .quantidade-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .quantidade-valor { min-width: 20px; text-align: center; font-weight: 600; font-size: 0.875rem; }

  .remover-item-btn {
    background: #fee2e2; border: none; border-radius: 4px; padding: 0.25rem 0.5rem;
    cursor: pointer; transition: all 0.2s ease; font-size: 0.875rem;
  }
  .remover-item-btn:hover { background: #fecaca; }

  .checkout-total {
    text-align: center; padding: 1rem; background: #f9fafb; border-radius: 8px;
    margin-top: 1rem; font-size: 1.125rem;
  }

  .form-group { margin-bottom: 1rem; }
  .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
  .form-input {
    width: 100%; padding: 0.75rem; border: 1px solid #d15d5db; border-radius: 6px; font-size: 1rem;
    transition: border-color 0.2s ease;
  }
  .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

  /* Toasts no topo */
  .cart-notification {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #111827; color: #fff; padding: 12px 14px; border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    min-width: 260px; max-width: 420px;
    font-size: 14px; line-height: 1.35;
  }
  .cart-notification-info { background: #1f2937; }
  .cart-notification-success { background: #065f46; }
  .cart-notification-warning { background: #92400e; }
  .cart-notification-error { background: #7f1d1d; }
`;
document.head.appendChild(cartStyles);

// ==================== EXPORT ====================
// Para compatibilidade com módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShoppingCart;
}
