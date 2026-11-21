"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ADDRESS, CONTACT_URL, SECTIONS } from "./content";
import { scroll, scrollToSection } from "./scroll";

const Scene = dynamic(() => import("./Scene"), { ssr: false });
import { hotspotEls, HOTSPOT_SECTIONS } from "./hotspots";

export default function Experience() {
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const last = SECTIONS.length - 1;

  useEffect(() => {
    const onScroll = () => {
      const p = window.scrollY / window.innerHeight;
      scroll.target = p;
      setActive(Math.round(p));
      document.documentElement.style.setProperty("--progress", String(Math.min(1, p / last)));
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
      <div className="stage" aria-hidden>
        <Scene onReady={() => setReady(true)} />
      </div>
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

      <header className="topbar">
        <button className="brand" onClick={() => scrollToSection(0)}>
          <span className="brand-mark">ECH</span>
          <span className="brand-name">
            Experts Conseil Habitat
            <small>L'excellence sur votre toit</small>
          </span>
        </button>
        <a className="btn btn-primary btn-sm" href={CONTACT_URL}>
          Étude gratuite
        </a>
        <div className="progress" />
      </header>

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
                {isHero && <p className="eyebrow">Experts Conseil Habitat · Aix-en-Provence</p>}
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
                    <a className="btn btn-primary" href={CONTACT_URL}>
                      Demander une étude gratuite
                    </a>
                    <button className="btn btn-ghost" onClick={() => scrollToSection(1)}>
                      Lancer le diagnostic ↓
                    </button>
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
                    <p className="address">{ADDRESS}</p>
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
