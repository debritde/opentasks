import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

const apiUrl = import.meta.env.VITE_APP_UPDATER_URL || "http://localhost:3001";
const wordpressUrl = "https://opentasks.de/wp-json/wp/v2/posts?categories=41"; // max 5 Posts

const Home = () => {
    const { t } = useTranslation();
    const [version, setVersion] = useState("Lädt...");
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const fetchVersion = async () => {
            try {
                const response = await fetch(`${apiUrl}/checkUpdate`, {
                    method: "GET",
                    headers: { Authorization: token },
                });
                const data = await response.json();
                setVersion(data.localVersion || "Unbekannt");
            } catch (error) {
                setVersion("Fehler beim Abrufen der Version");
                console.error("Fehler beim Laden der Version:", error);
            }
        };

        fetchVersion();
    }, []);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await fetch(wordpressUrl);
                const data = await response.json();
                setPosts(data);
            } catch (error) {
                console.error("Fehler beim Laden der Posts:", error);
            }
        };

        fetchPosts();
    }, []);

    return (
        <div className="home-overview-widget-container">
            <div className="project-overview-widget">
                <h2>openTasks</h2>
                <span>Version: {version}</span>
            </div>

            <div className="home-overview-widget">
                <h2>{t("news")}</h2>
                {posts.length === 0 ? (
                    <span>Keine Beiträge gefunden.</span>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="home-post-card">
                            <h3 dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                            <div dangerouslySetInnerHTML={{ __html: post.content.rendered }} />
                        </div>                      
                    ))
                )}
            </div>
        </div>
    );
};

export default Home;
