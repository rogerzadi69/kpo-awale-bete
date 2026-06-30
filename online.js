(function () {
  const config = window.KPO_SUPABASE_CONFIG || {};
  const isConfigured = Boolean(config.url && config.publishableKey);
  const client = isConfigured && window.supabase
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;

  let mode = "local";
  let role = null;
  let roomCode = "";
  let channel = null;
  let opponentConnected = false;

  function getElement(id) {
    return document.getElementById(id);
  }

  function setStatus(message, tone = "normal") {
    const status = getElement("room-status");
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function normalizeCode(value) {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  }

  function createCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let value = "";
    for (let index = 0; index < 6; index += 1) {
      value += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return value;
  }

  async function leaveRoom() {
    if (channel && client) {
      await client.removeChannel(channel);
    }
    channel = null;
    role = null;
    roomCode = "";
    opponentConnected = false;
    getElement("room-share").classList.add("hidden");
  }

  async function setMode(nextMode) {
    mode = nextMode;
    getElement("local-mode-button").classList.toggle("active", mode === "local");
    getElement("online-mode-button").classList.toggle("active", mode === "online");
    getElement("computer-mode-button").classList.toggle("active", mode === "computer");
    getElement("online-lobby").classList.toggle("hidden", mode !== "online");

    if (mode === "local" || mode === "computer") {
      await leaveRoom();
      setStatus(mode === "computer" ? "Mode contre l'ordinateur actif." : "Mode local actif.");
      window.KpoGame?.setMode(mode);
      window.KpoGame?.newGame();
      return;
    }

    if (!isConfigured) {
      setStatus("Supabase doit être configuré avant de jouer à distance.", "error");
    } else {
      setStatus("Créez une partie ou rejoignez un adversaire.");
    }
    window.KpoGame?.setMode("online");
    window.KpoGame?.render();
  }

  async function connect(code, playerRole) {
    if (!client) {
      setStatus("Configuration Supabase manquante.", "error");
      return;
    }

    await leaveRoom();
    role = playerRole;
    roomCode = code;
    opponentConnected = false;
    channel = client.channel(`kpo-room-${roomCode}`, {
      config: { broadcast: { self: false }, presence: { key: `player-${role + 1}` } },
    });

    channel
      .on("broadcast", { event: "join" }, () => {
        if (role === 0) {
          opponentConnected = true;
          setStatus("Joueur 2 connecté. La partie peut commencer.", "success");
          send("state", { state: window.KpoGame?.getState() });
        }
      })
      .on("broadcast", { event: "state" }, ({ payload }) => {
        if (role === 1 && payload?.state) {
          opponentConnected = true;
          window.KpoGame?.applyState(payload.state);
          setStatus("Connecté comme Joueur 2.", "success");
        }
      })
      .on("broadcast", { event: "move" }, ({ payload }) => {
        const opponentRole = role === 0 ? 1 : 0;
        if (payload?.role === opponentRole && payload?.row === opponentRole) {
          window.KpoGame?.playRemoteMove(payload.row, payload.col);
        }
      })
      .on("broadcast", { event: "reset" }, ({ payload }) => {
        window.KpoGame?.applyState(payload.state);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ role, joinedAt: Date.now() });
        getElement("room-code-text").textContent = roomCode;
        getElement("room-share").classList.remove("hidden");

        if (role === 0) {
          setStatus("En attente du Joueur 2…", "waiting");
          window.KpoGame?.newGame();
        } else {
          setStatus("Connexion à la partie…", "waiting");
          send("join", { role });
        }
        window.KpoGame?.render();
      });
  }

  function send(event, payload) {
    if (!channel) return Promise.resolve();
    return channel.send({ type: "broadcast", event, payload });
  }

  function canPlay(player) {
    if (mode === "local") return true;
    return opponentConnected && role === player;
  }

  async function sendMove(row, col) {
    if (mode !== "online" || !channel) return false;
    await send("move", { row, col, role });
    return true;
  }

  async function broadcastReset(state) {
    if (mode === "online" && role === 0 && channel) {
      await send("reset", { state });
    }
  }

  function getInviteUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomCode);
    url.hash = "game";
    return url.toString();
  }

  window.KpoOnline = {
    isOnline: () => mode === "online",
    canPlay,
    sendMove,
    broadcastReset,
    getRole: () => role,
    hasOpponent: () => opponentConnected,
  };

  window.addEventListener("DOMContentLoaded", () => {
    getElement("local-mode-button").addEventListener("click", () => setMode("local"));
    getElement("online-mode-button").addEventListener("click", () => setMode("online"));
    getElement("computer-mode-button").addEventListener("click", () => setMode("computer"));
    getElement("create-room-button").addEventListener("click", () => connect(createCode(), 0));
    getElement("join-room-button").addEventListener("click", () => {
      const code = normalizeCode(getElement("room-code-input").value);
      if (code.length !== 6) {
        setStatus("Saisissez un code de 6 caractères.", "error");
        return;
      }
      connect(code, 1);
    });
    getElement("room-code-input").addEventListener("input", (event) => {
      event.target.value = normalizeCode(event.target.value);
    });
    getElement("copy-room-button").addEventListener("click", async () => {
      await navigator.clipboard.writeText(getInviteUrl());
      setStatus("Lien d'invitation copié.", "success");
    });

    const invitedCode = normalizeCode(new URL(window.location.href).searchParams.get("room") || "");
    if (invitedCode.length === 6) {
      getElement("room-code-input").value = invitedCode;
      setMode("online");
    }
  });
})();
