"use client";

import { startTransition, useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

type EmployeeOption = { id: string; firstName: string; lastName: string };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function LoginForm({ employees }: { employees: EmployeeOption[] }) {
  const [selected, setSelected] = useState<EmployeeOption | null>(null);
  const [pin, setPin] = useState("");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  /**
   * Ob četrti števki prijavo oddamo sami in polje takoj spraznimo — tako po
   * zavrnjenem PIN-u ni treba nič brisati in lahko takoj poskusi znova.
   */
  function press(digit: string): void {
    if (pending || !selected) return;

    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length < 4) return;

    const data = new FormData();
    data.set("employeeId", selected.id);
    data.set("pin", next);
    startTransition(() => formAction(data));
    setPin("");
  }

  if (!selected) {
    return (
      <div className="card">
        <p className="label">Izberi svoje ime</p>
        <div className="grid grid-cols-2 gap-2">
          {employees.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => setSelected(employee)}
              className="btn-secondary flex-col !items-start gap-0 py-3 text-left"
            >
              <span className="text-base leading-tight">{employee.firstName}</span>
              <span className="text-xs font-normal text-muted">
                {employee.lastName}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="text-center">
        <p className="text-lg font-semibold">
          {selected.firstName} {selected.lastName}
        </p>
        <p className="text-sm text-muted">Vnesi svoj PIN</p>
      </div>

      <div className="flex justify-center gap-3" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-4 w-4 rounded-full border-2 transition-colors ${
              index < pin.length
                ? "border-accent bg-accent"
                : "border-border bg-transparent"
            }`}
          />
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="text-center text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={pending}
            onClick={() => press(key)}
            className="btn-secondary py-5 text-2xl"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setPin("");
          }}
          className="btn-secondary py-5 text-sm"
        >
          Nazaj
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => press("0")}
          className="btn-secondary py-5 text-2xl"
        >
          0
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setPin((current) => current.slice(0, -1))}
          className="btn-secondary py-5 text-xl"
          aria-label="Zbriši zadnjo števko"
        >
          ⌫
        </button>
      </div>

      {pending ? (
        <p className="text-center text-sm text-muted">Prijavljam …</p>
      ) : null}
    </div>
  );
}
