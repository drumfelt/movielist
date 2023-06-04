import 'dotenv/config';
import { installGlobalCommands } from './utils.js';

// Simple test command
const testCommand = {
  name: 'test',
  description: 'Basic command',
  type: 1,
};

const listCommand = {
  name: 'list',
  description: 'Display all movies in the movie list.',
  type: 1
};

const removeCommand = {
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

const addCommand = {
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

const watchedCommand = {
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

const unwatchCommand = {
  name: 'unwatch',
  description: 'unwatch a movie',
  options: [
    {
      type: 3,
      name: 'title',
      description: 'unwatch a movie',
      required: true
    }
  ],
  type: 1
};

const pickCommand = {
  name: 'pick',
  description: 'Pick a movie from the movie list.',
  type: 1
};

const allCommands = [addCommand, listCommand, removeCommand, testCommand, watchedCommand, pickCommand, unwatchCommand];

installGlobalCommands(process.env.APP_ID, allCommands);