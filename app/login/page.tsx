"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

const initialState = null;

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-screen bg-[#FBF3E6] dark:bg-[#120f0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p
            className="text-2xl leading-tight"
            style={{ fontFamily: '"Rooftop", sans-serif', fontWeight: 800 }}
          >
            <span className="text-[#ff4e00]">Додо Пицца</span>
            <br />
            <span className="text-[#120f0c] dark:text-[#FBF3E6]">МАФРЕСТ</span>
          </p>
          <p className="mt-2 text-sm text-[#7d6f5e] dark:text-[#a0907a]">
            Войдите, чтобы открыть аналитику
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {state.error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs uppercase tracking-widest text-[#7d6f5e] dark:text-[#a0907a] mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-[#ddd0b5] dark:border-[#3d352c] bg-white dark:bg-[#1e1710] text-[#120f0c] dark:text-[#FBF3E6] text-sm px-3 py-2.5 outline-none focus:border-[#ff4e00] transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-widest text-[#7d6f5e] dark:text-[#a0907a] mb-1.5"
            >
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-[#ddd0b5] dark:border-[#3d352c] bg-white dark:bg-[#1e1710] text-[#120f0c] dark:text-[#FBF3E6] text-sm px-3 py-2.5 outline-none focus:border-[#ff4e00] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-[#ff4e00] text-white text-sm font-medium py-2.5 hover:bg-[#e04500] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
