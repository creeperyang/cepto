$(function() {
    console.log('ready');

    $('body').on('click', 'section', {x: 1}, function(e) {
        console.log(e);
    });
});
console.log('start');