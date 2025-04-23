import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";

const apiUrl = import.meta.env.VITE_APP_UPDATER_URL || "http://localhost:3002";

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
      await setIsLoading(true)
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/checkUpdate`, {
          method: "GET",
          headers: { 
            "Authorization": `${token}`,
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": `${apiUrl}/checkUpdate`,
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization" 
          },
        });
        const data = await response.json();
        await setUpdateAvailable(data.updateAvailable);
        await setLocalVersion(data.localVersion);
        await setRemoteVersion(data.remoteVersion);
        await setIsLoading(false)
      } catch (error) {
        console.error("Fehler beim Update-Check:", error);
      }
    };

  useEffect(() => {
    checkForUpdate();
  }, []);


  const startUpdate = async () => {
    setUpdating(true);
    setLogs([]);
    
    const token = localStorage.getItem("token");
    if (!token) return;
    let completeLog = []

    try {
        const response = await fetch(`${apiUrl}/update/stream`, {
            method: "GET",
            headers: {
              "Authorization": `${token}`,
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": `${apiUrl}/update/stream`,
              "Access-Control-Allow-Methods": "*",
              "Access-Control-Allow-Headers": "Content-Type, Authorization"
            }  
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
          const newEntries = message.replace("data: ", "").split("\n").filter(entry => entry.trim() !== "");
          // An das bestehende Log-Array anhängen
          setLogs(prevLogs => [...prevLogs, ...newEntries]);
          completeLog = [...completeLog, ...newEntries];

          // Fortschrittsanzeige updaten
          const progressMatch = message.match(/Progress:\s*(\d+)%/);

          if (progressMatch) {
              setProgress(Number(progressMatch[1]));

              if(Number(progressMatch[1] == 100)) {
                setUpdateFinished(true)
                await setUpdateAvailable(false);
                await setLocalVersion(null);
                await setRemoteVersion(null);
                await setIsLoading(true);
                checkForUpdate()
              }
          }
        }

    } catch (error) {
        console.error("Fehler beim Stream:", error);
    } finally {
        setUpdating(false);
        console.log(completeLog)
    }
};

const LogViewer = ({ logs }) => {
  // Zustand für jeden Abschnitt (Schlüssel = Index)
  const [openSections, setOpenSections] = useState({});

  // Gruppierung der Logs in Abschnitte: Jeder Abschnitt beginnt mit "Progress: xx%"
  const sections = [];
  let currentSection = null;
  logs.forEach(line => {
    if (/^Progress:\s*\d+%/.test(line)) {
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
  const toggleSection = index => {
    setOpenSections(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="code">
      {sections.map((section, index) => (
        <div
          key={index}
          className="log-section"
          style={{
            marginBottom: '10px',
            border: '1px solid #4af626',
            borderRadius: "5px"
          }}
        >
          <div
            className="log-header"
            style={{
              padding: '5px',
              cursor: 'pointer',
              display: "flex",
              alignItems: 'center',
            }}
            onClick={() => toggleSection(index)}
          >
            <button id="toggleButton" style={{ padding: "10px", marginRight: '10px', border: "1px solid #4af626", background: "transparent", color: "#4af626"}}>
              {openSections[index] ? '▼' : '▶'}
            </button>
            <div>
              <strong>{section.header}</strong>
              {section.preview && <div style={{ marginTop: '4px' }}>{section.preview}</div>}
            </div>
          </div>
          {openSections[index] && section.details.length > 0 && (
            <pre
              style={{
                margin: 0,
                padding: '10px',
                paddingLeft: document.getElementById('toggleButton').offsetWidth + 10 + 5 +'px'
              }}
            >
              {section.details.join("\n")}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};

  return (
    <div style={{"display": "inline-flex", "flexDirection": "column", "gap": "10px", "alignItems": "flex-start"}}>
      <h1>{t("system_updater")}</h1>
      <button
        onClick={checkForUpdate}
        disabled={isLoading}
      >
        { isLoading ? t("checking_for_update") + "..." : t("check_for_update") }
      </button>
      <p>Status: <strong>{updateAvailable ? "🔄 Update verfügbar!" : "✅ System aktuell"}</strong></p>
      {isLoading ? 
        (
          <p>{t("loading")}...</p>
        ) 
        : 
        (
          <>
            <span>
              {t("local_version")}: {localVersion || t("loading") + "..."}
              <br/>
              {t("newest_version")}: {remoteVersion || t("loading") + "..."}
            </span>
          </>
        )
      }

      { updateAvailable && <span className="infoRed">{t("updater_info")}</span> }
      <button
        onClick={startUpdate}
        disabled={updating || (!updateAvailable && !cheatActivated)}
      >
        {updating
          ? t("updating")
          : updateAvailable || cheatActivated
          ? t("update_system")
          : t("no_update_needed")}
      </button>

      {(updating || updateFinished) && (
        <>
          <h2>{t("logs")}</h2>
          <LogViewer logs={logs} />
          {updating && (
            <div style={{ marginTop: "10px", width: "100%"}}>
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#ccc",
                  borderRadius: "4px",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "20px",
                    backgroundColor: "#4caf50"
                  }}
                />
              </div>
              <p>{progress}%</p>
            </div>
          )}
          {updateFinished && (
            <>
              <div style={{ marginTop: "10px", width: "100%"}}>
                <div
                  style={{
                    width: "100%",
                    backgroundColor: "#ccc",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      width: `100%`,
                      height: "20px",
                      backgroundColor: "#4caf50"
                    }}
                    />
                  </div>
                </div>
                <div className="infoGreen">
                  {t("update_finished")}
                </div>
            </>
          )}
        </>
      )}

    </div>
  );
};

export default UpdaterPage;
