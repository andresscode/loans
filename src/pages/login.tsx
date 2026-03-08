import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { LoginForm } from "@/components/blocks/login-form";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleSubmit(username: string, password: string) {
    const result = login(username, password);
    if (result.success) {
      navigate("/");
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm onLogin={handleSubmit} />
      </div>
    </div>
  );
}
