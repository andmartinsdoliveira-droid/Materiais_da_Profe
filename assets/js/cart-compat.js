// cart-compat.js
// Camada de compatibilidade para evitar reescrever todo o frontend.
// Deve ser incluída logo depois de cart.js e antes dos scripts inline da página.

(function () {
  // Certifique-se de que o objeto 'cart' (novo) existe
  if (typeof cart === 'undefined') {
    console.warn('Compat layer: objeto "cart" não encontrado. Se o seu cart.js não criar "cart", adapte isto.');
    return;
  }

  // Helper: encontra índice no cart por id
  function findIndexById(productId) {
    if (!productId && productId !== 0) return -1;
    return cart.cart.findIndex(it => String(it.id) === String(productId) || String(it.ID) === String(productId));
  }

  // Helper: converte produto vindo do backend/frontend para o formato esperado por cart.addItem
  function mapToCartProduct(produto, quantidade = 1) {
    if (!produto) return null;

    const id = produto.id || produto.ID || produto.Codigo || produto.codigo || produto.Id || produto.IdProduto;
    const name = produto.name || produto.Nome || produto.nome || produto.Title || produto.title || 'Produto';
    const priceRaw = produto.price || produto.Preço || produto.preco || produto.Price || produto.price_raw || 0;
    const price = parseFloat(String(priceRaw).replace(',', '.')) || 0;
    let image = '';

    if (produto.image) image = produto.image;
    else if (produto.image_url) image = produto.image_url;
    else if (Array.isArray(produto.Imagens) && produto.Imagens.length > 0) image = produto.Imagens[0];
    else if (produto.URL_Imagem) image = produto.URL_Imagem;
    else image = 'assets/images/placeholder.jpg';

    return {
      id: id,
      name: name,
      price: price,
      image: image,
      quantity: quantidade
    };
  }

  // Atualiza contador visual que o frontend usa (#carrinhoContador e .carrinho-contador)
  function updateVisualCounters() {
    try {
      const count = cart.getItemCount ? cart.getItemCount() : (cart.cart ? cart.cart.reduce((s, it) => s + (it.quantity || it.quantidade || 0), 0) : 0);
      const el = document.getElementById('carrinhoContador') || document.getElementById('cartCount') || document.querySelector('.cart-count');
      if (el) {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      }
      // também atualiza elementos com classe .carrinho-contador
      document.querySelectorAll('.carrinho-contador, .cart-count').forEach(e => {
        e.textContent = count;
        e.style.display = count > 0 ? 'flex' : 'none';
      });
    } catch (err) {
      console.warn('Compat layer: falha ao atualizar counters', err);
    }
  }

  // Constrói array no formato que o frontend atual espera (ID, Nome, Preço, Imagens, quantidade, URL_Imagem)
  function mapCartItemsToFrontendItems() {
    return (cart.cart || []).map(item => ({
      ID: item.id,
      Nome: item.name,
      Preço: item.price,
      quantidade: item.quantity,
      Imagens: item.image ? [item.image] : (item.Imagens || []),
      URL_Imagem: item.image || (item.URL_Imagem || '')
    }));
  }

  // Criando objeto global Cart (compatibilidade)
  window.Cart = {
    adicionarItem: function (produto, quantidade = 1) {
      try {
        const mapped = mapToCartProduct(produto, quantidade);
        if (!mapped || (mapped.id === undefined || mapped.id === null)) {
          console.error('Cart.adicionarItem: produto inválido', produto);
          return false;
        }
        const ok = cart.addItem(mapped, quantidade);
        updateVisualCounters();
        return ok;
      } catch (err) {
        console.error('Cart.adicionarItem erro:', err);
        return false;
      }
    },

    // Remove por ID (aceita id ou index dependendo do frontend)
    removerItem: function (productIdOrIndex) {
      try {
        // se for number e existir index direto, tenta índice primeiro
        if (typeof productIdOrIndex === 'number' && productIdOrIndex >= 0 && productIdOrIndex < (cart.cart || []).length) {
          cart.removeItem(productIdOrIndex);
        } else {
          const idx = findIndexById(productIdOrIndex);
          if (idx >= 0) cart.removeItem(idx);
        }
        updateVisualCounters();
      } catch (err) {
        console.error('Cart.removerItem erro:', err);
      }
    },

    // retorna itens no formato antigo que o código de UI espera
    getItens: function () {
      return mapCartItemsToFrontendItems();
    },

    getTotal: function () {
      return cart.getTotal ? cart.getTotal() : 0;
    },

    getTotalItens: function () {
      return cart.getItemCount ? cart.getItemCount() : ((cart.cart || []).reduce((s, it) => s + (it.quantity || 0), 0));
    },

    // Quantidade: recebe productId (ou index) — a UI chama por ID, então tentamos por ID.
    aumentarQuantidade: function (productId) {
      const idx = findIndexById(productId);
      if (idx >= 0) {
        cart.changeQuantity(idx, 1);
        if (typeof atualizarCarrinho === 'function') atualizarCarrinho();
        updateVisualCounters();
      }
    },

    diminuirQuantidade: function (productId) {
      const idx = findIndexById(productId);
      if (idx >= 0) {
        cart.changeQuantity(idx, -1);
        if (typeof atualizarCarrinho === 'function') atualizarCarrinho();
        updateVisualCounters();
      }
    },

    atualizarQuantidade: function (productId, quantity) {
      const idx = findIndexById(productId);
      const q = parseInt(quantity, 10) || 1;
      if (idx >= 0) {
        cart.updateQuantity(idx, q);
        if (typeof atualizarCarrinho === 'function') atualizarCarrinho();
        updateVisualCounters();
      }
    },

    limpar: function () {
      cart.clearCart();
      if (typeof atualizarCarrinho === 'function') atualizarCarrinho();
      updateVisualCounters();
    },

    // Métodos utilitários adicionais (para compatibilidade)
    // (algumas páginas chamam Cart.getTotal, Cart.getItens etc)
  };

  // Inicializa contadores na carga da página
  document.addEventListener('DOMContentLoaded', updateVisualCounters);
  // Atualiza quando a aba ganha foco (sincronizar com localStorage caso outras abas mexam)
  window.addEventListener('focus', updateVisualCounters);

  // Expõe mapeadores para debug
  window._cartCompat = {
    mapToCartProduct,
    mapCartItemsToFrontendItems,
    findIndexById
  };

})();
