"use client";

import FeedBucket from "@/components/FeedBucket";

export default function StaticGkPage() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">📚 Static GK</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Static <span className="grad">GK</span>
        </h1>
        <p className="hero__sub">
          Topic-wise static GK — each topic has a quiz from PDF/image plus a video.
        </p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        <FeedBucket
          feed="static"
          bucket="topic"
          dateMode="text"
          datePlaceholder="Topic — e.g. Books & Authors, National Parks"
          note="Name the topic, then add questions from a PDF/image. You can attach a video link too."
        />
      </section>
    </>
  );
}
