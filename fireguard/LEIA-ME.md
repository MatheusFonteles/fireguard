# FireGuard — Versão completa (site + chatbot + painel)

> Existe também a versão **só chatbot WhatsApp + painel**, sem site, na pasta `../fireguard-chatbot` (veja o LEIA-ME de lá).
>
> **Regra das duas versões:** o cliente nunca vê preço. Ele envia medidas, fotos, vídeos e áudios; a equipe importa esses dados no painel, faz a cotação e só então envia o valor.

## Como abrir
Na pasta `fireguard`, rode um servidor local e acesse no navegador:

```bash
python servidor.py
```

> O `servidor.py` funciona como o servidor padrão do Python, mas impede o navegador de guardar versões antigas das páginas (sem cache).

- Site: http://localhost:5500/index.html
- Painel: http://localhost:5500/painel.html (qualquer senha funciona)

> Abra pelo endereço `localhost`, não com duplo clique no arquivo: o navegador só libera os scripts, as mídias e o microfone assim.
> Dica para a reunião: deixe o **site** e o **painel** em duas abas lado a lado. Ao enviar um orçamento, fotos ou áudio no site, tudo aparece no painel na hora.

## Roteiro sugerido da demonstração
1. **Site**: o hero com os painéis de vidro deslizando sobre a vista, as soluções, os diferenciais e os projetos. O botão ☀️/🌙 no topo alterna entre modo claro e escuro.
2. **Solicitação de orçamento**: o cliente informa solução, medidas e preferências; o resumo ao lado mostra o que será enviado, **sem valores**. No passo 3, anexe fotos e vídeos (arrastando ou clicando) ou grave um áudio. Ao enviar, o sistema gera um protocolo, abre o WhatsApp com o resumo e manda os arquivos para o painel.
3. **Chatbot** (botão laranja): funciona como o WhatsApp e coleta solução, medidas (aceita "não sei"), nome, WhatsApp e bairro, sem informar preço.
   - 📎 **Clipe**: envia fotos e vídeos. O bot faz uma pré-análise (ambiente, iluminação, resolução), avisa se a foto ficou ruim e anexa ao atendimento.
   - 🎤 **Microfone**: grava um áudio e envia para o especialista.
   - Se o visitante ainda não tiver protocolo, o bot abre um atendimento automaticamente. Se ele consultar um protocolo (ex.: `FG-2608`), os arquivos vão para esse pedido.
4. **Acompanhar pedido**: o cliente digita o protocolo e vê a linha do tempo, as últimas mensagens e os arquivos enviados. O valor só aparece depois que a equipe envia o orçamento.
5. **Painel → Visão geral**: KPIs, funil e últimas solicitações (📎 indica orçamentos com anexos).
6. **Painel → Orçamentos**: quadro com arrastar e soltar; pedidos sem cotação aparecem como "A cotar"; cada mudança de status notifica o cliente.
7. **Abrir um orçamento**:
   - **Dados informados pelo cliente** + botão **📥 Usar na cotação**: leva as medidas e preferências do cliente direto para a calculadora.
   - **Calculadora (interna)**: m², vidro, acabamento, opcionais, mão de obra e desconto. "Salvar rascunho" guarda sem mostrar ao cliente; "Enviar orçamento ao cliente" envia o valor final.
   - **Fotos, vídeos e áudios**: galeria com a pré-análise de cada arquivo, download e o botão "Pedir nova" foto.
8. **Conversas**: caixa de entrada estilo WhatsApp com fotos, vídeos e áudios dentro da conversa (clique na foto para ampliar).
9. **Tabela de preços**: usada só pela calculadora interna do painel.

O link "Resetar demo" no rodapé do menu do painel restaura os dados de exemplo e apaga os arquivos enviados.

## Jornada automática do cliente (Lara, a assistente)
| Etapa | O que o cliente faz no WhatsApp ou no chat do site | O que muda sozinho no painel |
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

## O que é simulado neste protótipo
| Recurso | No protótipo | Na versão de produção |
|---|---|---|
| Dados | salvos no navegador (localStorage) | banco de dados + API (ex.: Supabase/Firebase ou Node + PostgreSQL) |
| Fotos, vídeos e áudios | salvos no navegador (IndexedDB); só aparecem no mesmo computador | armazenamento em nuvem (S3 / Supabase Storage), acessível de qualquer lugar |
| Reconhecimento de imagem | heurística local (céu/área externa, luz, resolução) | modelo de visão por IA identificando sacada, churrasqueira, tipo de vão, guarda-corpo etc. |
| Áudio | gravado e reproduzido | transcrição automática (speech-to-text) exibida no painel |
| WhatsApp | links `wa.me` com a mensagem pronta (o `wa.me` não anexa arquivos) | **WhatsApp Business Cloud API (Meta)** ou provedor (Z-API, Twilio, 360dialog), recebendo mídias via webhook |
| Chatbot | roda no site, com fluxo roteirizado | o mesmo fluxo rodando no número oficial, com transferência para atendente |
| Login | ilustrativo | autenticação real com perfis (comercial, técnico, admin) |
| Números (1.200 sacadas, 15 anos etc.) | ilustrativos | substituir pelos dados reais da empresa |
| Fotos do site | banco gratuito Unsplash (licença livre) | fotos reais das obras da FireGuard |

Número do WhatsApp: trocar em `assets/data.js` → `WHATSAPP`.
Preços padrão: também em `assets/data.js` (ou pela tela "Tabela de preços").

## Créditos das imagens
Fotos do [Unsplash](https://unsplash.com) (Unsplash License, uso comercial gratuito), em `assets/img/`.
