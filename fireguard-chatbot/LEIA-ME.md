# FireGuard — Chatbot WhatsApp + Painel (sem site)

Versão para a empresa que quer **apenas o atendimento automático no WhatsApp e o painel de gestão**.
Não depende do site: o cliente fala com a FireGuard só pelo WhatsApp.

## Como abrir
Na pasta `fireguard-chatbot`, rode:

```bash
python servidor.py
```

> O `servidor.py` funciona como o servidor padrão do Python, mas impede o navegador de guardar versões antigas das páginas (sem cache).

- Simulador do WhatsApp: http://localhost:5501/index.html
- Painel da equipe: http://localhost:5501/painel.html (qualquer senha funciona)

> Deixe o simulador e o painel **lado a lado**. O que o "cliente" envia no celular aparece no painel na hora, e o que a equipe responde no painel aparece no celular.

## Roteiro da demonstração
1. Deixe o simulador e o painel lado a lado.
2. No celular, toque em **Quero um orçamento** e converse com a Lara. Teste também mensagens livres, como "quanto custa?", "tem garantia?", "obrigada".
3. Envie uma foto pelo 📎 ou grave um áudio no 🎤.
4. No painel, abra o pedido, clique em **📥 Usar na cotação** e depois em **Enviar orçamento ao cliente**.
5. No celular, **aprove a proposta** e escolha os dias e o período da visita técnica.
6. No painel, vá em **Agenda**, clique em **Agendar visita**, escolha o técnico e confirme. O cliente recebe o nome do técnico e confirma.
7. Na aba **Visita & instalação**, agende a instalação escolhendo a equipe. O cliente recebe os nomes dos instaladores.
8. Clique em **Marcar serviço como concluído**: o cliente recebe o convite para avaliar.
9. Clique em **Simular novo cliente** e escreva **atendente**: veja o alerta no painel, clique em **Assumir conversa** e responda.

"Resetar demo", no menu do painel, restaura os dados de exemplo.

## Jornada automática do cliente (Lara, a assistente)
| Etapa | O que o cliente faz no WhatsApp | O que muda sozinho no painel |
|---|---|---|
| 1. Pedido | Conversa com a Lara: solução, medidas (ou "não sei"), vãos, bairro e fotos/áudios | Card em **Novo pedido**, com os dados informados |
| 2. Cotação | Aguarda (a Lara explica que a equipe prepara o valor) | Equipe clica em **Usar na cotação** e em **Enviar orçamento ao cliente**: vai para **Orçamento enviado** |
| 3. Decisão | **Aprova**, tira **dúvidas** (prazo, garantia, pagamento) ou **recusa** informando o motivo | **Aprovado · agendar visita** ou **Não aprovado** (com motivo). Se o valor pesou, vira pedido de atendente para negociar |
| 4. Datas da visita | Escolhe até 3 dias e o período (manhã/tarde) | Aparece em **Agenda → Aguardando agendamento** com as preferências |
| 5. Visita confirmada | Recebe data, horário e **nome do técnico**; confirma ou pede para remarcar | **Visita técnica agendada** (✓ quando o cliente confirma) |
| 6. Instalação | Recebe data e **qual equipe vai instalar** (nomes dos instaladores); confirma ou pede para remarcar | **Instalação agendada** |
| 7. Conclusão | Recebe a mensagem de conclusão e **avalia de 1 a 5** ⭐ | **Concluído**, com a nota no card |
| 8. Nota de 1 a 3 | A Lara pergunta se houve algum problema, em qual etapa (atendimento, visita, instalação, produto) e pede um breve relato. Depois pergunta se o cliente quer falar com um atendente | Se quiser: flag **🚨 URGENTE** (alerta vermelho na Visão geral, card destacado no topo da coluna, primeiro em Conversas), com nota, etapa e relato. A equipe clica em **Assumir conversa** e, ao terminar, em **Marcar como resolvido**. Se não quiser: o feedback fica registrado como **⚠️ Avaliação baixa** |

**Atendente humano:** logo na primeira mensagem a Lara avisa que basta escrever *atendente*. Quando o cliente pede:
- o painel mostra um alerta 🙋 na Visão geral, um contador vermelho em Conversas e a etiqueta "Pediu atendente" no card;
- ao clicar em **Assumir conversa** (ou simplesmente responder), a Lara pausa e a atendente conversa direto com o cliente;
- **Encerrar e devolver à Lara** reativa a assistente.

## O que é simulado
| Recurso | No protótipo | Na versão de produção |
|---|---|---|
| WhatsApp | celular simulado na tela | número oficial da FireGuard via **WhatsApp Business Cloud API (Meta)** ou provedor (Z-API, Twilio, 360dialog) |
| Nome e número do cliente | escolhidos em "Simular novo cliente" | chegam automaticamente com a mensagem |
| Dados e arquivos | salvos no navegador | banco de dados + armazenamento em nuvem |
| Análise de fotos | heurística local (área externa, luz, resolução) | IA de visão identificando sacada, churrasqueira, tipo de vão |
| Áudio | gravado e reproduzido | transcrição automática no painel |
| Login | ilustrativo | usuários e perfis reais |

Preços da calculadora: tela **Tabela de preços** do painel (ou `assets/data.js`).
