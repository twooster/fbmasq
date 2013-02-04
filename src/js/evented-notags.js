Evented = (function() {
  var EVENT_SPLIT = /\s+/

  var maxPubId = 0;

  return {
    on : function(events, callback, context) {
      if (typeof events !== 'string') {
        for (var k in events) {
          this.on(k, events[k], callback);
        }
      } else {
        var subscribers = (this._subscribers = this._subscribers || {}),
            events = events.split(EVENT_SPLIT);
        for (var i = 0; i < events.length; ++i) {
          var event = events[i];
          if (!event) throw 'Cannot subscribe to unnamed event';
          (subscribers[event] || (subscribers[event] = []))
            .push([callback, context || this]);
        }
      }
      return this;
    },

    once : function(events, callback, context) {
      if (typeof events !== 'string') {
        for (var k in events) {
          this.once(k, events[k], callback);
        }
      } else {
        var called = false;
        function wrapped() {
          if (!called) {
            called = true;
            callback.apply(this, arguments);
            this.off(events, wrapped, context);
          }
        };
        wrapped._callback = callback;
        return this.on(events, wrapped, context);
    }

    off : function(events, callback, context) {
      var subscribers = this._subscribers;
      if (subscribers) {
        if (events) {
          events = events.split(EVENT_SPLIT);
        } else {
          events = [];
          for (var event in subscribers) {
            events.push(event);
          }
        }

        for (var i = 0; i < events.length; ++i) {
          var event = events[i];
          if (Object.prototype.hasOwnProperty.call(subscribers, event)) {
            if (!callback && !context) {
              delete subscribers[event];
            } else {
              var subscriptions = subscribers[event];
              for (var j = subscriptions.length - 1; j >= 0; --j) {
                var subscription = subscriptions[j];
                if ((!context || context === subscription[1]) &&
                    (!callback || callback === subscription[0])) {
                  subscriptions.splice(j, 1);
                }
              }
            }
          }
        }
      }
      return this;
    },

    trigger : function(events) {
      var subscribers = this._subscribers;
      if (subscribers) {
        var args = [].slice.call(arguments, 1);

        if (typeof events !== 'string') {
          for (var event in events) {
            this.trigger.apply(this, [event, events[k]].concat(args));
          }
        } else {
          var all = subscribers.all;
          events = events.split(EVENT_SPLIT);

          for (var i = 0; i < events.length; ++i) {
            var event = events[i],
                subscriptions = this._subscribers[event];
            if (subscriptions) {
              for (var j = 0; j < subscriptions.length; ++j) {
                subscriptions[j][0].apply(subscriptions[j][1], args);
              }
            }
            if (all) {
              var allArgs = [event].concat(args);
              for (var j = 0; j < all.length; ++j) {
                all[j][0].apply(all[j][1], allArgs);
              }
            }
          }
        }
      }
      return this;
    },

    listenTo : function(other, events, callback) {
      var pubId = other._publisherId || (other._publisherId = ++maxPubId),
          publishers = this._publishers || (this._publishers = {});
      other.on(events, callback, this);
      publishers[pubId] = other;
      return this;
    },

    stopListening : function(other, events, callback) {
      var publishers = this._publishers;
      if (publishers) {
        if (other) {
          var pubId = other._publisherId;
          if (pubId && publishers[pubId]) {
            other.off(events, callback, this);
            if (!events && !callback) {
              delete publishers[pubId];
            }
          }
        } else {
          for (var pubId in publishers) {
            publishers[pubId].off(events, callback, this);
            if (!events && !callback) {
              delete publishers[pubId];
            }
          }
        }
      }
      return this;
    }
  };
})();
