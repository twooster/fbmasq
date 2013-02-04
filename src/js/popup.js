
Util = {};

$.extend(Util, {
  noop : function() {},
  inherit : function(superClass, merge, constr) {
    var protoClass = function() {};
    protoClass.prototype = superClass.prototype;

    var prototype = new protoClass;

    var klass = constr || function() { superClass.apply(this, arguments); };
    klass.prototype = prototype;
    klass.prototype.constructor = klass;
    klass.superClass = superClass;
    klass.subclass = function(merge, constr) {
      return inherit(klass, merge, constr);
    }

    for (var k in (merge || {})) {
      if (typeof merge[k] === 'function' && typeof prototype[k] === 'function') {
        prototype[k] = (function(orig, override) {
          return function() {
            this.super = orig;
            override.apply(this, arguments);
            delete this.super;
          }
        })(prototype[k], merge[k]);
      } else {
        prototype[k] = merge[k];
      }
    }

    return klass;
  }
});


Masquerade = Masquerade || {};

(function(Masquerade, $, undefined) {
  function noop() {}

  function inherit(superClass, merge, constr) {
    var protoClass = function() {};
    protoClass.prototype = superClass.prototype;

    var prototype = new protoClass;

    var klass = constr || function() { superClass.apply(this, arguments); };
    klass.prototype = prototype;
    klass.prototype.constructor = klass;
    klass.superClass = superClass;
    klass.subclass = function(merge, constr) {
      return inherit(klass, merge, constr);
    }

    for (var k in (merge || {})) {
      if (typeof merge[k] === 'function' && typeof prototype[k] === 'function') {
        prototype[k] = (function(orig, override) {
          return function() {
            this.super = orig;
            override.apply(this, arguments);
            delete this.super;
          }
        })(prototype[k], merge[k]);
      } else {
        prototype[k] = merge[k];
      }
    }

    return klass;
  }

  var Base = inherit(Object, {
    extendOptions : function(opts) {
      for (var k in opts) {
        if (k in this) {
          this[k] = opts[k];
        }
      }
    },

    init : function(options) {
      this.extendOptions(options);
    },
  }, function() { this.init.apply(this, arguments); });

  var View = Base.subclass({
    init : function(el, options) {
      this.super.apply(this, options);

      this.el = el;
      this.$el = $(el);
    }
  });

  Masquerade.App = classy({
    appId: null,
    accessToken: null,
    testUsers: {},

    fetchTestUsers : function(success, error) {
      $.ajax({
        url: 'https://graph.facebook.com/' + this.appId + '/accounts/test-users?access_token=' + this.accessToken,
        success: $.proxy(function(data, status, xhr) {
          var testUsers = data.data;
          var uids = [];
          this.testUsers = {};
          for (var i = 0; i < testUsers.length; ++i) {
            this.testUsers[testUsers[i].id] = testUsers[i];
            uids.push(testUsers[i].id);
          }
          this.fetchUserInfo(uids, success, error);
        }, this),
        error: error,
        dataType: 'json',
      });
    },

    fetchUserInfo : function(uids, success, error) {
      var fql = 'SELECT uid, name, pic_small FROM user WHERE uid IN ('
        + uids.join(', ') + ')';
        $.ajax({
          url: 'https://graph.facebook.com/fql?q=' +
            encodeURIComponent(fql) +
            '&access_token=' + this.accessToken,
          success: $.proxy(function(data) {
            var users = data.data;
            for (var i = 0; i < users.length; i++) {
              $.extend(this.testUsers[users[i].uid], users[i]);
            }
            if (success)
              success();
          }, this),
          error: error,
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
          click: $.proxy(this.loginAsUser, this)
        });
        $ul.append(userLinkView.el);
        userLinkView.render();
      }
    },

    loadAndRender : function() {
      this.fetchTestUsers($.proxy(this.render, this), $.proxy(this.errorCallback, this));
    },

    errorCallback : function(xhr, errorType, error) {
      var msg = xhr.status + ' -- ' + xhr.statusText + ': ';
      if (errorType == 'error') {
        try {
          var err = JSON.parse(xhr.response).error;
          msg += err.type + '(' + err.code + '): ' + err.message;
        } catch (err) {
          msg += xhr.response;
        }
      } else {
        data += xhr.response;
      }
      this.$el.html('<div class="error"><h1>Error!</h1><p class="message"/><p>You may want to go to the <a href="options.html">options</a>.</p></div>');
      $('.message', this.$el).text(msg);
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

  Masquerade.UserListView = View.subclass({
    users : null,
    onClick : noop,

    init : function() {
      this.$el = $(this.el);
    },

    render : function() {
      var $ul = $('<ul class="users"></ul>');

      this.$el.empty().append($ul);

      if (this.users) {
        for (var i = 0, user; user = this.users[i]; ++i) {
          var userLinkView = new Masquerade.UserLinkView({
            el      : $('<li class="clearfix user"></li>'),
            uid     : user.uid,
            img     : user.pic_small,
            name    : user.name,
            onClick : this.onClick,
          });
          $ul.append(userLinkView.el);
          userLinkView.render();
        }
      }
    }
  });

  Masquerade.UserLinkView = View.subclass({
    name    : '',
    user    : null,
    onClick : noop,

    init : function(options) {
      this.$el = $(this.el);
      this.$el.on('click', 'a.name', $.proxy(function() {
        this.onClick(this.user);
      }, this));
    }

    render : function() {
      var img = '';
      if (this.img)
        img = '<img src="' + this.user.img + '" class="image"/>';
      var $a = $(img + '<a href="#" class="name">' + this.user.name + '</a>');
      this.$el.html($a);
    }
  });

})(Masquerade, $);

$(function() {
  window.app = new Masquerade.App({
    appId       : localStorage.appId,
    accessToken : localStorage.accessToken
  });
});
