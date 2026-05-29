import Workspace from "@/components/Workspace";

export default function Home() {
  return (
    <main className="mx-auto flex h-screen max-w-3xl flex-col px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Chat with your documents</h1>
        <p className="text-sm text-gray-500">
          Upload a PDF or text file, then ask questions. Answers are grounded in
          your documents using retrieval-augmented generation (RAG).
        </p>
      </header>
      <Workspace />
    </main>
  );
}
