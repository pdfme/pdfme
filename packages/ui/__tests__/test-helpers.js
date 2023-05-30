const { TextEncoder, TextDecoder } = require('util');

Object.assign(global, { TextDecoder, TextEncoder });
