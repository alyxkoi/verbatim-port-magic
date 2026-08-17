import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { signIn, requestPasswordReset } from "@/lib/auth.functions";
import loginCss from "../styles/console-login.css?url";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Alyx Lab" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Alyx Lab operator console sign in." },
      { property: "og:title", content: "Sign in · Alyx Lab" },
      { property: "og:description", content: "Alyx Lab operator console sign in." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://xlpclvovydtuxbssetga.supabase.co" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: loginCss },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        void router.navigate({ to: "/console", replace: true });
      }
    });

    const form = document.getElementById("loginForm") as HTMLFormElement;
    const email = document.getElementById("email") as HTMLInputElement;
    const password = document.getElementById("password") as HTMLInputElement;
    const emailError = document.getElementById("emailError") as HTMLElement;
    const passwordError = document.getElementById("passwordError") as HTMLElement;
    const submit = document.getElementById("submit") as HTMLButtonElement;
    const submitStatus = document.getElementById("submitStatus") as HTMLElement;
    const alertBox = document.getElementById("alert") as HTMLElement;
    const alertText = document.getElementById("alertText") as HTMLElement;
    const reveal = document.getElementById("reveal") as HTMLButtonElement;
    const revealIcon = document.getElementById("revealIcon") as unknown as SVGElement;
    const forgot = document.getElementById("forgot") as HTMLAnchorElement;
    const backHome = document.getElementById("backHome") as HTMLAnchorElement;

    const EYE =
      '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>';
    const EYE_OFF =
      '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.7 9.7 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.4 4.1"/><path d="M6.5 7.6A17 17 0 0 0 2 12s3.6 6.5 10 6.5a9.6 9.6 0 0 0 3.7-.7"/><path d="M9.6 9.7a2.6 2.6 0 0 0 3.6 3.6"/>';

    // Attempt limiting is a real control, so it is enforced here rather than implied.
    // The authoritative limit lives on the server; this mirrors it for feedback.
    const MAX_ATTEMPTS = 5;
    const LOCK_MS = 30000;
    let attempts = 0;
    let lockedUntil = 0;
    let busy = false;
    let lockTimer: ReturnType<typeof setTimeout> | null = null;

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function showAlert(tone: string, message: string) {
      alertBox.dataset["tone"] = tone;
      alertText.textContent = message;
      alertBox.classList.add("is-shown");
    }
    function clearAlert() {
      alertBox.classList.remove("is-shown");
      alertText.textContent = "";
    }

    function setFieldError(input: HTMLInputElement, node: HTMLElement, message: string) {
      node.textContent = message;
      input.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function validate() {
      let ok = true;
      const value = email.value.trim();
      if (!value) {
        setFieldError(email, emailError, "Enter your email.");
        ok = false;
      } else if (!EMAIL_RE.test(value)) {
        setFieldError(email, emailError, "That does not look like an email.");
        ok = false;
      } else setFieldError(email, emailError, "");

      if (!password.value) {
        setFieldError(password, passwordError, "Enter your password.");
        ok = false;
      } else setFieldError(password, passwordError, "");
      return ok;
    }

    function setBusy(state: boolean) {
      busy = state;
      submit.classList.toggle("is-busy", state);
      submit.disabled = state || Date.now() < lockedUntil;
      submitStatus.textContent = state ? "Signing in" : "";
    }

    function startLock(seconds = LOCK_MS / 1000) {
      lockedUntil = Date.now() + seconds * 1000;
      submit.disabled = true;
      const tick = () => {
        const left = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (left > 0) {
          showAlert("locked", `Too many attempts. Try again in ${left} second${left === 1 ? "" : "s"}.`);
          lockTimer = setTimeout(tick, 1000);
        } else {
          if (lockTimer) clearTimeout(lockTimer);
          lockTimer = null;
          attempts = 0;
          lockedUntil = 0;
          submit.disabled = false;
          clearAlert();
        }
      };
      tick();
    }

    async function onSubmit(event: Event) {
      event.preventDefault();
      if (busy || Date.now() < lockedUntil) return;
      clearAlert();
      if (!validate()) {
        (email.getAttribute("aria-invalid") === "true" ? email : password).focus();
        return;
      }

      setBusy(true);
      let result: Awaited<ReturnType<typeof signIn>> | null = null;
      try {
        result = await signIn({ data: { email: email.value, password: password.value } });
      } catch {
        setBusy(false);
        showAlert("error", "Could not reach the server. Check your connection and try again.");
        return;
      }
      setBusy(false);

      if (result.ok && "access_token" in result) {
        attempts = 0;
        const { error } = await supabase.auth.setSession({
          access_token: result.access_token as string,
          refresh_token: result.refresh_token as string,
        });
        if (error) {
          showAlert("error", "Could not reach the server. Check your connection and try again.");
          return;
        }
        showAlert("ok", "Signed in. Opening the console.");
        submit.disabled = true;
        void router.navigate({ to: "/console", replace: true });
        return;
      }

      attempts += 1;
      password.value = "";
      // Never reveal which half was wrong.
      if (result.locked || attempts >= MAX_ATTEMPTS) {
        startLock(result.retryAfter || LOCK_MS / 1000);
        return;
      }
      const left = result.attemptsLeft ?? MAX_ATTEMPTS - attempts;
      showAlert("error", `That email and password do not match. ${left} attempt${left === 1 ? "" : "s"} left.`);
      password.focus();
    }

    function onReveal() {
      const showing = password.type === "text";
      password.type = showing ? "password" : "text";
      reveal.setAttribute("aria-pressed", String(!showing));
      reveal.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      revealIcon.innerHTML = showing ? EYE : EYE_OFF;
      password.focus();
    }

    function onInput(this: HTMLInputElement) {
      if (this.getAttribute("aria-invalid") === "true") {
        setFieldError(this, this === email ? emailError : passwordError, "");
      }
      if (alertBox.dataset["tone"] === "error") clearAlert();
    }

    async function onForgot(event: Event) {
      event.preventDefault();
      const value = email.value.trim();
      if (!value || !EMAIL_RE.test(value)) {
        setFieldError(email, emailError, "Enter your email first and we will send a reset link.");
        email.focus();
        return;
      }
      try {
        await requestPasswordReset({
          data: { email: value, redirectTo: `${window.location.origin}/reset-password` },
        });
      } catch {
        // Same message either way, so the form cannot be used to discover accounts.
      }
      showAlert("ok", "If that email has an account, a reset link is on its way.");
    }

    function onBackHome(event: Event) {
      event.preventDefault();
      window.location.href = "https://alyxlab.com";
    }

    form.addEventListener("submit", onSubmit);
    reveal.addEventListener("click", onReveal);
    email.addEventListener("input", onInput);
    password.addEventListener("input", onInput);
    forgot.addEventListener("click", onForgot);
    backHome.addEventListener("click", onBackHome);

    const raf = requestAnimationFrame(() => email.focus());

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (lockTimer) clearTimeout(lockTimer);
      form.removeEventListener("submit", onSubmit);
      reveal.removeEventListener("click", onReveal);
      email.removeEventListener("input", onInput);
      password.removeEventListener("input", onInput);
      forgot.removeEventListener("click", onForgot);
      backHome.removeEventListener("click", onBackHome);
    };
  }, [router]);

  return (
    <div className="login-page">
      <div className="backdrop" aria-hidden="true"></div>

      <main className="shell">
        <section className="card">
          <div className="card-head">
            <img className="brand-mark" src="/img/logo.png" alt="Alyx Lab" width="1500" height="1500" />
            <p>Sign in to the console.</p>
          </div>

          <div className="alert" id="alert" role="alert" aria-live="assertive">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.01" />
            </svg>
            <span id="alertText"></span>
          </div>

          <form id="loginForm" noValidate>
            <div className="fields">
              <div className="field">
                <label htmlFor="email">Email</label>
                <div className="field-shell">
                  <input
                    className="input"
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    placeholder="you@alyxlab.com"
                    required
                    aria-describedby="emailError"
                  />
                </div>
                <p className="field-error" id="emailError" aria-live="polite"></p>
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="field-shell has-reveal">
                  <input
                    className="input"
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    required
                    aria-describedby="passwordError"
                  />
                  <button
                    className="reveal"
                    id="reveal"
                    type="button"
                    aria-label="Show password"
                    aria-pressed="false"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" id="revealIcon">
                      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
                      <circle cx="12" cy="12" r="2.6" />
                    </svg>
                  </button>
                </div>
                <p className="field-error" id="passwordError" aria-live="polite"></p>
              </div>
            </div>

            <div className="row">
              <label className="remember" htmlFor="remember">
                <input type="checkbox" id="remember" name="remember" />
                <span className="box" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12.5 9.5 18 20 6.5" />
                  </svg>
                </span>
                <span>Keep me signed in</span>
              </label>
              <a className="link" href="#" id="forgot">
                Forgot password
              </a>
            </div>

            <button className="submit" id="submit" type="submit">
              <span className="label">Sign in</span>
              <span className="spinner" aria-hidden="true"></span>
              <span className="sr-only" id="submitStatus" aria-live="polite"></span>
            </button>
          </form>

          <div className="foot">
            <p>This console is for Alyx Lab only. Clients never sign in here.</p>
          </div>
        </section>

        <div className="back-wrap">
          <a className="back" href="#" id="backHome">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            Back to alyxlab.com
          </a>
        </div>
      </main>
    </div>
  );
}
