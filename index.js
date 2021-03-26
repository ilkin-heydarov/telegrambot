// Import modules
const TelegramBot = require('node-telegram-bot-api');
const MongoCollections = require('./lib/MongoCollections');
const { mongoBlacklist } = require('./api/schema/mongoBlacklist');
const { User } = require('./api/schema/user');
const filterReducer = require('./lib/filters').filterReducer;
const Command = require('./lib/commands');
const CommonFunctions = require('./lib/commonFunctions');
const token = process.env.BOT_TOKEN || require('./config').bot_token;
const database = require('./lib/db');
const api = require('./api/app');
api.serve();

const actionTypes = {
    command: 'COMMAND',
    deleteConfigMessage: 'DELETE_CONFIG_MESSAGE',
    deleteFilteredMessage: 'DELETE_FILTERED_MESAGE',
    groupConfiguratiuon: 'GROUP_CONFIGURATION',
    configWithNotEnoughtRights: 'TRYING_TO_CONFIGURE_GROUP_WITH_NOT_ENOUGHT_RIGHTS',
    tryingConfigureInPrivate: 'SENDING_CONFIG_PM',
    tryingConfigureNormalGroup: 'TRYING_TO_CONFIGURE_NORMAL_GROUP',
    setHello: 'SET_HELLO_MESSAGE',
    expiredConfigSession: 'CONFIG_SESSION_EXPIRED',
    start: 'START_COMMAND',
    help: 'HELP_COMMAND',
    hello: 'HELLO_MESSAGE',
    keyboardCallback: 'KEYBOARD_CALLBACK',
    restrictingSpammer: 'RESTRICTING_SPAMMER',
    log: 'VIEWING_LOG',
    whitelistView: 'VIEWING_WHITELIST',
    whitelistAdding: 'ADDING_LINKS_TO_WHITELIST',
    whitelistNoLinksProvided: 'NO_LINKS_PROVIDED_TO_WHITELIST',
    whitelistClear: 'CLEAR_WHITELIST',
    whitelistRemoveLinks: 'REMOVE_LINKS_FROM_WHITELIST',
    blacklistWordAdd:'ADDING_BLACKLIST_WORD',
    blacklistWordRemove:'REMOVED_BLACKLIST_WORD'
};

let options = {};
if (process.env.APP_URL) {
    console.log('using webhooks, ' + process.env.APP_URL);
    options = {
        webHook: {
            port: process.env.PORT
        }
    };
}
else {
    console.log('using longpoll');
    options = {
        polling: {
            autoStart: false
        }
    };
}

const bot = new TelegramBot(token, options);

const mongoCollections = new MongoCollections();

database.db(function (db) {
    mongoCollections.mongoGroups = db.collection('groups');
    mongoCollections.mongoMessages = db.collection('messagesLog');
    mongoCollections.mongoNowConfigatates = db.collection('nowConfigurates');
    mongoCollections.mongoActionLog = db.collection('actionLog');
    mongoCollections.mongoWarns = db.collection('warns');
    mongoCollections.mongoWhiteList = db.collection('mongoWhiteList');
    mongoCollections.mongoBlackList=db.collection('blackListWord');
    mongoCollections.mongoGroupMembers = db.collection('members');
    mongoCollections.User = db.collection('User');
    mongoCollections.mongoUserGroups = db.collection('userGroups');
    mongoCollections.mongoAllowedAdmins = db.collection('allowedAdmins');
    mongoCollections.mongoMessages.createIndex({ postedDate: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 }) //store messages for 60 days
        .then(async () => {
            let url = process.env.APP_URL;
            //me = await bot.getMe()
            if (url) {
                console.log('hookin');
                bot.setWebHook(`${url}/bot${token}`);
            } else {
                console.log('pollin');
                bot.startPolling();
            }
        });
    mongoCollections.mongoGroupMembers.createIndex({'userid': 1, 'groupId': 1}, {unique: true});
    mongoCollections.mongoUserGroups.createIndex({'user': 1, 'group.id': 1}, {unique: true});
});

const command = new Command(log, actionTypes, bot, mongoCollections);
const commonFunctions = new CommonFunctions(bot);

subscribeToBotEvents();

//check if user sends messages too frequently
async function checkIfSpam(msg) {
    let entry = { postedDate: { $gte: commonFunctions.secondsAgo(30) }, 'message.from.id': msg.from.id, 'message.chat.id': msg.chat.id };
    let count = await mongoCollections.mongoMessages.count(entry);

    if (count > 10)
        restrictSpammer(msg);
}

function log(eventType, payload) {
    mongoCollections.mongoActionLog.insertOne({ actionDate: new Date(), eventType, payload });
}

function restrictSpammer(msg) {
    log(actionTypes.restrictingSpammer, msg);
    bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => { });
}

