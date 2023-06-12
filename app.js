import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import {
  verifyDiscordRequest,
  getRandomEmoji
} from './utils.js';
import { watched, list, unwatch, pick, addMovie, remove } from './interactions.js';
import { getMovieInfoByTitle } from './movie-info.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: verifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, data } = req.body;
  let responseContent = '';
  
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
          content: `hello world ${getRandomEmoji()}`,
        },
      });
    }

    if (name === 'add') {
      responseContent = await addMovie(data);
    } else if (name === 'list') {
      responseContent = await list(data);
    } else if (name === 'remove') {
      responseContent = await remove(data);
    } else if (name === 'watched') {
      responseContent = await watched(data);
    } else if (name === 'pick') {
      responseContent = await pick();
    } else if (name === 'unwatch') {
      responseContent = await unwatch(data);
    } else if (name === 'info') {
      responseContent = getMovieInfoByTitle(data);
    } else {
      responseContent = `Command unsupported`;
    }
  } else {
    responseContent = `This request was not of type InteractionType.APPLICATION_COMMAND and is unsupported.`;
  }

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: responseContent
    }
  });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
