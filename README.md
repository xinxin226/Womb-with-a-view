# Womb with a View

A mobile-friendly party game in three parts. Players join with their phones using a game code; the host runs the game on a laptop or tablet.

## Quick start

```bash
cd womb-game
npm install
npm start
```

- **Host:** Open [http://localhost:3000/host.html](http://localhost:3000/host.html), click "Create game", and share the 6-letter code.
- **Players:** On their phones, open `http://<your-ip>:3000`, enter the code and their name, then join.

To find your IP (so others on the same Wi‑Fi can join): run `ipconfig getifaddr en0` (Mac) or check your router.

## How to play

1. **Part 1 — What kind of creature are we parenting?**  
   One image is shown. Players type their guess (open text). Host closes the question when ready; everyone sees all answers. No points.

2. **Part 2 — Who NOSE the nose?**  
   Players choose A. Pointy, B. Whoville, C. Rounded, or D. Tiny boop. After the host closes the question, a bar chart shows how many chose each option. No points.

3. **Part 3 — What in the womb is this?**  
   Eleven images with a black box over the answer. Host can "Reveal in 3 seconds" (like the PowerPoint) or "Reveal answer now". After everyone has guessed, the host closes the question, sees all answers, selects the correct ones, and awards 1 point per correct answer. Then the host moves to the next image until all 11 are done. Points are only given in Part 3.

## Deploy (so players can join from anywhere)

- Run on a machine that has a public URL (e.g. a cloud server or a service like [Render](https://render.com), [Railway](https://railway.app), or [Glitch](https://glitch.com)).
- Set the `PORT` environment variable if your host requires it (e.g. `PORT=8080`).
- Use HTTPS in production; many phones require it for camera/mic. On Render/Railway, HTTPS is usually provided.
- For a home network, you can use a tunnel (e.g. [ngrok](https://ngrok.com)): `ngrok http 3000`, then share the HTTPS URL with players.

## Tech

- Node.js, Express, Socket.io
- No database; game state is in memory. Restarting the server starts new games.
