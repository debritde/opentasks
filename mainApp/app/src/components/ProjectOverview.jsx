import { useState, useEffect } from "react";

// Projektübersicht
const ProjectOverview = ({ projectId }) => {
    const [project, setProject] = useState(null);
  
    useEffect(() => {
      const fetchProject = async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}`);
          const data = await response.json();
          setProject(data.project);
        } catch (error) {
          console.error("Fehler beim Laden des Projekts", error);
        }
      };
      fetchProject();
    }, [projectId]);
  
    if (!project) return <p>Lädt...</p>;
  
    return (
      <div className="project-overview">
        <h2>{project.title}</h2>
        <p>{project.description}</p>
        <p><strong>Deadline:</strong> {new Date(project.deadline).toLocaleString()}</p>
        <p><strong>Mitglieder:</strong> {project.members.map(member => member.name).join(", ")}</p>
      </div>
    );
  };
  
  export default ProjectOverview