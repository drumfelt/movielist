import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import {
  VerifyDiscordRequest,
  getRandomEmoji,
  DiscordRequest,
} from './utils.js';
import sqlite3 from 'sqlite3';
import fs from 'fs';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

const moviesDbFile = './.data/movies';
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(moviesDbFile);

// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

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

    // 'test' command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: 'hello world ' + getRandomEmoji(),
        },
      });
    }

    if (name === 'add') {
      // Extract title from request.  Only one is given but the body is an array.
      const movieAdded = getTitleFromRequest(data);

      // format movie title to have upper case first letters
      const formattedMovieTitle = getFormattedMovieTitle(movieAdded);
      const addStatus = await addMovieToList(formattedMovieTitle);
      let response = '';

      if (addStatus === 'exists') {
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
    } else if (name === 'list') {
      let response = await getMoviesResponse();

      if (response === '') {
        response = 'There are no movies in the movie list.';
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: response,
        },
      });
    } else if (name === 'remove') {
      // Extract title from request.  Only one is given but the body is an array.
      const movieAdded = getTitleFromRequest(data);
      let response = '';
      const movies = await getMovies();
      const movieExists = movies.some(
        (movie) => movie.toLowerCase() === movieAdded.toLowerCase()
      );

      if (!movieExists) {
        response = 'This movie is not in the list.';
      } else {
        // format movie title to have upper case first letters
        const formattedMovieTitle = getFormattedMovieTitle(movieAdded);
        const movieRemoved = await removeMovie(movieAdded);

        if (movieRemoved) {
          response = `${formattedMovieTitle} was removed from the movie list.`;
        } else {
          response = `${formattedMovieTitle} was not removed from the movie list.`;
        }
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: response,
        },
      });
    } else if (name === 'watched') {
      // Extract title from request.  Only one is given but the body is an array.
      let movieAdded = '';
      if (data.options && data.options.length > 0) {
        movieAdded = getTitleFromRequest(data);
      }
      const formatted = getFormattedMovieTitle(movieAdded);
      const response = await watched(formatted);
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: response,
        },
      });
    } else if (name === 'pick') {
      const movies = await getMovies();
      let response = '';
      if (movies && movies.length > 0) {
        if (movies.length === 1) {
          response = movies[0];
        } else {
          const upper = movies.length;
          const random = Math.floor(Math.random() * upper);
          if (random > movies.length - 1) {
            response = movies[0];
          } else {
            response = movies[random];
          }
        }
      } else {
        response = 'There are no movies in the movie list.';
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: response,
        },
      });
    } else if (name === 'unwatch') {
      const watchedMovies = await getWatchedMovies();
      let response = '';
      if (watchedMovies && watchedMovies.length > 0) {
        // Extract title from request.  Only one is given but the body is an array.
        const title = getTitleFromRequest(data);
        const formattedTitle = getFormattedMovieTitle(title);

        response = await new Promise(async (resolve, reject) => {
          db.run('delete from watchedmovies where lower(title) = ?;', [title.toLowerCase()], (err) => {
            if (err) {
              console.log(`Failed to delete ${formattedTitle} from watched movie list.  Error: ${err.message}`);
              resolve(`Failed to delete ${formattedTitle} from watched movie list.`);
            } else {
              resolve(`${formattedTitle} was removed from the watched list.`);
            }
          });
        });

      } else {
        response = 'There are no movies in the watched movie list.';
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: response
        },
      });
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});

async function addMovieToList(movieAdded) {
  return new Promise(async (resolve, reject) => {
    const existingMovies = await getMovies();
    const movieExists = existingMovies.some(
      (movie) => movie.toLowerCase() === movieAdded.toLowerCase()
    );

    if (movieExists) {
      resolve('exists');
    } else {
      db.run('insert into movies (title) values (?);', [movieAdded], (err) => {
        if (err) {
          console.log('Failed to insert movie.  Error: ', err.message);
        } else {
          resolve();
        }
      });
    }
  });
}

async function getMoviesResponse() {
  let formattedResponse = '';
  const hydratedMovies = await getMovies();
  if (!hydratedMovies || hydratedMovies.length === 0) {
    formattedResponse = 'No movies in the list.';
  }
  formattedResponse = hydratedMovies.join('\n');
  return formattedResponse;
}

async function getMovies() {
  return new Promise((resolve, reject) => {
    let movies = [];

    db.all('select * from movies;', (err, rows) => {
      if (err) {
        console.log('Failed to get movies.  Error: ', err.message);
      } else if (!rows) {
        console.log('Response from database is null or undefined.');
        resolve([]);
      } else {
        movies = rows.map((movie) => movie.title);
      }

      if (movies.length > 0) {
        resolve(movies);
      } else {
        console.log('No movies found.');
        resolve([]);
      }
    });
  });
}

async function removeMovie(movieToRemove) {
  return new Promise((resolve, reject) => {
    db.run(
      'delete from movies where lower(title) = ?;',
      [movieToRemove.toLowerCase()],
      (err) => {
        if (err) {
          console.log(`Failed to delete ${movieToRemove}. Error: ${err.message}`);
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}

async function watched(movieTitle) {
  return new Promise(async (resolve, reject) => {
    if (!movieTitle || movieTitle.trim() === '') {
      const watchedMovies = await getWatchedMovies();
      const formatted = watchedMovies.join('\n');
      if (formatted === '') {
        resolve(`No movies in the watched movies list.`);
      }
      resolve(formatted);
    } else {
      const movies = await getMovies();
      const exists = movies.some(
        (movie) => movie.toLowerCase() === movieTitle.toLowerCase()
      );

      if (exists) {
        const removed = await removeMovie(movieTitle);
        await addMovieToWatched(movieTitle);
        if (removed) {
          resolve(
            `${movieTitle} was added to watched list and removed from movies list.`
          );
        }
        resolve(`Failed to remove ${movieTitle}.`);
      } else {
        resolve(`${movieTitle} is not in the movie list.`);
      }
    }
  });
}

async function addMovieToWatched(movieTitle) {
  return new Promise(async (resolve, reject) => {
    db.run(
      'insert into watchedmovies(title) values(?);',
      [movieTitle],
      (err) => {
        if (err) {
          console.log(
            `Failed to add movie to watched list.  Error: ${err.message}`
          );
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}

async function getWatchedMovies() {
  return new Promise((resolve, reject) => {
    db.all('select * from watchedmovies;', (err, rows) => {
      const titles = rows.map((row) => row.title);
      if (err) {
        console.log(`Failed to get watched movies.  Error: ${err.message}`);
        resolve(err.message);
      } else {
        resolve(titles);
      }
    });
  });
}

function getFormattedMovieTitle(title) {
  return title
    .split(' ')
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' ');
}

function getTitleFromRequest(data) {
  return data.options
        .map((option) => option.value)
        .join()
        .trim();
}
