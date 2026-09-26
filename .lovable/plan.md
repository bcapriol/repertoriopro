# Privilégio de edição

## Objetivo
Adicionar um privilégio por usuário para controlar alterações no conteúdo do repertório e das músicas.

## Alterações
- Incluir “Alterar sequência, nomes e anexos” nos privilégios da área administrativa, desligado por padrão.
- Salvar e devolver esse privilégio no login e na sincronização.
- Sem o privilégio, ocultar os controles de reordenação e retirada de músicas do repertório.
- Sem o privilégio, impedir a edição de músicas existentes, incluindo nome e anexos; o cadastro de novas músicas permanece disponível.
- Atualizar a conta já salva no aparelho após nova autenticação ou sincronização.

## Detalhes técnicos
- Adicionar um campo booleano na tabela de usuários, com valor padrão falso.
- Propagar o campo pela camada de acesso, funções do servidor e armazenamento local.
- Aplicar a permissão nas telas de músicas, edição e detalhes do repertório.
- Validar a compilação e os estados visuais com e sem o privilégio.
