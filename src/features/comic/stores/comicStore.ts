import { createStore, produce } from "solid-js/store";
import { createEffect } from "solid-js";

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
  prompt: string;
  panels: ComicPanel[];
  bubbles: ComicBubble[];
}

export interface GeneratedImage {
    url?: string;
    base64?: string;
    prompt: string;
    timestamp: number;
}

export interface ComicProject {
  id: string;
  title: string;
  pages: ComicPage[];
  activePageId: string;
  generatedImages: GeneratedImage[];
}

const STORAGE_KEY = "seeker-comic-project";

const defaultProject: ComicProject = {
  id: "comic-1",
  title: "My First Comic",
  activePageId: "page-1",
  generatedImages: [],
  pages: [
    {
      id: "page-1",
      prompt: "A neon-lit cyberpunk city, high contrast, cinematic lighting",
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

const getInitialState = (): ComicProject => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to load saved comic project", e);
        }
    }
    return defaultProject;
};

const [state, setState] = createStore<ComicProject>(getInitialState());

// Persistence effect
createEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
});

export const useComicStore = () => {
  const activePage = () => state.pages.find(p => p.id === state.activePageId);

  const updatePanelPrompt = (panelId: string, prompt: string) => {
    setState("pages", p => p.id === state.activePageId, "panels", panel => panel.id === panelId, "prompt", prompt);
  };

  const updatePagePrompt = (prompt: string) => {
    setState("pages", p => p.id === state.activePageId, "prompt", prompt);
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

  const addGeneratedImage = (image: { url?: string; base64?: string }, prompt: string) => {
    setState("generatedImages", produce(images => {
        images.unshift({
            ...image,
            prompt,
            timestamp: Date.now()
        });
    }));
  };

  return {
    state,
    activePage,
    updatePanelPrompt,
    updatePagePrompt,
    setPanelImage,
    setPanelStatus,
    addGeneratedImage
  };
};
