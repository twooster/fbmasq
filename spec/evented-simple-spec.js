describe('Evented' , function() {
  var ProtoEvented = function() {};

  for (var name in Evented) {
    ProtoEvented.prototype[name] = Evented[name];
  }

  var emitter,
      createCallback = function() {
        function fn() {
          fn.called  = true;
          fn.context = this;
          fn.args    = [].slice.call(arguments);
        }
        fn.called  = false;
        fn.context = null;
        fn.args    = null;
        return fn;
      };

  beforeEach(function() {
    emitter = new ProtoEvented();
  });

  describe('when a single event is subscribed to', function() {
    var single;

    beforeEach(function() {
      single = createCallback();
      emitter.on('event1', single);
    });

    it('calls the callback', function() {
      emitter.trigger('event1');
      expect(single.called).toBe(true);
    });

    it('calls the callback with a context of the emitter', function() {
      emitter.trigger('event1');
      expect(single.context).toBe(emitter);
    });

    it('calls the callback with no arguments', function() {
      emitter.trigger('event1');
      expect(single.args).toEqual([]);
    });

    it('calls the callback with arguments', function() {
      emitter.trigger('event1', 0, 1, 2);
      expect(single.args).toEqual([0, 1, 2]);
    });

    describe('when unsubscribing', function() {
      it('can be unsubscribed from by type', function() {
        emitter.off('event1');
        emitter.trigger('event1');
        expect(single.called).toBe(false);
      });

      it('can be unsubscribed from by callback', function() {
        emitter.off(null, single);
        emitter.trigger('event1');
        expect(single.called).toBe(false);
      });

      it('can be unsubscribed to in aggregate', function() {
        emitter.off();
        emitter.trigger('event1');
        expect(single.called).toBe(false);
      });
    });

    describe('when unsubscribing others', function() {
      it('is not affected by other types', function() {
        emitter.off('event2');
        emitter.trigger('event1');
        expect(single.called).toBe(true);
      });

      it('is not affected by other callbacks', function() {
        emitter.off(null, function(){});
        emitter.trigger('event1');
        expect(single.called).toBe(true);
      });
    });
  });

  describe('a single event with a context is subscribed to', function() {
    var single, ctx = {};
    beforeEach(function() {
      single = createCallback();
      emitter.on('event1', single, ctx);
    });

    it('calls the callback with the right context', function()  {
      emitter.trigger('event1');
      expect(single.context).toBe(ctx);
    });

    it('can be unsubscribed from by context', function() {
      emitter.off(null, null, ctx);
      emitter.trigger('event1');
      expect(single.called).toBe(false);
    });
  });

  describe('all is subscribed to', function() {
    var all, single;

    beforeEach(function() {
      all = createCallback();
      emitter.on('all', all);
    });

    it('calls the callback on an unrelated event', function()  {
      emitter.trigger('event1');
      expect(all.called).toBe(true);
    });

    it('calls the callback with the event as the first argument', function()  {
      emitter.trigger('event1');
      expect(all.args[0]).toEqual('event1');
    });

    it('calls the callback with the remaining arguments', function()  {
      emitter.trigger('event1', 1, 2);
      expect(all.args).toEqual(['event1', 1, 2]);
    });
  });

  describe('when listenTo is used', function() {
    var single, listener;

    beforeEach(function() {
      listener = new ProtoEvented();
      single = createCallback();
      listener.listenTo(emitter, 'event1', single);
    });

    it('calls the callback', function()  {
      emitter.trigger('event1');
      expect(single.called).toBe(true);
    });

    it('calls the callback with the right context', function()  {
      emitter.trigger('event1');
      expect(single.context).toBe(listener);
    });

    it('can be unsubscribed from directly', function() {
      emitter.off('event1');
      emitter.trigger('event1');
      expect(single.called).toBe(false);
    });

    describe('calling stopListening', function() {
      it('unsubscribes `other`', function() {
        listener.stopListening(emitter);
        emitter.trigger('event1');
        expect(single.called).toBe(false);
      });

      it('unsubscribes `events`', function() {
        listener.stopListening(null, 'event1');
        emitter.trigger('event1');
        expect(single.called).toBe(false);
      });

      it('unsubscribes `callback`', function() {
        listener.stopListening(null, null, single);
        emitter.trigger('event1');
        expect(single.called).toBe(false);
      });

      it('unsubscribes all', function() {
        listener.stopListening();
        emitter.trigger('event1');
        expect(single.called).toBe(false);
      });

      describe('with different `other`', function() {
        it('does not unsubscribe', function() {
          listener.stopListening(new Object());
          emitter.trigger('event1');
          expect(single.called).toBe(true);
        });

        it('does not unsubscribe with matching events', function() {
          listener.stopListening(new Object(), 'event1');
          emitter.trigger('event1');
          expect(single.called).toBe(true);
        });

        it('does not unsubscribe with matching callback', function() {
          listener.stopListening(new Object(), null, single);
          emitter.trigger('event1');
          expect(single.called).toBe(true);
        });
      });

      describe('with different `events`', function() {
        it('does not unsubscribe matching other', function() {
          listener.stopListening(emitter, 'event2');
          emitter.trigger('event1');
          expect(single.called).toBe(true);
        });

        it('does not unsubscribe with matching callback', function() {
          listener.stopListening(emitter, 'event2', single);
          emitter.trigger('event1');
          expect(single.called).toBe(true);
        });
      });

      describe('with different `callback`', function() {
        it('does not unsubscribe matching other', function() {
          listener.stopListening(emitter, null, function(){});
          emitter.trigger('event1');
          expect(single.called).toBe(true);
        });

        it('does not unsubscribe with matching event', function() {
          listener.stopListening(null, 'event1', function(){});
          emitter.trigger('event1');
          expect(single.called).toBe(true);
        });
      });
    });
  });
});
