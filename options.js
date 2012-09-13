function saveOptions() {
    localStorage.accessToken = $('#app_access_token').attr('value');
    localStorage.appName = $('#app_name').attr('value');
    localStorage.appId = $('#app_id').attr('value');
}

function restoreOptions() {
    console.log('restore options');
    $('#app_access_token').attr('value', localStorage.accessToken);
    $('#app_name').attr('value', localStorage.appName);
    $('#app_id').attr('value', localStorage.appId);
}

function initPage() {
    $('#save').on('click', saveOptions);
    restoreOptions();
}

$(initPage);
