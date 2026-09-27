// Cabeçalho e rodapé compartilhados entre as páginas, mais utilitários
// usados em mais de uma delas. Como o site é HTML estático sem build,
// cada página injeta este markup em containers vazios (#cabecalho-app e
// #rodape-app) via JS, em vez de duplicar o mesmo HTML em cada arquivo.

// Escapa texto antes de jogar dentro de innerHTML — usado onde o conteúdo
// pode vir de fora (ex: termo de busca digitado na URL), pra não deixar
// uma aspa ou "<" quebrar o HTML ou virar um script.
function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = String(texto ?? "");
  return div.innerHTML;
}

// ---------- sacola ----------
// Cada item é { produtoId, tamanho, cor, quantidade }. Não há pagamento no
// site: a sacola serve pra montar o pedido, que é fechado pelo WhatsApp.
// O limite de cada peça é o "estoque" dela no data.js — e ele vale pra peça
// inteira, somando todos os tamanhos/cores dela na sacola.

const CHAVE_SACOLA = "corarte.sacola";
// Chave antiga (de antes do rebranding para "Corarte"), mantida de propósito
// com o nome velho — serve só pra migrar, uma vez, quem já tinha peça
// guardada nesse navegador antes da sacola com quantidade existir.
const CHAVE_LISTA_ANTIGA = "tintaEPano.listaDeInteresse";

// Retorna null quando a chave nunca foi salva (chave ausente de verdade),
// e um array (vazio ou não) quando já existe algo salvo ali — mesmo que
// seja "[]". Essa distinção é o que evita reviver a sacola depois de
// esvaziá-la (ver obterSacola).
function lerItens(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    if (bruto === null) return null;
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return []; // dado corrompido: trata como vazio, mas presente — não repete a migração abaixo
  }
}

function obterSacola() {
  let itens = lerItens(CHAVE_SACOLA);
  if (itens === null) {
    // Primeira leitura depois da atualização: migra o que existia na lista
    // antiga UMA ÚNICA VEZ, já gravando na chave nova — dali em diante
    // CHAVE_SACOLA sempre existe (mesmo vazia), então isso não roda de novo.
    itens = lerItens(CHAVE_LISTA_ANTIGA) || [];
    try {
      localStorage.setItem(CHAVE_SACOLA, JSON.stringify(itens));
    } catch {
      // localStorage indisponível — segue só com o que leu, sem persistir
    }
  }
  return itens.map((item) => ({
    produtoId: item.produtoId,
    tamanho: item.tamanho ?? null,
    cor: item.cor ?? null,
    quantidade: Math.max(1, Math.floor(Number(item.quantidade)) || 1),
  }));
}

function salvarSacola(itens) {
  try {
    localStorage.setItem(CHAVE_SACOLA, JSON.stringify(itens));
  } catch {
    // localStorage indisponível (aba anônima, storage bloqueado etc.) —
    // a sacola simplesmente não persiste entre visitas, sem quebrar a página.
  }
  atualizarBadgeSacola();
}

function estoqueDoProduto(produtoId) {
  const produto = PRODUTOS.find((p) => p.id === produtoId);
  return produto ? produto.estoque : 0;
}

function quantidadeDoProduto(produtoId, itens = obterSacola()) {
  return itens.filter((i) => i.produtoId === produtoId).reduce((soma, i) => soma + i.quantidade, 0);
}

function totalDeItensNaSacola() {
  return obterSacola().reduce((soma, i) => soma + i.quantidade, 0);
}

// Soma 1 unidade (ou cria a linha). Recusa se a peça já atingiu o estoque.
function adicionarNaSacola(produtoId, tamanho, cor) {
  const itens = obterSacola();
  if (quantidadeDoProduto(produtoId, itens) >= estoqueDoProduto(produtoId)) {
    return { ok: false, motivo: "limite" };
  }
  const corNormalizada = cor || null;
  const existente = itens.find(
    (i) => i.produtoId === produtoId && i.tamanho === tamanho && i.cor === corNormalizada
  );
  if (existente) existente.quantidade += 1;
  else itens.push({ produtoId, tamanho, cor: corNormalizada, quantidade: 1 });
  salvarSacola(itens);
  return { ok: true, noTotal: quantidadeDoProduto(produtoId, itens) };
}

// delta = +1 / -1. Nunca deixa a quantidade ficar abaixo de 1 (pra tirar a
// peça existe removerDaSacola) nem passar do estoque.
function alterarQuantidade(indice, delta) {
  const itens = obterSacola();
  const item = itens[indice];
  if (!item) return false;
  const nova = item.quantidade + delta;
  if (nova < 1) return false;
  if (delta > 0 && quantidadeDoProduto(item.produtoId, itens) >= estoqueDoProduto(item.produtoId)) return false;
  item.quantidade = nova;
  salvarSacola(itens);
  return true;
}

