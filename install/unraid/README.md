# Unraid (Compose Manager)

Unofficial community path. Project NOMAD does not officially support Unraid. Do not file Unraid bugs against the Debian installer.

This stack runs the Command Center on Unraid Docker and **does not create `nomad_ollama`**. GPU inference stays on the Ollama container you already run. Downloaded knowledge is still searchable: NOMAD installs **Qdrant** itself and sends embedding requests to your host Ollama.

## Clone and start

1. Install **Compose Manager** from Community Applications.
2. Clone this repo somewhere that is **not** the data directory, for example:

   ```bash
   git clone https://github.com/Crosstalk-Solutions/project-nomad.git /mnt/user/appdata/project-nomad-src
   ```

3. Copy the env file and edit it:

   ```bash
   cd /mnt/user/appdata/project-nomad-src/install/unraid
   cp .env.example .env
   nano .env
   ```

   Set `URL` to `http://<unraid-lan-ip>:8080`. Change `APP_KEY` and `MYSQL_PASSWORD`. Leave `NOMAD_DATA_DIR` at `/mnt/user/appdata/project-nomad` unless you want a different share.

4. In Compose Manager, add a stack whose project directory is `install/unraid` (the folder that contains `compose.yml` and `.env`). Compose file name: `compose.yml`.
5. Start the stack. Open the `URL` you set.

Runtime data (`storage/`, `mysql/`, `redis/`) is created under `NOMAD_DATA_DIR`. `git pull` in the clone does not mix with MySQL or ZIMs.

## Host Ollama (knowledge base)

Set `NOMAD_REMOTE_OLLAMA_URL=http://host.docker.internal:11434` so the Command Center uses Unraid Ollama.

- Unraid Ollama must listen on `0.0.0.0:11434` (port published to the host).
- **Do not** install “AI Assistant” as a local container in the NOMAD UI.
- NOMAD still starts **Qdrant** (`nomad_qdrant`) for the vector store. Chat retrieval and auto-embed of downloads use that Qdrant plus your host Ollama.
- Pull the embedding model on the host Ollama if it is not already there: `nomic-embed-text:v1.5`. NOMAD will try to pull it through the Ollama API; if that is blocked, pull it in the Unraid Ollama UI.

Leave `NOMAD_REMOTE_OLLAMA_URL` empty if you want to skip AI until the wizard. The stack still will not start `nomad_ollama`.

## Rules of thumb

- Do not edit `nomad_*` containers in Unraid’s Docker tab. Manage them from Compose Manager / the NOMAD UI.
- NOMAD has no authentication. Keep it on your LAN.
- GPU stays on the host Ollama container; this stack does not pass a GPU into NOMAD.
