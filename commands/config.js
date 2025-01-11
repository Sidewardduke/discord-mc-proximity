const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
module.exports = {
    name: 'config',
    slashData:
        new SlashCommandBuilder()
            .setName('config')
            .setDescription('Used to configure the bot for your minecraft server. No inputs displays current values.')
            .addStringOption(option =>
                option.setName('serverip')
                    .setDescription('The IP users use to connect to your minecraft server.')
                    .setRequired(false))
            .addIntegerOption(option =>
                option.setName('serverport')
                    .setDescription('The Port users use to connect to your minecraft server.')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('rconpass')
                    .setDescription('The password to access your RCON (Remote Console). Use /rconhelp for more info.')
                    .setRequired(false))
            .addIntegerOption(option =>
                option.setName('rconport')
                    .setDescription('The port to access your RCON (Remote Console). Use /rconhelp for more info.')
                    .setRequired(false))
            .addIntegerOption(option =>
                option.setName('connectiondistance')
                    .setDescription('The distance at which it will connect two players.')
                    .setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, serverSettingsDatabase, playerDatabase, Discord) {

        let serverSettings = serverSettingsDatabase.get(interaction.member.guild.id)

        function checkbox(boolean) {
            if (boolean) {
                return ":white_check_mark:"
            }
            return ":x:"
        }

        var updated = false; 
        if (interaction.options.getString("serverip") != null) {
            serverSettings.ip = interaction.options.getString("serverip");
            serverSettings.ipSet = true;
            updated = true;
        }
        if (interaction.options.getInteger("serverport") != null) {
            serverSettings.serverPort = interaction.options.getInteger("serverport");
            serverSettings.serverPortSet = true;
            updated = true;

        }
        if (interaction.options.getString("rconpass") != null) {
            serverSettings.rconPass = interaction.options.getString("rconpass");
            serverSettings.rconPassSet = true;
            updated = true;
        }
        if (interaction.options.getInteger("rconport") != null) {
            serverSettings.rconPort = interaction.options.getInteger("rconport");
            serverSettings.rconPortSet = true;
            updated = true;
        }
        if (interaction.options.getInteger("connectiondistance") != null) {
            serverSettings.connectionDistance = interaction.options.getInteger("connectiondistance");
            serverSettings.connectionDistanceSet = true;
            updated = true;
        }
        
        if (updated == true) {
            serverSettingsDatabase.set(interaction.member.guild.id, serverSettings)
            await interaction.guild.channels.cache.get(serverSettings.logsID).send(`CONFIGURATION UPDATED BY <@${interaction.user.id}>`)
            return await interaction.reply( {content:"Updated!", ephemeral: true})
        }

        
        const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Settings')
        .setDescription(
            `${checkbox(serverSettings.ipSet)} **Server IP** : ${(serverSettings.ipset) ? serverSettings.ip : "Not Set"}\n
            ${checkbox(serverSettings.serverPortSet)} **Server Port** : ${(serverSettings.serverPortSet) ? serverSettings.serverPort : "Not Set"}\n
            ${checkbox(serverSettings.rconPassSet)} **RCon Password** : ${(serverSettings.rconPassSet) ? serverSettings.rconPass : "Not Set"}\n
            ${checkbox(serverSettings.rconPortSet)} **RCon Port** : ${(serverSettings.rconPortSet) ? serverSettings.rconPort : "Not Set"}\n
            ${checkbox(serverSettings.connectionDistanceSet)} **Connection Distance** : ${(serverSettings.connectionDistanceSet) ? serverSettings.connectionDistance : "Not Set"}\n`
        );


        await interaction.reply({ embeds:[embed], ephemeral: true})
    
        
        return
    }
}