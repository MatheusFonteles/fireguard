/* =========================================================
   FireGuard — camada de dados do protótipo
   (no produto final isto vira uma API + banco de dados)
   ========================================================= */
const FG = (() => {
  const WHATSAPP = '5511999999999'; // <- trocar pelo número oficial da FireGuard
  // MODO: 'completo' (site + chatbot + painel) ou 'chatbot' (WhatsApp + painel) — definido em assets/config.js
  const MODO = window.FG_MODO || 'completo';
  const KEY = 'fg_orcamentos_v5_' + MODO;
  const PRICE_KEY = 'fg_precos_v1_' + MODO;
  const ORIGEM_BOT = MODO === 'chatbot' ? 'WhatsApp' : 'Chatbot';
  // o que o cliente informou (guardado separado do que o atendente ajusta na cotação)
  const CAMPOS = ['produto', 'largura', 'altura', 'vaos', 'vidro', 'acabamento', 'extras'];
  const informadoDe = o => { const r = {}; CAMPOS.forEach(k => { if (o[k] !== undefined) r[k] = Array.isArray(o[k]) ? [...o[k]] : o[k]; }); return r; };

  const precosPadrao = {
    produtos: {
      envidracamento: { nome: 'Envidraçamento de sacada', precoM2: 980 },
      anteparo:       { nome: 'Anteparo corta-fogo',      precoM2: 1480 },
      cortina:        { nome: 'Cortina de vidro inteligente', precoM2: 1850 },
      guardacorpo:    { nome: 'Guarda-corpo em vidro',    precoM2: 1250 },
    },
    vidros: {
      temp8:   { nome: 'Temperado 8 mm incolor',  fator: 1.00 },
      temp10:  { nome: 'Temperado 10 mm incolor', fator: 1.14 },
      lam:     { nome: 'Laminado de segurança',   fator: 1.32 },
      fume:    { nome: 'Temperado fumê / bronze', fator: 1.08 },
      cf:      { nome: 'Vidro corta-fogo certificado', fator: 1.65 },
    },
    acabamentos: {
      natural: { nome: 'Alumínio natural fosco', fator: 1.00 },
      branco:  { nome: 'Branco',  fator: 1.00 },
      preto:   { nome: 'Preto fosco', fator: 1.06 },
      bronze:  { nome: 'Bronze / Champagne', fator: 1.09 },
    },
    extras: {
      fechadura:  { nome: 'Fechadura com chave',      valor: 280,  tipo: 'un' },
      persiana:   { nome: 'Persiana integrada',        valor: 420,  tipo: 'm2' },
      automacao:  { nome: 'Automação (app / Alexa)',   valor: 3200, tipo: 'un' },
      pelicula:   { nome: 'Película de controle solar',valor: 160,  tipo: 'm2' },
    },
    maoObraPct: 12,
    deslocamento: 250,
  };

  // condições de pagamento sugeridas no painel (a equipe também pode digitar uma personalizada)
  const CONDICOES = [
    'Pix à vista com 5% de desconto',
    '10x sem juros no cartão',
    '50% de entrada + 50% na instalação',
    'Entrada de 30% + saldo em 6x sem juros',
    'Faturado 30/60/90 dias (PJ)',
  ];

  // jornada do cliente: cada etapa pode avançar sozinha pelas respostas no chatbot
  const STATUS = [
    { id: 'novo',       nome: 'Novo pedido',             cor: '#60a5fa' },
    { id: 'analise',    nome: 'Em cotação',              cor: '#fbbf24' },
    { id: 'enviado',    nome: 'Orçamento enviado',       cor: '#f97316' },
    { id: 'aprovado',   nome: 'Aprovado · agendar visita', cor: '#34d399' },
    { id: 'medicao',    nome: 'Visita técnica agendada', cor: '#a78bfa' },
    { id: 'instalacao', nome: 'Instalação agendada',     cor: '#22d3ee' },
    { id: 'concluido',  nome: 'Concluído',               cor: '#10b981' },
    { id: 'perdido',    nome: 'Não aprovado',            cor: '#f87171' },
  ];

  // equipe de campo (aparece para o cliente nas confirmações)
  const EQUIPE = {
    tecnicos: [
      { id: 'marcos',  nome: 'Marcos Silva',  cargo: 'Técnico de medição', anos: 8, art: 'o' },
      { id: 'juliana', nome: 'Juliana Rocha', cargo: 'Técnica de medição', anos: 6, art: 'a' },
    ],
    instalacao: [
      { id: 'alfa', nome: 'Equipe Alfa', membros: 'Ricardo Alves e Thiago Nunes' },
      { id: 'beta', nome: 'Equipe Beta', membros: 'André Costa e Paulo Mendes' },
    ],
    atendentes: ['Camila Ribeiro', 'Bruno Teixeira'],
  };
  const tecnico = id => EQUIPE.tecnicos.find(t => t.id === id) || EQUIPE.tecnicos[0];
  const equipeInst = id => EQUIPE.instalacao.find(t => t.id === id) || EQUIPE.instalacao[0];

  const brl = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const now = () => new Date().toISOString();
  const daysAgo = (d, h = 10) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, 12, 0, 0); return x.toISOString(); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const diaMais = n => { const x = new Date(); x.setDate(x.getDate() + n); return iso(x); };
  function diasUteis(qtd, apartirDe = 1) {
    const r = [], x = new Date(); x.setDate(x.getDate() + apartirDe);
    while (r.length < qtd) { if (x.getDay() !== 0) r.push(iso(x)); x.setDate(x.getDate() + 1); }
    return r; // inclui sábados (visitas comuns no alto padrão), exclui domingos
  }
  const dataDe = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDia = s => dataDe(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
  const fmtDiaLongo = s => dataDe(s).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const primeiro = n => {
    const p = String(n || '').trim().split(/\s+/);
    if (/^(dr|dra|sr|sra)\.?$/i.test(p[0]) || /^(grupo|condom[ií]nio|construtora|incorporadora|residencial|edif[ií]cio)$/i.test(p[0])) return p.slice(0, 2).join(' ');
    return p[0] || '';
  };

  // mensagens enviadas ao cliente quando a equipe confirma cada etapa
  const MSG = {
    proposta: (it, c, cond) => `Olá, ${primeiro(it.cliente)}! Segue seu orçamento FireGuard 🔥\n\n*Protocolo:* ${it.protocolo}\n*Solução:* ${c.produto}\n*Área:* ${c.area.toFixed(2).replace('.', ',')} m² · ${c.vidro} · ${c.acabamento}` +
      (c.linhasExtras.length ? `\n*Opcionais:* ${c.linhasExtras.map(e => e.nome).join(', ')}` : '') +
      `\n\n*Investimento:* ${brl(c.total)}\n*Condição:* ${cond}\n\nInclui projeto, visita técnica, instalação e garantia de 5 anos. Proposta válida por 15 dias.`,
    visita: it => { const t = tecnico(it.visita.tecnico);
      return `📅 *Visita técnica confirmada!*\n\n*Quando:* ${fmtDiaLongo(it.visita.data)}, às ${it.visita.hora}\n*Técnico:* ${t.nome}, ${t.cargo.toLowerCase()} há ${t.anos} anos na FireGuard\n*Local:* ${it.cidade || 'endereço informado'}\n\n${t.art === 'a' ? 'A' : 'O'} ${primeiro(t.nome)} vai chegar ${t.art === 'a' ? 'uniformizada' : 'uniformizado'} e com crachá da FireGuard. A visita é gratuita e leva cerca de 40 minutos. 📐`; },
    instalacao: it => { const e = equipeInst(it.instalacao.equipe);
      return `🛠️ *Instalação agendada!*\n\n*Quando:* ${fmtDiaLongo(it.instalacao.data)}, às ${it.instalacao.hora}\n*Quem vai instalar:* ${e.nome} · ${e.membros}\n*Duração estimada:* 1 dia\n\nA equipe chega identificada, protege piso e móveis e deixa tudo limpinho no final. ✨`; },
    concluido: it => `🎉 *Instalação concluída!*\n\nObrigada por confiar na FireGuard, ${primeiro(it.cliente)}! Sua garantia de 5 anos já está valendo.`,
    status: (it, st) => ({
      analise: `📝 Seu pedido ${it.protocolo} já está com a nossa equipe de cotação.`,
      aprovado: `✅ Registramos a aprovação do pedido ${it.protocolo}. O próximo passo é agendar a visita técnica.`,
      perdido: `Seu pedido ${it.protocolo} foi encerrado. Se mudar de ideia, é só chamar por aqui. 💛`,
    })[st] ?? (st === 'enviado' ? null : `🔔 Atualização do pedido ${it.protocolo}: agora está em *${(STATUS.find(s => s.id === st) || {}).nome}*.`),
  };

  function precos() {
    try { return JSON.parse(localStorage.getItem(PRICE_KEY)) || precosPadrao; } catch { return precosPadrao; }
  }
  function salvarPrecos(p) { try { localStorage.setItem(PRICE_KEY, JSON.stringify(p)); } catch {} }

  /* ---------- cálculo ---------- */
  function calcular(o, ajustes = {}) {
    const p = precos();
    const prod = p.produtos[o.produto] || p.produtos.envidracamento;
    const vidro = p.vidros[o.vidro] || p.vidros.temp8;
    const acab = p.acabamentos[o.acabamento] || p.acabamentos.natural;
    const qtd = Math.max(1, +o.vaos || 1);
    const area = (+o.largura || 0) * (+o.altura || 0) * qtd;
    const precoM2 = ajustes.precoM2 ?? prod.precoM2;
    const base = area * precoM2 * vidro.fator * acab.fator;
    let extras = 0;
    const linhasExtras = [];
    (o.extras || []).forEach(k => {
      const e = p.extras[k]; if (!e) return;
      const v = e.tipo === 'm2' ? e.valor * area : e.valor;
      extras += v; linhasExtras.push({ nome: e.nome, valor: v });
    });
    const maoObraPct = ajustes.maoObraPct ?? p.maoObraPct;
    const maoObra = (base + extras) * maoObraPct / 100;
    const deslocamento = ajustes.deslocamento ?? p.deslocamento;
    const subtotal = base + extras + maoObra + deslocamento;
    const descontoPct = ajustes.descontoPct ?? 0;
    const desconto = subtotal * descontoPct / 100;
    const total = subtotal - desconto;
    return {
      area, precoM2, base, extras, linhasExtras, maoObraPct, maoObra, deslocamento,
      subtotal, descontoPct, desconto, total,
      faixa: [total * 0.9, total * 1.1],
      produto: prod.nome, vidro: vidro.nome, acabamento: acab.nome,
    };
  }

  /* ---------- armazenamento ---------- */
  function seed() {
    const mk = (id, d, cliente, tel, cidade, tipoImovel, o, status, ajustes, msgs, hist, extra = {}) => ({
      id, protocolo: 'FG-' + id, criadoEm: daysAgo(d), cliente, telefone: tel, email: '', cidade, tipoImovel,
      ...o, informado: informadoDe(o), status, ajustes,
      proposta: ['enviado', 'aprovado', 'medicao', 'instalacao', 'concluido'].includes(status) ? calcular(o, ajustes).total : null,
      condicao: ['enviado', 'aprovado', 'medicao', 'instalacao', 'concluido'].includes(status) ? (extra.condicao || CONDICOES[1]) : null,
      mensagens: msgs, historico: hist, ...extra,
    });
    const H = (d, s, t) => ({ data: daysAgo(d, 9 + (t || 0)), status: s });
    const [u1, u2, u3] = diasUteis(3);
    const L = [
      mk('2611', 0, 'Mariana Albuquerque', '(11) 98432-1177', 'São Paulo · Itaim Bibi', 'Apartamento alto padrão',
        { produto: 'envidracamento', vidro: 'temp10', acabamento: 'preto', largura: 4.2, altura: 2.4, vaos: 1, extras: ['persiana'], obs: 'Sacada gourmet, quero integrar à sala.' },
        'novo', {}, [
          { de: 'cliente', txt: 'Olá! Acabei de enviar um pedido de orçamento pelo site. Protocolo FG-2611.', em: daysAgo(0, 10) },
          { de: 'bot', txt: 'Oi, Mariana! 😊 Recebi seu pedido FG-2611 e já passei para a nossa equipe. Em até 2h úteis te mando o orçamento por aqui.', em: daysAgo(0, 10) },
        ], [H(0, 'novo')]),
      mk('2608', 1, 'Ricardo Menezes', '(11) 99120-4410', 'São Paulo · Moema', 'Cobertura',
        { produto: 'anteparo', vidro: 'cf', acabamento: 'natural', largura: 3.1, altura: 1.2, vaos: 2, extras: [], obs: 'Exigência do condomínio para a churrasqueira.' },
        'analise', {}, [
          { de: 'cliente', txt: 'Boa tarde, o condomínio exige anteparo corta-fogo na churrasqueira. Vocês emitem laudo?', em: daysAgo(1, 14) },
          { de: 'bot', txt: 'Oi, Ricardo! Sim 🙌 todos os anteparos FireGuard acompanham laudo técnico e ART, prontos para apresentar ao condomínio.', em: daysAgo(1, 14) },
          { de: 'cliente', txt: 'Ótimo. Prefiro falar com alguém para tirar umas dúvidas do condomínio.', em: daysAgo(0, 9) },
          { de: 'bot', txt: 'Claro, Ricardo! Já chamei alguém da nossa equipe 🙋‍♀️ Em instantes uma pessoa continua a conversa com você por aqui.', em: daysAgo(0, 9) },
        ], [H(1, 'novo'), H(1, 'analise', 2)],
        { humano: { status: 'aguardando', motivo: 'Dúvidas sobre exigências do condomínio', solicitadoEm: daysAgo(0, 9) } }),
      mk('2603', 3, 'Fernanda e Paulo Lima', '(11) 97788-3021', 'Santo André · Jardim', 'Apartamento',
        { produto: 'envidracamento', vidro: 'temp8', acabamento: 'branco', largura: 5.6, altura: 2.3, vaos: 1, extras: ['fechadura'], obs: '' },
        'aprovado', {}, [
          { de: 'atendente', txt: 'Fernanda, segue seu orçamento com fechadura inclusa. 🙂', em: daysAgo(2, 10) },
          { de: 'cliente', txt: '✅ Aprovar proposta', em: daysAgo(1, 18) },
          { de: 'bot', txt: 'Que alegria, Fernanda! 🥳 Aprovação registrada. Quais dias ficam melhores para a visita técnica?', em: daysAgo(1, 18) },
          { de: 'cliente', txt: `${fmtDia(u2)}, ${fmtDia(u3)} · Manhã`, em: daysAgo(1, 18) },
          { de: 'bot', txt: 'Anotado! 📅 Já passei para a nossa agenda e te confirmo o dia, o horário e quem vai te visitar.', em: daysAgo(1, 18) },
        ], [H(3, 'novo'), H(3, 'analise', 3), H(2, 'enviado'), H(1, 'aprovado', 9)],
        { visitaPref: { datas: [u2, u3], periodo: 'Manhã (8h–12h)', em: daysAgo(1, 18) }, condicao: CONDICOES[2] }),
      mk('2598', 5, 'Grupo Vértice Incorporadora', '(11) 3456-7700', 'São Paulo · Vila Nova Conceição', 'Empreendimento (24 unidades)',
        { produto: 'anteparo', vidro: 'cf', acabamento: 'preto', largura: 2.8, altura: 1.2, vaos: 24, extras: [], obs: 'Torre única, entrega em março.' },
        'enviado', { descontoPct: 8 }, [
          { de: 'atendente', txt: 'Segue a proposta para as 24 unidades, já com 8% de condição especial para volume.', em: daysAgo(3, 16) },
          { de: 'cliente', txt: 'Recebido. Vamos apresentar na reunião de diretoria de quinta.', em: daysAgo(3, 17) },
        ], [H(5, 'novo'), H(5, 'analise', 2), H(3, 'enviado')], { condicao: 'Faturado 30/60/90 dias (PJ)' }),
      mk('2590', 8, 'Dr. Henrique Castro', '(19) 99654-2280', 'Campinas · Cambuí', 'Casa em condomínio',
        { produto: 'cortina', vidro: 'lam', acabamento: 'bronze', largura: 6.5, altura: 2.6, vaos: 1, extras: ['automacao', 'pelicula'], obs: 'Área de lazer com piscina.' },
        'medicao', { descontoPct: 5 }, [
          { de: 'cliente', txt: '✅ Aprovar proposta', em: daysAgo(6, 10) },
          { de: 'bot', txt: 'Que notícia boa, Dr. Henrique! 🥳 Aprovação registrada.', em: daysAgo(6, 10) },
          { de: 'bot', txt: `📅 Visita técnica confirmada! ${fmtDia(u1)} às 10:00 com Marcos Silva.`, em: daysAgo(5, 11) },
          { de: 'cliente', txt: '👍 Confirmado', em: daysAgo(5, 12) },
        ], [H(8, 'novo'), H(8, 'analise', 3), H(7, 'enviado', 4), H(6, 'aprovado'), H(5, 'medicao')],
        { visita: { data: u1, hora: '10:00', tecnico: 'marcos', confirmada: true }, condicao: CONDICOES[0] }),
      mk('2584', 12, 'Juliana Prado', '(11) 98001-6655', 'São Paulo · Pinheiros', 'Apartamento',
        { produto: 'envidracamento', vidro: 'fume', acabamento: 'natural', largura: 3.4, altura: 2.4, vaos: 1, extras: [], obs: '' },
        'instalacao', {}, [
          { de: 'bot', txt: `🛠️ Instalação agendada! ${fmtDia(u2)} às 08:00 com a Equipe Alfa (Ricardo Alves e Thiago Nunes).`, em: daysAgo(1, 18) },
          { de: 'cliente', txt: 'Perfeito, a portaria já está avisada!', em: daysAgo(1, 19) },
        ], [H(12, 'novo'), H(11, 'analise'), H(9, 'enviado'), H(8, 'aprovado'), H(7, 'medicao'), H(1, 'instalacao')],
        { visita: { data: diaMais(-6), hora: '09:00', tecnico: 'juliana', confirmada: true }, instalacao: { data: u2, hora: '08:00', equipe: 'alfa', confirmada: true } }),
      mk('2571', 20, 'Condomínio Parque das Artes', '(11) 3322-9090', 'São Paulo · Brooklin', 'Condomínio',
        { produto: 'guardacorpo', vidro: 'lam', acabamento: 'natural', largura: 12, altura: 1.1, vaos: 1, extras: [], obs: '' },
        'concluido', {}, [
          { de: 'bot', txt: 'Como você avalia nosso atendimento?', em: daysAgo(10, 15) },
          { de: 'cliente', txt: '⭐⭐⭐⭐⭐', em: daysAgo(10, 15) },
          { de: 'cliente', txt: 'Ficou impecável, obrigado pela agilidade!', em: daysAgo(10, 15) },
        ], [H(20, 'novo'), H(19, 'analise'), H(18, 'enviado'), H(16, 'aprovado'), H(15, 'medicao'), H(12, 'instalacao'), H(10, 'concluido')],
        { avaliacao: 5, visita: { data: diaMais(-15), hora: '14:00', tecnico: 'marcos', confirmada: true }, instalacao: { data: diaMais(-10), hora: '08:00', equipe: 'beta', confirmada: true } }),
      mk('2566', 22, 'André Souza', '(11) 94455-1020', 'Guarulhos', 'Apartamento',
        { produto: 'envidracamento', vidro: 'temp8', acabamento: 'branco', largura: 3, altura: 2.2, vaos: 1, extras: [], obs: '' },
        'perdido', {}, [
          { de: 'cliente', txt: '❌ Não vou seguir', em: daysAgo(15, 10) },
          { de: 'cliente', txt: '📅 Vou adiar o projeto', em: daysAgo(15, 10) },
        ], [H(22, 'novo'), H(21, 'enviado'), H(15, 'perdido')], { motivoPerda: 'Vai adiar o projeto' }),
    ];
    // mídias de demonstração (fotos enviadas por clientes)
    const foto = (src, nome, d, h, origem, analise) => ({ id: '', src, tipo: 'imagem', nome, tamanho: 220000, em: daysAgo(d, h), origem, analise });
    const A = (amb, luz, w, hh, extra = []) => ({ ambiente: amb, luz, orientacao: w >= hh ? 'Horizontal' : 'Vertical', resolucao: `${w}×${hh}`, qualidade: 'Adequada', tags: extra });
    const m1 = foto('assets/img/proj-sacada-mar.jpg', 'sacada-sala.jpg', 0, 10, MODO === 'chatbot' ? 'WhatsApp' : 'Site', A('Área externa · sacada/varanda', 'Boa', 1400, 933, ['vão aberto', 'guarda-corpo existente', 'vista panorâmica']));
    const m2 = foto('assets/img/proj-churrasqueira.jpg', 'churrasqueira.jpg', 1, 14, ORIGEM_BOT, A('Área gourmet · churrasqueira', 'Média', 1400, 2100, ['churrasqueira', 'ponto de calor', 'exige anteparo']));
    const m3 = foto('assets/img/proj-rooftop.jpg', 'cobertura-vista.jpg', 1, 14, ORIGEM_BOT, A('Área externa · cobertura', 'Boa', 1400, 1050, ['cobertura', 'vão amplo']));
    L[0].midias = [m1]; L[0].mensagens.splice(1, 0, { de: 'cliente', txt: '📷 Foto', midia: m1, em: daysAgo(0, 10) });
    L[1].midias = [m2, m3];
    L[1].mensagens.splice(1, 0, { de: 'cliente', txt: '📷 Foto', midia: m2, em: daysAgo(1, 14) }, { de: 'cliente', txt: '📷 Foto', midia: m3, em: daysAgo(1, 14) },
      { de: 'bot', txt: '📷 Recebi 2 fotos e já anexei ao seu atendimento FG-2608.\nIdentifiquei: área gourmet com churrasqueira — ponto de calor que exige anteparo corta-fogo. ✅', em: daysAgo(1, 14) });
    if (MODO === 'chatbot') L.forEach(x => { x.origem = 'WhatsApp'; });
    return L;
  }

  function todos() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const s = seed(); salvarTodos(s); return s;
  }
  function salvarTodos(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} }
  function buscar(protocolo) { return todos().find(x => x.protocolo.toUpperCase() === String(protocolo).trim().toUpperCase()); }
  function atualizar(item) { const l = todos().map(x => x.id === item.id ? item : x); salvarTodos(l); }
  function novo(dados) {
    const l = todos();
    const id = String(Math.max(...l.map(x => +x.id), 2611) + 1);
    const item = { id, protocolo: 'FG-' + id, criadoEm: now(), status: 'novo', ajustes: {}, proposta: null,
      mensagens: [], historico: [{ data: now(), status: 'novo' }], ...dados };
    if (!item.informado) item.informado = informadoDe(item);
    const semAviso = item.semAviso; delete item.semAviso;
    if (!semAviso) item.mensagens.push({ de: 'bot', em: now(),
      txt: `Oi, ${item.cliente.split(' ')[0]}! 😊 Recebi seu pedido ${item.protocolo} e já passei para a nossa equipe. Em até 2h úteis te mando o orçamento por aqui.` });
    l.unshift(item); salvarTodos(l); return item;
  }
  function mudarStatus(it, st, avisar = true, msg) {
    if (!it || it.status === st) return it;
    it.status = st; it.historico = it.historico || []; it.historico.push({ data: now(), status: st });
    // o orçamento em si só é enviado pelo botão da calculadora; aqui vai no máximo um aviso de status
    const txt = msg || MSG.status(it, st);
    if (avisar && txt) it.mensagens.push({ de: 'bot', em: now(), txt });
    return it;
  }
  function resetar() { try { localStorage.removeItem(KEY); localStorage.removeItem(PRICE_KEY); } catch {} media.clear().catch(() => {}); }

  const waLink = (texto, numero = WHATSAPP) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  const statusInfo = id => STATUS.find(s => s.id === id) || STATUS[0];

  /* =========================================================
     MÍDIAS — fotos, vídeos e áudios enviados pelo cliente
     Protótipo: arquivos ficam no IndexedDB do navegador.
     Produção: storage (S3 / Supabase Storage) + webhook do WhatsApp.
     ========================================================= */
  const media = (() => {
    let dbp;
    const db = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('fg_midias_' + MODO, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('m');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    const tx = async (mode, fn) => {
      const d = await db();
      return new Promise((res, rej) => {
        const t = d.transaction('m', mode), req = fn(t.objectStore('m'));
        t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
      });
    };
    const cache = {};
    return {
      put: async blob => { const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); await tx('readwrite', s => s.put(blob, id)); return id; },
      get: id => tx('readonly', s => s.get(id)),
      url: async m => {
        if (m.src) return m.src;
        if (cache[m.id]) return cache[m.id];
        const b = await tx('readonly', s => s.get(m.id));
        if (!b) throw new Error('arquivo indisponível');
        return (cache[m.id] = URL.createObjectURL(b));
      },
      clear: () => tx('readwrite', s => s.clear()),
    };
  })();

  const tipoDe = f => (f.type || '').startsWith('image') ? 'imagem' : (f.type || '').startsWith('video') ? 'video' : (f.type || '').startsWith('audio') ? 'audio' : null;
  const fmtTam = b => b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const fmtDur = s => isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '';

  /* Pré-análise automática da imagem (heurística local no protótipo;
     em produção: modelo de visão computacional via API) */
  function analisarPixels(src, w, h) {
    const c = document.createElement('canvas'); c.width = 48; c.height = 48;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data;
    let lum = 0, ceu = 0, quente = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], row = Math.floor(i / 4 / 48);
      lum += .299 * r + .587 * g + .114 * b; n++;
      if (row < 16 && b > r + 10 && b > 110) ceu++;
      if (r > b + 40 && r > 140) quente++;
    }
    lum /= n;
    const temCeu = ceu / (16 * 48) > .18;
    const tags = [];
    if (temCeu) tags.push('céu / vista externa');
    if (quente / n > .2) tags.push('tons quentes / madeira');
    if (w * h < 640 * 480) tags.push('baixa resolução');
    return {
      ambiente: temCeu ? 'Área externa · sacada/varanda' : 'Ambiente interno ou área coberta',
      luz: lum < 70 ? 'Baixa' : lum > 210 ? 'Estourada' : lum < 105 ? 'Média' : 'Boa',
      orientacao: w >= h ? 'Horizontal' : 'Vertical',
      resolucao: `${w}×${h}`,
      qualidade: (w * h < 640 * 480 || lum < 60) ? 'Pedir nova foto' : 'Adequada',
      tags,
    };
  }

  function analisar(blob, tipo, duracao) {
    return new Promise(resolve => {
      const u = URL.createObjectURL(blob);
      const fim = r => { URL.revokeObjectURL(u); resolve(r); };
      setTimeout(() => fim({}), 8000);
      if (tipo === 'imagem') {
        const im = new Image();
        im.onload = () => { try { fim(analisarPixels(im, im.naturalWidth, im.naturalHeight)); } catch { fim({}); } };
        im.onerror = () => fim({}); im.src = u;
      } else if (tipo === 'video') {
        const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.playsInline = true;
        v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
        v.onseeked = () => {
          try {
            const a = analisarPixels(v, v.videoWidth, v.videoHeight);
            const c = document.createElement('canvas'); c.width = 240; c.height = Math.round(240 * v.videoHeight / v.videoWidth) || 135;
            c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
            fim({ ...a, duracao: fmtDur(v.duration), thumb: c.toDataURL('image/jpeg', .6) });
          } catch { fim({ duracao: fmtDur(v.duration) }); }
        };
        v.onerror = () => fim({}); v.src = u;
      } else {
        if (duracao) return fim({ duracao: fmtDur(duracao), transcricao: null });
        const a = new Audio(); a.onloadedmetadata = () => fim({ duracao: fmtDur(a.duration), transcricao: null });
        a.onerror = () => fim({}); a.src = u;
      }
    });
  }

  /* anexa um arquivo a um orçamento e registra na conversa */
  async function anexar(itemId, blob, { origem = 'Site', nome, duracao } = {}) {
    const tipo = tipoDe(blob); if (!tipo) throw new Error('Formato não suportado');
    const id = await media.put(blob);
    const analise = await analisar(blob, tipo, duracao);
    const m = { id, tipo, nome: nome || blob.name || (tipo === 'audio' ? 'audio.webm' : 'arquivo'), tamanho: blob.size, em: now(), origem, analise };
    const it = todos().find(x => x.id === itemId); if (!it) return m;
    it.midias = it.midias || []; it.midias.push(m);
    it.mensagens.push({ de: 'cliente', txt: { imagem: '📷 Foto', video: '🎥 Vídeo', audio: '🎤 Áudio' }[tipo], midia: m, em: now() });
    atualizar(it);
    return m;
  }

  /* resposta do chatbot para cada mídia recebida */
  function respostaBot(m, protocolo) {
    const a = m.analise || {};
    if (m.tipo === 'audio') return `🎧 Recebi seu áudio${a.duracao ? ` (${a.duracao})` : ''} e já encaminhei ao especialista do atendimento <b>${protocolo}</b>.`;
    const linhas = [`${m.tipo === 'video' ? '🎥 Vídeo' : '📷 Foto'} recebid${m.tipo === 'video' ? 'o' : 'a'} e analisad${m.tipo === 'video' ? 'o' : 'a'}!`];
    if (a.ambiente) linhas.push(`• Ambiente: ${a.ambiente}`);
    if (a.luz) linhas.push(`• Iluminação: ${a.luz.toLowerCase()}`);
    if (a.duracao) linhas.push(`• Duração: ${a.duracao}`);
    if (a.resolucao) linhas.push(`• Resolução: ${a.resolucao}`);
    linhas.push(a.qualidade === 'Pedir nova foto'
      ? '⚠️ A imagem ficou escura ou pequena. Se puder, envie outra com mais luz mostrando o vão inteiro.'
      : `✅ Anexei ao seu atendimento <b>${protocolo}</b>. Dica: uma foto do vão inteiro com uma trena aberta ajuda muito no orçamento!`);
    return linhas.join('\n');
  }

  /* gravação de áudio pelo microfone */
  async function gravarAudio() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Gravação não suportada neste navegador');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream), chunks = [], t0 = Date.now();
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.start();
    return {
      inicio: t0,
      parar: () => new Promise(r => {
        rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); r({ blob: new Blob(chunks, { type: rec.mimeType || 'audio/webm' }), duracao: (Date.now() - t0) / 1000 }); };
        rec.stop();
      }),
      cancelar: () => { rec.onstop = null; try { rec.stop(); } catch {} stream.getTracks().forEach(t => t.stop()); },
    };
  }

  /* HTML de uma mídia + hidratação assíncrona do src */
  function midiaHTML(m) {
    const at = `data-mid="${m.id || ''}" data-src="${m.src || ''}"`;
    if (m.tipo === 'imagem') return `<img class="fg-md" ${at} alt="${m.nome || 'foto'}">`;
    if (m.tipo === 'video') return `<video class="fg-md" ${at} controls preload="metadata" playsinline ${m.analise?.thumb ? `poster="${m.analise.thumb}"` : ''}></video>`;
    return `<audio class="fg-md" ${at} controls preload="metadata"></audio>`;
  }
  function hidratar(root) {
    root.querySelectorAll('.fg-md[data-src]:not([data-ok])').forEach(el => {
      el.dataset.ok = 1;
      if (!el.dataset.mid && !el.dataset.src) return;
      media.url({ id: el.dataset.mid, src: el.dataset.src })
        .then(u => { el.src = u; })
        .catch(() => { el.outerHTML = '<span style="font-size:.8em;opacity:.7">📎 arquivo disponível apenas no dispositivo de origem</span>'; });
    });
  }

  /* TEMA claro / escuro */
  const THEME_KEY = 'fg_tema';
  function tema(t) {
    if (t) { try { localStorage.setItem(THEME_KEY, t); } catch {} }
    let atual = t;
    if (!atual) { try { atual = localStorage.getItem(THEME_KEY); } catch {} }
    if (!atual) atual = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = atual;
    return atual;
  }
  tema();

  return { CONDICOES, MODO, KEY, ORIGEM_BOT, informadoDe, WHATSAPP, STATUS, EQUIPE, tecnico, equipeInst, MSG, mudarStatus,
    diasUteis, fmtDia, fmtDiaLongo, iso, diaMais, primeiro, precos, precosPadrao, salvarPrecos, calcular, todos, salvarTodos, buscar, atualizar, novo, resetar, brl, waLink, statusInfo,
    media, tipoDe, fmtTam, fmtDur, analisar, anexar, respostaBot, gravarAudio, midiaHTML, hidratar, tema };
})();
