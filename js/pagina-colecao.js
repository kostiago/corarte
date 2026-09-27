// Página da coleção completa: filtros (categoria, faixa de preço, cor e
// tamanho), busca (vinda da barra do cabeçalho) e ordenação — tudo em
// memória, sem precisar de servidor.

// Limites da faixa de preço, tirados do próprio catálogo.
const LIMITE_PRECO = {
  min: Math.floor(Math.min(...PRODUTOS.map((p) => p.preco))),
  max: Math.ceil(Math.max(...PRODUTOS.map((p) => p.preco))),
};

const estado = {
  categoria: "todos",
  tamanhos: new Set(),
  cores: new Set(), // hex (maiúsculo) do tecido
  precoMin: LIMITE_PRECO.min,
  precoMax: LIMITE_PRECO.max,
  busca: "",
  ordenar: "novidades",
};

const ICONE_CHEVRON_DIREITA =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONE_CHECK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// Cores de tecido em que a peça pode ser encomendada: a dela mais as
// alternativas de "cores", se houver.
function coresDoProduto(p) {
  return [p.corTecido, ...(p.cores || []).map((c) => c.corTecido)].map((h) => h.toUpperCase());
}

function todosOsTamanhos() {
  const conjunto = new Set();
  PRODUTOS.forEach((p) => p.tamanhos.forEach((t) => conjunto.add(t)));
  // Ordem "de vestir": P, M, G, GG antes de qualquer tamanho fora do padrão.
  const ordem = ["P", "M", "G", "GG"];
  return [...conjunto].sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
}

function todasAsCores() {
  const conjunto = new Set();
  PRODUTOS.forEach((p) => coresDoProduto(p).forEach((h) => conjunto.add(h)));
  return [...conjunto];
}

function produtosFiltrados() {
  const busca = estado.busca.trim().toLowerCase();
  let lista = PRODUTOS.filter((p) => {
    const passaCategoria = estado.categoria === "todos" || p.categoria === estado.categoria;
    const passaTamanho = estado.tamanhos.size === 0 || p.tamanhos.some((t) => estado.tamanhos.has(t));
    const passaCor = estado.cores.size === 0 || coresDoProduto(p).some((h) => estado.cores.has(h));
    const passaPreco = p.preco >= estado.precoMin && p.preco <= estado.precoMax;
    const passaBusca =
      !busca || p.nome.toLowerCase().includes(busca) || p.descricao.toLowerCase().includes(busca);
    return passaCategoria && passaTamanho && passaCor && passaPreco && passaBusca;
  });

  if (estado.ordenar === "menor-preco") {
    lista = lista.slice().sort((a, b) => a.preco - b.preco);
  } else if (estado.ordenar === "maior-preco") {
    lista = lista.slice().sort((a, b) => b.preco - a.preco);
  } else {
    lista = lista.slice().reverse(); // "novidades": mais recentes primeiro
  }

  return lista;
}

function renderCabecalhoDaLista() {
  const categoriaObj = CATEGORIAS.find((c) => c.id === estado.categoria);
  const titulo = document.getElementById("titulo-colecao");
  const trilha = document.getElementById("trilha-atual");
  titulo.textContent = estado.categoria === "todos" ? "A coleção" : categoriaObj ? categoriaObj.nome : "A coleção";
  trilha.textContent = estado.categoria === "todos" ? "Coleção" : categoriaObj?.nome || "Coleção";
}

function renderContagem(quantidade) {
  const contagem = document.getElementById("contagem-produtos");
  const trechoBusca = estado.busca ? ` para "${escaparHTML(estado.busca)}"` : "";
  contagem.innerHTML = `Mostrando ${quantidade} de ${PRODUTOS.length} ${PRODUTOS.length === 1 ? "peça" : "peças"}${trechoBusca}`;
}

function renderTudo() {
  renderCabecalhoDaLista();
  const lista = produtosFiltrados();
  renderContagem(lista.length);
  renderGrade(lista, "grade-produtos");
}

// ---------- filtros ----------

function renderFiltrosCategoria() {
  const alvo = document.getElementById("filtros-categoria");
  alvo.innerHTML = CATEGORIAS.map(
    (c) =>
      `<button type="button" class="filtro-linha" data-categoria="${c.id}" aria-pressed="${c.id === estado.categoria}"><span>${c.nome}</span>${ICONE_CHEVRON_DIREITA}</button>`
  ).join("");
  alvo.querySelectorAll(".filtro-linha").forEach((btn) => {
    btn.addEventListener("click", () => {
      estado.categoria = btn.dataset.categoria;
      alvo.querySelectorAll(".filtro-linha").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      renderTudo();
    });
  });
}

