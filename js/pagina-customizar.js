// Página "Personalize sua camisa" (customizar.html).
//
// Tudo acontece no navegador: a pessoa escolhe modelo/cor/tamanho, envia
// uma ou mais artes, arrasta sobre a camisa (frente ou costas) e manda o
// pedido pelo WhatsApp. As imagens NÃO são enviadas a lugar nenhum — ficam
// só na memória da página. Como o link do WhatsApp não anexa arquivo, há
// também o botão de baixar uma prévia em PNG para anexar na conversa.

const NS = "http://www.w3.org/2000/svg";
const MAX_ARTES = 8;
const MAX_BYTES = 10 * 1024 * 1024;
const LADOS = { frente: "Frente", costas: "Costas" };

// Desenho da camisa em SVG (viewBox 400x460), por modelo e por lado. O
// pescoço da frente cai mais que o das costas. "area" é onde a estampa
// pode ser pintada — o que passa dali é cortado na prévia.
const MODELOS = {
  normal: {
    nome: "Normal",
    descricao: "Caimento reto, manga curta.",
    area: { x: 118, y: 86, w: 164, h: 318 },
    corpo: (lado) =>
      `M162 38 L98 62 L40 138 L78 168 L108 150 L108 420 L292 420 L292 150 L322 168 L360 138 L302 62 L238 38 Q200 ${
        lado === "frente" ? 84 : 58
      } 162 38 Z`,
    detalhes: (lado) => [
      `M170 41 Q200 ${lado === "frente" ? 76 : 52} 230 41`,
      "M98 62 Q124 100 108 150",
      "M302 62 Q276 100 292 150",
      "M108 404 H292",
    ],
  },
  oversized: {
    nome: "Oversized",
    descricao: "Mais larga, ombro caído, um pouco mais longa.",
    area: { x: 104, y: 92, w: 192, h: 334 },
    corpo: (lado) =>
      `M160 38 L62 74 L18 170 L66 205 L92 178 L88 440 L312 440 L308 178 L334 205 L382 170 L338 74 L240 38 Q200 ${
        lado === "frente" ? 86 : 60
      } 160 38 Z`,
    detalhes: (lado) => [
      `M168 41 Q200 ${lado === "frente" ? 78 : 54} 232 41`,
      "M62 74 Q102 128 92 178",
      "M338 74 Q298 128 308 178",
      "M88 424 H312",
    ],
  },
};

// Posições rápidas (frações da área de estampa). fx/fy = centro da arte,
// fw = largura. No lado "frente", o peito esquerdo de quem veste fica do
// lado direito de quem olha. "cm" é o tamanho aproximado da estampa
// impressa nessa posição — valores de exemplo (tabela padrão de
// estamparia), ajuste para as medidas reais que o ateliê usa.
const PRESETS = {
  frente: [
    { nome: "Peito esquerdo", fx: 0.74, fy: 0.1, fw: 0.28, cm: "10×10 cm" },
    { nome: "Centro", fx: 0.5, fy: 0.3, fw: 0.62, cm: "23×23 cm" },
    { nome: "Grande", fx: 0.5, fy: 0.42, fw: 0.92, cm: "30×35 cm" },
    { nome: "Barra", fx: 0.5, fy: 0.86, fw: 0.6, cm: "27×7 cm" },
  ],
  costas: [
    { nome: "Nuca", fx: 0.5, fy: 0.07, fw: 0.28, cm: "12×12 cm" },
    { nome: "Centro", fx: 0.5, fy: 0.3, fw: 0.62, cm: "23×23 cm" },
    { nome: "Grande", fx: 0.5, fy: 0.42, fw: 0.92, cm: "30×35 cm" },
    { nome: "Barra", fx: 0.5, fy: 0.86, fw: 0.6, cm: "27×7 cm" },
  ],
};

const estado = {
  modelo: "normal",
  cor: CONFIG.customizar.cores[0],
  tamanho: CONFIG.customizar.tamanhos[1] || CONFIG.customizar.tamanhos[0],
  lado: "frente",
  artes: [], // { id, nome, src, proporcao, lado, cx, cy, largura, rotacao }
  selecionada: null,
  guia: true,
};

let proximoId = 1;
let arrastando = null;
let redimensionando = null;
let rotacionando = null;

