const { SlashCommandBuilder, ChannelType, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
module.exports = {
    name: 'setup',
    slashData: 
        new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Used for first time server setup.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, serverSettingsDatabase) {
		

		if (serverSettingsDatabase.has(interaction.member.guild.id)) {
			return interaction.reply({ content: "`Error:` Setup already complete!", ephemeral: true});
		}

		let everyoneRole = interaction.member.guild.roles.cache.find(r => r.name === '@everyone');

		await interaction.reply({ content: "Beginning setup...", ephemeral: true})
		


		var categoryID;

		await interaction.editReply({ content: "Creating Channel Category...", ephemeral: true})
		
		var minecraftCategory = await interaction.guild.channels.cache.filter(channel => ((channel.type === ChannelType.GuildCategory) && channel.name === "Minecraft Voice Channels"));
		
		if (minecraftCategory.size == 0) {
			minecraftCategory = await interaction.guild.channels.create({
				name: "Minecraft Voice Channels",
				type: ChannelType.GuildCategory
			});
			categoryID = minecraftCategory.id;
		} else {
			if (minecraftCategory.size > 1) {
				
				return await interaction.editReply({ content: "`Error:` Multiple 'Minecraft Voice Channels' found, please delete and restart setup.", ephemeral: true})
			} else {
				categoryID = await minecraftCategory.entries().next().value[0]
			}
		}
	

		await interaction.editReply({ content: "Creating logs-errors Text...", ephemeral: true})
		
		var logID;

		var logsErrorsText = await interaction.guild.channels.cache.filter(channel => ((channel.type === ChannelType.GuildText) && (channel.name === "logs-errors") && (channel.parent == categoryID)));
		
		if (logsErrorsText.size == 0) {
			logsErrorsText = await interaction.guild.channels.create({
				name: "logs-errors",
				type: ChannelType.GuildText,
				parent: categoryID,
				permissionOverwrites: [
					{
						id: everyoneRole.id,
						deny: [PermissionsBitField.Flags.SendMessages]
					}
				]
			});
			logID = logsErrorsText.id;
		} else {
			if (logsErrorsText.size > 1) {
				return await interaction.editReply({ content: "`Error:` Multiple 'logs-errors' found, please delete and restart setup.", ephemeral: true})
			} else {
				logID = await logsErrorsText.entries().next().value[0]
			}
		}

		
		await interaction.editReply({ content: "Creating Waiting Room Voice...", ephemeral: true})

		var waitingRoomID;

		var minecraftWaitingRoom = await interaction.guild.channels.cache.filter(channel => ((channel.type === ChannelType.GuildVoice) && (channel.name === "Waiting Room") && channel.parent == categoryID));
		
		if (minecraftWaitingRoom.size == 0) {
			minecraftWaitingRoom = await interaction.guild.channels.create({
				name: "Waiting Room",
				type: ChannelType.GuildVoice,
				parent: categoryID,
				permissionOverwrites: [
					{
						id: everyoneRole.id,
						deny: [PermissionsBitField.Flags.Speak]
					}
				]
			});
			waitingRoomID = minecraftWaitingRoom.id;
		} else {
			if (minecraftWaitingRoom.size > 1) {
				return await interaction.editReply({ content: "`Error:` Multiple 'Waiting Room' found, please delete and restart setup.", ephemeral: true})
			} else {
				waitingRoomID = await minecraftWaitingRoom.entries().next().value[0]
			}
		}


		await interaction.editReply({ content: "Creating Proximity Voice 1...", ephemeral: true})

		var proxID;

		var minecraftProximityOne = await interaction.guild.channels.cache.filter(channel => ((channel.type === ChannelType.GuildVoice) && (channel.name === "Proximity Voice 1") && channel.parent == categoryID));

		if (minecraftProximityOne.size == 0) {
			minecraftProximityOne = await interaction.guild.channels.create({
				name: "Proximity Voice 1",
				type: ChannelType.GuildVoice,
				parent: categoryID,
				permissionOverwrites: [
					{
						id: everyoneRole.id,
						deny: [PermissionsBitField.Flags.Connect]
					}
				]
			});
			proxID = minecraftProximityOne.id;
		} else {
			if (minecraftProximityOne.size > 1) {
				return await interaction.editReply({ content: "`Error:` Multiple 'Proximity Voice 1' found, please delete and restart setup.", ephemeral: true})
			} else {
				proxID = await minecraftProximityOne.entries().next().value[0]
			}
		}
		await interaction.editReply({ content: "Creation complete...", ephemeral: true})

		
		if (!serverSettingsDatabase.has(interaction.member.guild.id)) {
			serverSettingsDatabase.set(interaction.member.guild.id, 
				{
					ipSet: false,
					ip: "",
					serverPortSet: true,
					serverPort: "25565",
					rconPassSet: false,
					rconPass: "",
					rconPortSet: true,
					rconPort: "25575",
					connectionDistanceSet: true,
					connectionDistance: 50,
					categoryID: categoryID,
					logsID: logID,
					waitingRoomID: waitingRoomID,
					proximityIDs: [proxID],
					activeUsers: []
				}
			)
		}


		await interaction.guild.channels.cache.get(logID).send('Setup Complete!\n\nHello, thank you for choosing my bot! Please remember that it is still a work in progress and any bugs that you find can\'t be fixed without reporting them!\n\nPlease configure me for your minecraft server using `/config!`')
        await interaction.editReply({ content:'Setup Complete!\n\nHello, thank you for choosing my bot! Please remember that it is still a work in progress and any bugs that you find can\'t be fixed without reporting them!\n\nPlease configure me for your minecraft server using `/config!`', ephemeral: true})

        return
    }
}