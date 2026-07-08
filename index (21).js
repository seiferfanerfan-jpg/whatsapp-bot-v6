const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    delay,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const AUTH_DIR = 'auth_info';
const PASSWORD = '22Seif333';
const ADMIN_NUMBER = '201226599219';
const ADMIN_JID = ADMIN_NUMBER + '@s.whatsapp.net';

// Data storage
const userState = new Map();
const passwordAttempts = new Map();
const authenticatedUsers = new Set();
let dailyMessageCount = 0;
let sock;

// Insults Array
const insults = [
    "_*بدء الهجوم تي كي تاكه ع ابن المتناكه*_",
    "خد يبن أل شرمؤطة", "ؤلأ يأ هلفؤت رد أنت يألأ", "أشتمني انا حاسس بيك انت مكسسور",
    "ؤلأ أيدك في طيزك", "اه يالا انا قطعت ايدك", "خلاص متعيطش يالا", "حد يجيب لي ال عرص دة منديل",
    "انشف يا خول فين ايه", "امك صعبانه عليا اوي", "عماله تعيط ياض", "لا بجد صعبت عليا امك",
    "الولا دة حد ضربو يعيني 😍", "مش كان قصدي اكسرك", "انت هتعيط من زبي ولا ايه",
    "وديني انت صعبان عليا", "اتلاقيق بتشتمني في سايبر", "والراجل يقولك خلصت يحبيبي",
    "انت ال عبيط يالا صبي ال مجال اهو", "انت يبتاع الواتساب ولا يا واتساب يا معرص",
    "زوبري واقف عليك", "بوس زب بابا يخول", "مش هتبوس زوبر ال بابا يالا",
    "لما اكلمك مش تريح زي الحمير كده", "بوس رجلي يالا", "ي الا ي كسمك", "انا هخليك تلحسها",
    "انا بيني بشتمك وانا ماسك السجارة في ايديك وامك علي زبي",
    "انا بيني هدوس علي كرامتك دي جامد", "هخليك تنام تصحي تقول آلفلسـطـيني مخصمني",
    "انت يلا ي ابن العبيطة رد علي زبي", "انا هسحب منك لسانك", "انا مش هخليك تكلم تاني يلا",
    "امك صدرها كلو في بوقي يلا", "يا ديوث ي ابن المعرصة ي كلب البنات", "انا هنا آلفلســطــيني آلكآرف وبــس",
    "انت عيل ابن متناكة امك شرموطة ي حمار", "ي كس ي عبيط", "ي معرص ي عبيط", "ي شمام ي عبيط",
    "بوس رجلي. يخول", "ي ابن الاحبة ي عرص", "ي كلوت ي جربوع", "رد عليا ي زاني", "ي ابن الزواني",
    "امك شغاله في شقه دعاره ي ابن الحمارة", "ابوك بيروح يشتغل معاها ويمسك الفوطة",
    "انا معروف عني الافيونة وقناص الهلافيت ي هلفوت", "انا كلامي دا سيف", "انا هلعب بيك الكورة",
    "انا رشاش كلامي مبيفضاش", "ي ابن 100تناكة هات طيزك علي زبي", "وطي ياسطا مص في زبي",
    "او اقولك روح عيط لي الناس قولهم آلفلسـطـيني ضربني", "انت يلا ي ابن الشرموطة ي ابن المعرصة ي ابن المتناكة",
    "انت اكيد ابوك عويل", "انتحر ي ابن العبيطة", "تاخد منديل يالا", "خسارة فيك المنديل",
    "ي ابن اكبر لبوة في الشرق الاوسط", "هديك بالرجل زي الكلاب يي ابن الكلب", "بترفعو لس",
    "انت هتفضل طول عمرك بتخاف مني", "آلفلسـطـيني آلكآرف رعبك يا عويل", "انت ودين امي خول",
    "صح يابن ال شرموطة", "قول صح ياض ي غبي", "انا كبير ال بيت بتاعكو ياض ي خول",
    "ولا ياا غباوه رد", "ولا ي عرصجي ي ابن ال متناكة", "انا اب بفششخ كسومك علطول",
    "انا كبيركم ياض ي خول", "انا نهيتك يابني", "انا بدبح يالا ي فرفور", "اجيب بنت تشتم مكانك",
    "هتسيب ال شات فاضي كدة", "شوفت الفرق بنا يابني", "انت عمرك م ارتبط يسطا", "انا نهيتك كسسسسمك هنا"
];

async function startContinuousInsulting(senderJid, targetJid) {
    while (userState.get(senderJid)?.step === 'destroy_phone') {
        const insult = insults[Math.floor(Math.random() * insults.length)];
        await sock.sendMessage(targetJid, { text: insult });
        dailyMessageCount++;
        await delay(500);
    }
    await sock.sendMessage(senderJid, { text: `✅ انتهى القصف. الإجمالي: ${dailyMessageCount}` });
    userState.set(senderJid, { step: 'menu' });
}

async function startContinuousCustomMessage(senderJid, targetJid, message) {
    while (userState.get(senderJid)?.step === 'admin_attack_msg') {
        await sock.sendMessage(targetJid, { text: message });
        dailyMessageCount++;
        await delay(500);
    }
    await sock.sendMessage(senderJid, { text: `✅ توقف الإرسال المخصص.` });
    userState.set(senderJid, { step: 'menu' });
}

