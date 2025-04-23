const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

export const checkInstallation = async () => {
  try {
    const response = await fetch(`${apiUrl}/check-installed`, {
      method: 'GET',
    });
    const data = await response.json();
    return data.status === "installed";
  } catch (error) {
    console.error("Fehler beim Abrufen des Installationsstatus:", error);
    return false;
  }
};
