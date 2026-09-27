// Página de detalhe de uma peça (produto.html?id=p01). Substitui o antigo
// modal "quick view": agora é uma página de verdade, com URL própria —
// dá pra mandar o link direto de uma camisa específica.

// Conteúdo de exemplo para as abas "Cuidados" e "Perguntas frequentes".
// Marcado como exemplo de propósito: são textos genéricos para preencher
// o layout — revise antes de publicar, principalmente prazo e trocas.
const CUIDADOS_EXEMPLO = `
  <ul class="lista-cuidados">
    <li>Lave à mão ou no ciclo delicado, sempre com a estampa virada pro avesso.</li>
    <li>Não use alvejante — a tinta têxtil escurece com produtos à base de cloro.</li>
    <li>Seque à sombra, estendida, para o traço não esticar no varal.</li>
    <li>Passe a ferro pelo avesso, sem passar diretamente sobre a pintura.</li>
  </ul>
`;

const PERGUNTAS_EXEMPLO = `
  <dl class="lista-perguntas">
    <div><dt>Quanto tempo leva pra pintar?</dt><dd>Combine o prazo direto pelo WhatsApp — varia conforme a fila de encomendas do ateliê.</dd></div>
    <div><dt>Dá pra trocar de tamanho depois de combinado?</dt><dd>Se a peça ainda não entrou em produção, sim — fale com o ateliê o quanto antes.</dd></div>
    <div><dt>Como funciona o frete?</dt><dd>Combinado à parte, também pelo WhatsApp, conforme sua cidade.</dd></div>
  </dl>
`;

// Nome de exibição de cada motivo — os IDs curtos (usados em motivoSVG)
// não são bonitos o bastante pra aparecer na tabela de características.
const MOTIVO_NOMES = {
  sol: "Sol",
  estrela: "Estrela de cordel",
  galo: "Galo",
  cacto: "Mandacaru",
  flor: "Flor de São João",
  ave: "Ave",
};

// Ícones simples, no mesmo traço fino usado no resto do site — não são
// logotipos de bandeira/instituição, só pictogramas genéricos.
const ICONE_CARTAO =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="2" y1="9.5" x2="22" y2="9.5" stroke="currentColor" stroke-width="1.8"/></svg>';
const ICONE_PIX =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-13h-6z" fill="currentColor"/></svg>';
const ICONE_DINHEIRO =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

function montarTrilha(produto) {
  const categoria = CATEGORIAS.find((c) => c.id === produto.categoria);
  document.getElementById("trilha").innerHTML = `
    <a href="index.html">Início</a> <span aria-hidden="true">/</span>
    <a href="colecao.html">Coleção</a> <span aria-hidden="true">/</span>
    <a href="colecao.html?categoria=${produto.categoria}">${categoria ? categoria.nome : ""}</a> <span aria-hidden="true">/</span>
    <span>${produto.nome}</span>
  `;
}

function montarGaleria(produto) {
  if (temFoto(produto)) {
    const miniaturas = produto.imagens
      .map(
        (img, i) => `
        <button class="miniatura ${i === 0 ? "miniatura--ativa" : ""}" data-src="${img.src}" data-alt="${img.alt || produto.nome}" aria-label="Ver foto ${i + 1}">
          <img src="${img.src}" alt="" loading="lazy" />
        </button>
      `
      )
      .join("");
    return `
      <div class="produto__galeria">
        ${produto.imagens.length > 1 ? `<div class="produto__miniaturas">${miniaturas}</div>` : ""}
        <div class="produto__imagem-wrap">
          <div class="produto__tecido" style="background:${produto.corTecido}">
            ${conteudoVisual(produto, "produto__motivo")}
            <button class="produto__expandir" aria-label="Ver imagem em tela cheia" title="Ver em tela cheia">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <div class="produto__lente" hidden></div>
          </div>
          <div class="produto__zoom-painel" hidden></div>
        </div>
      </div>
    `;
  }
  return `
    <div class="produto__galeria">
      <div class="produto__imagem-wrap">
        <div class="produto__tecido" style="background:${produto.corTecido}">
          ${conteudoVisual(produto, "produto__motivo")}
          <button class="produto__expandir" aria-label="Ver imagem em tela cheia" title="Ver em tela cheia">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Mensagem do WhatsApp, montada a partir do que está selecionado agora
// (tamanho e, se a peça tiver, cor) — chamada de novo a cada troca.
function montarMensagem(produto, esgotado) {
  if (esgotado) {
    return `Olá! Vi a camisa "${produto.nome}" mas ela já esgotou. Vocês fazem uma pintura parecida sob encomenda?`;
  }
  const tamanho = tamanhoSelecionado();
  const cor = corSelecionada();
  const detalhes = [tamanho ? `tamanho ${tamanho}` : null, cor ? `cor ${cor}` : null].filter(Boolean).join(", ");
  return `Olá! Tenho interesse na camisa "${produto.nome}"${detalhes ? ` (${detalhes})` : ""}, ${formatarPreco(produto.preco)}. Ainda está disponível?`;
}

function atualizarLinkWhatsApp(produto) {
  const linkWhats = document.getElementById("link-whatsapp");
  if (!linkWhats) return;
  const { esgotado } = situacaoEstoque(produto);
  linkWhats.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(montarMensagem(produto, esgotado))}`;
}

