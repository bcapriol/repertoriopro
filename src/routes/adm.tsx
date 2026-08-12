import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  CloudUploadIcon,
  CopyIcon,
  LockIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  admBandas,
  admCriarBanda,
  admCriarUsuario,
  admExcluirBanda,
  admExcluirUsuario,
  admNovoKeygen,
  admPublicarShow,
} from "@/lib/nuvem.functions";
import { readData } from "@/lib/repertorio-store";

type Banda = {
  id: string;
  nome: string;
  keygen: string;
  usuarios: { id: string; usuario: string }[];
  totalMusicas: number;
  totalRepertorios: number;
};

export const Route = createFileRoute("/adm")({
  head: () => ({
    meta: [
      { title: "Área do administrador | Repertório Fácil" },
      { name: "description", content: "Área restrita de administração do Repertório Fácil." },
      { property: "og:title", content: "Área do administrador | Repertório Fácil" },
      {
        property: "og:description",
        content: "Área restrita de administração do Repertório Fácil.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdmPage,
});

function AdmPage() {
  const [senha, setSenha] = useState("");
  const [liberado, setLiberado] = useState(false);
  const [bandas, setBandas] = useState<Banda[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [nomeBanda, setNomeBanda] = useState("");
  const [novoUsuario, setNovoUsuario] = useState<Record<string, { u: string; s: string }>>({});

  const listar = useServerFn(admBandas);
  const criar = useServerFn(admCriarBanda);
  const excluir = useServerFn(admExcluirBanda);
  const regerar = useServerFn(admNovoKeygen);
  const criarUsuario = useServerFn(admCriarUsuario);
  const excluirUsuario = useServerFn(admExcluirUsuario);
  const publicar = useServerFn(admPublicarShow);

  const rodar = async (fn: () => Promise<Banda[]>, msg?: string) => {
    setOcupado(true);
    try {
      setBandas(await fn());
      if (msg) toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou.");
    } finally {
      setOcupado(false);
    }
  };

  const entrar = async () => {
    setOcupado(true);
    try {
      setBandas(await listar({ data: { senha } }));
      setLiberado(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Senha incorreta.");
    } finally {
      setOcupado(false);
    }
  };

  const enviarShow = async (bandaId: string) => {
    setOcupado(true);
    try {
      const r = await publicar({ data: { senha, bandaId, dados: readData() } });
      toast.success(`Enviado: ${r.musicas} música(s) e ${r.repertorios} repertório(s).`);
      setBandas(await listar({ data: { senha } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setOcupado(false);
    }
  };

  if (!liberado) {
    return (
      <PageShell title="Área do ADM" subtitle="Acesso restrito">
        <div className="surface-tile flex flex-col items-center gap-4 rounded-2xl border border-border p-6">
          <span className="gradient-stage flex size-14 items-center justify-center rounded-2xl text-primary-foreground">
            <LockIcon className="size-7" />
          </span>
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") entrar();
            }}
            placeholder="Senha do administrador"
            autoComplete="current-password"
            className="h-12 text-base"
          />
          <Button onClick={entrar} disabled={ocupado} className="h-12 w-full rounded-xl font-bold">
            Entrar
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Área do ADM" subtitle={`${bandas.length} banda(s) cadastrada(s)`}>
      <div className="flex flex-col gap-6">
        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="font-bold text-foreground">Nova banda / conjunto</h2>
          <Input
            value={nomeBanda}
            onChange={(e) => setNomeBanda(e.target.value)}
            placeholder="Nome simples (ex.: Trio Capriolli)"
            className="h-12 text-base"
          />
          <Button
            disabled={ocupado}
            className="h-12 rounded-xl font-bold"
            onClick={() =>
              rodar(async () => {
                const r = await criar({ data: { senha, nome: nomeBanda } });
                setNomeBanda("");
                return r;
              }, "Banda criada com chave gerada!")
            }
          >
            <PlusIcon /> Criar banda + chave
          </Button>
        </section>

        {bandas.map((b) => {
          const form = novoUsuario[b.id] ?? { u: "", s: "" };
          return (
            <section
              key={b.id}
              className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-foreground">{b.nome}</h3>
                  <p className="text-sm text-muted-foreground">
                    {b.totalMusicas} música(s) · {b.totalRepertorios} repertório(s)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  disabled={ocupado}
                  aria-label={`Excluir ${b.nome}`}
                  onClick={() =>
                    rodar(() => excluir({ data: { senha, id: b.id } }), "Banda excluída.")
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
                <code className="flex-1 truncate text-sm font-bold tracking-widest text-foreground">
                  {b.keygen}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copiar chave"
                  onClick={() => {
                    navigator.clipboard.writeText(b.keygen);
                    toast.success("Chave copiada!");
                  }}
                >
                  <CopyIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Gerar nova chave"
                  disabled={ocupado}
                  onClick={() =>
                    rodar(() => regerar({ data: { senha, id: b.id } }), "Nova chave gerada.")
                  }
                >
                  <RefreshCwIcon />
                </Button>
              </div>

              <Button
                variant="secondary"
                disabled={ocupado}
                className="h-11 rounded-xl font-bold"
                onClick={() => enviarShow(b.id)}
              >
                <CloudUploadIcon /> Enviar músicas deste aparelho
              </Button>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">Usuários</p>
                {b.usuarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum usuário ainda.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {b.usuarios.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5"
                      >
                        <span className="truncate text-sm text-foreground">{u.usuario}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          disabled={ocupado}
                          aria-label={`Excluir ${u.usuario}`}
                          onClick={() =>
                            rodar(
                              () => excluirUsuario({ data: { senha, id: u.id } }),
                              "Usuário excluído.",
                            )
                          }
                        >
                          <Trash2Icon />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={form.u}
                    onChange={(e) =>
                      setNovoUsuario((p) => ({ ...p, [b.id]: { ...form, u: e.target.value } }))
                    }
                    placeholder="Usuário"
                    className="h-11 text-base"
                  />
                  <Input
                    value={form.s}
                    onChange={(e) =>
                      setNovoUsuario((p) => ({ ...p, [b.id]: { ...form, s: e.target.value } }))
                    }
                    placeholder="Senha"
                    className="h-11 text-base"
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={ocupado}
                  className="h-11 rounded-xl font-bold"
                  onClick={() =>
                    rodar(async () => {
                      const r = await criarUsuario({
                        data: {
                          senha,
                          bandaId: b.id,
                          usuario: form.u,
                          senhaUsuario: form.s,
                        },
                      });
                      setNovoUsuario((p) => ({ ...p, [b.id]: { u: "", s: "" } }));
                      return r;
                    }, "Usuário criado!")
                  }
                >
                  <PlusIcon /> Adicionar usuário
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
