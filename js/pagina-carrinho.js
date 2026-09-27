// Página da sacola (carrinho.html): itens guardados no localStorage (ver
// layout.js), resumo de valores e fechamento do pedido pelo WhatsApp.
// Não há pagamento no site — o total aqui é uma estimativa; frete e valor
// final são confirmados na conversa.

const CHAVE_CUPOM = "corarte.cupom";

const ICONE_LIXEIRA =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONE_ETIQUETA =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="8.5" r="1.3" fill="currentColor"/></svg>';
const ICONE_SETA =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let mensagemCupom = { texto: "", erro: false };
let focoDepois = null;

const arredondar = (v) => Math.round(v * 100) / 100;

// ---------- cupom (opcional) ----------

function cuponsHabilitados() {
  const c = CONFIG.carrinho.cupons;
  return Boolean(c && c.ativo && c.codigos && Object.keys(c.codigos).length > 0);
}

function obterCupomAplicado() {
  if (!cuponsHabilitados()) return null;
  try {
    const codigo = localStorage.getItem(CHAVE_CUPOM);
    return codigo && CONFIG.carrinho.cupons.codigos[codigo] ? codigo : null;
  } catch {
    return null;
  }
}

function salvarCupom(codigo) {
  try {
    if (codigo) localStorage.setItem(CHAVE_CUPOM, codigo);
    else localStorage.removeItem(CHAVE_CUPOM);
  } catch {
    // sem localStorage: o cupom vale só até recarregar a página
  }
}

function descricaoDoCupom(codigo) {
  const c = CONFIG.carrinho.cupons.codigos[codigo];
  if (c.descricao) return c.descricao;
  return c.tipo === "percentual" ? `${c.valor}% de desconto` : `${formatarPreco(c.valor)} de desconto`;
}

// ---------- cálculo ----------

// Junta cada item salvo com os dados atuais do catálogo. O estoque vale pra
// peça inteira: se a soma das linhas passa do estoque (ex.: ele diminuiu no
// data.js depois que a pessoa adicionou), as últimas linhas perdem unidades.
function montarLinhas(itens) {
  const restante = {};
  return itens
    .map((item, indice) => {
      const produto = PRODUTOS.find((p) => p.id === item.produtoId);
      if (!produto) return null;
      if (restante[produto.id] === undefined) restante[produto.id] = produto.estoque;
      const efetiva = Math.min(item.quantidade, restante[produto.id]);
      restante[produto.id] -= efetiva;
      return { indice, item, produto, efetiva, disponivel: efetiva > 0, reduzida: efetiva < item.quantidade };
    })
    .filter(Boolean);
}

function calcularResumo(linhas, cupom) {
  const validas = linhas.filter((l) => l.disponivel);
  const precoCheio = (p) => (temDesconto(p) ? p.precoOriginal : p.preco);
  const subtotal = arredondar(validas.reduce((s, l) => s + l.efetiva * precoCheio(l.produto), 0));
  const descontoPecas = arredondar(validas.reduce((s, l) => s + l.efetiva * (precoCheio(l.produto) - l.produto.preco), 0));
  const base = arredondar(subtotal - descontoPecas);

  let descontoCupom = 0;
  if (cupom) {
    const c = CONFIG.carrinho.cupons.codigos[cupom];
    descontoCupom = c.tipo === "percentual" ? arredondar((base * c.valor) / 100) : Math.min(c.valor, base);
  }

  const frete = validas.length ? CONFIG.carrinho.frete : 0;
  const total = arredondar(base - descontoCupom + frete);
  return { validas, subtotal, descontoPecas, descontoCupom, frete, total };
}

// ---------- mensagem do pedido ----------

function mensagemPedido(linhas, resumo, cupom) {
  const itens = resumo.validas.map((l) => {
    const detalhes = [l.item.tamanho ? `tamanho ${l.item.tamanho}` : null, `cor ${rotuloDaCor(l)}`].filter(Boolean).join(", ");
    return `• ${l.produto.nome} (${detalhes}) — ${l.efetiva}x ${formatarPreco(l.produto.preco)} = ${formatarPreco(l.efetiva * l.produto.preco)}`;
  });
  const valores = [`Subtotal: ${formatarPreco(resumo.subtotal)}`];
  if (resumo.descontoPecas > 0) valores.push(`Desconto das peças: -${formatarPreco(resumo.descontoPecas)}`);
  if (resumo.descontoCupom > 0) valores.push(`Cupom ${cupom}: -${formatarPreco(resumo.descontoCupom)}`);
  valores.push(`Frete (estimado): ${resumo.frete === 0 ? "grátis" : formatarPreco(resumo.frete)}`);
  valores.push(`Total estimado: ${formatarPreco(resumo.total)}`);
  return encodeURIComponent(
    ["Olá! Quero fechar este pedido:", "", ...itens, "", ...valores, "", "Pode confirmar disponibilidade, prazo e frete?"].join("\n")
  );
}

