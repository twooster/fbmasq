Evented = (function() {
  var hop = Object.prototype.hasOwnProperty;

  /* General architecture:
   * Objects are classified into two categories:
   *  - Publishers, that can emit/trigger events
   *  - Subscribers, which are objects that maintain a list of active
   *    subscriptions
   *
   * Publishers have a single attribute, `_subscribers` that maintains a list
   * of event listeners of the form:
   *  {
   *    event_type: [
   *      [ callback, context, tags, listener, one_shot ], ...
   *    ], ...
   *  }
   *
   * Where each of those settings is described by:
   *  - callback: the callback function to be invoked
   *  - context:  the `this` context through with the callback will be invoked;
   *              if null, the triggering object will be the context
   *  - tags:     an array (may be null or empty) of "tags" that can be used to
   *              indicate the "type" of a given subscription record
   *  - listener: the listener, if any, that "owns" this record from a
   *              listening perpsective
   *  - one_shot: whether this event should be deleted after it is fired
   *
   * Subscribers have a single attribute, `_publishers` that
   * is quite simply a hash in the form:
   *
   *
   * {
   *   evented_object: count_of_subscriptions, ...
   * }
   *
   * The count of subscriptions is maintained to be in sync with the associated
   * `_subscribers` structure. Note that this can lead to potential memory
   * leaks, so one should be careful with the use of `listenTo`.
   */

  var EVENT_SPLIT = /\s+/
  var maxPubId = 0;

  var iterateEvents = function(eventString, callback) {
    // Parse an event string into event/tag pairs and call a fn over those
    // pairs
    var events = eventString.split(EVENT_SPLIT);
    for (var i = 0; i < events.length; ++i) {
      if (events[i]) {
        var spec = events[i].split(/[:.]/),
            tags = spec.length > 1 ? spec.slice(1) : null;
        callback(spec[0], tags);
      }
    }
  };

  var addSubscriptions = function(publisher, events, callback,
                                  context, listener, oneShot) {
    var subscribers = (publisher._subscribers = publisher._subscribers || {});
    iterateEvents(events, function(event, tags) {
      if (!event) {
        throw 'Cannot subscribe to unnamed event';
      }
      var subscription = [callback, context, tags, listener, oneShot];
      (subscribers[event] = subscribers[event] || []).push(subscription);
      if (listener) {
        var publishers = listener._publishers || (listener._publishers = {});
        var pubId = publisher._publisherId || ++maxPubId;
        publishers[pubId] = (publishers[pubId] || 0) + 1;
      }
    });
  }

  var removeSubscriptions = function(publisher, events, callback,
                                     context, listener) {
    var subscribers = publisher._subscribers;
    if (!subscribers) {
      return;
    }
    if (!events) {
      for (var event in subscribers) {
        removeMatching(publisher, event, null, callback, context, listener);
      }
    } else {
      iterateEvents(events, function(event, tags) {
        if (!event) {
          for (var event in subscribers) {
            removeMatching(publisher, event, tags, callback, context, listener);
          }
        } else {
          if (hop.call(subscribers, event)) {
            removeMatching(publisher, event, tags, callback, context, listener);
          }
        }
      });
    }
  };

  var removeMatching = function(publisher, event, tags,
                                callback, context, listener) {
    var subscribers = publisher._subscribers[event],
        publishers, pubId;

    if (listener) {
      publishers = listener._publishers;
      pubId = publisher._publisherId;
    }

    // Iterate backwards so that we can (hopefully) more cheaply
    // remove matching events
    for (var i = subscribers.length - 1; i >= 0; --i) {
      var subscription = subscribers[i],
          tagsMatch;

      if (tags) {
        if (subscription[2]) {
          for (var j = 0; j < tags.length; ++j) {
            if (subscription[2].indexOf(tags[j]) !== -1) {
              break;
            }
          }
          tagsMatch = j < tags.length;
        } else {
          tagsMatch = false;
        }
      } else {
        tagsMatch = true;
      }

      if (tagsMatch &&
          (!callback || callback === subscription[0]) &&
          (!context  || context  === subscription[1]) &&
          (!listener || listener === subscription[3])) {
        subscribers.splice(i, 1);
        if (publishers) {
          --publishers[pubId];
        }
      }
    }
    if (!subscribers) {
      delete subscribers[event];
    }
    if (publishers && publishers[pubId] === 0) {
      delete publishers[pubId];
    }
  };

  var emitEvent = function(publisher, event, args) {
    if (publisher._subscribers) {
      if (hop.call(publisher._subscribers, event)) {
        var subscribers = publisher._subscribers[event];
        for (var i = subscribers.length - 1; i >= 0; --i) {
          var subscription = subscribers[i];
          // Trigger the event
          subscription[0].apply((subscription[1] || publisher), args);

          if (subscription[4]) { // oneShot
            var listener = subscription[3];

            if (listener) {
              if (listener._publishers[publisher] > 1) {
                listener._publishers[publisher]--;
              } else {
                delete listener._publishers[publisher];
              }
            }

            subscribers.splice(i, 1);
          }
        }
        if (!subscribers) {
          delete publisher._subscribers[event];
        }
      }
    }
  };

  var multiAddSubscriptions = function(publisher, events, callback,
                                       context, listener, oneShot) {
    if (typeof events === 'string') {
      addSubscriptions(publisher, events, callback, context, listener, oneShot);
    } else { // hash
      context = callback;
      for (var event in events) {
        addSubscriptions(publisher, event, events[event],
                         context, listener, oneShot);
      }
    }
  };

  return {
    on : function(events, callback, context) {
      multiAddSubscriptions(this, events, callback, context, null, false);
      return this;
    },

    once : function(events, callback, context) {
      multiAddSubscriptions(this, events, callback, context, null, true);
      return this;
    },

    off : function(events, callback, context) {
      removeSubscriptions(this, events, callback, context);
      return this;
    },

    trigger : function(events) {
      var args = [].slice.call(arguments, 1),
          events = (typeof events === 'string' ? events.split(EVENT_SPLIT) : events);
      for (var i = 0; i < events.length; ++i) {
        var event = events[i];
        if (event === 'all') {
          throw 'Cannot manually trigger an "all" event';
        }
        emitEvent(this, event, args);
        emitEvent(this, 'all', [event].concat(args));
      }
      return this;
    },

    listenTo : function(other, events, callback, context) {
      multiAddSubscriptions(other, events, callback, context, this, false);
      return this;
    },

    stopListening : function(other, events, callback) {
      if (this._publishers) {
        if (!other) {
          for (other in this._publishers) {
            removeSubscriptions(other, events, callback, null, this);
          }
        } else {
          removeSubscriptions(other, events, callback, null, this);
        }
      }
      return this;
    }
  };
})();
