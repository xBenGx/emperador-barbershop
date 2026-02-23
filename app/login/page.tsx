"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    // Redirección inteligente según el rol
    const session = await getSession();
    
    if (session?.user?.role === "BARBER") {
      router.push("/barber"); 
    } else if (session?.user?.role === "ADMIN") {
      router.push("/admin"); 
    } else {
      router.push("/client/book"); 
    }
    
    router.refresh(); 
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-zinc-50 tracking-tight">
            EMPERADOR <span className="text-amber-500">LOGIN</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Contraseña</label>
            <input
              name="password"
              type="password"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-3 px-4 rounded-md transition-colors flex justify-center items-center"
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}