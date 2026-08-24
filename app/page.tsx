"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import iconManifest from "../public/assets/icon_bundle/manifest.json";

type PhaseKey = "ship" | "colony" | "people" | "planet";
type DepartmentKey = "teknik" | "helbred" | "civil";
type Order = { id: string; title: string; detail: string; cost: number; adviser: string; role: string; consequence: string; icon: string; iconId?: string; video?: string };
type ManifestIconEntry = { id: string; label_da: string; png: string; webm: string };

const iconAssetBase = "/assets/icon_bundle/";
const manifestIcons = new Map((iconManifest.icons as ManifestIconEntry[]).map((icon) => [icon.id, icon]));

const phases: { key: PhaseKey; number: string; label: string; sub: string; iconId: string }[] = [
  { key: "ship", number: "01", label: "SKIBET", sub: "ORDRER & KORT", iconId: "ship" },
  { key: "colony", number: "02", label: "KOLONIEN", sub: "BYG & VEDLIGEHOLD", iconId: "colony" },
  { key: "people", number: "03", label: "KOLONISTERNE", sub: "MENNESKELIG ADFÆRD", iconId: "colonists" },
  { key: "planet", number: "04", label: "PLANETEN", sub: "AUTONOM REAKTION", iconId: "planet" },
];

const departments: Record<DepartmentKey, { label: string; alert: string; orders: Order[] }> = {
  teknik: { label: "TEKNISK KONTROL", alert: "Nødreaktoren leverer ustabil effekt", orders: [
    { id: "reaktor", title: "Stabilisér nødreaktor", detail: "+18 energi · risiko for kølevæskelæk", cost: 1, adviser: "ASTA VALE", role: "SYSTEMINGENIØR", consequence: "Vi får strømmen tilbage, men en hurtig stabilisering kan sprænge en slidt køleventil.", icon: "/assets/icons/order-reactor.webp", iconId: "emergency-reactor", video: "/assets/order-reactor-cinemagraph.mp4" },
    { id: "varme", title: "Genstart varmekredsløb", detail: "+12 varme · beboelse prioriteres", cost: 1, adviser: "MADS RY", role: "DRIFTSTEKNIKER", consequence: "Beboelsen bliver sikker, men dvalesektionen må køre på minimumseffekt resten af cyklussen.", icon: "/assets/icons/order-heat-loop.webp", iconId: "heat-loop" },
    { id: "værksted", title: "Åbn værkstedssektion", detail: "Låser reparationer op næste cyklus", cost: 2, adviser: "SKIBSSYSTEMET", role: "AUTOMATISK ANALYSE", consequence: "Værkstedet giver langsigtet kapacitet. Kolonien må acceptere ustabil strøm nu.", icon: "/assets/icons/order-workshop.webp", iconId: "workshop" },
  ] },
  helbred: { label: "HELBRED & DVALE", alert: "Dvalesektor D-17 mister stabilitet", orders: [
    { id: "asta", title: "Væk Asta Vale", detail: "Systemingeniør · 11% medicinsk risiko", cost: 1, adviser: "DR. ELIAS NYBORG", role: "DVALELÆGE", consequence: "Asta kan redde reaktoren, men opvågningen kan give permanente neurologiske følger.", icon: "/assets/icons/order-wake.webp" },
    { id: "isolér", title: "Isolér sektor D-17", detail: "143 kapsler stabiliseres midlertidigt", cost: 1, adviser: "MEDICINSK SYSTEM", role: "RISIKOVURDERING", consequence: "Sektionen kan holde tre cyklusser mere, men reservekredsløbet bliver opbrugt.", icon: "/assets/icons/order-isolate.webp" },
    { id: "triage", title: "Indfør kapseltriage", detail: "Red kritiske kapsler · tab af lighed", cost: 2, adviser: "MIRA HALD", role: "MIDLERTIDIG TALSFØRER", consequence: "Vi redder dem med størst chance. Familierne vil opdage, hvem der blev nedprioriteret.", icon: "/assets/icons/order-triage.webp" },
  ] },
  civil: { label: "CIVIL KOORDINATION", alert: "De vågne kolonister kræver en arbejdsplan", orders: [
    { id: "nødskift", title: "Indfør nødskift", detail: "+produktion · −moral", cost: 1, adviser: "MIRA HALD", role: "KOLONISTERNES TALSFØRER", consequence: "Folkene gør det nødvendige, men husker at din første handling var at forlænge deres arbejdsdag.", icon: "/assets/icons/order-emergency-shift.webp" },
    { id: "rotation", title: "Indfør roterende vagter", detail: "Stabil drift · stabil moral", cost: 1, adviser: "JONAS VEJ", role: "LOGISTIKANSVARLIG", consequence: "Ordningen er langsommere, men retfærdig. Ingen afdeling får fuld bemanding.", icon: "/assets/icons/order-rotation.webp" },
    { id: "råd", title: "Indkald det første koloniråd", detail: "+moral · teknisk forsinkelse", cost: 2, adviser: "MIRA HALD", role: "KOLONISTERNES TALSFØRER", consequence: "Kolonisterne får medbestemmelse fra begyndelsen. Kritiske reparationer må vente.", icon: "/assets/icons/order-council.webp" },
  ] },
};

