import { useId } from "react";
import type { Config } from "@/lib/invitation";

// Ornements dessinés autour des prénoms (couronne, éventail art déco, branches, cadre gravé).
// Avec une dorure, ils sont peints avec un dégradé métallique ; useId garantit un identifiant de dégradé unique
// même quand plusieurs miniatures cohabitent dans la page.
const ART = {
  wreath: { vb: "0 0 240 52", stroke: "M114.0 40.0Q70.0 8.0 16.0 40.0M126.0 40.0Q170.0 8.0 224.0 40.0", fill: "M103.3 33.2C98.1 30.5 95.9 24.5 98.4 19.7C103.4 21.7 105.6 27.8 103.3 33.2ZM94.2 29.0C91.6 34.1 85.8 36.3 81.2 33.9C83.1 29.1 88.9 26.9 94.2 29.0ZM84.8 26.1C79.5 24.9 76.1 19.9 77.3 15.1C82.3 15.7 85.6 20.7 84.8 26.1ZM75.3 24.4C74.3 29.6 69.6 32.9 64.9 31.9C65.4 27.1 70.1 23.8 75.3 24.4ZM65.5 24.0C60.5 24.2 56.3 20.7 56.2 16.1C60.8 15.4 65.0 19.0 65.5 24.0ZM55.6 24.9C55.9 29.7 52.6 33.8 48.2 34.0C47.5 29.7 50.8 25.6 55.6 24.9ZM45.5 27.1C41.0 28.4 36.5 26.1 35.4 22.1C39.3 20.5 43.9 22.8 45.5 27.1ZM35.1 30.6C36.4 34.8 34.2 39.1 30.3 40.1C28.8 36.4 31.0 32.1 35.1 30.6ZM24.6 35.3C20.9 37.2 16.5 36.0 14.8 32.6C18.0 30.5 22.4 31.7 24.6 35.3ZM16.0 40.0C14.7 44.4 10.3 47.0 6.3 45.7C7.1 41.6 11.5 39.0 16.0 40.0ZM136.7 33.2C134.4 27.8 136.6 21.7 141.6 19.7C144.1 24.5 141.9 30.5 136.7 33.2ZM145.8 29.0C151.1 26.9 156.9 29.1 158.8 33.9C154.2 36.3 148.4 34.1 145.8 29.0ZM155.2 26.1C154.4 20.7 157.7 15.7 162.7 15.1C163.9 19.9 160.5 24.9 155.2 26.1ZM164.7 24.4C169.9 23.8 174.6 27.1 175.1 31.9C170.4 32.9 165.7 29.6 164.7 24.4ZM174.5 24.0C175.0 19.0 179.2 15.4 183.8 16.1C183.7 20.7 179.5 24.2 174.5 24.0ZM184.4 24.9C189.2 25.6 192.5 29.7 191.8 34.0C187.4 33.8 184.1 29.7 184.4 24.9ZM194.5 27.1C196.1 22.8 200.7 20.5 204.6 22.1C203.5 26.1 199.0 28.4 194.5 27.1ZM204.9 30.6C209.0 32.1 211.2 36.4 209.7 40.1C205.8 39.1 203.6 34.8 204.9 30.6ZM215.4 35.3C217.6 31.7 222.0 30.5 225.2 32.6C223.5 36.0 219.1 37.2 215.4 35.3ZM224.0 40.0C228.5 39.0 232.9 41.6 233.7 45.7C229.7 47.0 225.3 44.4 224.0 40.0Z", dots: [[120, 40, 2.6]] },
  corner: { vb: "0 0 130 64", stroke: "M2.0 4.0Q40.0 2.0 118.0 34.0M30.0 4.0Q52.0 18.0 58.0 52.0", fill: "M11.7 4.0C18.5 4.1 23.7 9.2 23.3 15.5C17.0 16.0 11.8 10.9 11.7 4.0ZM18.8 4.6C19.9 -2.0 25.7 -6.2 31.6 -4.7C31.1 1.3 25.4 5.5 18.8 4.6ZM26.4 5.5C32.8 6.2 37.2 11.6 36.1 17.4C30.2 17.3 25.8 12.0 26.4 5.5ZM34.5 7.0C36.1 0.9 41.9 -2.5 47.3 -0.7C46.3 5.0 40.6 8.4 34.5 7.0ZM43.2 8.8C49.1 9.9 52.8 15.3 51.4 20.6C45.9 20.1 42.2 14.8 43.2 8.8ZM52.3 11.1C54.2 5.6 59.8 2.7 64.7 4.8C63.5 10.0 57.9 12.9 52.3 11.1ZM62.0 13.8C67.5 15.2 70.6 20.4 69.0 25.3C63.9 24.5 60.7 19.3 62.0 13.8ZM72.2 17.0C74.2 11.9 79.5 9.6 84.0 11.7C82.6 16.5 77.3 18.9 72.2 17.0ZM82.9 20.6C87.9 22.1 90.6 27.0 88.9 31.5C84.2 30.6 81.4 25.6 82.9 20.6ZM94.1 24.6C96.1 20.0 101.1 18.0 105.2 20.2C103.7 24.6 98.7 26.6 94.1 24.6ZM105.8 29.1C110.4 30.7 112.7 35.3 110.9 39.4C106.6 38.3 104.3 33.7 105.8 29.1ZM118.0 34.0C123.0 32.0 128.3 34.2 129.8 38.8C125.4 41.1 120.1 38.9 118.0 34.0ZM35.0 7.6C38.3 4.0 43.5 3.8 46.5 7.1C43.8 10.7 38.7 10.9 35.0 7.6ZM42.4 15.0C45.5 18.3 45.3 23.1 42.0 25.7C38.9 22.9 39.1 18.1 42.4 15.0ZM48.6 24.0C52.3 22.1 56.5 23.5 57.9 27.1C54.6 29.1 50.4 27.7 48.6 24.0ZM53.4 34.5C54.9 38.0 53.4 41.8 50.1 42.9C48.4 39.8 49.9 36.0 53.4 34.5ZM56.9 46.7C60.3 46.1 63.3 48.2 63.6 51.4C60.5 52.2 57.5 50.1 56.9 46.7ZM58.0 52.0C61.1 54.2 61.8 58.2 59.6 60.9C56.5 59.1 55.8 55.1 58.0 52.0Z", dots: [] },
  deco: { vb: "0 0 240 68", stroke: "M100.3 58.5L68.8 53.0M101.2 55.2L78.7 47.0M102.7 52.0L75.0 36.0M104.7 49.1L86.3 33.7M107.1 46.7L86.6 22.2M110.0 44.7L98.0 23.9M113.2 43.2L102.2 13.1M116.5 42.3L112.4 18.7M120.0 42.0L120.0 10.0M123.5 42.3L127.6 18.7M126.8 43.2L137.8 13.1M130.0 44.7L142.0 23.9M132.9 46.7L153.4 22.2M135.3 49.1L153.7 33.7M137.3 52.0L165.0 36.0M138.8 55.2L161.3 47.0M139.7 58.5L171.2 53.0M62 62A58 58 0 0 1 178 62M105 62A15 15 0 0 1 135 62M12 62H56M184 62H228", fill: "M8 58.8L11.2 62L8 65.2L4.8 62ZM232 58.8L235.2 62L232 65.2L228.8 62ZM120 -1.4L123.4 2L120 5.4L116.6 2Z", dots: [] },
  frame: { vb: "0 0 44 44", stroke: "M2 42V14Q2 2 14 2H42M8 42V18Q8 8 18 8H42M14 14m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0", fill: "", dots: [] },
} as const;

