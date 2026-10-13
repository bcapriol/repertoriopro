import { useEffect, useId, useRef, useState } from "react";
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

const estadoInicial = { buscando: false, mensagem: "", fonte: "" };
type Props = { pessoa: Pessoa; onChange: (changes: Partial<Pessoa>) => void };
export function PessoaContratoCampos({ pessoa, onChange }: Props) {
  const { conta } = useConta();
  const buscar = useServerFn(contratosBuscarNome);
  const id = useId();
  const nomeInput = useRef<HTMLInputElement>(null);
  const consulta = useRef(0);
  const atual = useRef({ pessoa, onChange });
  const [estado, setEstado] = useState(estadoInicial);
  const documento = pessoa.documento.replace(/\D/g, "");
  useEffect(() => { atual.current = { pessoa, onChange }; }, [pessoa, onChange]);
  useEffect(() => {
    consulta.current += 1;
    setEstado(estadoInicial);
    return () => { consulta.current += 1; };
  }, [documento, conta?.usuario, conta?.senha, conta?.podeEditar]);

  const pesquisar = async () => {
    if (!conta?.podeEditar || estado.buscando || !numeroValido(documento)) return;
    const tentativa = ++consulta.current;
    const vigente = () => tentativa === consulta.current && atual.current.pessoa.documento.replace(/\D/g, "") === documento;
    const preencherManualmente = () => {
      setEstado(estadoInicial);
      nomeInput.current?.focus();
    };
    if (!navigator.onLine) { preencherManualmente(); return; }
    const nomeAntes = atual.current.pessoa.nome;
    setEstado({ buscando: true, mensagem: "", fonte: "" });
    try {
      const resultado = await buscar({ data: { usuario: conta.usuario, senha: conta.senha, documento } });
      if (!vigente()) return;
      if (!resultado.nome?.trim()) { preencherManualmente(); return; }
      const preservarNome = atual.current.pessoa.nome !== nomeAntes || !!atual.current.pessoa.nome.trim();
      if (!preservarNome) atual.current.onChange({ nome: resultado.nome });
      setEstado({ buscando: false, fonte: resultado.fonte, mensagem: preservarNome && atual.current.pessoa.nome.trim() !== resultado.nome
        ? `Nome encontrado: ${resultado.nome}. Mantivemos o nome já preenchido; confira e ajuste se necessário.`
        : resultado.mensagem });
    } catch {
      if (vigente()) preencherManualmente();
    }
  };

  const mudarCampo = (key: keyof Pessoa, value: string) => {
    if (key === "documento") {
      consulta.current += 1;
      setEstado(estadoInicial);
    }
    atual.current = { pessoa: { ...atual.current.pessoa, [key]: value }, onChange };
    onChange({ [key]: value });
  };
  const documentoInvalido = [11, 14].includes(documento.length) && !numeroValido(documento);

  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Somente nome e CPF/CNPJ são obrigatórios. Digite o documento e clique em PESQUISAR.</p>
    <div className="grid gap-3 sm:grid-cols-2">{campos.map(({ key, label }) => <div key={key} className="space-y-1">
      <label htmlFor={`${id}-${key}`} className="block text-sm font-semibold">{label}</label>
      <div className="flex items-center gap-2">
        <Input id={`${id}-${key}`} ref={key === "nome" ? nomeInput : undefined} value={pessoa[key]}
          className="min-w-0" required={key === "nome" || key === "documento"}
          placeholder={key === "nome" ? "digite aqui" : undefined}
          inputMode={key === "documento" ? "numeric" : undefined} maxLength={key === "documento" ? 18 : undefined}
          aria-invalid={key === "documento" ? documentoInvalido : undefined}
          aria-describedby={key === "documento" ? `${id}-consulta` : undefined}
          onChange={(e) => mudarCampo(key, e.target.value)}
          onKeyDown={key === "documento" ? (e) => { if (e.key === "Enter") { e.preventDefault(); void pesquisar(); } } : undefined} />
        {key === "documento" && <Button type="button" size="sm" variant="outline" className="shrink-0 text-xs"
          disabled={estado.buscando || !conta?.podeEditar || !numeroValido(documento)}
          aria-busy={estado.buscando} onClick={() => void pesquisar()}>
          {estado.buscando ? "Pesquisando…" : "PESQUISAR"}
        </Button>}
      </div>
      {key === "documento" && <div id={`${id}-consulta`} className="space-y-1 text-xs text-muted-foreground">
        <p>CPF: contratos da banda. CNPJ: contratos da banda e BrasilAPI, à qual o documento é enviado.</p>
        {documentoInvalido && <p>Confira o CPF/CNPJ: os dígitos não são válidos.</p>}
        <p role="status" aria-live="polite">{estado.buscando ? "Consultando nome…" : estado.mensagem}
          {estado.fonte && <span className="block">Fonte: {estado.fonte}</span>}
        </p>
      </div>}
    </div>)}</div>
  </div>;
}
