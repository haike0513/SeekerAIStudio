import { Component } from "solid-js";
import ChapterSidebar from "../components/Layout/ChapterSidebar";
import CopilotSidebar from "../components/Layout/CopilotSidebar";
import SimpleEditor from "../components/Editor/SimpleEditor";

const NovelEditorPage: Component = () => {  
  return (
    <div class="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Left Sidebar - Chapters */}
        <ChapterSidebar class="w-64 hidden md:flex shrink-0" />
        
        {/* Main Content - Editor */}
        <div class="flex-1 flex flex-col bg-background relative">
           {/* Top Bar can go here if needed */}
           <SimpleEditor class="flex-1" />
        </div>

        {/* Right Sidebar - Copilot */}
        <CopilotSidebar class="w-80 hidden lg:flex shrink-0" />
    </div>
  );
};

export default NovelEditorPage;
