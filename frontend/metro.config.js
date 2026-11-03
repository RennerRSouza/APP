const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.assetExts.push('tflite');

const config = {};

module.exports = mergeConfig(defaultConfig, config);