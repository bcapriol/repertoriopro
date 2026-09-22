import { newId, type AppData, type Setlist, type Song } from "./repertorio-store";

export type ImportResult = {
  songsAdicionadas: number;
  repertoriosAdicionados: number;
  ignorados: number;
  erros: string[];
};

const SONG_COLUNAS = ["titulo", "artista", "tom", "bpm", "ritmo", "observacoes", "letra"] as const;

/* ---------------- CSV ---------------- */

function escapeCsv(value: string) {
  const v = value ?? "";
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function songsToCsv(songs: Song[]): string {
  const linhas = [SONG_COLUNAS.join(",")];
  for (const s of songs) {
    linhas.push(
      [s.titulo, s.artista, s.tom, s.bpm, s.ritmo ?? "", s.observacoes, s.letra]
        .map((v) => escapeCsv(String(v ?? "")))
        .join(","),
    );
  }
  return linhas.join("\n");
}

export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  const src = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (aspas) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += c;
    } else if (c === '"') {
      aspas = true;
    } else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((v) => v.trim() !== ""));
}

export function csvToSongs(texto: string): { songs: Song[]; erros: string[] } {
  const linhas = parseCsv(texto);
  const erros: string[] = [];
  if (linhas.length === 0) return { songs: [], erros: ["Arquivo CSV vazio."] };

  const header = linhas[0]!.map((h) => h.trim().toLowerCase());
  if (!header.includes("titulo") && !header.includes("título")) {
    return { songs: [], erros: ['O CSV precisa de uma coluna "titulo".'] };
  }
  const idx = (nome: string) => header.indexOf(nome);
  const get = (linha: string[], nome: string) => {
    const i = idx(nome);
    return i >= 0 ? (linha[i] ?? "").trim() : "";
  };

  const songs: Song[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i]!;
    const titulo = get(linha, "titulo") || get(linha, "título");
    if (!titulo) {
      erros.push(`Linha ${i + 1}: título ausente — ignorada.`);
      continue;
    }
    if (titulo.length > 200) {
      erros.push(`Linha ${i + 1}: título muito longo — ignorada.`);
      continue;
    }
    songs.push({
      id: newId(),
      titulo,
      artista: get(linha, "artista").slice(0, 200),
      tom: get(linha, "tom").slice(0, 20),
      bpm: get(linha, "bpm").slice(0, 10),
      ritmo: get(linha, "ritmo").slice(0, 60),
      observacoes: get(linha, "observacoes") || get(linha, "observações"),
      letra: get(linha, "letra"),
      criadoEm: Date.now(),
    });
  }
  return { songs, erros };
}

/* ---------------- JSON ---------------- */

const texto = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");

export const LIMITE_ARQUIVO = 10 * 1024 * 1024;

/** Mensagem amigável para um arquivo que nem chega a ser lido. */
export function checarArquivoJson(file: File): string | null {
  const nome = file.name.toLowerCase();
  if (file.size === 0) return "O arquivo está vazio. Escolha um backup gerado pelo app.";
  if (file.size > LIMITE_ARQUIVO)
    return "O arquivo é muito grande (acima de 10 MB). Exporte um backup novo pelo app.";
  if (!nome.endsWith(".json") && file.type && !file.type.includes("json")) {
    return "Esse arquivo não é um backup .json. Para planilhas use o botão de importar .csv.";
  }
  return null;
}

/** Converte o erro do JSON.parse em algo compreensível. */
export function explicarJsonInvalido(texto: string, erro: unknown): string {
  const inicio = texto.trim().slice(0, 1);
  if (inicio === "<") return "Esse arquivo parece uma página da internet, não um backup do app.";
  if (inicio && inicio !== "{" && inicio !== "[")
    return "Esse arquivo não é um backup do app. Escolha o arquivo .json exportado aqui.";
  const msg = erro instanceof Error ? erro.message : "";
  const pos = /position (\d+)/.exec(msg)?.[1];
  const linha = pos ? texto.slice(0, Number(pos)).split("\n").length : null;
  return linha
    ? `O arquivo está incompleto ou corrompido (problema na linha ${linha}). Exporte um backup novo.`
    : "O arquivo está incompleto ou corrompido. Exporte um backup novo.";
}

