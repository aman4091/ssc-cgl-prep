"use client";

// The user's own topics added UNDER a shipped bank (Settings → 📚 PYQ Manager,
// book = existing bank). Rendered at the top of that bank's shelf page, styled
// exactly like the bank's own rows. Null when the user has none there.

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUserTopics, userTopicCount } from "@/lib/userpyq";

export default function UserShelfTopics({ shelfId }) {
  const [topics, setTopics] = useState(null);
  useEffect(() => { setTopics(getUserTopics(shelfId)); }, [shelfId]);
  if (!topics || !topics.length) return null;

  return (
    <div className="pyq-list" style={{ marginBottom: 14 }}>
      {topics.map((t) => (
        <Link key={t.id} href={`/pyq/gk/${t.id}`} className="pyq-row">
          <span className="pyq-row__ico">📖</span>
          <span className="pyq-row__name">
            {t.name}
            <span className="pyq-row__sub">Mere questions</span>
          </span>
          <span className="pyq-row__meta">{userTopicCount(t.id)} Q</span>
        </Link>
      ))}
    </div>
  );
}