// ---------- desenho ----------

function rotuloDaCor(linha) {
  return linha.item.cor || nomeDaCor(linha.produto.corTecido);
}

function miniaturaDaLinha(linha) {
  const { produto, item } = linha;
  const variante = produto.cores && produto.cores.find((c) => c.nome === item.cor);
  const visual = variante ? { ...produto, corTecido: variante.corTecido, corTinta: variante.corTinta } : produto;
  return `<div class="sacola-item__foto" style="background:${visual.corTecido}">${conteudoVisual(visual, "sacola-item__motivo")}</div>`;
}

function htmlItem(linha, itensTotais) {
  const { produto, item, indice, efetiva, disponivel, reduzida } = linha;
  const noEstoque = quantidadeDoProduto(produto.id, itensTotais);
  const podeMais = disponivel && noEstoque < produto.estoque;
  const podeMenos = item.quantidade > 1;
  const cheio = temDesconto(produto) ? produto.precoOriginal : produto.preco;

  const aviso = !disponivel
    ? "Peça esgotada — não entra no total."
    : reduzida
    ? `Só há ${efetiva} disponível(is) — o total considera ${efetiva}.`
    : "";

  return `
    <li class="sacola-item${disponivel ? "" : " sacola-item--indisponivel"}">
      ${miniaturaDaLinha(linha)}
      <div class="sacola-item__info">
        <a class="sacola-item__nome" href="produto.html?id=${produto.id}">${produto.nome}</a>
        <p class="sacola-item__meta">Tamanho: <span>${item.tamanho || "—"}</span></p>
        <p class="sacola-item__meta">Cor: <span>${rotuloDaCor(linha)}</span></p>
        ${aviso ? `<p class="sacola-item__aviso">${aviso}</p>` : ""}
        <p class="sacola-item__preco">
          <strong>${formatarPreco(efetiva * produto.preco)}</strong>
          ${
            temDesconto(produto) && disponivel
              ? `<span class="cartao__preco-original">${formatarPreco(efetiva * cheio)}</span><span class="cartao__desconto">-${percentualDesconto(produto)}%</span>`
              : ""
          }
        </p>
      </div>
      <button type="button" class="sacola-item__remover" data-indice="${indice}" data-acao="remover" aria-label="Remover ${produto.nome} da sacola">${ICONE_LIXEIRA}</button>
      <div class="sacola-quantidade" role="group" aria-label="Quantidade de ${produto.nome}">
        <button type="button" data-indice="${indice}" data-acao="menos" aria-label="Diminuir quantidade" ${podeMenos ? "" : "disabled"}>−</button>
        <output aria-live="polite">${item.quantidade}</output>
        <button type="button" data-indice="${indice}" data-acao="mais" aria-label="Aumentar quantidade" ${podeMais ? "" : "disabled"}>+</button>
      </div>
    </li>`;
}

function htmlCupom(cupom) {
  if (!cuponsHabilitados()) return "";
  if (cupom) {
    return `
      <div class="cupom-aplicado">
        ${ICONE_ETIQUETA}
        <span><strong>${cupom}</strong> · ${descricaoDoCupom(cupom)}</span>
        <button type="button" id="cupom-remover">Remover</button>
      </div>`;
  }
  return `
    <form class="cupom" id="cupom-form" autocomplete="off">
      <label class="cupom__campo">
        ${ICONE_ETIQUETA}
        <input type="text" id="cupom-codigo" placeholder="Código de cupom" aria-label="Código de cupom" />
      </label>
      <button type="submit" class="cupom__aplicar">Aplicar</button>
    </form>
    <p class="cupom__status${mensagemCupom.erro ? " cupom__status--erro" : ""}" role="status">${mensagemCupom.texto}</p>`;
}

