require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const cors = require("cors"); // Add CORS package

const app = express();
const port = 3000;

app.use(cors());

// Function to scrape top 4 favorite movies from Letterboxd
async function getFavoriteMovies(username) {

  console.log(`Scraping Letterboxd for ${username}`);
  
  
  const url = `https://letterboxd.com/${username}/`;
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const html = response.data;
    const $ = cheerio.load(html);
    const favoriteMovies = [];
    $("#favourites .film-poster img").each((i, el) => {
      if (i >= 4) return false; // Limit to top 4
      const title = $(el).attr("alt");
      if (title) favoriteMovies.push(title);
    });
    return favoriteMovies;
  } catch (error) {
    console.error(`Error scraping Letterboxd for ${username}:`, error.message);
    return [];
  }
}

// Function to generate a roast using Cloudflare AI API
async function generateRoast(username, movies) {
  if (movies.length === 0) {
    return `${username}, you have no favorite movies to roast—maybe pick some films so I can actually have some fun with you!`;
  }
  const promptText = `Generate a funny roast for ${username} based on their top 4 favorite movies: ${movies.join(
    ", "
  )}. Please refer to the user as "${username}, " and roast their account. We will have one paragraph for each favourite without any extra text or commentary. Please make sure to not use the username more than twice in the entire response.`;
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-3b-instruct`;

  try {
    const response = await axios.post(
      apiUrl,
      {
        prompt: promptText,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Adjust based on actual Cloudflare AI API response structure
    return (
      response.data.result.response ||
      `${username}, no roast generated—guess the AI couldn’t handle your terrible taste!`
    );
  } catch (error) {
    console.error("Error calling AI API:", error.message);
    return `${username}, failed to generate a roast—the AI must’ve laughed too hard and crashed!`;
  }
}

// API endpoint to roast a user based on their favorite movies
app.get("/roast/:username", async (req, res) => {
  try {
    const username = req.params.username;
    if (!username || typeof username !== "string" || username.trim() === "") {
      return res.status(400).send("Invalid username provided.");
    }
    const movies = await getFavoriteMovies(username);

    if (movies.length === 0) {
      return res
        .status(404)
        .send(
          "No favorite movies found for this user. Are they too cool for favorites?"
        );
    }
    const roast = await generateRoast(username, movies);
    res.send(roast);
  } catch (error) {
    console.error("Error in /roast endpoint:", error.message);
    res
      .status(500)
      .send("Internal server error. The roast machine is on fire!");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
