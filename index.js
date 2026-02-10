const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const pino = require("pino")

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth_info")

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Render Bot", "Chrome", "1.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    // ✅ CONNECTION EVENTS
    sock.ev.on("connection.update", async (update) => {

        const { connection, lastDisconnect } = update

        if(connection === "close"){

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            console.log("Disconnected. Reconnecting:", shouldReconnect)

            if(shouldReconnect){
                startBot()
            }
        }

        if(connection === "open"){
            console.log("✅ BOT CONNECTED!")
        }
    })

    // ✅ GENERATE PAIRING CODE
    if(!sock.authState.creds.registered){

        const phoneNumber = "234XXXXXXXXXX" 
        // ⚠️ Use country code. Example Nigeria: 2348012345678

        const code = await sock.requestPairingCode(phoneNumber)

        console.log(`
🔥 YOUR PAIRING CODE: ${code}

Open WhatsApp → Linked Devices → Link with phone number
Enter the code.
        `)
    }

    // ✅ SIMPLE MESSAGE HANDLER
    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0]

        if(!msg.message || msg.key.fromMe) return

        const sender = msg.key.remoteJid

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text

        if(!text) return

        const cmd = text.toLowerCase()

        if(cmd === "ping"){
            await sock.sendMessage(sender, { text: "🏓 Pong!" })
        }

        else if(cmd === "menu"){
            await sock.sendMessage(sender, {
                text:
`🤖 BOT MENU

ping - check bot
menu - commands`
            })
        }

        else{
            await sock.sendMessage(sender,{
                text:"Type *menu* to see commands 🙂"
            })
        }
    })
}

startBot()
