import { createStore, produce } from "solid-js/store";

export interface AudioClip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  sourceUrl: string;
  label: string;
  color?: string;
}

export interface AudioTrack {
  id: string;
  name: string;
  type: "voice" | "sfx" | "music";
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
  clips: AudioClip[];
}

export interface AudioProject {
  id: string;
  title: string;
  duration: number;
  tracks: AudioTrack[];
}

const defaultProject: AudioProject = {
  id: "audio-1",
  title: "New Audio Project",
  duration: 60,
  tracks: [
    {
        id: "t1",
        name: "Voice Over",
        type: "voice",
        volume: 1.0,
        isMuted: false,
        isSolo: false,
        clips: [
            { id: "c1", trackId: "t1", startTime: 1, duration: 5, sourceUrl: "", label: "Intro Speech", color: "#3b82f6" }
        ]
    },
    {
        id: "t2",
        name: "Background Music",
        type: "music",
        volume: 0.8,
        isMuted: false,
        isSolo: false,
        clips: [
             { id: "c2", trackId: "t2", startTime: 0, duration: 20, sourceUrl: "", label: "Epic BGM", color: "#10b981" }
        ]
    }
  ]
};

const [state, setState] = createStore<AudioProject>(defaultProject);

export const useAudioStore = () => {
    const addTrack = (type: AudioTrack["type"] = "voice") => {
        setState("tracks", produce(tracks => {
            tracks.push({
                id: `t-${Date.now()}`,
                name: `New ${type} track`,
                type,
                volume: 1.0,
                isMuted: false,
                isSolo: false,
                clips: []
            });
        }));
    };

    const addClip = (trackId: string, clip: Omit<AudioClip, "id" | "trackId">) => {
        setState("tracks", track => track.id === trackId, "clips", produce(clips => {
            clips.push({
                ...clip,
                id: `c-${Date.now()}`,
                trackId
            });
        }));
    };

    return {
        state,
        addTrack,
        addClip
    };
};