const $ = (id) => document.getElementById(id);
const area = () => MODELOS[estado.modelo].area;
const arteAtual = () => estado.artes.find((a) => a.id === estado.selecionada) || null;
const artesDoLado = (lado) => estado.artes.filter((a) => a.lado === lado);

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function corDoTraco(hex) {
  return luminancia(hex) < 0.45 ? "rgba(255,255,255,0.35)" : "rgba(28,23,18,0.35)";
}

// ---------- desenho da camisa ----------

function desenharCamisa() {
  const m = MODELOS[estado.modelo];
  const a = m.area;

  const corpo = $("camisa-corpo");
  corpo.setAttribute("d", m.corpo(estado.lado));
  corpo.style.fill = estado.cor.hex;

  const detalhes = $("camisa-detalhes");
  detalhes.style.setProperty("--traco-detalhe", corDoTraco(estado.cor.hex));
  detalhes.innerHTML = m.detalhes(estado.lado).map((d) => `<path d="${d}"/>`).join("");

  for (const el of [$("clip-rect"), $("camisa-guia")]) {
    el.setAttribute("x", a.x);
    el.setAttribute("y", a.y);
    el.setAttribute("width", a.w);
    el.setAttribute("height", a.h);
  }
  $("camisa-guia").style.display = estado.guia ? "" : "none";
  agendarAtualizacao3D();
}

function alturaDaArte(a) {
  return a.largura * a.proporcao;
}

function aplicarTransform(a) {
  if (!a.imgEl) return;
  const h = alturaDaArte(a);
  a.imgEl.setAttribute("x", -a.largura / 2);
  a.imgEl.setAttribute("y", -h / 2);
  a.imgEl.setAttribute("width", a.largura);
  a.imgEl.setAttribute("height", h);
  a.el.setAttribute("transform", `translate(${a.cx} ${a.cy}) rotate(${a.rotacao}) scale(${a.espelho ? -1 : 1} 1)`);
  if (a.id === estado.selecionada) atualizarSelecao();
  agendarAtualizacao3D();
}

