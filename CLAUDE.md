# Silly Biscuits

A card game. The original is a Python terminal app (`silly_biscuits.py`, `Game.py`, `Player.py`, `Card.py`). The browser version lives in `web/` (Vite + React + TypeScript): run `npm install`, `npm run dev`, and `npm test` there. See the README for the rules and the browser version's differences.

## Publishing the browser game to wjdunlop.github.io/silly

The browser game is published, encrypted with StatiCrypt, at https://wjdunlop.github.io/silly/. For now this is done by hand with the steps below. There is no automation, and none should be added unless the user asks for it.

### Before you start

- Only publish when the user asks you to.
- Check that the user can push to the Pages repo. The permission must be `WRITE`, `MAINTAIN` or `ADMIN`:
  ```bash
  gh repo view wjdunlop/wjdunlop.github.io --json viewerPermission -q .viewerPermission
  ```
  If they can't push to it, stop. Tell them, and offer the encrypted `index.html` from step 2 instead.
- You need the page password. This repo is public, so the password must never be written into it: not in files, commits, PR text, or command lines saved in the repo. Ask the user for it if you don't have it.
- `wjdunlop/wjdunlop.github.io` hosts other sites, some deployed by their own scripts. **Only ever change `silly/index.html` there.** Don't touch, move, or delete anything else. Don't force-push, and don't run any other project's deploy script.

### Steps

Work in a scratch directory outside this repo, so StatiCrypt's `.staticrypt.json` and the Pages checkout never land in it.

1. **Build from `master`.** Use a clean checkout of `origin/master`, then:
   ```bash
   cd web
   npm ci
   npm test
   npm run build:single
   grep -c __silly dist/single/index.html   # must print 0: the dev-only hook isn't in production builds
   ```
   This writes one self-contained page to `web/dist/single/index.html`.

2. **Encrypt it with the same salt as the live page**, so anyone who ticked "remember me" stays signed in. Read the salt from the live page:
   ```bash
   SALT=$(curl -s https://wjdunlop.github.io/silly/ | grep -o '"staticryptSaltUniqueVariableName":"[^"]*"' | cut -d'"' -f4)
   ```
   Then, in the scratch directory, with the password in `STATICRYPT_PASSWORD`:
   ```bash
   cp <repo>/web/dist/single/index.html index.html
   npx staticrypt@3 index.html --password "$STATICRYPT_PASSWORD" --salt "$SALT" --remember 30 --short \
     -t <repo>/web/staticrypt-template.html \
     --template-title "Silly Biscuits" \
     --template-instructions "Type the password to play." \
     --template-button "Play" \
     --template-remember "Remember me on this computer" \
     --template-error "That password isn't right. Try again." \
     -d out
   grep -c createRoot out/index.html   # must print 0: no readable game code in the encrypted page
   ```
   If the password itself is changing, a new salt is fine. Remembered logins break either way.

3. **Check it unlocks.** Serve `out/` on localhost, open it, enter the password, and confirm the game loads.

4. **Put it on the site, touching only `silly/index.html`.** In the scratch directory:
   ```bash
   gh repo clone wjdunlop/wjdunlop.github.io site -- --depth 20
   cd site
   git pull --ff-only
   cp ../out/index.html silly/index.html
   git status --short   # must list only: M silly/index.html
   ```
   If `git status` shows anything other than `silly/index.html`, stop and find out why before committing. Then:
   ```bash
   git add silly/index.html
   git commit -m "Silly Biscuits: <what changed>"
   git push origin main
   ```

5. **Confirm it's live.** Wait for the Pages build of your commit, then check the live file matches what you pushed:
   ```bash
   gh api repos/wjdunlop/wjdunlop.github.io/pages/builds/latest -q '.status + " " + .commit'
   curl -s https://wjdunlop.github.io/silly/ | shasum
   shasum ../out/index.html
   ```

Afterwards, tell the user what was published and from which `master` commit.