// Uma tabelinha de características — usada duas vezes (principais / de
// venda) dentro de montarCaracteristicas().
function tabelaDeSpecs(linhas) {
  return `
    <table class="tabela-specs">
      <tbody>
        ${linhas.map(([rotulo, valor]) => `<tr><td>${rotulo}</td><td>${valor}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

// Duas colunas de características, no molde de ficha técnica de
// marketplace. "Cor" e "Modelo" vêm dos dados reais de cada peça; o resto
// (gênero, tecido, manga, gola, caimento...) é o padrão do corte do
// ateliê, definido uma vez em CONFIG.pecaPadrao — ajuste lá se o corte
// real for diferente.
function montarCaracteristicas(produto) {
  const padrao = CONFIG.pecaPadrao;
  const cor = `<span class="chip-cor" style="background:${produto.corTecido}"></span>${nomeDaCor(produto.corTecido)} / <span class="chip-cor" style="background:${produto.corTinta}"></span>${nomeDaCor(produto.corTinta)}`;

  const principais = [
    ["Marca", "Corarte"],
    ["Modelo", `Camisa pintada à mão — ${produto.nome}`],
    ["Gênero", padrao.genero],
    ["Idade", padrao.idade],
    ["Tipo de peça", "Camisa"],
    ["Cor", cor],
  ];

  const deVenda = [
    ["Formato de venda", "Unidade"],
    ["É esportiva", "Não"],
    ["Usos recomendados", padrao.usosRecomendados],
    ["Tipo de tecido", padrao.tipoDeTecido],
    ["Composição", padrao.composicao],
    ["Tipo de manga", padrao.tipoDeManga],
    ["Tipo de gola", padrao.tipoDeGola],
    ["Forma de caimento", padrao.caimento],
    ["Material principal", padrao.tipoDeTecido],
  ];

  return `
    <div class="specs-colunas">
      <div class="specs-coluna">
        <h4 class="specs-coluna__titulo">Características principais</h4>
        ${tabelaDeSpecs(principais)}
      </div>
      <div class="specs-coluna">
        <h4 class="specs-coluna__titulo">Características de venda</h4>
        ${tabelaDeSpecs(deVenda)}
      </div>
    </div>
  `;
}

function montarConteudo(produto) {
  const categoria = CATEGORIAS.find((c) => c.id === produto.categoria);
  const { esgotado, unica } = situacaoEstoque(produto);
  const desconto = temDesconto(produto);
  const temCores = Array.isArray(produto.cores) && produto.cores.length > 0;

  const textoEstoque = esgotado
    ? "Essa arte já foi toda vendida — mas dá pra combinar algo parecido."
    : unica
    ? "Só existe uma camisa com essa pintura."
    : `Restam ${produto.estoque} camisas com essa pintura.`;

  document.getElementById("produto-conteudo").innerHTML = `
    <section class="produto${esgotado ? " produto--esgotado" : ""}">
      ${montarGaleria(produto)}

      <div class="produto__miolo">
        <p class="produto__categoria">${categoria ? categoria.nome : ""}</p>
        <h1 class="produto__nome">${produto.nome}</h1>

        <div class="produto__precos">
          ${
            desconto
              ? `<span class="produto__preco-original">${formatarPreco(produto.precoOriginal)}</span><span class="produto__desconto">-${percentualDesconto(produto)}%</span>`
              : ""
          }
          <p class="produto__preco">${formatarPreco(produto.preco)}</p>
        </div>

        <details class="cartao-pagamento">
          <summary>Em até 3x de ${formatarPreco(produto.preco / 3)} sem juros — <span class="cartao-pagamento__link">ver formas de pagamento</span></summary>
          <div class="cartao-pagamento__opcoes">
            <ul>
              <li>Pix</li>
              <li>Cartão de crédito ou débito</li>
              <li>Dinheiro</li>
            </ul>
            <p>Combinado direto com o ateliê ao fechar a encomenda pelo WhatsApp — o site não processa pagamento.</p>
          </div>
        </details>

        <p class="produto__descricao">${produto.descricao}</p>

        ${
          temCores
            ? `
        <div class="produto__cores">
          <span class="produto__rotulo">Cor do tecido e da tinta</span>
          <div class="produto__lista-cores" id="seletor-cores">
            ${produto.cores
              .map(
                (c, i) => `
              <button type="button" class="cor-opcao${i === 0 ? " cor-opcao--selecionada" : ""}" style="background:${c.corTecido}" data-nome="${c.nome}" data-cor-tecido="${c.corTecido}" data-cor-tinta="${c.corTinta}" title="${c.nome}" aria-label="Cor ${c.nome}">
                <span style="background:${c.corTinta}"></span>
              </button>
            `
              )
              .join("")}
          </div>
        </div>
        `
            : ""
        }

        <div class="produto__tamanhos">
          <span class="produto__rotulo">Tamanho</span>
          <div class="produto__lista-tamanhos" id="seletor-tamanhos">
            ${produto.tamanhos
              .map((t, i) => `<button type="button" class="tamanho ${i === 0 ? "tamanho--selecionada" : ""}" data-tamanho="${t}">${t}</button>`)
              .join("")}
          </div>
        </div>

        <div class="produto__specs">
          <span class="produto__rotulo">O que você precisa saber</span>
          <ul class="produto__lista-specs">
            <li>Técnica: pintura à mão, peça por peça</li>
            <li>Categoria: ${categoria ? categoria.nome : ""}</li>
            <li>Tamanhos desta arte: ${produto.tamanhos.join(", ")}</li>
            <li>${esgotado ? "Tiragem: esgotada" : unica ? "Tiragem: peça única" : `Tiragem: ${produto.estoque} peças restantes`}</li>
          </ul>
        </div>
      </div>

      <div class="produto__lateral">
        <p class="produto__estoque">${textoEstoque}</p>
        <div class="produto__acoes">
          ${
            esgotado
              ? `<a class="botao botao--whatsapp" id="link-whatsapp" href="#" target="_blank" rel="noopener">Perguntar sobre uma peça parecida</a>`
              : `
                <button type="button" class="botao botao--fantasma" id="botao-lista">Adicionar à sacola</button>
                <a class="botao botao--whatsapp" id="link-whatsapp" href="#" target="_blank" rel="noopener">Encomendar pelo WhatsApp</a>
              `
          }
        </div>
        <p class="produto__aviso-lista" id="aviso-lista" role="status" aria-live="polite" hidden></p>

        <div class="abas">
          <div class="abas__botoes" role="tablist">
            <button type="button" class="abas__botao abas__botao--ativa" data-aba="sobre" role="tab" aria-selected="true">Sobre a peça</button>
            <button type="button" class="abas__botao" data-aba="cuidados" role="tab" aria-selected="false">Cuidados</button>
            <button type="button" class="abas__botao" data-aba="perguntas" role="tab" aria-selected="false">Perguntas frequentes</button>
          </div>
          <div class="abas__painel" data-painel="sobre">
            <p>${produto.descricao}</p>
            <p>Peça pintada à mão, tecido na cor combinada com a tinta ${produto.corTinta.toLowerCase()} — pequenas variações de traço fazem parte do processo manual.</p>
          </div>
          <div class="abas__painel" data-painel="cuidados" hidden>${CUIDADOS_EXEMPLO}</div>
          <div class="abas__painel" data-painel="perguntas" hidden>${PERGUNTAS_EXEMPLO}</div>
        </div>

        <div class="cartao-metodos">
          <h3 class="cartao-metodos__titulo">Meios de pagamento</h3>
          <ul class="cartao-metodos__lista">
            <li>${ICONE_CARTAO} Cartão de crédito ou débito</li>
            <li>${ICONE_PIX} Pix</li>
            <li>${ICONE_DINHEIRO} Dinheiro</li>
          </ul>
          <p class="cartao-metodos__nota">Combinado direto no WhatsApp ao fechar a encomenda — o site não processa pagamento.</p>
        </div>
      </div>

      <div class="abas produto__specs-abas">
        <div class="abas__botoes" role="tablist">
          <button type="button" class="abas__botao abas__botao--ativa" data-aba="caracteristicas" role="tab" aria-selected="true">Características</button>
          <button type="button" class="abas__botao" data-aba="avaliacoes" role="tab" aria-selected="false">Avaliações</button>
          <button type="button" class="abas__botao" data-aba="descricao" role="tab" aria-selected="false">Descrição</button>
        </div>
        <div class="abas__painel abas__painel--largo" data-painel="caracteristicas">
          ${montarCaracteristicas(produto)}
        </div>
        <div class="abas__painel" data-painel="avaliacoes" hidden>
          <div class="avaliacoes-vazias">
            <p>Essa peça ainda não tem avaliações.</p>
            <p>Se você já encomendou, manda um recado pelo WhatsApp contando como foi — com sua autorização, a gente publica aqui.</p>
          </div>
        </div>
        <div class="abas__painel" data-painel="descricao" hidden>
          <p>${produto.descricaoCompleta || produto.descricao}</p>
        </div>
      </div>
    </section>
  `;

  atualizarLinkWhatsApp(produto);
}

function ligarSeletorDeTamanho(produto) {
  const seletor = document.getElementById("seletor-tamanhos");
  if (!seletor) return;

  seletor.querySelectorAll(".tamanho").forEach((btn) => {
    btn.addEventListener("click", () => {
      seletor.querySelectorAll(".tamanho").forEach((b) => b.classList.remove("tamanho--selecionada"));
      btn.classList.add("tamanho--selecionada");
      atualizarLinkWhatsApp(produto);
    });
  });
}

// Escolher uma cor muda a mensagem do WhatsApp e, quando a peça ainda não
// tem foto real (é ilustrada em SVG), atualiza a prévia na hora. Numa
// peça com foto de verdade a cor NÃO troca a foto mostrada — trocar a cor
// ali só combina o tom pra uma pintura nova, não muda a foto existente.
function ligarSeletorDeCor(produto) {
  const seletor = document.getElementById("seletor-cores");
  if (!seletor) return;

  seletor.querySelectorAll(".cor-opcao").forEach((btn) => {
    btn.addEventListener("click", () => {
      seletor.querySelectorAll(".cor-opcao").forEach((b) => b.classList.remove("cor-opcao--selecionada"));
      btn.classList.add("cor-opcao--selecionada");
      atualizarLinkWhatsApp(produto);

      if (!temFoto(produto)) {
        const tecido = document.querySelector(".produto__tecido");
        const motivo = document.querySelector(".produto__motivo");
        if (tecido) tecido.style.background = btn.dataset.corTecido;
        if (motivo) motivo.innerHTML = motivoSVG(produto.motivo, btn.dataset.corTinta);
      }
    });
  });
}

function tamanhoSelecionado() {
  const ativo = document.querySelector("#seletor-tamanhos .tamanho--selecionada");
  return ativo ? ativo.dataset.tamanho : null;
}

function corSelecionada() {
  const ativo = document.querySelector(".cor-opcao--selecionada");
  return ativo ? ativo.dataset.nome : null;
}

function ligarBotaoLista(produto) {
  const botao = document.getElementById("botao-lista");
  const aviso = document.getElementById("aviso-lista");
  if (!botao) return;

  // Já tem todas as unidades da peça na sacola? Então não deixa somar mais.
  const atualizarEstado = () => {
    const naSacola = quantidadeDoProduto(produto.id);
    const cheio = naSacola >= produto.estoque;
    botao.disabled = cheio;
    botao.textContent = cheio ? "Todas as peças já estão na sacola" : "Adicionar à sacola";
    if (naSacola > 0) {
      aviso.hidden = false;
      aviso.innerHTML = `${naSacola} de ${produto.estoque} na sua sacola · <a href="carrinho.html">ver sacola</a>`;
    }
  };

  botao.addEventListener("click", () => {
    const r = adicionarNaSacola(produto.id, tamanhoSelecionado(), corSelecionada());
    if (!r.ok) {
      aviso.hidden = false;
      aviso.textContent = "Você já tem todas as unidades disponíveis dessa peça na sacola.";
    }
    atualizarEstado();
  });
  atualizarEstado();
}

// A página tem dois grupos de abas (Sobre/Cuidados/Perguntas na lateral e
// Características/Avaliações/Descrição embaixo) — por isso cada grupo
// precisa ligar seus próprios botões e painéis, sem afetar o outro grupo.
function ligarAbas() {
  document.querySelectorAll(".abas").forEach((grupo) => {
    const botoes = grupo.querySelectorAll(".abas__botao");
    botoes.forEach((btn) => {
      btn.addEventListener("click", () => {
        botoes.forEach((b) => {
          b.classList.remove("abas__botao--ativa");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("abas__botao--ativa");
        btn.setAttribute("aria-selected", "true");
        grupo.querySelectorAll(".abas__painel").forEach((painel) => {
          painel.hidden = painel.dataset.painel !== btn.dataset.aba;
        });
      });
    });
  });
}

function ligarGaleria(produto) {
  const tecido = document.querySelector(".produto__tecido");
  const imgPrincipal = tecido ? tecido.querySelector("img") : null;

  document.querySelectorAll(".miniatura").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (imgPrincipal) {
        imgPrincipal.src = btn.dataset.src;
        imgPrincipal.alt = btn.dataset.alt;
      }
      document.querySelectorAll(".miniatura").forEach((b) => b.classList.remove("miniatura--ativa"));
      btn.classList.add("miniatura--ativa");
    });
  });

  const botaoExpandir = document.querySelector(".produto__expandir");
  if (botaoExpandir) {
    botaoExpandir.addEventListener("click", () => {
      if (imgPrincipal) {
        abrirLightbox({ tipo: "foto", src: imgPrincipal.src, alt: imgPrincipal.alt });
      } else {
        abrirLightbox({ tipo: "motivo", motivo: produto.motivo, corTinta: produto.corTinta, corTecido: produto.corTecido, alt: produto.nome });
      }
    });
  }

  if (imgPrincipal && tecido) {
    const lente = document.querySelector(".produto__lente");
    const painel = document.querySelector(".produto__zoom-painel");
    ativarZoomLateral(tecido, imgPrincipal, lente, painel);
  }
}

