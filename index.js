require("dotenv").config();

const { Client, Intents } = require("discord.js-selfbot-v13");
const { Configuration, OpenAIApi } = require("openai");

// إعداد ChatGPT
const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

// إنشاء عميلين Selfbot (حسابين)
const client1 = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES],
  partials: ["CHANNEL"],
});
const client2 = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES],
  partials: ["CHANNEL"],
});

// متغيرات من .env
const TOKEN1 = process.env.TOKEN1;
const TOKEN2 = process.env.TOKEN2;
const CHANNEL_ID = process.env.CHANNEL_ID;

// للحفاظ على سياق المحادثة
let conversation = [
  {
    role: "system",
    content: `You are a friendly AI chatting on Discord. 
              Please reply in the requested language.`,
  },
];

// حالة الدور: من 1 إلى 4 تعني:
// 1: حساب1 بالعربي
// 2: حساب2 بالعربي
// 3: حساب1 بالإنجليزي
// 4: حساب2 بالإنجليزي
let turn = 1;

client1.login(TOKEN1);
client2.login(TOKEN2);

client1.once("ready", () => {
  console.log(`Client1 ready: ${client1.user.tag}`);
  startChatting();
});

client2.once("ready", () => {
  console.log(`Client2 ready: ${client2.user.tag}`);
});

async function sendMessage(client, content) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    await channel.send(content);
    console.log(`${client.user.tag} sent: ${content}`);
  } catch (err) {
    console.error("Send message error:", err);
  }
}

async function getChatGPTReply(language, context) {
  try {
    // نوجه النظام للرد باللغة المطلوبة
    let systemPrompt =
      language === "ar"
        ? "أنت مساعد ذكي يتحدث بالعربية بشكل طبيعي."
        : "You are a friendly AI assistant speaking English naturally.";

    // ندمج النظام الحالي مع المحادثة السابقة
    let messages = [
      { role: "system", content: systemPrompt },
      ...context,
    ];

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 150,
      temperature: 0.8,
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenAI API error:", error);
    return language === "ar"
      ? "عذرًا، حدث خطأ."
      : "Sorry, an error occurred.";
  }
}

async function startChatting() {
  setInterval(async () => {
    let client, language, roleUser;

    switch (turn) {
      case 1:
        client = client1;
        language = "ar";
        roleUser = "user1_ar";
        break;
      case 2:
        client = client2;
        language = "ar";
        roleUser = "user2_ar";
        break;
      case 3:
        client = client1;
        language = "eng";
        roleUser = "user1_eng";
        break;
      case 4:
        client = client2;
        language = "eng";
        roleUser = "user2_eng";
        break;
    }

    // نجيب رد من ChatGPT مع المحادثة السابقة
    const reply = await getChatGPTReply(language, conversation);

    // نرسل الرد
    await sendMessage(client, reply);

    // نحافظ على السياق للمحادثة
    conversation.push({ role: "assistant", content: reply });
    conversation.push({ role: "user", content: reply });

    // نبدل الدور بالتتابع (1 -> 2 -> 3 -> 4 -> 1 ...)
    turn = turn === 4 ? 1 : turn + 1;
  }, 10_000);
}
