import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { DownloadCloudIcon, KeyRoundIcon, UserRoundIcon } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { carregarShow, entrarComUsuario } from "@/lib/nuvem.functions";
import { writeData } from "@/lib/repertorio-store";
import { salvarBanda } from "@/lib/banda-local";

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

        <p className="text-xs text-muted-foreground">
          Atenção: carregar um show substitui as músicas e repertórios salvos neste aparelho. Faça
          um backup em Exportar / Importar antes, se precisar.
        </p>
      </div>
    </PageShell>
  );
}
