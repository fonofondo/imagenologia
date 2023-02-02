var mwjswin = require("nw.gui").Window.get();
var chokidar = require("chokidar");
var openFolderExplorer = require("nw-programmatic-folder-select");
var zipper = require("zip-local");
var fs = require("fs");
var path = require("path");
var settings;

mwjswin.showDevTools();

/////// Settings

var settingsPath = path.join(nw.App.dataPath, "settings.json");
var settingsHelper = {
  saveSettings: function (settings, callback) {
    fs.closeSync(fs.openSync(settingsPath, "a"));
    fs.writeFile(settingsPath, JSON.stringify(settings), function (err) {
      console.log("wrote file");
      if (err) {
        console.info("There was an error attempting to save your settings.");
        console.warn(err.message);
        return;
      } else if (typeof callback === "function") {
        callback();
      }
    });
  },
  loadSettings: function (callback) {
    fs.readFile(settingsPath, function (err, data) {
      if (err) {
        console.info("There was an error attempting to read your settings.");
        console.warn(err.message);
        callback({});
      } else if (typeof callback === "function") {
        try {
          data = data.length ? JSON.parse(data) : {};
          addLog('Archivo de configuración cargado: ' + settingsPath)
          callback(data);
        } catch (error) {
          console.info(
            "There was a problem parsing the data in your settings."
          );
          console.warn(error);
          callback({});
        }
      }
    });
  },
};

settingsHelper.loadSettings((response) => {
  settings = response;
  if (settings["targetFolder"]) {
    $("#target-path").html(settings.targetFolder);
  }

  if (settings["resultsFolder"]) {
    $("#results-path").html(settings.resultsFolder);
  }
});


////// Directory choosers

function chooseTargetFolder() {
  const options = {
    title: "Seleccione la ubicación de los resultados",
  };

  const callback = function (selection) {
    if (selection) {
      $("#target-path").html(selection);
      settingsHelper.loadSettings((response) => {
        settings = response;
        settings.targetFolder = selection;
        settingsHelper.saveSettings(settings);
      });
    } else {
      $("#target-path").html("Ninguno seleccionado.");
    }
  };

  openFolderExplorer(window, options, callback);
}

function chooseResultsFolder() {
  const options = {
    title: "Seleccione la ubicación de los resultados",
  };

  const callback = function (selection) {
    if (selection) {
      $("#results-path").html(selection);
      settingsHelper.loadSettings((response) => {
        settings = response;
        settings.resultsFolder = selection;
        settingsHelper.saveSettings(settings);
      });
    } else {
      $("#results-path").html("Ninguno seleccionado.");
    }
  };

  openFolderExplorer(window, options, callback);
}

function addLog(msg, type = 'info') {
  const d = new Date();
  const logdate = d.toLocaleString('es').substring(0, 18)

  var log = "<div class='logdate'>" + logdate + "</div><div class='log " + type + "'>" + msg + "</div>"
  $('#terminal').prepend(log)
}

////////// File watcher

var watcher

function start() {

  $('#start-button').hide()
  $('#stop-button').show()

  if (!settings.resultsFolder) {
    addLog("Falta indicar directorio de resultados.", 'error')
    return;
  }

  if (!settings.targetFolder) {
    addLog("Falta indicar directorio de destino.", 'error')
    return;
  }

  watcher = chokidar.watch(settings.resultsFolder, {
    ignored: /^\./,
    persistent: true,
  });

  watcher.on("add", function (path) {
    onFileAdded(path)
  });
  // .on("change", function (path) {
  //   console.log("File", path, "has been changed");
  // })
  // .on("unlink", function (path) {
  //   console.log("File", path, "has been removed");
  // })
  // .on("error", function (error) {
  //   console.error("Error happened", error);
  // });
}

function stop() {

  $('#start-button').show()
  $('#stop-button').hide()

  watcher.close()
}

///// File registration

function onFileAdded(filepath) {
  filepath = filepath.replace(settings.resultsFolder, '')
  const pathParts = filepath.split(path.sep)

  if (pathParts[0] == '') pathParts.shift()

  if (pathParts.length > 1) {
    startFolderAddedTimer(pathParts[0])
  }
}

var folderTimers = {}

function startFolderAddedTimer(folder) {
  if (folderTimers[folder]) clearTimeout(folderTimers[folder])

  folderTimers[folder] = setTimeout(() => {
    processFolder(folder)
  }, 5000)
}

function processFolder(folder) {
  addLog('Procesando directorio: ' + folder)

  // zipping a file
  zipper.zip(path.join(settings.resultsFolder, folder), function (error, zipped) {

    if (!error) {
      zipped.compress(); // compress before exporting

      // var buff = zipped.memory(); // get the zipped file as a Buffer

      // or save the zipped file to disk
      const compressedPath = path.join(nw.App.dataPath, 'compressed')
      if (!fs.existsSync(compressedPath)) {
        fs.mkdirSync(compressedPath);
      }

      const tempZip = path.join(compressedPath, folder + '.zip')
      zipped.save(tempZip, function (error) {
        if (!error) {
          addLog("Eviando archivo comprimido: " + tempZip);

          const destination = path.join(settings.targetFolder, folder + '.zip')

          fs.copyFile(tempZip, destination, (err) => {
            if (err) {
              addLog(err, 'error')
              return
            }


            fs.unlink(tempZip, () => {
              if (err) {
                addLog("Error borrando archivo temporal: " + err, 'error');
                return;
              }

              addLog("Archivo temporal borrado: " + tempZip);
            })
          });

        } else {
          addLog("Error al comprimir: " + error, 'error');
        }
      });
    }
  });
}


