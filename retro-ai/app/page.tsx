import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="mx-auto max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Retro AI</h1>
          <p className="text-muted-foreground">
            Collaborative retrospectives for agile teams
          </p>
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Login</h2>
          <p className="text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <LoginForm showTitle={false} showSignUpLink={true} />
      </div>
    </div>
  );
}