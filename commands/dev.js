const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    name: 'dev',
    slashData: 
        new SlashCommandBuilder()
		.setName('dev')
		.setDescription('Replies with Pong!'),
    async execute(interaction, serverSettingsDatabase, playerDatabase, Rcon, GameDig, levenshtein) {
        await interaction.reply({ content:'Cleared.', ephemeral: true });
        serverSettingsDatabase.deleteAll()
        // newdata = serverSettingsDatabase.get(interaction.guild.id)
        //.activeUsers = ['228084853134852096', '565529015008362496', '252496582136692739', '408489825025654784', '222855077814075393', '454866651972763648']
        //console.log(newdata)
        //serverSettingsDatabase.set(interaction.guild.id,newdata)
        
        //console.log(serverSettingsDatabase.get(interaction.guild.id))
        
        //playerDatabase.deleteAll()
        // console.log(playerDatabase.set('252496582136692739', {
        //     username: 'Mercury560',
        //     x: '356',
        //     y: '182',
        //     z: '808',
        //     world: 'world'
        //   }))
        //await interaction.guild.channels.cache.get(serverSettings.logsID).send(`${closestPlayer[0].user} SUCCESSFULLY LINKED TO ${interaction.user.id}`)

        //console.log(interaction.guild.channels.cache.get(serverSettingsDatabase.get(interaction.guild.id).waitingRoomID).members.size)
        return
    }
}