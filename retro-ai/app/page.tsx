export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-6xl font-bold">Retro AI</h1>
        <p className="text-xl text-muted-foreground">
          Agile retrospectives made simple
        </p>
        <div className="flex gap-4">
          <a
            href="/login"
            className="rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </a>
          <a
            href="/about"
            className="rounded-md border border-input px-6 py-3 hover:bg-accent"
          >
            Learn More
          </a>
        </div>
      </main>
    </div>
  );
}