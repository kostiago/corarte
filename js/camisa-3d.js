// camisa-3d.js — Corarte
// Prévia em 3D da camisa personalizada (customizar.html): pega o que a
// pessoa já montou no editor 2D (frente e costas, com a(s) arte(s) dela
// posicionadas) e cola cada lado no painel correspondente do molde UV do
// modelo 3D, como uma textura.
//
// É um módulo ES (carregado com <script type="module">), então pra
// pagina-customizar.js — um script comum — conseguir chamar essas funções,
// elas também são expostas em window.Camisa3D.
//
// Suporte a mais de um caimento: cada entrada de CAIMENTOS tem o próprio
// .glb e os próprios painéis (o molde UV muda de corte pra corte). Pra
// adicionar um caimento novo — por exemplo "oversized" — basta colocar o
// arquivo em modelos/ e uma entrada aqui; nada na lógica abaixo precisa mudar.

export const CAIMENTOS = {
  normal: {
    nome: "Normal",
    src: "modelos/camiseta-normal.glb",
    // Caixas do molde UV (0 a 1, origem no canto superior esquerdo da
    // textura) onde a arte de cada lado é colada. Se o modelo for
    // reexportado do Blender com outro layout de UV, é só recalibrar estes
    // números — nada mais no código muda.
    paineis: {
      frente: { u0: 0.04, v0: 0.06, u1: 0.5, v1: 0.67 },
      costas: { u0: 0.53, v0: 0.06, u1: 0.98, v1: 0.67 },
    },
    // Desligado até a escala do .glb ser corrigida no Blender (hoje a
    // camisa exportada tem uns 4m — no visualizador não importa, porque a
    // câmera se ajusta sozinha, mas em AR ela apareceria gigante).
    ar: false,
  },

  oversized: {
    nome: "Oversized",
    src: "modelos/camiseta-oversized.glb",
    // Mesmas caixas do "normal" — conferido visualmente com uma textura de
    // grade (aplicada direto, sem passar pelos painéis) que o molde UV do
    // oversized usa o mesmo layout.
    paineis: {
      frente: { u0: 0.04, v0: 0.06, u1: 0.5, v1: 0.67 },
      costas: { u0: 0.53, v0: 0.06, u1: 0.98, v1: 0.67 },
    },
    ar: false,
  },
};

const TAMANHO_TEXTURA = 2048;

function carregarImagem(url) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error(`Não consegui carregar a arte: ${url}`));
    img.src = url;
  });
}

// Desenha "img" dentro da caixa do painel, mantendo a proporção da imagem
// (contain — não estica) e centralizado.
function desenharNoPainel(ctx, img, caixa, T) {
  if (!img || !caixa) return;
  const larguraCaixa = (caixa.u1 - caixa.u0) * T;
  const alturaCaixa = (caixa.v1 - caixa.v0) * T;
  const k = Math.min(larguraCaixa / img.width, alturaCaixa / img.height);
  const w = img.width * k;
  const h = img.height * k;
  const cx = ((caixa.u0 + caixa.u1) / 2) * T;
  const cy = ((caixa.v0 + caixa.v1) / 2) * T;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function montarTextura(cor, cfg, imagens) {
  const T = TAMANHO_TEXTURA;
  const c = document.createElement("canvas");
  c.width = c.height = T;
  const ctx = c.getContext("2d");
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, T, T);
  desenharNoPainel(ctx, imagens.frente, cfg.paineis.frente, T);
  desenharNoPainel(ctx, imagens.costas, cfg.paineis.costas, T);
  return c;
}

function proximoLoad(mv) {
  return new Promise((ok) => mv.addEventListener("load", ok, { once: true }));
}

// true assim que o <model-viewer> terminou de carregar O MODELO ATUAL — mas
// cuidado: logo depois de trocar o src, mv.loaded ainda reflete o modelo
// ANTERIOR por um instante, então quem troca o caimento precisa aguardar o
// próximo evento "load" de propósito (ver mostrarCamisa).
function quandoCarregado(mv) {
  return mv.loaded ? Promise.resolve() : proximoLoad(mv);
}

// Qual caimento está carregado no momento — controlado só por nós, porque
// mv.getAttribute("src") NÃO reflete a troca feita via mv.src = "..."
// (isso ficou preso pra sempre no valor inicial do HTML e fazia a troca de
// modelo parecer travada). "normal" porque é o que já vem no src do HTML.
let caimentoCarregado = "normal";

// Cada chamada pega um número; se uma chamada mais nova começar antes dela
// terminar, ela desiste sem aplicar textura — evita que uma resposta lenta
// (ex.: trocar de modelo rápido demais) sobrescreva o resultado mais novo.
let geracaoAtual = 0;

// Aplica a composição (cor do tecido + arte da frente + arte das costas) no
// <model-viewer>. Só troca o modelo (e espera o carregamento) se o
// caimento pedido for diferente do que já está carregado; só trocar a
// arte, no mesmo caimento, não recarrega nada.
export async function mostrarCamisa(mv, { corTecido, caimento = "normal", frenteURL = null, costasURL = null } = {}) {
  const cfg = CAIMENTOS[caimento];
  if (!cfg) throw new Error(`Caimento desconhecido: ${caimento}`);

  const minhaGeracao = ++geracaoAtual;

  if (caimentoCarregado !== caimento) {
    const carregou = proximoLoad(mv);
    caimentoCarregado = caimento;
    mv.src = cfg.src;
    if (cfg.ar) {
      mv.setAttribute("ar", "");
      mv.setAttribute("ar-modes", "webxr scene-viewer quick-look");
    } else {
      mv.removeAttribute("ar");
    }
    await carregou;
  } else {
    await quandoCarregado(mv);
  }
  if (minhaGeracao !== geracaoAtual) return;

  const [frente, costas] = await Promise.all([
    frenteURL ? carregarImagem(frenteURL) : Promise.resolve(null),
    costasURL ? carregarImagem(costasURL) : Promise.resolve(null),
  ]);
  if (minhaGeracao !== geracaoAtual) return;

  const textura = await mv.createTexture(
    montarTextura(corTecido, cfg, { frente, costas }).toDataURL("image/jpeg", 0.92)
  );
  if (minhaGeracao !== geracaoAtual) return;

  for (const m of mv.model.materials) {
    const pbr = m.pbrMetallicRoughness;
    pbr.setBaseColorFactor([1, 1, 1, 1]);
    pbr.setMetallicFactor(0); // tecido não é metal (corrige o Metallic 0.43 do arquivo)
    pbr.setRoughnessFactor(0.95); // algodão é fosco
    pbr.baseColorTexture.setTexture(textura);
  }
}

// Caimentos que já têm modelo pronto aqui em CAIMENTOS — assim, um caimento
// que ainda não tem .glb (ex.: "oversized" antes do arquivo existir) some
// da lista sozinho, sem quebrar nada.
export function caimentoDisponivel(caimento) {
  return Boolean(CAIMENTOS[caimento]);
}

// Ponte pra pagina-customizar.js (script comum, não é módulo) conseguir
// usar essas funções sem precisar virar module também.
window.Camisa3D = { CAIMENTOS, mostrarCamisa, caimentoDisponivel };
