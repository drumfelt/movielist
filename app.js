import "dotenv/config";
import express from "express";
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from "discord-interactions";
import {
  VerifyDiscordRequest,
  getRandomEmoji,
  DiscordRequest,
} from "./utils.js";
import { getShuffledOptions, getResult } from "./game.js";
import sqlite3 from "sqlite3";
import fs from "fs";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

const moviesDbFile = "./.data/movies";
const dbExists = fs.existsSync(moviesDbFile);
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(moviesDbFile);

db.serialize(() => {
  if (dbExists) {
    db.each("select * from movies", (err, row) => {
      // console.log(JSON.stringify(row));
    });
  }
});

// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post("/interactions", async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;
  // console.log(JSON.stringify(data));

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === "test") {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: "hello world " + getRandomEmoji(),
        },
      });
    }

    if (name === "add") {
      // Extract title from request.  Only one is given but the body is an array.
      const movieAdded = data.options.map((option) => option.value).join();

      // format movie title to have upper case first letters
      const formattedMovieTitle = movieAdded
        .split(" ")
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .join(" ");
      const addStatus = await addMovieToList(formattedMovieTitle);
      let response = "";

      if (addStatus === "exists") {
        response = `${formattedMovieTitle} is already in the list.`;
      } else {
        const hydratedMovies = await getMovies();

        // Return the last movie to the user as the movie that is added.
        const lastMovie = hydratedMovies.slice(-1);
        response = `${lastMovie} added to the movie list.`;
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: response,
        },
      });
    } else if (name === "list") {
      const response = await getMoviesResponse();
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: response,
        },
      });
    } else if (name === "remove") {
      // Extract title from request.  Only one is given but the body is an array.
      const movieAdded = data.options.map((option) => option.value).join();

      // format movie title to have upper case first letters
      const formattedMovieTitle = movieAdded
        .split(" ")
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .join(" ");
      const movieRemoved = await removeMovie(movieAdded);

      let response = "";
      if (movieRemoved) {
        response = `${formattedMovieTitle} was removed from the movie list.`;
      } else {
        response = `${formattedMovieTitle} was not removed from the movie list.`;
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: response,
        },
      });
    }
  }
});

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});

async function addMovieToList(movieAdded) {
  return new Promise(async (resolve, reject) => {
    const existingMovies = await getMovies();
    const movieExists = existingMovies.some(
      (movie) => movie.toLowerCase() === movieAdded.toLowerCase()
    );

    if (movieExists) {
      resolve("exists");
    }

    db.run("insert into movies (title) values (?)", [movieAdded], (err) => {
      if (err) {
        console.log("Failed to insert movie.  Error: ", err.message);
      } else {
        resolve();
      }
    });
  });
}

async function getMoviesResponse() {
  let formattedResponse = "";
  const hydratedMovies = await getMovies();
  if (!hydratedMovies || hydratedMovies.length === 0) {
    formattedResponse = "No movies in the list.";
  }
  formattedResponse = hydratedMovies.join("\n");
  return formattedResponse;
}

async function getMovies() {
  return new Promise((resolve, reject) => {
    let movies = [];

    db.all("select * from movies", (err, rows) => {
      console.log("err ", JSON.stringify(err), "rows ", JSON.stringify(rows));
      if (err) {
        console.log("Failed to get movies.  Error: ", err.message);
      } else if (!rows) {
        console.log("Response from database is null or undefined.");
        resolve([]);
      } else {
        movies = rows.map((movie) => movie.title);
      }

      console.log("after each ", JSON.stringify(movies));

      if (movies.length > 0) {
        resolve(movies);
      } else {
        console.log("No movies found.");
        resolve([]);
      }
    });
  });
}

async function removeMovie(movieToRemove) {
  return new Promise((resolve, reject) => {
    db.run(
      "delete from movies where lower(title) = ?",
      [movieToRemove.toLowerCase()],
      (err) => {
        if (err) {
          console.log(
            "Failed to delete movie " +
              movieToRemove +
              ". Error: " +
              err.message
          );
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}
