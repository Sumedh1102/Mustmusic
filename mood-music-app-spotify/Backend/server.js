import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

app.get("/spotify-token", async (req, res) => {
  try {
    const tokenData = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.SPOTIFY_CLIENT_ID +
                ":" +
                process.env.SPOTIFY_CLIENT_SECRET
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    res.json({ access_token: tokenData.data.access_token });
  } catch (err) {
    console.error("Error fetching token", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5004, () => console.log("Backend running on http://localhost:5004"));
