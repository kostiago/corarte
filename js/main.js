// Biblioteca compartilhada entre as páginas: desenho dos motivos em SVG,
// formatação de preço, montagem do cartão de produto, lupa e lightbox de
// foto em tela cheia. Cada página (pagina-inicio.js, pagina-colecao.js,
// pagina-produto.js, pagina-carrinho.js) importa este arquivo e chama essas
// funções na hora certa — não há mais nada rodando sozinho aqui.

// Gera o traço de xilogravura (SVG) para cada motivo do catálogo.
// Traço grosso, preto ou na cor de tinta do produto, sobre o tecido.
function motivoSVG(motivo, corTinta) {
  const t = corTinta;
  const motivos = {
    sol: `
      <circle cx="100" cy="100" r="34" fill="none" stroke="${t}" stroke-width="7"/>
      ${Array.from({ length: 12 })
        .map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = 100 + Math.cos(a) * 46;
          const y1 = 100 + Math.sin(a) * 46;
          const x2 = 100 + Math.cos(a) * 74;
          const y2 = 100 + Math.sin(a) * 74;
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${t}" stroke-width="6" stroke-linecap="round"/>`;
        })
        .join("")}
    `,
    estrela: `
      <path d="M100 34 L114 82 L164 82 L124 110 L138 158 L100 128 L62 158 L76 110 L36 82 L86 82 Z"
        fill="none" stroke="${t}" stroke-width="7" stroke-linejoin="round"/>
    `,
    galo: `
      <path d="M60 150 Q55 110 80 95 Q70 75 90 60 Q95 45 112 48 Q108 56 114 62 Q134 58 142 74
        Q150 72 156 80 Q146 86 140 84 Q146 96 138 106 Q150 112 150 126 Q136 118 128 122
        Q132 138 118 150 Q120 132 108 128 Q96 148 74 150 Q86 138 82 128 Q68 138 60 150 Z"
        fill="none" stroke="${t}" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="118" cy="66" r="3.5" fill="${t}"/>
    `,
    cacto: `
      <path d="M100 165 V80 M100 110 C100 90 78 92 78 112 C78 128 88 130 100 128
               M100 96 C100 80 122 82 122 100 C122 114 112 118 100 116"
        fill="none" stroke="${t}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M84 165 H116" stroke="${t}" stroke-width="7" stroke-linecap="round"/>
    `,
    flor: `
      <circle cx="100" cy="100" r="12" fill="${t}"/>
      ${Array.from({ length: 6 })
        .map((_, i) => {
          const a = (i * 60 * Math.PI) / 180;
          const cx = 100 + Math.cos(a) * 28;
          const cy = 100 + Math.sin(a) * 28;
          return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="16" ry="22"
            transform="rotate(${(i * 60).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})"
            fill="none" stroke="${t}" stroke-width="6"/>`;
        })
        .join("")}
    `,
    ave: `
      <path d="M30 120 Q70 70 100 100 Q130 70 170 120 Q130 108 100 122 Q70 108 30 120 Z"
        fill="none" stroke="${t}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M100 100 V150" stroke="${t}" stroke-width="6" stroke-linecap="round"/>
      <path d="M92 150 Q100 162 108 150" fill="none" stroke="${t}" stroke-width="6" stroke-linecap="round"/>
    `,
  };
  return motivos[motivo] || motivos.sol;
}

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Retorna true se o produto tem pelo menos uma foto real cadastrada.
function temFoto(produto) {
  return Array.isArray(produto.imagens) && produto.imagens.length > 0;
}

// Miolo visual do cartão/detalhe: foto real se existir, senão o motivo
// desenhado em SVG sobre a cor do tecido.
function conteudoVisual(produto, classeMotivo) {
  if (temFoto(produto)) {
    const capa = produto.imagens[0];
    return `<img src="${capa.src}" alt="${capa.alt || produto.nome}" loading="lazy" class="${classeMotivo}--foto" />`;
  }
  return `
    <svg viewBox="0 0 200 200" class="${classeMotivo}" aria-hidden="true">
      ${motivoSVG(produto.motivo, produto.corTinta)}
    </svg>
  `;
}

// Nome legível pra cada cor da paleta do ateliê — pra não mostrar só o
// código hexadecimal na ficha técnica. Cor fora dessa lista cai no hex mesmo.
const NOME_DA_COR = {
  "#EDE3C8": "Cru",
  "#E0D3AC": "Areia",
  "#DDD0AA": "Bege",
  "#1C1712": "Preto",
  "#A63625": "Terracota",
  "#C1932B": "Ocre",
  "#2B4C5C": "Azul petróleo",
};

function nomeDaCor(hex) {
  return NOME_DA_COR[hex.toUpperCase()] || hex;
}

function situacaoEstoque(produto) {
  return {
    esgotado: produto.estoque === 0,
    unica: produto.estoque === 1,
  };
}

function temDesconto(produto) {
  return typeof produto.precoOriginal === "number" && produto.precoOriginal > produto.preco;
}

function percentualDesconto(produto) {
  if (!temDesconto(produto)) return 0;
  return Math.round((1 - produto.preco / produto.precoOriginal) * 100);
}

// Cartão de produto: um link real para a página da peça — não um botão
// dentro de outro botão, e não abre modal. Funciona com teclado, leitor
// de tela, "abrir em nova aba" etc. de graça, por ser um <a> de verdade.
function cartaoProduto(produto, indice = 0) {
  const inclinacao = (indice % 2 === 0 ? -1 : 1) * (0.6 + (indice % 3) * 0.3);
  const { esgotado, unica } = situacaoEstoque(produto);
  const selo = esgotado
    ? '<span class="cartao__selo cartao__selo--esgotado">esgotada</span>'
    : unica
    ? '<span class="cartao__selo">peça única</span>'
    : "";
  return `
    <a class="cartao${esgotado ? " cartao--esgotado" : ""}" style="--tilt: ${inclinacao}deg" href="produto.html?id=${produto.id}">
      <div class="cartao__tecido" style="background:${produto.corTecido}">
        ${conteudoVisual(produto, "cartao__motivo")}
        ${selo}
      </div>
      <div class="cartao__info">
        <h3 class="cartao__nome">${produto.nome}</h3>
        <p class="cartao__preco">
          <span class="cartao__preco-atual">${formatarPreco(produto.preco)}</span>
          ${
            temDesconto(produto)
              ? `<span class="cartao__preco-original">${formatarPreco(produto.precoOriginal)}</span><span class="cartao__desconto">-${percentualDesconto(produto)}%</span>`
              : ""
          }
        </p>
      </div>
    </a>
  `;
}

// Desenha uma lista de produtos dentro do container indicado (por padrão
// "grade-produtos"). Não precisa de listener nenhum: são links de verdade.
function renderGrade(lista, containerId = "grade-produtos") {
  const grade = document.getElementById(containerId);
  if (!grade) return;
  if (lista.length === 0) {
    grade.innerHTML = `<p class="grade__vazio">Nenhuma peça por aqui ainda — volte em breve, o pincel não para.</p>`;
    return;
  }
  grade.innerHTML = lista.map((produto, i) => cartaoProduto(produto, i)).join("");
}

// Lupa de aumento: em telas com mouse, passar o cursor sobre a foto
// mostra um quadrado com a imagem ampliada dentro dele — mesmo formato
// (quadrado, não círculo) da lente usada na página de produto, só que
// aqui o resultado aparece dentro da própria lente, não num painel ao
// lado, porque a foto em tela cheia do lightbox não tem "lado" sobrando.
// Não entra em telas de toque.
function ativarLupa(container, img, opcoes = {}) {
  const suportaHover =
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!container || !suportaHover) {
    return;
  }

  const ZOOM = opcoes.zoom || 2.6;
  const TAMANHO = opcoes.tamanho || 150;
  const RAIO = TAMANHO / 2;

  let lupa = container.querySelector(".lupa");
  if (!lupa) {
    lupa = document.createElement("div");
    lupa.className = "lupa";
    lupa.style.width = `${TAMANHO}px`;
    lupa.style.height = `${TAMANHO}px`;
    container.appendChild(lupa);
  }

  function mover(e) {
    const rect = container.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, RAIO), rect.width - RAIO);
    const y = Math.min(Math.max(e.clientY - rect.top, RAIO), rect.height - RAIO);

    lupa.style.left = `${x}px`;
    lupa.style.top = `${y}px`;
    lupa.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    lupa.style.backgroundSize = `${rect.width * ZOOM}px ${rect.height * ZOOM}px`;
    lupa.style.backgroundPosition = `${((x / rect.width) * 100).toFixed(1)}% ${((y / rect.height) * 100).toFixed(1)}%`;
  }

  container.addEventListener("mouseenter", () => {
    lupa.style.display = "block";
  });
  container.addEventListener("mouseleave", () => {
    lupa.style.display = "none";
  });
  container.addEventListener("mousemove", mover);
}

