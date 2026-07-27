module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@src": "./src",
            "@components": "./src/components",
            "@services": "./src/services",
            "@store": "./src/store",
            "@utils": "./src/utils",
          },
        },
      ],
    ],
  };
};
