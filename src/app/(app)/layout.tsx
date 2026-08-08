import { NavLink } from "@/components/nav-link";
import { logoutAction } from "@/lib/actions/auth";
import { canManageEmployees, canManageSchedule, ROLE_LABELS } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary px-3 py-2 text-sm">
            Odjava
          </button>
        </form>
      </header>

      <nav className="flex gap-1 border-b border-border px-2 py-2">
        <NavLink href="/" label="Ura" />
        <NavLink href="/urnik" label="Urnik" />
        <NavLink href="/ure" label="Moje ure" />
        {canManageSchedule(user.role) ? (
          <NavLink href="/izvoz" label="Izvoz" />
        ) : null}
        {canManageEmployees(user.role) ? (
          <NavLink href="/zaposleni" label="Ekipa" />
        ) : null}
      </nav>

      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
