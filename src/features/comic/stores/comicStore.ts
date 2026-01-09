import { createStore, produce } from "solid-js/store";


export interface ComicPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt: string;
  imageUrl?: string;
  status: "empty" | "generating" | "done" | "error";
}

export interface ComicBubble {
  id: string;
  text: string;
  x: number;
  y: number;
  type: "speech" | "thought";
}

export interface ComicPage {
  id: string;
  panels: ComicPanel[];
  bubbles: ComicBubble[];
}

export interface ComicProject {
  id: string;
  title: string;
  pages: ComicPage[];
  activePageId: string;
}

const defaultProject: ComicProject = {
  id: "comic-1",
  title: "My First Comic",
  activePageId: "page-1",
  pages: [
    {
      id: "page-1",
      panels: [
        { id: "p1", x: 10, y: 10, width: 300, height: 200, prompt: "A futuristic city skyline at sunset, cyberpunk style", status: "empty" },
        { id: "p2", x: 320, y: 10, width: 300, height: 200, prompt: "Close up of a robot eye reflecting neon lights", status: "empty" },
        { id: "p3", x: 10, y: 220, width: 610, height: 250, prompt: "Wide shot of a flying car chase", status: "empty" }
      ],
      bubbles: [
        { id: "b1", text: "Welcome to Neo-Tokyo.", x: 50, y: 50, type: "speech" }
      ]
    }
  ]
};

const [state, setState] = createStore<ComicProject>(defaultProject);

export const useComicStore = () => {
  const activePage = () => state.pages.find(p => p.id === state.activePageId);

  const updatePanelPrompt = (panelId: string, prompt: string) => {
    setState("pages", p => p.id === state.activePageId, "panels", panel => panel.id === panelId, "prompt", prompt);
  };

  const setPanelImage = (panelId: string, imageUrl: string) => {
    setState("pages", p => p.id === state.activePageId, "panels", panel => panel.id === panelId, produce(panel => {
        panel.imageUrl = imageUrl;
        panel.status = "done";
    }));
  };

  const setPanelStatus = (panelId: string, status: ComicPanel["status"]) => {
    setState("pages", p => p.id === state.activePageId, "panels", panel => panel.id === panelId, "status", status);
  };

  return {
    state,
    activePage,
    updatePanelPrompt,
    setPanelImage,
    setPanelStatus
  };
};