const actionCards = [
  ["RESERVEKREDSLØB", "Flyt én ordre uden om energikravet", "/assets/icons/card-reserve-circuit.webp"],
  ["NØDOPTØNING", "Væk straks én person fra en kritisk kapsel", "/assets/icons/card-emergency-thaw.webp"],
  ["DOBBELTSKIFT", "Få én ekstra ordre · −8 moral", "/assets/icons/card-double-shift.webp"],
] as const;

const resources = [
  ["ENERGI", "38%", 38, "energy", "/assets/icons/resource-energy.webp"],
  ["VARME", "61%", 61, "heat", "/assets/icons/resource-heat.webp"],
  ["ILT", "84%", 84, "oxygen", "/assets/icons/resource-oxygen.webp"],
  ["RATIONER", "19 DØGN", 54, "rations", "/assets/icons/resource-rations.webp"],
] as const;

const availableOrderVideos = Array.from(new Set(Object.values(departments).flatMap(({ orders }) => orders.flatMap((order) => order.video ? [order.video] : []))));

const musicTracks = ["/assets/music/fading-motif.mp3", "/assets/music/fret-noise.mp3"] as const;

const colonyProjects = [
  ["VANDRENSNING 01", "Vedligehold", "72%", "KRITISK OM 3 TURE"],
  ["DRIVHUS NORD", "Byg", "41%", "MANGLER 6 ARBEJDERE"],
  ["BOLIGRING A", "Udvid", "88%", "KLAR NÆSTE TUR"],
  ["FELTHOSPITAL", "Planlagt", "0%", "KRÆVER LÆGE"],
] as const;

const people = [
  ["MH", "MIRA HALD", "Talsfører", "Bekymret"], ["AV", "ASTA VALE", "Ingeniør", "Sovende"],
  ["JV", "JONAS VEJ", "Logistik", "Udmattet"], ["EN", "ELIAS NYBORG", "Læge", "Sovende"],
  ["SO", "SARA OKSE", "Botaniker", "Håbefuld"],
] as const;

const socialEvents = [
  "To teknikere nægter at arbejde, før deres familier vækkes.",
  "En gruppe kolonister har på eget initiativ repareret den østlige varmecentral.",
  "Der er opstået rygter om, at ledelsen skjuler antallet af tabte kapsler.",
  "To familier gør krav på den samme boligsektion.",
  "En botaniker beder om frivillige til en uautoriseret ekspedition.",
];

const planetEvents = [
  ["GUNSTIG BLOMSTRING", "Vinden fører frø ind over markerne. Fødevareudbyttet kan stige, hvis arten viser sig sikker."],
  ["VARM REGN", "Vandlagrene fyldes, men den sydlige vej mister bæreevne."],
  ["STILLE CYKLUS", "Ingen akut fare registreres. Små nataktive organismer samles omkring koloniens varmekilder."],
  ["FROSTFRONT", "Temperaturen falder hurtigt. Drivhuset holder, men ubeskyttede rør er i fare."],
] as const;

