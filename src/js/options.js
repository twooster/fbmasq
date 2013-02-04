Masquerade = Masquerade || {};

Masquerade.Config = function(options) {
  this.init(options);
}

$.extend(Masquerade.Config.prototype, {
  init : function(options) {
    options = options || {};

    this.storage = options.storage || localStorage;
  },

  getApplications : function() {
    return this.storage.applications || [];
  }

  setApplications : function(applications) {
    this.storage.applications = applications;
  },

});

Masquerade.OptionsPage = function(options) {
};

(function($) {
  function extractOptions() {
    var token = $('#app_access_token').val();
    if (!token) {
      setError('Empty app token');
      return;
    }

    var idEnd = token.indexOf('|');
    if (idEnd === -1) {
      setError('Could not extract application id');
      return;
    }

    var id = token.slice(0, idEnd);
    return {
      accessToken: token,
      appId: id
    };
  }

  function restoreOptions() {
    $('#app_access_token').val(localStorage.accessToken);
  }

  function setError(text) {
    setStatus('Error: ' + text, 'error');
  }

  function setStatus(text, cls) {
    $('#status')
      .removeClass()
      .addClass(cls || '')
      .text(text);
  }

  function saveClicked() {
    var opts = extractOptions();
    if (opts) {
      for (var k in opts) {
        localStorage[k] = opts[k];
      }
      setStatus('Saved at ' + (new Date()).toTimeString());
    }
  }

  $(function() {
    $('#save').on('click', saveClicked);
    restoreOptions();
  })
})(Zepto);
