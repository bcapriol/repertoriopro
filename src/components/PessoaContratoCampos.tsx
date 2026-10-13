import { useId } from "react";
import { Input } from "@/components/ui/input";
import { numeroValido, type Pessoa } from "@/lib/contratos";

const campos: { key: keyof Pessoa; label: string }[] = [
  { key: "documento", label: "CPF/CNPJ *" }, { key: "nome", label: "Nome completo / Razão Social *" },
  { key: "endereco", label: "Endereço" }, { key: "numero", label: "Número" }, { key: "complemento", label: "Complemento" },
  { key: "bairro", label: "Bairro" }, { key: "cidade", label: "Cidade" }, { key: "estado", label: "Estado" },
  { key: "cep", label: "CEP" }, { key: "telefone", label: "Telefone" }, { key: "email", label: "E-mail" },
];

type Props = { pessoa: Pessoa; onChange: (changes: Partial<Pessoa>) => void };
export function PessoaContratoCampos({ pessoa, onChange }: Props) {
  const id = useId();
  const documento = pessoa.documento.replace(/\D/g, "");
  const documentoInvalido = [11, 14].includes(documento.length) && !numeroValido(documento);

  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Somente nome e CPF/CNPJ são obrigatórios. Preencha os dados manualmente.</p>
    <div className="grid gap-3 sm:grid-cols-2">{campos.map(({ key, label }) => <div key={key} className="space-y-1">
      <label htmlFor={`${id}-${key}`} className="block text-sm font-semibold">{label}</label>
      <Input id={`${id}-${key}`} value={pessoa[key]}
        className="min-w-0" required={key === "nome" || key === "documento"}
        placeholder={key === "nome" ? "digite aqui" : undefined}
        inputMode={key === "documento" ? "numeric" : undefined} maxLength={key === "documento" ? 18 : undefined}
        aria-invalid={key === "documento" ? documentoInvalido : undefined}
        aria-describedby={key === "documento" && documentoInvalido ? `${id}-documento-erro` : undefined}
        onChange={(e) => onChange({ [key]: e.target.value })} />
      {key === "documento" && documentoInvalido && <p id={`${id}-documento-erro`} className="text-xs text-muted-foreground">
        Confira o CPF/CNPJ: os dígitos não são válidos.
      </p>}
    </div>)}</div>
  </div>;
}
