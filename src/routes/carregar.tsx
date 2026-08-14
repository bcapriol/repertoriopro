import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  DownloadCloudIcon,
  KeyRoundIcon,
  UserRoundIcon,
  FileUpIcon,
  EraserIcon,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { carregarShow, entrarComUsuario } from "@/lib/nuvem.functions";
import { writeData } from "@/lib/repertorio-store";
import { salvarBanda, useBanda } from "@/lib/banda-local";

export const Route = createFileRoute("/carregar")({
  head: () => ({
    meta: [
      { title: "Carregar show | Repertório Fácil" },
      {
        name: "description",
        content: "Baixe as músicas e repertórios da sua banda usando a chave de acesso.",
      },
      { property: "og:title", content: "Carregar show | Repertório Fácil" },
      {
        property: "og:description",
        content: "Baixe as músicas e repertórios da sua banda usando a chave de acesso.",
      },
    ],
  }),
  component: CarregarPage,
});

function CarregarPage() {
  const navigate = useNavigate();
  const banda = useBanda();
  const baixar = useServerFn(carregarShow);
  const entrar = useServerFn(entrarComUsuario);
  const [chave, setChave] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const aplicar = async (keygen: string) => {
    const r = await baixar({ data: { keygen } });
    writeData(r.dados);
    salvarBanda(r.banda);
    toast.success(
      `${r.banda}: ${r.dados.songs.length} música(s) e ${r.dados.setlists.length} repertório(s) carregados.`,
    );
    navigate({ to: "/" });
  };

  const porChave = async () => {
    if (!chave.trim()) {
      toast.error("Informe a chave do show.");
      return;
    }
    setCarregando(true);
    try {
      await aplicar(chave);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível carregar.");
    } finally {
      setCarregando(false);
    }
  };

  const porLogin = async () => {
    if (!usuario.trim() || !senha) {
      toast.error("Informe usuário e senha.");
      return;
    }
    setCarregando(true);
    try {
      const r = await entrar({ data: { usuario, senha } });
      await aplicar(r.keygen);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <PageShell title="Carregar show" subtitle="Baixa músicas e repertórios da banda">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          {banda
            ? `Aparelho carregado com: ${banda}. Carregar outra chave troca todo o conteúdo pelo da nova banda.`
            : "Este aparelho está vazio. Use a chave da banda, seu login ou um arquivo de backup para carregar o show do dia."}
        </p>
        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <KeyRoundIcon className="size-4" /> Chave do show
          </h2>
          <Input
            value={chave}
            onChange={(e) => setChave(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            className="h-12 text-center text-base tracking-widest"
          />
          <Button onClick={porChave} disabled={carregando} className="h-12 rounded-xl font-bold">
            <DownloadCloudIcon /> Carregar show
          </Button>
        </section>

        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <UserRoundIcon className="size-4" /> Entrar com usuário
          </h2>
          <Input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Usuário"
            autoComplete="username"
            className="h-12 text-base"
          />
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            autoComplete="current-password"
            className="h-12 text-base"
          />
          <Button
            onClick={porLogin}
            disabled={carregando}
            variant="secondary"
            className="h-12 rounded-xl font-bold"
          >
            Entrar e carregar
          </Button>
        </section>

        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <FileUpIcon className="size-4" /> Arquivo de backup
          </h2>
          <p className="text-sm text-muted-foreground">
            Recebeu um arquivo JSON/CSV da banda? Importe por aqui.
          </p>
          <Link to="/dados">
            <Button variant="secondary" className="h-12 w-full rounded-xl font-bold">
              Abrir Exportar / Importar
            </Button>
          </Link>
        </section>

        <section className="surface-tile flex flex-col gap-3 rounded-2xl border border-border p-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <EraserIcon className="size-4" /> Trocar de banda
          </h2>
          <p className="text-sm text-muted-foreground">
            Limpa todo o conteúdo deste aparelho e deixa o app zerado, pronto para carregar outra
            banda.
          </p>
          <Button
            variant="destructive"
            className="h-12 rounded-xl font-bold"
            onClick={() => {
              if (!window.confirm("Apagar todas as músicas e repertórios deste aparelho?")) return;
              writeData({ songs: [], setlists: [] });
              salvarBanda("");
              toast.success("Aparelho limpo. Carregue a chave da próxima banda.");
            }}
          >
            Limpar este aparelho
          </Button>
        </section>

        <p className="text-xs text-muted-foreground">
          Atenção: carregar um show substitui as músicas e repertórios salvos neste aparelho. Faça
          um backup em Exportar / Importar antes, se precisar.
        </p>
      </div>
    </PageShell>
  );
}
