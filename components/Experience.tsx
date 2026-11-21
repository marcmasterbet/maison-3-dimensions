"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { END_CTA_LABEL, END_CTA_URL, END_LINES, HERO_CTA_LABEL, HERO_CTA_URL, PORTRAITS, SECTIONS, TEAM, TEAM_TITLE } from "./content";
import { layout, orbit, PITCH_MAX, PITCH_MIN, scroll, scrollToSection, sectionHeight } from "./scroll";

const Scene = dynamic(() => import("./Scene"), { ssr: false });
import { hotspotEls, HOTSPOT_SECTIONS } from "./hotspots";
import { LOGO_SRC } from "./logo";

// Si la 3D plante (mémoire graphique, WebGL indisponible), on réessaie une fois en mode sûr,
// puis on laisse le site fonctionner sans la maison plutôt que d'afficher une page d'erreur.
class Boundary extends Component<{ children: ReactNode; fallback: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function Experience() {
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const heroCard = useRef<HTMLDivElement>(null);
  const endCard = useRef<HTMLDivElement>(null);

  // Mesure le bas du bloc de texte de l'accueil : la scène 3D cale la maison juste en dessous.
  useEffect(() => {
    const el = heroCard.current;
    if (!el) return;
    const end = endCard.current;
    const measure = () => {
      layout.heroBottom = el.offsetTop + el.offsetHeight;
      // haut du bloc de fin, relatif au haut de sa section
      if (end) layout.endTop = end.offsetTop;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (end) ro.observe(end);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Cliquer-glisser (ou glisser au doigt) pour tourner la maison à 360°.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    orbit.dragging = true;
    el.classList.add("is-dragging");
    let lx = e.clientX;
    let ly = e.clientY;
    const move = (ev: PointerEvent) => {
      orbit.yaw -= (ev.clientX - lx) * 0.008;
      orbit.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, orbit.pitch + (ev.clientY - ly) * 0.005));
      lx = ev.clientX;
      ly = ev.clientY;
      setRotated(true);
    };
    const up = () => {
      orbit.dragging = false;
      el.classList.remove("is-dragging");
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const recenter = () => {
    // revient par le chemin le plus court
    orbit.yaw = Math.round(orbit.yaw / (Math.PI * 2)) * Math.PI * 2;
    orbit.pitch = 0;
    setRotated(false);
    setTimeout(() => {
      orbit.yaw = orbit.y = 0;
    }, 900);
  };
  const last = SECTIONS.length - 1;

  useEffect(() => {
    const onScroll = () => {
      // fin de page = dernière section, même si la barre d'adresse du téléphone change la hauteur visible
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = window.scrollY / sectionHeight();
      const p = max > 0 && window.scrollY >= max - 2 ? last : Math.min(last, raw);
      scroll.target = p;
      setActive(Math.round(p));
      setAtTop(p < 0.12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [last]);

  return (
    <>
      <div className="stage" aria-hidden onPointerDown={onPointerDown}>
        <Boundary
          fallback={
            <Boundary fallback={null} onError={() => setReady(true)}>
              <Scene safe onReady={() => setReady(true)} />
            </Boundary>
          }
        >
          <Scene onReady={() => setReady(true)} />
        </Boundary>
      </div>
      <button className={`recenter ${rotated ? "is-visible" : ""}`} onClick={recenter}>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
          <path d="M4 10a6 6 0 1 0 2-4.5M4 3v3.5h3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Recentrer
      </button>
      {!rotated && (
        <div className="drag-hint" aria-hidden>
          Cliquez-glissez pour tourner la maison
        </div>
      )}
      <div className="hotspots">
        {HOTSPOT_SECTIONS.map((section, i) => {
          const s = SECTIONS[section];
          return (
            <button
              key={section}
              ref={(el) => {
                hotspotEls[i] = el;
              }}
              className="hotspot"
              style={{ opacity: 0 }}
              onClick={() => scrollToSection(section)}
              aria-label={s.title}
            >
              <span className="hotspot-dot">{s.index}</span>
              <span className="hotspot-label">{s.short}</span>
            </button>
          );
        })}
      </div>
      <div className={`veil ${ready ? "is-hidden" : ""}`} aria-hidden>
        <div className="veil-mark">ECH</div>
        <div className="veil-bar" />
      </div>


      <button className={`logo ${atTop ? "" : "is-hidden"}`} onClick={() => scrollToSection(0)} aria-label="Retour en haut">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo-portrait" src={PORTRAITS[0]} alt="" width={320} height={320} />
        <img className="logo-mark" src={LOGO_SRC} alt="SK" width={360} height={275} />
        <img className="logo-portrait" src={PORTRAITS[1]} alt="" width={320} height={320} />
      </button>

      <nav className="rail" aria-label="Prestations">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            className={`rail-item ${active === i ? "is-active" : ""}`}
            onClick={() => scrollToSection(i)}
            aria-current={active === i}
          >
            <span className="rail-label">{s.short}</span>
            <span className="rail-dot" />
          </button>
        ))}
      </nav>

      <main>
        {SECTIONS.map((s, i) => {
          const isHero = i === 0;
          const isEnd = i === last;
          return (
            <section key={s.id} id={s.id} className={`panel ${isHero ? "panel-hero" : ""} ${active === i ? "is-active" : ""}`}>
              <div ref={isHero ? heroCard : isEnd ? endCard : undefined} className={`card ${isHero || isEnd ? "card-lg" : ""}`}>
                {s.index && (
                  <p className="eyebrow">
                    <span className="eyebrow-num">{s.index}</span> Prestation
                  </p>
                )}
                {isEnd && (
                  <div className="team">
                    <p className="team-title">{TEAM_TITLE}</p>
                    <div className="team-row">
                      {/* eslint-disable @next/next/no-img-element */}
                      <figure>
                        <img className="portrait" src={TEAM[0].photo} alt={TEAM[0].name} width={320} height={320} loading="lazy" />
                        <figcaption>
                          <strong>{TEAM[0].name}</strong>
                          {TEAM[0].role}
                        </figcaption>
                      </figure>
                      <img className="team-logo" src={LOGO_SRC} alt="Logo" width={360} height={275} />
                      <figure>
                        <img className="portrait" src={TEAM[1].photo} alt={TEAM[1].name} width={320} height={320} loading="lazy" />
                        <figcaption>
                          <strong>{TEAM[1].name}</strong>
                          {TEAM[1].role}
                        </figcaption>
                      </figure>
                      {/* eslint-enable @next/next/no-img-element */}
                    </div>
                  </div>
                )}
                {isHero ? (
                  <h1>{s.title}</h1>
                ) : isEnd ? (
                  <h2 className="end-title">
                    {END_LINES.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                  </h2>
                ) : (
                  <h2>{s.title}</h2>
                )}
                <p className="lead">{s.text}</p>
                {s.points && (
                  <ul className="points">
                    {s.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                )}
                {isHero && (
                  <div className="actions">
                    <a className="btn btn-primary" href={HERO_CTA_URL}>
                      {HERO_CTA_LABEL}
                    </a>
                  </div>
                )}
                {isEnd && (
                  <div className="actions">
                    <a className="btn btn-primary" href={END_CTA_URL}>
                      {END_CTA_LABEL}
                    </a>
                  </div>
                )}
              </div>
              {isHero && (
                <div className="scroll-hint" aria-hidden>
                  <span />
                  Faites défiler
                </div>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
