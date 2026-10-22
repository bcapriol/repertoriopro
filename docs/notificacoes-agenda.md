# Avisos de shows — Median + OneSignal

## O que foi implementado

- Em **Administrador → banda → Notificações da agenda**: ativação por banda e usuário, avisos na véspera e no dia, horários independentes, fuso brasileiro, situação do serviço e últimos envios.
- Em **Agenda**: destaque do próximo show e seção **Avisos de shows**, com ativação, desativação e teste neste aparelho.
- O padrão é 9h, no fuso de Brasília, para os dois avisos. O administrador precisa habilitar os avisos da banda.
- Os avisos são processados no servidor, sem precisar manter a agenda ou o aplicativo abertos.
- Cada usuário recebe apenas shows da própria agenda. Folgas, compromissos particulares, shows cancelados ou concluídos não geram notificações.

## Etapas externas obrigatórias

A publicação do site, sozinha, **não habilita as notificações**. As chaves e a integração nativa precisam ser configuradas nas plataformas correspondentes.

1. **OneSignal:** criar/configurar o aplicativo para Android e/ou iOS e concluir as credenciais de push exigidas por cada plataforma. Copiar o App ID e a chave de API do aplicativo.
2. **Median:** habilitar a integração OneSignal com o mesmo App ID. Gerar uma nova versão do aplicativo e instalá-la no celular. Um navegador, PWA ou atalho da tela inicial não substitui essa integração nativa.
3. **Lovable Cloud:** cadastrar os segredos `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` e `AGENDA_PUSH_TOKEN`. O último deve ser uma chave privada aleatória forte, com pelo menos 32 caracteres. Nunca colocar essas chaves no código, no navegador ou em variáveis com prefixo `VITE_`.
4. **Lovable:** publicar a função `agenda-lembretes`, cuja implementação está em `supabase/functions/agenda-lembretes/index.ts`. A publicação dessa função acontece pelo Lovable. A configuração desabilita a verificação automática de JWT porque o agendador utiliza uma chave própria; a função verifica essa chave ou a credencial privilegiada do servidor antes de processar qualquer solicitação.
5. **Administrador:** abrir as notificações da banda, atualizar a situação e tocar em **Ativar serviço automático**. O processamento é global, a cada cinco minutos; as preferências continuam separadas por banda. Se a chave do agendador for trocada, usar **Revalidar serviço**.
6. Ativar os avisos da banda, escolher usuários, horários e fuso e tocar em **Salvar notificações**.
7. **Celular:** entrar com o usuário, abrir **Agenda → Avisos de shows → Ativar neste aparelho** e autorizar as notificações do sistema.
8. Aguardar um minuto e tocar em **Enviar teste**. A confirmação significa que o OneSignal aceitou a solicitação; conferir também se a notificação chegou ao celular.

## Comportamento e limites

- O envio pode ocorrer até cinco minutos depois do horário escolhido. O celular ainda depende da rede e das permissões do sistema; economia de bateria, modo silencioso e encerramento forçado podem afetar a entrega.
- O horário do aviso no dia deve ser **anterior ao início do show**. O sistema não envia lembretes depois do início.
- O serviço tenta recuperar avisos atrasados em uma janela de até duas horas; não dispara lembretes antigos acumulados.
- Falhas temporárias podem ser tentadas novamente, até cinco tentativas nessa janela. Uma identificação única por show, usuário, data e momento evita duplicar o mesmo envio ao OneSignal.
- Alterações de data, cancelamento e permissões são conferidas novamente antes do envio. Uma notificação já enviada não pode ser recolhida do celular; mudanças feitas simultaneamente ao envio podem chegar tarde demais.
- Sair da conta ou trocar de usuário solicita a desativação do vínculo anterior. Sem internet, essa solicitação fica pendente até o aplicativo voltar a se conectar. Se o aparelho for compartilhado, faça a troca de conta conectado e confira a nova ativação.
- A mensagem mostra horário, cliente, local e cidade quando informados. Considere a privacidade da tela bloqueada ao configurar as prévias no celular.
- Se o próximo show foi alterado em outro aparelho, sincronize/atualize a agenda para atualizar o destaque local.

## Roteiro de conferência

1. Confirmar que o serviço está ativado e que a última verificação se atualiza após alguns minutos.
2. Receber o teste em um aparelho real; repetir com o aplicativo fechado, sem forçar sua parada nas configurações do sistema.
3. Criar um show para amanhã e configurar o aviso da véspera para alguns minutos adiante no fuso escolhido. Salvar e conferir a notificação e o histórico do administrador.
4. Criar um show para hoje, com início posterior ao horário do aviso, e conferir o segundo tipo de lembrete.
5. Repetir com um show cancelado e com avisos desativados para um usuário: não deve haver envio.
6. Trocar a conta no celular conectado e verificar que os avisos da conta anterior deixaram de ser autorizados naquele aparelho.

A compilação no Lovable, a publicação da função e a entrega em aparelho real precisam ser verificadas nesses ambientes; não são comprovadas apenas pela alteração dos arquivos.