function removerDaSacola(indice) {
  const itens = obterSacola();
  itens.splice(indice, 1);
  salvarSacola(itens);
  return itens;
}

function atualizarBadgeSacola() {
  const quantidade = totalDeItensNaSacola();
  document.querySelectorAll("[data-sacola-contagem]").forEach((el) => {
    el.textContent = quantidade;
    el.hidden = quantidade === 0;
  });
}

// ---------- cabeçalho ----------

function renderCabecalho(paginaAtual) {
  const alvo = document.getElementById("cabecalho-app");
  if (!alvo) return;

  const params = new URLSearchParams(location.search);
  const buscaAtual = paginaAtual === "colecao" ? params.get("busca") || "" : "";

  alvo.innerHTML = `
    <div class="aviso-topo">
      Peças pintadas à mão, uma a uma — encomendas abertas.
      <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">Fale no WhatsApp</a>
    </div>
    <header class="cabecalho">
      <a class="marca" href="index.html">
        <span class="marca__nome">Corarte</span>
        <span class="marca__sub">ateliê de camisas pintadas</span>
      </a>
      <button class="cabecalho__menu" aria-expanded="false" aria-controls="nav-principal" aria-label="Abrir menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <nav class="nav-principal" id="nav-principal" aria-label="Navegação principal">
        <a href="index.html" ${paginaAtual === "inicio" ? 'aria-current="page"' : ""}>Início</a>
        <a href="colecao.html" ${paginaAtual === "colecao" ? 'aria-current="page"' : ""}>Coleção</a>
        <a href="customizar.html" ${paginaAtual === "customizar" ? 'aria-current="page"' : ""}>Personalizar</a>
        <a href="index.html#sobre">Sobre o ateliê</a>
        <form class="busca busca--menu" action="colecao.html" role="search">
          <button type="submit" aria-label="Buscar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.6" y2="16.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <input type="search" name="busca" value="${escaparHTML(buscaAtual)}" placeholder="Buscar uma pintura…" aria-label="Buscar no catálogo" />
        </form>
      </nav>
      <form class="busca busca--topo" action="colecao.html" role="search">
        <button type="submit" aria-label="Buscar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.6" y2="16.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <input type="search" name="busca" value="${escaparHTML(buscaAtual)}" placeholder="Buscar uma pintura…" aria-label="Buscar no catálogo" />
      </form>
      <a class="cabecalho__sacola" href="carrinho.html" aria-label="Ver sacola">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16l-1.5 12.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 7V5a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
        <span class="cabecalho__badge" data-sacola-contagem hidden>0</span>
      </a>
    </header>
  `;

  const botaoMenu = alvo.querySelector(".cabecalho__menu");
  const nav = alvo.querySelector("#nav-principal");
  botaoMenu.addEventListener("click", () => {
    const aberto = nav.classList.toggle("nav-principal--aberto");
    botaoMenu.setAttribute("aria-expanded", String(aberto));
  });

  atualizarBadgeSacola();
}

// ---------- rodapé ----------

function renderRodape() {
  const alvo = document.getElementById("rodape-app");
  if (!alvo) return;

  const mensagemNovidades = encodeURIComponent("Olá! Quero entrar na lista de novidades do Corarte.");

  alvo.innerHTML = `
    <section class="cta-whats">
      <div>
        <h2>Quer saber quando sai pintura nova?</h2>
        <p>Entre na lista do WhatsApp do ateliê — sem spam, só um recado quando uma arte nova ficar pronta.</p>
      </div>
      <a class="botao botao--whatsapp" href="https://wa.me/${CONFIG.whatsapp}?text=${mensagemNovidades}" target="_blank" rel="noopener">Entrar na lista</a>
    </section>
    <footer class="rodape" id="contato">
      <div class="rodape__colunas">
        <div class="rodape__marca">
          <span class="marca__nome">Corarte</span>
          <p>Camisas pintadas à mão, uma a uma, com motivos da xilogravura nordestina.</p>
        </div>
        <div class="rodape__coluna">
          <h3>Ateliê</h3>
          <a href="index.html#sobre">Sobre o ateliê</a>
          <a href="customizar.html">Personalize sua camisa</a>
          <a href="index.html#como-funciona">Como funciona a encomenda</a>
        </div>
        <div class="rodape__coluna">
          <h3>Coleção</h3>
          ${CATEGORIAS.filter((c) => c.id !== "todos")
            .map((c) => `<a href="colecao.html?categoria=${c.id}">${c.nome}</a>`)
            .join("")}
        </div>
        <div class="rodape__coluna">
          <h3>Fale com a gente</h3>
          <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
          <a href="${CONFIG.instagram}" target="_blank" rel="noopener">Instagram</a>
        </div>
      </div>
      <div class="rodape__base">
        <span>Corarte — feito à mão na Paraíba, © <span id="ano"></span></span>
      </div>
    </footer>
  `;

  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();
}
