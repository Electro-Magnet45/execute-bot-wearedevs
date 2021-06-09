const Discord = require("discord.js");
require("dotenv").config();
const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});
const mongoose = require("mongoose");
const UserData = require("./userData.js");
const keepAlive = require("./server.js");

const econCommands = [
  {
    code: "`lp!leaderboard`",
    desc: "Get the leaderboard",
  },
  {
    code: "`lp!userinfo`",
    desc: "Get the info about an user",
  },
  {
    code: "`lp!sell @user amount`",
    desc: "Sell your xp to another user",
  },
  {
    code: "`$e-help`",
    desc: "Get help",
  },
];

const sendHelp = (msg, chId) => {
  var title;
  var res;
  if (chId === process.env.BOTCHATCHID) {
    title = "Xp Commads";
    res = econCommands
      .map(({ code, desc }) => `${code}\n ${desc}   `)
      .join("\n\n");
  }

  const embed = new Discord.MessageEmbed()
    .setColor("#1ab27c")
    .setTitle(`__${title}__`)
    .setDescription(res)
    .setTimestamp();

  msg.reply(embed);
};

client.on("ready", () => {
  console.log("Ready");
  client.user.setPresence({
    activity: { name: "the execution", type: "LISTENING" },
    status: "idle",
  });

  const connection_url = process.env.DB_URL;
  mongoose
    .connect(connection_url, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .catch((err) => {
      console.log(err);
    });
});

const emojiReactions = [
  {
    id: "%F0%9F%91%A6",
    rId: "842783617439629394",
  },
  {
    id: "%F0%9F%91%A7",
    rId: "842784081146282014",
  },
  {
    id: "%F0%9F%A7%91",
    rId: "843017781619326996",
  },
  {
    id: "%F0%9F%91%BC",
    rId: "842788131102392332",
  },
  {
    id: "%F0%9F%91%A8",
    rId: "842788018229346395",
  },
];

const sendEmbed = (msg, data, title, isarray) => {
  const res = data;
  var result;

  if (isarray) {
    result = res
      .map(({ name, xp, level }) => `${name}: on ${level} level, ${xp} xp `)
      .join("\n");
  } else {
    result = data;
  }

  const embed = new Discord.MessageEmbed()
    .setColor(
      "#" + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, "0")
    )
    .setTitle(`__${title}__`)
    .setDescription(result)
    .setTimestamp();

  msg.reply(embed);
};

const roller = (resObj, reaction, user, add) => {
  const { guild } = reaction.message;
  const member = guild.members.cache.get(user.id);

  if (resObj) {
    let role = guild.roles.cache.find((r) => r.id === resObj.rId);
    if (add) {
      member.roles.add(role);
    } else {
      member.roles.remove(role);
    }
  }
};

const roleHandler = (reaction, user, add) => {
  const resObj = emojiReactions.find(
    (obj) => obj.id == reaction.emoji.identifier
  );

  if (reaction.message.id === process.env.Q1ID) {
    if (!resObj) {
      reaction.remove();
      return;
    }
  } else if (reaction.message.id === process.env.Q2ID) {
    if (!resObj) {
      reaction.remove();
      return;
    }
  } else return;

  roller(resObj, reaction, user, add);
};

client.on("message", (msg) => {
  if (msg.author.bot) return;
  if (msg.channel.type === "dm") return;
  if (msg.channel.id === process.env.MAINCHID) {
    UserData.findOne(
      {
        userId: msg.author.id,
      },
      (err, data) => {
        if (!data && !err)
          UserData.create({
            userId: msg.author.id,
            name: msg.author.username,
            xp: 2,
            level: 0,
          });
        else if (data && !err) {
          UserData.updateOne(
            { userId: msg.author.id },
            {
              $set: {
                xp: data.xp + 2,
              },
            }
          ).exec();
        }
      }
    );
  }

  if (msg.content === "$e-help") {
    sendHelp(msg, msg.channel.id);
  }

  if (msg.channel.id === process.env.BOTCHATCHID) {
    if (!msg.content.startsWith("lp!")) return;

    var msgContent = msg.content.substring(3).toLocaleLowerCase();

    if (msgContent === "leaderboard") {
      UserData.find({})
        .sort({ xp: "descending" })
        .exec((err, data) => {
          if (!err) sendEmbed(msg, data, "Leaderboard", true);
        });
    } else if (msgContent.substring(0, 8) === "userinfo") {
      var user = msg.mentions.users.first();
      if (user === undefined) user = msg.author;

      UserData.findOne({ userId: user.id }, (err, data) => {
        if (!data && !err)
          sendEmbed(
            msg,
            `<@!${user.id}> has no xp. Earn some xp by chatting in the server`,
            "User",
            false
          );
        else if (!err && data)
          sendEmbed(
            msg,
            `User's Xp: ${data.xp}\nUser's Level: ${data.level}`,
            "User",
            false
          );
      });
    } else if (msgContent.substring(0, 4) === "sell") {
      const user = msg.mentions.users.first();

      var amountn = msgContent.split(" ");
      const amount = amountn[amountn.length - 1];

      if (user === undefined) return;

      if (user.id === msg.author.id) {
        sendEmbed(
          msg,
          `<@!${msg.author.id}>, You can't sell your own xp to yourself`,
          "Sell",
          false
        );
      } else {
        UserData.findOne({ userId: msg.author.id }, (err, data) => {
          if (!err && !data)
            sendEmbed(
              msg,
              `<@!${msg.author.id}> don't have enough xp to sell your xp!`,
              "Sell",
              false
            );
          else if (!err && data) {
            if (data.xp > amount + 2) {
              UserData.findOne({ userId: user.id }, (err, giftUserData) => {
                if (!err && !giftUserData)
                  sendEmbed(
                    msg,
                    `<@!${user.id}> should have atleast 1xp to sell money to him/her`,
                    "Sell",
                    false
                  );
                else if (!err && giftUserData) {
                  UserData.updateOne(
                    { userId: msg.author.id },
                    {
                      $set: {
                        xp: data.xp - amount,
                      },
                    }
                  ).exec();

                  UserData.updateOne(
                    {
                      userId: user.id,
                    },
                    {
                      $set: {
                        xp: giftUserData.xp + Number(amount),
                      },
                    }
                  ).exec((err, ok) => {
                    if (!err && ok)
                      sendEmbed(
                        msg,
                        `You have sold your ${amount} xp to <@!${
                          user.id
                        }>. \nYour existing balance is ${data.xp - amount}`,
                        "Sell",
                        false
                      );
                  });
                }
              });
            } else {
              sendEmbed(
                msg,
                `<@!${msg.author.id}>, you don't have enough xp to sell`,
                "Sell",
                false
              );
            }
          }
        });
      }
    }
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;

  if (reaction.message.channel.id === process.env.ROLESCHID) {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        return;
      }
    }
    roleHandler(reaction, user, true);
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;

  if (reaction.message.channel.id === process.env.ROLESCHID) {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        return;
      }
    }
    roleHandler(reaction, user, false);
  }
});

keepAlive();

client.login(process.env.TOKEN);
