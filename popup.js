window.Masquerade = (function($, undefined) {
    var Masquerade = {};

    function noop() {}

    Masquerade.App = function(options) {
        this.init(options);
    };


    $.extend(Masquerade.App.prototype, {
        appId: null,
        accessToken: null,
        testUsers: {},

        loadSettings : function() {
            this.appId = localStorage.appId;
            this.accessToken = localStorage.accessToken;
        },

        updateCache : function(force, callback) {
            var i, toRetrieve = [];
            for (var id in this.testUsers) {
                var testUser = this.testUsers[id];
                if (force || testUser.name == undefined) {
                    toRetrieve.push(id);
                }
            }
            if (toRetrieve) {
                this.retrieveUserInfo(toRetrieve, $.proxy(function(data) {
                    var users = data.data;
                    for (var i = 0; i < users.length; i++) {
                        $.extend(this.testUsers[users[i].uid], users[i]);
                    }
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
                    var testUsers = data.data;
                    this.testUsers = {};
                    for (var i = 0; i < testUsers.length; ++i) {
                        this.testUsers[testUsers[i].id] = testUsers[i];
                    }
                    this.updateCache(false, callback);
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
            var loginUrl = this.testUsers[uid].login_url;
            chrome.tabs.create({
                url: loginUrl,
                active: false,
            });
        },

        render : function() {
            var $ul;
            this.$el.empty();
            $ul = $('<ul class="users"></ul>');
            this.$el.append($ul);
            for (var id in this.testUsers) {
                var info = this.testUsers[id];
                var userLinkView = new Masquerade.UserLinkView({
                    el: $('<li class="clearfix user"></li>'),
                    uid: info.uid,
                    img: info.pic_small,
                    name: info.name,
                    callback: $.proxy(this.loginAsUser, this)
                });
                console.log(userLinkView.el);
                $ul.append(userLinkView.el);
                userLinkView.render();
            }
        },

        loadAndRender : function() {
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
                img = '<img src="' + this.img + '" class="image"/>';
            var $a = $(img + '<a href="#" class="name">' + this.name + '</a>');
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
    
    return Masquerade;
})($);

$(function() {
    //return;
    window.app = new Masquerade.App({
        appId: localStorage.appId, 
        accessToken: localStorage.accessToken
    });
});
