import { useEffect, useState } from 'react';
import type { GiftProject } from '../../projects/giftProject';

interface ProjectSwitcherProps {
  activeProject: GiftProject;
  projects: GiftProject[];
  onCreate: () => void;
  onSelect: (projectId: string) => void;
  onRename: (projectId: string, name: string) => void;
  onDuplicate: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Guardado local'
    : new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(date);
}

export function ProjectSwitcher({
  activeProject,
  projects,
  onCreate,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(activeProject.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setName(activeProject.name);
    setIsConfirmingDelete(false);
  }, [activeProject.id, activeProject.name]);

  const close = () => {
    setIsOpen(false);
    setIsConfirmingDelete(false);
  };

  const createProject = () => {
    onCreate();
    close();
  };

  const saveName = () => {
    onRename(activeProject.id, name);
  };

  const duplicateProject = () => {
    onDuplicate(activeProject.id);
    close();
  };

  const deleteProject = () => {
    onDelete(activeProject.id);
    close();
  };

  return (
    <div className="project-switcher">
      <button
        type="button"
        className="project-trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <span className="project-trigger-label">Proyecto local</span>
        <strong title={activeProject.name}>{activeProject.name}</strong>
        <small>{activeProject.gift.recipientName.trim() || 'Sin destinatario'} · {formatUpdatedAt(activeProject.updatedAt)}</small>
      </button>

      <button type="button" className="ghost-button project-create-button" onClick={createProject}>Nuevo regalo</button>

      {isOpen && (
        <div
          className="project-dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <section
            className="project-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-dialog-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                close();
              }
            }}
          >
            <div className="project-dialog-heading">
              <div>
                <p className="section-kicker">Tus regalos</p>
                <h2 id="project-dialog-title">Cambia de proyecto</h2>
              </div>
              <button type="button" className="icon-button" aria-label="Cerrar proyectos" onClick={close}>×</button>
            </div>

            <div className="project-list" aria-label="Proyectos locales">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`project-list-item ${project.id === activeProject.id ? 'selected' : ''}`}
                  aria-current={project.id === activeProject.id ? 'true' : undefined}
                  onClick={() => {
                    onSelect(project.id);
                    close();
                  }}
                >
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.gift.recipientName.trim() || 'Sin destinatario'}</small>
                  </span>
                  <time dateTime={project.updatedAt}>{formatUpdatedAt(project.updatedAt)}</time>
                </button>
              ))}
            </div>

            <label className="field project-name-field">
              <span>Nombre local</span>
              <div className="project-name-control">
                <input value={name} onChange={(event) => setName(event.target.value)} onBlur={saveName} />
                <button type="button" className="ghost-button" onClick={saveName}>Guardar nombre</button>
              </div>
            </label>

            <div className="project-dialog-actions">
              <button type="button" className="ghost-button" onClick={duplicateProject}>Duplicar</button>
              {!isConfirmingDelete ? (
                <button type="button" className="danger-button" onClick={() => setIsConfirmingDelete(true)}>Eliminar</button>
              ) : (
                <div className="project-delete-confirmation" role="alert">
                  <p>Eliminar este proyecto local no afecta ningún enlace publicado.</p>
                  <button type="button" className="ghost-button" onClick={() => setIsConfirmingDelete(false)}>Cancelar</button>
                  <button type="button" className="danger-button" onClick={deleteProject}>Eliminar proyecto</button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
