window.Masquerade = (function($, undefined) {
    var Masquerade = {};

    function noop() {}

    Masquerade.App = function(options) {
        this.init(options);
    };

    Masquerade.UserLinkView = function(options) {
        this.init(options);
    };

    $.extend(Masquerade.UserLinkView.prototype, {
        name: '',
        el: null,
        uid: null,
        img: null,
        callback: noop,

        render : function() {
            var img = '';
            if (this.img)
                img = '<img src="' + this.img + '"/>';
            var $a = $('<a href="#">' + img + this.name + '</a>');
            this.$el.empty().append($a);
            $a.on('click', $.proxy(function() {
                    this.callback(this.uid)
                }, this)
            );
        },

        init : function(options) {
            $.extend(this, options);
            this.$el = $(this.el);
        }
    });

    $.extend(Masquerade.App.prototype, {
        appId: null,
        accessToken: null,
        userInfo: {},
        testUsers: [],
        testUsersById: {},

        loadSettings : function() {
            this.appId = localStorage.appId;
            this.accessToken = localStorage.accessToken;
        },

        retrieveTestUsersCallback : function(data, callback) {
            this.testUsers = data.data;
            this.testUsersById = {};
            for (var i = 0; i < this.testUsers.length; ++i) {
                this.testUsersById[this.testUsers[i].id] = this.testUsers[i];
            }
            this.updateCache(false, callback);
        },

        updateCache : function(force, callback) {
            var i, toRetrieve = [];
            for (i = 0; i < this.testUsers.length; ++i) {
                var testUser = this.testUsers[i];
                if (force || this.userInfo[testUser.id] == undefined)
                    toRetrieve.push(testUser.id);
            }
            if (toRetrieve) {
                this.retrieveUserInfo(toRetrieve, $.proxy(function(data) {
                    var users = data.data;
                    for (var i = 0; i < users.length; i++)
                        this.userInfo[users[i].uid] = users[i];
                    callback();
                }, this));
            } else {
                if (callback)
                    callback();
            }
        },

        retrieveTestUsers : function(callback) {
            $.ajax({
                url: 'https://graph.facebook.com/' + this.appId + '/accounts/test-users?access_token=' + this.accessToken,
                success: $.proxy(function(data, status, xhr) {
                    this.retrieveTestUsersCallback(data, callback);
                }, this),
                dataType: 'json',
            });
        },

        retrieveUserInfo : function(uids, callback) {
            var fql = 'SELECT uid, name, pic_small FROM user WHERE uid IN ('
                    + uids.join(', ') + ')';
            $.ajax({
                url: 'https://graph.facebook.com/fql?q=' + encodeURIComponent(fql) + '&access_token=' + this.accessToken,
                success: callback,
                dataType: 'json',
            });
        },

        loginAsUser : function(uid) {
            var loginUrl = this.testUsersById[uid].login_url;
            chrome.tabs.create({
                url: loginUrl,
            });
        },

        render : function() {
            this.$el.empty();
            for (var i = 0; i < this.testUsers.length; ++i) {
                var info = this.userInfo[this.testUsers[i].id];
                var userLinkView = new Masquerade.UserLinkView({
                    el: $('<div/>'),
                    uid: info.uid,
                    img: info.pic_small,
                    name: info.name,
                    callback: $.proxy(this.loginAsUser, this)
                });
                this.$el.append(userLinkView.el);
                userLinkView.render();
            }
        },

        loadAndRender : function() {
            this.$el.html('Loading...');
            this.retrieveTestUsers($.proxy(this.render, this));
        },

        init : function(options) {
            this.appId = options.appId;
            this.accessToken = options.accessToken;
            this.$el = $('#content');
            if (!this.appId || !this.accessToken) {
                this.$el.html('No app ID or token defined? Please go to options.');
            } else {
                this.loadAndRender();
            }
        },
    });

    return Masquerade;
})($);

$(function() {
    window.app = new Masquerade.App({
        appId: localStorage.appId, 
        accessToken: localStorage.accessToken
    });
});
