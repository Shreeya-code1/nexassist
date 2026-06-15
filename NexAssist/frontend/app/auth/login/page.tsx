import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="auth-shell flex min-h-screen flex-col items-center justify-center bg-[#030608] px-4">
      <div className="mb-6 text-2xl font-bold text-gradient">Kairo</div>
      <div className="auth-card-shell w-full max-w-sm">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