function renderFiltrosCor() {
  const alvo = document.getElementById("filtros-cor");
  alvo.innerHTML = todasAsCores()
    .map((hex) => {
      const nome = nomeDaCor(hex);
      const claro = luminancia(hex) > 0.6;
      return `<button type="button" class="cor-filtro${claro ? " cor-filtro--clara" : ""}" style="background:${hex}" data-hex="${hex}" title="${nome}" aria-label="Cor ${nome}" aria-pressed="${estado.cores.has(hex)}">${ICONE_CHECK}</button>`;
    })
    .join("");
  alvo.querySelectorAll(".cor-filtro").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hex = btn.dataset.hex;
      if (estado.cores.has(hex)) estado.cores.delete(hex);
      else estado.cores.add(hex);
      btn.setAttribute("aria-pressed", String(estado.cores.has(hex)));
      renderTudo();
    });
  });
}

function renderFiltrosTamanho() {
  const alvo = document.getElementById("filtros-tamanho");
  alvo.innerHTML = todosOsTamanhos()
    .map((t) => `<button type="button" class="tamanho tamanho--filtro" data-tamanho="${t}" aria-pressed="${estado.tamanhos.has(t)}">${t}</button>`)
    .join("");
  alvo.querySelectorAll(".tamanho--filtro").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tamanho = btn.dataset.tamanho;
      if (estado.tamanhos.has(tamanho)) estado.tamanhos.delete(tamanho);
      else estado.tamanhos.add(tamanho);
      btn.setAttribute("aria-pressed", String(estado.tamanhos.has(tamanho)));
      renderTudo();
    });
  });
}

// Faixa de preço com dois "puxadores" (dois <input type=range> sobrepostos).
function atualizarFaixa() {
  const { min, max } = LIMITE_PRECO;
  const total = max - min || 1;
  const preench = document.getElementById("faixa-preenchimento");
  preench.style.left = `${((estado.precoMin - min) / total) * 100}%`;
  preench.style.width = `${((estado.precoMax - estado.precoMin) / total) * 100}%`;
  document.getElementById("preco-min-txt").textContent = formatarPreco(estado.precoMin);
  document.getElementById("preco-max-txt").textContent = formatarPreco(estado.precoMax);
  document.getElementById("preco-min").value = estado.precoMin;
  document.getElementById("preco-max").value = estado.precoMax;
}

function ligarFaixaDePreco() {
  const grupo = document.getElementById("grupo-preco");
  if (LIMITE_PRECO.min === LIMITE_PRECO.max) {
    grupo.hidden = true; // todas as peças custam o mesmo: filtro sem sentido
    return;
  }
  const inMin = document.getElementById("preco-min");
  const inMax = document.getElementById("preco-max");
  [inMin, inMax].forEach((el) => {
    el.min = LIMITE_PRECO.min;
    el.max = LIMITE_PRECO.max;
    el.step = 1;
  });
  inMin.addEventListener("input", () => {
    estado.precoMin = Math.min(Number(inMin.value), estado.precoMax);
    atualizarFaixa();
    renderTudo();
  });
  inMax.addEventListener("input", () => {
    estado.precoMax = Math.max(Number(inMax.value), estado.precoMin);
    atualizarFaixa();
    renderTudo();
  });
  atualizarFaixa();
}

function limparFiltros() {
  estado.categoria = "todos";
  estado.tamanhos.clear();
  estado.cores.clear();
  estado.precoMin = LIMITE_PRECO.min;
  estado.precoMax = LIMITE_PRECO.max;
  estado.busca = "";
  estado.ordenar = "novidades";
  document.getElementById("ordenar").value = "novidades";
  renderFiltrosCategoria();
  renderFiltrosCor();
  renderFiltrosTamanho();
  atualizarFaixa();
  renderTudo();
}

document.addEventListener("DOMContentLoaded", () => {
  renderCabecalho("colecao");
  renderRodape();

  const params = new URLSearchParams(location.search);
  const categoriaUrl = params.get("categoria");
  const buscaUrl = params.get("busca");
  if (categoriaUrl && CATEGORIAS.some((c) => c.id === categoriaUrl)) {
    estado.categoria = categoriaUrl;
  }
  if (buscaUrl) {
    estado.busca = buscaUrl;
  }

  renderFiltrosCategoria();
  renderFiltrosCor();
  renderFiltrosTamanho();
  ligarFaixaDePreco();
  renderTudo();

  document.getElementById("ordenar").addEventListener("change", (e) => {
    estado.ordenar = e.target.value;
    renderTudo();
  });
  document.getElementById("limpar-filtros").addEventListener("click", limparFiltros);
});