function beep(frequency = 180, duration = 0.06, type: OscillatorType = "square") {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
  oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0.028, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); oscillator.connect(gain); gain.connect(ctx.destination);
  oscillator.start(); oscillator.stop(ctx.currentTime + duration);
}

function randomIndex(length: number) {
  return Math.floor(Math.random() * length);
}

function OrderPreview({ order }: { order: Order }) {
  if (order.id === "reaktor" && order.video) {
    return <div className="reactor-preview">
      <video autoPlay muted loop playsInline preload="auto" aria-hidden="true">
        <source src={order.video} type="video/mp4" />
      </video>
      <div className="reactor-video-shade" />
      <section className="reactor-brief">
        <span>ORDRE 01 · TEKNISK KONTROL</span>
        <h1>{order.title}</h1>
        <div className="reactor-metrics"><strong>+18<small>ENERGI</small></strong><strong>1<small>ORDRE</small></strong><strong className="warning">RISIKO<small>KØLEVÆSKELÆK</small></strong></div>
        <p>{order.consequence}</p>
        <footer><b>{order.adviser}</b><small>{order.role} · ORDREN ER IKKE PLACERET</small></footer>
      </section>
    </div>;
  }

  return <div className="adviser-view"><div className="adviser-id">{order.adviser.split(" ").map((word) => word[0]).join("").slice(0, 2)}</div><div><span>{order.role}</span><h1>{order.adviser}</h1><p>{order.consequence}</p><small>ORDREN ER IKKE PLACERET ENDNU</small></div></div>;
}

function ManifestIcon({ id, fallback, active, className = "" }: { id?: string; fallback?: string; active: boolean; className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const entry = id ? manifestIcons.get(id) : undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    setVideoVisible(false);
    if (active) {
      video.currentTime = 0;
      void video.play().then(() => {
        if (!cancelled && !video.paused) setVideoVisible(true);
      }).catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }

    return () => {
      cancelled = true;
      video.pause();
      video.currentTime = 0;
    };
  }, [active]);

  if (!entry) return fallback ? <img className={className} src={fallback} alt="" /> : null;

  return <span className={`manifest-icon ${active ? "active" : ""} ${videoVisible ? "video-ready" : ""} ${className}`} aria-hidden="true">
    <img src={`${iconAssetBase}${entry.png}`} alt="" />
    <video ref={videoRef} muted loop playsInline preload="none">
      <source src={`${iconAssetBase}${entry.webm}`} type="video/webm" />
    </video>
  </span>;
}

