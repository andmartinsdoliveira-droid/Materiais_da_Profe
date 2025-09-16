/**
 * SISTEMA DE CARRINHO - LOJA EDUCACIONAL
 * Versão: 4.1 - Integrado ao Render/Mercado Pago
 * Data: Setembro 2025
 */

// ==================== CONFIGURAÇÕES DO CARRINHO ====================

// Função auxiliar: cria preferência no backend (Render)
async function criarPreferencia(items) {
  const resp = await fetch("https://backend-mercadopago-792m.onrender.com/create_preference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  if (!resp.ok) {
    throw new Error("Falha ao criar preferência de pagamento");
  }
  const data = await resp.json();
  return data.id; // preference_id
}

const CartConfig = {
  STORAGE_KEY: 'espacoEducador_carrinho',
  MAX_QUANTITY: 1, // Máximo 1 item por produto (evita duplicatas)
  BACKEND_URL: 'https://backend-mercadopago-792m.onrender.com', // Render agora é o único backend de pagamento
  MERCADO_PAGO_PUBLIC_KEY: 'TEST-30a03330-0583-4f41-bfd4-b5aa0a01e885' // substitua pela Public Key real do Mercado Pago
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
    const carrinhoModal = document.getElementById('carrinhoModal');
    if (carrinhoModal) carrinhoModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  bindEvents() {
    const cartBtn = document.getElementById('carrinhoBtn');
    if (cartBtn) cartBtn.addEventListener('click', () => this.toggleCart());

    const closeBtn = document.getElementById('fecharCarrinho');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeCart());

    const clearBtn = document.getElementById('limparCarrinho');
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearCart());

    const checkoutBtn = document.getElementById('finalizarCompra');
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.showCheckoutForm());

    const modal = document.getElementById('carrinhoModal');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeCart(); });

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
  getTotalItems() { return this.items.reduce((t, i) => t + i.quantity, 0); }
  getTotalValue() { return this.items.reduce((t, i) => t + (i.unit_price * i.quantity), 0); }

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
          ${item.image ? `<img src="${item.image}" alt="${item.title}" onerror="this.parentElement.innerHTML='📚'">` : '📚'}
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

    if (totalElement) totalElement.textContent = this.formatPrice(this.getTotalValue()).replace('R$ ', '');
  }

  updateCounter() {
    const counter = document.getElementById('carrinhoContador');
    if (counter) {
      const totalItems = this.getTotalItems();
      counter.textContent = totalItems > 0 ? totalItems : '';
      counter.style.display = totalItems > 0 ? 'flex' : 'none';
    }
  }

  createCheckoutModal() {
    // ... (mantém seu modal de checkout igual)
  }

  showCheckoutForm() {
    if (this.items.length === 0) {
      this.showNotification('Adicione itens ao carrinho antes de finalizar a compra', 'warning');
      return;
    }
    const modal = document.getElementById('checkoutModal');
    if (modal) {
      const totalElement = document.getElementById('checkoutTotal');
      if (totalElement) totalElement.textContent = this.formatPrice(this.getTotalValue()).replace('R$ ', '');
      this.mostrarCheckoutStep(1);
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  hideCheckoutForm() { /* igual ao seu código */ }
  clearCheckoutForm() { /* igual ao seu código */ }

  /**
   * 🔑 Checkout via Render/Mercado Pago
   */
  async processCheckout() {
    const name = document.getElementById('customerName')?.value?.trim();
    const email = document.getElementById('customerEmail')?.value?.trim();
    const phone = document.getElementById('customerPhone')?.value?.trim();
    const notes = document.getElementById('orderNotes')?.value?.trim();

    if (!name || !email) {
      this.showNotification('Nome e e-mail são obrigatórios', 'error');
      return;
    }
    if (!this.validateEmail(email)) {
      this.showNotification('E-mail inválido', 'error');
      return;
    }
    if (this.items.length === 0) {
      this.showNotification('Carrinho vazio', 'error');
      return;
    }

    const payBtn = document.getElementById('btnPagarMercadoPago');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.dataset.originalText = payBtn.textContent;
      payBtn.textContent = 'Processando...';
    }

    try {
      const preferenceId = await criarPreferencia(this.items);
      const mp = new MercadoPago(CartConfig.MERCADO_PAGO_PUBLIC_KEY, { locale: "pt-BR" });
      mp.checkout({
        preference: { id: preferenceId },
        autoOpen: true
      });

    } catch (error) {
      console.error("Erro no checkout:", error);
      this.showNotification('Erro ao iniciar o pagamento. Tente novamente.', 'error');
    } finally {
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = payBtn.dataset.originalText || 'Pagar com Mercado Pago';
      }
    }
  }

  mostrarCheckoutStep(step) { /* igual */ }
  continuarCheckout() { /* igual */ }
  gerarResumoPedido() { /* igual */ }

  saveToStorage() { try { localStorage.setItem(CartConfig.STORAGE_KEY, JSON.stringify(this.items)); } catch (e) {} }
  loadFromStorage() { try { return JSON.parse(localStorage.getItem(CartConfig.STORAGE_KEY)) || []; } catch (e) { return []; } }
  validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  formatPrice(price) { return `R$ ${(parseFloat(price)||0).toFixed(2).replace('.', ',')}`; }
  escapeHtml(text) { const div=document.createElement('div'); div.textContent=text||''; return div.innerHTML; }
  showNotification(message, type='info') { /* igual */ }
}

// ==================== INSTÂNCIA GLOBAL ====================
let cart;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { cart = new ShoppingCart(); window.cart = cart; });
} else {
  cart = new ShoppingCart();
  window.cart = cart;
}