// Alças diretamente sobre a arte selecionada, como no recorte de
// imagem de referência: 4 cantos redimensionam (mantendo a proporção),
// o círculo de cima gira, o de baixo espelha.
function atualizarSelecao() {
  const alvo = $("camisa-selecao");
  const a = arteAtual();
  if (!a || a.lado !== estado.lado) {
    alvo.innerHTML = "";
    return;
  }
  const h = alturaDaArte(a);
  const meiaL = a.largura / 2;
  const meiaH = h / 2;
  const r = 7;
  const distRot = 24;
  const cantos = [
    ["nw", -meiaL, -meiaH],
    ["ne", meiaL, -meiaH],
    ["se", meiaL, meiaH],
    ["sw", -meiaL, meiaH],
  ];
  alvo.innerHTML = `
    <g transform="translate(${a.cx} ${a.cy}) rotate(${a.rotacao}) scale(${a.espelho ? -1 : 1} 1)">
      <rect class="camisa__selecao" x="${-meiaL}" y="${-meiaH}" width="${a.largura}" height="${h}" />
      <line class="camisa__alca-linha" x1="0" y1="${-meiaH}" x2="0" y2="${-meiaH - distRot}" />
      <circle class="camisa__alca camisa__alca--rotacao" data-handle="rotacionar" cx="0" cy="${-meiaH - distRot}" r="${r}" />
      ${cantos
        .map(([c, x, y]) => `<rect class="camisa__alca camisa__alca--redimensionar" data-handle="redimensionar" x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" data-canto="${c}"/>`)
        .join("")}
      <g class="camisa__alca camisa__alca--espelhar" data-handle="espelhar" transform="translate(0 ${meiaH + distRot * 0.85})">
        <circle r="${r}" fill="var(--papel)" stroke="var(--tinta)" stroke-width="1.5" />
        <path class="camisa__alca-icone" d="M-3,-3.5 L1,0 L-3,3.5 M3,-3.5 L-1,0 L3,3.5" />
      </g>
    </g>`;
}

function sincronizarControlesArte(a) {
  $("arte-tamanho").value = Math.round(a.largura);
  $("arte-rotacao").value = Math.round(a.rotacao);
}

function anguloEntre(cx, cy, px, py) {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
}

function normalizarAngulo(deg) {
  return (((deg + 180) % 360) + 360) % 360 - 180;
}

// Recria os elementos <image> das artes do lado atual (só quando a lista
// ou o lado mudam — durante o arraste só o transform é atualizado).
function sincronizarArtes() {
  const alvo = $("camisa-artes");
  alvo.innerHTML = "";
  estado.artes.forEach((a) => {
    a.el = null;
    a.imgEl = null;
  });
  artesDoLado(estado.lado).forEach((a) => {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "art-item");
    g.dataset.id = a.id;
    const img = document.createElementNS(NS, "image");
    img.setAttribute("href", a.src);
    img.setAttribute("preserveAspectRatio", "none");
    g.appendChild(img);
    alvo.appendChild(g);
    a.el = g;
    a.imgEl = img;
    aplicarTransform(a);
  });
  atualizarSelecao();
  agendarAtualizacao3D();
}

// ---------- opções (modelo / cor / tamanho / lado) ----------

function miniaturaDoModelo(chave) {
  return `<svg viewBox="0 0 400 460" aria-hidden="true"><path d="${MODELOS[chave].corpo("frente")}"/></svg>`;
}

function montarModelos() {
  $("opcoes-modelo").innerHTML = Object.entries(MODELOS)
    .map(
      ([chave, m]) => `
      <label class="opcao-cartao">
        <input type="radio" name="modelo" value="${chave}" ${chave === estado.modelo ? "checked" : ""} />
        <span class="opcao-cartao__corpo">
          ${miniaturaDoModelo(chave)}
          <strong>${m.nome}</strong>
          <small>${m.descricao}</small>
        </span>
      </label>`
    )
    .join("");
  $("opcoes-modelo").addEventListener("change", (e) => {
    if (e.target.name === "modelo") trocarModelo(e.target.value);
  });
}

// Ao trocar de modelo a área de estampa muda de tamanho: as artes são
// reposicionadas na mesma proporção, pra não ficarem fora da camisa.
function trocarModelo(novo) {
  const de = area();
  const para = MODELOS[novo].area;
  estado.artes.forEach((a) => {
    a.cx = para.x + ((a.cx - de.x) / de.w) * para.w;
    a.cy = para.y + ((a.cy - de.y) / de.h) * para.h;
    a.largura = (a.largura / de.w) * para.w;
  });
  estado.modelo = novo;
  desenharCamisa();
  artesDoLado(estado.lado).forEach(aplicarTransform);
  atualizarPainel();
}

function montarCores() {
  const alvo = $("opcoes-cor");
  alvo.innerHTML = CONFIG.customizar.cores
    .map(
      (c, i) =>
        `<button type="button" class="cor-opcao${i === 0 ? " cor-opcao--selecionada" : ""}" style="background:${c.hex}" data-i="${i}" title="${c.nome}" aria-label="Cor ${c.nome}"></button>`
    )
    .join("");
  alvo.addEventListener("click", (e) => {
    const btn = e.target.closest(".cor-opcao");
    if (!btn) return;
    estado.cor = CONFIG.customizar.cores[Number(btn.dataset.i)];
    alvo.querySelectorAll(".cor-opcao").forEach((b) => b.classList.toggle("cor-opcao--selecionada", b === btn));
    desenharCamisa();
    atualizarPainel();
  });
}

function montarTamanhos() {
  const alvo = $("opcoes-tamanho");
  alvo.innerHTML = CONFIG.customizar.tamanhos
    .map(
      (t) =>
        `<button type="button" class="tamanho${t === estado.tamanho ? " tamanho--selecionada" : ""}" data-t="${t}">${t}</button>`
    )
    .join("");
  alvo.addEventListener("click", (e) => {
    const btn = e.target.closest(".tamanho");
    if (!btn) return;
    estado.tamanho = btn.dataset.t;
    alvo.querySelectorAll(".tamanho").forEach((b) => b.classList.toggle("tamanho--selecionada", b === btn));
    atualizarPainel();
  });
}

function trocarLado(lado) {
  estado.lado = lado;
  const sel = arteAtual();
  if (sel && sel.lado !== lado) estado.selecionada = null;
  desenharCamisa();
  sincronizarArtes();
  atualizarPainel();

  // acompanha no 3D: gira a câmera pro lado que a pessoa passou a editar
  const mv = $("camisa-3d");
  if (mv && !mv.hidden) {
    mv.cameraOrbit = lado === "frente" ? "0deg 80deg auto" : "180deg 80deg auto";
    mv.autoRotate = false;
    $("girar-sozinho")?.setAttribute("aria-pressed", "false");
  }
}

function ligarLados() {
  $("lado-frente").addEventListener("click", () => trocarLado("frente"));
  $("lado-costas").addEventListener("click", () => trocarLado("costas"));
  $("mostrar-guia").addEventListener("change", (e) => {
    estado.guia = e.target.checked;
    desenharCamisa();
  });
}

// ---------- envio de artes ----------

function lerComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler essa imagem."));
    img.src = src;
  });
}

// Lê o arquivo e, se for uma imagem muito grande, reduz (o preview não
// precisa de mais de 1600px e isso deixa o arraste leve).
async function processarArquivo(file) {
  let src = await lerComoDataURL(file);
  const img = await carregarImagem(src);
  let w = img.naturalWidth || 300;
  let h = img.naturalHeight || 300;
  if (file.type !== "image/svg+xml" && Math.max(w, h) > 1600) {
    const k = 1600 / Math.max(w, h);
    const c = document.createElement("canvas");
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    src = c.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.9);
    w = c.width;
    h = c.height;
  }
  return { src, proporcao: h / w };
}

function novaArte({ nome, src, proporcao }) {
  const a = area();
  const n = artesDoLado(estado.lado).length;
  const largura = Math.min(a.w * 0.6, (a.h * 0.8) / proporcao);
  return {
    id: proximoId++,
    nome,
    src,
    proporcao,
    lado: estado.lado,
    cx: a.x + a.w / 2 + n * 10,
    cy: a.y + a.h * 0.3 + n * 10,
    largura,
    rotacao: 0,
    espelho: false,
  };
}

function mostrarStatus(id, texto, erro = false) {
  const el = $(id);
  el.textContent = texto;
  el.classList.toggle("custom__status--erro", erro);
}

async function adicionarArquivos(lista) {
  const arquivos = [...lista];
  const mensagens = [];
  let adicionadas = 0;
  for (const file of arquivos) {
    if (estado.artes.length >= MAX_ARTES) {
      mensagens.push(`Limite de ${MAX_ARTES} artes atingido.`);
      break;
    }
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
      mensagens.push(`"${file.name}": formato não aceito (use PNG, JPG, WebP ou SVG).`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      mensagens.push(`"${file.name}": passa de 10 MB.`);
      continue;
    }
    try {
      const dados = await processarArquivo(file);
      const arte = novaArte({ nome: file.name, ...dados });
      estado.artes.push(arte);
      estado.selecionada = arte.id;
      adicionadas++;
    } catch {
      mensagens.push(`"${file.name}": não consegui ler a imagem.`);
    }
  }
  sincronizarArtes();
  atualizarPainel();
  if (mensagens.length) {
    mostrarStatus("upload-status", mensagens.join(" "), true);
  } else if (adicionadas) {
    mostrarStatus("upload-status", `${adicionadas} arte(s) adicionada(s) na ${LADOS[estado.lado].toLowerCase()}.`);
  }
}

function ligarUpload() {
  const input = $("arquivo-arte");
  const zona = $("dropzone");
  input.addEventListener("change", () => {
    adicionarArquivos(input.files);
    input.value = "";
  });
  ["dragenter", "dragover"].forEach((ev) =>
    zona.addEventListener(ev, (e) => {
      e.preventDefault();
      zona.classList.add("dropzone--ativa");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    zona.addEventListener(ev, (e) => {
      e.preventDefault();
      zona.classList.remove("dropzone--ativa");
    })
  );
  zona.addEventListener("drop", (e) => adicionarArquivos(e.dataTransfer.files));
}

// ---------- arrastar / teclado no palco ----------

function pontoNoSvg(e) {
  const svg = $("palco-svg");
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function selecionar(id) {
  estado.selecionada = id;
  atualizarSelecao();
  atualizarPainel();
}

function ligarPalco() {
  const svg = $("palco-svg");

  svg.addEventListener("pointerdown", (e) => {
    const alca = e.target.closest && e.target.closest("[data-handle]");
    if (alca) {
      const a = arteAtual();
      if (!a) return;
      const tipo = alca.dataset.handle;
      if (tipo === "espelhar") {
        a.espelho = !a.espelho;
        aplicarTransform(a);
        e.preventDefault();
        return;
      }
      svg.setPointerCapture(e.pointerId);
      if (tipo === "rotacionar") rotacionando = { id: a.id };
      else if (tipo === "redimensionar") redimensionando = { id: a.id };
      e.preventDefault();
      return;
    }

    const alvo = e.target.closest && e.target.closest("[data-id]");
    if (!alvo) {
      selecionar(null);
      return;
    }
    const a = estado.artes.find((x) => x.id === Number(alvo.dataset.id));
    if (!a) return;
    const p = pontoNoSvg(e);
    arrastando = { id: a.id, dx: p.x - a.cx, dy: p.y - a.cy };
    svg.setPointerCapture(e.pointerId);
    if (estado.selecionada !== a.id) selecionar(a.id);
    e.preventDefault();
  });

  svg.addEventListener("pointermove", (e) => {
    if (rotacionando) {
      const a = estado.artes.find((x) => x.id === rotacionando.id);
      if (!a) return;
      const p = pontoNoSvg(e);
      a.rotacao = normalizarAngulo(anguloEntre(a.cx, a.cy, p.x, p.y) + 90);
      aplicarTransform(a);
      sincronizarControlesArte(a);
      return;
    }
    if (redimensionando) {
      const a = estado.artes.find((x) => x.id === redimensionando.id);
      if (!a) return;
      const p = pontoNoSvg(e);
      const rad = (-a.rotacao * Math.PI) / 180;
      const dx = p.x - a.cx;
      const dy = p.y - a.cy;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      a.largura = Math.max(20, Math.min(320, 2 * Math.max(Math.abs(lx), Math.abs(ly) / a.proporcao)));
      aplicarTransform(a);
      sincronizarControlesArte(a);
      return;
    }
    if (!arrastando) return;
    const a = estado.artes.find((x) => x.id === arrastando.id);
    const p = pontoNoSvg(e);
    a.cx = Math.min(400, Math.max(0, p.x - arrastando.dx));
    a.cy = Math.min(460, Math.max(0, p.y - arrastando.dy));
    aplicarTransform(a);
  });

  const soltar = () => {
    arrastando = null;
    rotacionando = null;
    redimensionando = null;
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);

  svg.addEventListener("keydown", (e) => {
    const a = arteAtual();
    if (!a || a.lado !== estado.lado) return;
    const passo = e.shiftKey ? 10 : 2;
    const mover = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key];
    if (mover) {
      a.cx += mover[0];
      a.cy += mover[1];
      aplicarTransform(a);
      e.preventDefault();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      removerArte(a.id);
      e.preventDefault();
    }
  });
}

// ---------- controles da arte selecionada ----------

// A ordem de "estado.artes" é a ordem de empilhamento na camisa (quem vem
// depois no array é desenhado por cima) — troca a posição da arte com a
// da vizinha do MESMO lado, uma casa pra frente (direcao 1) ou pra trás
// (direcao -1).
function moverCamada(id, direcao) {
  const a = estado.artes.find((x) => x.id === id);
  if (!a) return;
  const doLado = artesDoLado(a.lado);
  const posLocal = doLado.findIndex((x) => x.id === id);
  const alvoLocal = posLocal + direcao;
  if (alvoLocal < 0 || alvoLocal >= doLado.length) return;
  const outro = doLado[alvoLocal];
  const iA = estado.artes.indexOf(a);
  const iB = estado.artes.indexOf(outro);
  [estado.artes[iA], estado.artes[iB]] = [estado.artes[iB], estado.artes[iA]];
  sincronizarArtes();
  atualizarPainel();
}

function removerArte(id) {
  estado.artes = estado.artes.filter((a) => a.id !== id);
  if (estado.selecionada === id) estado.selecionada = null;
  sincronizarArtes();
  atualizarPainel();
}

function aplicarPreset(p) {
  const a = arteAtual();
  if (!a) return;
  const ar = area();
  a.largura = Math.min(p.fw * ar.w, (ar.h * 0.92) / a.proporcao);
  a.cx = ar.x + p.fx * ar.w;
  a.cy = ar.y + p.fy * ar.h;
  aplicarTransform(a);
  atualizarPainel();
}

function ligarControlesArte() {
  $("arte-tamanho").addEventListener("input", (e) => {
    const a = arteAtual();
    if (!a) return;
    a.largura = Number(e.target.value);
    aplicarTransform(a);
  });
  $("arte-rotacao").addEventListener("input", (e) => {
    const a = arteAtual();
    if (!a) return;
    a.rotacao = Number(e.target.value);
    aplicarTransform(a);
  });
  $("arte-centralizar").addEventListener("click", () => {
    const a = arteAtual();
    if (!a) return;
    a.cx = area().x + area().w / 2;
    aplicarTransform(a);
  });
  $("arte-duplicar").addEventListener("click", () => {
    const a = arteAtual();
    if (!a || estado.artes.length >= MAX_ARTES) return;
    const copia = { ...a, id: proximoId++, cx: a.cx + 14, cy: a.cy + 14, el: null, imgEl: null };
    estado.artes.push(copia);
    estado.selecionada = copia.id;
    sincronizarArtes();
    atualizarPainel();
  });
  $("arte-lado").addEventListener("click", () => {
    const a = arteAtual();
    if (!a) return;
    a.lado = a.lado === "frente" ? "costas" : "frente";
    trocarLado(a.lado);
  });
  $("arte-remover").addEventListener("click", () => {
    const a = arteAtual();
    if (a) removerArte(a.id);
  });
  $("presets").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (btn) aplicarPreset(PRESETS[estado.lado][Number(btn.dataset.preset)]);
  });
  $("artes-lista").addEventListener("click", (e) => {
    const camada = e.target.closest("[data-camada]");
    if (camada) {
      moverCamada(Number(camada.dataset.arteId), camada.dataset.camada === "frente" ? 1 : -1);
      return;
    }
    const remover = e.target.closest("[data-remover]");
    if (remover) {
      removerArte(Number(remover.dataset.remover));
      return;
    }
    const item = e.target.closest("[data-arte]");
    if (!item) return;
    const a = estado.artes.find((x) => x.id === Number(item.dataset.arte));
    if (!a) return;
    estado.selecionada = a.id;
    if (a.lado !== estado.lado) trocarLado(a.lado);
    else {
      atualizarSelecao();
      atualizarPainel();
    }
  });
}

// ---------- painel: lista, controles, resumo, WhatsApp ----------

function resumoDoPedido() {
  const frente = artesDoLado("frente");
  const costas = artesDoLado("costas");
  const rotulo = (lista) =>
    lista.length ? `${lista.length} arte(s): ${lista.map((a) => a.nome).join(", ")}` : "sem arte";
  return [
    ["Modelo", MODELOS[estado.modelo].nome],
    ["Cor da camisa", estado.cor.nome],
    ["Tamanho", estado.tamanho],
    ["Frente", rotulo(frente)],
    ["Costas", rotulo(costas)],
  ];
}

function mensagemWhatsApp() {
  const linhas = resumoDoPedido().map(([k, v]) => `• ${k}: ${v}`);
  const obs = $("observacoes").value.trim();
  const texto = [
    "Olá! Quero encomendar uma camisa personalizada:",
    "",
    ...linhas,
    ...(obs ? [`• Observações: ${obs}`] : []),
    "",
    estado.artes.length
      ? "Vou mandar os arquivos das artes e a prévia por aqui."
      : "Ainda vou enviar a arte por aqui.",
  ].join("\n");
  return encodeURIComponent(texto);
}

function atualizarPainel() {
  $("cor-nome").textContent = estado.cor.nome;
  $("lado-frente").setAttribute("aria-pressed", String(estado.lado === "frente"));
  $("lado-costas").setAttribute("aria-pressed", String(estado.lado === "costas"));

  // lista de artes — quando duas ou mais dividem o mesmo lado, mostra a
  // camada (quem fica na frente de quem) e alças pra reordenar.
  $("artes-lista").innerHTML = estado.artes
    .map((a) => {
      const doLado = artesDoLado(a.lado);
      const pos = doLado.findIndex((x) => x.id === a.id);
      const total = doLado.length;
      const camadaInfo = total > 1 ? ` · camada ${pos + 1}/${total}` : "";
      const camadas =
        total > 1
          ? `<span class="arte-item__camadas" role="group" aria-label="Ordem de sobreposição">
              <button type="button" class="arte-item__camada" data-camada="frente" data-arte-id="${a.id}" title="Trazer para frente" aria-label="Trazer ${escaparHTML(a.nome)} para frente"${pos < total - 1 ? "" : " disabled"}>▲</button>
              <button type="button" class="arte-item__camada" data-camada="tras" data-arte-id="${a.id}" title="Enviar para trás" aria-label="Enviar ${escaparHTML(a.nome)} para trás"${pos > 0 ? "" : " disabled"}>▼</button>
            </span>`
          : "";
      return `
      <li class="arte-item${a.id === estado.selecionada ? " arte-item--sel" : ""}" data-arte="${a.id}">
        <img src="${a.src}" alt="" />
        <span class="arte-item__nome">${escaparHTML(a.nome)}</span>
        <span class="arte-item__lado">${LADOS[a.lado]}${camadaInfo}</span>
        ${camadas}
        <button type="button" class="arte-item__remover" data-remover="${a.id}" aria-label="Remover ${escaparHTML(a.nome)}">×</button>
      </li>`;
    })
    .join("");

  // controles da arte selecionada
  const a = arteAtual();
  $("arte-controles").hidden = !a;
  if (a) {
    $("arte-tamanho").value = Math.round(a.largura);
    $("arte-rotacao").value = Math.round(a.rotacao);
    $("presets").innerHTML = PRESETS[a.lado]
      .map(
        (p, i) =>
          `<button type="button" class="filtro preset-botao" data-preset="${i}">${p.nome}<span class="preset-botao__cm">${p.cm}</span></button>`
      )
      .join("");
    $("arte-lado").textContent = a.lado === "frente" ? "Enviar para as costas" : "Enviar para a frente";
  }

  $("dica-palco").hidden = estado.artes.length > 0 && artesDoLado(estado.lado).length > 0;

  // resumo + link
  $("resumo").innerHTML = resumoDoPedido()
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${escaparHTML(v)}</dd></div>`)
    .join("");
  $("enviar-whatsapp").href = `https://wa.me/${CONFIG.whatsapp}?text=${mensagemWhatsApp()}`;
}

