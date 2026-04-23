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
const registeredUsers = new Map();
let totalUsersCount = 0;
let dailyMessageCount = 0;
let lastResetDate = new Date().toDateString();
let botActive = true;
const userState = new Map();
const passwordAttempts = new Map();
const authenticatedUsers = new Set();

const insults = [
    "يا بقالة حياتك", "انت مسخرة اقسم بالله", "لما اكلمك مش تريح زي الحمير كده",
    "بوس رجلي يالا", "انا هخليك تلحسها هههههههههههههههههههههههههههههه",
    "انزل علي رجلك ي خول", "وابلع ريقكك الاول", "ي ابن الفاجرة", "ي حبيب زبي انت",
    "نفسي ترد شرفك يالا", "انا هسحب منك لسانك", "انا مش هخليك تكلم تاني يلا",
    "ارمي اختك تحت بضاني", "امك صدرها كلو في بوقي يلا", "يا ديوث ي ابن المعرصة",
    "انا هنا آلفلســطــيني آلكآرف وبــس", "انت مكروف ي ابن اللبوة", "انت اهبل وعيبط",
    "انت عيل ابن متناكة امك شرموطة", "انت كلب مطيع", "خليك كلب يالا", "بوس رجلي يخول",
    "انا معدوم الرحمه يلا", "انا معروف عني الافيونة وقناص الهلافيت",
    "انا ال بااااشاا با خروف", "انت ال خروف ياض ي كلب", "وطي ياسطا مص في زبي",
    "انا الاسطورة يلا مش هقولك تاني", "انت يلا اشرف واحده في عليه كسمك",
    "المجال دا لي البشوات بس", "انت بالمنظر دا تروح تموت نفسك",
    "ي ابن اكبر لبوة في الشرق الاوسط", "انا هشوط ككسمك يلا",
    "انا ال بعلمك ال ادب علطول", "انا كبيركم ياض ي خول", "انا نهيتك يابني",
    "انا خلصت عليك", "انا دبحتك وللهي", "انا بدبح يالا ي فرفور"
];