export function validarBackup(bruto: unknown): {
  data: AppData | null;
  erros: string[];
} {
  const erros: string[] = [];
  if (bruto === null || typeof bruto !== "object" || Array.isArray(bruto)) {
    return {
      data: null,
      erros: [
        "O conteúdo do arquivo não está no formato de backup do app (deve conter músicas e repertórios).",
      ],
    };
  }
  const obj = bruto as Record<string, unknown>;
  const temSongs = Array.isArray(obj['songs']);
  const temSetlists = Array.isArray(obj['setlists']);
  if (!temSongs && !temSetlists) {
    return {
      data: null,
      erros: [
        "Não encontrei músicas nem repertórios neste arquivo. Ele pode ser de outro aplicativo.",
      ],
    };
  }
  if (!temSongs) erros.push("O arquivo não traz a lista de músicas; só os repertórios foram lidos.");
  if (!temSetlists)
    erros.push("O arquivo não traz a lista de repertórios; só as músicas foram lidas.");

  const songs: Song[] = [];
  const brutoSongs = temSongs ? (obj['songs'] as unknown[]) : [];
  brutoSongs.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      erros.push(`Música ${i + 1}: registro danificado — ignorada.`);
      return;
    }
    const s = item as Record<string, unknown>;
    if (s['titulo'] !== undefined && typeof s['titulo'] !== "string") {
      erros.push(`Música ${i + 1}: o título não está em formato de texto — ignorada.`);
      return;
    }
    const titulo = texto(s['titulo'], 200).trim();
    if (!titulo) {
      erros.push(`Música ${i + 1}: sem título — ignorada.`);
      return;
    }
    songs.push({
      id: typeof s['id'] === "string" ? s['id'] : newId(),
      titulo,
      artista: texto(s['artista'], 200),
      tom: texto(s['tom'], 20),
      bpm: typeof s['bpm'] === "number" ? String(s['bpm']) : texto(s['bpm'], 10),
      ritmo: texto(s['ritmo'], 60),
      observacoes: texto(s['observacoes']),
      letra: texto(s['letra'], 20000),
      criadoEm: typeof s['criadoEm'] === "number" ? s['criadoEm'] : Date.now(),
    });
  });

  const idsValidos = new Set(songs.map((s) => s.id));
  const setlists: Setlist[] = [];
  const brutoSets = temSetlists ? (obj['setlists'] as unknown[]) : [];
  brutoSets.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      erros.push(`Repertório ${i + 1}: registro danificado — ignorado.`);
      return;
    }
    const r = item as Record<string, unknown>;
    if (r['nome'] !== undefined && typeof r['nome'] !== "string") {
      erros.push(`Repertório ${i + 1}: o nome não está em formato de texto — ignorado.`);
      return;
    }
    const nome = texto(r['nome'], 200).trim();
    if (!nome) {
      erros.push(`Repertório ${i + 1}: sem nome — ignorado.`);
      return;
    }
    if (r['songIds'] !== undefined && !Array.isArray(r['songIds'])) {
      erros.push(`Repertório "${nome}": lista de músicas inválida — ficou vazio.`);
    }
    const songIds = Array.isArray(r['songIds'])
      ? (r['songIds'] as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const validos = songIds.filter((x) => idsValidos.has(x));
    if (validos.length !== songIds.length) {
      erros.push(
        `Repertório "${nome}": ${songIds.length - validos.length} música(s) não vieram no arquivo e foram deixadas de fora.`,
      );
    }
    setlists.push({
      id: typeof r['id'] === "string" ? r['id'] : newId(),
      nome,
      local: texto(r['local'], 200),
      data: texto(r['data'], 30),
      songIds: validos,
      criadoEm: typeof r['criadoEm'] === "number" ? r['criadoEm'] : Date.now(),
    });
  });

  if (songs.length === 0 && setlists.length === 0) {
    return {
      data: null,
      erros: [
        "Nenhuma música ou repertório válido foi encontrado no arquivo.",
        ...erros.slice(0, 20),
      ],
    };
  }

  return { data: { songs, setlists }, erros };
}


export function baixarArquivo(conteudo: string, nome: string, mime: string) {
  const blob = new Blob([conteudo], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
