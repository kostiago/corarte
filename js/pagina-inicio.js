// Lógica específica da página inicial: cabeçalho/rodapé, tarja de
// categorias, duas vitrines de produtos e os blocos "explore por motivo".

function renderTarjaCategorias() {
  const nav = document.getElementById("tarja-categorias");
  if (!nav) return;
  nav.innerHTML = CATEGORIAS.filter((c) => c.id !== "todos")
    .map((c) => `<a href="colecao.html?categoria=${c.id}">${c.nome}</a>`)
    .join("");
}

// Um "azulejo" por categoria — clicar leva direto pra coleção já filtrada.
// A arte do azulejo é a foto de uma peça daquela categoria (dá preferência a
// quem já tem foto) ou, se nenhuma tiver, o motivo desenhado em traço.
function renderMotivos() {
  const grade = document.getElementById("motivos-grade");
  if (!grade) return;
  grade.innerHTML = CATEGORIAS.filter((c) => c.id !== "todos")
    .map((categoria) => {
      const pecas = PRODUTOS.filter((p) => p.categoria === categoria.id);
      const representante = pecas.find(temFoto) || pecas[0] || PRODUTOS[0];
      const arte = temFoto(representante)
        ? `<img class="motivo-tile__foto" src="${representante.imagens[0].src}" alt="" loading="lazy" />`
        : `<span class="motivo-tile__foto motivo-tile__foto--motivo" style="background:${representante.corTecido}"><svg viewBox="0 0 200 200" aria-hidden="true">${motivoSVG(representante.motivo, representante.corTinta)}</svg></span>`;
      return `
        <a class="motivo-tile" href="colecao.html?categoria=${categoria.id}">
          <span class="motivo-tile__nome">${categoria.nome}</span>
          <span class="motivo-tile__qtd">${pecas.length} ${pecas.length === 1 ? "peça" : "peças"}</span>
          ${arte}
        </a>
      `;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderCabecalho("inicio");
  renderRodape();
  renderTarjaCategorias();
  renderMotivos();

  // Cada vitrine mostra no máximo VITRINE_QTD cards. A ordem do array
  // PRODUTOS em data.js é a ordem de cadastro: a última peça é a mais recente.
  const VITRINE_QTD = 4;

  // "Recém-pintadas": as VITRINE_QTD peças mais recentes, da mais nova pra mais velha.
  renderGrade(PRODUTOS.slice(-VITRINE_QTD).reverse(), "grade-recentes");
  // "Peças em destaque": outras peças, pra não repetir a mesma vitrine duas vezes.
  renderGrade(PRODUTOS.slice(0, VITRINE_QTD), "grade-destaques");
});
