import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type LoginFormProps = React.ComponentProps<"div"> & {
  mode?: "login" | "setup";
  onLogin?: (username: string, password: string) => void;
  onSetup?: (username: string, password: string, displayName: string) => void;
};

export function LoginForm({ className, mode = "login", onLogin, onSetup, ...props }: LoginFormProps) {
  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    const form = e.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    if (mode === "setup") {
      const displayName = (form.elements.namedItem("displayName") as HTMLInputElement).value;
      onSetup?.(username, password, displayName);
    } else {
      onLogin?.(username, password);
    }
  }

  const isSetup = mode === "setup";

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isSetup ? "Configura tu cuenta" : "Inicia sesión en tu cuenta"}
          </CardTitle>
          <CardDescription>
            {isSetup
              ? "Crea tus credenciales para comenzar a usar la aplicación"
              : "Ingresa tu usuario para iniciar sesión"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {isSetup && (
                <Field>
                  <FieldLabel htmlFor="displayName">Nombre</FieldLabel>
                  <Input id="displayName" type="text" required />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="username">Usuario</FieldLabel>
                <Input id="username" type="text" required />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                </div>
                <Input id="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit">
                  {isSetup ? "Crear cuenta" : "Iniciar sesión"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