// Zoom lateral estilo página de produto de marketplace: passar o mouse
// sobre a foto mostra uma lente quadrada (não um círculo flutuante), e o
// trecho ampliado aparece num painel ao lado da imagem, não por cima dela.
// Usada só na página de produto — o lightbox continua com a lupa circular
// de ativarLupa(), já que lá a foto ocupa a tela toda e não há "lado".
function ativarZoomLateral(tecido, img, lente, painel, opcoes = {}) {
  const suportaHover =
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!tecido || !img || !lente || !painel || !suportaHover) {
    return;
  }

  const ZOOM = opcoes.zoom || 2.2;
  const LADO = opcoes.lado || 130; // tamanho da lente quadrada, em px
  const METADE = LADO / 2;

  lente.style.width = `${LADO}px`;
  lente.style.height = `${LADO}px`;

  function mover(e) {
    const rect = tecido.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, METADE), rect.width - METADE);
    const y = Math.min(Math.max(e.clientY - rect.top, METADE), rect.height - METADE);

    lente.style.left = `${x}px`;
    lente.style.top = `${y}px`;

    painel.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    painel.style.backgroundSize = `${rect.width * ZOOM}px ${rect.height * ZOOM}px`;
    painel.style.backgroundPosition = `${((x / rect.width) * 100).toFixed(1)}% ${((y / rect.height) * 100).toFixed(1)}%`;
  }

  tecido.addEventListener("mouseenter", () => {
    lente.hidden = false;
    painel.hidden = false;
  });
  tecido.addEventListener("mouseleave", () => {
    lente.hidden = true;
    painel.hidden = true;
  });
  tecido.addEventListener("mousemove", mover);
}

