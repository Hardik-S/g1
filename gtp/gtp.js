#!/usr/bin/env node
'use strict';

const readline = require('node:readline');
const { stdin, stdout } = require('node:process');
const { createEngine } = require('../src/apps/zen-go/js/engine.js');
const { toGtpCoord } = require('../src/apps/zen-go/js/goban.js');
const packageJson = require('../package.json');

const engine = createEngine({ size: 9 });

const COMMAND_LIST = [
  'protocol_version',
  'name',
  'version',
  'list_commands',
  'boardsize',
  'clear_board',
  'showboard',
  'play',
  'genmove',
  'quit'
];

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
  terminal: false
});

let processing = Promise.resolve();
let exitRequested = false;

rl.on('line', (line) => {
  processing = processing.then(() => handleLine(line)).catch((error) => {
    respond(false, null, error.message || 'unknown error');
  });
});

rl.on('close', () => {
  if (!exitRequested) {
    process.exit(0);
  }
});

async function handleLine(rawLine) {
  const line = typeof rawLine === 'string' ? rawLine : '';
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }
  if (trimmed.startsWith('#')) {
    return;
  }
  const commentIndex = trimmed.indexOf('#');
  const content = commentIndex >= 0 ? trimmed.slice(0, commentIndex).trim() : trimmed;
  if (!content) {
    return;
  }

  const parsed = parseCommand(content);
  if (!parsed) {
    respond(false, null, 'invalid command');
    return;
  }

  const { id, command, args } = parsed;
  if (!command) {
    respond(false, id, 'unknown command');
    return;
  }
  const handler = handlers[command];
  if (!handler) {
    respond(false, id, `unknown command: ${command}`);
    return;
  }

  try {
    const result = handler(args, id);
    const resolved = result instanceof Promise ? await result : result;
    if (resolved && typeof resolved === 'object' && resolved.__response) {
      respond(resolved.__response.ok, id, resolved.__response.message);
    } else if (typeof resolved === 'string' && resolved.length > 0) {
      respond(true, id, resolved);
    } else if (resolved === '') {
      respond(true, id, '');
    } else {
      respond(true, id, '');
    }
    if (command === 'quit') {
      exitRequested = true;
      rl.close();
    }
  } catch (error) {
    respond(false, id, error && error.message ? error.message : 'command failed');
  }
}

function parseCommand(input) {
  const tokens = input.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }
  let id = null;
  let command = tokens[0];
  let args = tokens.slice(1);
  if (!handlers[command]) {
    id = command;
    if (tokens.length === 1) {
      return { id, command: null, args: [] };
    }
    command = tokens[1];
    args = tokens.slice(2);
  }
  return { id, command, args };
}

function respond(success, id, message) {
  const prefix = success ? '=' : '?';
  const idPart = id ? String(id) : '';
  const hasMessage = typeof message === 'string' && message.length > 0;
  if (hasMessage && message.includes('\n')) {
    let header = prefix;
    if (idPart) {
      header += idPart;
    }
    stdout.write(`${header}\n${message}\n\n`);
    return;
  }
  let line = prefix;
  if (idPart) {
    line += idPart;
  }
  if (hasMessage) {
    line += ' ';
    line += message;
  }
  stdout.write(`${line}\n\n`);
}

const handlers = {
  protocol_version: () => '2',
  name: () => 'Zen Go',
  version: () => (packageJson && packageJson.version ? packageJson.version : 'dev'),
  list_commands: () => COMMAND_LIST.join('\n'),
  boardsize: (args) => {
    if (!args || args.length === 0) {
      throw new Error('boardsize requires a single integer argument.');
    }
    const size = Number.parseInt(args[0], 10);
    if (!Number.isInteger(size)) {
      throw new Error('boardsize requires a numeric value.');
    }
    engine.setBoardSize(size);
    return '';
  },
  clear_board: () => {
    engine.clearBoard();
    return '';
  },
  showboard: () => engine.showBoard(),
  play: (args) => {
    if (!args || args.length < 2) {
      throw new Error('play requires color and vertex arguments.');
    }
    const color = args[0];
    const vertex = args[1];
    engine.play(color, vertex);
    return '';
  },
  genmove: async (args) => {
    if (!args || args.length === 0) {
      throw new Error('genmove requires a color argument.');
    }
    const color = args[0];
    const move = await engine.genMove(color);
    if (!move) {
      return 'PASS';
    }
    if (move.pass) {
      return 'PASS';
    }
    if (move.vertex) {
      return move.vertex.toUpperCase();
    }
    return toGtpCoord(move.x, move.y, engine.size);
  },
  quit: () => ''
};

module.exports = {
  handleLine,
  parseCommand,
  respond
};
