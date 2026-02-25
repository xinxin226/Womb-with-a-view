# Step-by-Step: Deploy Womb with a View on Render

Follow these steps in order. You need a GitHub account and a Render account (both free).

---

## Part 1: Put your app on GitHub

### Step 1: Create a new repository on GitHub

1. Go to **https://github.com** and sign in.
2. Click the **+** (top right) → **New repository**.
3. Set **Repository name** to something like `womb-with-a-view`.
4. Leave **Add a README file** unchecked.
5. Click **Create repository**.
6. Leave the page open; you’ll need the repo URL in Step 3.

### Step 2: Open Terminal and go to your app folder

On your computer, open Terminal (or Command Prompt) and run:

```bash
cd /Users/nancy/womb-game
```

(If your project is somewhere else, use that path instead.)

### Step 3: Turn the folder into a Git repo and push to GitHub

Run these commands **one at a time**. Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME` with your real GitHub username and the repo name you chose (e.g. `womb-with-a-view`).

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Initial commit"
```

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
```

```bash
git branch -M main
```

```bash
git push -u origin main
```

If GitHub asks for a password, use a **Personal Access Token** instead of your account password (GitHub → Settings → Developer settings → Personal access tokens).

After this, your code should appear on GitHub.

---

## Part 2: Deploy on Render

### Step 4: Sign up or log in to Render

1. Go to **https://render.com**.
2. Click **Get Started for Free** (or **Log in** if you have an account).
3. Choose **Sign up with GitHub** and authorize Render to use your GitHub account.

### Step 5: Create a new Web Service

1. From the Render **Dashboard**, click **New +**.
2. Click **Web Service**.

### Step 6: Connect your GitHub repository

1. Under **Connect a repository**, find **womb-with-a-view** (or whatever you named the repo).
2. Click **Connect** next to it.
3. If you don’t see the repo, click **Configure account** and give Render access to the right GitHub account or organization, then try again.

### Step 7: Configure the Web Service

Fill in the form like this:

| Field | What to enter |
|--------|----------------|
| **Name** | `womb-with-a-view` (or any name you like) |
| **Region** | Choose one (e.g. Oregon (US West)) |
| **Branch** | `main` |
| **Root Directory** | Leave **blank** (your app is at the repo root) |
| **Runtime** | **Node** |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** (or a paid plan if you prefer) |

Do **not** add any environment variables unless you need them later.

### Step 8: Deploy

1. Click **Create Web Service**.
2. Render will clone the repo, run `npm install`, then `npm start`. This may take 1–3 minutes.
3. Wait until the status at the top shows **Live** (green).

### Step 9: Get your app URL

At the top of the page you’ll see a URL like:

**https://womb-with-a-view-xxxx.onrender.com**

That’s your deployed app.

---

## Part 3: Use your deployed app

Replace `YOUR-APP-URL` with the URL Render gave you (e.g. `https://womb-with-a-view-xxxx.onrender.com`).

- **Host (you run the game):**  
  **YOUR-APP-URL/host.html**  
  Example: `https://womb-with-a-view-xxxx.onrender.com/host.html`

- **Participants (players join here):**  
  **YOUR-APP-URL/**  
  Example: `https://womb-with-a-view-xxxx.onrender.com/`

Share the participant link; they only need to enter their name to join.

---

## Troubleshooting

- **Build fails:** Check the **Logs** tab on Render. Make sure **Build Command** is `npm install` and **Start Command** is `npm start`, and that your repo has `package.json` and `server.js` at the root.
- **App not at repo root:** If your repo has the app inside a folder (e.g. `womb-game`), set **Root Directory** in Render to that folder name.
- **First load is slow:** On the free tier, the app can “sleep” after 15 minutes of no traffic. The first visit after that may take 30–60 seconds to respond; that’s normal.
