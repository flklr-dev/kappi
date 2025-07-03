const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro to use the local IP address
config.server = {
  ...config.server,
  host: '192.168.1.118',
  port: 8081,
};

module.exports = config; 