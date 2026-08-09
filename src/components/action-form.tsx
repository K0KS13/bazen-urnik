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
  resetKey,
  children,
}: {
  action: (formData: FormData) => Promise<ActionState>;
  className?: string;
  /** Če je podano, se pred oddajo prikaže potrditveno okno s tem besedilom. */
  confirm?: string;
  /**
   * Podpis shranjenega stanja, ki ga obrazec prikazuje (npr. datum zadnje
   * spremembe ali seznam ocen). Ko se spremeni, se polja ponovno priklopijo in
   * prevzamejo novo shranjeno vrednost.
   *
   * Brez tega React po oddaji obrazca izbirnikom in potrditvenim poljem povrne
   * vrednost, ki so jo imela ob priklopu, zato je videti, kot da se shranjeni
   * podatki niso spremenili. Ključ je na `fieldset`, ne na obrazcu, da pri tem
   * ne izgubimo izpisanega odgovora strežnika.
   */
  resetKey?: string;
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
      <fieldset key={resetKey} disabled={pending} className="contents">
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
