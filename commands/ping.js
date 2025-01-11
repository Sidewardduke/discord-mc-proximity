const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    name: 'ping',
    slashData: 
        new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
    execute(interaction) {
        interaction.reply({ content: `pong.` , ephemeral: true });
        return
    }
}