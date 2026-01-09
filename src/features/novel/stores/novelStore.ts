import { createStore, produce } from "solid-js/store";
import { nanoid } from "nanoid";

export interface BookMetadata {
  title: string;
  author: string;
  genre: string;
  createdAt: number;
}

export interface Character {
  id: string;
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "other";
  bio: string;
  traits: string[];
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  summary: string;
  content: string;
  lastModified: number;
}

export interface BookProject {
  id: string;
  metadata: BookMetadata;
  characters: Character[];
  chapters: Chapter[];
  activeChapterId: string | null;
}

// Initial mock data
const defaultProject: BookProject = {
  id: "default-1",
  metadata: {
    title: "The Last Starship",
    author: "User",
    genre: "Sci-Fi",
    createdAt: Date.now(),
  },
  characters: [
    {
      id: "char-1",
      name: "Commander Harken",
      role: "protagonist",
      bio: "A veteran of the Galactic Wars, tired but duty-bound.",
      traits: ["Stoic", "Experienced", "Cynical"],
    },
     {
      id: "char-2",
      name: "ARIA",
      role: "supporting",
      bio: "The ship's AI, developing strange glitches resembling emotions.",
      traits: ["Logical", "Mysterious", "Glitchy"],
    },
  ],
  chapters: [
    {
      id: "chap-1",
      title: "Chapter 1: The Alarm",
      order: 1,
      summary: "Harken wakes up from cryo-sleep to a red alert.",
      content: "# Chapter 1: The Alarm\n\nThe alarm blared, a harsh, rhythmic pulse that cut through the silence of cryo-sleep. Commander Harken gasped, his lungs burning with the sudden influx of cold, sterile air.\n\nHe tried to move, but his limbs felt heavy, like they were made of lead. The cryo-pod's glass cover hissed open, retracting into the bulkhead.\n\n\"Status report,\" he dissolved, his voice a dry croak.\n\n\"Critical failure in Sector 4,\" ARIA's synthesized voice responded, sounding uncharacteristically frantic. \"Hull breach imminent.\"",
      lastModified: Date.now(),
    },
    {
      id: "chap-2",
      title: "Chapter 2: The Hallway",
      order: 2,
      summary: "Running towards Sector 4.",
      content: "# Chapter 2: The Hallway\n\nThe red emergency lights bathed the corridor in blood-colored shadows. Harken stumbled, his muscles still fighting the cryo-sickness.\n\nHe needed to get to the bridge, but the blast doors were sealing one by one.",
      lastModified: Date.now(),
    },
  ],
  activeChapterId: "chap-1",
};

const [state, setState] = createStore<BookProject>(defaultProject);

export const useNovelStore = () => {
    const activeChapter = () => state.chapters.find((c) => c.id === state.activeChapterId) || null;

    const setActiveChapter = (id: string) => {
        setState("activeChapterId", id);
    };

    const updateChapterContent = (id: string, content: string) => {
        setState(
            "chapters",
            (c) => c.id === id,
            produce((chapter) => {
                chapter.content = content;
                chapter.lastModified = Date.now();
            })
        );
    };
    
    const updateChapterTitle = (id: string, title: string) => {
        setState(
            "chapters",
            (c) => c.id === id,
            "title",
            title
        );
    };

    const addChapter = () => {
        const newChapter: Chapter = {
            id: nanoid(),
            title: "New Chapter",
            order: state.chapters.length + 1,
            summary: "",
            content: "",
            lastModified: Date.now(),
        };
        setState("chapters", [...state.chapters, newChapter]);
        setActiveChapter(newChapter.id);
    };

    const deleteChapter = (id: string) => {
        setState("chapters", (chapters) => chapters.filter((c) => c.id !== id));
        if (state.activeChapterId === id) {
             setState("activeChapterId", state.chapters[0]?.id || null);
        }
    };
    
    const addCharacter = (character: Omit<Character, "id">) => {
        setState("characters", [...state.characters, { ...character, id: nanoid() }]);
    }

  return {
    state,
    activeChapter,
    setActiveChapter,
    updateChapterContent,
    updateChapterTitle,
    addChapter,
    deleteChapter,
    addCharacter
  };
};
