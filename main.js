//intialize the files needed
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates] });
const { token, clientID } = require("./config.json");
const fs = require('node:fs');
const Enmap = require("enmap");
const { Rcon } = require('rcon-client');
const cron = require("node-cron")
const { GameDig } = require('gamedig'); 
const levenshtein = require('fast-levenshtein');
const { channel } = require('node:diagnostics_channel');


//intialize databases
const serverSettingsDatabase = new Enmap({name: "serverSettingsDatabase"});
const playerDatabase = new Enmap({name: "playerDatabase"});


//intialize rest
const rest = new REST({ version: '9' }).setToken(token);


//command file fetch
const commands = [];
client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
    client.commands.set(command.name,command)
	commands.push(command.slashData);
}


//database successful load
(serverSettingsDatabase.isReady) ? console.log(`Successfully Loaded serverSettingsDatabase. ${serverSettingsDatabase.size} keys loaded.`) : '';
(playerDatabase.isReady) ? console.log(`Successfully Loaded playerDatabase. ${playerDatabase.size} keys loaded.`) : '';


//functions
async function parseXYZ(rconOutput) {
    let split = rconOutput.split("\n")
    let world = split[0].split(" ")[2]
    let x = parseInt(await split[1].split(" ")[1].replace(/,/g, ""))
    let y = parseInt(await split[2].split(" ")[1].replace(/,/g, ""))
    let z = parseInt(await split[3].split(" ")[1].replace(/,/g, ""))

    return {x: x, y: y, z: z, world: world}
}

// Helper function to calculate Euclidean distance
function euclideanDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Function to cluster points, handling outliers and world grouping
function clusterPoints(points, threshold = 100) {
    const clusters = [];
    const visited = new Set();
    const outliers = [];

    // Flood-fill to form clusters
    function dfs(pointIndex, cluster, world) {
        visited.add(pointIndex);
        cluster.push(points[pointIndex]);

        for (let i = 0; i < points.length; i++) {
            if (
                !visited.has(i) &&
                points[i].world === world && // Ensure same world
                euclideanDistance(points[pointIndex], points[i]) < threshold
            ) {
                dfs(i, cluster, world);
            }
        }
    }

    for (let i = 0; i < points.length; i++) {
        if (!visited.has(i)) {
            const cluster = [];
            const world = points[i].world; // Get the world of the current point
            dfs(i, cluster, world);

            // If cluster size is greater than 1, it's a valid cluster; otherwise, it's an outlier
            if (cluster.length > 1) {
                clusters.push(cluster);
            } else {
                outliers.push(cluster[0]); // Add single-point cluster as outlier
            }
        }
    }

    return {
        clusters,
        outliers
    };
}