function linhaValor(rotulo, valor, classe = "") {
  return `<div class="resumo-linha ${classe}"><dt>${rotulo}</dt><dd>${valor}</dd></div>`;
}

function render() {
  const alvo = document.getElementById("sacola-conteudo");
  const itens = obterSacola();
  const linhas = montarLinhas(itens);

  if (linhas.length === 0) {
    alvo.innerHTML = `
      <div class="sacola-vazia">
        <p>Sua sacola está vazia por enquanto.</p>
        <a class="botao" href="colecao.html">Ver a coleção</a>
      </div>`;
    return;
  }

  const cupom = obterCupomAplicado();
  const r = calcularResumo(linhas, cupom);
  const pctPecas = r.subtotal > 0 ? Math.round((r.descontoPecas / r.subtotal) * 100) : 0;

  const valores = [
    linhaValor("Subtotal", formatarPreco(r.subtotal)),
    r.descontoPecas > 0 ? linhaValor(`Desconto (-${pctPecas}%)`, `-${formatarPreco(r.descontoPecas)}`, "resumo-linha--desconto") : "",
    r.descontoCupom > 0 ? linhaValor(`Cupom (${cupom})`, `-${formatarPreco(r.descontoCupom)}`, "resumo-linha--desconto") : "",
    linhaValor("Frete (padrão)", r.frete === 0 ? "Grátis" : formatarPreco(r.frete)),
  ].join("");

  alvo.innerHTML = `
    <div class="sacola__corpo">
      <div class="sacola-card sacola__itens">
        <ul class="sacola-lista">${linhas.map((l) => htmlItem(l, itens)).join("")}</ul>
      </div>

      <aside class="sacola-card sacola__resumo" aria-label="Resumo do pedido">
        <h2 class="sacola__resumo-titulo">Resumo do pedido</h2>
        <dl class="resumo-valores">${valores}</dl>
        <dl class="resumo-valores resumo-valores--total">${linhaValor("Total", formatarPreco(r.total), "resumo-linha--total")}</dl>
        ${htmlCupom(cupom)}
        ${
          r.validas.length
            ? `<a class="sacola__finalizar" href="https://wa.me/${CONFIG.whatsapp}?text=${mensagemPedido(linhas, r, cupom)}" target="_blank" rel="noopener">Finalizar pelo WhatsApp ${ICONE_SETA}</a>`
            : `<p class="sacola__aviso">Nenhuma peça disponível para fechar o pedido.</p>`
        }
        <p class="sacola__aviso">Valores estimados. O pagamento e o frete final são combinados direto na conversa.</p>
      </aside>
    </div>`;

  ligarEventos();

  if (focoDepois) {
    const { indice, acao } = focoDepois;
    const alvoFoco =
      alvo.querySelector(`[data-indice="${indice}"][data-acao="${acao}"]:not([disabled])`) ||
      alvo.querySelector(`[data-indice="${indice}"][data-acao="mais"]:not([disabled]), [data-indice="${indice}"][data-acao="menos"]:not([disabled])`);
    if (alvoFoco) alvoFoco.focus();
    focoDepois = null;
  }
}

function ligarEventos() {
  document.querySelectorAll("[data-acao]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const indice = Number(btn.dataset.indice);
      const acao = btn.dataset.acao;
      if (acao === "remover") removerDaSacola(indice);
      else {
        focoDepois = { indice, acao };
        alterarQuantidade(indice, acao === "mais" ? 1 : -1);
      }
      render();
    });
  });

  const form = document.getElementById("cupom-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const digitado = document.getElementById("cupom-codigo").value.trim().toUpperCase();
      const codigos = CONFIG.carrinho.cupons.codigos;
      const achado = Object.keys(codigos).find((c) => c.toUpperCase() === digitado);
      if (achado) {
        salvarCupom(achado);
        mensagemCupom = { texto: "", erro: false };
      } else {
        mensagemCupom = { texto: digitado ? "Cupom inválido ou expirado." : "Digite o código do cupom.", erro: true };
      }
      render();
    });
  }

  const remover = document.getElementById("cupom-remover");
  if (remover) {
    remover.addEventListener("click", () => {
      salvarCupom(null);
      mensagemCupom = { texto: "", erro: false };
      render();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderCabecalho("carrinho");
  renderRodape();
  render();
});
