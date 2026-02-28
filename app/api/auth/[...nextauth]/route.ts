import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// @ts-ignore: Suprime el error ts(7016) para evitar advertencias en VS Code
import bcrypt from "bcrypt"; 
import prisma from "@/lib/prisma";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Por favor ingresa tu email y contraseña");
        }

        // Buscamos al usuario en la base de datos de Supabase vía Prisma
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error("No existe una cuenta con este correo registrado en el sistema");
        }

        // Comparamos la contraseña encriptada
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Contraseña incorrecta");
        }

        // Retornamos los datos que se guardarán en la sesión (JWT)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: { 
    signIn: "/login" // Redirige a tu página de login personalizada
  }
};

// Exportación correcta para Next.js App Router (Rutas API)
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };