var fs = require('fs')
var path = require('path')
var http = require('http')
var socketIO = require('socket.io')
var ss = require('socket.io-stream')
var parallel = require('run-parallel')
var { promisify } = require('util')
var cp = promisify(require('cp'))
var mv = promisify(require('mv'))
var trash = require('trash')
var concat = require('concat-stream')
var ffprobe = require('ffprobe')
var ffprobeStatic = require('ffprobe-static')

var readdir = promisify(fs.readdir)

const { PORT, VIBEDRIVE_HOME, DIRECTORY } = require('./constants')

var archiveFormats = ['.rar', '.zip', '.tar', '.gz', '7z']
var validAudioTypes = ['.mp3', '.wav', '.opus', '.ogg', '.flac', '.m4a']

var server = http.Server()
var io = socketIO(server)

io.on('connection', function (socket) {
  console.log('Connected to the browser')

  socket.on('folders:inbox:clean', cb => cleanInbox(cb))
  socket.on('folders:inbox:list', cb => listFiles(DIRECTORY.INBOX, cb))
  socket.on('folders:archives:list', cb => listFiles(DIRECTORY.ARCHIVES, cb))
  socket.on('files:info', getFileInfo)
  socket.on('files:trash', trashFile)

  ss(socket).on('files:buffer', bufferFile)

  function bufferFile (filepath, cb) {
    var fullpath = path.join(VIBEDRIVE_HOME, filepath)
    var source = fs.createReadStream(fullpath)
    var sink = ss.createStream()

    cb(null, sink)

    source.pipe(sink)
  }

  function listFiles (key, cb) {
    var dir = dirPath(key)
    var statFiles = []

    fs.readdir(dir, (err, files) => {
      if (err) return cb(err)

      parallel(files.map(statTask), () => {
        cb(null, statFiles)
      })
    })

    function statTask (file) {
      return done => {
        fs.stat(path.join(dir, file), (err, stats) => {
          if (err) return done(err)

          statFiles.push({
            name: file,
            filesize: stats.size,
            ino: stats.ino
          })

          done()
        })
      }
    }
  }

  function cleanInbox (cb) {
    var inbox = dirPath(DIRECTORY.INBOX)
    var unsupported = dirPath(DIRECTORY.UNSUPPORTED)
    var archives = dirPath(DIRECTORY.ARCHIVES)

    var promises = []

    readdir(inbox).then(files => {
      files.forEach(file => {
        var ext = path.extname(file).toLowerCase()

        if (archiveFormats.includes(ext)) {
          return promises.push(mv(path.join(inbox, file), path.join(archives, file)))
        }

        if (!validAudioTypes.includes(ext)) {
          return promises.push(mv(path.join(inbox, file), path.join(unsupported, file)))
        }
      })

      Promise.all(promises).then(() => {
        cb(null)
      })
    })
  }

  function trashFile (filepath, cb) {
    var fullpath = path.join(VIBEDRIVE_HOME, filepath)

    return trash([ fullpath ]).then(() => {
      cb(null, trashFile, { status: 200 })
    })
  }

  function getFileInfo (filepath, cb) {
    var fullpath = path.join(VIBEDRIVE_HOME, filepath)

    ffprobe(fullpath, { path: ffprobeStatic.path }, (err, info) => {
      if (err) return cb(err)

      info = info.streams.find(stream => stream.codec_type === 'audio')

      cb(null, info)
    })
  }

  function playFile (filepath, cb) {
    var fullpath = path.join(VIBEDRIVE_HOME, filepath)

    var stream = ss.createStream()

    ss(socket).emit('ack', stream)

    fs.createReadStream(fullpath).pipe(stream)
  }
})

server.listen(PORT, function () {
  console.log('Vibedrive File Server listening on', PORT)
})

function dirPath (directory) {
  return path.join(VIBEDRIVE_HOME, directory)
}
