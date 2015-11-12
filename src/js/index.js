var socket = require('socket.io-client')();
var $ = require('npm-zepto');
var _ = require('underscore');

var $url = $('form#main #url');
var $results = $('form#main .search-results');

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

$url.on('focus', function(event) {
  $url[0].select();
});

function createLink(item) {
  var $a = $('<a>');
  var $img = $('<img>').attr('src', item.snippet.thumbnails.default.url);
  var $span = $('<span>').text(item.snippet.title);
  $a.append($img).append($span);
  if (item.id.kind === 'youtube#video') {
    $a.attr('href', 'https://youtube.com/watch?v=' + item.id.videoId);
  } else if (item.id.kind === 'youtube#playlist') {
    $a.attr('href', 'https://youtube.com/playlist?list=' + item.id.playlistId);
  } else if (item.id.kind === 'youtube#channel') {
    $a.attr('href', 'https://youtube.com/channel/' + item.id.channelId);
  }
  $a.on('click', () => {
    var url = $a.attr('href');
    socket.emit('url', url);
    localStorage.setItem('url', url);
    return false;
  });
  return $a;
}

$url.on('input', _.throttle(function() {
  var url = $url.val();
  if (!url) {
    $results.empty();
    return;
  }

  $.getJSON('/api/youtube/search', {
    value: $url.val()
  }, function(data) {
    $results.empty();
    data.map(item => $results.append(createLink(item)));
  });
}, 500));

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
