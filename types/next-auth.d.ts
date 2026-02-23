import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "ADMIN" | "BARBER" | "CLIENT";
  }
  interface Session {
    user: User & {
      id: string;
      role: "ADMIN" | "BARBER" | "CLIENT";
    };
  }
}