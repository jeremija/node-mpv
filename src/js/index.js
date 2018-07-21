var socket = require('socket.io-client')()
var $ = require('npm-zepto')
var _ = require('underscore')
var Promise = require('bluebird')

var $url = $('form#main #url')
var $results = $('form#main .search-results')

function sendAjax (method, url, data) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      type: method,
      url: url,
      data: data,
      contentType: 'application/json',
      dataType: 'json',
      success: function (data) {
        resolve(data)
      },
      error: function (xhr, errorType, error) {
        var err
        try {
          err = JSON.parse(xhr.responseText)
        } catch (e) {
          err = xhr.responseText || error
        }
        reject(new Error(err && err.error))
      }
    })
  })
}

function sendCommand (command, params) {
  var url = '/api/mpv/' + command
  updateStatus(false, 'sending command: ' + url + ', params: ' + params)
  sendAjax('GET', url, params)
  .then(function (data) { updateStatus(false, data) })
  .catch(function (err) { updateStatus(true, err.message) })
}

function play (url) {
  sendCommand('play', {url: url})
  $results.empty()
}

$('form#main').on('submit', function () {
  return false
})

$('form#main button.command').on('click', function () {
  var command = $(this).attr('id')
  sendCommand(command)
  return false
})

$url.on('focus', function (event) {
  $url[0].select()
})

$('button#status-show').on('click', () => {
  $status.toggle()
  var statusEl = $status[0]
  statusEl.scrollTop = statusEl.scrollHeight - $status.height()
})

var youtubeIcons = {
  'youtube#video': 'icon-film',
  'youtube#playlist': 'icon-file-video',
  'youtube#channel': 'icon-tv'
}

var youtubeUrls = {
  'youtube#video': 'https://youtube.com/watch?v=',
  'youtube#playlist': 'https://youtube.com/playlist?list=',
  'youtube#channel': 'https://youtube.com/channel/'
}

var youtubeIds = {
  'youtube#video': 'videoId',
  'youtube#playlist': 'playlistId',
  'youtube#channelId': 'channelId'
}

function createIcon (item) {
  var $span = $('<span>')
  $span.addClass(youtubeIcons[item.id.kind])
  return $span
}

function createLink (item) {
  var $a = $('<a>')
  var $img = $('<img>').attr('src', item.snippet.thumbnails.default.url)
  var $icon = createIcon(item)
  var $span = $('<span>').text(item.snippet.title)
  $a.append($img).append($icon).append($span)

  var idProperty = youtubeIds[item.id.kind]
  var url = youtubeUrls[item.id.kind]
  if (url && idProperty) $a.attr('href', url + item.id[idProperty])

  $a.on('click', () => {
    var url = $a.attr('href')
    play(url)
    return false
  })
  return $a
}

$url.on('input', _.debounce(function () {
  var url = $url.val()
  if (!url) {
    $results.empty()
    return
  }

  sendAjax('GET', '/api/youtube/search', {value: url})
  .then(function (data) {
    $results.empty()
    data.map(item => $results.append(createLink(item)))
  })
  .catch(function (err) {
    $results.empty()
    updateStatus(true, err.message)
  })

}, 300))

var $status = $('div#status')
var $title = $('#title')

function updateStatus (isError, status) {
  var $msg = $('<p>')
  .attr('class', isError ? 'err' : '')
  .text(status)
  $status.append($msg)
  var statusEl = $status[0]
  statusEl.scrollTop = statusEl.scrollHeight - $status.height()
}

socket.on('status', updateStatus.bind(null, false))
socket.on('status-err', updateStatus.bind(null, true))
socket.on('title', title => {
  $title.text(title)
  document.title = '▶ ' + title + ' - node-mpv'
})