//create and format hello message
function prepareHelloMessage(cfg, msg) {
    let message = '';
    const name = (msg.new_chat_participant.first_name || '' + ' ' + msg.new_chat_participant.last_name || '').trim() || msg.new_chat_participant.username;
    message = cfg.helloMsgString || `Thanks for joining the group '${msg.chat.title}', *$name*. Please follow the guidelines of the group and enjoy your time`;
    return message.replace('$name', name);
}


//check if message need to be deleted according on filters
async function tryFilterMessage(msg) {
    mongoCollections.mongoMessages.insertOne({ postedDate: new Date(), message: msg });
    let cfg = await mongoCollections.mongoGroups.findOne({ groupId: msg.chat.id }); // load group configuration
    if (cfg && cfg.helloMsg && msg.new_chat_member) {
        // Sends Hello messages to New Members
        log(actionTypes.hello, msg);
        let helloMsg = prepareHelloMessage(cfg, msg);
        let messageOptions = { parse_mode: 'markdown' };
        command.saveUserfromGroup(msg);        
        if (cfg && !cfg.joinedMsg) {
            messageOptions.reply_to_message_id = msg.message_id;
        }
        // check if we can send to User, if not then send to group. 
        bot.sendMessage(msg.new_chat_member.id, helloMsg, messageOptions).catch(() => { 
            bot.sendMessage(msg.chat.id, helloMsg, messageOptions);           
        });
        await mongoCollections.mongoGroupMembers.insertOne({
            userid: msg.new_chat_member.id,
            firstname: msg.new_chat_member.first_name,
            username:msg.new_chat_member.username,
            lastname: msg.new_chat_member.last_name,
            groupId: msg.chat.id,
            joinDate: new Date()
        });

    }

    if(cfg && msg.left_chat_member){
        // Delete Record when User exists
        await mongoCollections.mongoGroupMembers.findOneAndDelete({userid: msg.left_chat_member.id});
        // update user record 
        await User.update({userId:msg.left_chat_member.id},{ $pull:{groups:msg.chat.id}}); 
    }

    let admins = await commonFunctions.getChatAdmins(msg.chat); // get list of admins
    let blacklist = (await mongoBlacklist.findOne({groupId:msg.chat.id}) || { words : null });  // get blacklisted words
    if (filterReducer(msg, cfg, admins, blacklist.words)) {
        log(actionTypes.deleteFilteredMessage, msg);
        bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => { });
    }
    if (!commonFunctions.messageSenderIsAdmin(admins, msg))
        if (cfg.restrictSpam)
            checkIfSpam(msg);
}

//prepair bot to interact with users
function subscribeToBotEvents() {
    
    bot.onText(/\/start/, async function (msg) {
        await command.startCommand(msg);
    });

    bot.onText(/\/setting/, async function (msg) {
        await command.settingCommand(msg);
    });
    bot.onText(/^\/kick/, async (msg) => {
        await command.kickByReply(msg);
    });
    bot.onText(/\/ban/, async (msg) => {
        await command.banByReply(msg);
    });
    bot.onText(/\/warn/, async (msg) => {
        await command.warnCommand(msg);
    });
    bot.onText(/^\/blacklist(\s(.*))?$/, async (msg, match) => {
        await command.blacklistCommand(msg, match);
    });
    bot.onText(/\/unwarn/, async (msg) => {
        await command.unwarnCommand(msg);
    });
    bot.onText(/^\/set_hello(\s(.*))?$/, async (msg, match) => {
        await command.setHelloCommand(msg, match);
    });
    // Bot reaction on commands "/start"
    bot.onText(/\/bossbot/, function (msg) {
        command.startCommand(msg);
    });
    bot.onText(/\/log/, async function (msg) {
        await command.logCommand(msg);
    });
    bot.onText(
        /(\/whitelist|\/wl)(\s.*)?$/,
        (msg, match) => command.whiteList(msg, match[2])
    );
    bot.onText(
        /(\/unwhitelist|\/unwl)(\s.*)?$/,
        (msg, match) => command.unWhiteList(msg, match[2])
    );
    // Bot reaction on commands "/help"
    bot.onText(/\/help/, function (msg) {
        command.helpCommand(msg);
    });
    bot.onText(/^\/max_length(\s(.*))?$/, async (msg, match) => {
        command.maxLengthCommand(msg, match[2]);
    });
    bot.onText(/\/access/, function(msg){
        command.accessCommand(msg);
    });
    
    // Bot reaction on any message
    bot.on('message', async (msg) => {
        if (msg.chat.type !== 'supergroup')
            return; //we can delete messages only from supergroups
        await tryFilterMessage(msg);
    });
    // Buttons responce in menu
    bot.on('callback_query', async (query) => {
        await command.menuCallback(query);
    });
}
