import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { entrarComUsuario, marcarPresenca, removerPresenca } from "@/lib/nuvem.functions";
import { salvarBanda, salvarConta, useConta, type Conta } from "@/lib/banda-local";
import { prepararDados } from "@/lib/repertorio-store";

export function PortaoLogin({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { conta, pronto } = useConta();
  const [dadosProntos, setDadosProntos] = useState(false);
  const [erroDados, setErroDados] = useState("");

  useEffect(() => {
    prepararDados().then(() => setDadosProntos(true)).catch((e) => setErroDados(e.message));
  }, []);

  if (erroDados) return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">{erroDados}</main>;
  if (!dadosProntos) return null;

  if (pathname.startsWith("/adm")) return <>{children}</>;
  if (!pronto) return null;
  if (conta) return <><Presenca conta={conta} />{children}</>;
  return <TelaLogin />;
}

function Presenca({ conta }: { conta: Conta }) {
  const marcar = useServerFn(marcarPresenca);
  const remover = useServerFn(removerPresenca);

  useEffect(() => {
    const sessaoId = crypto.randomUUID();
    const credenciais = { usuario: conta.usuario, senha: conta.senha, sessaoId };
    const atualizar = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void marcar({ data: credenciais }).catch(() => {});
      }
    };
    const visibilidade = () => {
      if (document.visibilityState === "hidden") {
        void remover({ data: credenciais }).catch(() => {});
      } else atualizar();
    };
    atualizar();
    const intervalo = window.setInterval(atualizar, 30_000);
    document.addEventListener("visibilitychange", visibilidade);
    window.addEventListener("online", atualizar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", visibilidade);
      window.removeEventListener("online", atualizar);
      void remover({ data: credenciais }).catch(() => {});
    };
  }, [conta.usuario, conta.senha, marcar, remover]);

  return null;
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
        podeEditar: r.podeEditar,
        podeAgenda: r.podeAgenda,
        podeAdicionarShows: r.podeAdicionarShows,
      });
      toast.success(`Bem-vindo! Banda ${r.banda}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Usuário ou senha inválidos.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center bg-muted/40 px-5 py-12">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="px-6 pt-10 pb-6 sm:px-8">
        <header className="text-center">
          <img
            src="/multivibe-logo.jpg"
            alt="Logotipo Multivibe"
            className="mx-auto mb-5 size-32 object-contain"
          />
          <h1 className="text-2xl font-extrabold text-primary">
            Repertório Fácil Pro
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com o usuário e a senha que o administrador criou para você.
          </p>
          <p className="mt-4 text-xs text-muted-foreground/80">
            Desenvolvido por Bruno Capriolli | ® Direitos Reservados
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-4">
          <Input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Usuário"
            autoComplete="username"
            className="h-12 rounded-lg bg-background text-base text-foreground"
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
              className="h-12 rounded-lg bg-background pr-12 text-base text-foreground"
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
            className="h-13 rounded-lg py-4 text-base font-bold shadow-md"
          >
            ENTRAR
          </Button>
        </div>

        </div>
        <Link
          to="/adm"
          className="flex items-center justify-center gap-2 border-t border-border bg-muted/50 px-6 py-4 text-sm text-foreground transition-colors hover:text-primary"
        >
          <LockIcon className="size-4" /> Área do administrador
        </Link>
      </div>
    </main>
  );
}
