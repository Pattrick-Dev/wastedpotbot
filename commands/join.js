const { joinVoiceChannel } = require('@discordjs/voice');

async function joinCommand(interaction, connection) {
    const guild = interaction.guild;
    const member = guild.members.cache.get(interaction.user.id);

    if (!member.voice.channel) {
        await interaction.reply({
            content: "You must be in a voice channel to use this command.",
            ephemeral: true,
        });
        return;
    }

    const channel = member.voice.channel;

    if (!connection) {
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
    }

    await interaction.reply({
        content: `Joined channel ${channel.name}`,
        ephemeral: true,
    });

    return connection; // Return the connection to be used elsewhere
}

module.exports = joinCommand;
