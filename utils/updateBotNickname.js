async function updateBotNickname(isPaused, interaction) {
  // Update the bot's nickname to indicate whether it's paused or not
  const botUserId = "889320148643749899";
  const pauseEmoji = "\u23F8";
  const newNickname = isPaused ? `${pauseEmoji} wastedpotbot` : "wastedpotbot";

  // Find the guild

  const guild = interaction.guild;

  if (!guild) {
    console.error("Guild not found.");
    return;
  }

  // Find the bot's member within the guild using its user ID
  const botMember = guild.members.cache.get(botUserId);

  if (!botMember) {
    console.error("Bot member not found in the guild.");
    return;
  }

  // Change the bot's nickname
  botMember
    .setNickname(newNickname)
    .then((updatedMember) => {
      console.log(`Bot's nickname updated to ${updatedMember.displayName}`);
    })
    .catch((error) => {
      console.error("Error changing nickname:", error);
    });
}

module.exports = updateBotNickname;
