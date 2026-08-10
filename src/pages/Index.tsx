import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    document.documentElement.classList.add("js");

    /* ---- cleanup tracking (StrictMode double invoke safe) ---- */
    const offs: Array<() => void> = [];
    const on = (
      target: EventTarget,
      type: string,
      fn: EventListenerOrEventListenerObject,
      opts?: boolean | AddEventListenerOptions,
    ) => {
      target.addEventListener(type, fn, opts);
      offs.push(() => target.removeEventListener(type, fn, opts));
    };
    const frames = new Set<number>();
    const raf = (fn: FrameRequestCallback) => {
      const id = requestAnimationFrame((t) => {
        frames.delete(id);
        fn(t);
      });
      frames.add(id);
      return id;
    };
    const cancelRaf = (id: number | null) => {
      if (id != null) {
        frames.delete(id);
        cancelAnimationFrame(id);
      }
    };
    const observers: IntersectionObserver[] = [];
    const mkIO = (cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) => {
      const o = new IntersectionObserver(cb, opts);
      observers.push(o);
      return o;
    };
    const intervals = new Set<ReturnType<typeof setInterval>>();
    const mkInterval = (fn: () => void, ms: number) => {
      const id = setInterval(fn, ms);
      intervals.add(id);
      return id;
    };
    const clear = (id: ReturnType<typeof setInterval> | null) => {
      if (id) {
        clearInterval(id);
        intervals.delete(id);
      }
    };

    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;

    const io = mkIO(
      (e) => {
        e.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add("in");
            io.unobserve(x.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll<HTMLElement>(".rv").forEach((el, i) => {
      el.style.transitionDelay = Math.min(i % 4, 3) * 60 + "ms";
      io.observe(el);
    });

    /* image slots: fill data-src and the placeholder swaps out */
    document.querySelectorAll<HTMLElement>(".shot").forEach((s) => {
      const src = (s.dataset.src || "").trim(),
        img = s.querySelector("img")!;
      if (!src) return;
      on(img, "load", () => s.classList.add("loaded"));
      img.src = src;
    });

    /* shared spotlight for the glow cards, desktop only */
    if (matchMedia("(pointer:fine)").matches && !reduce) {
      const root = document.documentElement;
      let pf: number | null = null,
        px = 0,
        py = 0;
      on(
        window,
        "pointermove",
        (ev) => {
          const e = ev as PointerEvent;
          px = e.clientX;
          py = e.clientY;
          if (pf) return;
          pf = raf(() => {
            root.style.setProperty("--x", px.toFixed(1));
            root.style.setProperty("--y", py.toFixed(1));
            root.style.setProperty("--xp", (px / innerWidth).toFixed(3));
            root.style.setProperty("--yp", (py / innerHeight).toFixed(3));
            pf = null;
          });
        },
        { passive: true },
      );
      offs.push(() => cancelRaf(pf));
    }

    /* hero bubbles · pause when the hero leaves the screen, and a cursor
       following blob on desktop. Eased follow stands in for the spring. */
    (() => {
      const wrap = document.getElementById("bubbles"),
        hero = document.getElementById("top");
      if (!wrap || !hero) return;
      hero.classList.add("bg");
      mkIO((e) => hero.classList.toggle("paused", !e[0].isIntersecting), { threshold: 0 }).observe(
        hero,
      );
      const cur = document.getElementById("bubcursor");
      if (!cur || reduce || !matchMedia("(pointer:fine)").matches) return;
      cur.style.display = "block";
      let tx = 0,
        ty = 0,
        cx = 0,
        cy = 0,
        bf: number | null = null;
      const tick = () => {
        cx += (tx - cx) * 0.075;
        cy += (ty - cy) * 0.075;
        cur.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
        bf = Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4 ? raf(tick) : null;
      };
      on(
        hero,
        "pointermove",
        (ev) => {
          const e = ev as PointerEvent;
          const r = hero.getBoundingClientRect();
          tx = e.clientX - (r.left + r.width / 2);
          ty = e.clientY - (r.top + r.height / 2);
          if (!bf) bf = raf(tick);
        },
        { passive: true },
      );
      offs.push(() => cancelRaf(bf));
    })();

    /* product viewer tabs */
    const tabs = document.getElementById("tabs");

    /* scroll cue · driven by actual overflow, so it never shows when the strip fits */
    if (tabs) {
      const tw = tabs.closest(".tabswrap"),
        cue = tw && tw.querySelector(".tabcue");
      if (tw) {
        const sync = () =>
          tw.classList.toggle("more", tabs.scrollWidth - tabs.clientWidth - tabs.scrollLeft > 4);
        sync();
        on(tabs, "scroll", sync, { passive: true });
        on(window, "resize", sync, { passive: true });
        if (cue)
          on(cue, "click", () =>
            tabs.scrollBy({
              left: Math.round(tabs.clientWidth * 0.6),
              behavior: reduce ? "auto" : "smooth",
            }),
          );
      }
    }

    if (tabs) {
      const tl = [...tabs.querySelectorAll<HTMLElement>(".tab")],
        pl = [...document.querySelectorAll<HTMLElement>(".pane")];
      const pick = (k?: string) => {
        tl.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.t === k)));
        pl.forEach((p) => p.classList.toggle("on", p.dataset.p === k));
      };
      tl.forEach((t, i) => {
        on(t, "click", () => pick(t.dataset.t));
        on(t, "keydown", (e) => {
          const ev = e as KeyboardEvent;
          if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
          ev.preventDefault();
          const n = tl[(i + (ev.key === "ArrowRight" ? 1 : -1) + tl.length) % tl.length];
          n.focus();
          pick(n.dataset.t);
        });
      });
    }

    /* phone deck · auto rotates, click a phone or a dot to bring it to the front */
    const deck = document.getElementById("pdeck");
    if (deck) {
      const cards = [...deck.querySelectorAll<HTMLElement>(".pmock")],
        dots = [...document.querySelectorAll<HTMLElement>("#pdots .pdot")],
        N = cards.length,
        SLOT = [0, 1, -1] /* position in the cycle -> where it sits */,
        DELAY = 4200;
      let idx = 0,
        timer: ReturnType<typeof setInterval> | null = null;

      function place(animate: boolean) {
        cards.forEach((c, i) => {
          const slot = SLOT[(((i - idx) % N) + N) % N],
            prev = c.dataset.slot === undefined ? null : +c.dataset.slot;
          /* a card moving between the two side slots would fly across the middle,
             so hop it over while it is invisible instead */
          if (animate && prev !== null && Math.abs(slot - prev) > 1) {
            c.style.transition = "none";
            c.style.opacity = "0";
            c.dataset.slot = String(slot);
            void c.offsetWidth;
            c.style.transition = "";
            c.style.opacity = "";
          } else {
            c.dataset.slot = String(slot);
          }
        });
        dots.forEach((d, i) => d.setAttribute("aria-current", i === idx ? "true" : "false"));
      }
      const go = (n: number, animate?: boolean) => {
        idx = ((n % N) + N) % N;
        place(animate !== false);
      };
      const stop = () => {
        if (timer) {
          clear(timer);
          timer = null;
        }
      };
      const start = () => {
        stop();
        if (!reduce) timer = mkInterval(() => go(idx + 1), DELAY);
      };

      /* dragX lets a swipe swallow the click that follows it */
      let dragX = 0,
        downX = 0,
        downY = 0,
        down = false;
      cards.forEach((c, i) =>
        on(c, "click", () => {
          if (dragX > 10) return;
          go(i);
          start();
        }),
      );
      dots.forEach((d, i) =>
        on(d, "click", () => {
          go(i);
          start();
        }),
      );

      /* swipe to rotate. No preventDefault, and horizontal has to beat vertical,
         so this never interferes with scrolling the page. */
      on(
        deck,
        "pointerdown",
        (e) => {
          down = true;
          dragX = 0;
          downX = (e as PointerEvent).clientX;
          downY = (e as PointerEvent).clientY;
        },
        { passive: true },
      );
      on(
        window,
        "pointermove",
        (e) => {
          if (down) dragX = Math.max(dragX, Math.abs((e as PointerEvent).clientX - downX));
        },
        { passive: true },
      );
      on(
        window,
        "pointerup",
        (e) => {
          if (!down) return;
          down = false;
          const dx = (e as PointerEvent).clientX - downX,
            dy = (e as PointerEvent).clientY - downY;
          if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy)) {
            go(idx + (dx < 0 ? 1 : -1));
            start();
          }
        },
        { passive: true },
      );
      on(
        window,
        "pointercancel",
        () => {
          down = false;
        },
        { passive: true },
      );
      if (matchMedia("(pointer:fine)").matches) {
        on(deck, "pointerenter", stop);
        on(deck, "pointerleave", start);
      }
      on(document, "visibilitychange", () => (document.hidden ? stop() : start()));

      go(0, false);
      start();
      offs.push(stop);
    }

    /* how it works · play the stages once on arrival, parallax tilt on desktop */
    const steps = [...document.querySelectorAll<HTMLElement>("[data-step]")];
    if (steps.length) {
      if (reduce) {
        steps.forEach((s) => s.classList.add("play"));
      } else {
        const sio = mkIO(
          (es) => {
            es.forEach((en) => {
              if (!en.isIntersecting) return;
              const i = steps.indexOf(en.target as HTMLElement);
              const t = setTimeout(() => en.target.classList.add("play"), i * 160);
              offs.push(() => clearTimeout(t));
              sio.unobserve(en.target);
            });
          },
          { threshold: 0.35 },
        );
        steps.forEach((s) => sio.observe(s));

        if (matchMedia("(pointer:fine)").matches) {
          steps.forEach((s) => {
            const deck = s.querySelector<HTMLElement>(".deck")!;
            const stage = s.querySelector<HTMLElement>(".stage")!;
            let busy = false;
            let rf: number | null = null;
            let mx = 0;
            let my = 0;
            on(
              s,
              "pointermove",
              ((e: PointerEvent) => {
                const r = stage.getBoundingClientRect();
                mx = (e.clientX - r.left) / r.width - 0.5;
                my = (e.clientY - r.top) / r.height - 0.5;
                if (rf) return;
                rf = raf(() => {
                  deck.classList.add("settle");
                  deck.style.setProperty("--ry", (mx * 13).toFixed(2) + "deg");
                  deck.style.setProperty("--rx", (my * -9).toFixed(2) + "deg");
                  rf = null;
                });
              }) as EventListener,
              { passive: true },
            );
            offs.push(() => cancelRaf(rf));
            on(s, "pointerleave", () => {
              deck.classList.remove("settle");
              deck.style.setProperty("--ry", "0deg");
              deck.style.setProperty("--rx", "0deg");
            });
            on(s, "pointerenter", () => {
              if (busy || !s.classList.contains("play")) return;
              busy = true;
              s.classList.remove("play");
              void s.offsetWidth;
              s.classList.add("play");
              const t = setTimeout(() => {
                busy = false;
              }, 2800);
              offs.push(() => clearTimeout(t));
            });
          });
        }
      }
    }

    document.querySelectorAll<HTMLElement>("[data-go]").forEach((b) =>
      on(b, "click", () => {
        const t = document.querySelector<HTMLElement>(b.dataset.go!);
        if (t) scrollTo({ top: t.offsetTop - 80, behavior: reduce ? "auto" : "smooth" });
      }),
    );
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
      on(a, "click", (ev) => {
        const t = document.querySelector<HTMLElement>(a.getAttribute("href")!);
        if (!t) return;
        ev.preventDefault();
        scrollTo({ top: Math.max(0, t.offsetTop - 80), behavior: reduce ? "auto" : "smooth" });
      }),
    );

    /* gradient footer · glow height tracks how much page is left below the fold */
    const gband = document.getElementById("gband");
    if (gband && !reduce) {
      let gf: number | null = null;
      const gmeasure = () => {
        gf = null;
        const h = gband.offsetHeight || 1; /* offsetHeight ignores the transform */
        const left = document.documentElement.scrollHeight - innerHeight - scrollY;
        gband.style.setProperty("--gp", Math.max(0, Math.min(1, (h - left) / h)).toFixed(4));
      };
      const greq = () => {
        if (!gf) gf = raf(gmeasure);
      };
      on(window, "scroll", greq, { passive: true });
      on(window, "resize", greq, { passive: true });
      gmeasure();
      offs.push(() => cancelRaf(gf));
    }

    const nav = document.getElementById("nav")!;
    let lastY = scrollY,
      nf: number | null = null;
    on(
      window,
      "scroll",
      () => {
        if (nf) return;
        nf = raf(() => {
          const y = scrollY;
          nav.classList.toggle("hide", y > lastY && y > 160);
          lastY = y;
          nf = null;
        });
      },
      { passive: true },
    );
    offs.push(() => cancelRaf(nf));

    const send = document.getElementById("send");
    if (send)
      on(send, "click", (e) => {
        const t = e.target as HTMLElement;
        t.textContent = "Got it. Talk soon.";
        t.style.pointerEvents = "none";
      });

    return () => {
      offs.forEach((f) => f());
      observers.forEach((o) => o.disconnect());
      intervals.forEach((id) => clearInterval(id));
      intervals.clear();
      frames.forEach((id) => cancelAnimationFrame(id));
      frames.clear();
    };
  }, []);

  return (
  <>
    <nav id="nav">
      <div className="navbar">
        <a className="mark" href="#top">Alyxlab</a>
        <div className="nlinks">
          <a href="#work">Work</a>
          <a href="#gets">What you get</a>
          <a href="#price">Pricing</a>
        </div>
        <button className="nbtn" data-go="#start">Get my free plan</button>
      </div>
    </nav>
    
    {/* ============ 1 · HERO ============ */}
    <header className="hero" id="top">
      <div className="glow" aria-hidden="true"></div>
      <div className="bubbles" id="bubbles" aria-hidden="true">
        <svg className="goodefs" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="goofilter">
              <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur"/>
              <feColorMatrix in="blur" mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo"/>
              <feBlend in="SourceGraphic" in2="goo"/>
            </filter>
          </defs>
        </svg>
        <div className="goo">
          <div className="bub b1"></div>
          <div className="orb o2"><span className="bub b2"></span></div>
          <div className="orb o3"><span className="bub b3"></span></div>
          <div className="bub b4"></div>
          <div className="orb o5"><span className="bub b5"></span></div>
          <div className="bub b6" id="bubcursor"></div>
        </div>
      </div>
      <div className="grain" aria-hidden="true"></div>
      <div className="wrap">
        <h1>Everything your business runs on, <em>in one system.</em></h1>
        <p className="lede">Calls, bookings, deposits, reminders, reviews. Built for how you actually work and run by the person who built it.</p>
        <div className="hcta">
          <button className="btn glass" data-go="#start"><span>Get my free plan</span>
            <svg viewBox="0 0 24 24"><path d="M5 12h13M12 5.5 18.5 12 12 18.5"/></svg></button>
          <span className="hnote">No cost. A written plan within a day.</span>
        </div>
    
        {/* HERO IMAGE */}
        <div className="shot wide loaded" data-src="">
          <img
            src="/img/hero-dashboard.webp"
            alt="Sunnyside operations dashboard showing orders, revenue, delivery calendar and performance breakdown"
            width={1920}
            height={1200}
            loading="eager"
            fetchPriority="high"
            decoding="sync"
          />
        </div>
      </div>
    </header>
    
    {/* ============ 2 · HOW IT WORKS ============ */}
    <section className="how" id="how">
      <div className="wrap">
        <p className="eyebrow rv">How it works</p>
        <h2 className="rv">Live in two weeks. You do almost nothing.</h2>

        <div className="steps">

          {/* ============ 1 · THE WRITTEN PLAN ============ */}
          <div className="step gcard" data-step="">
            <div className="gglow" aria-hidden="true"></div>
            <div className="stage">
              <div className="scene"><div className="deck">

                {/* back plane */}
                <div className="layer anim" style={{"--z": "-55px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" aria-hidden="true">
                    <defs>
                      <pattern id="pdots" width="18" height="18" patternUnits="userSpaceOnUse">
                        <circle cx="1.2" cy="1.2" r="1.2" fill="rgba(245,245,247,.13)"/>
                      </pattern>
                    </defs>
                    <g className="p-grid" data-a="">
                      <rect x="-40" y="-30" width="440" height="290" fill="url(#pdots)"/>
                    </g>
                  </svg>
                </div>

                {/* the sheet */}
                <div className="layer anim" style={{"--z": "0px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" role="img"
                       aria-label="A system plan: calls, web forms and texts feeding one system, which feeds calendar, payments and reviews">
                    <defs>
                      <linearGradient id="pnode" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#1D1D26"/><stop offset="1" stopColor="#131319"/>
                      </linearGradient>
                      <filter id="pshadow" x="-60%" y="-60%" width="220%" height="220%">
                        <feDropShadow dx="0" dy="6" stdDeviation="7"
                                      floodColor="#000" floodOpacity=".6"/>
                      </filter>
                    </defs>

                    <g className="p-head" data-a="">
                      <text x="18" y="30" fill="#F5F5F7" fontSize="13" fontWeight="800">System plan</text>
                      <text x="342" y="30" fill="rgba(245,245,247,.45)" fontSize="11"
                            fontWeight="600" textAnchor="end">Sunnyside</text>
                      <rect x="18" y="42" width="324" height="1" fill="rgba(245,245,247,.12)"/>
                    </g>

                    <g fill="none" stroke="var(--cyan)" strokeWidth="1.6" strokeLinecap="round">
                      <path className="conn c-in" d="M96 78 C120 78 122 104 141 104"/>
                      <path className="conn c-in" d="M96 121 L141 121"/>
                      <path className="conn c-in" d="M96 164 C120 164 122 138 141 138"/>
                    </g>
                    <g fill="none" stroke="var(--violet)" strokeWidth="1.6" strokeLinecap="round">
                      <path className="conn c-out" d="M219 104 C238 104 240 78 264 78"/>
                      <path className="conn c-out" d="M219 121 L264 121"/>
                      <path className="conn c-out" d="M219 138 C238 138 240 164 264 164"/>
                    </g>

                    <g className="p-in" data-a="" filter="url(#pshadow)">
                      <rect x="18" y="65" width="78" height="26" rx="8" fill="url(#pnode)"
                            stroke="rgba(34,229,255,.38)"/>
                      <text x="57" y="82" fill="#F5F5F7" fontSize="11" fontWeight="600"
                            textAnchor="middle">Calls</text>
                    </g>
                    <g className="p-in" data-a="" filter="url(#pshadow)">
                      <rect x="18" y="108" width="78" height="26" rx="8" fill="url(#pnode)"
                            stroke="rgba(34,229,255,.38)"/>
                      <text x="57" y="125" fill="#F5F5F7" fontSize="11" fontWeight="600"
                            textAnchor="middle">Web form</text>
                    </g>
                    <g className="p-in" data-a="" filter="url(#pshadow)">
                      <rect x="18" y="151" width="78" height="26" rx="8" fill="url(#pnode)"
                            stroke="rgba(34,229,255,.38)"/>
                      <text x="57" y="168" fill="#F5F5F7" fontSize="11" fontWeight="600"
                            textAnchor="middle">Texts</text>
                    </g>

                    <g className="p-out" data-a="" filter="url(#pshadow)">
                      <rect x="264" y="65" width="78" height="26" rx="8" fill="url(#pnode)"
                            stroke="rgba(177,75,255,.42)"/>
                      <text x="303" y="82" fill="#F5F5F7" fontSize="11" fontWeight="600"
                            textAnchor="middle">Calendar</text>
                    </g>
                    <g className="p-out" data-a="" filter="url(#pshadow)">
                      <rect x="264" y="108" width="78" height="26" rx="8" fill="url(#pnode)"
                            stroke="rgba(177,75,255,.42)"/>
                      <text x="303" y="125" fill="#F5F5F7" fontSize="11" fontWeight="600"
                            textAnchor="middle">Payments</text>
                    </g>
                    <g className="p-out" data-a="" filter="url(#pshadow)">
                      <rect x="264" y="151" width="78" height="26" rx="8" fill="url(#pnode)"
                            stroke="rgba(177,75,255,.42)"/>
                      <text x="303" y="168" fill="#F5F5F7" fontSize="11" fontWeight="600"
                            textAnchor="middle">Reviews</text>
                    </g>

                    <g className="p-foot" data-a="">
                      <rect x="18" y="192" width="324" height="1" fill="rgba(245,245,247,.1)"/>
                      <text x="18" y="209" fill="rgba(245,245,247,.42)" fontSize="10.5"
                            fontWeight="600">Prepared for Sunnyside</text>
                      <text x="342" y="209" fill="rgba(245,245,247,.42)" fontSize="10.5"
                            fontWeight="600" textAnchor="end">No charge</text>
                    </g>
                  </svg>
                </div>

                {/* the core, lifted off the sheet */}
                <div className="layer anim" style={{"--z": "42px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" aria-hidden="true">
                    <defs>
                      <filter id="pcore" x="-70%" y="-70%" width="240%" height="240%">
                        <feDropShadow dx="0" dy="12" stdDeviation="14"
                                      floodColor="#000" floodOpacity=".7"/>
                      </filter>
                      <linearGradient id="pcoreg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#5BFFB4"/><stop offset="1" stopColor="#00E878"/>
                      </linearGradient>
                    </defs>
                    <g className="p-core" data-a="" filter="url(#pcore)">
                      <rect x="141" y="94" width="78" height="54" rx="13" fill="url(#pcoreg)"/>
                      <text x="180" y="118" fill="#04120A" fontSize="12" fontWeight="800"
                            textAnchor="middle">One</text>
                      <text x="180" y="133" fill="#04120A" fontSize="12" fontWeight="800"
                            textAnchor="middle">system</text>
                    </g>
                  </svg>
                </div>

              </div></div>
            </div>
            <span className="week">Week 1</span>
            <b>One call, thirty minutes</b>
            <p>You tell me how customers reach you now and where it breaks. I write up what your system will do and what it costs. No charge.</p>
          </div>

          {/* ============ 2 · THE BUILD ============ */}
          <div className="step gcard" data-step="">
            <div className="gglow" aria-hidden="true"></div>
            <div className="stage">
              <div className="scene"><div className="deck">

                {/* the old site, flat at the back */}
                <div className="layer anim" style={{"--z": "-30px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" aria-hidden="true">
                    <rect x="0" y="0" width="360" height="225" fill="#E4E4E6"/>
                    <rect x="0" y="0" width="360" height="26" fill="#D2D2D6"/>
                    <rect x="14" y="8" width="34" height="10" rx="2" fill="#9A9AA2"/>
                    <rect x="240" y="10" width="26" height="6" rx="1" fill="#A9A9B0"/>
                    <rect x="274" y="10" width="26" height="6" rx="1" fill="#A9A9B0"/>
                    <rect x="308" y="10" width="26" height="6" rx="1" fill="#A9A9B0"/>
                    <rect x="14" y="38" width="332" height="78" rx="2" fill="#C9C9CE"/>
                    <rect x="30" y="60" width="150" height="9" rx="1" fill="#AEAEB5"/>
                    <rect x="30" y="76" width="118" height="6" rx="1" fill="#BCBCC2"/>
                    <rect x="30" y="90" width="58" height="14" rx="2" fill="#8E8E96"/>
                    <rect x="14" y="128" width="104" height="6" rx="1" fill="#C4C4CA"/>
                    <rect x="14" y="140" width="96" height="6" rx="1" fill="#CFCFD4"/>
                    <rect x="14" y="152" width="88" height="6" rx="1" fill="#CFCFD4"/>
                    <rect x="128" y="128" width="104" height="6" rx="1" fill="#C4C4CA"/>
                    <rect x="128" y="140" width="96" height="6" rx="1" fill="#CFCFD4"/>
                    <rect x="128" y="152" width="88" height="6" rx="1" fill="#CFCFD4"/>
                    <rect x="242" y="128" width="104" height="6" rx="1" fill="#C4C4CA"/>
                    <rect x="242" y="140" width="96" height="6" rx="1" fill="#CFCFD4"/>
                    <rect x="242" y="152" width="88" height="6" rx="1" fill="#CFCFD4"/>
                    <rect x="0" y="186" width="360" height="39" fill="#D2D2D6"/>
                    <rect x="14" y="200" width="70" height="6" rx="1" fill="#AEAEB5"/>
                    <g className="b-before" data-a="">
                      <rect x="286" y="196" width="56" height="18" rx="9" fill="rgba(20,20,23,.78)"/>
                      <text x="314" y="208.5" fill="#F5F5F7" fontSize="10" fontWeight="700"
                            textAnchor="middle">Before</text>
                    </g>
                  </svg>
                </div>

                {/* the new dashboard, revealed by the wipe */}
                <div className="layer anim" style={{"--z": "0px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" role="img"
                       aria-label="The new dashboard replacing the old site, with a sidebar, a revenue chart and stat cards">
                    <defs>
                      <clipPath id="bwipe" clipPathUnits="userSpaceOnUse">
                        <rect className="wipeclip" x="0" y="0" width="360" height="225"/>
                      </clipPath>
                      <linearGradient id="bpanel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#1A1A23"/><stop offset="1" stopColor="#101016"/>
                      </linearGradient>
                      <linearGradient id="bfill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="rgba(0,255,135,.32)"/>
                        <stop offset="1" stopColor="rgba(0,255,135,0)"/>
                      </linearGradient>
                      <linearGradient id="bbar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#22E5FF"/><stop offset="1" stopColor="#0E7FA0"/>
                      </linearGradient>
                    </defs>

                    <g clipPath="url(#bwipe)">
                      <rect x="0" y="0" width="360" height="225" fill="#0A0A10"/>

                      {/* sidebar */}
                      <rect x="0" y="0" width="64" height="225" fill="#0E0E15"/>
                      <rect x="63" y="0" width="1" height="225" fill="rgba(255,255,255,.07)"/>
                      <circle cx="20" cy="20" r="7" fill="var(--volt)"/>
                      <rect x="32" y="16" width="22" height="7" rx="3.5" fill="rgba(245,245,247,.85)"/>
                      <rect x="10" y="42" width="44" height="16" rx="6" fill="rgba(0,255,135,.16)"
                            stroke="rgba(0,255,135,.4)"/>
                      <rect x="17" y="47" width="8" height="6" rx="2" fill="var(--volt)"/>
                      <rect x="29" y="48" width="18" height="4" rx="2" fill="rgba(0,255,135,.75)"/>
                      <g fill="rgba(245,245,247,.26)">
                        <rect x="17" y="70" width="8" height="6" rx="2"/>
                        <rect x="29" y="71" width="18" height="4" rx="2"/>
                        <rect x="17" y="90" width="8" height="6" rx="2"/>
                        <rect x="29" y="91" width="18" height="4" rx="2"/>
                        <rect x="17" y="110" width="8" height="6" rx="2"/>
                        <rect x="29" y="111" width="18" height="4" rx="2"/>
                        <rect x="17" y="130" width="8" height="6" rx="2"/>
                        <rect x="29" y="131" width="18" height="4" rx="2"/>
                        <rect x="17" y="150" width="8" height="6" rx="2"/>
                        <rect x="29" y="151" width="18" height="4" rx="2"/>
                      </g>
                      <rect x="10" y="196" width="44" height="18" rx="9" fill="#15151D"
                            stroke="rgba(255,255,255,.07)"/>

                      {/* top bar */}
                      <rect x="76" y="14" width="86" height="10" rx="5" fill="rgba(245,245,247,.9)"/>
                      <rect x="76" y="30" width="58" height="6" rx="3" fill="rgba(245,245,247,.3)"/>
                      <rect x="300" y="12" width="46" height="18" rx="9" fill="#15151D"
                            stroke="rgba(255,255,255,.08)"/>
                      <circle cx="310" cy="21" r="5" fill="rgba(177,75,255,.7)"/>

                      {/* revenue chart panel */}
                      <rect x="76" y="48" width="164" height="94" rx="12" fill="url(#bpanel)"
                            stroke="rgba(255,255,255,.08)"/>
                      <text x="88" y="66" fill="rgba(245,245,247,.55)" fontSize="9"
                            fontWeight="700" letterSpacing=".4">REVENUE</text>
                      <text x="88" y="84" fill="#F5F5F7" fontSize="16" fontWeight="800">$12,480</text>
                      <path className="b-line" d="M88 128 L112 118 L136 122 L160 104 L184 108 L208 92 L228 84"
                            fill="none" stroke="var(--volt)" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            strokeDasharray="300" strokeDashoffset="300"/>
                      <path d="M88 128 L112 118 L136 122 L160 104 L184 108 L208 92 L228 84 L228 132 L88 132 Z"
                            fill="url(#bfill)" opacity=".9"/>

                      {/* bookings bars */}
                      <rect x="250" y="48" width="96" height="94" rx="12" fill="url(#bpanel)"
                            stroke="rgba(255,255,255,.08)"/>
                      <text x="262" y="66" fill="rgba(245,245,247,.55)" fontSize="9"
                            fontWeight="700" letterSpacing=".4">BOOKINGS</text>
                      <g fill="url(#bbar)">
                        <rect className="b-bar" x="262" y="102" width="10" height="28" rx="3"/>
                        <rect className="b-bar" x="278" y="94" width="10" height="36" rx="3"/>
                        <rect className="b-bar" x="294" y="106" width="10" height="24" rx="3"/>
                        <rect className="b-bar" x="310" y="84" width="10" height="46" rx="3"/>
                        <rect className="b-bar" x="326" y="76" width="10" height="54" rx="3"/>
                      </g>
                    </g>

                    <g className="b-after" data-a="">
                      <rect x="76" y="196" width="50" height="18" rx="9" fill="rgba(0,255,135,.16)"
                            stroke="rgba(0,255,135,.45)"/>
                      <text x="101" y="208.5" fill="var(--volt)" fontSize="10" fontWeight="700"
                            textAnchor="middle">After</text>
                    </g>
                  </svg>
                </div>

                {/* the wipe edge, riding above everything */}
                <div className="layer" style={{"--z": "52px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" aria-hidden="true">
                    <rect className="b-edge" x="0" y="0" width="2" height="225" fill="var(--volt)"/>
                  </svg>
                </div>

                {/* stat cards, floating off the surface */}
                <div className="layer anim" style={{"--z": "56px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" aria-hidden="true">
                    <defs>
                      <filter id="bcard" x="-60%" y="-60%" width="220%" height="220%">
                        <feDropShadow dx="0" dy="12" stdDeviation="13"
                                      floodColor="#000" floodOpacity=".72"/>
                      </filter>
                      <linearGradient id="bcg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#22222D"/><stop offset="1" stopColor="#15151C"/>
                      </linearGradient>
                    </defs>
                    <g className="b-card" data-a="" filter="url(#bcard)">
                      <rect x="140" y="152" width="98" height="46" rx="12" fill="url(#bcg)"
                            stroke="rgba(255,255,255,.12)"/>
                      <text x="152" y="169" fill="rgba(245,245,247,.5)" fontSize="8.5"
                            fontWeight="700" letterSpacing=".4">NEW CUSTOMERS</text>
                      <text x="152" y="188" fill="#F5F5F7" fontSize="17" fontWeight="800">27</text>
                      <text x="228" y="188" fill="var(--volt)" fontSize="10"
                            fontWeight="700" textAnchor="end">+18%</text>
                    </g>
                    <g className="b-card" data-a="" filter="url(#bcard)">
                      <rect x="248" y="152" width="98" height="46" rx="12" fill="url(#bcg)"
                            stroke="rgba(255,255,255,.12)"/>
                      <text x="260" y="169" fill="rgba(245,245,247,.5)" fontSize="8.5"
                            fontWeight="700" letterSpacing=".4">DEPOSITS TAKEN</text>
                      <text x="260" y="188" fill="#F5F5F7" fontSize="17" fontWeight="800">$3,140</text>
                      <text x="336" y="188" fill="var(--cyan)" fontSize="10"
                            fontWeight="700" textAnchor="end">+9%</text>
                    </g>
                  </svg>
                </div>

              </div></div>
            </div>
            <span className="week">Week 2</span>
            <b>I build it and move you over</b>
            <p>Connected to the tools you keep, loaded with your existing customers and bookings. You review it before anything goes live.</p>
          </div>

          {/* ============ 3 · THE TEXT THREAD ============ */}
          <div className="step gcard" data-step="">
            <div className="gglow" aria-hidden="true"></div>
            <div className="stage">
              <div className="scene"><div className="deck">

                {/* back plane */}
                <div className="layer anim" style={{"--z": "-45px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" aria-hidden="true">
                    <defs>
                      <radialGradient id="tglow" cx="50%" cy="30%" r="70%">
                        <stop offset="0" stopColor="rgba(255,45,120,.16)"/>
                        <stop offset="1" stopColor="rgba(255,45,120,0)"/>
                      </radialGradient>
                    </defs>
                    <rect x="-40" y="-30" width="440" height="290" fill="url(#tglow)"/>
                    <g className="t-time" data-a="">
                      <text x="180" y="26" fill="rgba(245,245,247,.4)" fontSize="10.5"
                            fontWeight="600" textAnchor="middle">Today 9:14 AM</text>
                    </g>
                  </svg>
                </div>

                {/* incoming, mid depth */}
                <div className="layer anim" style={{"--z": "14px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" role="img"
                       aria-label="The owner asks whether Saturday hours can be added to the booking page">
                    <defs>
                      <linearGradient id="tin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#21212A"/><stop offset="1" stopColor="#16161C"/>
                      </linearGradient>
                      <filter id="tsh" x="-60%" y="-60%" width="220%" height="220%">
                        <feDropShadow dx="0" dy="8" stdDeviation="9"
                                      floodColor="#000" floodOpacity=".6"/>
                      </filter>
                    </defs>
                    <g className="t-in" data-a="" filter="url(#tsh)">
                      <rect x="18" y="42" width="216" height="52" rx="16" fill="url(#tin)"
                            stroke="rgba(255,255,255,.09)"/>
                      <text x="36" y="66" fill="#F5F5F7" fontSize="12.5" fontWeight="600">Can we add Saturday</text>
                      <text x="36" y="83" fill="#F5F5F7" fontSize="12.5" fontWeight="600">hours to the booking page?</text>
                    </g>
                    <g className="t-typing" data-a="" filter="url(#tsh)">
                      <rect x="270" y="106" width="72" height="34" rx="16" fill="url(#tin)"
                            stroke="rgba(255,255,255,.09)"/>
                      <circle cx="290" cy="123" r="3.4" fill="rgba(245,245,247,.6)"/>
                      <circle cx="306" cy="123" r="3.4" fill="rgba(245,245,247,.6)"/>
                      <circle cx="322" cy="123" r="3.4" fill="rgba(245,245,247,.6)"/>
                    </g>
                  </svg>
                </div>

                {/* the reply, furthest forward */}
                <div className="layer anim" style={{"--z": "50px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" role="img"
                       aria-label="The reply says Saturdays are live on the calendar now">
                    <defs>
                      <linearGradient id="tout" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#FF4A8C"/><stop offset="1" stopColor="#F01E68"/>
                      </linearGradient>
                      <filter id="toutsh" x="-70%" y="-70%" width="240%" height="240%">
                        <feDropShadow dx="0" dy="14" stdDeviation="15"
                                      floodColor="#000" floodOpacity=".72"/>
                      </filter>
                    </defs>
                    <g className="t-out" data-a="" filter="url(#toutsh)">
                      <rect x="126" y="106" width="216" height="52" rx="16" fill="url(#tout)"/>
                      <text x="144" y="130" fill="#14000A" fontSize="12.5" fontWeight="700">Added. Saturdays are</text>
                      <text x="144" y="147" fill="#14000A" fontSize="12.5" fontWeight="700">live on the calendar now.</text>
                    </g>
                    <g className="t-meta" data-a="">
                      <text x="342" y="176" fill="rgba(245,245,247,.42)" fontSize="10.5"
                            fontWeight="600" textAnchor="end">Delivered 9:16 AM</text>
                    </g>
                  </svg>
                </div>

                {/* the compose bar sits on the surface */}
                <div className="layer anim" style={{"--z": "26px"} as React.CSSProperties}>
                  <svg viewBox="0 0 360 225" aria-hidden="true">
                    <g className="t-bar" data-a="">
                      <rect x="18" y="192" width="324" height="30" rx="15" fill="#15151B"
                            stroke="rgba(255,255,255,.08)"/>
                      <text x="36" y="211" fill="rgba(245,245,247,.28)" fontSize="11.5"
                            fontWeight="500">Text message</text>
                      <circle cx="326" cy="207" r="10" fill="rgba(255,255,255,.1)"/>
                      <path d="M326 202.5 L326 211.5 M322 206.5 L326 202.5 L330 206.5"
                            stroke="rgba(245,245,247,.55)" strokeWidth="1.6" fill="none"
                            strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                  </svg>
                </div>

              </div></div>
            </div>
            <span className="week">Ongoing</span>
            <b>You run it, I keep it running</b>
            <p>Thirty minutes of training for your team. After that it just runs, and when you want a change you text me directly.</p>
          </div>

        </div>
      </div>
    </section>
    
    {/* ============ 3 · WORK ============ */}
    <section className="work light" id="work">
      <div className="wrap">
        <div className="shead">
          <div>
            <p className="eyebrow rv">Our work</p>
            <h2 className="rv">Systems already running.</h2>
          </div>
          <p className="lede rv">Three businesses, three different problems, one approach.</p>
        </div>
    
        <div className="proj rv">
          <div className="ptxt">
            <h3>DriveOffDallas</h3>
            <p>A lead system for fourteen dealers with a live phone line, an AI assistant that answers first, and ownership timers so no lead sits unclaimed.</p>
            <div className="pnum">
              <div><b>4,116</b><span>Leads handled</span></div>
              <div><b>14</b><span>Dealers</span></div>
            </div>
            <div className="ptags"><span className="ptag">Live phone line</span><span className="ptag">AI assistant</span><span className="ptag">Lead ownership</span></div>
          </div>
          <div className="shot wide loaded" data-src="">
            <img src="/img/driveoffdallas.webp" alt="DriveOffDallas CRM messages view with reply times and bookings from text" width={1920} height={1080} loading="eager" decoding="sync" />
          </div>
        </div>
    
        <div className="proj rv">
          <div className="ptxt">
            <h3>Plugin Warehouse</h3>
            <p>A storefront for music producers handling very large file delivery, sale campaigns, full analytics, and a customer account portal.</p>
            <div className="pnum">
              <div><b>2.1 TB</b><span>Delivered</span></div>
              <div><b>847</b><span>Customers</span></div>
            </div>
            <div className="ptags"><span className="ptag">Ecommerce</span><span className="ptag">Large file delivery</span><span className="ptag">Customer portal</span></div>
          </div>
          <div className="shot wide loaded" data-src="">
            <img src="/img/pluginwarehouse.png" alt="Plugin Warehouse dashboard with revenue over time, recent orders and best sellers" width={1920} height={983} loading="eager" decoding="sync" />
          </div>
        </div>
    
        <div className="proj rv">
          <div className="ptxt">
            <h3>Monkey Trucking</h3>
            <p>A fast site with intake forms that ask the right questions up front, feeding a dashboard the owner actually opens.</p>
            <div className="pnum">
              <div><b>100%</b><span>Inquiries answered</span></div>
              <div><b>96</b><span>Inquiries</span></div>
            </div>
            <div className="ptags"><span className="ptag">Smart intake</span><span className="ptag">Owner dashboard</span></div>
          </div>
          <div className="shot wide" data-src="">
            <img alt="" />
            <div className="ph"><b>Monkey Trucking</b><span>Homepage or the dashboard</span><i>1600 × 1000</i></div>
          </div>
        </div>
    
        <div className="pmwrap rv">
          <p className="pmlead">The same system on your phone.</p>
          <div className="pdeck" id="pdeck">
            <figure className="pmock">
              <div className="pframe">
                <div className="shot phone" data-src="/img/phone-1.jpg">
                  <img alt="Morning summary screen showing messages answered, missed calls handled, and new bookings" loading="lazy" />
                  <div className="ph"><b>Morning summary</b><i>1080 × 1935</i></div>
                </div>
              </div>
              <figcaption>What happened overnight</figcaption>
            </figure>
            <figure className="pmock">
              <div className="pframe">
                <div className="shot phone" data-src="/img/phone-2.jpg">
                  <img alt="Revenue dashboard showing the weekly total, leads, bookings, and close rate" loading="lazy" />
                  <div className="ph"><b>Revenue</b><i>1080 × 1935</i></div>
                </div>
              </div>
              <figcaption>What the week is worth</figcaption>
            </figure>
            <figure className="pmock">
              <div className="pframe">
                <div className="shot phone" data-src="/img/phone-3.jpg">
                  <img alt="Booking calendar showing the appointments scheduled for today" loading="lazy" />
                  <div className="ph"><b>Today</b><i>1080 × 1935</i></div>
                </div>
              </div>
              <figcaption>Who is booked today</figcaption>
            </figure>
          </div>
          <div className="pdots" id="pdots">
            <button className="pdot" type="button" aria-label="Show the morning summary"></button>
            <button className="pdot" type="button" aria-label="Show the revenue dashboard"></button>
            <button className="pdot" type="button" aria-label="Show today's bookings"></button>
          </div>
        </div>
      </div>
    </section>
    
    {/* ============ 4 · PRODUCT VIEWER ============ */}
    <section className="viewer light" id="gets">
      <div className="wrap">
        <p className="eyebrow rv">What you get</p>
        <h2 className="rv">Look inside the system.</h2>
    
        <div className="tabswrap rv">
        <div className="tabs" role="tablist" id="tabs">
          <button className="tab" role="tab" aria-selected="true" data-t="inbox">
            <svg viewBox="0 0 24 24"><path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M5.5 4.5h13l2.5 8.5v4.5a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2V13z"/></svg>Inbox</button>
          <button className="tab" role="tab" aria-selected="false" data-t="calendar">
            <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/></svg>Calendar</button>
          <button className="tab" role="tab" aria-selected="false" data-t="pipeline">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="16" rx="2"/><rect x="9.5" y="4" width="5" height="11" rx="2"/><rect x="16" y="4" width="5" height="7" rx="2"/></svg>Pipeline</button>
          <button className="tab" role="tab" aria-selected="false" data-t="payments">
            <svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 9.5h19M6 15h3.5"/></svg>Payments</button>
          <button className="tab" role="tab" aria-selected="false" data-t="reports">
            <svg viewBox="0 0 24 24"><path d="M3 20h18"/><path d="M6 20v-6M11 20V7M16 20v-9"/></svg>Reports</button>
        </div>
          <button className="tabcue" type="button" aria-label="Scroll for more tabs">
            <svg viewBox="0 0 24 24"><path d="M9 5.5 15.5 12 9 18.5"/></svg>
          </button>
        </div>
    
        <div className="panes">
          <div className="pane on" data-p="inbox">
            <div className="shot wide" data-src=""><img alt="" />
              <div className="ph"><b>Inbox screenshot</b><span>The unified thread view, ideally with an automatic reply visible</span><i>1600 × 1000</i></div></div>
            <div className="pline"><b>Everyone in one thread</b><span>Calls, texts, and web forms all land in the same place, and missed calls get a text back in seconds.</span></div>
          </div>
          <div className="pane" data-p="calendar">
            <div className="shot wide" data-src=""><img alt="" />
              <div className="ph"><b>Calendar screenshot</b><span>Booking view with real availability</span><i>1600 × 1000</i></div></div>
            <div className="pline"><b>Books itself</b><span>Only genuinely open times get offered, the booking writes back to your calendar, and the reminder goes out on schedule.</span></div>
          </div>
          <div className="pane" data-p="pipeline">
            <div className="shot wide" data-src=""><img alt="" />
              <div className="ph"><b>Pipeline screenshot</b><span>DriveOffDallas lead board with the ownership timers</span><i>1600 × 1000</i></div></div>
            <div className="pline"><b>Nothing sits unclaimed</b><span>Every lead lands in a stage with an owner and a clock, routed by rules you set once.</span></div>
          </div>
          <div className="pane" data-p="payments">
            <div className="shot wide" data-src=""><img alt="" />
              <div className="ph"><b>Payments screenshot</b><span>Deposit or checkout view</span><i>1600 × 1000</i></div></div>
            <div className="pline"><b>Paid at booking</b><span>Deposits collected before the slot is held, receipts sent automatically, no shows you can actually charge.</span></div>
          </div>
          <div className="pane" data-p="reports">
            <div className="shot wide" data-src=""><img alt="" />
              <div className="ph"><b>Reports screenshot</b><span>Revenue and lead numbers dashboard</span><i>1600 × 1000</i></div></div>
            <div className="pline"><b>You see everything</b><span>What came in, what booked, what it was worth, and which hours actually make you money.</span></div>
          </div>
        </div>
      </div>
    </section>
    
    {/* ============ 5 · ALSO INCLUDED ============ */}
    <section className="gets">
      <div className="wrap">
        <p className="eyebrow rv">Also included</p>
        <div className="fan rv">
          <article className="fcard">
            <div className="fc-top">
              <span className="fc-ico"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.2L12 17l-5.4 3 1-6.2L3.2 9.5l6.1-.9z"/></svg></span>
              <b>Review requests</b>
            </div>
            <p>Sent automatically after every completed job.</p>
            <div className="fdetail">
              <svg className="fd-stars" viewBox="0 0 106 20" aria-hidden="true">
                <defs><path id="fdstar" d="M10 2.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14.5l-4.8 2.6.9-5.4L2.2 7.9l5.4-.8z"/></defs>
                <use href="#fdstar" x="0"/><use href="#fdstar" x="22"/><use href="#fdstar" x="44"/><use href="#fdstar" x="66"/><use href="#fdstar" x="88"/>
              </svg>
            </div>
          </article>
          <article className="fcard">
            <div className="fc-top">
              <span className="fc-ico"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M17.5 20a6.4 6.4 0 0 0-2-4.6"/></svg></span>
              <b>Team accounts</b>
            </div>
            <p>Separate logins and roles for your staff.</p>
            <div className="fdetail">
              <div className="fd-avs" aria-hidden="true"><span></span><span></span><span></span></div>
            </div>
          </article>
          <article className="fcard">
            <div className="fc-top">
              <span className="fc-ico"><svg viewBox="0 0 24 24"><path d="M10 13.5a4 4 0 0 0 5.7.4l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4"/><path d="M14 10.5a4 4 0 0 0-5.7-.4l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4"/></svg></span>
              <b>Referral links</b>
            </div>
            <p>See exactly who sends you business.</p>
            <div className="fdetail" aria-hidden="true">
              <span className="fd-pill">
                <svg viewBox="0 0 24 24"><path d="M10 13.5a4 4 0 0 0 5.7.4l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4"/><path d="M14 10.5a4 4 0 0 0-5.7-.4l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4"/></svg>
                alyxlab.co/r/9f2…
              </span>
              <span className="fd-count">18 clicks</span>
            </div>
          </article>
          <article className="fcard">
            <div className="fc-top">
              <span className="fc-ico"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4"/><path d="M8 14l3 3 5-6"/></svg></span>
              <b>Your own domain</b>
            </div>
            <p>Yours outright. You keep it if you leave.</p>
            <div className="fdetail" aria-hidden="true">
              <span className="fd-bar">
                <svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="9" rx="2.2"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/></svg>
                yourshop.com
              </span>
            </div>
          </article>
          <article className="fcard">
            <div className="fc-top">
              <span className="fc-ico"><svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m4.5 8 7.5 5 7.5-5"/></svg></span>
              <b>Automatic emails</b>
            </div>
            <p>Price drops, abandoned carts, abandoned checkouts. Sent for you.</p>
            <div className="fdetail" aria-hidden="true">
              <span className="fd-pill">Price drop</span>
              <span className="fd-pill">Cart saved</span>
              <span className="fd-pill">Win back</span>
            </div>
          </article>
          <article className="fcard">
            <div className="fc-top">
              <span className="fc-ico"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg></span>
              <b>Text me directly</b>
            </div>
            <p>You text, I fix it. No ticket queue.</p>
            <div className="fdetail" aria-hidden="true">
              <span className="fd-pill">
                <svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg>
                Add Saturday hours?
              </span>
              <span className="fd-count">Done by noon</span>
            </div>
          </article>
        </div>
      </div>
    </section>
    
    {/* ============ 4 · PRICING ============ */}
    <section className="price" id="price">
      <div className="wrap">
        <p className="eyebrow rv">Pricing</p>
        <h2 className="rv">Three ways in.</h2>
        <p className="lede rv">Setup covers the build and the move over. Monthly covers hosting, support, and changes.</p>
        <div className="tiers">
          <div className="tier rv">
            <h3>Presence</h3><div className="prom">Be found.</div>
            <div className="amt"><b>$97</b><span>/ mo</span></div>
            <div className="setup">$297 setup</div>
            <ul>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Custom site on your domain</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Hosting, updates, backups</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Local search setup</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>One booking or call link</li>
            </ul>
            <button className="tbtn" data-go="#start">Start with Presence</button>
          </div>
          <div className="tier rv">
            <h3>Connected</h3><div className="prom">Never lose a lead.</div>
            <div className="amt"><b>$249</b><span>/ mo</span></div>
            <div className="setup">$597 setup</div>
            <ul>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Everything in Presence</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Your own login and dashboard</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Missed calls texted back</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Calendar synced both ways</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Reminders and review requests</li>
            </ul>
            <button className="tbtn" data-go="#start">Start with Connected</button>
          </div>
          <div className="tier best rv">
            <h3>Operations</h3><div className="prom">Run the whole business from one place.</div>
            <div className="amt"><b>$499</b><span>/ mo</span></div>
            <div className="setup">$997 setup</div>
            <ul>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Everything in Connected</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>AI assistant that answers and books</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Your own business phone line</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Payments and deposits</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Team accounts and roles</li>
              <li><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>Rules, routing, referral links</li>
            </ul>
            <button className="tbtn" data-go="#start">Start with Operations</button>
          </div>
        </div>
        <p className="annual rv">On a twelve month agreement, setup drops by half.</p>
      </div>
    </section>
    
    {/* ============ 5 · CONTACT ============ */}
    <section className="contact" id="start">
      <div className="wrap">
        <div className="cbox rv">
          <div>
            <h2>Tell me what you run. <em>I will map the system.</em></h2>
            <p className="lede">No cost, no obligation. You get a written plan: what it would do, what it replaces, what it costs.</p>
            <div className="creach">
              <a href="tel:+14699431560">
                <svg viewBox="0 0 24 24"><path d="M6.5 3h3l1.5 4.5-2 1.5a13 13 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/></svg>
                (469) 943 1560</a>
              <a href="mailto:alyxlabwork@gmail.com">
                <svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m4.5 8 7.5 5 7.5-5"/></svg>
                alyxlabwork@gmail.com</a>
            </div>
          </div>
          <form className="form" onSubmit={(e) => e.preventDefault()}>
            <input id="f-name" name="name" aria-label="Your name" type="text" autoComplete="name" placeholder="Your name" />
            <input id="f-biz" name="business" aria-label="Business name" type="text" autoComplete="organization" placeholder="Business name" />
            <input id="f-phone" name="phone" aria-label="Phone" type="tel" autoComplete="tel" placeholder="Phone" />
            <select id="f-type" name="businessType" aria-label="What kind of business">
              <option value="">What kind of business</option>
              <option>Barbershop or salon</option>
              <option>Restaurant</option>
              <option>Dealership</option>
              <option>Clinic or practice</option>
              <option>Home services</option>
              <option>Something else</option>
            </select>
            <textarea id="f-msg" name="message" aria-label="What is not working right now" placeholder="What is not working right now"></textarea>
            <button className="btn" id="send" type="submit">Send it over</button>
          </form>
        </div>
      </div>
      <footer>
        <b>Alyxlab</b>
        <span className="end">One person. Complete systems. Dallas, TX.</span>
    
        <div className="gband" id="gband" aria-hidden="true">
          <svg viewBox="0 0 1271 599" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gbandgrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#340B05"/>
                <stop offset="0.1827" stopColor="#0358F7"/>
                <stop offset="0.2837" stopColor="#5092C7"/>
                <stop offset="0.4135" stopColor="#E1ECFE"/>
                <stop offset="0.5866" stopColor="#FFD400"/>
                <stop offset="0.6827" stopColor="#FA3D1D"/>
                <stop offset="0.8029" stopColor="#FD02F5"/>
                <stop offset="1" stopColor="#FFC0FD" stopOpacity="0"/>
              </linearGradient>
              <filter id="gbandblur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="15"/>
              </filter>
            </defs>
            <g filter="url(#gbandblur)" fill="url(#gbandgrad)">
              <rect x="0"       y="276.10" width="173.70" height="322.90"/>
              <rect x="141.22"  y="196.85" width="173.70" height="402.15"/>
              <rect x="282.44"  y="123.83" width="173.70" height="475.17"/>
              <rect x="423.67"  y="59.34"  width="173.70" height="539.66"/>
              <rect x="564.89"  y="11.98"  width="173.70" height="587.02"/>
              <rect x="706.11"  y="59.34"  width="173.70" height="539.66"/>
              <rect x="847.33"  y="123.83" width="173.70" height="475.17"/>
              <rect x="988.56"  y="196.85" width="173.70" height="402.15"/>
              <rect x="1129.78" y="276.10" width="173.70" height="322.90"/>
            </g>
          </svg>
        </div>
      </footer>
    </section>  </>
  );
}
