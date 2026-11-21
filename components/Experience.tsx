"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CONTACT_URL, HERO_CTA_LABEL, HERO_CTA_URL, SECTIONS } from "./content";
import { orbit, PITCH_MAX, PITCH_MIN, scroll, scrollToSection } from "./scroll";

const Scene = dynamic(() => import("./Scene"), { ssr: false });
import { hotspotEls, HOTSPOT_SECTIONS } from "./hotspots";
import { LOGO_SRC } from "./logo";

export default function Experience() {
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [rotated, setRotated] = useState(false);

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
      const p = window.scrollY / window.innerHeight;
      scroll.target = p;
      setActive(Math.round(p));
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
        <Scene onReady={() => setReady(true)} />
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


      <button className="logo" onClick={() => scrollToSection(0)} aria-label="Retour en haut">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="SK" width={360} height={275} />
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
            <section key={s.id} id={s.id} className={`panel ${active === i ? "is-active" : ""}`}>
              <div className={`card ${isHero || isEnd ? "card-lg" : ""}`}>
                {s.index && (
                  <p className="eyebrow">
                    <span className="eyebrow-num">{s.index}</span> Prestation
                  </p>
                )}
                {isEnd && <p className="eyebrow">Étude gratuite et sans engagement</p>}
                {isHero || isEnd ? <h1>{s.title}</h1> : <h2>{s.title}</h2>}
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
                  <>
                    <div className="actions">
                      <a className="btn btn-primary" href={CONTACT_URL}>
                        Demander mon étude gratuite
                      </a>
                      <button className="btn btn-ghost" onClick={() => scrollToSection(0)}>
                        Revoir la maison ↑
                      </button>
                    </div>
                  </>
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
