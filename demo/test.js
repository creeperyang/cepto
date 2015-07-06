$(function() {
    console.log('ready');

    $('body').on('click', 'section', {x: 1}, function(e) {
        console.log(e);
    });

    $.ajax({
        url: '/notexist',
        data: {
            arg1: ['m', 'n'],
            arg2: 'hello'
        }
    }).done(function() {
        console.log('wont execute');
    }).always(function() {
        console.log(arguments);
    }).fail(function() {
        console.log('ajax error', arguments)
    });

    var promise = $.getJSON('/testdata.json').done(function(res) {
        console.log('getJSON success', res);
    }).fail(function(){
        console.log('getJSON failed', arguments);
    });
    console.log(promise);

    $.ajax({
        url: 'http://192.168.7.120:8080/Main/appIndex?jsonpCallback=?',
        dataType: 'jsonp'
    }).done(function() {
        console.log('jsonp', arguments);
    });
});
console.log('start');