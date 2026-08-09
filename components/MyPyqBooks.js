"use client";

// User's own PYQ books (Settings → 📚 PYQ Manager) on the PYQ index — shown
// above the shipped banks. Client component because the books live in
// localStorage; renders nothing until mounted (and nothing if no books yet).

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUserBooks, userBookCount } from "@/lib/userpyq";

export default function MyPyqBooks() {
  const [books, setBooks] = useState(null);
  useEffect(() => { setBooks(getUserBooks()); }, []);
  if (!books || !books.length) return null;

  return (
    <div className="pyq-list" style={{ marginBottom: 14 }}>
      {books.map((b) => (
        <Link key={b.id} href={`/pyq/my/${b.id}`} className="pyq-row">
          <span className="pyq-row__ico">{b.icon || "📘"}</span>
          <span className="pyq-row__name">{b.name}</span>
          <span className="pyq-row__meta">{userBookCount(b.id)} Q</span>
        </Link>
      ))}
    </div>
  );
}
