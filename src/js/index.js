var socket = require('socket.io-client')();
var $ = require('npm-zepto');
var _ = require('underscore');

var $url = $('form#main #url');
var $results = $('form#main .search-results');

function sendCommand(command, params) {
  var url = '/api/mpv' + command;
  console.log('sending command:', url, params);
  $.getJSON('/api/mpv/' + command, params, function(data, status) {
    updateStatus(status !== 200, data);
  });
}

function play(url) {
  sendCommand('play', {url: url});
  $results.empty();
}

$('form#main').on('submit', function() {
  return false;
});

$('form#main button.command').on('click', function() {
  var command = $(this).attr('id');
  sendCommand(command);
  return false;
});

$url.on('focus', function(event) {
  $url[0].select();
});

$('button#status-show').on('click', () => $status.toggle());

function createIcon(item) {
  var $span = $('<span>');
  var kind = item.id.kind;
  var icon = kind === 'youtube#video' ?
    'icon-film' : kind === 'youtube#playlist' ?
    'icon-file-video' : kind === 'youtube#channel' ?
    'icon-tv' : '';
  $span.addClass(icon);
  return $span;
}

function createLink(item) {
  var $a = $('<a>');
  var $img = $('<img>').attr('src', item.snippet.thumbnails.default.url);
  var $icon = createIcon(item);
  var $span = $('<span>').text(item.snippet.title);
  $a.append($img).append($icon).append($span);
  if (item.id.kind === 'youtube#video') {
    $a.attr('href', 'https://youtube.com/watch?v=' + item.id.videoId);
  } else if (item.id.kind === 'youtube#playlist') {
    $a.attr('href', 'https://youtube.com/playlist?list=' + item.id.playlistId);
  } else if (item.id.kind === 'youtube#channel') {
    $a.attr('href', 'https://youtube.com/channel/' + item.id.channelId);
  }
  $a.on('click', () => {
    var url = $a.attr('href');
    play(url);
    return false;
  });
  return $a;
}

$url.on('input', _.debounce(function() {
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
}, 300));

var $status = $('div#status');
var $title = $('#title');

function updateStatus(isError, status) {
  var $msg = $('<p>')
    .attr('class', isError ? 'err' : '')
    .text(status);
  $status.append($msg);
  var statusEl = $status[0];
  statusEl.scrollTop = statusEl.scrollHeight - $status.height();
}

socket.on('status', updateStatus.bind(null, false));
socket.on('status-err', updateStatus.bind(null, true));
socket.on('title', title => {
  $title.text(title);
  document.title = '▶ ' + title + ' - node-mpv';
});
