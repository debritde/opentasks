# openTasks Projektmanagementsystem

Ein selbst gehostetes, intuitives Projektmanagementsystem – einfach, schnell, professionell.

---

## 🧩 Features

- 📁 Anlegen **beliebig vieler Projekte**
- 📬 Jedes Projekt kann per **Mail2Ticket** zu einem **Servicedesk** gemacht werden
- 👀 Projekte und Servicedesks unterstützen alle wichtigen Ansichtsarten:
  - ✅ **Listenansicht**
  - ✅ **Grid-Ansicht**
  - ✅ **Kanban-Board**
  - ✅ **Gantt-Diagramm**
- 🆓 **100% kostenlos – keine „Pro User / Monat“-Kosten** wie bei den meisten anderen Tools (Fürs Hosting nehmen wir natürlich etwas, aber auch da bieten wir einen absolut fairen Preis an 🙂)

---

## 🚀 Installation & Start

1. **Projekt klonen:**

```bash
git clone https://gitlab.com/sysgrid/openTasks
cd openTasks
```

2. **.env-Datei anlegen:**

Kopiere die Datei `.env_template` nach `.env` im Hauptverzeichnis und fülle sie mit deinen Einstellungen.

3. **Container bauen:**

```bash
docker compose build
```

4. **Start:**

**Im Produktivmodus:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```


**Im Developmentmodus:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

---

## 🎨 Logo gesucht!

Wir suchen aktuell noch ein **einprägsames, minimalistisches Logo** für das Projekt.  
Wenn du Ideen, Entwürfe oder Skills im Design hast, schick uns gerne Vorschläge per Pull Request oder Issue!

---

## 📄 Lizenz

Dieses Projekt steht unter der **FairCode License v1.0 (Customized)**.

- ✅ Nutzung und Änderung für private und unternehmensinterne Zwecke erlaubt  
- ❌ Bereitstellung, Verkauf, Hosting oder Verteilung sind **verboten**  
- ✅ Verbesserungsvorschläge willkommen – gehen aber automatisch in mein Eigentum über

Kontakt für kommerzielle Nutzung oder Lizenzanfragen: [https://opentasks.de]

