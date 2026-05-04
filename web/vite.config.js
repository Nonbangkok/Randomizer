import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: { port: 5173, open: false },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        contact: resolve(__dirname, 'contact.html'),
        privacyPolicy: resolve(__dirname, 'privacy-policy.html'),
        terms: resolve(__dirname, 'terms.html'),

        nameGenerator: resolve(__dirname, 'tools/name-generator/index.html'),
        passwordGenerator: resolve(__dirname, 'tools/password-generator/index.html'),
        backlogWheel: resolve(__dirname, 'tools/backlog-wheel/index.html'),
        challengeGenerator: resolve(__dirname, 'tools/challenge-generator/index.html'),

        blogIndex: resolve(__dirname, 'blog/index.html'),
        blogFantasyNames: resolve(__dirname, 'blog/how-to-pick-fantasy-names.html'),
        blogPasswordMistakes: resolve(__dirname, 'blog/password-security-mistakes.html'),
        blogBacklog: resolve(__dirname, 'blog/conquer-game-backlog.html'),
        blogRpgCharacter: resolve(__dirname, 'blog/rpg-character-development.html'),
        blogCybersecurity: resolve(__dirname, 'blog/cybersecurity-passwords-2026.html'),
        blogGameJam: resolve(__dirname, 'blog/game-jam-survival-guide.html'),
        blogPsychology: resolve(__dirname, 'blog/psychology-of-randomness.html'),
        blogWorldBuilding: resolve(__dirname, 'blog/world-building-random-tables.html'),
        blogBrowserPrivacy: resolve(__dirname, 'blog/browser-based-tools-privacy.html'),
        blogGamifying: resolve(__dirname, 'blog/gamifying-productivity.html'),
      },
    },
  },
});
