const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    name: 'link',
    slashData: 
        new SlashCommandBuilder()
		.setName('link')
		.setDescription('Used to link your MC account to your discord account.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your MC username.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('code')
                .setDescription('This is the code the bot will send you on the server.')
                .setRequired(false)),
    async execute(interaction, serverSettingsDatabase, playerDatabase, Rcon, GameDig, levenshtein) {
        await interaction.deferReply({ephemeral: true})

        let serverSettings = serverSettingsDatabase.get(interaction.guild.id);
        if (!serverSettings.ipSet || !serverSettings.serverPortSet || !serverSettings.rconPassSet || !serverSettings.rconPortSet) {
            return interaction.editReply({content: "Your server has not been configured yet. Please encourage your staff to finish setting me up with `/config`!", ephemeral: true})
        }
        if (playerDatabase.has(interaction.user.id)) return interaction.editReply({content: '`ERROR:` You already have a minecraft account linked.', ephemeral: true})
        
        let lowerCasePlayers = [];
        let players = [];


        
    
        await GameDig.query({
            type: 'minecraft',
            host: serverSettings.ip,
            port: serverSettings.serverPort
        }).then(async (data) => {
            
            data.players.forEach((inputData) => {
                if (inputData.name === undefined) return
                players.push(inputData.name)
                lowerCasePlayers.push(inputData.name.toLowerCase())
            });

            let closestPlayer = [];
            players.forEach((playerName) => {
                closestPlayer.push({user: playerName, distance: levenshtein.get(interaction.options.getString("username"),playerName.toLowerCase())})
            })
            closestPlayer.sort((a,b) => {
                return parseInt(a.distance) - parseInt(b.distance)
            });
            
            
            if (data.players.length === 0) return interaction.editReply({content: 'There are no users on the server. Please connect to the minecraft server and try again.', ephemeral: true})
            if (!lowerCasePlayers.includes(interaction.options.getString("username").toLowerCase())) return interaction.editReply({content: `The user you specified is not online. Did you mean \`${closestPlayer[0].user}\`?`, ephemeral: true})

            let rcon = new Rcon({
                host: serverSettings.ip, port: serverSettings.rconPort, password: serverSettings.rconPass
            })

            try {
                await rcon.connect()
            } catch (error) {
                console.log(error)
                return interaction.editReply({content: `\`ERROR:\` \`${error.syscall}\` Failed to connect to server/rcon. Please encourage an admin to check the configuration settings. Is the server offline?`, ephemeral: true})
            }

            function contactRcon(cmd) {
                try {
                    return rcon.send(cmd)
                } catch (error) {
                    console.log(error)
                    throw 'Command Error (Minecraft): Unable to contact server via rcon'
                }
            }
            if (interaction.options.getInteger("code") != null) {
                if (playerDatabase.has(interaction.guild.id)) {
                    serverPlayerData = playerDatabase.get(interaction.guild.id)
                    let idFound = -1;
                    serverPlayerData.activeVerificationCodes.forEach((obj, index) => {
                        (obj.id == interaction.user.id) ? idFound = index : '';
                    });
    
                    if (idFound != -1) {
                        if (serverPlayerData.activeVerificationCodes[idFound].code == parseInt(interaction.options.getInteger("code"))) {
                            playerDatabase.set(interaction.user.id, {username: closestPlayer[0].user, x: -1, y: -1, z: -1, world: ''})

                            contactRcon(`tellraw ${closestPlayer[0].user} ["",{"text":"You are successfully linked with user: ","color":"red"},{"text":"${interaction.user.username} (${interaction.user.id})","color":"gold"}]`)
                            await interaction.guild.channels.cache.get(serverSettings.logsID).send(`${closestPlayer[0].user} SUCCESSFULLY LINKED TO <@${interaction.user.id}>`)
                            rcon.end();
                            return interaction.editReply({content: `Success! You are now linked with \`${closestPlayer[0].user}\`!`, ephemeral: true})
                        } else {
                            return interaction.editReply({content: `\`ERROR:\` Incorrect verification code. You can run the command again without a code to regenerate.`, ephemeral: true})
                        }
                    }
                }
            } 

            
    
            if (interaction.options.getString("username") != null) {
                if (interaction.options.getInteger("code") != null) {
                    
                } else {
                    let randVerification = parseInt(`${Math.floor(Math.random() * 8)+1}${Math.floor(Math.random() * 8)+1}${Math.floor(Math.random() * 8)+1}${Math.floor(Math.random() * 8)+1}${Math.floor(Math.random() * 8)+1}`)
                    if (playerDatabase.has(interaction.guild.id)) {
                        serverPlayerData = playerDatabase.get(interaction.guild.id)
                        
                        let idFound = -1;
                        serverPlayerData.activeVerificationCodes.forEach((obj, index) => {
                            (obj.id == interaction.user.id) ? idFound = index : '';
                        });

                        if (idFound == -1) {
                            serverPlayerData.activeVerificationCodes.push({id: interaction.user.id, code: randVerification})
                        } else {
                            serverPlayerData.activeVerificationCodes[idFound].code = randVerification;
                        }

                        playerDatabase.set(interaction.guild.id, serverPlayerData)
                    } else {
                        playerDatabase.set(interaction.guild.id, {
                            activeVerificationCodes: [{id: interaction.user.id, code: randVerification}]
                        })
                    }

                    try {
                        contactRcon(`tellraw ${interaction.options.getString("username")} ["",{"text":"Your verification code is: ","color":"red"},{"text":"${randVerification}","color":"gold"}]`)
                    } catch (error) {
                        return interaction.editReply({content: `\`ERROR:\` \`${error}\` Failed to connect to server/rcon. Please encourage an admin to check the configuration settings. Is the server offline?`, ephemeral: true})
                    }
                    rcon.end();
                    return interaction.editReply({content: `Success! Your link code has been sent to you on minecraft. Please run the command and input the code to fully link your account.`, ephemeral: true})
                }
            }
        }).catch((err) => {
            return interaction.editReply({content: "Unable to connect to server! Please encourage an admin to check the configuration settings. Is the server offline?", ephemeral: true})
        })



        return
    }
}