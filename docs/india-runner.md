# Running the collector from India

Several government sites don't answer requests from GitHub's servers in the US:
state MLA fund portals (Odisha, Madhya Pradesh, Delhi), BBMP and GBA, GeM,
data.gov.in and PMGSY. The usual cause is that they only accept visitors from India.
A small free server in India, registered as a GitHub "self-hosted runner", lets the
same collection jobs run from an Indian address.

## What you need

- About 15 minutes, on a laptop (the Oracle console is awkward on a phone)
- A debit or credit card for Oracle's identity check. The Always Free tier does not
  charge; Oracle places a small temporary hold to verify the card.

## Steps

### 1. Create an Oracle Cloud account
1. Open https://signup.cloud.oracle.com and sign up.
2. **Home region:** choose **India West (Mumbai)** or **India South (Hyderabad)**.
   This can't be changed later, and it is what gives the server an Indian address.
3. Finish the card check and wait for the "account ready" email.

### 2. Create the server
1. In the Oracle console: **Menu → Compute → Instances → Create instance**.
2. **Name:** `nagarika-runner`.
3. **Image:** Canonical Ubuntu 24.04. **Shape:** keep the "Always Free-eligible"
   one (VM.Standard.E2.1.Micro, or an Ampere A1 shape with 1 OCPU and 6 GB if it's
   offered).
4. **Add SSH keys:** choose **Generate a key pair for me** and download both keys.
5. Tap **Create**, and wait until the instance shows **Running**. Note its
   **Public IP address**.

### 3. Get a runner token from GitHub
1. Open https://github.com/is-this-itt/nagarika/settings/actions/runners/new
2. Choose **Linux** and **x64** (or **ARM64** if you picked an Ampere shape).
3. Leave the page open: it shows a `--token` value for the "Configure" step. It is
   valid for one hour.

### 4. Install the runner
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

### 5. Check it
Back on https://github.com/is-this-itt/nagarika/settings/actions/runners the runner
`oracle-india` should show **Idle** with a green dot. Tell Claude, and the India-only
collection jobs will be switched on.

## How it's used

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
