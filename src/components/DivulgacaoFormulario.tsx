import { ImagePlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatosDivulgacao, instagramBanda, nomesImagens, type CamposDivulgacao, type ImagemDivulgacao } from "@/lib/divulgacao";

type Props = {
  campos: CamposDivulgacao;
  imagens: ImagemDivulgacao[];
  disabled: boolean;
  onCampo: <K extends keyof CamposDivulgacao>(campo: K, valor: CamposDivulgacao[K]) => void;
  onImagem: (papel: ImagemDivulgacao["papel"], arquivo: File) => void;
  onRemover: (papel: ImagemDivulgacao["papel"]) => void;
};
const inputClass = "mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export function DivulgacaoFormulario({ campos, imagens, disabled, onCampo, onImagem, onRemover }: Props) {
  return (
    <fieldset disabled={disabled} className="space-y-5 disabled:opacity-70">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Data
          <input type="date" value={campos.data} onChange={(e) => onCampo("data", e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-medium">Hora início
          <input type="time" value={campos.hora} onChange={(e) => onCampo("hora", e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">Endereço
          <input value={campos.endereco} maxLength={500} placeholder="Nome do local, rua, número e cidade" onChange={(e) => onCampo("endereco", e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-medium">Valor de Entrada
          <input value={campos.entrada} maxLength={120} placeholder="Ex.: R$ 20 ou entrada gratuita" onChange={(e) => onCampo("entrada", e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-medium">Instagram da banda · fixo
          <input value={instagramBanda} readOnly className={`${inputClass} bg-muted`} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">Informação importante adicional
          <textarea value={campos.adicional} maxLength={2000} rows={3} placeholder="O que mais deve aparecer na divulgação?" onChange={(e) => onCampo("adicional", e.target.value)} className={inputClass} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(nomesImagens) as ImagemDivulgacao["papel"][]).map((papel) => {
          const imagem = imagens.find((i) => i.papel === papel);
          return (
            <div key={papel} className="min-w-0 rounded-lg border border-border bg-card p-3">
              <label htmlFor={`upload-${papel}`} className="mb-2 flex min-h-11 items-center gap-2 text-sm font-medium">
                <ImagePlusIcon className="size-4 shrink-0" />{nomesImagens[papel]}
              </label>
              {imagem && <img src={imagem.dados} alt={nomesImagens[papel]} className="mb-3 h-28 w-full rounded bg-muted object-contain" />}
              <input id={`upload-${papel}`} type="file" accept="image/png,image/jpeg,image/webp" className="w-full min-w-0 text-xs file:mr-2 file:rounded file:border-0 file:bg-accent file:px-2 file:py-3 file:text-primary" onChange={(e) => {
                const arquivo = e.target.files?.[0];
                e.target.value = "";
                if (arquivo) onImagem(papel, arquivo);
              }} />
              {imagem && <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => onRemover(papel)}><XIcon />Remover</Button>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Imagens opcionais: JPG, PNG ou WebP, até 10 MB cada. Logotipos com fundo transparente são recomendados.</p>
      <label className="block text-sm font-medium">Tipo formato
        <select value={campos.formato} onChange={(e) => onCampo("formato", e.target.value as CamposDivulgacao["formato"])} className={inputClass}>
          {Object.entries(formatosDivulgacao).map(([valor, formato]) => <option key={valor} value={valor}>{formato.nome} · {formato.largura} × {formato.altura}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">Ajuda no prompt
        <textarea value={campos.ajuda} maxLength={2000} rows={3} placeholder="Ex.: visual elegante, luzes de palco, tons azuis, destaque para a foto da banda…" onChange={(e) => onCampo("ajuda", e.target.value)} className={inputClass} />
        <span className="mt-1 block text-xs text-muted-foreground">Guia para a IA. Esta orientação e os títulos dos campos não serão impressos na arte.</span>
      </label>
    </fieldset>
  );
}