function BackgroundMusic() {
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const activeRef = useRef(0);
  const fadeTimerRef = useRef<number | null>(null);
  const crossfadingRef = useRef(false);
  const volumeRef = useRef(0.18);
  const [activeTrack, setActiveTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.18);
  const [settingsReady, setSettingsReady] = useState(true);

  useEffect(() => {
    setMuted(false);
    setVolume(0.18);
  }, []);

  useEffect(() => {
    const startAfterFirstInteraction = (event: Event) => {
      const audio = audioRefs.current[activeRef.current];
      if (!audio || !audio.paused) return;
      audio.volume = volumeRef.current;
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };
    window.addEventListener("pointerdown", startAfterFirstInteraction, { once: true });
    window.addEventListener("keydown", startAfterFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", startAfterFirstInteraction);
      window.removeEventListener("keydown", startAfterFirstInteraction);
    };
  }, []);

  useEffect(() => {
    volumeRef.current = volume;
    if (!crossfadingRef.current) {
      const activeAudio = audioRefs.current[activeRef.current];
      if (activeAudio) activeAudio.volume = volume;
    }
    if (settingsReady) window.localStorage.setItem("planetens-svar-music-volume", String(volume));
  }, [volume, settingsReady]);

  useEffect(() => {
    audioRefs.current.forEach((audio) => { if (audio) audio.muted = muted; });
    if (settingsReady) window.localStorage.setItem("planetens-svar-music-muted", String(muted));
  }, [muted, settingsReady]);

  useEffect(() => () => {
    if (fadeTimerRef.current !== null) window.clearInterval(fadeTimerRef.current);
  }, []);

  function beginCrossfade(fromIndex: number) {
    if (crossfadingRef.current || !playing) return;
    const toIndex = (fromIndex + 1) % musicTracks.length;
    const from = audioRefs.current[fromIndex];
    const to = audioRefs.current[toIndex];
    if (!from || !to) return;

    crossfadingRef.current = true;
    to.currentTime = 0;
    to.volume = 0;
    to.muted = muted;
    void to.play().catch(() => { crossfadingRef.current = false; });
    const startedAt = performance.now();
    const fadeDuration = 6500;

    fadeTimerRef.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / fadeDuration);
      const baseVolume = volumeRef.current;
      from.volume = baseVolume * (1 - progress);
      to.volume = baseVolume * progress;
      if (progress >= 1) {
        if (fadeTimerRef.current !== null) window.clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        from.pause();
        from.currentTime = 0;
        activeRef.current = toIndex;
        setActiveTrack(toIndex);
        crossfadingRef.current = false;
      }
    }, 100);
  }

  function togglePlayback() {
    const activeAudio = audioRefs.current[activeRef.current];
    if (!activeAudio) return;
    if (playing) {
      if (fadeTimerRef.current !== null) window.clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
      crossfadingRef.current = false;
      audioRefs.current.forEach((audio, index) => {
        if (!audio) return;
        audio.pause();
        if (index !== activeRef.current) audio.currentTime = 0;
      });
      activeAudio.volume = volumeRef.current;
      setPlaying(false);
      return;
    }
    activeAudio.volume = volumeRef.current;
    activeAudio.muted = muted;
    void activeAudio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function handleTimeUpdate(index: number) {
    const audio = audioRefs.current[index];
    if (!audio || index !== activeRef.current || !playing || !Number.isFinite(audio.duration)) return;
    if (audio.duration - audio.currentTime <= 7) beginCrossfade(index);
  }

  function handleEnded(index: number) {
    if (crossfadingRef.current || index !== activeRef.current) return;
    const nextIndex = (index + 1) % musicTracks.length;
    const next = audioRefs.current[nextIndex];
    if (!next) return;
    activeRef.current = nextIndex;
    setActiveTrack(nextIndex);
    next.currentTime = 0;
    next.volume = volumeRef.current;
    next.muted = muted;
    if (playing) void next.play();
  }

  function adjustVolume(delta: number) {
    setVolume((current) => Math.max(0, Math.min(0.4, Number((current + delta).toFixed(2)))));
  }

  return <div className="background-music" aria-hidden="true">
    {musicTracks.map((src, index) => <audio key={src} ref={(element) => { audioRefs.current[index] = element; }} preload="auto" onTimeUpdate={() => handleTimeUpdate(index)} onEnded={() => handleEnded(index)}><source src={src} type="audio/mpeg" /></audio>)}
  </div>;
}