function Art({ name, foil, className }: { name: keyof typeof ART; foil: string; className: string }) {
  const a = ART[name], id = "fpg" + useId().replace(/[^a-zA-Z0-9]/g, ""), paint = foil !== "aucune" ? `url(#${id})` : undefined;
  const sw = name === "frame" ? 1.4 : name === "deco" ? 1.1 : 1.2;
  return (
    <svg className={className} viewBox={a.vb} aria-hidden="true" focusable="false">
      {paint && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2=".35">
            <stop offset="0" className="fs1" /><stop offset=".35" className="fs2" /><stop offset=".55" className="fs3" />
            <stop offset=".75" className="fs2" /><stop offset="1" className="fs4" />
          </linearGradient>
        </defs>
      )}
      <path className="art-s" fill="none" strokeWidth={sw} strokeLinecap="round" stroke={paint} d={a.stroke} />
      {a.fill && <path className="art-f" fill={paint} d={a.fill} />}
      {a.dots.map((d, i) => <circle key={i} className="art-f" cx={d[0]} cy={d[1]} r={d[2]} fill={paint} />)}
    </svg>
  );
}

// Ornements d'un faire-part : au-dessus des prénoms (couronne, éventail) ou dans les coins (botanique, cadre).
export function DecorTop({ cfg }: { cfg: Pick<Config, "decor" | "foil"> }) {
  if (cfg.decor === "feuillage") return <Art name="wreath" foil={cfg.foil} className="dc-top dc-wreath" />;
  if (cfg.decor === "artdeco") return <Art name="deco" foil={cfg.foil} className="dc-top dc-deco" />;
  return null;
}
export function DecorCorners({ cfg }: { cfg: Pick<Config, "decor" | "foil"> }) {
  if (cfg.decor === "botanique") return <><Art name="corner" foil={cfg.foil} className="dc-corner dc-tl" /><Art name="corner" foil={cfg.foil} className="dc-corner dc-br" /></>;
  if (cfg.decor === "cadre") return (
    <>
      <span className="dc-frame" aria-hidden="true" />
      {(["tl", "tr", "bl", "br"] as const).map((k) => <Art key={k} name="frame" foil={cfg.foil} className={"dc-fc dc-" + k} />)}
    </>
  );
  return null;
}
export function DecorBottom({ cfg }: { cfg: Pick<Config, "decor"> }) {
  return cfg.decor === "artdeco" ? <span className="dc-rule" aria-hidden="true" /> : null;
}

export function styleAttrs(cfg: Pick<Config, "theme" | "font" | "decor" | "foil" | "texture">) {
  return { "data-theme": cfg.theme, "data-font": cfg.font, "data-decor": cfg.decor, "data-foil": cfg.foil, "data-texture": cfg.texture ? "papier" : "lisse" };
}

export function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 21s-7.05-4.35-9.5-8.5C.7 9 2.2 5 6.3 5c2 0 3.6 1.1 5.7 3.6C14.1 6.1 15.7 5 17.7 5c4.1 0 5.6 4 3.8 7.5C19.05 16.65 12 21 12 21z" />
    </svg>
  );
}
