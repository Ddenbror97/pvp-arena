// Resolve through Vite exactly as the game does. Importing three.module.js by a
// raw node_modules URL creates a second set of classes, making instanceof checks
// and prototype instrumentation silently miss the game's actual objects.
export * from "three";
