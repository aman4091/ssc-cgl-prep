"use client";

// Saare homepage roop — HomePreview ki patti isi kram mein dikhati hai.
import HomeControl from "./HomeControl";
import HomeTimeline from "./HomeTimeline";
import HomeMap from "./HomeMap";
import HomeFocus from "./HomeFocus";
import { HomeScore, HomeNotebook, HomeKanban, HomeWeek, HomeSubjects } from "./HomeMore1";
import { HomeDial, HomeRoad, HomeBrief, HomeWall, HomeGantt } from "./HomeMore2";
import "./home2.css";

export const HOMES = [
  { id: "a", name: "Mission Control", C: HomeControl },
  { id: "b", name: "Din ki Timeline", C: HomeTimeline },
  { id: "c", name: "32 din ka Naksha", C: HomeMap },
  { id: "d", name: "Focus", C: HomeFocus },
  { id: "e", name: "Scoreboard", C: HomeScore },
  { id: "f", name: "Notebook", C: HomeNotebook },
  { id: "g", name: "Kanban", C: HomeKanban },
  { id: "h", name: "Is hafte", C: HomeWeek },
  { id: "i", name: "Subject Hub", C: HomeSubjects },
  { id: "j", name: "Ghadi", C: HomeDial },
  { id: "k", name: "Raasta", C: HomeRoad },
  { id: "l", name: "Subah ki Khabar", C: HomeBrief },
  { id: "m", name: "Numbers Wall", C: HomeWall },
  { id: "n", name: "Gantt chart", C: HomeGantt },
];