// ---------- prévia em PNG ----------

// SVG independente (sem guias nem seleção) de um lado da camisa, com as
// artes embutidas como data URL — necessário pra virar imagem no canvas.
function svgDoLado(lado) {
  const m = MODELOS[estado.modelo];
  const ar = m.area;
  const artes = artesDoLado(lado)
    .map((a) => {
      const h = alturaDaArte(a);
      return `<g transform="translate(${a.cx} ${a.cy}) rotate(${a.rotacao}) scale(${a.espelho ? -1 : 1} 1)"><image href="${a.src}" xlink:href="${a.src}" x="${-a.largura / 2}" y="${-h / 2}" width="${a.largura}" height="${h}" preserveAspectRatio="none"/></g>`;
    })
    .join("");
  const traco = corDoTraco(estado.cor.hex);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 400 460" width="800" height="920">
    <defs><clipPath id="c"><rect x="${ar.x}" y="${ar.y}" width="${ar.w}" height="${ar.h}"/></clipPath></defs>
    <path d="${m.corpo(lado)}" fill="${estado.cor.hex}" stroke="#1c1712" stroke-width="3" stroke-linejoin="round"/>
    ${m.detalhes(lado).map((d) => `<path d="${d}" fill="none" stroke="${traco}" stroke-width="2" stroke-linecap="round"/>`).join("")}
    <g clip-path="url(#c)">${artes}</g>
  </svg>`;
}

async function gerarPrevia() {
  await document.fonts.ready;
  const L = 800;
  const A = 920;
  const canvas = document.createElement("canvas");
  canvas.width = L * 2;
  canvas.height = A + 60;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--papel").trim() || "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const [i, lado] of ["frente", "costas"].entries()) {
    const url = URL.createObjectURL(new Blob([svgDoLado(lado)], { type: "image/svg+xml" }));
    try {
      const img = await carregarImagem(url);
      ctx.drawImage(img, i * L, 60, L, A);
    } finally {
      URL.revokeObjectURL(url);
    }
    ctx.fillStyle = "#1c1712";
    ctx.font = '700 34px "Integral CF", sans-serif';
    ctx.fillText(LADOS[lado].toUpperCase(), i * L + 40, 44);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob vazio"))), "image/png")
  );
}

// ---------- prévia em 3D ----------
// Ao vivo: cada mudança no editor 2D (mover/girar arte, trocar cor,
// modelo ou lado) agenda uma atualização da textura 3D, com um pequeno
// atraso (debounce) pra não recriar a textura a cada pixel arrastado —
// só quando a pessoa pausa por um instante.

let atualizacao3DPendente = null;

function agendarAtualizacao3D() {
  clearTimeout(atualizacao3DPendente);
  atualizacao3DPendente = setTimeout(atualizarVisualizador3D, 150);
}

function suportaWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

// Serializa só a camada de artes de um lado (recortada na área de
// estampa, fundo transparente) como uma imagem independente — é isso que
// vira a textura colada no painel correspondente do modelo 3D. Se o lado
// não tem nenhuma arte, retorna null (o painel fica só na cor do tecido).
function svgDaAreaImpressa(lado) {
  const pecas = artesDoLado(lado);
  if (pecas.length === 0) return null;
  const a = area();
  const artes = pecas
    .map((art) => {
      const h = alturaDaArte(art);
      return `<g transform="translate(${art.cx} ${art.cy}) rotate(${art.rotacao}) scale(${art.espelho ? -1 : 1} 1)"><image href="${art.src}" x="${-art.largura / 2}" y="${-h / 2}" width="${art.largura}" height="${h}" preserveAspectRatio="none"/></g>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${a.x} ${a.y} ${a.w} ${a.h}" width="${Math.round(a.w * 3)}" height="${Math.round(a.h * 3)}">${artes}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function mostrarAvisoIndisponivel3D(mostrar) {
  const mv = $("camisa-3d");
  const selo = document.querySelector(".custom__selo-3d");
  const controles = document.querySelector(".custom__controles-3d");
  const aviso = $("aviso-3d-indisponivel");
  if (mv) mv.hidden = mostrar;
  if (selo) selo.hidden = mostrar;
  if (controles) controles.hidden = mostrar;
  if (aviso) aviso.hidden = !mostrar;
}

