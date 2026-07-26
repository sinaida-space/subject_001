import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROJECTS, projectById } from '@/data/projects';

/**
 * Registers real site actions via the (draft, Chrome-only-for-now) WebMCP
 * API so an agent in the page can list and open projects the same way a
 * visitor would. No-ops entirely on browsers without navigator.modelContext.
 */
const WebMcpTools = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const modelContext = (navigator as { modelContext?: { registerTool: (tool: unknown, opts: { signal: AbortSignal }) => void } }).modelContext;
    if (!modelContext?.registerTool) return;

    const controller = new AbortController();

    modelContext.registerTool(
      {
        name: 'list_projects',
        description: "List Sinaida Krivchenko's selected works: id, title, kind, tagline.",
        inputSchema: { type: 'object', properties: {} },
        execute: async () =>
          PROJECTS.map(({ id, title, kind, tagline }) => ({ id, title, kind, tagline })),
      },
      { signal: controller.signal },
    );

    modelContext.registerTool(
      {
        name: 'open_project',
        description: 'Navigate to a project by id (see list_projects for ids). Opens the case study page if one exists, otherwise the project\'s external URL.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        execute: async ({ id }: { id: string }) => {
          const project = projectById(id);
          if (!project) return { error: `Unknown project id: ${id}` };
          if (project.caseStudy) {
            navigate(`/work/${project.id}`);
          } else if (project.url) {
            window.location.href = project.url;
          }
          return { navigated: project.caseStudy ? `/work/${project.id}` : project.url };
        },
      },
      { signal: controller.signal },
    );

    return () => controller.abort();
  }, [navigate]);

  return null;
};

export default WebMcpTools;
