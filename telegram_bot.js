async function handleTelegramWebhook(request) {
  const url = new URL(request.url);
  if (url.pathname === `/telegram`) {
    const update = await request.json();
    if ("message" in update) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const command = text.split(" ")[0];
      const args = text.split(" ").slice(1);

      if (command === "/start") {
        await sendMenu(chatId, "Welcome to the Nautica bot!");
      } else if (command === "/proxies") {
        const country = args[0];
        const page = parseInt(args[1] || "0");
        const proxyList = await getProxyList();
        const filteredProxyList = country
          ? proxyList.filter((p) => p.country === country.toUpperCase())
          : proxyList;
        const config = getAllConfig(request, new URL(request.url).hostname, filteredProxyList, page);
        await sendDocument(chatId, new Blob([config], { type: "text/html" }), "proxies.html");
      } else if (command === "/check") {
        const proxy = args[0];
        if (proxy) {
          const [proxyIP, proxyPort] = proxy.split(":");
          const result = await checkProxyHealth(proxyIP, proxyPort);
          await sendMessage(chatId, JSON.stringify(result, null, 2));
        } else {
          await sendMessage(chatId, "Please provide a proxy to check. Usage: /check <ip:port>");
        }
      } else if (command === "/adddomain") {
        const domain = args[0];
        if (domain) {
          const cloudflareApi = new CloudflareApi();
          const result = await cloudflareApi.registerDomain(domain);
          if (result === 200) {
            await sendMessage(chatId, `Domain ${domain} registered successfully.`);
          } else {
            await sendMessage(chatId, `Failed to register domain ${domain}. Status: ${result}`);
          }
        } else {
          await sendMessage(chatId, "Please provide a domain to add. Usage: /adddomain <domain>");
        }
      }
    } else if ("callback_query" in update) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;
      if (data === "proxies") {
        const proxyList = await getProxyList();
        const config = getAllConfig(request, new URL(request.url).hostname, proxyList, 0);
        await sendDocument(chatId, new Blob([config], { type: "text/html" }), "proxies.html");
      }
      await answerCallbackQuery(update.callback_query.id);
    }
  }
  return new Response("OK");
}

async function sendMenu(chatId, text) {
  const url = `${TELEGRAM_API}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Get Proxies", callback_data: "proxies" },
          { text: "Check Proxy", callback_data: "check" },
        ],
        [{ text: "Add Domain", callback_data: "adddomain" }],
      ],
    },
  };
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function sendMessage(chatId, text, reply_markup = null) {
  const url = `${TELEGRAM_API}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    reply_markup: reply_markup,
  };
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function sendDocument(chatId, document, filename) {
  const url = `${TELEGRAM_API}/sendDocument`;
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("document", document, filename);

  await fetch(url, {
    method: "POST",
    body: formData,
  });
}

async function answerCallbackQuery(callbackQueryId) {
  const url = `${TELEGRAM_API}/answerCallbackQuery`;
  const payload = {
    callback_query_id: callbackQueryId,
  };
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export { handleTelegramWebhook };