async function startBot() {
    console.log('💀 جاري تشغيل النسخة الاحترافية V6...');
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`استخدام نسخة Baileys v${version.join('.')}, أحدث نسخة: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // We will handle it manually for better visibility
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.clear();
            console.log('📸 امسح الـ QR الآن باستخدام واتساب:');
            qrcode.generate(qr, { small: true });
            console.log('\n💡 نصيحة: إذا كان الرمز كبيراً جداً، قم بتصغير الشاشة (Zoom Out) في Termux.');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            console.log('اتصال مغلق بسبب ', lastDisconnect.error, ', جاري إعادة الاتصال: ', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const lowerText = text.toLowerCase();
        const state = userState.get(jid);

        // Reset daily count
        const today = new Date().toDateString();
        if (today !== lastResetDate) {
            dailyMessageCount = 0;
            lastResetDate = today;
        }

        // Authentication Logic
        if (!authenticatedUsers.has(jid)) {
            if (text === PASSWORD) {
                authenticatedUsers.add(jid);
                if (!registeredUsers.has(jid)) {
                    registeredUsers.set(jid, { id: ++totalUsersCount, joinOrder: totalUsersCount, freeRequests: 5, isBanned: false, banEndTime: null });
                }
                await sock.sendMessage(jid, { text: '✅ تم تسجيل الدخول بنجاح! أرسل "اوامر" لعرض القائمة.' });
                passwordAttempts.delete(jid);
            } else {
                let attempts = (passwordAttempts.get(jid) || 0) + 1;
                passwordAttempts.set(jid, attempts);
                if (attempts >= 3) {
                    await sock.sendMessage(jid, { text: '❌ محاولات خاطئة كثيرة. تم حظرك مؤقتاً.' });
                } else {
                    await sock.sendMessage(jid, { text: `⚠️ كلمة المرور خاطئة. المحاولة (${attempts}/3).` });
                }
            }
            return;
        }

        // Check Ban
        const user = registeredUsers.get(jid);
        if (user?.isBanned) {
            if (user.banEndTime && Date.now() > user.banEndTime) {
                user.isBanned = false;
                user.banEndTime = null;
            } else {
                await sock.sendMessage(jid, { text: '🚫 أنت محظور من استخدام البوت.' });
                return;
            }
        }

        if (!botActive && jid !== ADMIN_JID) return;

        // Commands
        if (text === 'اوامر' || text === 'الاوامر' || text === 'menu') {
            let menu = `💀 قائمة الأوامر 💀\n\n`;
            menu += `1 - إرسال رسالة لرقم\n`;
            menu += `2 - المطور\n`;
            menu += `3 - ميزة تدمير الأخصام (طلباتك: ${user.freeRequests})\n`;
            menu += `4 - تحويل ميديا (صورة/ملصق)\n`;
            
            if (jid === ADMIN_JID) {
                menu += `\n👑 قائمة الإدمن 👑\n`;
                menu += `5 - حظر مستخدم\n`;
                menu += `6 - هجوم لانهائي\n`;
                menu += `7 - إحصائيات الرسائل\n`;
                menu += `8 - تفعيل/تعطيل البوت\n`;
            }
            
            userState.set(jid, { step: 'menu' });
            await sock.sendMessage(jid, { text: menu });
            return;
        }

        // Handle Steps
        if (state?.step === 'menu') {
            if (text === '1') {
                userState.set(jid, { step: 'send_msg_phone' });
                await sock.sendMessage(jid, { text: 'أدخل الرقم المستهدف (مثال: 201234567890):' });
            } else if (text === '2') {
                await sock.sendMessage(jid, { text: 'تواصل مع المطور: seiferfanerfan@gmail.com' });
            } else if (text === '3') {
                if (user.freeRequests > 0) {
                    userState.set(jid, { step: 'destroy_phone' });
                    await sock.sendMessage(jid, { text: '😈 أدخل رقم الضحية لتدميرها:' });
                } else {
                    await sock.sendMessage(jid, { text: '❌ استنفدت طلباتك المجانية.' });
                }
            } else if (text === '4') {
                userState.set(jid, { step: 'media_type' });
                await sock.sendMessage(jid, { text: 'اختر: (صورة) أو (ملصق)' });
            } else if (jid === ADMIN_JID) {
                if (text === '5') {
                    userState.set(jid, { step: 'admin_ban_menu' });
                    await sock.sendMessage(jid, { text: '1- حظر نهائي\n2- حظر مؤقت\n3- إلغاء حظر' });
                } else if (text === '6') {
                    userState.set(jid, { step: 'admin_attack_phone' });
                    await sock.sendMessage(jid, { text: 'أدخل الرقم المستهدف للهجوم اللانهائي:' });
                } else if (text === '7') {
                    await sock.sendMessage(jid, { text: `📊 إحصائيات اليوم:\nالرسائل المرسلة: ${dailyMessageCount}\nالمستخدمين: ${totalUsersCount}` });
                } else if (text === '8') {
                    botActive = !botActive;
                    await sock.sendMessage(jid, { text: `🤖 تم ${botActive ? 'تفعيل' : 'تعطيل'} البوت بنجاح.` });
                }
            }
            return;
        }

        // Admin Ban Logic
        if (state?.step === 'admin_ban_menu') {
            if (text === '1') {
                userState.set(jid, { step: 'admin_ban_perm' });
                await sock.sendMessage(jid, { text: 'أدخل الرقم للحظر النهائي:' });
            } else if (text === '2') {
                userState.set(jid, { step: 'admin_ban_hours_phone' });
                await sock.sendMessage(jid, { text: 'أدخل الرقم للحظر المؤقت:' });
            } else if (text === '3') {
                userState.set(jid, { step: 'admin_unban' });
                await sock.sendMessage(jid, { text: 'أدخل الرقم لإلغاء الحظر:' });
            }
            return;
        }

        if (state?.step === 'admin_ban_perm') {
            const phone = text.replace(/[^\d]/g, '');
            const target = phone + '@s.whatsapp.net';
            let u = registeredUsers.get(target) || { id: ++totalUsersCount, joinOrder: totalUsersCount, freeRequests: 0 };
            u.isBanned = true;
            registeredUsers.set(target, u);
            await sock.sendMessage(jid, { text: `✅ تم حظر ${phone} نهائياً.` });
            userState.set(jid, { step: 'menu' });
            return;
        }

        if (state?.step === 'admin_unban') {
            const phone = text.replace(/[^\d]/g, '');
            const target = phone + '@s.whatsapp.net';
            let u = registeredUsers.get(target);
            if (u) {
                u.isBanned = false;
                u.banEndTime = null;
                registeredUsers.set(target, u);
                await sock.sendMessage(jid, { text: `✅ تم إلغاء حظر ${phone}.` });
            } else {
                await sock.sendMessage(jid, { text: '❌ الرقم غير مسجل.' });
            }
            userState.set(jid, { step: 'menu' });
            return;
        }

        // Attack Logic
        if (state?.step === 'destroy_phone') {
            const targetPhone = text.replace(/[^\d]/g, '');
            const targetJid = targetPhone + '@s.whatsapp.net';
            user.freeRequests--;
            await sock.sendMessage(jid, { text: `🚀 بدأ تدمير ${targetPhone}...` });
            
            for (let i = 0; i < 20; i++) {
                const insult = insults[Math.floor(Math.random() * insults.length)];
                await sock.sendMessage(targetJid, { text: insult });
                await delay(1000);
            }
            
            await sock.sendMessage(jid, { text: `✅ انتهى الهجوم على ${targetPhone}.` });
            userState.set(jid, { step: 'menu' });
            return;
        }

        if (state?.step === 'admin_attack_phone') {
            userState.set(jid, { step: 'admin_attack_msg', targetPhone: text.replace(/[^\d]/g, '') });
            await sock.sendMessage(jid, { text: 'أدخل الرسالة للهجوم اللانهائي (أرسل "وقف" للإنهاء):' });
            return;
        }

        if (state?.step === 'admin_attack_msg') {
            if (text === 'وقف') {
                userState.set(jid, { step: 'menu' });
                await sock.sendMessage(jid, { text: '🛑 تم إيقاف الهجوم.' });
                return;
            }
            const targetJid = state.targetPhone + '@s.whatsapp.net';
            await sock.sendMessage(jid, { text: '💀 بدأ الهجوم اللانهائي... أرسل "وقف" لإيقافه.' });
            
            // Note: In a real environment, you'd want a way to break this loop
            // For this implementation, we'll just start it.
            while (userState.get(jid)?.step === 'admin_attack_msg') {
                await sock.sendMessage(targetJid, { text: text });
                dailyMessageCount++;
                await delay(2000);
            }
            return;
        }
    });
}

startBot().catch(err => console.error('خطأ في تشغيل البوت:', err));
