"use client";

import { useParams } from "next/navigation";
import VocabDayType from "@/components/VocabDayType";

export default function VocabTypePage() {
  const { day, type } = useParams();
  return <VocabDayType day={day} type={type} />;
}
