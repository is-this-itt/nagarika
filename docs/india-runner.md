# Running the collector from India

Several government sites don't answer requests from GitHub's servers in the US:
state MLA fund portals (Odisha, Madhya Pradesh, Delhi), BBMP and GBA, GeM,
data.gov.in and PMGSY. The usual cause is that they only accept visitors from India.
A computer in India, registered as a GitHub "self-hosted runner", lets those
collection jobs run from an Indian address.

## Option A (current): a Windows laptop at home

Set up on 2026-10-25 as `rushi-laptop` (labels `self-hosted, Windows, X64, india`).

**House rules for any change on the laptop.** It is the owner's personal computer:
- Look first and change nothing until the owner says OK, in their own words.
- Install only through winget, from official sources, and only what is needed.
- Keep everything in `C:\actions-runner`, and record every change in `INSTALL-LOG.txt` with
  the command that undoes it.
- Say before every admin (UAC) prompt.
- Leave antivirus, firewall, the execution policy, startup and other apps alone.

What is installed, and where the notes live:
- Python 3.12 and Git, installed for all users with winget from an admin PowerShell. On
  this laptop, `winget ... --scope machine` fails with error 0x80070005 from a normal
  window.
- The runner, in `C:\actions-runner`, as the service
  `actions.runner.is-this-itt-nagarika.rushi-laptop`. It runs as NETWORK SERVICE and is
  set to **Manual** start, so it only takes jobs while the owner has started it.
- `INSTALL-LOG.txt`, `START-STOP.txt` and `HOW-TO-REMOVE.txt` in that folder.

Workflow steps run in `cmd`. Windows blocks PowerShell scripts there (execution policy
"Restricted"), and we leave that setting as it is.

The original setup steps follow.

The owner's laptop runs the India-only jobs whenever it is on and online. When it is
off, those jobs wait; everything else keeps running on GitHub.

### 1. Install Python and Git (skip what you already have)
1. **Python:** download the latest Python 3 from https://www.python.org/downloads/
   and run it. On the first screen tick **"Add python.exe to PATH"**, then choose
   **Customize installation → Next**, tick **"Install Python for all users"** and
   click **Install**. ("All users" matters: the runner runs as a Windows service,
   which can't see a Python installed only for your account.)
2. **Git:** download from https://git-scm.com/download/win and run it, keeping
   every default.
3. Check: open **PowerShell** (Start menu, type "PowerShell") and run
   `python --version` and `git --version`. Both should print a version.

### 2. Get the runner commands from GitHub
1. Open https://github.com/is-this-itt/nagarika/settings/actions/runners/new
2. Choose **Windows** and **x64**. GitHub shows two boxes of commands:
   **Download** and **Configure**. The Configure box has a token valid for one hour.

### 3. Install the runner
1. Open **PowerShell as administrator** (Start menu, type "PowerShell", right-click,
   **Run as administrator**).
2. Run `mkdir C:\actions-runner; cd C:\actions-runner`, then paste the rest of the
   **Download** commands from GitHub, one line at a time.
3. Paste the **Configure** command (`./config.cmd --url ... --token ...`). It asks
   a few questions:
   - **Runner group:** press Enter
   - **Name of runner:** type `rushi-laptop`
   - **Additional labels:** type `india`
   - **Work folder:** press Enter
   - **Run as service?** type `Y`, then press Enter for the account it suggests
4. The service now starts by itself whenever Windows starts.

### 4. Check it
On https://github.com/is-this-itt/nagarika/settings/actions/runners the runner
`rushi-laptop` should show **Idle** with a green dot.

### 5. One safety setting
Open https://github.com/is-this-itt/nagarika/settings/actions and under **Fork pull
request workflows from outside collaborators**, choose **Require approval for all
external contributors**, then **Save**. This stops strangers' pull requests from
running code on your laptop.

To remove it later: **Settings → Actions → Runners → rushi-laptop → Remove**, then
delete `C:\actions-runner`.

## Option B: a free Oracle Cloud server in India

Use this if the collection should run around the clock.

### What you need

- About 15 minutes, on a laptop (the Oracle console is awkward on a phone)
- A debit or credit card for Oracle's identity check. The Always Free tier does not
  charge; Oracle places a small temporary hold to verify the card.

### Steps

#### 1. Create an Oracle Cloud account
1. Open https://signup.cloud.oracle.com and sign up.
2. **Home region:** choose **India West (Mumbai)** or **India South (Hyderabad)**.
   This can't be changed later, and it is what gives the server an Indian address.
3. Finish the card check and wait for the "account ready" email.

#### 2. Create the server
1. In the Oracle console: **Menu → Compute → Instances → Create instance**.
2. **Name:** `nagarika-runner`.
3. **Image:** Canonical Ubuntu 24.04. **Shape:** keep the "Always Free-eligible"
   one (VM.Standard.E2.1.Micro, or an Ampere A1 shape with 1 OCPU and 6 GB if it's
   offered).
4. **Add SSH keys:** choose **Generate a key pair for me** and download both keys.
5. Tap **Create**, and wait until the instance shows **Running**. Note its
   **Public IP address**.

#### 3. Get a runner token from GitHub
1. Open https://github.com/is-this-itt/nagarika/settings/actions/runners/new
2. Choose **Linux** and **x64** (or **ARM64** if you picked an Ampere shape).
3. Leave the page open: it shows a `--token` value for the "Configure" step. It is
   valid for one hour.

#### 4. Install the runner
From the Oracle console, open the instance and use **Cloud Shell** (or SSH with the
downloaded key: `ssh -i <key file> ubuntu@<public IP>`). Then paste this, putting the
token from step 3 in place of `PASTE_TOKEN`:

```bash
TOKEN=PASTE_TOKEN
ARCH=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')
VER=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | grep -oP '"tag_name": "v\K[^"]+')
sudo apt-get update -y && sudo apt-get install -y python3-pip python3-venv git
mkdir -p ~/runner && cd ~/runner
curl -sL -o r.tgz https://github.com/actions/runner/releases/download/v$VER/actions-runner-linux-$ARCH-$VER.tar.gz
tar xzf r.tgz && rm r.tgz
./config.sh --unattended --url https://github.com/is-this-itt/nagarika --token "$TOKEN" \
  --name oracle-india --labels india --replace
sudo ./svc.sh install && sudo ./svc.sh start
```

#### 5. Check it
Back on https://github.com/is-this-itt/nagarika/settings/actions/runners the runner
`oracle-india` should show **Idle** with a green dot. Tell Claude, and the India-only
collection jobs will be switched on.

## How it's used

- `India-only sources` (`.github/workflows/india.yml`) only runs when someone clicks
  **Run workflow**. Its tasks:
  - `mlalads` collects MLA fund works (Odisha so far) into `data/mlalads/` and asks for a
    site rebuild.
  - `probe` saves sample pages from a site for study. It runs a script from the
    `discovery` branch. Name those scripts `scripts/india_*.py` so they don't also trigger
    `discover.yml` on GitHub's servers.

Jobs that need an Indian address run with `runs-on: [self-hosted, india]` in their
own workflow, so the normal six-hourly collection and the site deploy never wait on
this server. If it is ever down, only those jobs pause.

## Safety

- The runner only takes jobs from this repository.
- The repository is public: never let it run workflows from pull requests by
  outsiders. Under **Settings → Actions → General → Fork pull request workflows**,
  keep **Require approval for all external contributors** selected.
- To stop it at any time: **Settings → Actions → Runners → oracle-india → Remove**,
  or terminate the instance in Oracle.
