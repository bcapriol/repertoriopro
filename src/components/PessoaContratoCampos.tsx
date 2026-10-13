import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useConta } from "@/lib/banda-local";
import { numeroValido, type Pessoa } from "@/lib/contratos";
import { contratosBuscarNome } from "@/lib/nuvem.functions";

const campos: { key: keyof Pessoa; label: string }[] = [
  { key: "documento", label: "CPF/CNPJ *" }, { key: "nome", label: "Nome completo / Razão Social *" },
  { key: "endereco", label: "Endereço" }, { key: "numero", label: "Número" }, { key: "complemento", label: "Complemento" },
  { key: "bairro", label: "Bairro" }, { key: "cidade", label: "Cidade" }, { key: "estado", label: "Estado" },
  { key: "cep", label: "CEP" }, { key: "telefone", label: "Telefone" }, { key: "email", label: "E-mail" },
];

type Props = { pessoa: Pessoa; onChange: (changes: Partial<Pessoa>) => void };
export function PessoaContratoCampos({ pessoa, onChange }: Props) {
  const { conta } = useConta();
  const buscar = useServerFn(contratosBuscarNome);
  const [estado, setEstado] = useState({ buscando: false, mensagem: "", fonte: "" });
  const [tentativa, setTentativa] = useState(0);
  const atual = useRef({ pessoa, onChange });
  useEffect(() => { atual.current = { pessoa, onChange }; }, [pessoa, onChange]);
  const documento = pessoa.documento.replace(/\D/g, "");
  useEffect(() => {
    let ativo = true;
    setEstado({ buscando: false, mensagem: "", fonte: "" });
    if (!conta?.podeEditar || ![11, 14].includes(documento.length)) return;
    if (!numeroValido(documento)) {
      setEstado({ buscando: false, mensagem: "Confira o CPF/CNPJ: os dígitos não são válidos.", fonte: "" });
      return;
    }
    const cred = { usuario: conta.usuario, senha: conta.senha, documento };
    const timer = setTimeout(() => {
      if (!navigator.onLine) {
        setEstado({ buscando: false, mensagem: "Sem internet para consultar. Preencha o nome manualmente.", fonte: "" });
        return;
      }
      const nomeAntes = atual.current.pessoa.nome;
      setEstado({ buscando: true, mensagem: "Consultando nome…", fonte: "" });
      buscar({ data: cred }).then((resultado) => {
        if (!ativo || atual.current.pessoa.documento.replace(/\D/g, "") !== documento) return;
        const preservarNome = atual.current.pessoa.nome !== nomeAntes || !!atual.current.pessoa.nome.trim();
        if (resultado.nome && !preservarNome) atual.current.onChange({ nome: resultado.nome });
        setEstado({ buscando: false, fonte: resultado.fonte, mensagem: resultado.nome && preservarNome && atual.current.pessoa.nome.trim() !== resultado.nome
          ? `Nome encontrado: ${resultado.nome}. Mantivemos o nome já preenchido; confira e ajuste se necessário.`
          : resultado.mensagem });
      }).catch(() => {
        if (ativo) setEstado({ buscando: false, mensagem: "Não foi possível consultar agora. Preencha o nome manualmente ou tente novamente.", fonte: "" });
      });
    }, 650);
    return () => { ativo = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documento, conta?.usuario, conta?.senha, conta?.podeEditar, tentativa]);

  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Somente nome e CPF/CNPJ são obrigatórios. Ao completar um documento válido, o nome será consultado automaticamente e poderá ser corrigido.</p>
    <div className="grid gap-3 sm:grid-cols-2">{campos.map(({ key, label }) => <label key={key} className="block space-y-1 text-sm font-semibold">
      {label}<Input value={pessoa[key]} required={key === "nome" || key === "documento"}
        inputMode={key === "documento" ? "numeric" : undefined} maxLength={key === "documento" ? 18 : undefined}
        onChange={(e) => onChange({ [key]: e.target.value })} />
    </label>)}</div>
    <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
      <p className="text-muted-foreground">CPF: busca nos contratos da própria banda. CNPJ: busca nos contratos e, se necessário, na base pública BrasilAPI. O CNPJ digitado é enviado a esse serviço para consulta. Consulta externa de CPF requer um serviço autorizado, ainda não configurado.</p>
      {estado.mensagem && <p role="status" aria-live="polite">{estado.mensagem}{estado.fonte && <span className="block text-xs text-muted-foreground">Fonte: {estado.fonte}</span>}</p>}
      <Button type="button" size="sm" variant="outline" disabled={estado.buscando || !numeroValido(documento)} onClick={() => setTentativa((n) => n + 1)}>
        {estado.buscando ? "Consultando…" : "Consultar nome novamente"}
      </Button>
    </div>
  </div>;
}