async function atualizarVisualizador3D() {
  const mv = $("camisa-3d");
  if (!mv) return;

  if (!window.Camisa3D || !suportaWebGL() || !window.Camisa3D.caimentoDisponivel(estado.modelo)) {
    mostrarAvisoIndisponivel3D(true);
    return;
  }
  mostrarAvisoIndisponivel3D(false);

  try {
    await window.Camisa3D.mostrarCamisa(mv, {
      corTecido: estado.cor.hex,
      caimento: estado.modelo,
      frenteURL: svgDaAreaImpressa("frente"),
      costasURL: svgDaAreaImpressa("costas"),
    });
  } catch (e) {
    console.error(e);
    mostrarAvisoIndisponivel3D(true);
  }
}

function ligarVisualizador3D() {
  const mv = $("camisa-3d");
  if (!mv) return;

  mv.addEventListener("error", () => mostrarAvisoIndisponivel3D(true));

  const reduzMovimento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduzMovimento) {
    mv.removeAttribute("auto-rotate");
    mv.autoRotate = false;
  }

  const botaoGirar = $("girar-sozinho");
  botaoGirar.setAttribute("aria-pressed", String(!reduzMovimento));
  botaoGirar.addEventListener("click", () => {
    mv.autoRotate = !mv.autoRotate;
    botaoGirar.setAttribute("aria-pressed", String(mv.autoRotate));
  });
}

function ligarAcoes() {
  $("observacoes").addEventListener("input", atualizarPainel);
  $("baixar-previa").addEventListener("click", async () => {
    mostrarStatus("acao-status", "Gerando prévia…");
    try {
      const blob = await gerarPrevia();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "camisa-personalizada.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      mostrarStatus("acao-status", "Prévia baixada — anexe na conversa do WhatsApp.");
    } catch {
      mostrarStatus("acao-status", "Não consegui gerar a prévia neste navegador. Tire um print da tela.", true);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCabecalho("customizar");
  renderRodape();
  montarModelos();
  montarCores();
  montarTamanhos();
  ligarLados();
  ligarUpload();
  ligarPalco();
  ligarControlesArte();
  ligarAcoes();
  ligarVisualizador3D();
  desenharCamisa();
  atualizarPainel();
});
