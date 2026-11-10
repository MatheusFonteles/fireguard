/* =========================================================
   FireGuard — Lara, assistente virtual (fluxo do WhatsApp)
   • Conversa contextual: sabe em que etapa o cliente está
   • Nunca informa valores antes da equipe enviar o orçamento
   • Cliente aprova/recusa a proposta, escolhe datas da visita,
     confirma visita e instalação e avalia o serviço — tudo
     atualiza o painel automaticamente
   • Pedido de atendente humano a qualquer momento

   Uso: FGBot.init({ modo: 'site' | 'whatsapp', cliente: {nome, telefone} })
   Elementos: #chat #msgs #chatForm #chatIn #clipBtn #chatFile
              #sendBtn #recT #recCancel #botStatus
   ========================================================= */
const FGBot = (() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const hora = d => new Date(d || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const P = () => FG.precos();
  const LS = 'fg_bot_lead_' + FG.MODO;
  const agora = () => new Date().toISOString();
  const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const num = t => String(t).replace('.', ',');
  let cfg = { modo: 'site', cliente: {} };
  const chat = { estado: 'livre', dados: {}, leadId: null, buffer: [], vistos: 0, iniciado: false, avisouHumano: false, datas: [] };

  /* ---------- quem é o cliente ---------- */
  const nome = () => FG.primeiro(chat.dados.cliente || lead()?.cliente || cfg.cliente.nome || '').replace(/^Cliente$/, '');
  const ola = () => (nome() ? `, ${nome()}` : '');
  const aqui = () => (cfg.modo === 'whatsapp' ? 'aqui mesmo' : 'no seu WhatsApp');

  /* ---------- UI ---------- */
  const fmt = t => String(t).replace(/\*(.+?)\*/g, '<b>$1</b>');
  const rolar = () => { const m = $('#msgs'); m.scrollTop = m.scrollHeight; };
  function addMsg(html, lado, em) {
    const el = document.createElement('div');
    el.className = 'm ' + lado; el.innerHTML = html + `<time>${hora(em)}${lado === 'out' ? ' ✓✓' : ''}</time>`;
    $('#msgs').appendChild(el); FG.hidratar(el); rolar(); return el;
  }
  const status = t => { $('#botStatus').textContent = t || (cfg.modo === 'whatsapp' ? 'online' : 'online · responde na hora'); };
  function botoes(lista) {
    $$('.quick').forEach(q => q.remove());
    if (!lista || !lista.length) return;
    const q = document.createElement('div'); q.className = 'quick';
    lista.forEach(([label, fn]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.onclick = () => { q.remove(); addMsg(label, 'out'); log('cliente', label); fn(); };
      q.appendChild(b);
    });
    $('#msgs').appendChild(q); rolar();
  }
  function bot(txt, lista, delay) {
    $$('.quick').forEach(q => q.remove());
    status('digitando...');
    const t = addMsg('digitando…', 'in typing');
    const d = delay ?? Math.min(1500, 450 + String(txt).length * 6); // "digita" no ritmo do texto
    return new Promise(r => setTimeout(() => {
      t.remove(); addMsg(fmt(txt), 'in'); status(); log('bot', txt); botoes(lista); r();
    }, d));
  }

  /* ---------- lead (atendimento no painel) ---------- */
  const limpo = t => String(t).replace(/<b>(.*?)<\/b>/g, '*$1*').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '');
  function lead() { return chat.leadId && FG.todos().find(x => x.id === chat.leadId); }
  function log(de, txt) {
    const m = { de, txt: limpo(txt), em: agora() };
    const it = lead();
    if (!it) { chat.buffer.push(m); return; }
    it.mensagens.push(m); FG.atualizar(it); chat.vistos = it.mensagens.length;
  }
  function mexer(fn) { const it = lead(); if (!it) return; fn(it); FG.atualizar(it); chat.vistos = it.mensagens.length; return it; }
  function garantirLead() {
    const atual = lead();
    if (atual) return { it: atual, novo: false };
    const d = { produto: 'envidracamento', vidro: 'temp8', acabamento: 'natural', largura: 0, altura: 0, vaos: 1, extras: [], ...chat.dados };
    const it = FG.novo({
      ...d, informado: FG.informadoDe(chat.dados),
      cliente: chat.dados.cliente || cfg.cliente.nome || 'Cliente WhatsApp',
      telefone: chat.dados.telefone || cfg.cliente.telefone || 'via chatbot',
      cidade: chat.dados.cidade || '', tipoImovel: 'Não informado', obs: '', origem: FG.ORIGEM_BOT,
      mensagens: chat.buffer.splice(0), semAviso: true,
    });
    chat.leadId = it.id; chat.vistos = it.mensagens.length;
    try { sessionStorage.setItem(LS, it.id); } catch {}
    return { it, novo: true };
  }
  function salvarDadosNoLead() {
    mexer(it => {
      const d = chat.dados;
      ['produto', 'largura', 'altura', 'vaos', 'cidade', 'telefone'].forEach(k => { if (d[k] !== undefined && d[k] !== '') it[k] = d[k]; });
      if (d.cliente) it.cliente = d.cliente;
      it.informado = { ...(it.informado || {}), ...FG.informadoDe(d) };
    });
  }

  /* ---------- respostas prontas ---------- */
  const FAQ = {
    prazo: 'Depois da visita técnica, a produção leva de *10 a 20 dias úteis*, e a instalação normalmente acontece em *um único dia*, com obra limpa. ⏱️',
    garantia: 'Todos os nossos sistemas têm *5 anos de garantia*, cobrindo vidros, perfis e instalação. E fazemos manutenção preventiva sempre que precisar. 🛡️',
    laudo: 'Todos os anteparos corta-fogo saem com *laudo técnico e ART*, prontos para apresentar ao condomínio e ao Corpo de Bombeiros. 🔥🛡️',
    visita: 'A visita técnica é *gratuita*: um técnico da FireGuard vai até você, faz a medição milimétrica e alinha os detalhes finais. Ela acontece logo depois que você aprova o orçamento. 📐',
  };
  const REACAO = {
    envidracamento: 'Ótima escolha! O envidraçamento protege a sacada do vento, da chuva e do barulho sem esconder a vista. 🌇',
    anteparo: 'Perfeito! O anteparo corta-fogo traz segurança para a churrasqueira e normalmente é exigido pelo condomínio. E já sai com laudo e ART. 🔥🛡️',
    cortina: 'Que demais! As cortinas de vidro automatizadas abrem e fecham pelo celular ou por comando de voz. 📱✨',
    guardacorpo: 'Boa! O guarda-corpo em vidro deixa o ambiente leve e seguro, sem colunas atrapalhando a vista. 🏙️',
  };

  /* ---------- abertura ---------- */
  const opcoesIniciais = () => [
    ['📝 Quero um orçamento', fluxoOrc],
    ['📦 Já tenho um pedido', fluxoTrack],
    ['💡 Conhecer as soluções', fluxoSol],
    ['👤 Falar com atendente', () => fluxoHumano('Pediu atendente logo no início da conversa')],
  ];
  async function inicio() {
    await bot(`Oi${ola()}! 😊 Eu sou a *Lara*, assistente virtual da FireGuard.`, null, 700);
    await bot('Por aqui eu te ajudo com orçamentos de envidraçamento de sacadas, anteparos corta-fogo e soluções em vidro, e acompanho seu pedido do começo até a instalação. ✨\n\n💬 Se em algum momento preferir falar com uma pessoa da nossa equipe, é só escrever *atendente* que eu chamo na hora.');
    await bot('Me conta, como posso te ajudar hoje?', opcoesIniciais(), 600);
  }

  /* ---------- pedido de orçamento (sem valores) ---------- */
  const perguntar = (estado, txt, lista) => { chat.estado = estado; return bot(txt, lista); };
  async function fluxoOrc() {
    const it = lead();
    if (it && ['novo', 'analise'].includes(it.status) && it.informado?.produto) {
      return bot(`Seu pedido *${it.protocolo}* já está com a nossa equipe de cotação. 😊 Quer pedir orçamento para *outro espaço* também?`,
        [['Sim, outro espaço', () => { chat.leadId = null; try { sessionStorage.removeItem(LS); } catch {} iniciarPedido(true); }], ['Não, só isso mesmo', () => bot('Combinado! Assim que o orçamento ficar pronto eu te aviso. 😉')]]);
    }
    iniciarPedido();
  }
  function iniciarPedido(outro) {
    const manter = { cliente: chat.dados.cliente || lead()?.cliente, telefone: chat.dados.telefone, cidade: outro ? undefined : chat.dados.cidade };
    chat.dados = Object.fromEntries(Object.entries(manter).filter(([, v]) => v));
    bot(outro ? 'Perfeito! Para qual outro espaço?' : 'Oba, vamos lá! 🙌 Para qual espaço é o projeto?',
      Object.entries(P().produtos).map(([k, v]) => [v.nome, async () => {
        chat.dados.produto = k;
        await bot(REACAO[k] || 'Ótima escolha!');
        perguntar('medidas', 'Você sabe as medidas aproximadas do vão? Pode me mandar assim: *largura x altura*, por exemplo *4,2 x 2,4*.\nSe não souber, tudo bem! 😉', [['Não sei as medidas', semMedidas]]);
      }]));
  }
  async function semMedidas() {
    Object.assign(chat.dados, { largura: 0, altura: 0, vaos: 1 });
    await bot('Sem problemas! Na visita técnica nosso técnico faz a medição milimétrica. 📐');
    proximo();
  }
  async function proximo() {
    if (!chat.dados.cliente && !cfg.cliente.nome) return perguntar('nome', 'E como posso te chamar? 😊');
    if (!chat.dados.cliente) chat.dados.cliente = cfg.cliente.nome;
    if (cfg.modo === 'site' && !chat.dados.telefone) return perguntar('telefone', `Qual o seu WhatsApp com DDD, ${nome()}? É por lá que te envio o orçamento. 📲`);
    if (!chat.dados.cidade) return perguntar('cidade', 'Em qual *bairro e cidade* fica o imóvel? Assim já vejo a equipe mais próxima de você. 📍');
    finalizarOrc();
  }
  async function finalizarOrc() {
    chat.estado = 'livre';
    const { it } = garantirLead(); salvarDadosNoLead();
    const prod = P().produtos[chat.dados.produto]?.nome || 'Solução em vidro';
    const med = chat.dados.largura ? `${num(chat.dados.largura)} × ${num(chat.dados.altura)} m · ${chat.dados.vaos || 1} vão(s)` : 'a medir na visita técnica';
    await bot(`Prontinho${ola()}! ✅ Seu pedido foi registrado:\n\n*Protocolo:* ${it.protocolo}\n*Solução:* ${prod}\n*Medidas:* ${med}\n*Local:* ${chat.dados.cidade || '—'}\n\nNossa equipe já vai preparar seu orçamento com todo o cuidado, e eu te envio ${aqui()} em até 2h úteis. ⏱️`);
    await bot('Enquanto isso, uma foto ou um vídeo curtinho do espaço ajuda muito a caprichar no orçamento. 📸 Consegue me mandar?',
      [['📎 Enviar agora', () => $('#chatFile').click()], ['Mando depois', () => bot('Combinado! 😉 Fico por aqui. Assim que o orçamento ficar pronto eu te aviso.')]]);
  }

  /* ---------- acompanhamento ---------- */
  function fluxoTrack() {
    const it = lead();
    if (it && it.informado?.produto) return resumoPedido(it);
    perguntar('protocolo', 'Claro! Me passa o número do protocolo? Ele começa com *FG*, por exemplo *FG-2608*. 🔎');
  }
  async function resumoPedido(it = lead()) {
    if (!it) return fluxoTrack();
    const p = `*${it.protocolo}*`;
    switch (it.status) {
      case 'novo': case 'analise':
        return bot(`Seu pedido ${p} está *em cotação* 📝 Nossa equipe está preparando tudo e te envio o orçamento ${aqui()} assim que ficar pronto.`);
      case 'enviado':
        return bot(`Seu orçamento ${p} já foi enviado: *${FG.brl(it.proposta)}*${it.condicao ? ` (${it.condicao})` : ''}. Conseguiu dar uma olhada? 😊`, decisao());
      case 'aprovado':
        if (it.visitaPref) return bot(`Proposta aprovada ✅ e já estamos encaixando sua visita técnica na agenda (sua preferência: ${prefTxt(it.visitaPref)}). Te confirmo em breve o dia e quem vai te visitar! 📅`);
        await bot(`Sua proposta ${p} está aprovada ✅ Falta só combinarmos a visita técnica.`);
        return pedirDatas(true);
      case 'medicao': {
        const t = FG.tecnico(it.visita?.tecnico);
        return bot(`Sua visita técnica está marcada para *${FG.fmtDiaLongo(it.visita.data)}, às ${it.visita.hora}*, com *${t.nome}* 📐`);
      }
      case 'instalacao': {
        const e = FG.equipeInst(it.instalacao?.equipe);
        return bot(`Sua instalação está marcada para *${FG.fmtDiaLongo(it.instalacao.data)}, às ${it.instalacao.hora}*, com a *${e.nome}* (${e.membros}). 🛠️`);
      }
      case 'concluido':
        return bot(`Seu projeto ${p} foi concluído 🎉 A garantia de 5 anos já está valendo. Precisando de qualquer coisa, estou aqui!`);
      case 'perdido':
        return bot(`O pedido ${p} foi encerrado. Quer retomar a conversa com a nossa equipe? 😊`, [['Quero retomar', () => fluxoHumano('Quer retomar um pedido encerrado')], ['Agora não', () => bot('Tudo bem! Estou por aqui quando precisar. 💛')]]);
    }
  }

  function fluxoSol() {
    bot('Temos três linhas principais:\n\n🪟 *Envidraçamento de sacadas*: painéis retráteis que abrem 100% do vão.\n🛡️ *Anteparos corta-fogo*: segurança certificada para churrasqueiras e áreas gourmet.\n📱 *Soluções inteligentes*: cortinas de vidro automatizadas, persianas integradas e controle solar.\n\nQuer que eu já registre um pedido de orçamento?',
      [['Quero um orçamento', fluxoOrc], ['Só estava conhecendo', () => bot('Fique à vontade! 😊 Quando quiser, é só me chamar.')]]);
  }
  function fluxoMidia() {
    bot('Pode mandar! 📎 Toque no *clipe* para enviar fotos ou vídeos, ou no *microfone* 🎤 para gravar um áudio. Eu já deixo tudo anexado ao seu atendimento.');
  }

  /* ---------- atendente humano ---------- */
  async function fluxoHumano(motivo) {
    chat.estado = 'livre';
    garantirLead();
    mexer(it => {
      it.humano = { status: 'aguardando', motivo: motivo || 'Pediu para falar com um atendente', solicitadoEm: agora() };
      if (it.avaliacao && it.avaliacao <= 3 && !(it.urgente && it.urgente.status !== 'resolvido')) {
        it.urgente = { nota: it.avaliacao, categoria: chat.feedback?.categoria || '', relato: chat.feedback?.relato || '', em: agora(), status: 'aberto' };
        it.humano.motivo = `🚨 Avaliação ${it.avaliacao}/5 · pediu atendente`; it.humano.urgente = true;
      }
    });
    chat.avisouHumano = false;
    const link = cfg.modo === 'site' ? `\n<a href="${FG.waLink('Olá! Vim pelo site e gostaria de falar com um atendente.')}" target="_blank" rel="noopener">➜ Ou fale direto no WhatsApp</a>` : '';
    await bot(`Claro${ola()}! Já chamei alguém da nossa equipe 🙋‍♀️ Em instantes uma pessoa continua a conversa com você por aqui.\nSe quiser, pode ir adiantando sua dúvida que eu deixo anotada. 📝${link}`);
  }
  const humanoStatus = () => lead()?.humano?.status;

  /* ---------- proposta: aprovar, dúvidas, recusar ---------- */
  const decisao = () => [['✅ Aprovar proposta', aprovar], ['💬 Tenho dúvidas', duvidas], ['❌ Não vou seguir', recusar]];
  async function aoProposta() {
    chat.estado = 'decisao';
    await bot(`${nome() || 'Oi'}, seu orçamento chegou! 🎉 Dá uma olhadinha com calma. O que achou?`, decisao());
  }
  function aprovar() {
    const it = lead();
    bot(`Que alegria! 🥳 Só para confirmar: você aprova a proposta *${it.protocolo}* no valor de *${FG.brl(it.proposta)}*${it.condicao ? `, com pagamento em *${it.condicao}*` : ''}?`,
      [['Sim, aprovo!', confirmarAprovacao], ['Ainda não', aindaPensando]]);
  }
  async function confirmarAprovacao() {
    chat.estado = 'livre';
    mexer(it => { FG.mudarStatus(it, 'aprovado', false); it.aprovadoEm = agora(); });
    await bot(`Aprovação registrada! ✅ Muito obrigada pela confiança${ola()}. 💛`);
    pedirDatas();
  }
  function duvidas() {
    bot('Claro! Sobre o que ficou a dúvida? 🤔', [
      ['⏱️ Prazo', () => respDuvida('prazo')], ['🛡️ Garantia', () => respDuvida('garantia')],
      ['💳 Pagamento', () => respDuvida('pagamento')], ['👤 Falar com especialista', () => fluxoHumano('Dúvidas sobre a proposta')],
    ]);
  }
  // condição de pagamento: se já existe proposta, fala SOMENTE a condição que a equipe enviou
  function faqPagamento() {
    const it = lead();
    if (it?.proposta && it.condicao) return `Na sua proposta, a condição de pagamento é: *${it.condicao}*. 💳\nSe precisar de outra forma, posso chamar alguém da equipe para negociar com você. 😉`;
    return 'As condições de pagamento são definidas junto com o seu orçamento, de acordo com o projeto. E, se precisar, a equipe negocia a melhor forma com você. 💳';
  }
  async function respDuvida(k) {
    await bot(k === 'pagamento' ? faqPagamento() : FAQ[k]);
    bot('Ficou mais claro? 😊', [['✅ Aprovar proposta', aprovar], ['Tenho outra dúvida', duvidas], ['Vou pensar mais um pouco', aindaPensando]]);
  }
  function aindaPensando() {
    chat.estado = 'decisao';
    bot(`Sem pressa${ola()}! 😊 A proposta vale por 15 dias. Quando decidir, é só me escrever *aprovar*, ou pedir um *atendente* se quiser ajustar algum detalhe.`);
  }
  function recusar() {
    bot('Poxa, que pena 😕 Posso saber o motivo? Isso ajuda muito a gente a melhorar.', [
      ['💰 Valor acima do esperado', motivoValor],
      ['📅 Vou adiar o projeto', () => encerrar('Vai adiar o projeto')],
      ['🏢 Escolhi outra empresa', () => encerrar('Escolheu outra empresa')],
      ['✍️ Outro motivo', () => perguntar('motivoLivre', 'Pode me contar, eu anoto aqui para a equipe. 📝')],
    ]);
  }
  function motivoValor() {
    bot('Entendo totalmente. Muitas vezes conseguimos ajustar o tipo de vidro, o acabamento ou a condição de pagamento para caber melhor no seu planejamento. 💡\n\nQuer que um especialista revise a proposta com você?',
      [['Sim, quero conversar', () => { mexer(it => { it.negociacao = true; }); fluxoHumano('Quer negociar o valor da proposta'); }], ['Não, obrigado', () => encerrar('Valor acima do esperado')]]);
  }
  async function encerrar(motivo) {
    chat.estado = 'livre';
    mexer(it => { it.motivoPerda = motivo; FG.mudarStatus(it, 'perdido', false); });
    await bot(`Tudo bem${ola()}. Obrigada pela oportunidade de apresentar a FireGuard! 💛\nSe mudar de ideia, é só me chamar por aqui que a gente retoma de onde parou.`);
  }

  /* ---------- visita técnica: preferência de datas ---------- */
  const prefTxt = p => (p.datas?.length ? p.datas.map(FG.fmtDia).join(', ') : p.texto || 'a combinar') + (p.periodo ? ` · ${p.periodo.split(' (')[0].toLowerCase()}` : '');
  async function pedirDatas(curto) {
    if (!curto) await bot('Agora vamos ao próximo passo: a *visita técnica*. Um técnico da FireGuard vai até você para fazer a medição milimétrica e alinhar os detalhes finais. É gratuita! 📐');
    await bot('Quais dias ficam melhores para você? Pode marcar *até 3 opções* 👇', null, 500);
    escolherDatas();
  }
  function escolherDatas() {
    $$('.quick').forEach(q => q.remove());
    const q = document.createElement('div'); q.className = 'quick multi';
    const sel = new Set();
    const ok = document.createElement('button'); ok.type = 'button'; ok.textContent = '✔ Confirmar dias'; ok.disabled = true; ok.className = 'ok';
    FG.diasUteis(8).forEach(d => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = FG.fmtDia(d);
      b.onclick = () => {
        if (sel.has(d)) sel.delete(d); else if (sel.size < 3) sel.add(d);
        b.classList.toggle('on', sel.has(d)); ok.disabled = !sel.size;
      };
      q.appendChild(b);
    });
    const outro = document.createElement('button'); outro.type = 'button'; outro.textContent = 'Nenhum desses';
    outro.onclick = () => { q.remove(); addMsg('Nenhum desses', 'out'); log('cliente', 'Nenhum desses'); perguntar('datasLivre', 'Sem problemas! Me diz quais dias ficam melhores para você (ex.: *próxima terça ou quinta*). 🗓️'); };
    ok.onclick = () => {
      const ds = [...sel].sort(), txt = ds.map(FG.fmtDia).join(', ');
      q.remove(); addMsg(txt, 'out'); log('cliente', txt); chat.datas = ds; perguntarPeriodo();
    };
    q.append(outro, ok); $('#msgs').appendChild(q); rolar();
  }
  function perguntarPeriodo() {
    const set = per => salvarPreferencia(per);
    bot('Ótimo! E qual período é melhor? ⏰', [['☀️ Manhã (8h–12h)', () => set('Manhã (8h–12h)')], ['🌤️ Tarde (13h–17h)', () => set('Tarde (13h–17h)')], ['🕐 Qualquer horário', () => set('Qualquer horário')]]);
  }
  async function salvarPreferencia(periodo) {
    chat.estado = 'livre';
    const pref = { datas: chat.datas, texto: chat.datasTexto || '', periodo, em: agora() };
    chat.datas = []; chat.datasTexto = '';
    mexer(it => {
      it.visitaPref = pref;
      if (it.status === 'medicao') { it.visita = null; FG.mudarStatus(it, 'aprovado', false); }
    });
    await bot(`Anotado! 📅 *${prefTxt(pref)}*.\nVou encaixar na agenda dos nossos técnicos e já te confirmo *o dia, o horário e quem vai te visitar*. 😉`);
  }

  /* ---------- confirmações vindas do painel ---------- */
  async function aoVisita() {
    await bot('Esse dia e horário ficam bons para você? 😊', [['👍 Confirmado!', confirmarVisita], ['🔄 Preciso remarcar', remarcarVisita]]);
  }
  async function confirmarVisita() {
    mexer(it => { if (it.visita) it.visita.confirmada = true; });
    const t = FG.tecnico(lead()?.visita?.tecnico);
    await bot(`Perfeito! 🙌 Um dia antes eu te mando um lembrete. ${t.art === 'a' ? 'A' : 'O'} ${FG.primeiro(t.nome)} vai adorar conhecer seu espaço. Se precisar de algo até lá, é só me chamar!`);
  }
  async function remarcarVisita() {
    await bot('Sem problemas, a gente ajusta! 😊');
    await bot('Quais dias ficam melhores agora? Pode marcar até 3 👇', null, 500);
    escolherDatas();
  }
  async function aoInstalacao() {
    await bot('Tudo certo para essa data? 🗓️', [
      ['👍 Confirmado!', async () => { mexer(it => { if (it.instalacao) it.instalacao.confirmada = true; }); await bot('Combinado! 🙌 Só peço que avise a portaria sobre a chegada da equipe. Qualquer coisa, estou por aqui!'); }],
      ['🔄 Preciso remarcar', () => { mexer(it => { if (it.instalacao) it.instalacao.remarcar = true; }); fluxoHumano('Precisa remarcar a instalação'); }],
    ]);
  }
  async function aoConcluido() {
    await bot('Antes de ir: de 1 a 5, como você avalia sua experiência com a FireGuard? ⭐',
      [1, 2, 3, 4, 5].map(n => ['⭐'.repeat(n), () => avaliar(n)]));
  }
  async function avaliar(n) {
    mexer(it => { it.avaliacao = n; });
    if (n >= 4) return bot(`Uau, muito obrigada${ola()}! 🥰 Ficamos muito felizes. Se conhecer alguém que também queira deixar a sacada mais segura e bonita, vamos adorar a indicação!`);
    // nota 1 a 3: entender o que houve e oferecer um atendente
    chat.feedback = { nota: n, categoria: '', relato: '' };
    await bot(`Poxa${ola()}, sinto muito que sua experiência não tenha sido nota 5. 😔`, null, 700);
    bot('Aconteceu algum problema durante o atendimento?', [
      ['Sim, tive um problema', perguntarEtapaProblema],
      ['Não, foi só um detalhe', () => perguntar('problemaLivre', 'Entendi! Me conta, o que poderíamos ter feito melhor? Sua opinião é muito importante. 📝', [['Prefiro não dizer', oferecerAtendente]])],
    ]);
  }
  function perguntarEtapaProblema() {
    const set = cat => { chat.feedback.categoria = cat; perguntar('problemaLivre', 'Sinto muito por isso. 🙏 Se puder, me conta em poucas palavras o que aconteceu.', [['Prefiro não detalhar', oferecerAtendente]]); };
    bot('Em qual etapa foi o problema?', [
      ['💬 Atendimento', () => set('Atendimento')], ['📐 Visita técnica', () => set('Visita técnica')],
      ['🛠️ Instalação', () => set('Instalação')], ['🪟 Produto / acabamento', () => set('Produto / acabamento')],
      ['✍️ Outro', () => set('Outro')],
    ]);
  }
  function oferecerAtendente() {
    chat.estado = 'livre';
    bot('Obrigada por compartilhar. 💛 Você gostaria de falar com alguém da nossa equipe a respeito? Vamos tratar com *prioridade*.', [
      ['Sim, quero falar com um atendente', () => registrarFeedback(true)],
      ['Não, obrigado(a)', () => registrarFeedback(false)],
    ]);
  }
  async function registrarFeedback(querFalar) {
    const f = { ...(chat.feedback || {}), em: agora() };
    if (querFalar) {
      garantirLead();
      mexer(it => {
        it.feedback = f;
        it.urgente = { ...f, status: 'aberto' };
        it.humano = { status: 'aguardando', motivo: `🚨 Avaliação ${f.nota}/5${f.categoria ? ' · ' + f.categoria : ''}`, solicitadoEm: agora(), urgente: true };
      });
      chat.avisouHumano = false;
      return bot(`Já acionei nossa equipe com *prioridade máxima* 🚨 Em instantes uma pessoa fala com você por aqui${ola()}.\nPedimos desculpas pelo transtorno e vamos resolver juntos. 🙏`);
    }
    mexer(it => { it.feedback = f; });
    bot('Tudo bem! Seu feedback já foi registrado e vai ajudar muito a nossa equipe a melhorar. 💛\nSe mudar de ideia, é só escrever *atendente* que eu chamo alguém na hora.');
  }

  /* ---------- mídias ---------- */
  async function enviarMidia(blob, nomeArq, duracao) {
    const tipo = FG.tipoDe(blob);
    if (!tipo) return bot('Esse formato eu não consigo abrir 😕 Pode me mandar como foto, vídeo ou áudio?');
    if (blob.size > 50 * 1048576) return bot('Esse arquivo ficou grandinho demais (mais de 50 MB) 😅 Tenta um vídeo mais curto?');
    const u = URL.createObjectURL(blob);
    addMsg(tipo === 'imagem' ? `<img class="fg-md" src="${u}" alt="">` : tipo === 'video' ? `<video class="fg-md" src="${u}" controls playsinline></video>` : `<audio class="fg-md" src="${u}" controls></audio>`, 'out');
    $$('.quick').forEach(q => q.remove());
    const { it, novo } = garantirLead();
    const silencioso = humanoStatus() === 'atendendo';
    let t;
    if (!silencioso) { status(tipo === 'audio' ? 'ouvindo…' : 'analisando…'); t = addMsg(tipo === 'audio' ? '🎧 ouvindo seu áudio…' : '🔎 dando uma olhada…', 'in typing'); }
    let m;
    try { m = await FG.anexar(it.id, blob, { origem: FG.ORIGEM_BOT, nome: nomeArq || (tipo === 'audio' ? 'audio-gravado.webm' : undefined), duracao }); }
    catch (err) { t?.remove(); status(); return bot('Não consegui processar esse arquivo 😕 Pode tentar de novo?'); }
    chat.vistos = lead()?.mensagens.length || chat.vistos;
    if (silencioso) return;
    await new Promise(r => setTimeout(r, 800));
    t.remove(); status();
    const a = m.analise || {};
    let txt;
    if (tipo === 'audio') txt = `Recebi seu áudio${a.duracao ? ` (${a.duracao})` : ''} 🎧 Já deixei anexado para a equipe ouvir com atenção.`;
    else if (a.qualidade === 'Pedir nova foto') txt = `Recebi! 📷 Mas ${tipo === 'video' ? 'o vídeo' : 'a foto'} ficou um pouco ${a.luz === 'Baixa' ? 'escura' : 'pequena'}. Se puder, me manda outra com mais luz mostrando o vão inteiro? Ajuda muito! 🙏`;
    else txt = `${tipo === 'video' ? 'Que vídeo bom! 🎥' : 'Que foto boa! 📷'} Pelo que vi é ${a.ambiente?.includes('·') ? 'uma ' + a.ambiente.split('·')[1].trim() : a.ambiente ? 'um ' + a.ambiente.toLowerCase() : 'o seu espaço'}, com iluminação ${String(a.luz || 'boa').toLowerCase()}. Já anexei ao seu atendimento *${it.protocolo}*. ✅`;
    if (novo) txt = `Abri um atendimento para você: *${it.protocolo}* 📋\n\n` + txt;
    const semPedido = !lead()?.informado?.produto;
    await bot(txt, semPedido ? [['📝 Pedir orçamento', fluxoOrc], ['Só queria enviar', () => bot('Perfeito! A equipe já consegue ver. 😉')]] : null);
    if (!semPedido && tipo === 'imagem' && a.qualidade !== 'Pedir nova foto' && (lead()?.midias || []).filter(x => x.tipo === 'imagem').length === 1)
      await bot('Dica de ouro: uma foto com uma *trena aberta* no vão deixa o orçamento ainda mais preciso. 📏😉');
  }

  /* ---------- texto livre: conversa contextual ---------- */
  async function aoTexto(v) {
    const t = norm(v);
    const n = parseFloat(v.replace(',', '.'));
    const querHumano = /atendente|humano|\bpessoa\b|especialista|falar com alguem|vendedor/.test(t);
    const naoSei = /nao sei|sei la|nao tenho|nao medi/.test(t);
    if (querHumano && humanoStatus() !== 'atendendo') return fluxoHumano('Pediu para falar com um atendente');
    if (humanoStatus() === 'atendendo') return; // uma pessoa da equipe está conduzindo a conversa

    switch (chat.estado) {
      case 'medidas': {
        if (naoSei) return semMedidas();
        const m = v.match(/(\d+(?:[.,]\d+)?)\s*(?:x|por|×|\*|e)\s*(\d+(?:[.,]\d+)?)/i);
        if (m) {
          chat.dados.largura = parseFloat(m[1].replace(',', '.')); chat.dados.altura = parseFloat(m[2].replace(',', '.'));
          return perguntar('vaos', `Anotei: *${num(chat.dados.largura)} × ${num(chat.dados.altura)} m* 📏 E quantos vãos (aberturas) são?`, vaosBtns());
        }
        if (n > 0) { chat.dados.largura = n; return perguntar('altura', `Show, ${num(n)} m de largura! E a *altura*, mais ou menos? (ex.: 2,4)`); }
        return bot('Hmm, não consegui entender as medidas 🤔 Pode mandar assim: *4,2 x 2,4*? Ou toque em "Não sei as medidas".', [['Não sei as medidas', semMedidas]]);
      }
      case 'altura':
        if (naoSei) return semMedidas();
        if (!(n > 0)) return bot('Me manda só o número, por exemplo *2,4* 😊');
        chat.dados.altura = n;
        return perguntar('vaos', `Anotei: *${num(chat.dados.largura)} × ${num(n)} m* 📏 E quantos vãos (aberturas) são?`, vaosBtns());
      case 'vaos':
        if (!(n >= 1)) return bot('Me diz só a quantidade, por exemplo *2* 😊', vaosBtns());
        chat.dados.vaos = Math.round(n); chat.estado = 'livre'; return proximo();
      case 'nome':
        chat.dados.cliente = v.replace(/^(meu nome e|me chamo|sou o|sou a|eu sou)\s+/i, '').trim();
        chat.estado = 'livre';
        await bot(`Prazer, ${nome()}! 😊`, null, 500); return proximo();
      case 'telefone':
        if (v.replace(/\D/g, '').length < 10) return bot('Me passa com DDD, por exemplo *(11) 98888-7777* 📱');
        chat.dados.telefone = v; chat.estado = 'livre'; return proximo();
      case 'cidade':
        chat.dados.cidade = v; return finalizarOrc();
      case 'protocolo': {
        chat.estado = 'livre';
        const it = FG.buscar(/^fg/i.test(v.trim()) ? v.trim() : 'FG-' + v.replace(/\D/g, ''));
        if (!it) return bot('Hmm, não encontrei esse protocolo 😕 Confere o número para mim?', [['Tentar de novo', fluxoTrack], ['👤 Falar com atendente', () => fluxoHumano('Não encontrou o protocolo')]]);
        chat.leadId = it.id; chat.vistos = it.mensagens.length; try { sessionStorage.setItem(LS, it.id); } catch {}
        await bot(`Achei! 🙌 Pedido de *${FG.primeiro(it.cliente)}*.`, null, 500);
        return resumoPedido(it);
      }
      case 'problemaLivre':
        chat.feedback = { ...(chat.feedback || {}), relato: v };
        return oferecerAtendente();
      case 'datasLivre':
        chat.datas = []; chat.datasTexto = v; return perguntarPeriodo();
      case 'motivoLivre':
        return encerrar(v);
    }

    if (humanoStatus() === 'aguardando') {
      if (!chat.avisouHumano) { chat.avisouHumano = true; return bot('Anotei! 📝 Já deixei sua mensagem para a equipe, que te responde em instantes.'); }
      return;
    }
    const it = lead(), st = it?.status;
    const protoNaFrase = v.match(/fg[-\s]?(\d{3,})/i);
    if (protoNaFrase && chat.estado !== 'protocolo' && (!it || it.protocolo !== 'FG-' + protoNaFrase[1])) { chat.estado = 'protocolo'; return aoTexto('FG-' + protoNaFrase[1]); }

    if ((st === 'enviado' || chat.estado === 'decisao') && /aprov|fechad|fechar|pode seguir|vamos fechar|aceito|quero sim|bora/.test(t)) return aprovar();
    if ((st === 'enviado' || chat.estado === 'decisao') && /nao vou|nao quero|desist|recus|nao tenho interesse/.test(t)) return recusar();
    if (/remarc|reagend|mudar a data|trocar a data/.test(t)) {
      if (st === 'medicao') return remarcarVisita();
      if (st === 'instalacao') return fluxoHumano('Precisa remarcar a instalação');
    }
    if (/^(oi+|ola|opa|e ai|bom dia|boa tarde|boa noite|hey|alo)\b/.test(t)) {
      if (it && it.informado?.produto) { await bot(`Oi de novo${ola()}! 😊`, null, 500); return resumoPedido(it); }
      return bot(`Oi${ola()}! 😊 Como posso te ajudar?`, opcoesIniciais());
    }
    if (/obrigad|valeu|agradec|brigad/.test(t)) return bot(`Imagina${ola()}! 😊 Conte sempre comigo.`);
    if (/^(ok|okay|beleza|blz|certo|combinado|perfeito|show|top|otimo|joia|massa|entendi|ta bom|tudo bem|👍)/.test(t)) return bot(st === 'enviado' ? 'Combinado! 😊 Quando decidir sobre a proposta, é só me falar.' : 'Combinado! 😉 Qualquer coisa, estou por aqui.');
    if (/garantia/.test(t)) return bot(FAQ.garantia);
    if (/pag|parcel|pix|cartao|boleto|desconto|a vista|entrada/.test(t)) return bot(faqPagamento(), it?.proposta && st === 'enviado' ? [['👤 Negociar com atendente', () => fluxoHumano('Quer negociar a forma de pagamento')], ['✅ Aprovar proposta', aprovar]] : null);
    if (/laudo|\bart\b|bombeiro|norma|abnt/.test(t)) return bot(FAQ.laudo);
    if (/preco|valor|custa|custar|custo|quanto (fica|sai|vai|e|eh|seria)|caro|barato|investimento/.test(t)) {
      if (it?.proposta) return bot(`O valor da sua proposta *${it.protocolo}* é *${FG.brl(it.proposta)}*${it.condicao ? `, com a condição: *${it.condicao}*` : ''}. 😊`, st === 'enviado' ? decisao() : null);
      return bot('Os valores dependem das medidas, do vidro e do acabamento, por isso cada orçamento é feito pela nossa equipe, sob medida para você. 📝 E é rapidinho: até 2h úteis!', it?.informado?.produto ? null : [['📝 Pedir orçamento', fluxoOrc]]);
    }
    if (/prazo|demora|quanto tempo|quando fica|quando chega|quando vem/.test(t)) {
      if (['novo', 'analise', 'medicao', 'instalacao', 'aprovado'].includes(st)) return resumoPedido(it);
      return bot(FAQ.prazo);
    }
    if (/visita|tecnico|medicao|medir/.test(t)) {
      if (['aprovado', 'medicao'].includes(st)) return resumoPedido(it);
      return bot(FAQ.visita);
    }
    if (/instala/.test(t) && st === 'instalacao') return resumoPedido(it);
    if (/foto|video|audio|imagem|anexo/.test(t)) return fluxoMidia();
    if (/orcamento|cotacao|orcar|cotar|novo pedido/.test(t)) return fluxoOrc();
    if (/status|pedido|andamento|protocolo|acompanh/.test(t)) return fluxoTrack();
    if (/envidra|sacada|anteparo|fogo|churrasq|cortina|guarda.?corpo|vidro/.test(t)) {
      if (/fogo|anteparo|churrasq/.test(t)) await bot(FAQ.laudo);
      else await bot('Esse é um dos nossos queridinhos! 😍 Trabalhamos com vidros temperados e laminados, perfis em 4 acabamentos e instalação com equipe própria.');
      return it?.informado?.produto ? null : bot('Quer que eu registre um pedido de orçamento para você?', [['Quero sim!', fluxoOrc], ['Agora não', () => bot('Tudo bem! Estou por aqui. 😊')]]);
    }
    return bot('Hmm, acho que não entendi direito 😅 Pode me explicar de outro jeito?', sugestoes(st));
  }
  const vaosBtns = () => [1, 2, 3].map(x => [String(x), () => { chat.dados.vaos = x; chat.estado = 'livre'; proximo(); }]).concat([['4 ou mais', () => perguntar('vaos', 'Quantos exatamente? 😊')]]);
  function sugestoes(st) {
    if (st === 'enviado') return decisao();
    if (!lead()?.informado?.produto) return opcoesIniciais();
    return [['📦 Como está meu pedido?', () => resumoPedido()], ['👤 Falar com atendente', () => fluxoHumano('Não foi entendido pelo assistente')]];
  }

  /* ---------- mensagens vindas do painel ---------- */
  const ACOES = { proposta: aoProposta, visita: aoVisita, instalacao: aoInstalacao, concluido: aoConcluido };
  const bolha = m => (m.de === 'atendente' ? `<span class="who">👤 ${m.autor || 'Equipe FireGuard'}</span>` : '') + (m.midia ? FG.midiaHTML(m.midia) : fmt(m.txt));
  function sincronizar() {
    const it = lead(); if (!it) return;
    const novas = it.mensagens.slice(chat.vistos);
    chat.vistos = it.mensagens.length;
    let acaoMsg = null;
    novas.filter(m => m.de !== 'cliente').forEach(m => { addMsg(bolha(m), 'in', m.em); if (m.acao) acaoMsg = m; });
    if (novas.some(m => m.acao === 'humano-off')) chat.avisouHumano = false;
    if (acaoMsg && ACOES[acaoMsg.acao]) {
      // marca a ação como tratada no próprio pedido: se houver outra janela aberta, ela não responde de novo
      let ok = false;
      mexer(x => { const mm = x.mensagens.find(y => y.em === acaoMsg.em && y.acao === acaoMsg.acao); if (mm && !mm.tratada) { mm.tratada = true; ok = true; } });
      if (ok) setTimeout(() => ACOES[acaoMsg.acao](), 900);
    }
  }
  function restaurarHistorico(it) {
    it.mensagens.forEach(m => addMsg(bolha(m), m.de === 'cliente' ? 'out' : 'in', m.em));
    chat.vistos = it.mensagens.length;
    // retoma a etapa em que o cliente parou
    if (it.status === 'enviado' && humanoStatus() !== 'atendendo') { chat.estado = 'decisao'; botoes(decisao()); }
    else if (it.status === 'medicao' && it.visita && !it.visita.confirmada) botoes([['👍 Confirmado!', confirmarVisita], ['🔄 Preciso remarcar', remarcarVisita]]);
    else if (it.status === 'concluido' && !it.avaliacao) {
      // se a conclusão chegou com a conversa fechada, a Lara faz o convite agora
      const perguntou = it.mensagens.some(m => m.de === 'bot' && /como voc[eê] avalia/i.test(m.txt));
      if (perguntou) botoes([1, 2, 3, 4, 5].map(n => ['⭐'.repeat(n), () => avaliar(n)]));
      else setTimeout(aoConcluido, 900);
    }
  }

  /* ---------- gravação de áudio (botão estilo WhatsApp) ---------- */
  let grav = null, gravT = null;
  function icone() {
    const temTxt = $('#chatIn').value.trim().length > 0;
    $('#sendBtn .s-mic').style.display = !temTxt && !grav ? '' : 'none';
    $('#sendBtn .s-send').style.display = temTxt && !grav ? '' : 'none';
    $('#sendBtn .s-stop').style.display = grav ? '' : 'none';
    $('#sendBtn').setAttribute('aria-label', grav ? 'Enviar áudio' : temTxt ? 'Enviar' : 'Gravar áudio');
  }
  function fimGrav() { clearInterval(gravT); $('#chat').classList.remove('recording'); $('#sendBtn').classList.remove('rec'); icone(); }

  /* ---------- init ---------- */
  function init(opts = {}) {
    cfg = { ...cfg, ...opts, cliente: { ...(opts.cliente || {}) } };
    $('#chatForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#chatIn').value.trim(); if (!v) return;
      $('#chatIn').value = ''; icone(); $$('.quick').forEach(q => q.remove());
      addMsg(fmt(v), 'out'); log('cliente', v); aoTexto(v);
    });
    $('#chatIn').addEventListener('input', icone);
    $('#clipBtn').addEventListener('click', () => $('#chatFile').click());
    $('#chatFile').addEventListener('change', async e => { const fs = [...e.target.files]; e.target.value = ''; for (const f of fs) await enviarMidia(f, f.name); });
    $('#chat').addEventListener('dragover', e => e.preventDefault());
    $('#chat').addEventListener('drop', async e => { e.preventDefault(); for (const f of [...e.dataTransfer.files]) await enviarMidia(f, f.name); });
    $('#sendBtn').addEventListener('click', async () => {
      if ($('#chatIn').value.trim() && !grav) return $('#chatForm').requestSubmit();
      if (!grav) {
        try { grav = await FG.gravarAudio(); } catch (err) { return bot('Não consegui acessar seu microfone 🎤 Verifique a permissão do navegador ou me mande um arquivo de áudio pelo clipe.'); }
        $('#chat').classList.add('recording'); $('#sendBtn').classList.add('rec'); icone();
        gravT = setInterval(() => { $('#recT').textContent = FG.fmtDur((Date.now() - grav.inicio) / 1000 + .01) || '0:00'; }, 250);
      } else {
        const g = grav; grav = null; fimGrav();
        const { blob, duracao } = await g.parar();
        if (duracao >= .6) enviarMidia(blob, 'audio-gravado.webm', duracao);
      }
    });
    $('#recCancel').addEventListener('click', () => { if (!grav) return; grav.cancelar(); grav = null; fimGrav(); });
    addEventListener('storage', e => { if (e.key === FG.KEY) sincronizar(); });
    icone();
    if (cfg.modo === 'whatsapp') {
      let salvo = null; try { salvo = sessionStorage.getItem(LS); } catch {}
      const it = salvo && FG.todos().find(x => x.id === salvo);
      if (it) { chat.leadId = it.id; chat.iniciado = true; restaurarHistorico(it); }
    }
  }
  // primeiraMsg: simula o "oi" que o cliente manda ao abrir o WhatsApp
  function abrir(primeiraMsg) {
    if (chat.iniciado) return;
    chat.iniciado = true;
    if (primeiraMsg) { addMsg(fmt(primeiraMsg), 'out'); log('cliente', primeiraMsg); setTimeout(inicio, 500); }
    else inicio();
  }
  function novoCliente(cliente, primeiraMsg) {
    try { sessionStorage.removeItem(LS); } catch {}
    Object.assign(chat, { estado: 'livre', dados: {}, leadId: null, buffer: [], vistos: 0, iniciado: false, avisouHumano: false, datas: [] });
    cfg.cliente = { ...(cliente || {}) };
    $('#msgs').innerHTML = ''; abrir(primeiraMsg);
  }
  return { init, abrir, novoCliente, enviarMidia, estado: chat, _texto: aoTexto };
})();
