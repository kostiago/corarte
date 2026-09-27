// Dados mockados do catálogo. Estrutura pensada para, no futuro,
// ser substituída por uma chamada de API (ex: GET /api/produtos).
//
// Cada produto pode receber fotos reais no campo "imagens": uma lista de
// objetos { src, alt }, na ordem em que devem aparecer (a primeira é a
// capa do cartão). Aceita tanto uma URL (ex: "https://...") quanto um
// caminho local dentro do site (ex: "img/produtos/sol-de-meio-dia-1.jpg").
// Quando "imagens" estiver vazio, o site desenha automaticamente o
// motivo em traço de xilogravura (SVG) como ilustração provisória —
// então dá pra publicar peças no catálogo antes mesmo de ter a foto.
//
// Dois campos são opcionais, e só aparecem na página do produto se
// existirem:
// - "precoOriginal": um valor "de", pra mostrar desconto (preço riscado +
//   percentual). Sem esse campo, não mostra nada de desconto.
// - "cores": outras combinações de tecido/tinta em que essa mesma arte
//   também pode ser encomendada (exemplo — ajuste para as combinações
//   reais que o ateliê oferece). Sem esse campo, a peça só existe na cor
//   já definida em corTecido/corTinta.
// - "descricaoCompleta": texto mais longo pra aba "Descrição" da página do
//   produto (a "descricao" curta continua sendo usada no cartão e no
//   resumo do topo). É rascunho de exemplo — revise o tom e os detalhes
//   antes de publicar. Sem esse campo, a aba "Descrição" repete o texto curto.

// Configurações do site que não são "produto" — centralizadas aqui para
// não repetir o mesmo número em vários arquivos.
const CONFIG = {
  whatsapp: "5583900000000", // placeholder — trocar pelo número real do ateliê
  instagram: "https://instagram.com", // placeholder — trocar pelo @ do ateliê

  // Sacola (carrinho.html). O fechamento do pedido continua sendo pelo
  // WhatsApp — estes valores só alimentam o resumo mostrado na página.
  carrinho: {
    // Frete padrão, somado ao total (valor de exemplo). Use 0 para "Grátis".
    // O valor final é confirmado na conversa.
    frete: 15.0,

    // Cupom de desconto é OPCIONAL: com "ativo: false" (ou sem nenhum código
    // em "codigos") o campo de cupom nem aparece na página.
    // tipo "percentual": valor é a % sobre o subtotal já com os descontos das
    // peças. tipo "fixo": valor é em reais.
    cupons: {
      ativo: true,
      codigos: {
        // código de exemplo — troque ou apague antes de publicar
        CORARTE10: { tipo: "percentual", valor: 10, descricao: "10% de desconto" },
      },
    },
  },

  // Opções da página "Personalize sua camisa" (customizar.html). São
  // valores de exemplo — ajuste para as cores de tecido e tamanhos que o
  // ateliê realmente trabalha.
  customizar: {
    cores: [
      { nome: "Cru", hex: "#EDE3C8" },
      { nome: "Branco", hex: "#FAF8F2" },
      { nome: "Areia", hex: "#E0D3AC" },
      { nome: "Preto", hex: "#1C1712" },
      { nome: "Azul petróleo", hex: "#2B4C5C" },
      { nome: "Terracota", hex: "#A63625" },
    ],
    tamanhos: ["P", "M", "G", "GG"],
  },

  // Ficha técnica "padrão" da camisa, usada na aba "Características" da
  // página de produto (tecido, manga, gola, caimento etc. são os mesmos
  // pra toda a coleção — só a arte/cor muda de peça pra peça). São valores
  // de exemplo, coerentes com uma camiseta básica — confirme com o corte
  // real que o ateliê usa antes de publicar.
  pecaPadrao: {
    genero: "Unissex",
    idade: "Adultos",
    tipoDeTecido: "Algodão",
    composicao: "100% algodão",
    tipoDeManga: "Manga curta",
    tipoDeGola: "Gola careca",
    caimento: "Regular, levemente solta",
    usosRecomendados: "Dia a dia, uso casual",
  },
};

const CATEGORIAS = [
  { id: "todos", nome: "Todas as peças" },
  { id: "sertao", nome: "Sertão" },
  { id: "cordel", nome: "Cordel" },
  { id: "fauna", nome: "Bicharia" },
  { id: "festa", nome: "Festa de Junho" },
];

