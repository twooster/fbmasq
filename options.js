function saveOptions() {
    var token = $('#app_access_token').val();
    var id = $('#app_id').val();
    if (token.length && id.length && token.indexOf('|') == -1) {
        token = id.toString() + '|' + token.toString();
    }
    localStorage.accessToken = token;
    localStorage.appId = id;
}

function restoreOptions() {
    $('#app_access_token').val(localStorage.accessToken);
    $('#app_id').val(localStorage.appId);
}

function initPage() {
    $('#save').on('click', function() {
        saveOptions();
        restoreOptions();
        $('#status').text('Saved at ' + (new Date()).toTimeString());
    });
    restoreOptions();
}

$(initPage);