// ---------- lightbox de foto em tela cheia ----------
// Genérico: qualquer página com um #lightbox no HTML pode chamar
// abrirLightbox(...). A ligação dos botões de fechar/Escape/clique fora
// é feita por configurarLightbox(), chamada uma vez no carregamento da
// página que usa o componente.

function abrirLightbox(conteudo) {
  const lightbox = document.getElementById("lightbox");
  const area = document.getElementById("lightbox-conteudo");
  if (!lightbox || !area) return;
  area.innerHTML = "";

  if (conteudo.tipo === "foto") {
    const moldura = document.createElement("div");
    moldura.className = "lightbox__moldura";

    const img = document.createElement("img");
    img.className = "lightbox__img";
    img.src = conteudo.src;
    img.alt = conteudo.alt || "";

    moldura.appendChild(img);
    area.appendChild(moldura);

    // Zoom extra sobre o zoom: a foto já está em tela cheia, então a lupa
    // aqui usa mais aumento que a da página de produto.
    ativarLupa(moldura, img, { zoom: 3.2, tamanho: 190 });
  } else {
    const moldura = document.createElement("div");
    moldura.className = "lightbox__moldura";
    moldura.style.background = conteudo.corTecido;
    moldura.innerHTML = `
      <svg viewBox="0 0 200 200" class="lightbox__motivo" role="img" aria-label="${conteudo.alt || ""}">
        ${motivoSVG(conteudo.motivo, conteudo.corTinta)}
      </svg>
    `;
    area.appendChild(moldura);
  }
  lightbox.classList.add("lightbox--aberto");
}

function fecharLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (lightbox) lightbox.classList.remove("lightbox--aberto");
}

function configurarLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  lightbox.addEventListener("click", (e) => {
    if (e.target.id === "lightbox") fecharLightbox();
  });
  const fechar = lightbox.querySelector(".lightbox__fechar");
  if (fechar) fechar.addEventListener("click", fecharLightbox);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("lightbox--aberto")) {
      fecharLightbox();
    }
  });
}