client.on("ready", async () => {
    //alert of servers
    console.log(`Logged in as ${client.user.tag}!`);
	console.log("Servers:")
    client.guilds.cache.forEach((guild) => {
        console.log(" - " + guild.name)
    });

    //intialize all slash commands
    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');


            await rest.put(
                Routes.applicationCommands(clientID),
                { body: commands },
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();
    cron.schedule('*/5 * * * * *', async() => {
        serverSettingsDatabase.forEach(async (serverData, index) => {
            if (serverData.activeUsers.length >= 2) {
                let players = [];
                
                await GameDig.query({
                    type: 'minecraft',
                    host: serverData.ip,
                    port: serverData.serverPort
                }).then(async (data) => {
                    let rcon = new Rcon({
                        host: serverData.ip, port: serverData.rconPort, password: serverData.rconPass
                    })

                    data.players.forEach((inputData) => {
                        if (inputData.name === undefined) return
                        players.push(inputData.name)
                    });
                    
                    if (data.players.length === 0) await client.channels.cache.get(serverData.logsID).send('There are no users on the server. Please connect to the minecraft server before using proximity chat!')
                    
                    try {
                        await rcon.connect()
                    } catch (error) {
                        console.log(error)
                        return await client.channels.cache.get(serverSettings.logsID).send(`\`ERROR:\` \`${error.syscall}\` Failed to connect to server/rcon. Please encourage an admin to check the configuration settings. Is the server offline?`)
                    }

                    async function contactRcon(cmd) {
                        try {
                            let output = await rcon.send(cmd)
                            return output;
                        } catch (error) {
                            console.log(error)
                            throw 'Command Error (Minecraft): Unable to contact server via rcon'
                        }
                    }
                    let activeUserData = [];
                    var serverDataUpdate = new Promise(async (resolve,reject) => {
                        let i = 0;
                        await serverData.activeUsers.forEach(async (userInVoice) => {
                            if (playerDatabase.has(userInVoice)) {
                                let playerData = await playerDatabase.get(userInVoice);
                                
                                if (!players.includes(playerData.username)) {
                                    let guild = client.guilds.cache.get(index)
                                    let user = await guild.members.fetch(userInVoice);
                                    user.voice.disconnect();
                                    return await client.channels.cache.get(serverData.logsID).send(`DISCONNECTING <@${userInVoice}> AS THEY ARE NOT CONNECTED TO THE SERVER.`)
                                } else {
                                    i++;
                                    let out = await contactRcon(`getPos ${playerData.username}`)
                                    let parsed = await parseXYZ(out)
                                    playerData.x = parsed.x
                                    playerData.y = parsed.y
                                    playerData.z = parsed.z
                                    playerData.world = parsed.world
                                    playerDatabase.set(userInVoice, playerData);

                                    playerData.id = userInVoice
                                    activeUserData.push(playerData);
                                    //console.log(activeUserData);

                                    //console.log(userInVoice,i)
                                    //console.log(i,activeUserData.length, i === activeUserData.length)
                                    if (i === activeUserData.length) return resolve();
                                }
                            } else {
                                let guild = client.guilds.cache.get(index)
                                let user = await guild.members.fetch(userInVoice);
                                user.voice.disconnect();
                                return await client.channels.cache.get(serverData.logsID).send(`DISCONNECTING <@${userInVoice}> AS THEY DO NOT HAVE AN ACCOUNT LINKED WHILE IN WAITING ROOM.`)
                            }
                        });
                    })
                    serverDataUpdate.then(() => {
                        let result = clusterPoints(activeUserData, serverData.connectionDistance);
                        //console.log(result);
                        //console.log(activeUserData);

                        if (result.clusters.length > serverData.proximityIDs.length) {
                            console.log('create a new voice chat here')
                        } else {
                            //rcon.end();
                            let guild = client.guilds.cache.get(index)
                            let waitingRoom = client.channels.cache.get(serverData.waitingRoomID)

                            result.clusters.forEach((cluster,i) => {
                                let proxChat = client.channels.cache.get(serverData.proximityIDs[i])
                                cluster.forEach(async (player) => {
                                    let user = await guild.members.fetch(player.id);
                                    if (user.voice.channel.id != serverData.proximityIDs[i]) {
                                        user.voice.setChannel(proxChat)
                                        console.log('moving user to proximity', player.id)
                                    }
                                });
                            });
                            result.outliers.forEach(async (player) => {
                                let user = await guild.members.fetch(player.id);
                                //console.log(player);
                                if (user.voice.channel.id != serverData.waitingRoomID) {
                                    user.voice.setChannel(waitingRoom)
                                    console.log('moving user to waiting room', player.id)
                                }
                            });
                            
                        }

                        result.clusters.forEach((cluster,index) => {
                            let string = '';
                            cluster.forEach(b => {
                                string = string + b.username + " "
                            });
                            console.log(`say ${string}are grouped`)
                        });
                    });
                }).catch((err) => {
                    console.log(err);
                    client.channels.cache.get(serverData.logsID).send("Unable to connect to server! Please encourage an admin to check the configuration settings. Is the server offline?")
                    return;
                })
            }
        })
    });
})

//TODO
//rewrite voice join area
//rewrite serverdata storage
//write voice channel handling



client.on('interactionCreate', async interaction => {
    //console.log(interaction.message.components[0].components[0].customId, interaction.customId)
    let interactionType;
	if (interaction.isCommand()) interactionType = "command";
    if (interaction.isButton()) interactionType = "button";

    switch (interactionType) {
        case "command":
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            let memberGuildID = interaction.member.guild.id;
            if (!serverSettingsDatabase.get(memberGuildID) & command.name != "setup") return interaction.reply({ content: "The administrator of your server has not finished setting me up! Encourage them to finish setting me up using `/setup!`" , ephemeral: true })
            
            

            try {
                await command.execute(interaction, serverSettingsDatabase, playerDatabase, Rcon, GameDig, levenshtein);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        break;
            
        default:
            return;
        break;
    }

    
});


client.on('voiceStateUpdate', async (oldState, newState) => {
    if (serverSettingsDatabase.has(newState.guild.id)) {
        if (newState.channel == null || (newState.channel.parent.id != serverSettingsDatabase.get(newState.guild.id).categoryID)) {
            if (oldState.channel != null) {
                if (oldState.channel.parent.id == serverSettingsDatabase.get(newState.guild.id).categoryID) {
                    //USER LEFT
                    console.log('user left prox chat', oldState.channelId);
                    let serverSettings = serverSettingsDatabase.get(newState.guild.id)

                    function removeAllInstances(array, valueToRemove) {
                        return array.filter(item => item !== valueToRemove);
                    }
                    serverSettings.activeUsers = removeAllInstances(serverSettings.activeUsers, newState.id)
                    

                    serverSettingsDatabase.set(newState.guild.id, serverSettings)
                }
            }
        } else {
            //USER JOINED
            if ((newState.channel.parent.id == serverSettingsDatabase.get(newState.guild.id).categoryID)) {
                if (oldState.channel != null) {
                    if (oldState.channel.parent.id == serverSettingsDatabase.get(newState.guild.id).categoryID) return;
                }
                console.log('user joined prox chat', newState.channelId);
                let serverSettings = serverSettingsDatabase.get(newState.guild.id)

                if (newState.channelId != serverSettings.waitingRoomID) return;
                if (!playerDatabase.has(newState.id)) {
                    await client.channels.cache.get(serverSettings.logsID).send(`DISCONNECTING <@${newState.id}> AS THEY DO NOT HAVE AN ACCOUNT LINKED WHILE IN WAITING ROOM.`)
                    newState.member.voice.disconnect();
                }


                serverSettings.activeUsers.push(newState.id)

                serverSettingsDatabase.set(newState.guild.id, serverSettings)
            }   
        }
    }
});


client.login(token);
