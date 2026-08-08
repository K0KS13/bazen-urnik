"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import type { ActionState } from "@/lib/actions/time";

/**
 * Obrazec, ki pokliče strežniško akcijo in pod seboj izpiše njen odgovor.
 * Med izvajanjem so vsa polja onemogočena, da dvojni klik ne ustvari dveh vnosov.
 */
export function ActionForm({
  action,
  className,
  confirm,
  children,
}: {
  action: (formData: FormData) => Promise<ActionState>;
  className?: string;
  /** Če je podano, se pred oddajo prikaže potrditveno okno s tem besedilom. */
  confirm?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_previous, formData) => action(formData),
    {},
  );

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>

      {state.error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="mt-2 text-sm font-medium text-accent">
          {state.ok}
        </p>
      ) : null}
    </form>
  );
}
