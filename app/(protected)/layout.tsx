import type { ReactNode } from "react";
import AdminGuard from "../../components/AdminGuard";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
