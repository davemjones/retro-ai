import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginForm 
        showTitle={true}
        showSignUpLink={true}
        title="Retro AI"
        description="Collaborative retrospectives for agile teams"
      />
    </div>
  );
}