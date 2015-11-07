var socket = require('socket.io-client')();
var $ = require('npm-zepto');

var $url = $('form#main #url');

if (!$url.val()) {
  $url.val(localStorage.getItem('url') || '');
}


$('form#main').on('submit', function() {
  var url = $('form#main input#url').val();
  var display = $('form#main input[name="display"]').val();
  console.log('sending url', url);
  socket.emit('url', {url: url, display: display});
  localStorage.setItem('url', url);
  return false;
});

function sendCommand(command) {
  socket.emit(command);
  return false;
}

$('form#main #stop').on('click', sendCommand.bind(null, 'stop'));
$('form#main #pause').on('click', sendCommand.bind(null, 'pause'));
$('form#main #next').on('next', sendCommand.bind(null, 'next'));

var $status = $('div#status');
var $urls = $('div#urls');

function updateStatus(isError, status) {
  console.log(isError, status);
  var $msg = $('<p>')
    .attr('class', isError ? 'err' : '')
    .text(status);
  $status.append($msg);
  var statusEl = $status[0]
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
    $urls.last().remove();
  }
});
