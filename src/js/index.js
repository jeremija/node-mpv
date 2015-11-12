var socket = require('socket.io-client')();
var $ = require('npm-zepto');

var $url = $('form#main #url');

if (!$url.val()) {
  $url.val(localStorage.getItem('url') || '');
}


$('form#main').on('submit', function() {
  console.log('submitting...');
  var url = $('form#main input#url').val();
  console.log('sending url', url);
  socket.emit('url', url);
  localStorage.setItem('url', url);
  return false;
});

$('form#main button').on('click', function() {
  var command = $(this).attr('id');
  socket.emit('command', command);
  return false;
});

var $status = $('div#status');
var $urls = $('div#urls');
var $title = $('#title');

function updateStatus(isError, status) {
  var $msg = $('<p>')
    .attr('class', isError ? 'err' : '')
    .text(status);
  $status.append($msg);
  var statusEl = $status[0];
  statusEl.scrollTop = statusEl.scrollHeight - $status.height();
}

function createUrlCallback($selector) {
  $selector.each(function(index, element) {
    $(element).on('click', function() {
      $url.val(element.href);
      $('form#main').submit();
      return false;
    });
  });
}

createUrlCallback($urls.find('a'));

socket.on('status', updateStatus.bind(null, false));
socket.on('status-err', updateStatus.bind(null, true));
socket.on('url-history', function(url) {
  var $a = $('<a>').attr('href', url).text(url);
  createUrlCallback($a);
  $urls.prepend($a);
  var $children = $urls.find('a');
  if ($children.length > 5) {
    $children.last().remove();
  }
});
socket.on('title', $title.text.bind($title));
