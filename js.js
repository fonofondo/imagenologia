var mwjswin = require("nw.gui").Window.get();
var chokidar = require("chokidar");
var openFolderExplorer = require("nw-programmatic-folder-select");

var fs = require("fs");
var path = require("path");

mwjswin.showDevTools();

var child_process = require("child_process");
var execSync = child_process.execSync;
var output = execSync("bash ./update.sh");
console.log(output.toString());

var settingsPath = "./settings.json";
var settingsHelper = {
  saveSettings: function (settings, callback) {
    fs.writeFile(settingsPath, JSON.stringify(settings), function (err) {
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
      } else if (typeof callback === "function") {
        try {
          data = data.length ? JSON.parse(data) : {};
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

function chooseResultsFolder() {
  const options = {
    // Optional string. The working directory to start in
    // Optional string. A custom title for the OS's folder selection dialog
    title: "Seleccione la ubicación de los resultados",
  };

  // Optional asynchronous callback function.
  // Returns a string to the path, like 'C:\Users\Bob\Desktop', or undefined if no selection made
  const callback = function (selection) {
    if (selection) {
      $("#target-path").html(selection);
      settingsHelper.loadSettings((settings) => {
        console.log("settings", settings);
        settings.targetFolder = selection;
        console.log(settings);
        //settingsHelper.saveSettings(settings)
      });
    } else {
      $("#target-path").html("Ninguno seleccionado.");
    }
  };

  // Window is required to have access to the browser context
  // All other arguments are optional
  openFolderExplorer(window, options, callback);
}

function start() {
  var watcher = chokidar.watch(".", { ignored: /^\./, persistent: true });
  console.log("thischanged again");
  watcher
    .on("add", function (path) {
      console.log("File", path, "has been added");
    })
    .on("change", function (path) {
      console.log("File", path, "has been changed");
    })
    .on("unlink", function (path) {
      console.log("File", path, "has been removed");
    })
    .on("error", function (error) {
      console.error("Error happened", error);
    });
}
