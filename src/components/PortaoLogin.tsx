import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { EyeIcon, EyeOffIcon, LockIcon, MusicIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { entrarComUsuario } from "@/lib/nuvem.functions";
import { salvarBanda, salvarConta, useConta } from "@/lib/banda-local";

export function PortaoLogin({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { conta, pronto } = useConta();

  if (pathname.startsWith("/adm")) return <>{children}</>;
  if (!pronto) return null;
  if (conta) return <>{children}</>;
  return <TelaLogin />;
}

function TelaLogin() {
  const entrar = useServerFn(entrarComUsuario);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const acessar = async () => {
    if (!usuario.trim() || !senha) {
      toast.error("Informe usuário e senha.");
      return;
    }
    setOcupado(true);
    try {
      const r = await entrar({ data: { usuario: usuario.trim(), senha } });
      salvarBanda(r.banda);
      salvarConta({
        usuario: usuario.trim().toLowerCase(),
        senha,
        banda: r.banda,
        podeApagar: r.podeApagar,
        podeBackup: r.podeBackup,
      });
      toast.success(`Bem-vindo! Banda ${r.banda}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Usuário ou senha inválidos.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center bg-background px-5 py-12">
      <div className="mx-auto w-full max-w-sm">
        <header className="text-center">
          <span className="gradient-accent mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl text-accent-foreground">
            <MusicIcon className="size-7" strokeWidth={2.4} />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Repertório Fácil
          </h1>
          <p className="mt-1 font-semibold text-primary">Bruno Capriolli</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com o usuário e a senha que o administrador criou para você.
          </p>
        </header>

        <div className="surface-tile mt-8 flex flex-col gap-3 rounded-2xl border border-border p-5">
          <Input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Usuário"
            autoComplete="username"
            className="h-12 text-base"
          />
          <div className="relative">
            <Input
              type={ver ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") acessar();
              }}
              placeholder="Senha"
              autoComplete="current-password"
              className="h-12 pr-12 text-base"
            />
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {ver ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
            </button>
          </div>
          <Button
            onClick={acessar}
            disabled={ocupado}
            className="h-13 rounded-xl py-4 text-base font-bold"
          >
            ENTRAR
          </Button>
        </div>

        <Link
          to="/adm"
          className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <LockIcon className="size-4" /> Área do administrador
        </Link>
      </div>
    </main>
  );
}
