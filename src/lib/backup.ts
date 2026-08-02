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

export function validarBackup(bruto: unknown): {
  data: AppData | null;
  erros: string[];
} {
  const erros: string[] = [];
  if (!bruto || typeof bruto !== "object") {
    return { data: null, erros: ["Arquivo JSON inválido."] };
  }
  const obj = bruto as Record<string, unknown>;
  if (!Array.isArray(obj['songs']) || !Array.isArray(obj['setlists'])) {
    return { data: null, erros: ['O arquivo precisa conter as listas "songs" e "setlists".'] };
  }

  const songs: Song[] = [];
  (obj['songs'] as unknown[]).forEach((item, i) => {
    if (!item || typeof item !== "object") {
      erros.push(`Música ${i + 1}: registro inválido — ignorada.`);
      return;
    }
    const s = item as Record<string, unknown>;
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
      bpm: texto(s['bpm'], 10),
      ritmo: texto(s['ritmo'], 60),
      observacoes: texto(s['observacoes']),
      letra: texto(s['letra'], 20000),
      criadoEm: typeof s['criadoEm'] === "number" ? s['criadoEm'] : Date.now(),
    });
  });

  const idsValidos = new Set(songs.map((s) => s.id));
  const setlists: Setlist[] = [];
  (obj['setlists'] as unknown[]).forEach((item, i) => {
    if (!item || typeof item !== "object") {
      erros.push(`Repertório ${i + 1}: registro inválido — ignorado.`);
      return;
    }
    const r = item as Record<string, unknown>;
    const nome = texto(r['nome'], 200).trim();
    if (!nome) {
      erros.push(`Repertório ${i + 1}: sem nome — ignorado.`);
      return;
    }
    const songIds = Array.isArray(r['songIds'])
      ? (r['songIds'] as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const validos = songIds.filter((x) => idsValidos.has(x));
    if (validos.length !== songIds.length) {
      erros.push(`Repertório "${nome}": músicas não encontradas foram removidas da lista.`);
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
