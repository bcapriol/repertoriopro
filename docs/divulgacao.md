# Divulgação — configuração e conferência

## Ativação

- A tela fica em **Início → Divulgação** e usa o login já existente do aplicativo.
- Cadastre `OPENAI_API_KEY` como segredo **do servidor** no projeto Lovable. Nunca use prefixo `VITE_`, código público ou campos do formulário para a chave.
- A chave deve pertencer a um projeto da API OpenAI com créditos e acesso a `gpt-4o-mini` e `gpt-image-1`. O modelo de imagens pode exigir verificação da organização na OpenAI.
- Assinaturas do ChatGPT não incluem créditos da API. Configure limites e alertas de gastos no projeto OpenAI.
- As chamadas passam pelas funções de servidor TanStack Start, seguindo a autenticação do aplicativo; não há uma nova função Supabase para publicar nem mudança no banco.
- Depois que o segredo estiver disponível no servidor, recarregue a tela ou use **Verificar ativação**. Se o ambiente exigir nova publicação para disponibilizar o segredo, faça-a pelo Lovable.

## Fluxo

1. Preencha somente os dados desejados e, opcionalmente, selecione os dois logotipos e a foto da banda.
2. Escolha Instagram quadrado (1080 × 1080), status do WhatsApp (1080 × 1920) ou TV horizontal (1920 × 1080).
3. **Enviar e gerar prompt** envia os dados e as imagens à OpenAI. A orientação visual não deve aparecer como texto na arte, e os nomes dos campos não devem ser impressos.
4. Revise o resultado. **Alterar prompt** libera a edição manual; **Refazer prompt** solicita outra direção visual com os mesmos dados.
5. **Aprovar** não faz uma chamada de imagem. **Gerar arte** é uma chamada separada, que usa créditos da API.
6. Confira o resultado e baixe o PNG. Os dados, uploads e resultados não são persistidos ao sair da tela.

## Imagens e privacidade

- Apenas JPG, PNG e WebP, até 10 MB por arquivo. Os uploads são redimensionados no aparelho antes do envio; logotipos preservam transparência.
- As referências também são enviadas ao modelo de imagens, não apenas citadas no prompt.
- A OpenAI não entrega nativamente todas as proporções finais: o aplicativo ajusta as dimensões com fundo desfocado nas bordas, sem cortar o conteúdo. Caso esse ajuste falhe no aparelho, oferece a imagem original.
- A IA pode alterar texto, identidade visual e rostos. Sempre revisar antes de publicar.
- A chave não é retornada ao navegador. Credenciais são validadas pelo servidor antes de chamadas pagas.
- Há um limite adicional por usuário e instância (10 prompts e 3 artes por minuto). Não é uma cota financeira global: instâncias ou reinícios podem renovar esse limite.

## Roteiro de teste manual

Estas verificações dependem do preview publicado, da internet e de uma chave válida; a implementação não implica que as chamadas pagas tenham sido testadas.

- Sem segredo: conferir aviso de ativação, botão para verificar e formulário disponível para preenchimento.
- Sem internet: conferir aviso e bloqueio das chamadas, sem apagar os campos.
- Formulário vazio: gerar e conferir que aparecem apenas Banda Multivibe e @multivibe.banda, sem inventar dados do evento.
- Formulário preenchido: conferir valores, ausência dos rótulos dos campos e orientação visual não impressa na arte.
- Upload: selecionar, substituir e remover cada imagem; verificar rejeição de arquivos incompatíveis ou maiores que 10 MB.
- Edição: apagar todo o prompt e reescrever; o editor deve continuar visível.
- Aprovação: conferir que gerar arte fica bloqueado até aprovar; alterar campos ou imagens deve exigir um novo prompt.
- Refazer: conferir outra direção visual com os mesmos dados; erro deve manter o resultado anterior.
- Geração: testar os três formatos, download do PNG e referências visuais. Conferir as dimensões do arquivo baixado.
- Clicar repetidamente em enviar/gerar: conferir bloqueio enquanto uma chamada está em andamento.
- Falhas de crédito/permissão: conferir mensagem compreensível e preservação dos campos e do prompt.
