import { createStore } from "solid-js/store";

export interface VideoClip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  sourceUrl: string;
  thumbnailUrl?: string; // Preview image
  label: string;
}

export interface VideoTrack {
  id: string;
  name: string;
  type: "video" | "audio";
  clips: VideoClip[];
}

export interface VideoProject {
  id: string;
  title: string;
  duration: number;
  tracks: VideoTrack[];
}

const defaultProject: VideoProject = {
  id: "video-1",
  title: "New Video Project",
  duration: 30,
  tracks: [
    {
        id: "vt1",
        name: "Video Track 1",
        type: "video",
        clips: [
            { id: "vc1", trackId: "vt1", startTime: 0, duration: 5, sourceUrl: "", label: "Scene 1", thumbnailUrl: "https://placehold.co/160x90/222/FFF?text=Scene1" },
            { id: "vc2", trackId: "vt1", startTime: 5, duration: 4, sourceUrl: "", label: "Scene 2", thumbnailUrl: "https://placehold.co/160x90/333/FFF?text=Scene2" }
        ]
    },
    {
        id: "at1",
        name: "Audio Track 1",
        type: "audio",
        clips: [
             { id: "ac1", trackId: "at1", startTime: 0, duration: 10, sourceUrl: "", label: "BGM" }
        ]
    }
  ]
};

const [state] = createStore<VideoProject>(defaultProject);

export const useVideoStore = () => {
    return {
        state,
        // Add actions later
    };
};