export default function Home() {
  const [viewportScale, setViewportScale] = useState(1);
  const [phase, setPhase] = useState<PhaseKey>("ship");
  const [hoveredPhaseIcon, setHoveredPhaseIcon] = useState<PhaseKey | null>(null);
  const [department, setDepartment] = useState<DepartmentKey>("teknik");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredResourceIcon, setHoveredResourceIcon] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [monitorOrder, setMonitorOrder] = useState<Order | null>(null);
  const [placed, setPlaced] = useState<Order[]>([]);
  const [playedCard, setPlayedCard] = useState<string | null>(null);
  const [notice, setNotice] = useState("Hold musen over en ordre. Den store sikkerhedsdør åbner automatisk.");
  const [colonyProject, setColonyProject] = useState(0);
  const [socialEvent, setSocialEvent] = useState("Hjulet venter på kolonisternes fase.");
  const [spinning, setSpinning] = useState(false);
  const [wheelTurn, setWheelTurn] = useState(0);
  const [planetEvent, setPlanetEvent] = useState(2);
  const [specialEvent, setSpecialEvent] = useState<string | null>(null);
  const [cycle, setCycle] = useState(1);

  const activeDepartment = departments[department];
  const visibleAnimatedIconIds = [
    ...phases.map((item) => item.iconId),
    ...(phase === "ship"
      ? [...resources.map(([, , , iconId]) => iconId), ...activeDepartment.orders.flatMap((order) => order.iconId ? [order.iconId] : [])]
      : []),
  ];
  const visibleAnimatedIcons = visibleAnimatedIconIds.flatMap((id) => {
    const entry = manifestIcons.get(id);
    return entry ? [entry] : [];
  });
  const hovered = activeDepartment.orders.find((order) => order.id === hoveredId) ?? null;
  const selected = activeDepartment.orders.find((order) => order.id === selectedId) ?? null;
  const displayedOrder = hovered ?? selected;
  const visibleMonitorOrder = displayedOrder ?? monitorOrder;
  const usedOrders = placed.reduce((sum, order) => sum + order.cost, 0);
  const maxOrders = playedCard === "DOBBELTSKIFT" ? 4 : 3;
  const remaining = maxOrders - usedOrders;
  const pods = useMemo(() => Array.from({ length: 48 }, (_, index) => {
    if ([8, 21].includes(index)) return "lost"; if ([4, 13, 29, 42].includes(index)) return "critical";
    if ([2, 17, 35, 45].includes(index)) return "unstable"; if (index < 2) return "awake"; return "stable";
  }), []);

  useEffect(() => {
    const fitGameToViewport = () => {
      const viewport = window.visualViewport;
      const visibleWidth = Math.min(window.innerWidth, viewport?.width ?? window.innerWidth);
      const visibleHeight = Math.min(window.innerHeight, viewport?.height ?? window.innerHeight);
      const availableWidth = Math.max(320, visibleWidth - 32);
      const availableHeight = Math.max(320, visibleHeight - 64);
      setViewportScale(Math.max(0.3, Math.min(1, availableWidth / 1920, availableHeight / 1080)));
    };

    fitGameToViewport();
    window.addEventListener("resize", fitGameToViewport);
    window.visualViewport?.addEventListener("resize", fitGameToViewport);
    return () => {
      window.removeEventListener("resize", fitGameToViewport);
      window.visualViewport?.removeEventListener("resize", fitGameToViewport);
    };
  }, []);

  useEffect(() => {
    if (displayedOrder) {
      setMonitorOrder(displayedOrder);
      return;
    }

    const closeDelay = window.setTimeout(() => setMonitorOrder(null), 920);
    return () => window.clearTimeout(closeDelay);
  }, [displayedOrder]);

  function changePhase(next: PhaseKey) {
    setPhase(next); setHoveredId(null); beep(next === "planet" ? 105 : next === "people" ? 250 : next === "colony" ? 320 : 410, 0.12, "sine");
    if (next === "planet") {
      setPlanetEvent(randomIndex(planetEvents.length));
      setSpecialEvent(randomIndex(100) < 12 ? "GEOLOGISK BRUD · Et jordskred har blotlagt en metallisk åre syd for kolonien." : null);
      setCycle((value) => value + 1);
    }
  }

  function placeOrder() {
    if (!selected) { setNotice("Vælg først en ordre."); beep(90, 0.1, "sawtooth"); return; }
    if (placed.some((order) => order.id === selected.id)) { setNotice("Ordren er allerede placeret."); return; }
    if (selected.cost > remaining) { setNotice("Der er ikke nok ledig ordrekapacitet."); beep(90, 0.1, "sawtooth"); return; }
    setPlaced((orders) => [...orders, selected]); setSelectedId(null); setNotice(`Ordre placeret: ${selected.title}`); beep(520, 0.12, "sine");
  }

  function playCard(title: string) {
    setPlayedCard((current) => current === title ? null : title);
    setNotice(title === "DOBBELTSKIFT" ? "Dobbeltskift aktiveret: én ekstra ordre, men kolonisternes moral falder." : `${title} er gjort klar til denne cyklus.`);
    beep(610, 0.14, "triangle");
  }

  function spinWheel() {
    if (spinning) return;
    setSpinning(true); setSocialEvent("Kolonien bevæger sig uden for din kontrol …"); setWheelTurn((turn) => turn + 1); beep(150, 0.24, "sawtooth");
    window.setTimeout(() => { setSocialEvent(socialEvents[randomIndex(socialEvents.length)]); setSpinning(false); beep(480, 0.18, "sine"); }, 1050);
  }

  return (
    <main className={`game-shell surface-${phase}`}>
      <div className="video-preload-rack" aria-hidden="true">{availableOrderVideos.map((video) => <video key={video} src={video} muted playsInline preload="auto" />)}</div>
      <div className="icon-video-preload-rack" aria-hidden="true">{visibleAnimatedIcons.map((icon) => <video key={icon.id} src={`${iconAssetBase}${icon.webm}`} muted playsInline preload="auto" />)}</div>
      <BackgroundMusic />
      <section className="game-frame" style={{ transform: `translate(-50%, -50%) scale(${viewportScale})` }} aria-label="Planetens Svar prototype">
        <nav className="macro-phases" aria-label="Turens fire faser">
          <div className="cycle-mark"><span>CYKLUS</span><strong>{String(cycle).padStart(3, "0")}</strong></div>
          {phases.map((item) => <button key={item.key} className={phase === item.key ? "active" : ""} type="button" onMouseEnter={() => setHoveredPhaseIcon(item.key)} onMouseLeave={() => setHoveredPhaseIcon(null)} onFocus={() => setHoveredPhaseIcon(item.key)} onBlur={() => setHoveredPhaseIcon(null)} onClick={() => changePhase(item.key)}><ManifestIcon id={item.iconId} active={hoveredPhaseIcon === item.key} className="phase-icon" /><span className="phase-number">{item.number}</span><strong>{item.label}</strong><small>{item.sub}</small></button>)}
        </nav>

        {phase === "ship" && <section className="phase-surface ship-surface" aria-label="Fase 1: Skibet">
          <aside className="ship-left metal-panel">
            <header><span>VARDØ · INTERNT NET</span><strong>{activeDepartment.label}</strong></header>
            <div className="department-buttons">{(["teknik", "helbred", "civil"] as DepartmentKey[]).map((key, index) => <button key={key} className={department === key ? "active" : ""} type="button" onClick={() => { setDepartment(key); setSelectedId(null); setHoveredId(null); beep(280 + index * 70); }}><span>0{index + 1}</span>{key.toUpperCase()}</button>)}</div>
            <div className="ship-alert"><span>AKTUEL ALARM</span><strong>{activeDepartment.alert}</strong><p>Vælg en ordre og gennemgå konsekvensen på hovedmonitoren.</p></div>
            <div className="resource-stack">{resources.map(([name, value, level, iconId, fallback]) => <div className="resource-line" key={name} onMouseEnter={() => setHoveredResourceIcon(iconId)} onMouseLeave={() => setHoveredResourceIcon(null)}><ManifestIcon id={iconId} fallback={fallback} active={hoveredResourceIcon === iconId} className="resource-icon" /><span>{name}</span><strong>{value}</strong><i><b style={{ width: `${level}%` }} /></i></div>)}</div>
          </aside>

          <article className="ship-monitor metal-panel">
            <header className="monitor-header"><span>HOVEDMONITOR · DVALESEKTORER</span><strong>{visibleMonitorOrder ? "ORDREVURDERING" : "KAPSELTILSTAND"}</strong></header>
            <div className={`monitor-window ${displayedOrder ? "open" : "closed"} ${visibleMonitorOrder ? "has-order" : "idle"}`}>
              <div className="monitor-content">{visibleMonitorOrder ? <OrderPreview order={visibleMonitorOrder} /> : <div className="pod-report"><div className="pod-summary"><span>DVALESTATUS · 680 PERSONER</span><strong>664 STABILE</strong><p>4 kritiske · 4 ustabile · 2 tabt · 2 vækket</p></div><div className="pod-grid" aria-label="Visuel oversigt over dvalekapsler">{pods.map((state, index) => <i className={state} key={index} title={`Kapsel ${String(index + 1).padStart(3, "0")}: ${state}`} />)}</div><div className="pod-legend"><span><i className="stable" /> STABIL</span><span><i className="unstable" /> USTABIL</span><span><i className="critical" /> KRITISK</span><span><i className="lost" /> TABT</span></div></div>}</div>
              <div className="shutter-panel" aria-hidden="true" />{!visibleMonitorOrder && <div className="shutter-instruction"><strong>PANSRET SKÆRMMEMBRAN</strong><span>HOLD MUSEN OVER EN ORDRE FOR AT ÅBNE</span></div>}
            </div>
            <footer className="monitor-console"><span className="dial" /><span className="toggle on" /><span className="toggle" /><div className="monitor-log">{notice}</div><div className="signal-lamps"><i /><i /><i /><i /></div></footer>
          </article>

          <aside className="ship-orders metal-panel">
            <header><span>ORDREPANEL</span><strong>{remaining}/{maxOrders} LEDIGE</strong></header>
            <div className="order-list" onMouseLeave={() => setHoveredId(null)}>{activeDepartment.orders.map((order) => { const isPlaced = placed.some((item) => item.id === order.id); return <button key={order.id} className={`${order.id === "reaktor" ? "featured-order" : ""} ${selectedId === order.id ? "selected" : ""} ${isPlaced ? "placed" : ""}`} type="button" onMouseEnter={() => { setHoveredId(order.id); setNotice(`Vurdering åbnet: ${order.title}`); beep(350); }} onFocus={() => setHoveredId(order.id)} onBlur={() => setHoveredId(null)} onClick={() => { setSelectedId(order.id); setNotice(`${order.title} er valgt, men ikke placeret.`); }}><span className="order-icon">{isPlaced ? "✓" : <ManifestIcon id={order.iconId} fallback={order.icon} active={hoveredId === order.id} />}</span><div><strong>{order.title}</strong><small>{order.detail}</small></div><b>{order.cost}</b></button>; })}</div>
            <button className="place-order" type="button" onClick={placeOrder}>PLACER VALGT ORDRE</button>
            <div className="order-queue"><span>FÆLLES ORDREKØ</span>{Array.from({ length: maxOrders }, (_, index) => <button key={index} type="button" className={placed[index] ? "filled" : ""} onClick={() => placed[index] && setPlaced((orders) => orders.filter((_, i) => i !== index))}>{placed[index]?.title ?? "LEDIG"}</button>)}</div>
          </aside>

          <section className="card-deck metal-panel"><header><span>ACTIONKORT · SPIL HØJST ÉT</span><strong>{playedCard ?? "INTET KORT AKTIVT"}</strong></header><div className="card-hand">{actionCards.map(([title, detail, icon], index) => <button key={title} type="button" className={playedCard === title ? "played" : ""} onClick={() => playCard(title)}><img className="card-icon" src={icon} alt="" /><span>AKTION {index + 1}</span><strong>{title}</strong><small>{detail}</small><i>{playedCard === title ? "AKTIV" : "SPIL"}</i></button>)}</div></section>
        </section>}

        {phase === "colony" && <section className="phase-surface colony-surface" aria-label="Fase 2: Kolonien">
          <header className="colony-title"><div><span>UDENDØRS DRIFTSCENTRAL</span><h1>KOLONIEN · LANDINGSÅR 01</h1></div><div><span>AKTIVE KOLONISTER</span><strong>12</strong></div><div><span>BYGGEKAPACITET</span><strong>7/10</strong></div></header>
          <aside className="project-list"><span>BYG & VEDLIGEHOLD</span>{colonyProjects.map(([title, type, progress, warning], index) => <button key={title} className={colonyProject === index ? "active" : ""} type="button" onClick={() => { setColonyProject(index); beep(290 + index * 45); }}><small>{type}</small><strong>{title}</strong><i><b style={{ width: progress }} /></i><span>{progress} · {warning}</span></button>)}</aside>
          <article className="colony-map" aria-label="Kort over koloniens fremgang"><div className="map-grid" /><div className="landing-ship"><i /><strong>VARDØ</strong><span>LANDINGSPUNKT</span></div><button className="map-node water" type="button"><i />VAND 01<small>72%</small></button><button className="map-node greenhouse" type="button"><i />DRIVHUS<small>41%</small></button><button className="map-node housing" type="button"><i />BOLIGRING A<small>88%</small></button><button className="map-node hospital" type="button"><i />HOSPITAL<small>PLANLAGT</small></button><div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" /><div className="map-caption"><span>AKTIVT PROJEKT</span><strong>{colonyProjects[colonyProject][0]}</strong><p>{colonyProjects[colonyProject][3]}</p></div></article>
          <aside className="maintenance-board"><span>DRIFTSBELASTNING</span><div><strong>VAND</strong><i className="warn">KRITISK</i></div><div><strong>VARME</strong><i>STABIL</i></div><div><strong>BOLIGER</strong><i className="warn">11/12</i></div><div><strong>FØDEVARER</strong><i>19 DØGN</i></div><p>Nyt byggeri bruger arbejdskraft, som ellers kan holde eksisterende systemer i live.</p><button type="button">BEKRÆFT ARBEJDSPLAN</button></aside>
        </section>}

        {phase === "people" && <section className="phase-surface people-surface" aria-label="Fase 3: Kolonisterne">
          <header className="people-title"><span>SOCIALT OBSERVATORIUM · 12 VÅGNE</span><h1>KOLONISTERNE</h1><p>Du bestemmer ikke, hvad mennesker gør. Du bestemmer, hvordan ledelsen svarer.</p></header>
          <aside className="people-register"><span>AKTIVE PERSONER</span>{people.map(([initials, name, role, mood]) => <button type="button" key={name}><i>{initials}</i><div><strong>{name}</strong><small>{role}</small></div><b>{mood}</b></button>)}</aside>
          <article className="social-wheel-panel"><div className={`social-wheel ${spinning ? "spinning" : ""}`} style={{ transform: `rotate(${wheelTurn * 1080}deg)` }}><span>PROTEST</span><span>INITIATIV</span><span>KONFLIKT</span><span>FÆLLESSKAB</span></div><div className="wheel-pointer" /><button className="spin-button" type="button" onClick={spinWheel} disabled={spinning}>{spinning ? "AFVENTER …" : "START SOCIALPULS"}</button></article>
          <article className="social-result"><span>UFORUDSET HÆNDELSE</span><h2>{socialEvent}</h2><p>Koloniens forhold ændrer sandsynligheden for hver type hændelse.</p><div><button type="button">FORHANDL</button><button type="button">GRIB IND</button><button type="button">AFVENT</button></div></article>
        </section>}

        {phase === "planet" && <section className="phase-surface planet-surface" aria-label="Fase 4: Planeten">
          <div className="planet-scan"><div className="planet-grid" /><div className="orbital-ring ring-one" /><div className="orbital-ring ring-two" /><i className="bio-signal a" /><i className="bio-signal b" /><i className="bio-signal c" /><div className="scan-beam" /></div>
          <header className="planet-title"><span>INGEN SPILLERINTERAKTION</span><h1>PLANETEN GØR, HVAD DEN GØR</h1><p>Atmosfære, geologi og liv reagerer på kolonien — og på deres egne rytmer.</p></header>
          <article className="planet-outcome"><span>AUTOMATISK RESULTAT</span><h2>{planetEvents[planetEvent][0]}</h2><p>{planetEvents[planetEvent][1]}</p><div className={`outcome-tone tone-${planetEvent}`}>{planetEvent < 2 ? "MULIGHED & RISIKO" : planetEvent === 2 ? "OBSERVATION" : "FARE"}</div></article>
          <aside className="planet-readings"><span>PLANETÆRE MÅLINGER</span><div><small>TEMPERATUR</small><strong>−8,4 °C</strong></div><div><small>BIOMASSE</small><strong>STIGENDE</strong></div><div><small>GRUNDVAND</small><strong>88%</strong></div><div><small>KOLONIAFTRYK</small><strong>LAVT</strong></div></aside>
          <div className={`special-signal ${specialEvent ? "active" : ""}`}><span>SJÆLDENT SPECIALSIGNAL</span><strong>{specialEvent ?? "INTET SIGNAL DENNE CYKLUS"}</strong><small>Specialhændelser kan permanent ændre kortet og koloniens muligheder.</small></div>
        </section>}
      </section>
    </main>
  );
}
