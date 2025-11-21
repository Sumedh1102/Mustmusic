import React, { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState([]);
  const [mood, setMood] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  const moodEmojis = {
    happy: "😄",
    sad: "😢",
    calm: "😌",
    angry: "😠",
    romantic: "💕",
    relaxed: "🌿",
    energetic: "⚡",
    anxious: "😰",
    excited: "🎉",
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("history") || "[]");
    setHistory(saved);
  }, []);

  async function getSpotifyData(title, artist) {
    try {
      const tokenRes = await fetch("http://localhost:5004/spotify-token");
      const tokenData = await tokenRes.json();
      const query = encodeURIComponent(`${title} ${artist}`);

      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );

      const json = await res.json();
      const track = json.tracks.items[0];

      return track
        ? {
            albumCover: track.album.images[0]?.url || "",
            previewUrl: track.preview_url || "",
            spotifyUrl: track.external_urls.spotify || "",
          }
        : null;
    } catch (err) {
      console.error("Spotify fetch failed", err);
      return null;
    }
  }

  async function handleGenerate() {
    if (!text.trim()) return setError("Please describe your mood!");

    setLoading(true);
    setError("");
    setSongs([]);
    setMood("");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `
You are a music recommendation AI.

User mood description: "${text}"

Your tasks:
1. Determine the user's mood.
2. Recommend EXACTLY 5 songs — no more, no less.
3. Each song must include:
   - title
   - artist
   - reason

Return STRICT JSON ONLY. Nothing outside JSON. 

Follow this structure exactly:

{
  "mood": "happy",
  "songs": [
    { "title": "Song A", "artist": "Artist A", "reason": "why it fits" },
    { "title": "Song B", "artist": "Artist B", "reason": "why it fits" },
    { "title": "Song C", "artist": "Artist C", "reason": "why it fits" },
    { "title": "Song D", "artist": "Artist D", "reason": "why it fits" },
    { "title": "Song E", "artist": "Artist E", "reason": "why it fits" }
  ]
}
`;

      const result = await model.generateContent(prompt);
      const responseText = await result.response.text();

      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}");
      const data = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));

      setMood(data.mood);

      const enhanced = [];
      for (const s of data.songs) {
        const extra = await getSpotifyData(s.title, s.artist);
        enhanced.push({
          ...s,
          albumCover: extra?.albumCover || "",
          previewUrl: extra?.previewUrl || "",
          spotifyUrl: extra?.spotifyUrl || "",
          youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
            s.title + " " + s.artist
          )}`,
        });
      }

      setSongs(enhanced);

      const entry = {
        mood: data.mood,
        songs: enhanced,
        text,
        date: new Date().toISOString(),
      };
      const old = JSON.parse(localStorage.getItem("history") || "[]");
      const updated = [entry, ...old];

      localStorage.setItem("history", JSON.stringify(updated));
      setHistory(updated);
    } catch (err) {
      console.error(err);
      setError("Failed to process mood. Try again!");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-gray-50 to-red-50 max-w-8xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">

        {/* LEFT SIDE IMAGE */}
     <div className="relative w-full">
  <div className="h-64 sm:h-80 md:h-[30rem] lg:h-full">
    <img
      src="https://storage.googleapis.com/gweb-uniblog-publish-prod/images/IO24_100Things_Hero.width-2200.format-webp.webp"
      alt="Music Illustration"
      className="
        w-full h-full 
        object-cover 
        object-center 
        lg:object-right
        rounded-none lg:rounded-none
      "
    />
  </div>
</div>

        {/* RIGHT SIDE CONTENT */}
        <div className="flex items-center px-4 sm:px-8 lg:px-16 py-10 lg:py-16">
          <div className="w-full text-center">

            <img
              src="https://i.ibb.co/nTR9Vck/Chat-GPT-Image-Nov-21-2025-01-09-18-PM-Photoroom-2.png"
              className="mx-auto mb-0 w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40"
            />

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-4 leading-tight">
              Mustmusic
            </h1>

            <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 px-3">
              Describe your mood and get instant AI-powered song recommendations tailored for you.
            </p>

            {/* INPUT + BUTTON */}
            <div className="space-y-4 max-w-xl mx-auto">
              <textarea
                rows="3"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe your mood...(e.g., I'm tired but hopeful)"
                className="w-full px-5 py-4 rounded-3xl border-2 border-gray-300 focus:border-blue-600 focus:outline-none transition-all text-base sm:text-lg"
              />

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-lime-600 text-white px-8 py-4 rounded-full font-semibold w-full sm:w-auto"
              >
                {loading ? "Analyzing..." : "Get Song Recommendations"}
              </button>

              {error && <p className="text-red-500">{error}</p>}
            </div>

            {/* RESULTS */}
            {mood && (
              <div className="mt-10 bg-black/70 p-5 sm:p-6 rounded-3xl text-left max-w-2xl mx-auto text-white">
                <h2 className="text-2xl font-bold mb-2">
                  Detected Mood: {mood} {moodEmojis[mood] || ""}
                </h2>

                <h3 className="text-xl font-semibold mb-4">Recommended Songs</h3>

                <ul className="space-y-4">
                  {songs.map((song, i) => (
                    <li key={i} className="p-4 bg-white rounded-3xl shadow text-black">
                      <div className="flex gap-4">

                        {song.albumCover && (
                          <img
                            src={song.albumCover}
                            alt="cover"
                            className="w-28 h-auto rounded-3xl object-cover"
                          />
                        )}

                        <div>
                          <p className="text-lg font-bold">
                            {song.title} — {song.artist}
                          </p>
                          <p className="text-gray-600 text-sm">{song.reason}</p>

                          {song.previewUrl ? (
                            <audio controls className="mt-1 w-full">
                              <source src={song.previewUrl} type="audio/mpeg" />
                            </audio>
                          ) : (
                            <p className="text-xs text-gray-600 mt-1">No preview available</p>
                          )}

                          <div className="mt-2 flex gap-4 text-sm">
                            {song.spotifyUrl && (
                              <a
                                href={song.spotifyUrl}
                                target="_blank"
                                className="text-green-600 font-semibold"
                              >
                                Spotify
                              </a>
                            )}

                            <a
                              href={song.youtubeUrl}
                              target="_blank"
                              className="text-blue-600 font-semibold"
                            >
                              YouTube
                            </a>
                          </div>
                        </div>

                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