const PRODUTOS = [
  {
    id: "p01",
    nome: "Sol de Meio-Dia",
    imagens: [],
    categoria: "sertao",
    motivo: "sol",
    corTecido: "#EDE3C8",
    corTinta: "#1C1712",
    // Exemplo de combinação alternativa — troque pelas cores reais que o
    // ateliê aceita pintar para esta arte.
    cores: [
      { nome: "Cru", corTecido: "#EDE3C8", corTinta: "#1C1712" },
      { nome: "Noite", corTecido: "#2B4C5C", corTinta: "#EDE3C8" },
    ],
    imagens: [
      { src: "imgs/sol-do-sertao.jpeg", alt: "Camisa Galo de Quintal, vista da frente" },
      { src: "https://picsum.photos/seed/galo-quintal-2/600/750", alt: "Camisa Galo de Quintal, detalhe da pintura" },
    ],
    preco: 128.0,
    tamanhos: ["P", "M", "G", "GG"],
    estoque: 1,
    descricao:
      "Camisa em algodão cru, pintada à mão com um sol raiado que remete às tardes do sertão. Cada raio é traçado um a um, sem molde repetido.",
    descricaoCompleta:
      "O sol do meio-dia é aquele que ninguém encara de frente, mas que define o ritmo de quem vive no sertão — hora de buscar sombra, hora de esperar a tarde esfriar. Nessa camisa, o sol vira raio a raio pintado à mão sobre algodão cru, sem régua nem molde: cada ponta sai de um jeito, como o próprio calor que nunca cai igual dois dias seguidos. É uma peça pensada pra quem gosta de carregar uma paisagem inteira debaixo da roupa do dia a dia.",
  },
  {
    id: "p02",
    nome: "Cantoria de Viola",
    imagens: [],
    categoria: "cordel",
    motivo: "estrela",
    corTecido: "#E0D3AC",
    corTinta: "#A63625",
    preco: 149.9,
    tamanhos: ["P", "M", "G"],
    estoque: 1,
    descricao:
      "Estrela de cordel em tinta terracota sobre algodão claro, inspirada nas capas de folheto que circulam nas feiras da Paraíba.",
    descricaoCompleta:
      "Antes de virar camisa, essa estrela já rodou capa de folheto de feira, cantada de cor por quem nunca precisou ler pra saber a história. A pintura em terracota sobre algodão claro busca esse traço direto da xilogravura de cordel — sem frescura, só o essencial da forma. Uma homenagem discreta à cantoria que ainda ecoa nas praças do interior da Paraíba, pra vestir igual quem gosta de carregar cultura sem precisar explicar.",
  },
  {
    id: "p03",
    nome: "Galo de Quintal",
    // Exemplo de como fica com foto real — troque pela imagem verdadeira
    // do produto quando ela existir (pode ter mais de uma, tipo o verso
    // da camisa ou um close da pintura).
    imagens: [
      { src: "https://picsum.photos/seed/galo-quintal-1/600/750", alt: "Camisa Galo de Quintal, vista da frente" },
      { src: "https://picsum.photos/seed/galo-quintal-2/600/750", alt: "Camisa Galo de Quintal, detalhe da pintura" },
    ],
    categoria: "fauna",
    motivo: "galo",
    corTecido: "#EDE3C8",
    corTinta: "#1C1712",
    // Exemplo — como a foto é real, trocar a cor aqui não troca a foto
    // mostrada (ver nota em pagina-produto.js); serve pra combinar a cor
    // ao encomendar uma pintura nova.
    cores: [
      { nome: "Branco", corTecido: "#EDE3C8", corTinta: "#1C1712" },
      { nome: "Terracota", corTecido: "#E0D3AC", corTinta: "#A63625" },
    ],
    preco: 139.0,
    precoOriginal: 152.0,
    tamanhos: ["M", "G", "GG"],
    estoque: 0,
    descricao:
      "O galo em traço firme, xilogravura clássica de quintal nordestino, pintado à mão sobre camisa branca de gola careca.",
    descricaoCompleta:
      "Todo quintal do sertão tem um galo que acha que manda no dia — e é esse personagem clássico da xilogravura nordestina que ganha vida nessa camisa, em traço firme e cheio de caráter. Pintado à mão sobre uma base branca de gola careca, o desenho guarda a simplicidade robusta das gravuras de cordel: poucas linhas, mas nenhuma sobrando. Uma peça despretensiosa, com aquele jeitão de coisa de quintal que também fica bem na rua.",
  },
  {
    id: "p04",
    nome: "Xique-Xique",
    imagens: [],
    categoria: "sertao",
    motivo: "cacto",
    corTecido: "#DDD0AA",
    corTinta: "#2B4C5C",
    preco: 132.5,
    precoOriginal: 152.0, // exemplo de peça em desconto — remova o campo pra tirar o selo
    tamanhos: ["P", "M", "G", "GG"],
    estoque: 1,
    descricao:
      "Mandacaru estilizado em azul noturno, homenagem à paisagem seca que floresce depois da chuva.",
    descricaoCompleta:
      "Xique-xique e mandacaru são desses cactos que passam o ano seco esperando um único aguaceiro pra florescer — e é essa espera que a camisa tenta guardar em traço, estilizando o cacto em tons de azul noturno sobre o tecido. Não é uma paisagem otimista fácil: é a beleza que existe mesmo na estiagem, no verde que resiste debaixo da poeira. Uma pintura pra quem gosta de estampas que contam alguma coisa sobre resistência, não só sobre estética.",
  },
  {
    id: "p05",
    nome: "Forró de Terreiro",
    imagens: [],
    categoria: "festa",
    motivo: "flor",
    corTecido: "#EDE3C8",
    corTinta: "#C1932B",
    preco: 145.0,
    tamanhos: ["P", "M", "G"],
    estoque: 1,
    descricao:
      "Flor de São João em ocre, pintada para lembrar as bandeirinhas e o chão batido dos arraiais de junho.",
    descricaoCompleta:
      "Essa arte nasceu pensando no chão batido de terreiro, na fogueira baixa e nas bandeirinhas balançando entre uma quadrilha e outra. A flor de São João, pintada em ocre sobre o tecido, é um jeito de carregar um pouco do clima de arraial mesmo fora de junho — uma estampa festiva sem ser exagerada, que combina tanto com o forró de pé de serra quanto com um dia comum que merece um pouco de festa.",
  },
  {
    id: "p06",
    nome: "Cordel do Sertão",
    imagens: [],
    categoria: "cordel",
    motivo: "estrela",
    corTecido: "#E0D3AC",
    corTinta: "#1C1712",
    preco: 149.9,
    tamanhos: ["M", "G", "GG"],
    estoque: 1,
    descricao:
      "Estrela e versos imaginários gravados em preto sobre algodão claro — cada camisa carrega uma frase diferente, escolhida na encomenda.",
    descricaoCompleta:
      "Um cordel de verdade nunca é só imagem — vem sempre com verso. Essa camisa segue a lógica: a estrela clássica de capa de folheto é gravada em preto sobre algodão claro, e junto dela entra uma frase escolhida na hora da encomenda, meio provérbio, meio verso de cordel. É a peça mais personalizável do ateliê: a pintura é a mesma, mas a palavra que a acompanha muda de camisa pra camisa, feito repente.",
  },
  {
    id: "p07",
    nome: "Asa Branca",
    imagens: [],
    categoria: "fauna",
    motivo: "ave",
    corTecido: "#EDE3C8",
    corTinta: "#A63625",
    preco: 141.0,
    tamanhos: ["P", "M", "G", "GG"],
    estoque: 0,
    descricao:
      "Ave em voo, traço solto em terracota, inspirada nas revoadas que anunciam a chegada da chuva no sertão.",
    descricaoCompleta:
      "No sertão, ver um bando de aves cortando o céu é quase um aviso: a chuva vem chegando. Essa camisa tenta capturar esse instante — o traço solto, quase apressado, da ave em pleno voo, pintado em terracota sobre o tecido. Mais do que um pássaro, é um símbolo de esperança à espera d'água, uma estampa que carrega leveza mesmo falando de uma terra que sofre com a seca.",
  },
  {
    id: "p08",
    nome: "Balão de São João",
    imagens: [],
    categoria: "festa",
    motivo: "sol",
    corTecido: "#DDD0AA",
    corTinta: "#A63625",
    preco: 138.0,
    tamanhos: ["P", "M", "G"],
    estoque: 1,
    descricao:
      "Um sol partido em pontas, como fogueira de São João vista de longe. Pintura em tinta terracota sobre algodão encorpado.",
    descricaoCompleta:
      "De longe, um balão de São João subindo no céu escuro de junho parece um sol quebrado em pontas de fogo. Essa camisa reinterpreta esse sol de festa em tinta terracota, sobre um algodão mais encorpado — pensado pra aguentar noite de fogueira, sereno e chinelo de dedo. Uma peça de festa junina que não é literal: não tem bandeirinha nem milho, só o brilho abstrato de uma noite de arraial guardado em traço.",
  },
];

// Cada peça é feita sob encomenda, então "estoque" aqui representa
// quantas unidades daquela pintura específica ainda podem ser feitas
// antes de a arte ser substituída por outra no catálogo.