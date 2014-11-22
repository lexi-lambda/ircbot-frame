var irc = require("irc");

exports.connect = connect;

function connect(settings) {
    var configuration = {
        server: settings.server || "localhost",
        name: settings.name || "nodeircbot",
        userName: settings.userName || settings.name || "nodeircbot",
        realName: settings.realName || settings.name || "nodeircbot",
        channels: settings.channels || [settings.channel] || [],
    };
    var _bot = new irc.Client(configuration.server, configuration.name, configuration);

    return (function () {

        var bot = _bot;

        var actionHandlers = [];
        var chatHandlers = [];
        var triggerHandlers = [];
        var messageHandlers = [];
        var selfHandlers = [];
        var selfActionHandlers = [];

        var handle = {

            triggers: settings.triggers || [settings.trigger] || [],
            pmtrigger: settings.pmtrigger === false ? false : (settings.pmtrigger || true),

            say: function (message, channels) {
                if (!channels) {
                    channels = configuration.channels;
                } else if (!Array.isArray(channels)) {
                    channels = [channels];
                }

                var action = false;
                if (message.indexOf("/me ") === 0) {
                    action = true;
                    message = message.substring(4);
                }

                channels.forEach(function (el) {
                    if (action) {
                        bot.action(el, message);
                        selfActionHandlers.forEach(function (el) { el({
                            text: message,
                        }); });
                    } else {
                        bot.say(el, message);
                        selfHandlers.forEach(function (el) { el({
                            text: message,
                        }); });
                    }
                });
            },

            action: function (callback) { actionHandlers.push(callback); return this; },
            chat: function (callback) { chatHandlers.push(callback); return this; },
            trigger: function (callback) { triggerHandlers.push(callback); return this; },
            message: function (callback) { messageHandlers.push(callback); return this; },
            self: function (callback) { selfHandlers.push(callback); return this; },
            selfAction: function (callback) { selfActionHandlers.push(callback); return this; },

            join: function (callback) {
                bot.addListener("join", function (channel, nick, message) {
                    callback({ channel: channel, nick: nick, raw: message });
                });
                return this;
            },

            part: function (callback) {
                bot.addListener("part", function (channel, nick, reason, message) {
                    callback({ channel: channel, nick: nick, reason: reason, raw: message });
                });
                return this;
            },

            quit: function (callback) {
                bot.addListener("quit", function (nick, reason, channels, message) {
                    callback({ channels: channels, nick: nick, reason: reason, raw: message });
                });
                return this;
            },

            kick: function (callback) {
                bot.addListener("kick", function (channel, nick, by, reason, message) {
                    callback({ channel: channel, nick: nick, by: by, reason: reason, raw: message });
                });
                return this;
            },

            kill: function (callback) {
                bot.addListener("kill", function (nick, reason, channels, message) {
                    callback({ channels: channels, nick: nick, reason: reason, raw: message });
                });
                return this;
            },

            nick: function (callback) {
                bot.addListener("nick", function (oldnick, newnick, channels, message) {
                    callback({ oldnick: oldnick, newnick: newnick, channels: channels, raw: message });
                });
                return this;
            },

            whois: function (nick, callback) {
                bot.whois(nick, callback);
            }

        };


        function isChannel(recipient) {
            return recipient[0] === "#";
        }

        function respond(sender, recipient, response) {
            bot.say(isChannel(recipient) ? recipient : sender, response);
            if (isChannel(recipient))
                selfHandlers.forEach(function (el) { el({
                    text: response,
                }); });
        }

        // handle action messages
        bot.addListener("ctcp-privmsg", function (from, to, text, message) {
            if (text.indexOf("ACTION") === 0) {
                function callback(cb) {
                    cb({
                        sender: from, recipient: to, text: text.substr(7), raw: message,
                        type: "action",
                    }, function (response) { respond(from, to, response); });
                }
                // call all message handlers
                messageHandlers.forEach(function (el) { callback(el); });
                // call all action handlers
                actionHandlers.forEach(function (el) { callback(el); });
            }
        });

        // handle chat messages
        bot.addListener("message", function (from, to, text, message) {
            function callback(cb, override) {
                cb({
                    sender: from, recipient: to, text: override != null ? override : text, raw: message,
                    type: "chat",
                    private: !isChannel(to),
                }, function (response) { respond(from, to, response); });
            }
            // call all message handlers
            messageHandlers.forEach(function (el) { callback(el); });
            // call all chat handlers
            chatHandlers.forEach(function (el) { callback(el); });
            // call trigger handlers if necessary
            var triggered = false;
            var args = text.split(" ");
            var trigger = args[0];
            var reconstructed = args.slice(1).join(" ");
            for (var i = 0; i < handle.triggers.length; i++) {
                if (handle.triggers[i] === trigger) {
                    triggerHandlers.forEach(function (el) { callback(el, reconstructed); });
                    triggered = true;
                    break;
                }
            }
            if (!triggered && handle.pmtrigger && !isChannel(to)) {
                triggered = true;
                triggerHandlers.forEach(function (el) { callback(el); });
            }
        });

        return handle;

    })();
}
