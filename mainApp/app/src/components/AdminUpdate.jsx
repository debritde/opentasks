import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";

const apiUrl = import.meta.env.VITE_APP_UPDATER_URL || "http://localhost:3002";
const isDev = false;

const UpdaterPage = () => {
  const { t } = useTranslation();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [localVersion, setLocalVersion] = useState(null);
  const [remoteVersion, setRemoteVersion] = useState(null);
  const [logs, setLogs] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cheatActivated, setCheatActivated] = useState(false);
  const [progress, setProgress] = useState(-1); // für Fortschrittsanzeige
  const [updateFinished, setUpdateFinished] = useState(false); // für Fortschrittsanzeige
  const [openSections, setOpenSections] = useState({}); // <-- Zustand nach oben gehoben
  const [updateStartTime, setUpdateStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [logFullscreen, setLogFullscreen] = useState(false);
  const timerRef = useRef(null);

  // Ref zum Speichern der getippten Zeichen
  const typedKeysRef = useRef("");

  // Globaler Listener für Tastatureingaben
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Zeichen zur Referenz hinzufügen (in Kleinbuchstaben)
      typedKeysRef.current += e.key.toLowerCase();

      // Prüfen, ob die letzten Zeichen dem Cheatcode "forceupdate" entsprechen
      if (typedKeysRef.current.endsWith("forceupdate")) {
        setCheatActivated(true);
      }

      // Die Länge der Zeichenkette auf die Länge des Cheatcodes begrenzen
      const maxLength = "forceupdate".length;
      if (typedKeysRef.current.length > maxLength) {
        typedKeysRef.current = typedKeysRef.current.slice(-maxLength);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const checkForUpdate = async () => {
    if (isDev) {
      setIsLoading(true);
      setTimeout(() => {
        setUpdateAvailable(true);
        setLocalVersion("1.0.0");
        setRemoteVersion("1.1.0");
        setIsLoading(false);
      }, 800);
      return;
    }
    await setIsLoading(true);
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/checkUpdate`, {
        method: "GET",
        headers: {
          Authorization: `${token}`,
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": `${apiUrl}/checkUpdate`,
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
      const data = await response.json();
      await setUpdateAvailable(data.updateAvailable);
      await setLocalVersion(data.localVersion);
      await setRemoteVersion(data.remoteVersion);
      await setIsLoading(false);
    } catch (error) {
      console.error("Fehler beim Update-Check:", error);
    }
  };

  useEffect(() => {
    checkForUpdate();
  }, []);

  const startUpdate = async () => {
    if (isDev) {
      setUpdating(true);
      setLogs([]);
      setProgress(0);
      setUpdateFinished(false);

      // Simulierter Log-Stream
      const fakeSections = [
        {
          header: "🌈 Progress: 5%",
          preview: "🦄 Initialisiere Regenbogen-Update...",
          details: [
        "🧙‍♂️ Beschwöre magische Einhörner...",
        "🍭 Sammle bunte Lollis...",
        "🎩 Ziehe Kaninchen aus dem Hut...",
        "💾 Lade Glitzer-Konfiguration...",
        "🤹‍♀️ Jongliere mit Bits und Bytes...",
          ],
        },
        {
          header: "🍕 Progress: 15%",
          preview: "🍕 Bestelle Pizza für das Entwicklerteam...",
          details: [
        "📞 Rufe Pizzaboten an...",
        "🧀 Extra Käse ausgewählt!",
        "🍄 Pilze abgewählt (Teamentscheidung)...",
        "⏳ Warte auf Lieferung...",
        "🍕 Pizza ist unterwegs!",
          ],
        },
        {
          header: "🐱 Progress: 25%",
          preview: "🐾 Lasse Katzen über die Tastatur laufen...",
          details: [
        "😺 Katze tippt: 'asdkjfhg'",
        "😼 Katze löscht versehentlich System32... (nur Spaß!)",
        "🐾 Pfotenabdrücke werden entfernt...",
        "🧹 Tastatur gereinigt.",
          ],
        },
        {
          header: "🚀 Progress: 35%",
          preview: "🚀 Starte Raketen für schnelleren Download...",
          details: [
        "🛰️ Satellitenverbindung hergestellt...",
        "📡 Empfangsstärke: 9001%",
        "💥 Downloadgeschwindigkeit: Lichtgeschwindigkeit erreicht!",
        "🛸 Unerwartetes UFO gesichtet – ignoriert.",
          ],
        },
        {
          header: "🎶 Progress: 45%",
          preview: "🎵 Spiele motivierende Musik ab...",
          details: [
        "🎸 Gitarren-Solo gestartet...",
        "🥁 Schlagzeugwirbel...",
        "🎤 Entwickler singen mit: 'Never gonna give you up...'",
        "🎧 Musiklautstärke auf Maximum!",
          ],
        },
        {
          header: "🦖 Progress: 55%",
          preview: "🦖 Dino-Modus aktiviert...",
          details: [
        "🦕 Lade prähistorische Updates...",
        "🦴 Finde Fossilien im Code...",
        "🌋 Simuliere Vulkanausbruch (nur visuell)...",
        "🦖 Dino tanzt den Moonwalk.",
          ],
        },
        {
          header: "🧊 Progress: 65%",
          preview: "🧊 Kühle Server mit Eiswürfeln...",
          details: [
        "❄️ Eiswürfelmaschine läuft heiß...",
        "🥶 Server-Temperatur: angenehm frisch.",
        "🍹 Entwickler bekommen Cocktails.",
        "🧊 Eiswürfel im RAM gefunden – entfernt.",
          ],
        },
        {
          header: "🤖 Progress: 75%",
          preview: "🤖 KI übernimmt das Update...",
          details: [
        "💡 KI denkt nach...",
        "🧠 KI entscheidet sich für ein Nickerchen.",
        "🤖 KI ist wieder wach und arbeitet weiter.",
        "🦾 KI optimiert alles auf 1337%",
          ],
        },
        {
          header: "🦸‍♂️ Progress: 85%",
          preview: "🦸‍♂️ Superhelden helfen beim Endspurt...",
          details: [
        "🕸️ Spider-Man schwingt durch den Code...",
        "🦇 Batman debuggt im Dunkeln...",
        "🦸‍♀️ Wonder Woman bringt Kaffee.",
        "💥 Bugs werden heldenhaft besiegt!",
          ],
        },
        {
          header: "🎉 Progress: 100%",
          preview: "🎉 Update abgeschlossen! Party-Modus aktiviert!",
          details: [
        "🥳 Konfetti wird verteilt...",
        "🍾 Sektkorken knallen...",
        "🎂 Kuchen für alle!",
        "✅ Update erfolgreich! Viel Spaß mit der neuen Version!",
          ],
        },
      ];

      let idx = 0;
      function nextSection() {
        if (idx < fakeSections.length) {
          setLogs((prev) => [
            ...prev,
            fakeSections[idx].header,
            fakeSections[idx].preview,
            ...fakeSections[idx].details,
          ]);
          const progressMatch = fakeSections[idx].header.match(/Progress:\s*(\d+)%/);
          if (progressMatch) setProgress(Number(progressMatch[1]));
          setTimeout(() => {
            idx++;
            nextSection();
          }, 2500);
        } else {
          setUpdating(false);
          setUpdateFinished(true);
          setUpdateAvailable(false);
          setLocalVersion("1.1.0");
          setRemoteVersion("1.1.0");
        }
      }
      nextSection();
      return;
    }
    setUpdating(true);
    setLogs([]);

    const token = localStorage.getItem("token");
    if (!token) return;
    let completeLog = [];

    try {
      const response = await fetch(`${apiUrl}/update/stream`, {
        method: "GET",
        headers: {
          Authorization: `${token}`,
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": `${apiUrl}/update/stream`,
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream konnte nicht gestartet werden");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const message = decoder.decode(value, { stream: true }).replace("data: ", "");
        // Nachricht an "\n\n\n" trennen – jeder Block wird ein Array-Element
        const newEntries = message
          .replace("data: ", "")
          .split("\n")
          .filter((entry) => entry.trim() !== "");
        // An das bestehende Log-Array anhängen
        setLogs((prevLogs) => [...prevLogs, ...newEntries]);
        completeLog = [...completeLog, ...newEntries];

        // Fortschrittsanzeige updaten
        const progressMatch = message.match(/Progress:\s*(\d+)%/);

        if (progressMatch) {
          setProgress(Number(progressMatch[1]));

          if (Number(progressMatch[1]) === 100) {
            setUpdateFinished(true);
            // await setUpdateAvailable(false);
            // await setLocalVersion(null);
            // await setRemoteVersion(null);
            // await setIsLoading(true);
            // checkForUpdate();
          }
        }
      }
    } catch (error) {
      console.error("Fehler beim Stream:", error);
    } finally {
      setUpdating(false);
      console.log(completeLog);
    }
  };

  // Wenn logs sich ändern, offene Sections beibehalten (neue Sections bleiben zu)
  useEffect(() => {
    const sectionCount = logs.filter((line) => /\bProgress:\s*\d+%/.test(line)).length;
    setOpenSections((prev) => {
      const newState = { ...prev };
      for (let i = 0; i < sectionCount; i++) {
        if (!(i in newState)) newState[i] = false;
      }
      return newState;
    });
  }, [logs]);

  const LogViewer = ({ logs, openSections, setOpenSections }) => {
    // Gruppierung der Logs in Abschnitte: Jeder Abschnitt beginnt mit "Progress: xx%"
    const sections = [];
    let currentSection = null;
    logs.forEach((line) => {
      if (/\bProgress:\s*\d+%/.test(line)) { // <-- Regex angepasst!
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { header: line, preview: null, details: [] };
      } else {
        if (currentSection) {
          if (currentSection.preview === null) {
            currentSection.preview = line;
          } else {
            currentSection.details.push(line);
          }
        }
      }
    });
    if (currentSection) {
      sections.push(currentSection);
    }

    // Funktion zum Umschalten eines Abschnitts
    const toggleSection = (index) => {
      setOpenSections((prev) => ({
        ...prev,
        [index]: !prev[index],
      }));
    };

    const logContainerRef = useRef(null);
    const [userScrolledUp, setUserScrolledUp] = useState(false);

    // Beobachte Scroll-Verhalten
    useEffect(() => {
      const el = logContainerRef.current;
      if (!el) return;

      const handleScroll = () => {
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        setUserScrolledUp(!isAtBottom);
      };

      el.addEventListener("scroll", handleScroll);
      return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    // Automatisch scrollen nur, wenn der Nutzer *nicht* manuell hochgescrollt hat
    useEffect(() => {
      const el = logContainerRef.current;
      if (!el || userScrolledUp) return;

      el.scrollTop = el.scrollHeight;
    }, [logs, userScrolledUp]);


    return (
      <div
        ref={logContainerRef}
        style={{
          maxHeight: "35vh",
          overflowY: "auto",
          background: "rgba(30,34,40,0.95)",
          borderRadius: "10px",
          boxShadow: "0 2px 16px #0004",
          padding: "10px",
          position: "relative"
        }}
      >
        {/* Maximieren-Button nur anzeigen, wenn Modal nicht offen */}
        {!logFullscreen && (
          <button
            title="Log im Vollbild anzeigen"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(44,255,120,0.09)",
              border: "none",
              borderRadius: "6px",
              color: "#4af626",
              fontSize: "1.08em",
              cursor: "pointer",
              padding: "8px",
              paddingBottom: "4px",
              opacity: 0.7,
              transition: "background 0.18s, opacity 0.18s",
              outline: "none"
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = "rgba(44,255,120,0.17)";
              e.currentTarget.style.opacity = "1";
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "rgba(44,255,120,0.09)";
              e.currentTarget.style.opacity = "0.7";
            }}
            onClick={() => setLogFullscreen(true)}
          >
            {/* Vollbild-Icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="5" height="2" rx="1" fill="currentColor"/>
              <rect x="3" y="3" width="2" height="5" rx="1" fill="currentColor"/>
              <rect x="12" y="3" width="5" height="2" rx="1" fill="currentColor"/>
              <rect x="15" y="3" width="2" height="5" rx="1" fill="currentColor"/>
              <rect x="3" y="15" width="5" height="2" rx="1" fill="currentColor"/>
              <rect x="3" y="12" width="2" height="5" rx="1" fill="currentColor"/>
              <rect x="12" y="15" width="5" height="2" rx="1" fill="currentColor"/>
              <rect x="15" y="12" width="2" height="5" rx="1" fill="currentColor"/>
            </svg>
          </button>
        )}
        {sections.map((section, index) => (
          <div
            key={index}
            style={{
              margin: "0 0 12px 0",
              borderRadius: "8px",
              background: openSections[index] ? "#23282f" : "#1a1d22",
              boxShadow: openSections[index] ? "0 2px 8px #222" : "none",
              transition: "all 0.2s",
            }}
          >
            <button
              onClick={() => toggleSection(index)}
              style={{
                background: "none",
                border: "none",
                outline: "none",
                display: "flex",
                alignItems: "center",
                padding: "14px 18px",
                cursor: "pointer",
                borderRadius: "8px",
                fontWeight: 600,
                color: "#4af626",
                fontSize: "1.08em",
                transition: "background 0.2s",
                backgroundColor: openSections[index] ? "#23282f" : "#1a1d22",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: "1.3em",
                  marginRight: "14px",
                  transform: openSections[index] ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                ▶
              </span>
              <span>
                {section.header}
                {section.preview && (
                  <span
                    style={{
                      marginLeft: 16,
                      color: "#b6ffb6",
                      fontWeight: 400,
                      fontSize: "0.99em",
                    }}
                  >
                    {section.preview}
                  </span>
                )}
              </span>
            </button>
            {openSections[index] && section.details.length > 0 && (
              <pre
                style={{
                  margin: 0,
                  padding: "16px 28px",
                  background: "#23282f",
                  color: "#b6ffb6",
                  borderRadius: "0 0 8px 8px",
                  fontSize: "1em",
                  borderTop: "1px solid #333",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  letterSpacing: "0.01em",
                }}
              >
                {section.details.join("\n")}
              </pre>
            )}
          </div>
        ))}
        {sections.length === 0 && (
          <div style={{ color: "#888", textAlign: "center", padding: "18px 0" }}>
            Keine Logs vorhanden.
          </div>
        )}
      </div>
    );
  };

  const showLog = updating || updateFinished || logs.length > 0;
  
  // Timer starten/stoppen
  useEffect(() => {
    if (updating) {
      setUpdateStartTime(Date.now());
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - updateStartTime) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [updating, updateStartTime]);

  return (
    <div
      className="updater-flex-wrapper"
      style={{
        display: showLog ? "flex" : "block",
        gap: showLog ? 32 : 0,
        justifyContent: showLog ? "center" : "center",
        alignItems: showLog ? "flex-start" : "center",
        width: "100%",
        maxWidth: showLog ? 1100 : 480,
        margin: "40px auto",
        minHeight: "60vh",
        transition: "all 0.3s",
      }}
    >
      <div
        className="updater-card"
        style={{
          flex: showLog ? "1 1 420px" : "unset",
          minWidth: 320,
          maxWidth: 480,
          margin: showLog ? 0 : "0 auto",
          transition: "all 0.3s",
        }}
      >
        {/* ...Hauptfeld-Inhalt wie gehabt... */}
        <div className="updater-title">{t("system_updater")}</div>
        <div className="updater-status">
          {updateAvailable ? "🔄 Update verfügbar!" : "✅ System aktuell"}
        </div>
        <div className="updater-version-info">
          {t("local_version")}: {localVersion || t("loading") + "..."}
          <br />
          {t("newest_version")}: {remoteVersion || t("loading") + "..."}
        </div>
        {updateAvailable && <div className="updater-info">{t("updater_info")}</div>}
        <div className="updater-actions">
          <button
            className="updater-btn secondary"
            onClick={checkForUpdate}
            disabled={isLoading}
          >
            {isLoading ? t("checking_for_update") + "..." : t("check_for_update")}
          </button>
          <button
            className="updater-btn"
            onClick={startUpdate}
            disabled={updating || (!updateAvailable && !cheatActivated)}
          >
            {updating
              ? t("updating")
              : updateAvailable || cheatActivated
              ? t("update_system")
              : t("no_update_needed")}
          </button>
        </div>
      </div>
      {showLog && (
        <div
          className="updater-card"
          style={{
            flex: "1 1 420px",
            minWidth: 320,
            maxWidth: 520,
            margin: 0,
            transition: "all 0.3s",
            position: "relative" // Für den Button!
          }}
        >
          
          {/* Kopfzeile: Logs links, Zeit und Export rechts */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div className="updater-log-title">{t("logs")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: "#aaa", fontSize: "0.98em" }}>
                {updating
                  ? `⏱️ ${t("elapsed_time") || "Vergangene Zeit"}: ${Math.floor(elapsedSeconds / 60)
                      .toString()
                      .padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`
                  : updateFinished && updateStartTime
                  ? `⏱️ ${t("duration") || "Dauer"}: ${Math.floor(elapsedSeconds / 60)
                      .toString()
                      .padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`
                  : null}
              </div>
              <button
                title="Log als TXT herunterladen"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--content-bg)",
                  border: "1.5px solid transparent",
                  borderRadius: "6px",
                  color: "var(--blue)",
                  fontSize: "0.98em",
                  cursor: "pointer",
                  padding: "6px 14px 6px 10px",
                  marginLeft: 4,
                  transition: "background 0.15s, color 0.15s, border 0.15s, opacity 0.15s"
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = "var(--content-bg)";
                  e.currentTarget.style.border = "1.5px solid var(--blue)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = "var(--content-bg)";
                  e.currentTarget.style.border = "1.5px solid transparent";
                }}
                onClick={() => {
                  const now = new Date();
                  const pad = (n) => n.toString().padStart(2, "0");
                  const fileName = `update-log_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.txt`;
                  const blob = new Blob([logs.join("\n")], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }, 100);
                }}
              >
                {/* Download-Icon */}
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{marginRight: 4}}>
                  <path d="M10 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="4" y="15" width="12" height="2" rx="1" fill="currentColor"/>
                </svg>
                Log herunterladen
              </button>
            </div>
          </div>
          <LogViewer logs={logs} openSections={openSections} setOpenSections={setOpenSections} />
          <div style={{ marginTop: "10px", width: "100%" }}>
            <div className="updater-progressbar">
              <div
                className="updater-progressbar-inner"
                style={{
                  width: `${updating ? progress : 100}%`,
                }}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              {updating ? `${progress}%` : "100%"}
            </div>
          </div>
          {updateFinished && (
            <div className="infoGreen" style={{ marginTop: 12 }}>
              {t("update_finished")}
            </div>
          )}
        </div>
      )}
      {logFullscreen && (
        <div
          className="log-fullscreen-overlay"
          style={{
            position: "fixed",
            zIndex: 1000,
            inset: 0,
            background: "rgba(20,22,28,0.55)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.3s"
          }}
          onClick={() => setLogFullscreen(false)}
        >
          <div
            className="log-fullscreen-modal"
            style={{
              background: "rgba(30,34,40,0.98)",
              borderRadius: 16,
              boxShadow: "0 8px 48px #000a",
              width: "90vw",
              maxWidth: 900,
              maxHeight: "80vh",
              padding: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              animation: "logModalGrow 0.35s cubic-bezier(.4,2,.6,1) both"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "18px",
              borderBottom: "1px solid #333"
              
            }}>
              <div className="updater-log-title" style={{ fontSize: "1.25em" }}>{t("logs")}</div>
              <button
                onClick={() => setLogFullscreen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: "1.7em",
                  cursor: "pointer",
                  padding: 0,
                  marginLeft: 16
                }}
                title="Schließen"
              >✕</button>
            </div>
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "15px 15px"
            }}>
              <LogViewer logs={logs} openSections={openSections} setOpenSections={setOpenSections} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdaterPage;
