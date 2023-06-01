import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
};

// Command containing options
const LIST_COMMAND = {
  name: 'list',
  description: 'Display all movies in the movie list.',
  type: 1
};

const REMOVE_COMMAND = {
  name: 'remove',
  description: 'Remove a movie from the movie list.',
  type: 1,
   options: [
    {
      type: 3,
      name: 'title',
      description: 'remove a movie from the movie list',
      required: true
    }
  ]
};

const ADD_COMMAND = {
  name: 'add',
  description: 'add a movie to the movie list',
  options: [
    {
      type: 3,
      name: 'title',
      description: 'add a movie to the movie list',
      required: true
    }
  ],
  type: 1
};

const WATCHED_COMMAND = {
  name: 'watched',
  description: 'add a movie to the watched movie list or list all watched movies',
  options: [
    {
      type: 3,
      name: 'title',
      description: 'add a movie to the watched movie list or list all watched movies'
    }
  ],
  type: 1
};

const PICK_COMMAND = {
  name: 'pick',
  description: 'Pick a movie from the movie list.',
  type: 1
}

const ALL_COMMANDS = [ADD_COMMAND, LIST_COMMAND, REMOVE_COMMAND, TEST_COMMAND, WATCHED_COMMAND, PICK_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);