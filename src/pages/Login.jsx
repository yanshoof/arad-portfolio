import React, { useState } from "react";
import { TrendingUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const { login, authError } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError("");
    try {
      await login(password);
    } catch (err) {
      setError(err.status === 401 ? "Wrong password" : err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const serverDown = authError && authError.type !== "auth_required";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-gray-100 border-b-8 border-gray-300 px-4 md:px-8 py-4 md:py-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-none flex items-center justify-center shadow-2xl border-4 border-gray-700">
            <TrendingUp className="w-7 h-7 md:w-10 md:h-10 text-white" />
          </div>
          <h1 className="text-xl md:text-3xl font-black text-gray-900">Portfolio Tracker</h1>
        </div>
      </header>

      <main className="flex-1 flex items-start md:items-center justify-center p-4 md:p-8">
        <form
          onSubmit={submit}
          className="w-full max-w-md bg-white border-4 border-gray-900 p-6 md:p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-8 h-8 text-gray-900" />
            <h2 className="text-3xl font-black text-gray-900">LOG IN</h2>
          </div>

          <label htmlFor="password" className="text-xl font-black text-gray-900 mb-2 block">
            PASSWORD
          </label>
          <Input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-xl font-bold rounded-none border-4 border-gray-300 h-14 mb-4"
          />

          {(error || serverDown) && (
            <div className="bg-red-50 border-4 border-red-600 text-red-700 font-bold text-lg px-4 py-3 mb-4">
              {error || authError.message}
            </div>
          )}

          <Button
            type="submit"
            disabled={busy || !password}
            className="w-full bg-gray-900 text-white hover:bg-gray-700 text-2xl font-black h-14 rounded-none border-4 border-gray-900"
          >
            {busy ? "CHECKING..." : "ENTER"}
          </Button>
        </form>
      </main>
    </div>
  );
}
