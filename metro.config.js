const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// On exclut les dossiers Android/Gradle pour éviter que Metro ne tente de les indexer
config.resolver.blacklistRE = [
  /android\/.*/,
  /app\/build\/.*/,
  /app\/src\/main\/res\/.*/
];

module.exports = config;