async function startBot() {
    console.log('💀 بوت [ المُتحكِّم ] قيد التشغيل...');
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: Browsers.macOS("Desktop"),
        qrTimeout: 600000,
        connectTimeoutMs: 60000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('📸 امسح الرمز للربط (الرمز سيبقى طويلاً):');
            qrcode.generate(qr, { small: false });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح!');
            await sock.sendMessage(ADMIN_JID, { text: 'تعالا نيك حد' });
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        console.log(`📩 [${jid}]: ${text}`);
        
        let state = userState.get(jid);

        // Session reset after 2 hours
        if (state?.lastSeen && (Date.now() - state.lastSeen > 2 * 60 * 60 * 1000)) {
            userState.delete(jid);
            authenticatedUsers.delete(jid);
            await sock.sendMessage(jid, { text: 'ده انا الي نكتلك الي فشخوك شتيمه ، تعالا اشكرني' });
            return;
        }
        userState.set(jid, { ...state, lastSeen: Date.now() });
        state = userState.get(jid);

        // Authentication
        if (!authenticatedUsers.has(jid)) {
            if (text === PASSWORD) {
                authenticatedUsers.add(jid);
                passwordAttempts.delete(jid);
                await sock.sendMessage(jid, { text: '╭─「 *مـرحـبـاً بـك فـي عـالـمـي الـمـظـلـم* 」\n│\n│ *أهـلاً بـك أيـهـا الـمـسـتـخـدم الـجـديـد،*\n│ *لـقـد تـم تـسـجـيـل دخـولـك بـنـجـاح.*\n│ *أرسـل "اوامر" لـتـتـلـقـى تـعـلـيـمـاتـي.* \n│\n╰─「 *بـوت الـدمـار الـشـامـل* 」' });
            } else if (text === 'انا آسف لــ عمي سيف') {
                passwordAttempts.delete(jid);
                await sock.sendMessage(jid, { text: 'تم إعادة تعيين محاولات كلمة المرور. أدخل كلمة المرور الصحيحة الآن.' });
            } else {
                let attempts = (passwordAttempts.get(jid) || 0) + 1;
                passwordAttempts.set(jid, attempts);
                let insult = `كسمك ${attempts === 1 ? 'مره' : attempts === 2 ? 'مرتين' : attempts + ' مرات'}`;
                await sock.sendMessage(jid, { text: insult });
                await sock.sendMessage(jid, { text: '⚠️ كلمة السر أيها العبد، وإلا فالهلاك مصيرك:' });
            }
            return;
        }

        // Commands
        if (text === 'اوامر' || text === 'الاوامر') {
            userState.set(jid, { ...state, step: 'menu' });
            await sock.sendMessage(jid, { text: '💀 قائمة الفناء 💀\n\n1 - إغراق الأرقام\n2 - هجوم مخصص\n3 - الحالة' });
            return;
        }

        if (state?.step === 'menu') {
            if (text === '1') {
                userState.set(jid, { ...state, step: 'destroy_phone' });
                await sock.sendMessage(jid, { text: '😈 أدخل رقم الضحية (بدون +):' });
            } else if (text === '2') {
                userState.set(jid, { ...state, step: 'admin_attack_phone' });
                await sock.sendMessage(jid, { text: '💀 أدخل الرقم المستهدف للهجوم المخصص:' });
            } else if (text === '3') {
                await sock.sendMessage(jid, { text: `🤖 البوت يعمل بنظام macOS.\nالرسائل المرسلة اليوم: ${dailyMessageCount}` });
            }
            return;
        }

        if (state?.step === 'destroy_phone') {
            const target = text.replace(/[^\d]/g, '') + '@s.whatsapp.net';
            await sock.sendMessage(jid, { text: '🚀 جاري القصف...' });
            startContinuousInsulting(jid, target);
            return;
        }

        if (state?.step === 'admin_attack_phone') {
            userState.set(jid, { ...state, step: 'admin_attack_msg', targetPhone: text.replace(/[^\d]/g, '') });
            await sock.sendMessage(jid, { text: 'أدخل نص الرسالة (أرسل "توقف" للإنهاء):' });
            return;
        }

        if (state?.step === 'admin_attack_msg') {
            if (text === 'توقف') {
                userState.set(jid, { ...state, step: 'menu' });
                await sock.sendMessage(jid, { text: '🛑 توقف الهجوم.' });
                return;
            }
            const target = state.targetPhone + '@s.whatsapp.net';
            startContinuousCustomMessage(jid, target, text);
            return;
        }

        // Default response
        if (!state?.step) {
            await sock.sendMessage(jid, { text: 'ولااااا ي غبااااااوه روح اتعلم ازاي اشغل البوت 🫩' });
        }
    });
}

startBot().catch(async err => {
    console.error(err);
    if (sock) await sock.sendMessage(ADMIN_JID, { text: 'حدث إنهيار مفاجئ ي بن الاحبه' });
    setTimeout(startBot, 5000);
});
