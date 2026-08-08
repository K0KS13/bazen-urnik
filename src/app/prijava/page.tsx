import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");

  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-5">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Bazen Bar &amp; BBQ</h1>
        <p className="mt-1 text-sm text-muted">Urnik in evidenca ur</p>
      </header>

      {employees.length === 0 ? (
        <div className="card text-center text-sm text-muted">
          V bazi ni nobenega zaposlenega. Zaženi{" "}
          <code className="text-foreground">npm run db:seed</code>, da ustvariš
          prvi račun vodstva.
        </div>
      ) : (
        <LoginForm employees={employees} />
      )}
    </main>
  );
}
