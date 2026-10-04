# Validação do acesso offline — Android / Median e navegadores

## O que foi preparado no site

- Músicas, repertórios e anexos continuam na memória local do aparelho.
- A abertura das telas, seus arquivos e o leitor de PDF são preparados separadamente dos dados.
- O painel **Acesso sem internet**, no início e em **Sincronizar Repertórios**, informa o preparo das telas e a quantidade de anexos salvos.
- Uma atualização incompleta não substitui a última cópia completa das telas. A versão anterior também é preservada.
- O login já salvo é usado sem consultar a nuvem para abrir músicas e repertórios. Não saia da conta antes de ficar offline.
- Agenda, contratos, primeiro login e sincronização com a nuvem continuam dependendo de conexão.

## Preparação em cada aparelho

1. Abra o endereço publicado no APK ou navegador, com internet.
2. Entre na sua conta e use **ATUALIZAR** ou **SINCRONIZAR REPERTÓRIOS WI-FI**.
3. Mantenha o aplicativo aberto até terminar a cópia dos anexos e o preparo das telas.
4. No início, confira se **Acesso sem internet** informa a data das telas salvas e todos os anexos disponíveis. Se houver erro, use **Preparar telas offline** com conexão estável.
5. Abra uma música com PDF e um repertório no modo palco ainda com internet.

## Teste no aparelho real

- Ative o modo avião. Feche completamente e reabra o aplicativo.
- Confirme que o início abre e que as quantidades de músicas e repertórios foram mantidas.
- Consulte uma letra, uma imagem e um PDF de várias páginas.
- Abra um repertório e avance/volte entre as músicas no modo palco.
- Gire o celular e o tablet entre retrato e paisagem. Confira legibilidade, rolagem de todas as páginas do PDF e acesso aos botões.
- Reconecte, sincronize uma alteração e repita o teste em modo avião.
- Interrompa uma nova preparação e confira se a cópia anterior ainda pode ser aberta sem rede.
- Repita em cada aparelho: a cópia não é compartilhada automaticamente entre o navegador e o APK.

## Se o Median exibir sua própria tela de “sem internet”

Este repositório contém o site, não a configuração nem o código Android do APK. No painel ou suporte do Median, confirme se a WebView permite Service Workers e armazenamento persistente para o endereço HTTPS publicado, e se sua verificação de conectividade não bloqueia o carregamento do conteúdo já salvo. Os nomes dessas opções dependem da versão/plano do Median; não há uma configuração específica confirmada neste repositório.

Se alterar a configuração nativa, pode ser necessário gerar e instalar outro APK. O teste final deve ser feito nesse APK, não apenas no preview do Lovable.

## Limites importantes

- Limpar os dados do aplicativo, desinstalá-lo ou o navegador remover o armazenamento apaga a cópia offline. Mantenha backup separado.
- A permissão de armazenamento persistente é uma decisão do navegador/WebView.
- O primeiro acesso precisa de internet. Uma tela ou anexo ainda não baixado não estará disponível offline.
- Uma nova versão publicada precisa de um novo preparo online antes do próximo uso sem conexão.
- Os testes acima são uma lista de validação manual; não foram executados automaticamente pelo repositório.