function renderRelacionados(produto) {
  const relacionados = PRODUTOS.filter((p) => p.categoria === produto.categoria && p.id !== produto.id).slice(0, 4);
  if (relacionados.length === 0) return;
  document.getElementById("relacionados-secao").hidden = false;
  renderGrade(relacionados, "grade-relacionados");
}

function renderNaoEncontrado() {
  document.getElementById("trilha").innerHTML = `<a href="index.html">Início</a> <span aria-hidden="true">/</span> <span>Peça não encontrada</span>`;
  document.getElementById("produto-conteudo").innerHTML = `
    <section class="produto-ausente">
      <h1>Essa peça não existe (mais)</h1>
      <p>Talvez a arte já tenha saído do catálogo. Que tal ver o que está pintado agora?</p>
      <a class="botao" href="colecao.html">Ver a coleção</a>
    </section>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderCabecalho("colecao");
  renderRodape();
  configurarLightbox();

  const id = new URLSearchParams(location.search).get("id");
  const produto = PRODUTOS.find((p) => p.id === id);

  if (!produto) {
    renderNaoEncontrado();
    return;
  }

  document.getElementById("titulo-pagina").textContent = `${produto.nome} — Corarte`;
  document.getElementById("descricao-pagina").setAttribute("content", produto.descricao);

  montarTrilha(produto);
  montarConteudo(produto);
  ligarSeletorDeTamanho(produto);
  ligarSeletorDeCor(produto);
  ligarBotaoLista(produto);
  ligarAbas();
  ligarGaleria(produto);
  renderRelacionados(produto);
});
