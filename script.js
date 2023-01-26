var TimeoutConst = 60000;
var currentSessionTime = TimeoutConst;

function isEmpty(obj) {
    for (var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return true;
};
//------------------------------------------------------------ 
setLogTable = function( tableArray, append = false) {    
    var tableDiv = '<table id="innerLogTableId">';
    for (i= tableArray.length -2; i >= 0 ; i--){
        tableDiv += '<tr><td>' + tableArray[i] + '</td></tr>';
    }    
    tableDiv += '</table>'; 
    var innerlogTable = document.getElementById("innerLogTableId");

    if(!append || innerlogTable == undefined) {                
        document.getElementById("logTable").innerHTML = tableDiv;
    }
    else {        
        for (i= tableArray.length -2; i >= 0 ; i--) {
            innerlogTable.innerHTML  += '<tr><td>' + tableArray[i] + '</td></tr>';
        }            
    }
};
//------------------------------------------------------------ 
function fill_logfile(response, append = false) {
    try {
        setLogTable(response.split('\n'), append);       
    }
    catch(err) {
        setLogTable(("No logfile provided").split('\n'), append);
    }
}
//------------------------------------------------------------ 
var dataToken = (function() {       //docelowo ma zawierać też token     
	var token;
	return function(value) {
		if(arguments.length == 0) {
			return token;
		} 
		else {
			token = value;
			return this;
		}
	}
})();
//------------------------------------------------------------ 
var authVector = (function() {      //zawiera wektor autentykacji
	var auth;                      
	return function(value) {
		if(arguments.length == 0) {
			return auth;
		} 
		else {
			auth = value;
			return this;
		}
	}
})();
//------------------------------------------------------------ 

function msToTime(s) {

  function addZ(n) {
    return (n<10? '0':'') + n;
  }

  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  return addZ(hrs) + ':' + addZ(mins) + ':' + addZ(secs);
}

var logging = false;
var reqsent = {    
    isAny : function() {
        return this.data || this.logs || this.dm || this.calibrate || this.events || this.control || this.bazaSet || this.alarms;
    },
    data: false,
    logs: false,
    dm: false,
    calibrate: false,
    events: false,
    alarms: false,
    control: false,
    bazaSet: false,
    login: false,
    logout: false,   
    firmware: false, 
    apiToken: false, 
    clear : function () {
        this.data = false;
        this.logs = false;
        this.dm = false;
        this.calibrate = false;  
        this.events = false;
        this.alarms = false;
        this.control = false;
        this.bazaSet = false;
        this.login = false;
        this.logout = false;
        this.firmware =  false; 
        this.apiToken = false;
    }
};

//------------------------------------------------------------

var w8 = 0;
var modulesToRead = [];

(function() {
    var app, deps;

    deps = ['angularBootstrapNavTree', 'ngDialog', 'ngAnimate', 'tableview', 'ngMaterial', 'material.components.expansionPanels'];

    /*if (angular.version.full.indexOf("1.2") >= 0) {
        deps.push('ngAnimate');
    }*/
    app = angular.module('app', deps);

    app.controller('MainController', 
        ['$scope', '$http', '$interval', '$timeout', '$window', 'ngDialog', '$mdExpansionPanelGroup' , '$q',
        function($scope, $http, $interval, $timeout, $window, ngDialog, $mdExpansionPanelGroup, $q) {
            var sldMenu = document.getElementById('sldmenu');
            var alarmMenu = document.getElementById('alarmmenu');

            //hideMenu(mouseOverCtrl, sldMenu);
            //hideMenu(mouseOverFormula, alarmMenu);

            document.addEventListener('contextmenu', onContextMenu, false);
            document.addEventListener('click', onButtonClicked, true);
            var analogCtrlMenuItem = document.getElementById("analogCtrlMenuItem");
            var analogSetMenuItem = document.getElementById("analogSetMenuItem");
            if(analogCtrlMenuItem != undefined) {
                analogCtrlMenuItem.addEventListener("keypress", (e => {
                    if(e.key == "Enter") {
                        analogControlClicked();
                    }
                }));
            }
            if(analogSetMenuItem != undefined) {
                analogSetMenuItem.addEventListener("keypress", (e => {
                    if(e.key == "Enter") {
                        analogControlClicked(false);
                    }
                }));
            }
        document.addEventListener("focus", onElementFocused, true);
        CtrlOnText = "";
        var svgScheme, mainSvg;
        var viewBoxSize = {
            width: 2000,
            height: 2000
        };

        var tree;        

        var viewModel = this;								
        										
		var digitalConfStatesArray = [];
        var TimeoutConst;
        var treeNodeChanged = false;

		$scope.dmResponse = {};
        $scope.displayTime = "";
                                        
        $scope.analogArray = [];        
        $scope.digitalArray = [];
                                        
        $scope.showHeader = true;
        $scope.showNavigation = true;

        document.getElementById("showNavDivId").style.display = 'none';
        //document.getElementById("navDivId").style.display = 'none';

        //ShowNavTree();

        $scope.flagLegend = [
            {"IV":"INVALID"},
            {"NT":"NOT TOPICAL"},
            {"SB":"SUBSTITUTED"},
            {"OV":"OVERFLOW"},
            {"BL":"BLOCKED"}
        ];                 
//--------------------------------------------------
										
        $scope.currentSelection = 'Login';
        $scope.isAuthenticated = false;

        authVector({
            baseAuth: false, 
            controlAuth : false,
            logAuth : false,
            configurationAuth : false,
            securityAdv : false,         
            readOnlyAuth : false
        });

        function resetGlobalInfErr(info = true, error = true) {
            if(info) {
                $scope.globalInfo = false;
                document.getElementById("globalInf").innerHTML = "";   
            }
            if(error) {
                $scope.globalError = false;                                
                document.getElementById("globalErr").innerHTML = "";
            }             
        }

        resetGlobalInfErr();        
        
        //$scope.my_data = [{label: "Login"}];        
        //$scope.my_data = [{label: "Login"}, {label: "Calibration"}, {label: "Event log"}];
        $scope.my_tree = tree = {};
        $scope.showOnLine = false;
        $scope.showDmCloseButton = false;
        $scope.dmResponse = { dm: { status: "" }};

        $scope.eventLogTableConfiguration = {
            columns: [
                {field: "number", title: "No"},
                //{field: "index", title: "Index"},                
                {field: "descr", title: "Signal"},
                {field: "timestamp", title: "Timestamp"},
                {field: "valueStr", title: "Value", template: {"body.cell": "MainController.body.cell.value"}}
            ],
            provider: eventLogProvider,

            request: {
                limit: 25,
                page: 1
            },

            limits: [10, 25, 50, 100]
        };        
		
		var reboot = true;
		var digit_literal = /^[0-9]+$/;
        var number_literal = /^[0-9]+\.?[0-9]*$/;		   
        
        var statesForSchemes = {};
        var currentScheme;

        document.getElementById('sld').onwheel = mouseWheelHandler;

        document.getElementById('sld').onmousedown = svgMouseDownHandler;
        document.getElementById('sld').touchstart = svgTouchStartHandler;
        //document.getElementById('sld').touchstart = svgMouseDownHandler;
        
        document.getElementById('sld').onmouseup = svgMouseUpHandler;
        document.getElementById('sld').touchend = svgMouseUpHandler;
        document.getElementById('sld').touchcancel = svgMouseUpHandler;

        document.getElementById('sld').onmousemove = svgMouseMoveHandler;
        document.getElementById('sld').touchmove = svgMouseMoveHandler;

        document.getElementById('sld').style.cursor = 'crosshair';
        document.getElementById('sld').style.userSelect = 'none';

        var alarms = {
            channelNo: -1,
            valuesBin: [],
            valuesAnl: [],
            GetDbRanges: function() {
                var ranges = {
                    binary: {
                        start : undefined,
                        count : undefined
                    },
                    analog: {
                        start : undefined,
                        count : undefined
                    }
                };
                var minBin = undefined, maxBin = undefined;
                alarms.valuesBin.forEach(function(valB) {
                    if(minBin == undefined || valB.index < minBin)
                        minBin = valB.index;
                    if(maxBin == undefined || valB.index > maxBin)
                        maxBin = valB.index;
                    valB.components.forEach(skladnik => {
                        if(skladnik.index < minBin)
                            minBin = skladnik.index;
                        if(skladnik.index > maxBin)
                            maxBin = skladnik.index;
                    });
                });
                var minAnl = undefined, maxAnl = undefined;
                alarms.valuesAnl.forEach(function(valA) {
                    if(minAnl == undefined || valA.index < minAnl)
                        minAnl = valA.index;
                    if(maxAnl == undefined || valA.index > maxAnl)
                        maxAnl = valA.index;
                    valA.components.forEach(skladnik => {
                        if(skladnik.index < minAnl)
                            minAnl = sladnik.index;
                        if(skladnik.index > maxAnl)
                            maxAnl = sladnik.index;
                    });
                });
                ranges.binary.start = minBin;
                if(minBin != undefined)
                    ranges.binary.count = maxBin - minBin + 1;
                ranges.analog.start = minAnl;
                if(minAnl != undefined)
                    ranges.analog.count = maxAnl - minAnl + 1;
                return ranges;
            }
        };
        
        var eventLog = {
            channelNo: undefined,
            valuesBin: [],
            valuesAnl: [],
        };        
        function resetIsAuthenticated() {
            viewModel.username = "";
            $scope.isAuthenticated = false;
            dataToken("");    
            $scope.my_data = [{label: "Login"}];
            //$scope.my_data = [{label: "Login"}, {label: "Calibration"}, {label: "Event log"}, {label: "Logs", children: ['Auth','Controls','Watchdog']}];
            $scope.textToSelect = "Login";            
        }
        function checkIsAuthenticated(httpResp) {
            if(!$scope.isAuthenticated)
                return;
            if(httpResp.error != undefined) {
                var status = parseInt(httpResp.status);
                if(status != undefined && (status == 4 /* DB_OPEN */ || status == 6 /* DB_HASH */)) {
                    resetAuthSubmit();
                }
            }
        }
        function resetAuthSubmit() {
            if(resetAuthSubmit.isRunning == true)
                return;
            resetAuthSubmit.isRunning = true;
            resetIsAuthenticated();
            resetAuthSubmit.isRunning = false;
        }
        resetAuthSubmit();

        var eventLogCallbackFunction;
        function eventLogProvider (request, callback) {
            eventLogCallbackFunction = callback;
            $scope.eventLogTableConfiguration.request = request;
        }

        function performNodeChangeTimeRefresh(forceRefresh = false) {
            if(treeNodeChanged || forceRefresh)
                currentSessionTime = TimeoutConst;
            treeNodeChanged = false;
        }
        function getValToKeyValTable(value, objectReference, key, append = false) {            
            if(value == undefined)
                return "";            
            if(value.FileName != undefined && value.hasOwnProperty("FileName")) {                     
                if(value.FileName == "version" || value.FileName == "serial" || value.FileName == "object_name") {
                    var query = "/db?ver";
                    if(value.FileName == "serial")
                        query = "/db?serial";
                    else if(value.FileName == "object_name")
                        query = "/db?objName";

                    $http({
                        method: 'GET',
                        url: query
                    }).then(function (resp){
                        w8 = 0;
                        checkIsAuthenticated(resp.data);
                        performNodeChangeTimeRefresh(true);
                        if(resp.data.error != undefined)
                            resp.data = "";
                        if(append)
                            objectReference[key] += resp.data; 
                        else
                            objectReference[key] = resp.data; 
                    }, function (error){
                        w8 = 0;
                        requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                        if(error.status >= 500)
                            resetAuthSubmit();                      
                        if(error.statusText == undefined || error.statusText == "") {
                            if(append)
                                objectReference[key] += "No information provided";        
                            else
                                objectReference[key] = "No information provided";        
                        }             
                        else if(error.statusText.error != undefined && error.statusText.error.length && error.statusText.error[0].error) {
                            if(append)
                                objectReference[key] += error_output.error[0].error;
                            else
                                objectReference[key] = error_output.error[0].error;
                        }
                    });
                }
                else if(value.FileName == "serial") {
                    var query = "/db?serial";

                    $http({
                        method: 'GET',
                        url: query
                    }).then(function (resp){
                        w8 = 0;
                        checkIsAuthenticated(resp.data);
                        performNodeChangeTimeRefresh(true);
                        if(append)
                            objectReference[key] += resp.data; 
                        else
                            objectReference[key] = resp.data; 
                    }, function (error){
                        w8 = 0;
                        requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                        if(error.status >= 500)
                            resetAuthSubmit();                      
                        if(error.statusText == undefined || error.statusText == "") {
                            if(append)
                                objectReference[key] += "No information provided";        
                            else
                                objectReference[key] = "No information provided";        
                        }             
                        else if(error.statusText.error != undefined && error.statusText.error.length && error.statusText.error[0].error) {
                            if(append)
                                objectReference[key] += error_output.error[0].error;
                            else
                                objectReference[key] = error_output.error[0].error;
                        }
                    });
                }
                else if(value.FileName == "ifconfig") {                                        
                    if(getValToKeyValTable.ifconfigRequests.length == 0) {
                        var query = "/db?ifconfig";
                        $http({
                            method: 'GET',
                            url: query
                        }).then(function (resp){
                            w8 = 0;
                            performNodeChangeTimeRefresh(true);
                            checkIsAuthenticated(resp.data);                                                        
                            //"Path" : "interfaces.eth0.ip"
                            if(value.Path != undefined) {
                                requirejs(["script/jsonpath.min.js"], function(jsonpath) {                                                                                                          
                                    getValToKeyValTable.ifconfigRequests.forEach( req => {
                                        var valueParsed = jsonpath.query(resp.data, "$." + req.itemValue.Path);
                                        if(Array.isArray(valueParsed) && valueParsed.length > 0) {      
                                            var firstElement = valueParsed[0];
                                            /*if(Array.isArray(firstElement)) {
                                                var newFirstElement = "";
                                                firstElement.forEach(el => {
                                                    newFirstElement += el + "\n";
                                                });
                                                firstElement = newFirstElement.trimEnd();
                                            }*/
                                            if(req.shouldAppend)
                                                req.ref[req.itemKey] += firstElement;
                                            else
                                                req.ref[req.itemKey] = firstElement;
                                        }
                                        else if(req.shouldAppend)
                                            req.ref[req.itemKey] += "-";
                                        else
                                            req.ref[req.itemKey] = "-";
                                    });
                                });
                            }
                            else {
                                getValToKeyValTable.ifconfigRequests.forEach( req => {
                                    if(append)
                                        req.ref[req.itemKey] += req.itemValue;
                                    else
                                        req.ref[req.itemKey] = req.itemValue;
                                });
                            }
                        }, function (error){
                            w8 = 0;
                            requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                            if(error.status >= 500)
                                resetAuthSubmit();                      
                            if(error.statusText == undefined || error.statusText == "") {
                                if(append)
                                    objectReference[key] += "No information provided";        
                                else
                                    objectReference[key] = "No information provided";        
                            }             
                            else if(error.statusText.error != undefined && error.statusText.error.length && error.statusText.error[0].error) {
                                if(append)
                                    objectReference[key] += error_output.error[0].error;
                                else
                                    objectReference[key] = error_output.error[0].error;
                            }
                        }); 
                    }
                    getValToKeyValTable.ifconfigRequests.push({ref: objectReference, itemKey: key, itemValue: value, shouldAppend: append});
                }
                else if(!append)             
                    objectReference[key] = "-";
            }
            else if(append)
                objectReference[key] += value;
            else
                objectReference[key] = value;
        }
        $scope.getEventCellStyleFor = function(value) {
            var ret = flagToBackground(parseInt(value, 16));
            ret['display'] = 'inline-block';
            ret['width'] = '100%';
            ret['height'] = '100%';
            ret['position'] = 'relative';
            //ret['position'] = 'relative';
            ret['text-align'] = 'center';
            return ret;
        }
        viewModel.deviceReboot = function(tmpJsonConfig = undefined) {
            if(reqsent.uploadJsonCfg)
                return;
            ngDialog.openConfirm({
                data: {message: ["Should the device be rebooted?"], messageLower: "REBOOTING", confirm : true, isError : false}
            }).then(function (value) {  
                reqsent.reboot = true;
                var queryReboot = "db?reboot"
                $http({
                    method: 'POST',
                    url: queryReboot,
                }).then(function (resp){       
                    reqsent.reboot = false;             
                    w8 = 0;
                    checkIsAuthenticated(resp.data);
                    performNodeChangeTimeRefresh(true);
                    if(resp.data.error != undefined || !resp.data)
                        resp.data = "failed";
                    else
                        resp.data = resp.data.operationStatus                    
                    
                    ngDialog.open({
                        data: {message: [], messageLower: "REBOOTING...", confirm : false, isError : resp.data != "success"}
                    });
                    if(tmpJsonConfig)
                        jsonConfigTree = tmpJsonConfig;
                }, function (error){
                    reqsent.reboot = false;
                    w8 = 0;
                    requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                    if(error.status >= 500)
                        resetAuthSubmit();      
                });  
                $scope.logout();
            });
        }
        $scope.comtradeList = [];        
        function readComtradeList() {
            var query = "db?comtrade_list"
            $http({
                method: 'GET',
                url: query
            }).then(function (resp){
                w8 = 0;
                checkIsAuthenticated(resp.data);
                performNodeChangeTimeRefresh(true);
                if(resp.data.error != undefined)
                    resp.data = "";
                else if(resp.data) {
                    var fileEntryId = 0;
                    if(Array.isArray(resp.data.files)) {
                        $scope.comtradeList = [];
                        resp.data.files.forEach((filename) => {
                            $scope.comtradeList.push({
                                id: fileEntryId++, 
                                name: filename.name,
                                channel: filename.channel,
                                selected: false,
                            });
                        });                            
                    }
                }
            }, function (error){
                w8 = 0;
                requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                if(error.status >= 500)
                    resetAuthSubmit();                      
            });
        }
        viewModel.comtradeDownloadButtonClick = function() {
            /*var downloadButton = document.getElementById("comtradeDownloadButtonId");
            if(downloadButton == undefined)
                return;
            var downloadProgressBar = downloadButton.getElementsByClassName('pgress')[0];
            if(downloadProgressBar == undefined)
                return;
            downloadProgressBar.style.width = '0%';            */
            if(Array.isArray($scope.comtradeList)) {
                /*var fileCount = $scope.comtradeList.filter((file) => {return file.selected}).length;
                var currentFileCount = 0;*/
                    
                $scope.comtradeList.forEach((comtrade) => {
                    if(!comtrade.selected)
                        return;                    
                    var query = "db?comtrade_get";
                    $http({
                        method: 'POST',
                        url: query,
                        data: comtrade.channel + "/" + comtrade.name,
                        responseType: "blob",
                        cache: false
                    }).then(function (resp){
                        w8 = 0;
                        checkIsAuthenticated(resp.data);
                        performNodeChangeTimeRefresh(true);
                        if(resp.data.error != undefined)
                            resp.data = "";
                        else { 
                            var a = document.createElement('a');               
                            var file = new Blob([resp.data], {type: 'application/octet-stream'});
                            a.href = URL.createObjectURL(file);
                            a.download = comtrade.name;
                            a.click();
                            comtrade.selected = false;
                        }
                    }, function (error){
                        w8 = 0;
                        requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                        if(error.status >= 500)
                            resetAuthSubmit();                      
                    });
                });                            
            }
        }        
        viewModel.comtradeSelectAllButtonClick = function() {
            if(Array.isArray($scope.comtradeList)) {                    
                $scope.comtradeList.forEach((comtrade) => {
                    comtrade.selected = true;
                });
            }
        };
        viewModel.comtradeDeselectAllButtonClick = function() {
            if(Array.isArray($scope.comtradeList)) {                    
                $scope.comtradeList.forEach((comtrade) => {
                    comtrade.selected = false;
                });
            }
        };        
        
        
        $scope.my_tree_handler = function(branch) {            
            if (branch.label != $scope.currentSelection) {
                $('#navSec').stop().animate({ scrollTop: 0 }, 0);
            }

            treeNodeChanged = true;

            $scope.currentSelection = branch.label;                           

            if($scope.textToSelect != branch.label)
                $scope.textToSelect = branch.label;
            $scope.output = "";
            
            ShowNavTree();//?

            $scope.isCurrentSelectionScheme = (branch.label == "Scheme");
            if(branch.label.match(/^(NEW! )?Alarms( NEW!)?$/g) != null) {
                $scope.isCurrentSelectionDziennikAlarmow = true;
                document.getElementById("AlarmLog").style.display = "block";
            }
            else {
                $scope.isCurrentSelectionDziennikAlarmow = false;
                document.getElementById("AlarmLog").style.display = "none";
            }


            if (branch.label == "Info"){
                $scope.output = $scope.response;
            } 
            else if (branch.label == "DM Server") {    
                //console.log("DM Server");
            }
            else if (branch.label == "Scheme") {
                var xmlhttp = new XMLHttpRequest();                    
                xmlhttp.onreadystatechange = function() {                        
                    if (this.readyState == 4 && this.status == 200) {                        
                        xmlToSvg(this);                                                    
                        //HideNavTree();               
                        adjustSvgZoom();
                        drawingObject.updated = true;     
                    }
                };
                xmlhttp.open("GET", "schemes\\main.xml", true);
                //xmlhttp.setRequestHeader("Authorization", dataToken());
                xmlhttp.send();
            }
            
            else if (branch.label == "Calibration") {
            }
               
            else if (branch.label == "Modules"){        
            } 
            else if (branch.label == "Logs"){                
            } 
            else if (branch.label == "Reload") {
                if($scope.isAuthenticated)
                    $scope.logout();
                else
                    location.reload(true);
            }
            else if (branch.label == "Event log") {
                eventReadBin()
            }
            else if (branch.label.match(/^(NEW! )?Alarms( NEW!)?$/g)) {    
                $mdExpansionPanelGroup().waitFor('panelGroup').then(function(groupInstance) {
                    groupInstance.collapseAll();
                });
                //czytać xml z konfiguracją -> formuły object !!!
            }
            else if(branch.label == "Auth" ||  branch.label == "Controls" || branch.label == "Watchdog") {
                fillLogData(branch.label);
            }
            else if(branch.label == "Scheme") {
                $scope.isCurrentSelectionScheme = true;
            }
            else if(branch.label == "Firmware") {
                var fileInput = document.getElementById("firmwareUploadInputId");
                var filePath = document.getElementById("firmwareFilePathLabelId");
                //var fileSignInput = document.getElementById("firmwareSignatureUploadInputId");
                //var fileSignPath = document.getElementById("firmwareSignatureFilePathLabelId");
                if(fileInput == undefined || filePath == undefined)// || fileSignInput == undefined || fileSignPath == undefined)
                    return;
                fileInput.onchange = function(e) {
                    var fileName = this.value.split("\\");
                    if(fileName.length == 0 || fileName[fileName.length - 1] == "")
                        filePath.innerHTML = "No file";
                    else                
                        filePath.innerHTML = fileName[fileName.length - 1];          
                }
                /*fileSignInput.onchange = function(e) {
                    var fileName = this.value.split("\\");
                    if(fileName.length == 0 || fileName == " ")
                        fileSignPath.innerHTML = "No file";
                    else                
                        fileSignPath.innerHTML = fileName[fileName.length - 1];          
                }*/
                
            }
            else if(branch.label == "COMTRADE files") {
                readComtradeList();
                $scope.currentSelection = "recordersFiles";
            }
            else {
                var foundModule = modulesToRead.find(function(module) {return branch.label == module["Module name"];});
                if(foundModule != undefined) {
                    $scope.output = foundModule;
                    if(authVector().controlAuth == false) {
                        $scope.output.Control = {};
                    }
                    $scope.currentSelModule = foundModule;
                    $scope.currentSelection = "Module";
                    //baseRead();
                }
            }            
        };
        viewModel.firmwareStatus = "Upload firmware";
        viewModel.firmwareUploadButtonClick = async function() {
            var fileInput = document.getElementById("firmwareUploadInputId");
            //var fileSignInput = document.getElementById("firmwareSignatureUploadInputId");
            //var fwPass = document.getElementById("firmwarePasswordInputId");
            //if(fileInput == undefined || fileSignInput == undefined || fwPass == undefined || fileInput.files.length == 0 && fileSignInput.files.length == 0 || reqsent.firmware)
            if(fileInput == undefined || fileInput.files.length == 0 || reqsent.firmware)
                return;                        
            var formData = new FormData();
            if(fileInput.files.length)
                formData.append("firmware", fileInput.files[0]);
            /*if(fileSignInput.files.length)
                formData.append("signature", fileSignInput.files[0]);
            if(fwPass.value != "")
                formData.append("password", fwPass.value);*/

            const ctrl = new AbortController()    // timeout
            setTimeout(() => ctrl.abort(), 300000);

            document.getElementById("firmwareUploadButtonId").disabled = true;
            viewModel.firmwareStatus = "Uploading...";

            performNodeChangeTimeRefresh(true);
            

            try {   
                let message = ["Firmware upload successfull", "Device needs to be rebooted now", "Reboot?"];          

                reqsent.firmware = true;             
                let r = await fetch('db?firmware', {
                    method: "POST", 
                    body: formData, 
                    signal: ctrl.signal, 
                    headers: {"Authorization" : dataToken()}
                }); 

                
                console.log('HTTP response code:',r.status); 
                if(r.status == 200) {
                    //let responseSplitted = (await r.text()).split('\n');
                    let message = ["Firmware upload successfull", "Device needs to be rebooted now", "Reboot?"];          
                    let shouldReboot = false;


                    try {
                        await ngDialog.openConfirm({
                            data: {message: message, messageLower: "FIRMWARE UPDATE", confirm : true, isError : false}
                        }).then(function (value) 
                        {                        
                            viewModel.deviceReboot();
                            viewModel.firmwareStatus = "Finished";
                        });                    
                    }
                    catch(e) {
                        $http({
                            method: 'POST',
                            url: "db?cancel_firmware"
                        }).then(function (resp){
                            viewModel.firmwareStatus = "Upload firmware";
                            document.getElementById("firmwareUploadButtonId").disabled = false;
                        },function (error){
                            viewModel.firmwareStatus = "Upload firmware";
                            document.getElementById("firmwareUploadButtonId").disabled = false;
                        });
                    }               
                }
                else {
                    let responseSplitted = (await r.text()).split('\n');
                    ngDialog.open({
                        data: {message: responseSplitted, messageLower: "FIRMWARE UPDATE FAILED", confirm : false, isError : true}
                    })
                    viewModel.firmwareStatus = "Upload firmware";
                    document.getElementById("firmwareUploadButtonId").disabled = false;
                }
                reqsent.firmware = false;
                w8 = 0;
             } catch(e) {
                reqsent.firmware = false;
                w8 = 0;
                console.log('Huston we have problem...:', e);
                ngDialog.open({
                    data: {message: "Could not upload firmware files", messageLower: "FIRMWARE UPDATE FAILED", confirm : false, isError : true}
                });
                viewModel.firmwareStatus = "Upload firmware";
                document.getElementById("firmwareUploadButtonId").disabled = false;
             }
             
        }
        viewModel.apiTokenMake = async function() {
            reqsent.apiToken = true;
            var query = "/db?make_sensotransel_token";
            $http({
                method: 'GET',
                url: query,
            }).then(function (resp){
                let response = resp.data;
                var apiTokenValueLabelId = document.getElementById("apiTokenValueLabelId");
                checkIsAuthenticated(response);
                reqsent.apiToken = false;
                if(response.error == undefined && response.sensotransel_token_value && apiTokenValueLabelId) {
                    apiTokenValueLabelId.innerHTML =  "token_"+response.sensotransel_token_value;
                }
                else {
                    console.log("get token error: " + response.error[0].error + ".");
                    if(apiTokenValueLabelId)
                      apiTokenValueLabelId.innerHTML = "No token"
                }
            },function (error) {
                w8 = 0;
                //currentSessionTime = TimeoutConst; !
                ngDialog.open({
                    data: {message: ["Error:", error.status + "!"], confirm : false},
                    //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                });         
                console.log("Get API token error: " + error.status + "."); 
                reqsent.apiToken = false;
                w8 = 0;
                requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                if(error.status >= 500)
                    resetAuthSubmit();
            });

        }
        viewModel.apiTokenGet = async function() {
            reqsent.apiToken = true;
            var query = "/db?get_sensotransel_token";
            $http({
                method: 'GET',
                url: query,
            }).then(function (resp){
                let response = resp.data;
                var apiTokenValueLabelId = document.getElementById("apiTokenValueLabelId");
                checkIsAuthenticated(response);
                reqsent.apiToken = false;
                if(response.error == undefined && response.sensotransel_token_value && apiTokenValueLabelId) {
                    apiTokenValueLabelId.innerHTML =  "token_"+response.sensotransel_token_value;
                }
                else {
                    console.log("get token error: " + response.error[0].error + ".");
                    if(apiTokenValueLabelId)
                      apiTokenValueLabelId.innerHTML = "No token"
                }
            },function (error) {
                w8 = 0;
                //currentSessionTime = TimeoutConst; !
                ngDialog.open({
                    data: {message: ["Error:", error.status + "!"], confirm : false},
                    //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                });         
                console.log("Get API token error: " + error.status + "."); 
                reqsent.apiToken = false;
                w8 = 0;
                requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                if(error.status >= 500)
                    resetAuthSubmit();
            });
        }
        function internalSubmit(username) {
            //$scope.currentUser = username;                
            viewModel.username = username;

            reqsent.clear();
            if(dataToken() != undefined && dataToken().length) {
                currentSessionTime = TimeoutConst;
                $scope.isAuthenticated = true;
            }


            // ZAPYTANIE O KONFIGURACJE
            var xhttp;

            if (window.XMLHttpRequest) {
                xhttp = new XMLHttpRequest();
            } else {
            // code for IE6, IE5
                xhttp = new ActiveXObject("Microsoft.XMLHTTP");
            }   
            
            // CZYTANIE KONFIGURACJI
            var cfgQuery = "/db?cfg";
            
            xhttp.open("POST", cfgQuery, false);
            
            xhttp.setRequestHeader("Authorization", dataToken());   
            xhttp.send();
            var json_output;
            //obj = eval("(" + xhttp.responseText + ')');
            if(xhttp.responseText == undefined || xhttp.responseText == "")
                json_output = {};
            else {
                if(xhttp.status >= 400) {
                    document.getElementById("globalErr").innerHTML =  "Error: " + xhttp.status;
                    $scope.globalError = true;
                    json_output = {};
                }    
                else {
                    if(xhttp.responseText[0] != "{")
                        json_output = JSON.parse("{" + xhttp.responseText);
                    else
                        json_output = JSON.parse(xhttp.responseText);
                    if(json_output.error != undefined && json_output.error.length && json_output.error[0].error) {
                        document.getElementById("globalErr").innerHTML =  json_output.error[0].error;
                        $scope.globalError = true;
                        json_output = {};
                    } 
                    else {
                        performNodeChangeTimeRefresh(true);
                    }                   
                }
                                
            }
            $scope.response = json_output;            
            //console.log( $scope.response.TimeOut );
            if ( $scope.response.TimeOut === undefined ) {
                TimeoutConst = 600000; // 10 minut
            } 
            else {                
                var TimeoutConstOld = TimeoutConst;
                TimeoutConst = 60000 * parseInt( $scope.response.TimeOut );
                if(TimeoutConst != TimeoutConstOld)
                    currentSessionTime = TimeoutConst;
            }                				                
            if($scope.response.Info != undefined) {
                //POBRANIE SOFRWARE VERSION Z PLIKU FILENAME
                getValToKeyValTable.ifconfigRequests = [];

                for(var n in $scope.response.Info) {
                    for (var main_key in $scope.response.Info[n]) {                        
                        getValToKeyValTable($scope.response.Info[n][main_key], $scope.response.Info[n], main_key);
                    }
                }
                for(var n in $scope.response.Interfaces) {
                    for (var main_key in $scope.response.Interfaces[n]) {
                        if(Array.isArray($scope.response.Interfaces[n][main_key])) {
                            var valueArray = $scope.response.Interfaces[n][main_key];
                            $scope.response.Interfaces[n][main_key] = "";
                            valueArray.forEach(function(val, idx) {              
                                getValToKeyValTable(val, $scope.response.Interfaces[n], main_key, true);
                            })
                        }
                        else
                            getValToKeyValTable($scope.response.Interfaces[n][main_key], $scope.response.Interfaces[n], main_key);
                    }
                }
            }
            if($scope.response.Modules != undefined) {
                var index = 0;      
                for( i=0; i < $scope.response.Modules.length; i++) {
                    if( $scope.response.Modules[i].Binary != undefined ) {  
                        for( j=0; j < $scope.response.Modules[i].Binary.length; j++){
                            digitalConfStatesArray[$scope.response.Modules[i].Binary[j].Index] = {
                                text_off: $scope.response.Modules[i].Binary[j]["Text OFF"],
                                text_on: $scope.response.Modules[i].Binary[j]["Text ON"] 
                            };
                            index++;
                        }
                    }
                } 
                modulesToRead = $scope.response.Modules;                
            }
            if($scope.response.eventLog != undefined) {
                eventLog.channelNo = json_output.eventLog.channelNo;
                if(Array.isArray(json_output.eventLog.valuesBin))
                    eventLog.valuesBin = json_output.eventLog.valuesBin;
                if(Array.isArray(json_output.eventLog.valuesAnl))
                    eventLog.valuesAnl = json_output.eventLog.valuesAnl;
            }
            if($scope.response.alarms != undefined) {
                //załadowanie alarmów
                updateAlarmListView.registered = undefined;
                alarms.channelNo = json_output.alarms.channelNo;
                if(Array.isArray(json_output.alarms.valuesBin))
                    alarms.valuesBin = json_output.alarms.valuesBin;
                if(Array.isArray(json_output.alarms.valuesAnl))
                    alarms.valuesAnl = json_output.alarms.valuesAnl;
            }

            // ODPOWIADA ZA WYŚWIETLANIE DRZEWA
            if ( $scope.isAuthenticated ) {        
                if( authVector().configurationAuth ) {
                    $scope.my_data.push({label: "Info"});
                    if($scope.response.ui != undefined && $scope.response.ui.calibration === true)
                        $scope.my_data.push({label: "Calibration"});
                    if($scope.response.ui != undefined && $scope.response.ui.firmware === true)
                        $scope.my_data.push({label: "Firmware"});
                }                
                if($scope.response.ui != undefined && $scope.response.ui.comtrade === true)
                    $scope.my_data.push({label: "COMTRADE files"});
                if($scope.response.ui != undefined && $scope.response.ui.dmserver === true)
                    $scope.my_data.push({label: "DM Server"});
                if($scope.response.ui != undefined && $scope.response.ui.apiToken === true && authVector().securityAdv)
                    $scope.my_data.push({label: "API token"});
                
                if( authVector().baseAuth) {
                    if(authVector().configurationAuth && Array.isArray($scope.response.Modules)) {
                        var modulesNameArray = [];
                        $scope.response.Modules.forEach(function (element, index) {
                            modulesNameArray[index] = element["Module name"];
                        });    
                        $scope.my_data.push({label: "Modules", children: modulesNameArray});
                    }
                    if($scope.response.ui != undefined && $scope.response.ui.eventlog === true)
                        $scope.my_data.push({label: "Event log"});
                    if($scope.response.ui != undefined && $scope.response.ui.scheme === true)
                        $scope.my_data.push({label: "Scheme"});
                    if($scope.response.ui != undefined && $scope.response.ui.alarmlog === true)
                        $scope.my_data.push({label: "Alarms"});
                }
                if(authVector().logAuth) {
                    var logfiles = [];
                    if($scope.response.ui != undefined && $scope.response.ui.logAuth === true && authVector().securityAdv)
                        logfiles.push('Auth');
                    if($scope.response.ui != undefined && $scope.response.ui.logEmbWatchdog === true)
                        logfiles.push('Watchdog');
                    if($scope.response.ui != undefined && $scope.response.ui.logControls === true)
                        logfiles.push('Controls');
                    if($scope.response.ui != undefined && $scope.response.ui.logModemAt === true)
                        logfiles.push('Modem AT');
                    if($scope.response.ui != undefined && $scope.response.ui.logModemEvents === true)
                        logfiles.push('Modem Events');
                    $scope.my_data.push({label: "Logs", children: logfiles});  
                }               
            }

            $scope.my_tree_handler({label: "Info"});

            document.getElementById("calibAutoMeasCheckId1").checked = true;
            document.getElementById("calibAutoMeasCheckId2").checked = true;
            document.getElementById("calibAutoMeasCheckId3").checked = true;
            document.getElementById("calibAutoIsPhaseCalibCheckId").checked = true;
        }
        //------------------------------------------------------------ 
                                        
        $scope.submit = function () {
            if(logging)
                return;        
            logging = true;
            var username = document.getElementById("user").value;
            var password = document.getElementById("pass").value;
            document.getElementById("user").value = "";
            document.getElementById("pass").value = "";

            var query = "db?auth";
            var postData = "user=" + username + "&pass=" + password + "&auth";
            $http({
                method: 'POST',
                url: query,
                data: postData
            }).then(function (resp){                
                logging = false;
                reqsent.login = false;
                w8 = 0;
                var response = resp.data;
                performNodeChangeTimeRefresh(true);
                checkIsAuthenticated(response);
                dataToken(response.hash);
                authInt = parseInt( response.auth, 16 );
                authVector({
                    baseAuth: Boolean( authInt & 0x8008 ), // 0x4008?
                    controlAuth : Boolean( authInt & 0x4 ),// 8
                    logAuth : Boolean( authInt & 0x20 ),// 128
                    configurationAuth : Boolean( authInt & 0x2 ),// 128 
                    readOnlyAuth: Boolean( authInt & 0x8000), 
                    securityAdv : Boolean( authInt & 0x80)
                });
                internalSubmit(username);
                resetGlobalInfErr();                
                
            },function (error){
                logging = false;
                reqsent.login = false;
                w8 = 0;                    
                if(!$scope.isAuthenticated) {
                    if(error.status == 401)
                        document.getElementById("globalErr").innerHTML = "Error: Invalid user or password";  
                    else
                        document.getElementById("globalErr").innerHTML = "Error: Logging error";  
                    if(error.data.code != undefined && error.data.code != "")
                        document.getElementById("globalErr").innerHTML = error.data.code;
                    $scope.globalError = true;                    
                    resetGlobalInfErr(true, false);
                }    
                if(error.status >= 500)
                    resetAuthSubmit();      
            });

            /*
            $http.post('db?auth', "user=" + username + "&pass=" + password + "&auth")
            .success( function( data, status, headers, config ) {
                logging = false;
                w8 = 0;

                document.getElementById("globalErr").innerHTML = "";
                $scope.globalError = false;
                document.getElementById("globalInf").innerHTML = "";    
                $scope.globalInfo = false;
                $scope.currentUser = username;
                dataToken(data.hash);

                authInt = parseInt( data.auth, 16 );
                authVector({
                    baseAuth: Boolean( authInt & 0x4008 ), 
                    controlAuth : Boolean( authInt & 0x4 ),// 8
                    logAuth : Boolean( authInt & 0x20 ),// 128
                    configurationAuth : Boolean( authInt & 0x8002 )// 128 
                });
                $scope.isAuthenticated = true;


                // ZAPYTANIE O KONFIGURACJE
                var xhttp;

                if (window.XMLHttpRequest) {
                    xhttp = new XMLHttpRequest();
                } else {
                // code for IE6, IE5
                    xhttp = new ActiveXObject("Microsoft.XMLHTTP");
                }   
                
                // CZYTANIE KONFIGURACJI
                xhttp.open("POST", "/db?cfg", false);
                xhttp.setRequestHeader("Authorization", data.hash);   
                xhttp.send();
                var json_output;
                //obj = eval("(" + xhttp.responseText + ')');
                if(xhttp.responseText == undefined || xhttp.responseText == "")
                    json_output = {};
                else {
                    if(xhttp.responseText[0] != "{")
                        json_output = JSON.parse("{" + xhttp.responseText);
                    else
                        json_output = JSON.parse(xhttp.responseText);
                    if(json_output.error != undefined && json_output.error.length && json_output.error[0].error) {
                        document.getElementById("globalErr").innerHTML =  json_output.error[0].error;
                        $scope.globalError = true;
                        json_output = {};
                    }
                }
                $scope.response = json_output;           
                
				//console.log( $scope.response.TimeOut );
				if ( $scope.response.TimeOut === undefined ) {
					TimeoutConst = 600000; // 10 minut
				} else {
					TimeoutConst = 60000 * parseInt( $scope.response.TimeOut );
				}
				
				currentSessionTime = TimeoutConst;
                
                //POBRANIE SOFRWARE VERSION Z PLIKU FILENAME
                for(var n in $scope.response.Info) {
                    for (var main_key in $scope.response.Info[n]) {
                        getValToKeyValTable($scope.response.Info[n][main_key], $scope.response.Info[n], main_key);
                    }
                }
                for(var n in $scope.response.Interfaces) {
                    for (var main_key in $scope.response.Interfaces[n]) {
                        getValToKeyValTable($scope.response.Interfaces[n][main_key], $scope.response.Interfaces[n], main_key);
                    }
                }

                var index = 0;      
                for( i=0; i < $scope.response.Modules.length; i++) {
                    if( $scope.response.Modules[i].Binary != undefined ) {  
                        for( j=0; j < $scope.response.Modules[i].Binary.length; j++){
                            digitalConfStatesArray[index] = {
                                text_off: $scope.response.Modules[i].Binary[j]["Text OFF"],
                                text_on: $scope.response.Modules[i].Binary[j]["Text ON"] 
                            };
                            index++;
                        }
                    }
                } 

                // WYŚWIETLANIE DRZEWA  
                var modulesNameArray = [];
                $scope.response.Modules.forEach(function (element, index) {
                    modulesNameArray[index] = element["Module name"];
                });    

                // PRZEKIEROWANIA OBŁUGA KLIKNIEC NA DRZEWIE                                                                
                $scope.my_tree_handler = function(branch) {
                    var _ref;
                    currentSessionTime = TimeoutConst;
                    
					if (branch.label != $scope.currentSelection) {
						$('#navSec').stop().animate({ scrollTop: 0 }, 0);
					}
					
					
                    $scope.currentSelection = branch.label;
                    $scope.textToSelect = branch.label;

                    if (branch.label == "Info"){
                        $scope.output = $scope.response;
                    } else if (branch.label == "DM Server") {
						
						;//console.log("DM Server");

						
					}
                    else if (branch.label == "Modules"){
                        $scope.output = "";
                    } 
                    else if (branch.label == "Logs"){
                        $scope.output = "";
                    } 
                    else {
                        for (var i=0; i < $scope.response.Modules.length; i++) {
                            if (branch.label == $scope.response.Modules[i]["Module name"]){
                                $scope.output = $scope.response.Modules[i];
                                if(authVector().controlAuth == false) {
                                    $scope.output.Control = {};
                                }
                                $scope.currentSelModule = $scope.response.Modules[i]["Module name"];
                                $scope.currentSelection = "Module";

                                baseRead();

                            }
                        }
                    }


                    if (branch.label == "Auth"){
                        $http.post("/db?log", "auth")
                        .success(function(response) {
                            fill_logfile(response);    
                        });             
                    } 
                    else if (branch.label == "Controls"){
                        $http.post("/db?log", "controls")
                        .success(function(response) {
                            fill_logfile(response);
                        }); 
                    } 
                    else if (branch.label == "Watchdog"){
                        $http.post("/db?log", "emb_watchdog.log")
                        .success(function(response) {
                            fill_logfile(response);   
                        }); 
                    } 
                    else if(document.getElementById("logTable") != undefined){
                        document.getElementById("logTable").innerHTML = "";
                    }
                };
                app.directive('treeDirective', function() {
                    return {
                        restrict: 'E',
                        transclude: true,
                        templateUrl: 'my-dialog.html'
                    };
                });

                // ODPOWIADA ZA WYŚWIETLANIE DRZEWA
                if ( $scope.isAuthenticated ) {        
                    if( authVector().configurationAuth ) {$scope.my_data.push({label: "Info"})};
                    
					$scope.my_data.push({label: "DM Server"});
					
					if( authVector().baseAuth && authVector().configurationAuth ) 
                    	{$scope.my_data.push({label: "Modules", children: modulesNameArray})};       
                    if( authVector().logAuth ) 
                    	{$scope.my_data.push({label: "Logs", children: ['Auth','Controls','Watchdog']})};        
                }

				$scope.my_tree_handler({label: "Info"});
            }) // end of success !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            .error( function( data, status, headers, config ) {
                logging = false;
                w8 = 0;

                if(!$scope.isAuthenticated) {
                    if(status == 401)
                        document.getElementById("globalErr").innerHTML = "Error: Invalid user or password";  
                    else
                        document.getElementById("globalErr").innerHTML = "Error: Logging error";  
                    if(data.code != undefined && data.code != "")
                        document.getElementById("globalErr").innerHTML = data.code;
                    $scope.globalError = true;
                    document.getElementById("globalInf").innerHTML = "";    
                    $scope.globalInfo = false;
                }        
            });
            */
        };  

        $scope.logout = function () {
            $scope.isAuthenticated = false;
            authVector({
                baseAuth: false,
                controlAuth : false,
                logAuth : false,
                configurationAuth : false
            });
            reqsent.clear();
            
            $scope.my_data = [{label: "Login"}];
            $scope.textToSelect = "Login";
            $scope.currentUser = '';

            document.getElementById("globalErr").innerHTML = "";
            //document.getElementById("logTableUpper").innerHTML = "";
			$scope.globalError = false;
            
            $scope.analogArray = [];        
            $scope.digitalArray = [];
            $scope.response = {};
            $scope.output = {};
			$scope.showOnLine = false;

            var query = "/db?logout";
            var postData = "";                
            $http({
                method: 'POST',
                url: query,
                data: postData
            }).then(function (resp){
                reqsent.logout = false;
                performNodeChangeTimeRefresh();
                checkIsAuthenticated(resp.data);
                document.getElementById("globalInf").innerHTML = "You have been logged out";
                $scope.globalInfo = true;
                //dataToken("");
                //currentSessionTime = TimeoutConst;
                if($scope.currentSelection == "Odśwież")
                    location.reload(true);
                resetAuthSubmit();                
            },function (error){
                reqsent.logout = false;
                if($scope.currentSelection == "Odśwież")
                    location.reload(true);
                if(error.status >= 500)
                    resetAuthSubmit();
            });
            /*$http.post( "/db?logout", "" )
            .success(function(response) {
                document.getElementById("globalInf").innerHTML = "You have been logged out";    
                $scope.globalInfo = true;
                dataToken("");
                currentSessionTime = TimeoutConst;
            });*/

        };
        function IncrementTestowyLicznikNaIndeksie() {
            if(drawingObject.testowyLicznikNaIndeksie.index == undefined || parseInt(drawingObject.testowyLicznikNaIndeksie.index) == undefined)
                return;
            //test !!!
            if(authVector().readOnlyAuth) {
                mouseOverCtrl.reference = undefined;
                mouseOverCtrl.locked = false;
                ngDialog.open({
                    data: {message: ["Operation is not permitted"], confirm : false}, 
                    //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                });                    
                return;
            }
            var value = 0;
            if(drawingObject.testowyLicznikNaIndeksie.value != undefined)
                value = (++drawingObject.testowyLicznikNaIndeksie.value);
            reqsent.bazaSet = true;
            attachHashData = true;
            $http({
                method: 'POST',
                url: "/db?set_anl",
                data: drawingObject.testowyLicznikNaIndeksie.index + ",1," + value
            }).then(function (resp){
                checkIsAuthenticated(resp.data);
                reqsent.bazaSet = false;
                //currentSessionTime = TimeoutConst;
            },function (error){
                //currentSessionTime = TimeoutConst; !
                mouseOverCtrl.reference = undefined;
                mouseOverCtrl.locked = false;
                ngDialog.open({
                    data: {message: ["Error:", error.status + "!"], confirm : false},
                    //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                });
                reqsent.bazaSet = false;                    
                if(error.status >= 500)
                    resetAuthSubmit();
            });   
        }
        //------------------------------------------------------------ 		                    
                                        
        $scope.control = function ( signal_name, index ) {
            //currentSessionTime = TimeoutConst;
            mouseOverCtrl.reference = undefined;
            mouseOverCtrl.locked = false;

            if(!authVector().controlAuth) {
                ngDialog.open({
                    data: {message: ["Operation is not permitted"], confirm : false}, 
                });
                return;
            }

            ngDialog.openConfirm({
                    data: {message : ["Do you want to perform control with:", signal_name + "?"], confirm : true},
                    //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; }
                
            }).then(function (value) {                
                var query = "/db?ctrl";
                var postData = index;
                reqsent.control = true;
                $http({
                    method: 'POST',
                    url: query,
                    data: postData
                }).then(function (resp){
                    var response = resp.data;
                    performNodeChangeTimeRefresh(true);
                    //currentSessionTime = TimeoutConst;
                    checkIsAuthenticated(response);
                    reqsent.control = false;
                    //currentSessionTime = TimeoutConst;
                    if(response.error == undefined) {
                        ngDialog.open({
                            data: {message: ["Control accepted!"], confirm : false},
                            //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                        });
                    }
                    else {
                        var msg = "unknown error + (" + response.response + ")";
                        if(response.response_desc != undefined)
                            msg = response.response_desc;
                        else if(Array.isArray(response.error) && response.error.length > 0 && response.error[0].error)
                            msg = response.error[0].error;
                        ngDialog.open({                            
                            data: {message: [msg], confirm : false},
                            //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                        });
                    }
                },function (error) {
                    w8 = 0;
                    //currentSessionTime = TimeoutConst; !
                    ngDialog.open({
                        data: {message: ["Control sending error:", error.status + "!"], confirm : false},
                        //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                    });
                    reqsent.control = false;

                    w8 = 0;
                    requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                    if(error.status >= 500)
                        resetAuthSubmit();
                });
            });     
        };
        //------------------------------------------------------------ 	
        function SetIndex(index, flag, value = undefined) {             
            if(authVector().readOnlyAuth) {
                mouseOverCtrl.reference = undefined;
                mouseOverCtrl.locked = false;
                ngDialog.open({
                    data: {message: ["Operation is not permitted"], confirm : false}, 
                    //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                });                    
                return -1;
            }

            //currentSessionTime = TimeoutConst; !                
            reqsent.bazaSet = true;
            attachHashData = true;
            var query;
            var postData = index + "," + flag;
            //if(value.search(/^0x[0-8A-F]{2}$/i) == 0)
            reqsent.bazaSet = true;
            if(value == undefined)
                query = "/db?set_bin";
            else {
                query = "/db?set_anl";
                postData += "," + value.toString().replace(",", ".");
            }   
            $http({
                method: 'POST',
                url: query,
                data: postData
            }).then(function (resp){
                checkIsAuthenticated(resp.data);
                reqsent.bazaSet = false;
                //currentSessionTime = TimeoutConst;
                if(value != undefined)
                    IncrementTestowyLicznikNaIndeksie();
            },function (error){
                //currentSessionTime = TimeoutConst; !
                mouseOverCtrl.reference = undefined;
                mouseOverCtrl.locked = false;
                ngDialog.open({
                    data: {message: ["Error:", error.status + "!"], confirm : false},
                    //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                });
                reqsent.bazaSet = false;
                if(error.status >= 500)
                    resetAuthSubmit();
            });          
            //SetIndex(mouseOverCtrl.reference.we, flag, analogSetValue);
            return 0;
        };
        //------------------------------------------------------------ 	
        function analogControl(index, valueAnalog) {
            mouseOverCtrl.reference = undefined;
            mouseOverCtrl.locked = false;

            if(!authVector().controlAuth) {
                ngDialog.open({
                    data: {message: ["Operation is not permitted"], confirm : false}, 
                });
                return;
            }
            //currentSessionTime = TimeoutConst; !
            var indexCpy = index.toString();
            var valueCpy = valueAnalog.toString();
            ngDialog.openConfirm({
                    data: {message : ["Please confirm the execution of analogue control of index " + indexCpy + " to: " + valueCpy + " value"], confirm : true},
                    closeByDocument: false,
                    preCloseCallback: function(value) {}
                
            }).then(function (value) {                    
                reqsent.control = true;
                attachHashData = true;
                //currentSessionTime = TimeoutConst; !
                var query = "/db?ctrl_analog";

                var postData = "" + index + "(" + valueAnalog.toString().replace(",", ".") + ")";
                $http({
                    method: 'POST',
                    url: query,
                    data: postData
                }).then(function (resp){
                    var response = resp.data;  
                    checkIsAuthenticated(response);                      
                    reqsent.control = false;
                    //currentSessionTime = TimeoutConst;
                    if(response.error == undefined) {
                        ngDialog.open({
                            data: {message: ["Accepted"], confirm : false},
                            //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                        });
                        IncrementTestowyLicznikNaIndeksie();
                    }
                    else {
                        ngDialog.open({
                            data: {message: [response.error[0].error], confirm : false},
                            //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                        });
                    }                        
                },function (error){
                    ngDialog.open({
                        data: {message: ["Error:", error.status + "!"], confirm : false},
                        //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                    });
                    reqsent.control = false;
                    if(error.status >= 500)
                        resetAuthSubmit();
                });
            },
            (error) => {
                console.log(error);
            });
        }
        //------------------------------------------------------------ 											
		$scope.dmConnect = function() {
			console.log("DM connection");
			
			//currentSessionTime = TimeoutConst;
			$scope.accountsFlag = false;
			
			
            ngDialog.openConfirm({
                    data: {message : ["Do you want to force DM server connection?"], confirm : true},
                    //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; }
                
            }).then(function (value) {
                //currentSessionTime = TimeoutConst;

				
                $http.get( "/db?emb_dm" ).success(function(response) {
                    if( response.error == undefined ) {
                        performNodeChangeTimeRefresh(true);
						console.log(response);						
                    }
                    else {
                        ngDialog.open({
                            data: {message: [response.error[0].error], confirm : false},
                            //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; }

                        });
                    }
                })
                .error(function (status) {
                    ngDialog.open({
                        data: {message: ["Control sending error:", status + "!"], confirm : false},
                        //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; }
                    });
                });
            });
			
			
		}

        $scope.getCellStyleFor = function(index, type) {
            /*var ret_style = {'background' : '', 'text-align' : 'center', 'font-weight' :'bold'};
            if(type == "digital" && index < $scope.digitalArray.length) {
                if(Boolean($scope.digitalArray[index].flag & 4))
                    ret_style.background = 'rgba(230, 75, 75, 0.5)';
            }
            else if(type == "analog" && index < $scope.analogArray.length) {
                if(Boolean($scope.analogArray[index].flag & 4))
                    ret_style.background = 'rgba(230, 75, 75, 0.5)';
            }
            return ret_style;*/
            var ret_style;
            if(type == "digital" && index < $scope.digitalArray.length) {
                if($scope.digitalArray[index] == undefined)
                    return null;
                ret_style = flagToBackground($scope.digitalArray[index].flag, true);
            }
            else if(type == "analog" && index < $scope.analogArray.length) {
                ret_style = {'background' : '', 'text-align' : 'center', 'font-weight' :'bold'};//flagToBackground($scope.analogArray[index].flag);
            }
            return ret_style;
        };
        $scope.getTextStyleFor = function(index, type) {
            /*var ret_style = {'background' : '', 'text-align' : 'center', 'font-weight' :'bold', 'display' : 'initial', 'white-space' : 'normal'};
            if(type == "digital" && index < $scope.digitalArray.length) {
                if(Boolean($scope.digitalArray[index].flag & 128))
                    ret_style.background = 'rgba(255, 56, 56, 0.7)';
                else
                    ret_style.background = 'rgba(0, 235, 9, 0.7)';
            }
            return ret_style;*/
            var ret_style; 
            if(type == "digital") {
                if($scope.digitalArray[index] == undefined)
                    return null;
                ret_style = flagToBackground($scope.digitalArray[index].flag);
            }
            else if(type = 'analog') {
                if($scope.analogArray[index] == undefined)
                    return null;
                ret_style = flagToBackground($scope.analogArray[index].flag);
            }
            ret_style['display'] = 'initial';
            ret_style['white-space'] = 'normal';
            return ret_style;
        };
        function flagToBackground(flag, stateOnly = false) {
            var ret_style = {'background' : '', 'text-align' : 'center', 'font-weight' :'bold'};
            if(Number.isNaN(flag)) {
                return ret_style;
            }
            if(stateOnly) {
                if(flag & 0x80)
                    ret_style.background = 'rgba(255, 56, 56, 0.7)';
                else
                    ret_style.background = 'rgba(0, 235, 9, 0.7)';          
            }
            else {
                if(flag & 4)
                    ret_style.background = 'rgba(230, 75, 75, 0.5)';
                else if(!(flag & 0x01))
                    ret_style.background = 'rgba(94, 154, 245, 0.5)';            
                else
                    ret_style.background = 'none';
            }
            return ret_style;
        }
        function flagToForeground(flag, stateOnly = false) {
            var ret_style = flagToBackground(flag, stateOnly);
            ret_style.color = ret_style.background;
            ret_style.background = 'none';
            return ret_style;
        }
        //------------------------------------------------------------ 
        function resetCalibProgressBar() {
            var calibButton = document.getElementById("calibAutoButtonDiv");
            if(calibButton == undefined)
                return;
            var calibProgressBar = calibButton.getElementsByClassName('pgress')[0];
            if(calibProgressBar == undefined)
                return;
            viewModel.calibrationStatus = "Go!"; 
            if (calibButton.classList.contains("active"))
                calibButton.classList.remove("active");
            calibProgressBar.style.width = '0%';
        }
        function resetCalibExportProgressBar() {
            var exportButton = document.getElementById("calibExportButtonDiv");
            if(exportButton == undefined)
                return;
            var exportProgressBar = exportButton.getElementsByClassName('pgress')[0];
            if(exportProgressBar == undefined)
                return;
            viewModel.calibrationExportStatus = "Export to a file on SD card";
            if (exportButton.classList.contains("active"))
                exportButton.classList.remove("active");
            exportProgressBar.style.width = '0%';
        }
        function resetCalibImportProgressBar() {
            var importButton = document.getElementById("calibImportButtonDiv");
            if(importButton == undefined)
                return;
            var importProgressBar = importButton.getElementsByClassName('pgress')[0];
            if(importProgressBar == undefined)
                return;
            viewModel.calibrationImportStatus = "Import from a file on SD card";
            if (importButton.classList.contains("active"))
                importButton.classList.remove("active");
            importProgressBar.style.width = '0%';
        }
        function setCalibrating(isRunning = true) {
            document.getElementById("calibAutoMeasCheckId1").disabled = isRunning;
            document.getElementById("calibAutoMeasCheckId2").disabled = isRunning;
            document.getElementById("calibAutoMeasCheckId3").disabled = isRunning;
            document.getElementById("calibReferenceInputId").disabled = isRunning;
            document.getElementById("calibConnTypeSelectId").disabled = isRunning;
            document.getElementById("calibAutoIsPhaseCalibCheckId").disabled = isRunning;
            document.getElementById("calibIpr1AmplGain1Id").disabled = isRunning;
            document.getElementById("calibIpr1AmplGain2Id").disabled = isRunning;
            document.getElementById("calibIpr1AmplGain3Id").disabled = isRunning;
            document.getElementById("calibIpr2AmplGain1Id").disabled = isRunning;
            document.getElementById("calibIpr2AmplGain2Id").disabled = isRunning;
            document.getElementById("calibIpr2AmplGain3Id").disabled = isRunning;
            document.getElementById("calibIpr3AmplGain1Id").disabled = isRunning;
            document.getElementById("calibIpr3AmplGain2Id").disabled = isRunning;
            document.getElementById("calibIpr3AmplGain3Id").disabled = isRunning;
            document.getElementById("calibExportImportSelectId").disabled = isRunning;
            document.getElementById("calibAutoButton").disabled = isRunning;
            document.getElementById("calibImportButton").disabled = isRunning;
            document.getElementById("calibExportButton").disabled = isRunning;
            reqsent.calibrate = isRunning;
        }
        var requestStatusInfoError = function (status, data){                                    

            if(status == 401)
            {
                console.log('You have been logged out');
                document.getElementById("globalInf").innerHTML = "You have been logged out";    
                $scope.globalInfo = true;
                $scope.logout(); // Inforamcja o wylogowaniu juz zawarta w funckji
                //alert('You will be logged out');
            }
            else if(status >= 500)
            {
                console.log('Server error');
                document.getElementById("globalInf").innerHTML = "Server error";    
                $scope.globalInfo = true;
            }
            else
            {
                console.log('Request or client error');
                document.getElementById("globalErr").innerHTML = "Request or client error";
                $scope.globalError = true;
            }        
            if(data.code != undefined && data.code != "") {
                if($scope.globalError)
                    document.getElementById("globalErr").innerHTML = data.code;
                else if($scope.globalInfo)
                    document.getElementById("globalInf").innerHTML = data.code;
            }
        };
        //------------------------------------------------------------ 
        var calibProgressCurrentNumber = 0;
        var calibProgressMaxNumber = 1;
        resetCalibProgressBar();
        //viewModel.calibrationStatus = "Go!";
        viewModel.calibStartPost = async function() {
            var calibrateIPR1 = true;//document.getElementById("calibIpr1AmplCheckId").checked;
            var calibrateIPR2 = true;//document.getElementById("calibIpr2AmplCheckId").checked;
            var calibrateIPR3 = true;//document.getElementById("calibIpr3AmplCheckId").checked;
            var calibrate1 = document.getElementById("calibAutoMeasCheckId1").checked;
            var calibrate2 = document.getElementById("calibAutoMeasCheckId2").checked;
            var calibrate3 = document.getElementById("calibAutoMeasCheckId3").checked;
            var calibButton = document.getElementById("calibAutoButtonDiv");
            var calibProgressBar = calibButton.getElementsByClassName('pgress')[0];

            if(reqsent.calibrate)
                return;

            if(!calibrate1 && !calibrate2 && !calibrate3) {
                ngDialog.open({
                    data: {message: ["No measurement module chosen. Please check at least one."], messageLower: "CALIBRATION STOPPED", confirm : false, isError : true},
                    preCloseCallback: function() { 
                        resetCalibProgressBar();
                    }
                });
                return;
            }

            if (!calibButton.classList.contains("active")) {
                calibButton.classList.add("active");
            }

            calibProgressMaxNumber = 1.0, calibProgressCurrentNumber = 0;
            calibProgressBar.style.width = (calibProgressCurrentNumber * 100)/calibProgressMaxNumber + "%";
            
            viewModel.calibrationStatus = "In progress...";                  
            
            if(reqsent.calibrate)
                return;
            setCalibrating();
            
            if(calibrateIPR1)
                calibProgressMaxNumber++;
            if(calibrateIPR2)
                calibProgressMaxNumber++;
            if(calibrateIPR3)
                calibProgressMaxNumber++;
            if(calibrate1)
                calibProgressMaxNumber++;
            if(calibrate2)
                calibProgressMaxNumber++;
            if(calibrate3)
                calibProgressMaxNumber++;
            setTimeout(60000);     
            viewModel.calibSetPost(calibrateIPR1, calibrateIPR2, calibrateIPR3);
            var cablibrateIprNum = (calibrateIPR1 ? 1 : 0) + (calibrateIPR2 ? 1 : 0)+ (calibrateIPR3 ? 1 : 0)
            while(calibProgressCurrentNumber + viewModel.calibSetPost.failedNumber < cablibrateIprNum)  {                
                await new Promise(r => setTimeout(r, 1000));                
            };
            setCalibrating(false);
            if(viewModel.calibSetPost.failedNumber) {
                resetCalibProgressBar();
                
            }
            else
                viewModel.calibAutoPost();
        }
        viewModel.calibAutoPost = function() {
            var calibButton = document.getElementById("calibAutoButtonDiv");
            var calibProgressBar = calibButton.getElementsByClassName('pgress')[0];
            var calibrate1 = document.getElementById("calibAutoMeasCheckId1").checked;
            var calibrate2 = document.getElementById("calibAutoMeasCheckId2").checked;
            var calibrate3 = document.getElementById("calibAutoMeasCheckId3").checked;
            var calibrateNums = (calibrate1 ? 1 : 0) | ((calibrate2 ? 1 : 0)<<1) | ((calibrate3 ? 1 : 0)<<2);
            var referenceU = parseFloat(document.getElementById("calibReferenceInputId").value);
            if(Number.isNaN(referenceU))
                referenceU = 0.0;
            var connectionType = document.getElementById("calibConnTypeSelectId").selectedOptions[0].label;
            var phaseCalib = document.getElementById("calibAutoIsPhaseCalibCheckId").checked;

            var query = "db?calibration";
            var postData = "external " + calibrateNums + " " + referenceU + " " + (connectionType == "In-phase" ? "0" : "1") + " " + (phaseCalib ? 1 : 0);

            if(query != undefined && postData != undefined && !reqsent.calibrate) {
                setCalibrating();
                $http({
                    method: 'POST',
                    url: query,
                    data: postData
                }).then(function (resp){
                    setCalibrating(false);
                    w8 = 0;
                    var strings = resp.data.returnStrings;                    
                    if(Array.isArray(strings)) {
                        calibProgressCurrentNumber++;
                        calibProgressBar.style.width = (calibProgressCurrentNumber * 100)/calibProgressMaxNumber + "%";

                        var errorLabels = [];
                        var doneLabels = [];
                        var errorMsgs = [];
                        var isError = false;
                        if(calibrate1) {
                            errorLabels.push({idx: 1, val: "external_calibration[0] error: "});
                            doneLabels.push({idx: 1, val: "external_calibration[0]: done"});
                        }
                        if(calibrate2) {
                            errorLabels.push({idx: 2, val: "external_calibration[1] error: "});
                            doneLabels.push({idx: 2, val: "external_calibration[1]: done"});
                        }
                        if(calibrate3) {
                            errorLabels.push({idx: 3, val: "external_calibration[2] error: "});
                            doneLabels.push({idx: 3, val: "external_calibration[2]: done"});
                        }
                        errorLabels.forEach((el) => {
                            var found = strings.find(function(str) { return str.startsWith(el.val)});
                            if(found != undefined) {
                                isError = true;                                
                                errorMsgs.push("Measurement module no. " + el.idx + ": " + found.slice(el.val.length));
                                
                                calibProgressCurrentNumber++;
                                calibProgressBar.style.width = (calibProgressCurrentNumber * 100)/calibProgressMaxNumber + "%";
                                if(calibProgressCurrentNumber >= calibProgressMaxNumber) {
                                    resetCalibProgressBar();
                                }                                                                 
                            }                   
                        });
                        doneLabels.forEach((dl) => {
                            var found = strings.find(function(str) { return str.startsWith(dl.val)});
                            if(found != undefined) {
                                var postDataSave = "external_save " + (dl.idx-1);
                                setCalibrating();
                                $http({
                                    method: 'POST',
                                    url: query,
                                    data: postDataSave
                                }).then(function (resp){
                                    setCalibrating(false);
                                    w8 = 0;
                                    var strings = resp.data.returnStrings;
                                    if(Array.isArray(strings)) {
                                    }
                                    calibProgressCurrentNumber++;
                                    calibProgressBar.style.width = (calibProgressCurrentNumber * 100)/calibProgressMaxNumber + "%";
                                    if(calibProgressCurrentNumber >= calibProgressMaxNumber) {
                                        resetCalibProgressBar();
                                    }
                                    checkIsAuthenticated(resp.data);
                                },function (error) {
                                    setCalibrating(false);
                                    w8 = 0;                    
                                    requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                                    resetCalibProgressBar();
                                    if(error.status >= 500)
                                        resetAuthSubmit();
                                });
                                var foundPhase = strings.find(function(str) { return str.startsWith("[" + (dl.idx-1).toString() + "] ui_phase:")});
                                errorMsgs.push("Measurement module no. " + dl.idx + ": success! " + (foundPhase == undefined ? "" : foundPhase));
                            }                            
                        });                        
                        ngDialog.open({
                            data: {message: errorMsgs, messageLower: "CALIBRATION FINISHED", confirm : false, isError : isError},
                            preCloseCallback: function() {}
                        });
                        
                    }
                    else {
                        calibProgressCurrentNumber += calibrate1 + calibrate2 + calibrate3 + 1; // as for external_save         
                        calibProgressBar.style.width = (calibProgressCurrentNumber * 100)/calibProgressMaxNumber + "%";                                   
                        if(calibProgressCurrentNumber >= calibProgressMaxNumber) {
                            resetCalibProgressBar();
                        }             
                    }       
                    checkIsAuthenticated(resp.data);
                    performNodeChangeTimeRefresh(true);
                    //wyświetl dane!
                },function (error) {
                    setCalibrating(false);
                    w8 = 0;                    
                    requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                    resetCalibProgressBar();
                    if(error.status >= 500)
                        resetAuthSubmit();
                });
            }
        }
        viewModel.calibSetPost = function(ipr1 = false, ipr2 = false, ipr3 = false) {            
            var calibButton = document.getElementById("calibAutoButtonDiv");
            var calibProgressBar = calibButton.getElementsByClassName('pgress')[0];

            var query = "db?calibration";
            viewModel.calibSetPost.failedNumber = 0;


            async function setIpr (number = -1) {
                return new Promise((resolve, reject) => {
                    if(number < 0 || number >2 || number % 1 !== 0)
                        reject(1);
                    var IPRGainU1 = parseFloat(document.getElementById("calibIpr" + (number+1) + "AmplGain1Id").value);
                    var IPRGainU2 = parseFloat(document.getElementById("calibIpr" + (number+1) + "AmplGain2Id").value);
                    var IPRGainU3 = parseFloat(document.getElementById("calibIpr" + (number+1) + "AmplGain3Id").value);      
                    
                    var postData = "set " + number + " 0 " + IPRGainU1 + " " + IPRGainU2 + " " + IPRGainU3 + " 1 0 0 0 0"
                    if(query != undefined && postData != undefined) {
                        //reqsent.calibrate = true;   
                        $http({
                            method: 'POST',
                            url: query,
                            data: postData
                        }).then(function (resp){
                            w8 = 0;                                                        
                            checkIsAuthenticated(resp.data);
                            //performNodeChangeTimeRefresh(true);                            
                            resolve(0);
                        },function (error){
                            w8 = 0;                            
                            requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                            if(error.status >= 500)
                                resetAuthSubmit();
                            reject(-1);                                
                        });
                    }
                });                
            };       
            
            //reqsent.calibrate = true;
            if(ipr1)
                setIpr(0).then((success) => {calibProgressCurrentNumber++; calibProgressBar.style.width = (calibProgressCurrentNumber * 100)/calibProgressMaxNumber + "%";}, (failure) => {viewModel.calibSetPost.failedNumber++});
            if(ipr2)
                setIpr(1).then((success) => {calibProgressCurrentNumber++; calibProgressBar.style.width = (calibProgressCurrentNumber * 100)/calibProgressMaxNumber + "%";}, (failure) => {viewModel.calibSetPost.failedNumber++});
            if(ipr3)
                setIpr(2).then((success) => {calibProgressCurrentNumber++; calibProgressBar.style.width = (calibProgressCurrentNumber * 100)/calibProgressMaxNumber + "%";}, (failure) => {viewModel.calibSetPost.failedNumber++});
            //reqsent.calibrate = false;
            //performNodeChangeTimeRefresh(true);
            


            /*return new Promise((resolve, reject) => {               
                if(reqsent.calibrate)
                    reject();
                else {
                    reqsent.calibrate = true;
                    if(ipr1)
                        setIpr(0).then((success) => {calibProgressCurrentNumber++; }, (failure) => {failedNumber++});
                    if(ipr2)
                        setIpr(1).then((success) => {calibProgressCurrentNumber++; }, (failure) => {failedNumber++});
                    if(ipr3)
                        setIpr(2).then((success) => {calibProgressCurrentNumber++; }, (failure) => {failedNumber++});
                    reqsent.calibrate = false;
                    
                    while(calibProgressCurrentNumber + failedNumber < 3) {
                        await new Promise(r => setTimeout(r, 1000));
                    };

                    if(failedNumber > 0)
                        reject();                    
                    else 
                        resolve();
                    performNodeChangeTimeRefresh(true);
                }
            });*/
        }
        resetCalibExportProgressBar();
        resetCalibImportProgressBar();
        //viewModel.calibrationImportStatus = "Import from a file on SD card";
        //viewModel.calibrationExportStatus = "Export to a file on SD card";
        function calibImportExport(postData, isImport) {
            var query = "db?calibration"; 
            return new Promise((resolve, reject) => {                                
                if(postData != undefined && !reqsent.calibrate) {
                    setCalibrating();
                    if(isImport) {
                        viewModel.calibrationImportStatus = "In progress...";
                    }
                    else {
                        viewModel.calibrationExportStatus = "In progress...";
                    }
                    $http({
                        method: 'POST',
                        url: query,
                        data: postData
                    }).then(function (resp) {
                        if(isImport) {
                            resetCalibImportProgressBar();
                            //viewModel.calibrationImportStatus = "Import from a file on SD card";
                        }
                        else {
                            resetCalibExportProgressBar();
                            //viewModel.calibrationExportStatus = "Export to a file on SD card";                   
                        }
                        setCalibrating(false);
                        w8 = 0;
                        checkIsAuthenticated(resp.data);
                        performNodeChangeTimeRefresh(true);                               
                        resolve();                 
                        //wyświetl dane!
                    },function (error){
                        if(isImport)
                            resetCalibImportProgressBar();
                            //viewModel.calibrationImportStatus = "Import from a file on SD card";
                        else
                            resetCalibExportProgressBar();
                            //viewModel.calibrationExportStatus = "Export to a file on SD card";
                        setCalibrating(false);
                        w8 = 0;
                        requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                        if(error.status >= 500)
                            resetAuthSubmit();
                        reject();
                    });
                }
                else
                    reject();
            });
        }
        
        viewModel.calibImportPost = async function() {
            var calibExportImportSelected = document.getElementById("calibExportImportSelectId").selectedOptions[0];
            var importButton = document.getElementById("calibImportButtonDiv");
            var importProgressBar = importButton.getElementsByClassName('pgress')[0];       
            
            if (!importButton.classList.contains("active"))
                importButton.classList.add("active");

            importProgressBar.style.width = "0%";
            
            if(calibExportImportSelected.index == 3) {                                
                await calibImportExport("sd_import 0", true);
                importProgressBar.style.width = "33%";
                await calibImportExport("sd_import 1", true);
                importProgressBar.style.width = "66%";
                await calibImportExport("sd_import 2", true, importProgressBar);                
            }
            else            
                await calibImportExport("sd_import " + calibExportImportSelected.index, true, importProgressBar);
            //importProgressBar.style.width = "100%";
            //await new Promise(r => setTimeout(r, 500));   
            //resetCalibImportProgressBar();
        }
        viewModel.calibExportPost = async function() {
            var calibExportImportSelected = document.getElementById("calibExportImportSelectId").selectedOptions[0];
            var exportButton = document.getElementById("calibExportButtonDiv");
            var exportProgressBar = exportButton.getElementsByClassName('pgress')[0];
            
            if (!exportButton.classList.contains("active"))
                exportButton.classList.add("active");
            exportProgressBar.style.width = "0%";

            if(calibExportImportSelected.index == 3) {
                await calibImportExport("external_save 0", false);
                exportProgressBar.style.width = "33%";
                await calibImportExport("external_save 1", false);
                exportProgressBar.style.width = "66%";
                await calibImportExport("external_save 2", false, exportProgressBar);
            }
            else            
                calibImportExport("external_save " + calibExportImportSelected.index, false, exportProgressBar);
            //exportProgressBar.style.width = "100%";
            //await new Promise(r => setTimeout(r, 500));   
            //exportProgressBar.style.width = "0%";
            //resetCalibExportProgressBar();
        }
        viewModel.downloadEvents = function() {
            var stringToSave = "No;Index;Signal name;Timestamp;Value(string);Value(hex)";
            eventLogData.rows.forEach((row) => {
                if(stringToSave != "") 
                    stringToSave += "\n";
                stringToSave += row.number + ";" + row.index + ";" + row.descr + ";" + row.timestamp + ";" + row.valueStr + ";" + row.value;
            });
            var a = document.createElement('a');
            //var file = new Blob(["abcd;efgh"], {type: 'text/csv'});
            //a.href = URL.createObjectURL(file);
            a.href = "data:application/octet-stream,"+encodeURIComponent(stringToSave);
            var dateString = (new Date()).toLocaleString().replaceAll(".", "").replaceAll(":", "").replaceAll(",",  "").replaceAll(" ",  "T");
            a.download = "events_" + dateString + ".csv";
            a.click();
        }

        viewModel.checkMoreLogsAvail = function() {
            var number = 0;
            if(fillLogData.lastAuthFile == undefined)
                fillLogData.lastAuthFile = "auth";
            if(fillLogData.lastControlsFile == undefined)
                fillLogData.lastControlsFile = "controls";
            if(fillLogData.lastWatchdogFile == undefined)
                fillLogData.lastWatchdogFile = "emb_watchdog.log";
                
            if($scope.currentSelection == "Auth") {                    
                if(fillLogData.lastAuthFile.lastIndexOf('.') != -1)
                    number = parseInt(fillLogData.lastAuthFile.slice(fillLogData.lastAuthFile.lastIndexOf('.')+1));
                if(number != undefined) {    
                    if(isNaN(number))
                        number = 0;                
                    fillLogData.lastAuthFile = "auth." + (number+1) + ""
                }
                fillLogData($scope.currentSelection, fillLogData.lastAuthFile);
            }       
            else if ( $scope.currentSelection == "Controls" ) {
                if(fillLogData.lastControlsFile.lastIndexOf('.') != -1)
                    number = parseInt(fillLogData.lastControlsFile.slice(fillLogData.lastControlsFile.lastIndexOf('.')+1));
                if(number != undefined) {    
                    if(isNaN(number))
                        number = 0;                
                    fillLogData.lastControlsFile = "controls." + (number+1)
                }
                fillLogData($scope.currentSelection, fillLogData.lastControlsFile);
            }
                
            else if ( $scope.currentSelection == "Watchdog" ) {
                if(fillLogData.lastWatchdogFile.lastIndexOf('.') != -1)
                    number = parseInt(fillLogData.lastWatchdogFile.slice(fillLogData.lastWatchdogFile.lastIndexOf('.')+1));
                if(number != undefined) {                
                    if(isNaN(number))
                        number = 0;
                    fillLogData.lastWatchdogFile = "emb_watchdog.log." + (number+1)
                }
                fillLogData($scope.currentSelection, fillLogData.lastWatchdogFile);
            }
        }
        function signalNewAlarms(present) {
            var alarmElement = $scope.my_data.find(el => el.label.match(/^(NEW! )?Alarms( NEW!)?$/g));    
            var showNavButton = document.getElementById("showNavButtonId");                 

            var alarmButton = drawingObject.buttons.find(btn => btn.isAlarmList == true);
            if(alarmButton != undefined) {                    
                if(alarmButton.defaultColor == undefined)
                    alarmButton.defaultColor = alarmButton.color;
                if (present) {
                    //alarmElement.label = (alarmElement.label == "Dziennik alarmów" ? "NOWE! Dziennik alarmów NOWE!" : "Dziennik alarmów");                
                    //showNavButton.style['background'] = (showNavButton.style['background'] != "red" ? "red" : "none");                    
                    alarmButton.color = (alarmButton.color == alarmButton.defaultColor ? "#FF0000" : alarmButton.defaultColor);
                }
                else {
                    //alarmElement.label ="Dziennik alarmów";                
                    //showNavButton.style['background'] = "none";
                    alarmButton.color = alarmButton.defaultColor;
                }
                addButtonToScheme(alarmButton, alarmButton);
            }                                
        }
        function alarmsReadBin() {
            //var daLabel = "Dziennik alarmów";
            //var alarmElement = $scope.my_data.find(el => el.label.match(/^(NOWE! )?Dziennik alarmów( NOWE!)?$/g));       
            if(reqsent.alarms)
                return;

            if ((($scope.isAuthenticated && authVector().baseAuth)) && alarms.channelNo > 0 && $scope.response.ui.alarmlog === true) {//&& $scope.currentSelection == "Dziennik alarmów") {
                //odczyt watrości formuł nie skwitowanych
                reqsent.alarms = true;   
                var query = "/db?alarmlist_bin=" + alarms.channelNo + "," + alarms.valuesBin.length;
                $http({
                    method: 'GET',
                    url: query
                }).then(function (resp){
                    reqsent.alarms = false;
                    w8 = 0;
                    var response = resp.data;
                    checkIsAuthenticated(response);
                    updateAlarmListView(response.alarm_bin);
                    if(response.alarm_bin == undefined || response.alarm_bin.length == 0)
                        signalNewAlarms(false);
                    else if(response.alarm_bin.length)      
                        signalNewAlarms(true);                        
                    resetGlobalInfErr();
                },function (error) {
                    reqsent.alarms = false;
                    w8 = 0;
                    signalNewAlarms(false);
                    if(error.error != undefined) {
                        data.error.forEach(function(entry) {
                            console.log(entry.error + "\n");
                        });            
                        requestStatusInfoError(status, data);
                    }   
                    else {
                        console.log(error.statusText + "\n");        
                        requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                    }                        
                    updateAlarmListView();
                    if(error.status >= 500)
                        resetAuthSubmit();
                });                         
            }
            //alarmElement.label = daLabel;
        }
        //------------------------------------------------------------ 
        function updateAlarmListView(unconfirmedAlarms = []) {      
            if(!$scope.isCurrentSelectionDziennikAlarmow)
                return;
            //mouseOverFormula = {locked: false, reference: undefined};                 
            $mdExpansionPanelGroup().waitFor('panelGroup').then(function(groupInstance) {
                if(updateAlarmListView.registered == undefined) {
                    alarms.valuesBin.forEach(function(formula) {
                        formula.style = flagToForeground(formula.wynik, true);
                        if(!Array.isArray(formula.components)) {
                            formula.components = [];
                        }
                        formula.components.forEach(skladnik => {
                            skladnik.style = flagToForeground(skladnik.wynik, true);
                            skladnik.style['text-align'] = 'left';
                        });
                    });
                    
                    groupInstance.removeAll({animation: false});
                    var panelCount = 0, xx = groupInstance.count();
                    xx++;
                    alarms.valuesBin.forEach(formula => {
                        var formulaPanelName = panelCount.toString();
                        try {
                            groupInstance.register(formulaPanelName, {
                                templateUrl: 'templates/alarmExtensionPanel/alarmExtensionPanel.html',
                                controller: 'alarmExtensionPanelController', //pobiera localParam!!!
                                controllerAs: 'ctrl'
                            });
                        }                            
                        catch(error) {}
                        groupInstance.add(
                            formulaPanelName, 
                            {
                                title: {
                                    formulaReference: formula,
                                },
                                summary: "*click to expand", 
                                content: formula.components
                            }
                        ).then(function (instance) {
                            formula.componentId = instance.componentId;
                            var exPanels = Array.from(document.getElementsByTagName("md-expansion-panel"));
                            var exPanel = exPanels.find(function(pnl) {
                                var foundPnl = pnl.attributes.getNamedItem("md-component-id");
                                if(foundPnl != undefined)
                                    return foundPnl.value == instance.componentId;
                            });
                            if(exPanel != undefined) {
                                exPanel.onmouseenter = function() {
                                    if(!mouseOverFormula.locked)
                                        mouseOverFormula.reference = formula;
                                };
                                exPanel.onmousedown = function() {
                                    if(!mouseOverFormula.locked)
                                        mouseOverFormula.reference = formula;
                                };                                    
                                exPanel.onmouseleave = function() {
                                    if(!mouseOverFormula.locked)
                                        mouseOverFormula.reference = undefined;
                                };
                                if(updateAlarmListView.panelArray == undefined) {
                                    updateAlarmListView.panelArray = [exPanel];
                                }
                                else
                                    updateAlarmListView.panelArray.push(exPanel);
                            }       
                            //var xx = groupInstance.getLocals(formulaPanelName);
                        });  
                        panelCount++;            
                    });  
                }
                //else {      
                var uncAlarmsArray = [];
                alarms.valuesBin.forEach(formula => {
                    if(Array.isArray(unconfirmedAlarms)) {
                        var nieSkwitowany = unconfirmedAlarms.find(function(uncAlarm) {return uncAlarm.idAlarmu == formula.alarmIndex});
                        if(nieSkwitowany == undefined) {
                            formula.skwitowana = true;    
                        }
                        else {
                            formula.skwitowana = false;
                            formula.idAlarmu = nieSkwitowany.idAlarmu;
                            uncAlarmsArray.push(nieSkwitowany.idAlarmu);
                        }
                    }
                    formula.components.forEach(skladnik => {
                        var skladnikStyle =  flagToForeground(skladnik.wynik, true);
                        skladnikStyle['text-align'] = 'left';
                        skladnik.style = skladnikStyle;
                    });       
                    var formulaStyle = flagToForeground(formula.wynik, true);
                    formulaStyle['text-align'] = "left";
                    if(!formula.skwitowana)
                        formula.showSkwitowana = (formula.showSkwitowana == true ? false : true);
                    else 
                        formula.showSkwitowana = false;
                        //formulaStyle.background = (formula.style.background != "red" ? "red" : "none");                                  
                    formula.style = formulaStyle;                                                                                       
                });
                //}
                updateAlarmListView.registered = true;
                $scope.unconfirmedAlarms = uncAlarmsArray;
            });               
        }
        var baseRead = function (){

          // BASE READ
            if(!$scope.isAuthenticated || reqsent.data)
                return;
            //if ((($scope.isAuthenticated && authVector().baseAuth)) && 
                //($scope.currentSelection == "Module" || $scope.isCurrentSelectionScheme || $scope.isCurrentSelectionDziennikAlarmow)) 
            if (authVector().baseAuth) {
                var startBin = undefined, countBin = undefined, startAnl = undefined, countAnl = undefined;
                if($scope.currentSelection == "Module") {
                    if($scope.currentSelModule.Binary != undefined) {
                        var sortedBin = $scope.currentSelModule.Binary.sort(function(a,b) {
                            return a.Index - b.Index;
                        });
                        startBin = sortedBin[0].Index;
                        countBin = sortedBin[sortedBin.length-1].Index - sortedBin[0].Index + 1;
                    }
                    if($scope.currentSelModule.Analog != undefined) {
                        var sortedAnl = $scope.currentSelModule.Analog.sort(function(a,b) {
                            return a.Index - b.Index;
                        });                    
                        startAnl = sortedAnl[0].Index;                    
                        countAnl = sortedAnl[sortedAnl.length-1].Index - sortedAnl[0].Index + 1;
                    }
                }
                else if($scope.isCurrentSelectionScheme) {
                    if(!drawingObject.updated)
                        return;
                    var currentSchemeSaved = currentScheme;
                    var ranges = drawingObject.GetDbRanges();
                    startBin = ranges.binary.start;
                    countBin = ranges.binary.count;
                    startAnl = ranges.analog.start;
                    countAnl = ranges.analog.count;
                }
                else if($scope.isCurrentSelectionDziennikAlarmow) {
                    //pytanie o alarmy i składniki
                    var ranges = alarms.GetDbRanges();
                    startBin = ranges.binary.start;
                    countBin = ranges.binary.count;
                    startAnl = ranges.analog.start;
                    countAnl = ranges.analog.count;
                }
                else
                    return;
                var query = "/db?read";
                if(startBin != undefined && countBin != undefined && startAnl != undefined && countAnl != undefined)
                    query += "=b" + startBin + "(" + countBin + ")," + "a" + startAnl + "(" + countAnl + ")";
                else if(startBin != undefined && countBin != undefined)
                    query += "=b" + startBin + "(" + countBin + ")";
                else if(startAnl != undefined && countAnl != undefined)
                    query += "=a" + startAnl + "(" + countAnl + ")";   
                else 
                    return;

                reqsent.data = true;   
                $http({
                    method: 'GET',
                    url: query
                }).then(function (resp){
                    var response = resp.data;
                    performNodeChangeTimeRefresh();
                    reqsent.data = false;
                    w8 = 0;

                    if($scope.isCurrentSelectionScheme && currentScheme != undefined && drawingObject.updated && currentSchemeSaved == currentScheme)
                        statesForSchemes[currentScheme] = response;
                    for ( var i = 0; i < response.analog.length; i++ ) {
                        if($scope.isCurrentSelectionScheme) {
                            drawingObject.pomiary.forEach(pom => {
                                if(pom.we == response.analog[i].index) {
                                    if(pom.list != undefined) {
                                        var element =  pom.list.elements.find(element => element.value == response.analog[i].value);
                                        if(element == undefined)
                                            pom.name = pom.list.nameNdef;
                                        else {
                                            pom.name = element.name;
                                            element.formatIndexList.forEach(fil => {
                                                var foundIdx = response.analog.find(anl => {
                                                    return fil.index == anl.index;
                                                });
                                                if(foundIdx != undefined)
                                                    pom.name = pom.name.substring(0, fil.pos) + foundIdx.value + pom.name.substring(fil.pos + fil.len);
                                            });
                                        }
                                    }
                                    pom.lastValue = {flag: response.analog[i].state, val: response.analog[i].value};
                                }
                            });     
                            if(drawingObject.testowyLicznikNaIndeksie.index == response.analog[i].index && !reqsent.bazaSet && !reqsent.control) {
                                drawingObject.testowyLicznikNaIndeksie.value = response.analog[i].value;
                            }
                            /*found = drawingObject.comboBox.find(function(combo) {
                                return combo.indeksPomiaru == response.analog[i].index;                                    
                            });
                            if(found != undefined) {
                                var element =  found.elementy.find(element => element.wartoscPom == response.analog[i].value);
                                if(element == undefined)
                                    found.nazwa = found.nazwaNdef;
                                else
                                    found.nazwa = element.nazwa;
                            }*/
                        }
                        else if($scope.isCurrentSelectionDziennikAlarmow) {
                            alarms.valuesAnl.forEach(valA => {
                                if(valA.index == response.analog[i].index)
                                    valA.wynik = parseInt(response.analog[i].state, 16);
                                valA.components.forEach(skAnl => {
                                    if(skAnl == response.analog[i].index)
                                        skAnl.wynik = parseInt(response.analog[i].state, 16);
                                });
                            });
                        }
                        else {
                            $scope.analogArray[response.analog[i].index] = {value: response.analog[i].value, flag : parseInt(response.analog[i].state, 16), flag_str: function() {
                                var some_str = "";
                                var comma, previous;

                                if( Boolean(this.flag & 0x7C) || Boolean( (~this.flag) & 0x1 ) )
                                {
                                    some_str = "[";
                                    previous = false;
                                    if ( Boolean( (~this.flag) & 0x1 ) ) {
                                        some_str += " IV"; 
                                        previous = true;
                                    }
                                    if ( Boolean(this.flag & 0x4) ) {
                                        if( previous )
                                            comma = ","; 
                                        else
                                            comma = ""; 
                                        some_str += comma + " NT"; previous = true;
                                    }
                                    if ( Boolean(this.flag & 0x18) ) {
                                        if( previous )
                                            comma = ","; 
                                        else
                                            comma = ""; 
                                        some_str += comma + " SB"; previous = true;
                                    }
                                    if ( Boolean(this.flag & 0x20) ) {
                                        if( previous ) 
                                            comma = ","; 
                                        else
                                            comma = ""; 
                                        some_str += comma + " OV"; previous = true;
                                    }
                                    if ( Boolean(this.flag & 0x40) ) {
                                        if( previous ) 
                                            comma = ","; 
                                        else
                                            comma = "";
                                        some_str += comma + " BL"; previous = true;
                                    }
                                    some_str += " ]";       
                                }
                                return some_str;
                            }};
                        }
                    }
                    for ( var i = 0; i < response.binary.length; i++ ) {
                        if($scope.isCurrentSelectionScheme) {
                            //if(currentScheme != undefined && drawingObject.updated)
                            //statesForSchemes[currentScheme] = response;
                            drawingObject.tele.forEach(function(tmech) {
                                if(tmech.weL == response.binary[i].index) {
                                    tmech.stateL = parseInt(response.binary[i].state, 16);
                                }
                                if(tmech.weH == response.binary[i].index) {
                                    tmech.stateH = parseInt(response.binary[i].state, 16);
                                }
                            });   
                            drawingObject.teksty.forEach(function(tekst) {                                
                                if(tekst.weL == response.binary[i].index) {
                                    tekst.stateL = parseInt(response.binary[i].state, 16);
                                }
                                if(tekst.weH == response.binary[i].index) {
                                    tekst.stateH = parseInt(response.binary[i].state, 16);
                                }
                            });    
                            drawingObject.checkBox.forEach(function(chbox) {
                                if(chbox.weL == response.binary[i].index)
                                    chbox.stateL = parseInt(response.binary[i].state, 16);
                                if(chbox.weH == response.binary[i].index)
                                    chbox.stateH = parseInt(response.binary[i].state, 16);
                            });
                        }
                        else if($scope.isCurrentSelectionDziennikAlarmow) {
                            alarms.valuesBin.forEach(valB => {
                                if(valB.index == response.binary[i].index)
                                    valB.wynik = parseInt(response.binary[i].state, 16);
                                valB.components.forEach(skBin => {
                                    if(skBin.index == response.binary[i].index)
                                        skBin.wynik = parseInt(response.binary[i].state, 16);
                                });
                            });
                        }
                        else {
                            $scope.digitalArray[response.binary[i].index] = {value : "", flag:  parseInt(response.binary[i].state, 16), flag_str : function () {
                                var some_str = "";
                                var comma, previous;

                                if( Boolean(this.flag & 0x5C) || Boolean( (~this.flag) & 0x1 ) ) {
                                    some_str = "[";
                                    previous = false;
                                    if ( Boolean( (~this.flag) & 0x1 ) ) {
                                        some_str += " IV"; 
                                        previous = true;
                                    }                 
                                    if ( Boolean(this.flag & 0x4) ) {
                                        if( previous )
                                            comma = ","; 
                                        else 
                                            comma = ""; 
                                        some_str += comma + " NT"; previous = true;
                                    }
                                    if ( Boolean(this.flag & 0x18) ) {
                                        if( previous ) 
                                            comma = ",";
                                        else 
                                            comma = "";
                                        some_str += comma + " SB"; previous = true;
                                    }
                                    if ( Boolean(this.flag & 0x40) ) {
                                        if( previous ) 
                                            comma = ",";
                                        else
                                            comma = "";
                                        some_str += comma + " BL"; previous = true;
                                    }
                                    some_str += " ]";       
                                }
                                return some_str;
                            }};
                            // STATE VALUE
                            if( isEmpty(digitalConfStatesArray[response.binary[i].index] )) {  // empty
                                if ( Boolean($scope.digitalArray[response.binary[i].index].flag & 128) ) // state
                                    $scope.digitalArray[response.binary[i].index].value = "1";
                                else
                                    $scope.digitalArray[response.binary[i].index].value = "0";
                            } 
                            else {
                            // filled
                                if ( Boolean($scope.digitalArray[response.binary[i].index].flag & 128) ) { // state
                                    if (digitalConfStatesArray[response.binary[i].index].text_on)
                                        $scope.digitalArray[response.binary[i].index].value = digitalConfStatesArray[response.binary[i].index].text_on;
                                    else
                                        $scope.digitalArray[response.binary[i].index].value = "1";

                                } 
                                else {
                                    if (digitalConfStatesArray[response.binary[i].index].text_off)
                                        $scope.digitalArray[response.binary[i].index].value = digitalConfStatesArray[response.binary[i].index].text_off;
                                    else
                                        $scope.digitalArray[response.binary[i].index].value = "0";
                                }
                            }
                            $scope.digitalArray[response.binary[i].index].value = String.fromCharCode(160) + $scope.digitalArray[response.binary[i].index].value + String.fromCharCode(160);
                        }
                    }
                    if($scope.isCurrentSelectionScheme)
                        fillScheme();
                    resetGlobalInfErr();
                }, function (error){
                    reqsent.data = false;
                    w8 = 0;
                    if(error.error != undefined) {
                        data.error.forEach(function(entry) {
                            console.log(entry.error + "\n");
                        });            
                        requestStatusInfoError(status, data);
                    }   
                    else {
                        console.log(error.statusText + "\n");        
                        requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});                            
                    }
                    if(error.status >= 500)
                        resetAuthSubmit();
                });
            }
        };        
        var eventLogData = {
            limit: 0,
            page: 0, 
            amount: 0,
            rows: []
        };
        function eventReadBin() {
            if(reqsent.events)// || reqsent.control)
                return;
            /*var bufferClassParsed = parseInt(bufferClass);
            if(bufferClassParsed == undefined)
                bufferClassParsed = "";
            else
                bufferClassParsed = "," + bufferClassParsed;*/
            if ((($scope.isAuthenticated && authVector().baseAuth)) && $scope.currentSelection == "Event log"){
                reqsent.events = true;                       
                var query = "/db?event_bin"; 
                query += "=" + (( $scope.eventLogTableConfiguration.request.page-1) *  $scope.eventLogTableConfiguration.request.limit) + "," +  
                    $scope.eventLogTableConfiguration.request.limit;// + bufferClassParsed;
                if(eventLog.channelNo != undefined)
                    query += "," + eventLog.channelNo;
                $http({
                    method: 'GET',
                    url: query
                }).then(function (resp){
                    reqsent.events = false;
                    w8 = 0;
                    var response = resp.data;
                    checkIsAuthenticated(response);
                    //eventRead(request, response);
                    var events = response.event_bin;
                    eventLogData = {
                        limit: $scope.eventLogTableConfiguration.request.limit,
                        page: $scope.eventLogTableConfiguration.request.page,
                        amount: response.maxEventCount,
                        rows: []
                    };
                    var i = (eventLogData.page-1) * eventLogData.limit;
                    if(Array.isArray(events)) {
                        events.forEach((function(evt) {
                            if(eventLog.channelNo != undefined && Array.isArray(eventLog.valuesBin)) {
                                eventLog.valuesBin.find(bin => {
                                    if(bin.Index == evt.index) {
                                        if(bin.Name != undefined)
                                            evt.descr = bin.Name;
                                        if(parseInt(evt.state, 16) & 0x80) {
                                            if(bin["Text ON"] != undefined) {
                                                //evt.descr += " > " + bin["Text ON"];
                                                evt.valueStr = bin["Text ON"];
                                            }
                                        }
                                        else if(bin["Text OFF"] != undefined) {
                                            //evt.descr += " > " + bin["Text OFF"];
                                            evt.valueStr = bin["Text OFF"];
                                        }
                                        return true;
                                    }
                                    return false;
                                });
                            }
                            if($scope.response.Modules != undefined) {  
                                $scope.response.Modules.find(module => {
                                    return module.Binary.find(bin => {
                                        if(bin.Index == evt.index) {                                            
                                            if(bin["Signal name"] != undefined && evt.descr == undefined)
                                                evt.descr =  bin["Signal name"];                                                
                                            evt.descr =  module["Module name"] + ": " + evt.descr;
                                            if(parseInt(evt.state, 16) & 0x80) {
                                                if(bin["Text ON"] != undefined && evt.valueStr == undefined) {
                                                    //evt.descr += " > " + bin["Text ON"];
                                                    evt.valueStr = bin["Text ON"];
                                                }
                                            }
                                            else if(bin["Text OFF"] != undefined && evt.valueStr == undefined) {
                                                //evt.descr += " > " + bin["Text OFF"];
                                                evt.valueStr = bin["Text OFF"];
                                            }                                            
                                            return true;
                                        }
                                        return false;
                                    }) != undefined;
                                })
                            }
                            if(evt.value == undefined)
                                evt.value = "0x" + evt.state.padStart(2, '0');
                            eventLogData.rows.push({
                                number : i,
                                index : evt.index,
                                descr : evt.descr,
                                timestamp: evt.hour.padStart(2, '0') + ":" + evt.min.padStart(2, '0') + ":" + evt.sec.padStart(2, '0') + ":" + evt.msec.padStart(3, '0') + " " 
                                    + evt.year + "-" + evt.mon.padStart(2, '0') + "-" + evt.mday.padStart(2, '0'),
                                value: "0x" + evt.state.padStart(2, '0'),
                                valueStr: (evt.valueStr != undefined ? evt.valueStr : (parseInt(evt.state, 16) & 0x80 ? "1" : "0"))
                            });
                            i++;
                        }));                    
                    }
                    if(eventLogCallbackFunction != undefined)
                        eventLogCallbackFunction(eventLogData);
                    resetGlobalInfErr();
                },function (error){
                    reqsent.events = false;
                    w8 = 0;
                    if(error.error != undefined) {
                        data.error.forEach(function(entry) {
                            console.log(entry.error + "\n");
                        });            
                        requestStatusInfoError(status, data);
                    }   
                    else {
                        console.log(error.statusText + "\n");        
                        requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                    }
                    if(error.status >= 500)
                        resetAuthSubmit();
                });
            }
        }
        //------------------------------------------------------------ 
        var adjustSvgZoomWaiting = 0;
        refreshBaseDataPoll = $interval(function() {        
            // BASE READ
            baseRead();
            eventReadBin();
            alarmsReadBin();
            if($scope.isCurrentSelectionScheme) {
                if(adjustSvgZoomWaiting > 5) {
                    adjustSvgZoomWaiting = 0;
                    //adjustSvgZoom();
                }
                else
                    adjustSvgZoomWaiting++;
            }
        }, 1000);
        //------------------------------------------------------------
        /*setLogTable = function( tableArray ) {
            var tableDiv;
            tableDiv = '<table>';
            for (i= tableArray.length -2; i >= 0 ; i--){
                tableDiv += '<tr><td>' + tableArray[i] + '</td></tr>';
            }    
            tableDiv += '</table>'; 

            if(document.getElementById("logTable") != undefined) {
                document.getElementById("logTable").innerHTML = tableDiv;
                document.getElementById("logTable").style.display = 'block';
            }
        };*/
        //------------------------------------------------------------  
        function fillLogData(branchLabel, filename) {            
            // LOGS
            var append = (filename != undefined);
            if (filename == undefined) {
                if ( branchLabel == "Auth" ) {                    
                    filename = "auth";        
                    fillLogData.lastAuthFile = filename;
                }        
                else if ( branchLabel == "Controls" ) {
                    filename = "controls";  
                    fillLogData.lastControlsFile = filename;
                }
                else if ( branchLabel == "Watchdog" ) {
                    filename = "emb_watchdog.log";     
                    fillLogData.lastWatchdogFile = filename;
                }                   
                
                if(document.getElementById("logTable") != undefined) {
                    document.getElementById("logTable").innerHTML = "";
                    //document.getElementById("logTable").style.display = 'none';
                }
            }            
            postData = filename;
            if (!reqsent.logs && $scope.isAuthenticated && authVector().logAuth ) { // dodać warunek do powtarzania !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                var query = "/db?log";
                var postData;                                
                                
                if(query != undefined && postData != undefined) {
                    reqsent.logs = true;   
                    $http({
                        method: 'POST',
                        url: query,
                        data: postData
                    }).then(function (resp){
                        reqsent.logs = false;
                        w8 = 0;
                        resetGlobalInfErr();
                        performNodeChangeTimeRefresh();
                        checkIsAuthenticated(resp.data);
                        var headers = resp.headers();
                        if(headers['content-type'] == 'application/gzip') {
                            requirejs(["script/pako.min.js"], function(pako) {       
                                var pakoOutput = pako.Deflate(resp.data);
                                fill_logfile(pakoOutput, append);
                            });
                        }
                        else {
                            fill_logfile(resp.data, append);
                        }
                    },function (error){
                        reqsent.logs = false;
                        w8 = 0;
                        requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                        var number = -1;
                        if(filename.lastIndexOf('.') != -1)
                            number = parseInt(filename.slice(filename.lastIndexOf('.')+1));
                        if(number != undefined && !Number.isNaN(number) && number > 0) {                             
                            number--;   
                            var newName = filename.slice(0, filename.lastIndexOf('.')) + (number > 0 ? "." + number : "");
                            if ( branchLabel == "Auth" )        
                                fillLogData.lastAuthFile = newName; 
                            else if ( branchLabel == "Controls" )
                                fillLogData.lastControlsFile = newName;
                            else if ( branchLabel == "Watchdog" )
                                fillLogData.lastWatchdogFile = newName;
                        }
                        //fillLogData($scope.currentSelection, fillLogData.lastAuthFile);
                        if(error.status >= 500)
                            resetAuthSubmit();
                    });
                }                
            } 
        }
        

        /*refreshLogData = $interval(function() {
            fillLogData($scope.currentSelection);        
        }, 20000);*/
        //------------------------------------------------------------ 
										
		function trimUrl( someStr ) {
			someStr = someStr.slice( someStr.lastIndexOf("/") + 1 );
			var n = someStr.indexOf("_");
			if (n != -1) {
				someStr = someStr.slice( 0, n );
			}
			return someStr;
		}
							
		$scope.hideDmOnLine = function() {
			$scope.showOnLine = false;
		};		
		refreshDmData = $interval(function() {
            if(!$scope.isAuthenticated || reqsent.dm)
                return;			
			if ( $scope.currentSelection == "DM Server" ) {
                var query = "/db?dm";
                reqsent.dm = true;
                

                $http({
                    method: 'GET',
                    url: query
                }).then(function (resp){
                    w8 = 0;
                    var response = resp.data;
                    reqsent.dm = false;
                    
                    performNodeChangeTimeRefresh();
                    checkIsAuthenticated(response);

                    $.each( response.dm.log, function(key, value) {
                        if (value == "error") { response.dm.log[key] = ""; }
                    });
                                    
                    response.dm.analyze = trimUrl(response.dm.analyze);
                    response.dm.download_url = trimUrl(response.dm.download_url);

                    response.dm.status = response.dm.status.toUpperCase();
                    // STATUS CHANGE
                
                    if( $scope.dmResponse.dm.status != 'CONNECTED'
                    && response.dm.status  == 'CONNECTED') {
                        $scope.showOnLine = true;
                        $scope.showDmCloseButton = false; 
                    }
        
                    if( $scope.dmResponse.dm.status == 'CONNECTED'
                    && response.dm.status  != 'CONNECTED') {
                        $scope.showDmCloseButton = true; 
                    }
                    // REBOOT COUNTING
                    if( $scope.dmResponse.dm.status != 'REBOOT') {
                        
                        if( response.dm.status  == 'REBOOT'
                        && reboot ) {
                            reboot = false;
                            var iter = 10;
                            $interval( function() {
                                //response.dm.status = "WATING FOR REBOOT " + iter + "s";
                                $scope.dmResponse.dm.status = "WATING FOR REBOOT " + iter + "s";
                                //console.log( iter );
                                if( iter == 0 ) { $scope.dmResponse.dm.status = "REBOOTING"; }
                                iter--;

                            }, 1000, 11 );
                        } 
                    }
                    // REBOOT STATUS
                    if( response.dm.status == "REBOOT" ) {
                        tmp = $scope.dmResponse.dm.status;
                    } else {
                        tmp = response.dm.status;
                        reboot = true;
                    }

                    if( response.dm.dir == "ok" && response.dm.status != "CONNECTING" ) {
                        $scope.dmResponse = response;
                    }
                        
                    $scope.dmResponse.dm.log = response.dm.log;
                    $scope.dmResponse.dm.status = tmp;							

                
                    // FORCE BUTTON

                    if ( response.dm.status != 'CONNECTED' &&
                            response.dm.status != 'CONNECTING' &&
                         response.dm.status != 'REBOOT'
                    ) {
                        $('#forceButton').attr("disabled", false);
                    } else {
                        $('#forceButton').attr("disabled", true);
                    }

                
                
                    // STAGE -------------------------------------------------------------
                    if( response.dm.stage == "firmware") {
                        $scope.dmResponse.stageMessage = "Firmware downloading";
                    } else if( response.dm.stage == "config"
                    && response.dm.download_url != "accounts.zip" ) {
                        $scope.dmResponse.stageMessage = "Configuration downloading";
                    } else if( response.dm.stage == "config"
                    && response.dm.download_url == "accounts.zip" ) {
                        
                        $scope.dmResponse.stageMessage = "Accounts downloading";
                        $scope.accountsFlag = true;

                    } else if( response.dm.stage == "certificate") {
                        $scope.dmResponse.stageMessage = "Certificates downloading";
                    } else if( response.dm.stage == "analyze") {
                        $scope.dmResponse.stageMessage = "Analysis of files";
                        
                    } else {
                        $scope.dmResponse.stageMessage = "";
                    }
                    //--------------------------------------------------------------------
                    if ( digit_literal.test( $scope.dmResponse.dm.firmware ) ) {
                        $scope.dmResponse.firmwareNgClass = "alert-success";
                        $scope.dmResponse.firmwareIconNgClass = 'glyphicon glyphicon-ok';
                    } 
                    if ( $scope.dmResponse.dm.firmware == "" ) {
                        $scope.dmResponse.firmwareNgClass = "alert-warning";
                        $scope.dmResponse.firmwareIconNgClass = 'glyphicon glyphicon-check';
                        
                    } else if( $scope.dmResponse.dm.firmware == "-1" ) {
                        $scope.dmResponse.firmwareNgClass = "alert-danger";
                        $scope.dmResponse.firmwareIconNgClass = 'glyphicon glyphicon-remove';
                        
                    } else if( $scope.dmResponse.dm.firmware == "0" ) {
                        $scope.dmResponse.firmwareNgClass = "alert-success";
                        $scope.dmResponse.firmwareIconNgClass = 'glyphicon glyphicon-minus';
                    }	
                    if( $scope.dmResponse.dm.stage == "firmware") {
                        $scope.dmResponse.firmwareNgClass = "alert-warning";
                        $scope.dmResponse.firmwareIconNgClass = 'glyphicon glyphicon-hourglass';							
                    }
                    //--------------------------------------------------------------------
                    if ( digit_literal.test( $scope.dmResponse.dm.config ) ) {
                        $scope.dmResponse.configNgClass = "alert-success";
                        $scope.dmResponse.configIconNgClass = 'glyphicon glyphicon-ok';
                    } 
                    if ( $scope.dmResponse.dm.config == "" ) {
                        $scope.dmResponse.configNgClass = "alert-warning";
                        $scope.dmResponse.configIconNgClass = 'glyphicon glyphicon-check';
                        
                    } else if( $scope.dmResponse.dm.config == "-1" ) {
                        $scope.dmResponse.configNgClass = "alert-danger";
                        $scope.dmResponse.configIconNgClass = 'glyphicon glyphicon-remove';
                        
                    } else if( $scope.dmResponse.dm.config == "0" ) {
                        $scope.dmResponse.configNgClass = "alert-success";
                        $scope.dmResponse.configIconNgClass = 'glyphicon glyphicon-minus';
                    }
                    if( $scope.dmResponse.dm.stage == "config"
                          && $scope.dmResponse.dm.download_url != "accounts.zip" 
                      ) {
                        $scope.dmResponse.configNgClass = "alert-warning";
                        $scope.dmResponse.configIconNgClass = 'glyphicon glyphicon-hourglass';							
                    }
                
                    //--------------------------------------------------------------------
                    if ( digit_literal.test($scope.dmResponse.dm.accounts) ) {
                        $scope.dmResponse.accountsNgClass = "alert-success";
                        $scope.dmResponse.accountsIconNgClass = 'glyphicon glyphicon-ok';
                    } 
                    if ( $scope.dmResponse.dm.accounts == "" ) {
                        $scope.dmResponse.accountsNgClass = "alert-warning";
                        $scope.dmResponse.accountsIconNgClass = 'glyphicon glyphicon-check';
                        
                    } else if ( $scope.dmResponse.dm.accounts == "-1" ) {
                        $scope.dmResponse.accountsNgClass = "alert-danger";
                        $scope.dmResponse.accountsIconNgClass = 'glyphicon glyphicon-remove';
                        
                    } else if ( $scope.dmResponse.dm.accounts == "0" ) {
                        $scope.dmResponse.accountsNgClass = "alert-success";
                        $scope.dmResponse.accountsIconNgClass = 'glyphicon glyphicon-minus';
                    }
                
                    if( $scope.dmResponse.dm.stage == "config"
                      //&& $scope.dmResponse.dm.download_url == "accounts.zip" 
                      ) 
                    {
                        if( $scope.accountsFlag ) {
                            $scope.dmResponse.accountsNgClass = "alert-warning";
                            $scope.dmResponse.accountsIconNgClass = 'glyphicon glyphicon-hourglass';
                        } else {
                            $scope.dmResponse.accountsNgClass = "alert-success";
                            $scope.dmResponse.accountsIconNgClass = 'glyphicon glyphicon-minus';
                        }
                    }

                
                
                    //--------------------------------------------------------------------
                    if ( digit_literal.test($scope.dmResponse.dm.certificate) ) {
                        $scope.dmResponse.certificateNgClass = "alert-success";
                        $scope.dmResponse.certificateIconNgClass = 'glyphicon glyphicon-ok';
                    } 
                    if ( $scope.dmResponse.dm.certificate == "" ) {
                        $scope.dmResponse.certificateNgClass = "alert-warning";
                        $scope.dmResponse.certificateIconNgClass = 'glyphicon glyphicon-check';
                        
                    } else if ( $scope.dmResponse.dm.certificate == "-1" ) {
                        $scope.dmResponse.certificateNgClass = "alert-danger";
                        $scope.dmResponse.certificateIconNgClass = 'glyphicon glyphicon-remove';
                        
                    } else if ( $scope.dmResponse.dm.certificate == "0" ) {
                        $scope.dmResponse.certificateNgClass = "alert-success";
                        $scope.dmResponse.certificateIconNgClass = 'glyphicon glyphicon-minus';
                    }
                
                    if( $scope.dmResponse.dm.stage == "certificate") {
                        $scope.dmResponse.certificateNgClass = "alert-warning";
                        $scope.dmResponse.certificateIconNgClass = 'glyphicon glyphicon-hourglass';							
                    }					
                
                    //--------------------------------------------------------------------
                    var progressBar = $('#progressBar');
                    if ( number_literal.test(response.dm.progress) ) {
                        progressBar.css('width', parseInt(response.dm.progress)+'%');
                    } else {
                        progressBar.css('width', '0%');
                    }
                    //--------------------------------------------------------------------
                        /*var downloadProgressBar = $('#downloadProgressBar');
                        if ( number_literal.test(response.dm.download_progress) ) {
                            downloadProgressBar.css('width', parseInt(response.dm.download_progress)+'%');
                        } else {
                            downloadProgressBar.css('width', '0%');
                        }*/
                        //console.log(response.dm.analyze);
                    
                    //--------------------------------------------------------------------
                        switch( response.dm.status ) {
                        case 'CONNECTED':
                            $("#DmStatus").css('color','green');
                            break;
                        case 'DISCONNECTED':
                            $("#DmStatus").css('color','gray');
                            break;
                        case 'REBOOTING':
                            $("#DmStatus").css('color','blue');
                            break;								
                        case 'ERROR':
                            $("#DmStatus").css('color','red');
                            break;
                        case '':
                            $scope.dmResponse.dm.status = "DISCONNECTED";
                            $("#DmStatus").css('color','gray');
                            break;
                        default:
                            $("#DmStatus").css('color','black');
                    }
                    //--------------------------------------------------------------------
                
                    if( response.dm.status == 'CONNECTED' ) {
                        $scope.isConnected = true;
                        if( $scope.dmResponse.stageMessage != "" )
                        {
                            $scope.showDmInfo = true;
                        } else {
                            $scope.showDmInfo = false;
                        }
                        
                        if( $scope.dmResponse.dm.error != "" )
                        {
                            $scope.showDmError = true;
                        } else {
                            $scope.showDmError = false;
                        }
                        
                        if( $scope.dmResponse.dm.exitcode != "" )
                        {
                            $scope.showDmExitcode = true;
                        } else {
                            $scope.showDmExitcode = false;
                        }
                        
                        if( $scope.dmResponse.dm.analyze != "" 
                           && $scope.dmResponse.dm.analyze != "error open" 
                           && response.dm.stage == "analyze"
                          )
                        {
                            $scope.showDmAnalyze = true;
                        } else {
                            $scope.showDmAnalyze = false;
                        }
                        
                        if( response.dm.stage == "analyze" )
                        {
                            $scope.showSpin = true;

                        } else {
                            $scope.showSpin = false;
                        }
                        
                        
                        if( response.dm.stage == "firmware"
                           || response.dm.stage == "config" 
                           || response.dm.stage == "certificate"
                           || response.dm.stage == "accounts" )
                        {
                            $scope.showProgressBar = true;
                        } else {
                            $scope.showProgressBar = false;
                        } 
                        
                        
                        if( $scope.dmResponse.dm.download_url != ""
                            && $scope.dmResponse.dm.download_url != "error open" 
                              && response.dm.stage == "firmware"
                          )
                        {
                            $scope.showDownloadUrl = true;
                        } else {
                            $scope.showDownloadUrl = false;
                        }					
                        
                    } else {
                        
                        if( $scope.isConnected ) {
                            $timeout( function() {
                                if( $scope.dmResponse.dm != undefined
                                    && $scope.dmResponse.dm.status != 'CONNECTED'
                                ) {
                                    $scope.isConnected = false;
                                }
                            }, 5000);
                        }
                        $scope.showDmInfo = false;
                        $scope.showDmError = false;
                        $scope.showDmExitcode = false;
                        $scope.showDmAnalyze = false;
                        $scope.showDownloadUrl = false;
                        $scope.showProgressBar = false;
                        $scope.showSpin = false;
                    }
                }, function (error){
                    reqsent.dm = false;
					w8 = 0;
                    requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                    if(error.status >= 500)
                        resetAuthSubmit();                                              
                });
            }
        }, 500);        
        //------------------------------------------------------------  
        var drawingObject = {
            defaults: {
                tekst: {
                    fontsize: 0,
                    bold: false,
                    align: "left",
                    color: undefined,
                    colorOn: undefined,
                    colorOff: undefined,
                    color00: undefined,
                    color11: undefined,
                    colorNw: undefined,
                    colorNdef: undefined,
                    textOn: undefined,
                    textOff: undefined,
                    //colorAlarmH: undefined,
                    //colorAlarmL: undefined,
                },
                pomiar: {
                    fontsize: 0,
                    bold: false,
                    align: "left",
                    colorOk: undefined,
                    colorAlarmH: undefined,
                    colorAlarmL: undefined,
                    colorNw: undefined,
                    colorNdef: undefined,
                    mul: 1,
                    div: 1, 
                    przecinek: 0,
                    unit: ""
                }
            },
            linie: [],
            teksty: [],
            tele: [],
            symbol: [],
            pomiary: [],
            buttons: [],
            lists: [],
            //comboBox: [],
            checkBox: [],
            updated: false,   
            testowyLicznikNaIndeksie: {index: undefined, value: undefined},            
            GetDbRanges: function() {
                var ranges = {
                    binary: {
                        start : undefined,
                        count : undefined
                    },
                    analog: {
                        start : undefined,
                        count : undefined
                    }
                };
                var minBin = undefined, maxBin = undefined;
                drawingObject.tele.forEach(function(telem) {
                    if(minBin == undefined || telem.weL < minBin)
                        minBin = telem.weL;
                    if(minBin == undefined || telem.weH < minBin)
                        minBin = telem.weH;
                    if(maxBin == undefined || telem.weL > maxBin)
                        maxBin = telem.weL;
                    if(maxBin == undefined || telem.weH > maxBin)
                        maxBin = telem.weH;
                });                
                drawingObject.teksty.forEach(function(tekst) {
                    if(minBin == undefined || tekst.weL < minBin)
                        minBin = tekst.weL;
                    if(minBin == undefined || tekst.weH < minBin)
                        minBin = tekst.weH;
                    if(maxBin == undefined || tekst.weL > maxBin)
                        maxBin = tekst.weL;
                    if(maxBin == undefined || tekst.weH > maxBin)
                        maxBin = tekst.weH;
                });
                drawingObject.checkBox.forEach(function(chbox) {
                    if(minBin == undefined || chbox.weL < minBin)
                        minBin = chbox.weL;
                    if(maxBin == undefined || chbox.weL > maxBin)
                        maxBin = chbox.weL;
                });

                var minAnl = undefined, maxAnl = undefined;
                drawingObject.pomiary.forEach(function(pomiar) {
                    if(minAnl == undefined || pomiar.we < minAnl)
                        minAnl = pomiar.we;
                    if(maxAnl == undefined || pomiar.we > maxAnl)
                        maxAnl = pomiar.we;
                    if(pomiar.list != undefined) {
                        pomiar.list.elements.forEach(function(element) {
                            if(minAnl == undefined || element.value < minAnl)
                                minAnl = element.value;
                            if(maxAnl == undefined || element.value > maxAnl)
                                maxAnl = element.value;
                            element.formatIndexList.forEach(fil => {
                                if(minAnl == undefined || fil.index < minAnl)
                                    minAnl = fil.index;
                                if(maxAnl == undefined || fil.index > maxAnl)
                                    maxAnl = fil.index;
                            });
                        });
                    }
                });
                if(drawingObject.testowyLicznikNaIndeksie.index != undefined) {
                    if(minAnl == undefined || drawingObject.testowyLicznikNaIndeksie.index < minAnl)
                        minAnl = drawingObject.testowyLicznikNaIndeksie.index;
                    if(maxAnl == undefined || drawingObject.testowyLicznikNaIndeksie.index > maxAnl)
                        maxAnl = drawingObject.testowyLicznikNaIndeksie.index;
                }
                /*drawingObject.comboBox.forEach(function(combo) {
                    if(minAnl == undefined || combo.indeksPomiaru < minAnl)
                        minAnl = combo.indeksPomiaru;
                    if(maxAnl == undefined || combo.indeksPomiaru > maxAnl)
                        maxAnl = combo.indeksPomiaru;
                });*/
                ranges.binary.start = minBin;
                if(minBin != undefined)
                    ranges.binary.count = maxBin - minBin + 1;
                ranges.analog.start = minAnl;
                if(minAnl != undefined)
                    ranges.analog.count = maxAnl - minAnl + 1;
                return ranges;
            },


            clear: function() {
                this.defaults.tekst.fontsize = 0;
                this.defaults.tekst.bold = false;
                this.defaults.tekst.align = "left";
                this.defaults.tekst.color = undefined;
                this.defaults.tekst.colorOn = undefined;
                this.defaults.tekst.colorOff = undefined;
                this.defaults.tekst.textOn = undefined;
                this.defaults.tekst.textOff = undefined;
                this.defaults.tekst.color00 = undefined;
                this.defaults.tekst.color11 = undefined;
                this.defaults.tekst.colorNw = undefined;
                this.defaults.tekst.colorNdef = undefined;
                this.defaults.pomiar.fontsize =  0;
                this.defaults.pomiar.bold = false;
                this.defaults.pomiar.align = "left";
                this.defaults.pomiar.colorOk = undefined;
                this.defaults.pomiar.colorAlarmH = undefined;
                this.defaults.pomiar.colorAlarmL = undefined;
                this.defaults.pomiar.colorNw = undefined;
                this.defaults.pomiar.colorNdef = undefined;
                this.defaults.pomiar.mul = 1;
                this.defaults.pomiar.div = 1; 
                this.defaults.pomiar.przecinek = 0;
                this.defaults.pomiar.unit = "";
                //this.defaults.checkBox = this.defaults.tekst;
                this.linie = [];
                this.teksty = [];
                this.tele = [];
                this.lists = [];
                //this.comboBox = [];
                this.checkBox = [];
                this.symbol = [];
                this.pomiary = [];
                this.buttons = [];
                this.updated = false;
            }
        };  
        function fillScheme() {
            drawingObject.tele.forEach(function(tmech) {
                fillSchemeTele(tmech);
            });
            drawingObject.teksty.forEach(function(tekst) {
                drawText(tekst);
            });
            drawingObject.pomiary.forEach(function(pom) {
                if(pom.list != undefined)
                    fillSchemeCombo(pom);
                else 
                    drawPomiar(pom);
            });
            drawingObject.checkBox.forEach(function(chbox) {
                fillSchemeCheckBox(chbox);
            });
        }
        function fillSchemeCheckBox(chbox) {
            if(fillSchemeCheckBox.chBoxRect != undefined)
                fillSchemeCheckBox.chBoxRect.remove();
            if(chbox.svgSymbol != undefined)
                chbox.svgSymbol.remove();
            fillSchemeCheckBox.chBoxRect = svgScheme.symbol();
            var checkingRect = {x:0, y: chbox.height/2 - 5, width: 10, height:10};
            fillSchemeCheckBox.chBoxRect.rect(checkingRect.width, checkingRect.height).move(1, checkingRect.y-1).stroke({width: 2}).fill(drawingObject.backgroundColor);
            fillSchemeCheckBox.chBoxRect.text(function(add) {
                var tSpan = add.tspan(chbox.text).font({ font: "Verdana", size: chbox.fontsize + "pt"}).attr('letter-spacing', '1px');
                tSpan.font.anchor = "middle";
                tSpan.dx(checkingRect.width + 10);
                tSpan.dy(chbox.height/2 + 4);
                if(chbox.stateL != undefined) {
                    if(chbox.stateH != undefined) {
                        chbox.stateL |= chbox.stateH & 0x7F;                
                        chbox.stateH |= chbox.stateL & 0x7F;
                    }             
                    var stateL = false;                   
                    var stateH = false;
                    if((chbox.stateL & 0x80) > 0) {
                        fillSchemeCheckBox.chBoxRect.line(0, 0, checkingRect.width, checkingRect.height).stroke({width: 2}).move(checkingRect.x+1, checkingRect.y-1);
                        fillSchemeCheckBox.chBoxRect.line(checkingRect.width, 0, 0, checkingRect.height).stroke({width: 2}).move(checkingRect.x+1, checkingRect.y-1);
                    }
                }
                else 
                    fillColor(tSpan, chbox.color);
            });            
            chbox.svgSymbol = svgScheme.use(fillSchemeCheckBox.chBoxRect).move(chbox.x, chbox.y);

            AttachMouseBoundingAnimation(chbox);
        }
        function fillSchemeCombo(combo) {            
            if(combo.svgSymbol != undefined)
                combo.svgSymbol.remove();
            if(fillSchemeCombo.comboRect != undefined)
                    fillSchemeCombo.comboRect.remove();
            fillSchemeCombo.comboRect = svgScheme.symbol();
            var comboRectDim = {width: combo.width*1.3, height: combo.height};

            preparePomiar(combo);

            if(combo.allowChange) {
                fillSchemeCombo.comboRect.rect(comboRectDim.width, comboRectDim.height).stroke({color: "#666", width: 1}).fill('#808080');
                fillSchemeCombo.comboRect.polygon(0.9*comboRectDim.width + "," + 0.4*comboRectDim.height + " " +  0.98*comboRectDim.width + "," + 0.4*comboRectDim.height + " " + 
                    0.94*comboRectDim.width + "," + 0.6*comboRectDim.height).fill("#000");
            }
            fillSchemeCombo.comboRect.text(function(add) {
                var name = (combo.name == undefined ? combo.list.nameNdef : combo.name);
                //var defText = drawingObject.defaults.tekst;
                var tSpan = add.tspan(name).font({ font: "Verdana", size: combo.fontsize + "pt"}).attr('letter-spacing', '1px');
                tSpan.font.anchor = "middle";                                        
                //tSpan.dx((combo.width - tSpan.bbox().width)/2);
                tSpan.dx(combo.width*0.1);
                //fillColor(tSpan, "#FFF");
                tSpan.dy(combo.height/2 + 4);

                tSpan.fill(getColorFromPomiar(combo));
            });
            combo.svgSymbol = svgScheme.use(fillSchemeCombo.comboRect).move(combo.x, combo.y);
            if(combo.allowChange)
                AttachMouseBoundingAnimation(combo);
        }
        function fillSchemeTele(tmech) {
            if(tmech != undefined && tmech.svgSymbol != undefined) {                
                if(tmech.svgSymbol.used != undefined)
                    tmech.svgSymbol.used.remove();
                if(tmech.stateL == undefined && tmech.stateH == undefined) {
                    tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state01unav).move(tmech.x, tmech.y);
                    return;
                }
                var stateL = tmech.stateL;
                var stateH = tmech.stateH;
                if(tmech.neg == true) {                    
                    if(tmech.stateL & 0x80)
                        stateL &= 0x7F;
                    else 
                        stateL |= 0x80;
                    if(tmech.stateH != undefined) {
                        if(tmech.stateH & 0x80)
                            stateH &= 0x7F;
                        else
                            stateH |= 0x80;
                    }
                }
                if(stateH == undefined) {                        
                    tmech.svgSymbol.used = svgScheme.use((stateL >= 128 ? 
                        ((stateL & 0x04 && tmech.svgSymbol.state10unav != undefined) ? tmech.svgSymbol.state10unav : tmech.svgSymbol.state10) :
                        ((stateL & 0x04 && tmech.svgSymbol.state01unav != undefined) ? tmech.svgSymbol.state01unav : tmech.svgSymbol.state01))).move(tmech.x, tmech.y);
                }
                else if(stateH >= 128) {
                    if(stateL >= 128) {
                        if(tmech.svgSymbol.state11unav != undefined && (stateH & 0x04 || stateL & 0x04))
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state11unav).move(tmech.x, tmech.y);
                        else
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state11).move(tmech.x, tmech.y);
                    }
                    else {
                        if(tmech.svgSymbol.state01unav != undefined && (stateH & 0x04 || stateL & 0x04))
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state01unav).move(tmech.x, tmech.y);
                        else
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state01).move(tmech.x, tmech.y);
                    }
                }
                else {
                    if(stateL >= 128) {
                        if(tmech.svgSymbol.state10unav != undefined && (stateL & 0x04 || stateH & 0x04))
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state10unav).move(tmech.x, tmech.y);                            
                        else
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state10).move(tmech.x, tmech.y);
                    }
                    else {
                        if(tmech.svgSymbol.state11unav != undefined && (stateH & 0x04 || stateL & 0x04))
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state11unav).move(tmech.x, tmech.y);
                        else
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state00).move(tmech.x, tmech.y);
                    }
                }
                if(tmech.sterL != undefined || tmech.sterH != undefined || tmech.enableSetH != undefined || tmech.enableSetL != undefined)
                    AttachMouseBoundingAnimation(tmech, tmech.svgSymbol.used);
            }
        }


        showWaiting = $interval(function() {
            if(logging || reqsent.isAny())
                w8++;
            if(w8 >= 3) { 
                $scope.globalWait = true;
            }   
            else
                $scope.globalWait = false;
        }, 1000);      
        var isNavTreeHidden = true;                              
        //------------------------------------------------------------ 
        function HideNavTree() {
            if(isNavTreeHidden)
                return;
            document.getElementById("showNavDivId").style.display = 'block';
            document.getElementById("navTreeDivId").style.display = 'none';                   
            document.getElementById("mainSection").style.left = '30px';
            document.getElementById("notSldDiv").style.width = 'calc(100% - 30px)';
            //svgScheme.translate(svgTranslated.x, svgTranslated.y);
            document.getElementById("mainSection").style.width = '100%';
            isNavTreeHidden = true;
        }
        function ShowNavTree() {
            if(!isNavTreeHidden)
                return;
            document.getElementById("showNavDivId").style.display = 'none';
            document.getElementById("navTreeDivId").style.display = 'block';            
            document.getElementById("mainSection").style.left = '370px';
            document.getElementById("notSldDiv").style.width = 'calc(100% - 370px)';            
            //svgScheme.translate(svgTranslated.x, svgTranslated.y);
            document.getElementById("mainSection").style.width = '100%';
            isNavTreeHidden = false;
        }
        //------------------------------------------------------------             
        function HideNavigation() {                
            document.getElementById("showNavDivId").style.display = 'none';
            document.getElementById("navTreeDivId").style.display = 'none';                   
            document.getElementById("mainSection").style.left = '0px';
            document.getElementById("notSldDiv").style.width = '100%';
            //svgScheme.translate(svgTranslated.x, svgTranslated.y);
            document.getElementById("mainSection").style.width = '100%';
            //$scope.showNavigation = false;
        }
        //------------------------------------------------------------
        var mouseOverFormula = {locked: false, reference: undefined};        
        var mouseOverCtrl = {locked: false, reference: undefined};           
        
        function xmlToSvg(xmlInput) {
            drawingObject.clear();
            var svgDiv = document.getElementById("svgDiv");
            if(svgDiv == undefined)
                return;
            else
                document.getElementById("svgDiv").innerHTML = "";            

            svgMouseDown = undefined;
            svgTranslated = {x: 0, y: 0};
            mouseOverCtrl = {locked: false, reference: undefined};



            if(mainSvg == undefined)
                mainSvg = SVG('svgDiv');
            else {
                mainSvg.clear();
                mainSvg = SVG('svgDiv');
            }
            svgScheme = mainSvg.viewbox(0, 0, viewBoxSize.width, viewBoxSize.height);            
            if(true) {
                var domyslne, obiekty, schemat, i, j, xmlDoc, linieBloki = [];

                xmlDoc = xmlInput.responseXML;                                
                domyslne = xmlDoc.getElementsByTagName("domyslne");
                obiekty = xmlDoc.getElementsByTagName("obiekt");
                schemat = xmlDoc.getElementsByTagName("schemat");

                if(schemat.length) {
                    if(schemat[0].attributes.nazwa != undefined) {
                        drawingObject.nazwa = schemat[0].attributes.nazwa.nodeValue;
                        drawingObject.nazwaSS = (schemat[0].attributes.ss_bay == undefined ? drawingObject.nazwa : schemat[0].attributes.ss_bay.nodeValue);
                        currentScheme = drawingObject.nazwa;                      
                    }
                    else 
                        currentScheme = xmlInput.responseURL;
                    if(schemat[0].attributes.bckg_color != undefined)
                        drawingObject.backgroundColor = schemat[0].attributes.bckg_color.nodeValue;
                    if(schemat[0].attributes.ack_index != undefined)
                        drawingObject.testowyLicznikNaIndeksie.index = parseInt(schemat[0].attributes.ack_index.nodeValue);
                }

                if(domyslne.length) {
                    for(i = 0; i < domyslne[0].children.length; i++) {
                        if(domyslne[0].children[i].tagName == "tekst") {
                            drawingObject.defaults.tekst = {
                                fontsize: parseInt(domyslne[0].children[i].attributes.fontsize.nodeValue),
                                width: parseInt(domyslne[0].children[i].attributes.width.nodeValue),
                                height: parseInt(domyslne[0].children[i].attributes.height.nodeValue),
                                bold: (domyslne[0].children[i].attributes.bold.nodeValue == "0" ? false : true),
                                align: domyslne[0].children[i].attributes.align.nodeValue,
                                color: domyslne[0].children[i].attributes.kolor.nodeValue,
                                colorOn: domyslne[0].children[i].attributes.kolorON.nodeValue,
                                colorOff: domyslne[0].children[i].attributes.kolorOFF.nodeValue,
                                color00: domyslne[0].children[i].attributes.kolor00.nodeValue,
                                color11: domyslne[0].children[i].attributes.kolor11.nodeValue,
                                colorNw: domyslne[0].children[i].attributes.kolorNW.nodeValue,
                                colorNdef: domyslne[0].children[i].attributes.kolorNDEF.nodeValue
                            }
                        }
                        if(domyslne[0].children[i].tagName == "checkbox") {
                            drawingObject.defaults.checkBox = {
                                fontsize: parseInt(domyslne[0].children[i].attributes.fontsize.nodeValue),
                                width: parseInt(domyslne[0].children[i].attributes.width.nodeValue),
                                height: parseInt(domyslne[0].children[i].attributes.height.nodeValue),
                                bold: (domyslne[0].children[i].attributes.bold.nodeValue == "0" ? false : true),
                                color: domyslne[0].children[i].attributes.kolor.nodeValue,
                            }
                        }
                        if(domyslne[0].children[i].tagName == "pomiar") {
                            drawingObject.defaults.pomiar = {
                                fontsize: parseInt(domyslne[0].children[i].attributes.fontsize.nodeValue),
                                width: parseInt(domyslne[0].children[i].attributes.width.nodeValue),
                                height: parseInt(domyslne[0].children[i].attributes.height.nodeValue),
                                mul: parseFloat(domyslne[0].children[i].attributes.mul.nodeValue.replace(",",".")),
                                div: parseFloat(domyslne[0].children[i].attributes.div.nodeValue.replace(",",".")),
                                przecinek: parseInt(domyslne[0].children[i].attributes.przecinek.nodeValue),
                                unit: domyslne[0].children[i].attributes.unit.nodeValue,
                                bold: (domyslne[0].children[i].attributes.bold.nodeValue == "0" ? false : true),
                                align: domyslne[0].children[i].attributes.align.nodeValue,                                
                                colorOk: domyslne[0].children[i].attributes.kolorOK.nodeValue,
                                colorAlarmH: domyslne[0].children[i].attributes.koloralarmH.nodeValue,
                                colorAlarmL: domyslne[0].children[i].attributes.koloralarmL.nodeValue,
                                colorNw: domyslne[0].children[i].attributes.kolorNW.nodeValue,
                                colorNdef: domyslne[0].children[i].attributes.kolorNDEF.nodeValue
                            }
                        }
                        if(domyslne[0].children[i].tagName == "button") {
                            drawingObject.defaults.button = {
                                width: parseInt(domyslne[0].children[i].attributes.width.nodeValue),
                                height: parseInt(domyslne[0].children[i].attributes.height.nodeValue),
                                nazwa: domyslne[0].children[i].attributes.nazwa.nodeValue,
                                path: domyslne[0].children[i].attributes.plik.nodeValue,    
                                color: domyslne[0].children[i].attributes.kolorBtn.nodeValue,    
                                txtColor: domyslne[0].children[i].attributes.kolorFont.nodeValue,    
                                fontsize: parseInt(domyslne[0].children[i].attributes.sizeFont.nodeValue),
                                users: ['@all']                  
                            }
                        }
                    }
                }

                for(i = 0; i < obiekty.length; i++) {
                    //węzły zrobić osobno!!!
                    if(obiekty[i].attributes.typ.nodeValue == "linia") {
                        for(j = 0; j < obiekty[i].children.length; j++) {
                            var type = parseInt(obiekty[i].children[j].attributes.bmp.nodeValue);
                            switch(type) {
                                case 1:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 2:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 3:
                                case 12:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 4:
                                case 13:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 5:
                                case 14:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 6:
                                case 15:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 7:
                                case 16:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 8:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 9:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 10:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 11:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                                case 12:
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,                                
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                linieBloki.push({
                                    x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                    y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                                    y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                                    colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                                });
                                break;
                            }
                        }
                    }
                    else if(obiekty[i].attributes.typ.nodeValue == "tele") {
                        for(j = 0; j < obiekty[i].children.length; j++) {
                            drawingObject.tele.push({
                                x: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                y: parseInt(obiekty[i].children[j].attributes.y.nodeValue),                                
                                weL: (obiekty[i].children[j].attributes.weL == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.weL.nodeValue)),
                                weH: (obiekty[i].children[j].attributes.weH == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.weH.nodeValue)),
                                neg: (obiekty[i].children[j].attributes.neg == undefined ? false : (parseInt(obiekty[i].children[j].attributes.neg.nodeValue) ? true : false)),
                                sterL: (obiekty[i].children[j].attributes.sterL == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.sterL.nodeValue)),
                                sterH: (obiekty[i].children[j].attributes.sterH == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.sterH.nodeValue)),
                                sterA: (obiekty[i].children[j].attributes.sterA == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.sterA.nodeValue)),
                                sterR: (obiekty[i].children[j].attributes.sterM == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.sterM.nodeValue)),
                                sterLname: (obiekty[i].children[j].attributes.name_ctrl_on == undefined ? 
                                    (obiekty[i].children[j].attributes.sterL == undefined ? undefined : obiekty[i].children[j].attributes.sterL.nodeValue) 
                                    : obiekty[i].children[j].attributes.name_ctrl_on.nodeValue),
                                sterHname: (obiekty[i].children[j].attributes.name_ctrl_off == undefined ? 
                                    (obiekty[i].children[j].attributes.sterH == undefined ? undefined : obiekty[i].children[j].attributes.sterH.nodeValue) 
                                    : obiekty[i].children[j].attributes.name_ctrl_off.nodeValue),
                                sterAname: (obiekty[i].children[j].attributes.name_ctrl_auto == undefined ? 
                                    (obiekty[i].children[j].attributes.sterA == undefined ? undefined : obiekty[i].children[j].attributes.sterA.nodeValue) 
                                    : obiekty[i].children[j].attributes.name_ctrl_auto.nodeValue),
                                sterRname: (obiekty[i].children[j].attributes.name_ctrl_man == undefined ? 
                                    (obiekty[i].children[j].attributes.sterR == undefined ? undefined : obiekty[i].children[j].attributes.sterR.nodeValue) 
                                    : obiekty[i].children[j].attributes.name_ctrl_man.nodeValue),
                                enableSetL: (obiekty[i].children[j].attributes.enableSetL == undefined ? undefined : obiekty[i].children[j].attributes.enableSetL.nodeValue),
                                enableSetH: (obiekty[i].children[j].attributes.enableSetH == undefined ? undefined : obiekty[i].children[j].attributes.enableSetH.nodeValue),

                                type: obiekty[i].children[j].attributes.bmp.nodeValue,
                                svgSymbol: {
                                    state11: undefined,
                                    state00: undefined,
                                    state01: undefined,
                                    state10: undefined,
                                    state01unav: undefined,
                                    state10unav: undefined,
                                }
                            });
                        }
                    }
                    else if(obiekty[i].attributes.typ.nodeValue == "symbol") {
                        for(j = 0; j < obiekty[i].children.length; j++) {
                            drawingObject.symbol.push({
                                x: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                                y: parseInt(obiekty[i].children[j].attributes.y.nodeValue),                                
                                type: obiekty[i].children[j].attributes.bmp.nodeValue
                            });
                        }
                    }
                    else if(obiekty[i].attributes.typ.nodeValue == "tekst") {
                        for(j = 0; j < obiekty[i].children.length; j++) {
                            var newItem = {
                                fontsize: parseInt(drawingObject.defaults.tekst.fontsize),
                                width: parseInt(drawingObject.defaults.tekst.width),
                                height: parseInt(drawingObject.defaults.tekst.height),
                                bold: drawingObject.defaults.tekst.bold == "0" ? false : true,
                                align: drawingObject.defaults.tekst.align,
                                color: drawingObject.defaults.tekst.color,
                                colorOn: drawingObject.defaults.tekst.colorOn,
                                colorOff: drawingObject.defaults.tekst.colorOff,
                                color00: drawingObject.defaults.tekst.color00,
                                color11: drawingObject.defaults.tekst.color11,
                                colorNw: drawingObject.defaults.tekst.colorNw,
                                colorNdef: drawingObject.defaults.tekst.colorNdef,                     
                            };
                            newItem.x = parseInt(obiekty[i].children[j].attributes.x.nodeValue);
                            newItem.y = parseInt(obiekty[i].children[j].attributes.y.nodeValue);
                            newItem.text = obiekty[i].children[j].attributes.nazwa.nodeValue;

                            if(obiekty[i].children[j].attributes.weL != undefined)
                                newItem.weL = parseInt(obiekty[i].children[j].attributes.weL.nodeValue);
                            if(obiekty[i].children[j].attributes.weH != undefined)
                                newItem.weH = parseInt(obiekty[i].children[j].attributes.weH.nodeValue);

                            if(obiekty[i].children[j].attributes.width != undefined)
                                newItem.width = parseInt(obiekty[i].children[j].attributes.width.nodeValue);
                            if(obiekty[i].children[j].attributes.height != undefined)
                                newItem.height = parseInt(obiekty[i].children[j].attributes.height.nodeValue);
                            if(obiekty[i].children[j].attributes.fontsize != undefined)
                                newItem.fontsize = parseInt(obiekty[i].children[j].attributes.fontsize.nodeValue);
                            if(obiekty[i].children[j].attributes.bold != undefined)
                                newItem.bold = (obiekty[i].children[j].attributes.bold.nodeValue == "0" ? false : true);
                            if(obiekty[i].children[j].attributes.align != undefined) 
                                newItem.align = obiekty[i].children[j].attributes.align.nodeValue;
                            if(obiekty[i].children[j].attributes.kolor != undefined)
                                newItem.color = obiekty[i].children[j].attributes.kolor.nodeValue;
                            if(obiekty[i].children[j].attributes.kolorON != undefined)
                                newItem.colorOn = obiekty[i].children[j].attributes.kolorON.nodeValue;
                            if(obiekty[i].children[j].attributes.kolorOFF != undefined)
                                newItem.colorOff = obiekty[i].children[j].attributes.kolorOFF.nodeValue;
                            if(obiekty[i].children[j].attributes.kolor00 != undefined)
                                newItem.color00 = obiekty[i].children[j].attributes.kolor00.nodeValue;
                            if(obiekty[i].children[j].attributes.kolor11 != undefined)
                                newItem.color11 = obiekty[i].children[j].attributes.kolor11.nodeValue;
                            if(obiekty[i].children[j].attributes.kolorNW != undefined)
                                newItem.colorNw = obiekty[i].children[j].attributes.kolorNW.nodeValue;
                            if(obiekty[i].children[j].attributes.kolorNDEF != undefined)
                                newItem.colorNdef = obiekty[i].children[j].attributes.kolorNDEF.nodeValue;
                            if(obiekty[i].children[j].attributes.txtON != undefined) {
                                newItem.textOn = obiekty[i].children[j].attributes.txtON.nodeValue;
                                if(newItem.textOn == "")
                                    newItem.textOn = undefined;
                            }
                            if(obiekty[i].children[j].attributes.txtOFF != undefined) {
                                newItem.textOff = obiekty[i].children[j].attributes.txtOFF.nodeValue;                                
                                if(newItem.textOff == "")
                                    newItem.textOff = undefined;
                            }
                            drawingObject.teksty.push(newItem);
                        }
                    }
                    else if(obiekty[i].attributes.typ.nodeValue == "pomiar") {
                        for(j = 0; j < obiekty[i].children.length; j++) {
                            var newItem = {
                                fontsize: drawingObject.defaults.pomiar.fontsize,                            
                                width: drawingObject.defaults.pomiar.width,
                                height: drawingObject.defaults.pomiar.height,      
                                mul: drawingObject.defaults.pomiar.mul,
                                div: drawingObject.defaults.pomiar.div,     
                                przecinek: drawingObject.defaults.pomiar.przecinek,
                                unit: drawingObject.defaults.pomiar.unit,
                                bold: drawingObject.defaults.pomiar.bold,
                                align: drawingObject.defaults.pomiar.align,                                                        
                                colorOk: drawingObject.defaults.pomiar.colorOk,
                                colorAlarmH: drawingObject.defaults.pomiar.colorAlarmH,
                                colorAlarmL: drawingObject.defaults.pomiar.colorAlarmL,                            
                                colorNw: drawingObject.defaults.tekst.colorNw,
                                colorNdef: drawingObject.defaults.tekst.colorNdef,    
                                allowChange: false                 
                            };
                            newItem.x = parseInt(obiekty[i].children[j].attributes.x.nodeValue);
                            newItem.y = parseInt(obiekty[i].children[j].attributes.y.nodeValue);
                            newItem.we = parseInt(obiekty[i].children[j].attributes.we.nodeValue);
                            if(obiekty[i].children[j].attributes.fontsize != undefined)
                                newItem.fontsize = parseInt(obiekty[i].children[j].attributes.fontsize.nodeValue);
                            if(obiekty[i].children[j].attributes.przecinek != undefined)
                                newItem.przecinek = parseInt(obiekty[i].children[j].attributes.przecinek.nodeValue);
                            if(obiekty[i].children[j].attributes.unit != undefined)
                                newItem.unit = obiekty[i].children[j].attributes.unit.nodeValue;
                            if(obiekty[i].children[j].attributes.width != undefined)
                                newItem.width = parseInt(obiekty[i].children[j].attributes.width.nodeValue);
                            if(obiekty[i].children[j].attributes.height != undefined)
                                newItem.height = parseInt(obiekty[i].children[j].attributes.height.nodeValue);                            
                            if(obiekty[i].children[j].attributes.bold != undefined)
                                newItem.bold = (obiekty[i].children[j].attributes.fontsize.nodeValue == "0" ? false : true);
                            if(obiekty[i].children[j].attributes.align != undefined)
                                newItem.align = obiekty[i].children[j].attributes.align.nodeValue;
                            if(obiekty[i].children[j].attributes.kolorOK != undefined)
                                newItem.colorOk = obiekty[i].children[j].attributes.kolorOK.nodeValue;
                            if(obiekty[i].children[j].attributes.kolorNW != undefined)
                                newItem.colorNw = obiekty[i].children[j].attributes.kolorNW.nodeValue;
                            if(obiekty[i].children[j].attributes.kolorNDEF != undefined)
                                newItem.colorNdef = obiekty[i].children[j].attributes.kolorNDEF.nodeValue;
                            if(obiekty[i].children[j].attributes.koloralarmH != undefined)
                                newItem.colorAlarmH = obiekty[i].children[j].attributes.koloralarmH.nodeValue;
                            if(obiekty[i].children[j].attributes.koloralarmL != undefined)
                                newItem.colorAlarmL = obiekty[i].children[j].attributes.koloralarmL.nodeValue;
                            if(obiekty[i].children[j].attributes.alarmH != undefined)
                                newItem.alarmH = parseFloat(obiekty[i].children[j].attributes.alarmH.nodeValue.replace(",","."));
                            if(obiekty[i].children[j].attributes.alarmL != undefined)
                                newItem.alarmL = parseFloat(obiekty[i].children[j].attributes.alarmL.nodeValue.replace(",","."));
                            if(obiekty[i].children[j].attributes.minVal != undefined)
                                newItem.minVal = parseFloat(obiekty[i].children[j].attributes.minVal.nodeValue.replace(",","."));
                            if(obiekty[i].children[j].attributes.maxVal != undefined)
                                newItem.maxVal = parseFloat(obiekty[i].children[j].attributes.maxVal.nodeValue.replace(",","."));
                            if(obiekty[i].children[j].attributes.ster != undefined)
                                newItem.ster = parseInt(obiekty[i].children[j].attributes.ster.nodeValue);    
                            if(obiekty[i].children[j].attributes.list != undefined && Array.isArray(drawingObject.lists))
                                newItem.list = drawingObject.lists.find(list => list.name == obiekty[i].children[j].attributes.list.nodeValue);
                            if(obiekty[i].children[j].attributes.change != undefined)
                                newItem.allowChange = obiekty[i].children[j].attributes.change.nodeValue == "yes";   
                            if(obiekty[i].children[j].attributes.mul != undefined)
                                newItem.mul =  parseFloat(obiekty[i].children[j].attributes.mul.nodeValue.replace(",","."));
                            if(obiekty[i].children[j].attributes.div != undefined)
                                newItem.div =  parseFloat(obiekty[i].children[j].attributes.div.nodeValue.replace(",","."));

                            newItem.isPomiar = true;
                            drawingObject.pomiary.push(newItem);
                        }                    
                    }
                    else if(obiekty[i].attributes.typ.nodeValue == "lists") {
                        for(j = 0; j < obiekty[i].children.length; j++) {
                            var newItem = {
                                name: undefined, 
                                nameNdef: '--',
                                elements: []
                            };
                            if(obiekty[i].children[j].attributes.name != undefined)
                                newItem.name = obiekty[i].children[j].attributes.name.nodeValue;                                            
                            var elements = Array.from(obiekty[i].children[j].children);
                            elements.forEach(element => {
                                if(element.attributes.name != undefined && element.attributes.value != undefined)
                                    var matches = element.attributes.name.nodeValue.matchAll(/@(\d+)@/g);
                                    var formatIndexes = [];
                                    for (const match of matches) {
                                        if(match.length > 0) {
                                            var idx = parseInt(match[1]);
                                            if(idx != undefined) {
                                                formatIndexes.push({index: idx, pos: match.index, len: match[0].length});
                                            }
                                        }
                                    }
                                    newItem.elements.push({
                                        name: element.attributes.name.nodeValue, 
                                        value: parseInt(element.attributes.value.nodeValue),
                                        formatIndexList: formatIndexes
                                    });
                            });
                            drawingObject.lists.push(newItem);
                        }
                    }
                    else if(obiekty[i].attributes.typ.nodeValue == "button") {
                        for(j = 0; j < obiekty[i].children.length; j++) {
                            var newItem = {
                                width: parseInt(drawingObject.defaults.button.width),
                                height: parseInt(drawingObject.defaults.button.height),
                                nazwa: drawingObject.defaults.button.nazwa,
                                path: drawingObject.defaults.button.plik,
                                color: drawingObject.defaults.button.color,    
                                txtColor: drawingObject.defaults.button.txtColor,
                                fontsize: drawingObject.defaults.button.fontsize,
                                svgSymbol: undefined,
                                users: []
                            };
                            drawingObject.defaults.button.users.forEach(usr => {
                                newItem.users.push(usr);
                            });
                            newItem.x = parseInt(obiekty[i].children[j].attributes.x.nodeValue);
                            newItem.y = parseInt(obiekty[i].children[j].attributes.y.nodeValue);
                            newItem.nazwa = obiekty[i].children[j].attributes.nazwa.nodeValue;

                            if(obiekty[i].children[j].attributes.width != undefined)
                                newItem.width = parseInt(obiekty[i].children[j].attributes.width.nodeValue);
                            if(obiekty[i].children[j].attributes.height != undefined)
                                newItem.height = parseInt(obiekty[i].children[j].attributes.height.nodeValue);
                            if(obiekty[i].children[j].attributes.sizeFont != undefined)
                                newItem.fontsize = parseInt(obiekty[i].children[j].attributes.sizeFont.nodeValue);
                            if(obiekty[i].children[j].attributes.kolorBtn != undefined)
                                newItem.color = obiekty[i].children[j].attributes.kolorBtn.nodeValue;
                            if(obiekty[i].children[j].attributes.kolorFont != undefined)
                                newItem.txtColor = obiekty[i].children[j].attributes.kolorFont.nodeValue;
                            if(obiekty[i].children[j].attributes.plik != undefined)
                                newItem.path = obiekty[i].children[j].attributes.plik.nodeValue;
                            if(obiekty[i].children[j].attributes.ster != undefined)
                                newItem.ster = parseInt(obiekty[i].children[j].attributes.ster.nodeValue);
                            if(obiekty[i].children[j].attributes.ctrl_tag != undefined)
                                newItem.sterTag = obiekty[i].children[j].attributes.ctrl_tag.nodeValue;
                            if(obiekty[i].children[j].attributes.users != undefined) {
                                newItem.users = ['administrator'];
                                var matches = obiekty[i].children[j].attributes.users.nodeValue.matchAll(/\s*([a-zA-z0-9]+)\s*;?/g);
                                for (const match of matches) {
                                    if(match.length > 0)
                                        newItem.users.push(match[1]);
                                }
                            }
                            newItem.isEventLog = false;
                            newItem.isAlarmList = false;
                            newItem.isLogging = false;
                            if(obiekty[i].children[j].attributes.dziennik_zdarzen != undefined)
                                newItem.isEventLog = true;
                            if(obiekty[i].children[j].attributes.lista_alarmowa != undefined)
                                newItem.isAlarmList = true;
                            if(obiekty[i].children[j].attributes.logowanie != undefined)
                                newItem.isLogging = true;
                            drawingObject.buttons.push(newItem);
                        }
                    }
                    else if(obiekty[i].attributes.typ.nodeValue == "checkbox") {
                        for(j = 0; j < obiekty[i].children.length; j++) {
                            var newItem = {
                                fontsize: parseInt(drawingObject.defaults.checkBox.fontsize),
                                width: parseInt(drawingObject.defaults.checkBox.width),
                                height: parseInt(drawingObject.defaults.checkBox.height),
                                bold: drawingObject.defaults.checkBox.bold == "0" ? false : true,
                                color: drawingObject.defaults.checkBox.color
                            };
                            newItem.isCheckBox = true;

                            newItem.x = parseInt(obiekty[i].children[j].attributes.x.nodeValue);
                            newItem.y = parseInt(obiekty[i].children[j].attributes.y.nodeValue);
                            newItem.text = obiekty[i].children[j].attributes.nazwa.nodeValue;

                            if(obiekty[i].children[j].attributes.weL != undefined)
                                newItem.weL = obiekty[i].children[j].attributes.weL.nodeValue;
                            if(obiekty[i].children[j].attributes.weH != undefined)
                                newItem.weH = obiekty[i].children[j].attributes.weH.nodeValue;

                            if(obiekty[i].children[j].attributes.width != undefined)
                                newItem.width = parseInt(obiekty[i].children[j].attributes.width.nodeValue);
                            if(obiekty[i].children[j].attributes.height != undefined)
                                newItem.height = parseInt(obiekty[i].children[j].attributes.height.nodeValue);
                            if(obiekty[i].children[j].attributes.fontsize != undefined)
                                newItem.fontsize = parseInt(obiekty[i].children[j].attributes.fontsize.nodeValue);
                            if(obiekty[i].children[j].attributes.bold != undefined)
                                newItem.bold = (obiekty[i].children[j].attributes.bold.nodeValue == "0" ? false : true);
                            if(obiekty[i].children[j].attributes.kolor != undefined)
                                newItem.color = obiekty[i].children[j].attributes.kolor.nodeValue;
                            drawingObject.checkBox.push(newItem);
                        }
                    }
                }
                //var linie = [];            
                while(linieBloki.length) {
                    var foundBlock = -1;

                    if(linieBloki[0].x1 <= linieBloki[0].x2 && linieBloki[0].y1 <= linieBloki[0].y2) {
                        drawingObject.linie.unshift({
                            begin: {
                                x: linieBloki[0].x1,
                                y: linieBloki[0].y1
                            },
                            end: {
                                x: linieBloki[0].x2,
                                y: linieBloki[0].y2
                            },
                            color: linieBloki[0].colorStr
                        });
                    }
                    else {
                        drawingObject.linie.unshift({
                            begin: {
                                x: linieBloki[0].x2,
                                y: linieBloki[0].y2
                            },
                            end: {
                                x: linieBloki[0].x1,
                                y: linieBloki[0].y1
                            },
                            color: linieBloki[0].colorStr
                        });
                    }
                    var direction = (linieBloki[0].x2 == linieBloki[0].x1 ? 
                        "vertical" : (linieBloki[0].y2 - linieBloki[0].y1)/(linieBloki[0].x2 - linieBloki[0].x1));
                    linieBloki.shift();
                    do {
                        var foundIdx = -1;
                        var foundBlock = linieBloki.find(function(block) {
                            foundIdx++;       
                            var cmp = (drawingObject.linie[0].begin.x == block.x1 && drawingObject.linie[0].begin.y == block.y1 || drawingObject.linie[0].begin.x == block.x2 && drawingObject.linie[0].begin.y == block.y2 ||
                                drawingObject.linie[0].end.x == block.x1 && drawingObject.linie[0].end.y == block.y1 || drawingObject.linie[0].end.x == block.x2 && drawingObject.linie[0].end.y == block.y2);
                            return cmp && (direction == (block.x2 == block.x1 ? "vertical" : (block.y2 - block.y1)/(block.x2 - block.x1)))
                        });
                        if(foundBlock != undefined) {
                            if(drawingObject.linie[0].begin.x == foundBlock.x1 && drawingObject.linie[0].begin.y == foundBlock.y1 && foundBlock.x2 <= drawingObject.linie[0].begin.x && foundBlock.y2 <= drawingObject.linie[0].begin.y)                             
                            {                                                                
                                drawingObject.linie[0].begin.x = foundBlock.x2;
                                drawingObject.linie[0].begin.y = foundBlock.y2;
                            }
                            else if(drawingObject.linie[0].begin.x == foundBlock.x2 && drawingObject.linie[0].begin.y == foundBlock.y2 && foundBlock.x1 <= drawingObject.linie[0].begin.x && foundBlock.y1 <= drawingObject.linie[0].begin.y) 
                            {
                                drawingObject.linie[0].begin.x = foundBlock.x1;
                                drawingObject.linie[0].begin.y = foundBlock.y1;
                            }
                            else if(drawingObject.linie[0].end.x == foundBlock.x1 && drawingObject.linie[0].end.y == foundBlock.y1 && foundBlock.x2 >= drawingObject.linie[0].end.x && foundBlock.y2 >= drawingObject.linie[0].end.y) 
                            {
                                drawingObject.linie[0].end.x = foundBlock.x2;
                                drawingObject.linie[0].end.y = foundBlock.y2;
                            }
                            else if(drawingObject.linie[0].end.x == foundBlock.x2 && drawingObject.linie[0].end.y == foundBlock.y2 && foundBlock.x1 >= drawingObject.linie[0].end.x && foundBlock.y1 >= drawingObject.linie[0].end.y)
                            {
                                drawingObject.linie[0].end.x = foundBlock.x1;
                                drawingObject.linie[0].end.y = foundBlock.y1;
                            }
                            linieBloki.splice(foundIdx, 1);
                        }
                    }
                    while(foundBlock != undefined);
                }                
            }
            if(drawingObject.backgroundColor != undefined) {
                document.getElementById("sld").style.backgroundColor = parseColor(drawingObject.backgroundColor);
            }
            drawingObject.linie.forEach(function(linia) {
                var line = svgScheme.line(linia.begin.x, linia.begin.y, linia.end.x, linia.end.y).stroke({color: parseColor(linia.color), width: 2 });
            });            
            drawingObject.teksty.forEach(function(tekst) {
                drawText(tekst);
            });
            drawingObject.pomiary.forEach(function(pomiar) {          
                pomiar.bounding = undefined;             
                pomiar.boundingAnimation = undefined;       
                if(pomiar.list != undefined)
                    fillSchemeCombo(pomiar);           
                else
                    drawPomiar(pomiar);
            });  

            var strokeWidth = 2;  
            drawingObject.symbol.forEach(function(sym) {
                var svgSymbol = svgScheme.symbol();
                var hGndPattern = svgScheme.pattern(2, 2, function(add) {
                    add.line(0,0,16,0).stroke({color: "#f00", width: 1});
                    add.line(0,2,16,2).stroke({color: "#f00", width: 1});
                });
                var vGndPattern = svgScheme.pattern(2, 2, function(add) {
                    add.line(0,0,0,16).stroke({color: "#f00", width: 1});
                    add.line(2,0,2,16).stroke({color: "#f00", width: 1});                    
                });                
                switch(sym.type)  {
                    case "1":                        
                        svgSymbol.line(8,0,8,8).stroke({color: '#F00', width: 1});
                        svgSymbol.polygon('2,8 14,8, 8,16').fill(hGndPattern);
                    break;
                    case "2":                        
                        svgSymbol.line(0,8,8,8).stroke({color: '#F00', width: 1});                        
                        svgSymbol.polygon('8,2 8,14, 16,8').fill(vGndPattern);
                    break;
                    case "3":                        
                        svgSymbol.line(8,8,16,8).stroke({color: '#F00', width: 1});
                        svgSymbol.polygon('0,8 8,2, 8,14').fill(vGndPattern);
                    break;
                    case "4":                        
                        svgSymbol.line(8,8,8,16).stroke({color: '#F00', width: 1});
                        svgSymbol.polygon('2,8 8,0, 14,8').fill(hGndPattern);                        
                    break;
                    case "5":                        
                        svgSymbol.line(8,0,8,3).stroke({color: '#F00', width: 1});
                        svgSymbol.circle(6).move(5,3).stroke({color: '#F00', width: 1});
                        svgSymbol.circle(6).move(5,7).fill('none').stroke({color: '#0080C0', width: 1});
                        svgSymbol.line(8,13,8,16).stroke({color: '#0080C0', width: 1});
                    break;
                    case "6":                        
                        svgSymbol.line(8,0,8,3).stroke({color: '#0080C0', width: 1});
                        svgSymbol.circle(6).move(5,3).stroke({color: '#0080C0', width: 1});
                        svgSymbol.circle(6).move(5,7).fill('none').stroke({color: '#FF0', width: 1});
                        svgSymbol.line(8,13,8,16).stroke({color: '#FF0', width: 1});
                    break;
                    case "101":                        
                        svgSymbol.line(24,0,24,9).stroke({color: '#F00', width: strokeWidth});
                        svgSymbol.circle(18).move(15,9).stroke({color: '#F00', width: strokeWidth});
                        svgSymbol.circle(18).move(15,21).fill('none').stroke({color: '#0080C0', width: strokeWidth});
                        svgSymbol.line(24,39,24,48).stroke({color: '#0080C0', width: strokeWidth});
                    break;
                    case "102":                        
                        svgSymbol.line(24,0,24,9).stroke({color: '#808080', width: strokeWidth});
                        svgSymbol.circle(18).move(15,9).fill('none').stroke({color: '#808080', width: strokeWidth});
                        svgSymbol.circle(18).move(15,21).fill('none').stroke({color: '#F00', width: strokeWidth});
                        svgSymbol.line(24,39,24,48).stroke({color: '#F00', width: strokeWidth});
                    break;
                    case "103":                        
                        svgSymbol.line(24,0,24,9).stroke({color: '#0080C0', width: strokeWidth});
                        svgSymbol.circle(18).move(15,9).fill('none').stroke({color: '#0080C0', width: strokeWidth});
                        svgSymbol.circle(18).move(15,21).fill('none').stroke({color: '#FF0', width: strokeWidth});
                        svgSymbol.line(24,39,24,48).stroke({color: '#FF0', width: strokeWidth});
                    break;
                    case "104":
                    case "106":
                    case "108":
                        var fillColor = "#0080c0";
                        if(sym.type == "106")
                        fillColor = "#f00";
                        else if(sym.type == "108")
                        fillColor = "#ff0";
                        svgSymbol.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                        svgSymbol.rect(24, 24).fill("#808080").move(12,12);
                    break;
                    case "105":
                    case "107":
                    case "109":
                        var fillColor = "#0080c0";
                        if(sym.type == "107")
                        fillColor = "#f00";
                        else if(sym.type == "109")
                        fillColor = "#ff0";
                        svgSymbol.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                        svgSymbol.rect(24, 24).fill("#808080").move(12,12);
                    break;
                };
                svgScheme.use(svgSymbol).move(sym.x, sym.y);

            });
            drawingObject.tele.forEach(function(tmech) {
                switch(tmech.type)  {
                    case "1":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: 2});
                        tmech.svgSymbol.state10.rect(8, 8).fill("#f00").move(4,4);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.line(8, 0, 8, 16).stroke({width: 2});
                        tmech.svgSymbol.state01.rect(8, 8).fill("#0f0").move(4,4);

                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.line(8, 0, 8, 16).stroke({width: 2});
                        tmech.svgSymbol.state11.rect(8, 8).fill("#FFF").move(4,4);

                        tmech.svgSymbol.state00 =  tmech.svgSymbol.state11;
                    break;
                    case "2":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: 2});
                        tmech.svgSymbol.state10.circle(8).fill("#f00").cx(8).cy(8);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.line(8, 0, 8, 16).stroke({width: 2});
                        tmech.svgSymbol.state01.circle(8).fill("#0f0").cx(8).cy(8);

                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.line(8, 0, 8, 16).stroke({width: 2});
                        tmech.svgSymbol.state11.circle(8).fill("#FFF").cx(8).cy(8);

                        tmech.svgSymbol.state00 = tmech.svgSymbol.state11;
                    break;
                    case "3":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(0, 8, 8, 8).stroke({width: 2});
                        tmech.svgSymbol.state10.polygon("8,4 8,12 16,8").fill("#dd0");

                        tmech.svgSymbol.state01 = tmech.svgSymbol.state10;
                        tmech.svgSymbol.state11 = tmech.svgSymbol.state10;
                        tmech.svgSymbol.state00 = tmech.svgSymbol.state10;
                    break;
                    case "4":
                    case "10":               
                        var rotateValue = 0;
                        if(tmech.type == "10")
                            rotateValue = 90;
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: strokeWidth}).rotate(rotateValue);
                        tmech.svgSymbol.state10.rect(12, 12).fill(drawingObject.backgroundColor).stroke({width: strokeWidth}).move(2,2);
                        tmech.svgSymbol.state10.line(8,2,8,14).stroke({width: strokeWidth}).rotate(rotateValue);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.line(8, 0, 8, 16).stroke({width: strokeWidth}).rotate(rotateValue);                                    
                        tmech.svgSymbol.state01.rect(12, 12).fill(drawingObject.backgroundColor).stroke({width: strokeWidth}).move(2,2);
                        tmech.svgSymbol.state01.line(2, 8, 14, 8).stroke({width: strokeWidth}).rotate(rotateValue);

                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.line(8, 0, 8, 16).stroke({width: strokeWidth}).rotate(rotateValue);
                        tmech.svgSymbol.state11.rect(12, 12).fill(drawingObject.backgroundColor).stroke({width: strokeWidth}).move(2,2);                        
                        tmech.svgSymbol.state11.line(2, 14, 14, 2).stroke({width: strokeWidth});

                        tmech.svgSymbol.state00 =  tmech.svgSymbol.state11;
                    break;
                    case "5":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.circle(12).stroke({width: 2}).cx(8).cy(8).fill("none");
                        tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: 2});

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.circle(12).stroke({width: 2}).cx(8).cy(8).fill("none");
                        tmech.svgSymbol.state01.line(0, 8, 16, 8).stroke({width: 2});

                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.circle(12).stroke({width: 2}).cx(8).cy(8).fill("none");
                        tmech.svgSymbol.state11.line(0, 0, 16, 16).stroke({width: 2});

                        tmech.svgSymbol.state00 = tmech.svgSymbol.state11;
                    break;
                    case "7":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(0, 8, 16, 8).stroke({width: 2});
                        tmech.svgSymbol.state10.rect(8, 8).fill("#f00").move(4,4);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.line(0, 8, 16, 8).stroke({width: 2});
                        tmech.svgSymbol.state01.rect(8, 8).fill("#0f0").move(4,4);

                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.line(0, 8, 16, 8).stroke({width: 2});
                        tmech.svgSymbol.state00.rect(8, 8).fill("#FFF").move(4,4);

                        tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
                    break;
                    case "8":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(0, 8, 16, 8).stroke({width: 2});
                        tmech.svgSymbol.state10.circle(8).fill("#f00").cx(8).cy(8);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.line(0, 8, 16, 8).stroke({width: 2});
                        tmech.svgSymbol.state01.circle(8).fill("#0f0").cx(8).cy(8);

                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.line(0, 8, 16, 8).stroke({width: 2});
                        tmech.svgSymbol.state00.circle(8).fill("#FFF").cx(8).cy(8);

                        tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
                    break;
                    case "9":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(8, 0, 8, 8).stroke({width: 2});
                        tmech.svgSymbol.state10.polygon("4,8 12,8 8,16").fill("#dd0");

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.line(8, 0, 8, 8).stroke({width: 2});
                        tmech.svgSymbol.state01.polygon("4,8 12,8 8,16").fill("#0f0");

                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.line(8, 0, 8, 8).stroke({width: 2});
                        tmech.svgSymbol.state00.polygon("4,8 12,8 8,16").fill("#FFF");

                        tmech.svgSymbol.state11 = tmech.svgSymbol.state01;
                    break;
                    case "11":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(8, 0, 8, 2).stroke({width: 2});
                        tmech.svgSymbol.state10.line(8, 14, 8, 16).stroke({width: 2});
                        tmech.svgSymbol.state10.rect(8, 8).fill("#f00").move(4,4);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.line(8, 0, 8, 2).stroke({width: 2});
                        tmech.svgSymbol.state01.line(8, 14, 8, 16).stroke({width: 2});
                        tmech.svgSymbol.state01.rect(8, 8).fill("#0f0").move(4,4);

                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.line(8, 0, 8, 2).stroke({width: 2});
                        tmech.svgSymbol.state00.line(8, 14, 8, 16).stroke({width: 2});
                        tmech.svgSymbol.state00.rect(8, 8).fill("#FFF").move(4,4);

                        tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
                    break;
                    case "12":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(0, 8, 2, 8).stroke({width: 2});
                        tmech.svgSymbol.state10.line(14, 8, 16, 8).stroke({width: 2});
                        tmech.svgSymbol.state10.rect(8, 8).fill("#f00").move(4,4);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.line(0, 8, 2, 8).stroke({width: 2});
                        tmech.svgSymbol.state01.line(14, 8, 16, 8).stroke({width: 2});
                        tmech.svgSymbol.state01.rect(8, 8).fill("#0f0").move(4,4);

                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.line(0, 8, 2, 8).stroke({width: 2});
                        tmech.svgSymbol.state00.line(14, 8, 16, 8).stroke({width: 2});
                        tmech.svgSymbol.state00.rect(8, 8).fill("#FFF").move(4,4);

                        tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
                    break;
                    case "13":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.rect(32, 32).fill(drawingObject.backgroundColor).move(-8,-8);
                        tmech.svgSymbol.state10.rect(12, 12).fill("#f00").move(2,2).radius(2);                            

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.rect(32, 32).fill(drawingObject.backgroundColor).move(-8,-8);
                        tmech.svgSymbol.state01.rect(12, 12).fill("#0f0").move(2,2).radius(2);                            

                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.rect(32, 32).fill(drawingObject.backgroundColor).move(-8,-8);
                        tmech.svgSymbol.state00.rect(12, 12).fill("#FFF").move(2,2).radius(2);                            

                        tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
                    break;
                    case "14":
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.circle(12).fill("#f00").cx(8).cy(8);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.circle(12).fill(drawingObject.backgroundColor).stroke({color: "#0f0", width: strokeWidth}).cx(8).cy(8);

                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.circle(12).fill(drawingObject.backgroundColor).stroke({color: "#AAA", width: strokeWidth}).cx(8).cy(8);

                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.circle(12).fill("#AAA").cx(8).cy(8);
                    break;                    
                    case "23":
                    case "24":
                    case "25":
                    case "26":
                        var fillColor = "#f00";
                        if(tmech.type == "24")
                        fillColor = "#0080c0";
                        else if(tmech.type == "25")
                        fillColor = "#ff0";
                        else if(tmech.type == "26")
                        fillColor = "#000";

                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: 1, color: fillColor});
                        tmech.svgSymbol.state10.rect(8, 8).fill(fillColor).move(4,4);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.line(8, 0, 8, 16).stroke({width: 1, color: fillColor});
                        tmech.svgSymbol.state01.rect(8, 8).stroke({color: fillColor}).move(4,4);

                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.line(8, 0, 8, 4).stroke({width: 1, color: fillColor});
                        tmech.svgSymbol.state11.line(8, 12, 8, 16).stroke({width: 1, color: fillColor});                        
                        tmech.svgSymbol.state11.line(4, 4, 12, 12).stroke({width: 1, color: fillColor});
                        tmech.svgSymbol.state11.line(12, 4, 4, 12).stroke({width: 1, color: fillColor});         
                    
                        tmech.svgSymbol.state00 = tmech.svgSymbol.state11;

                        tmech.svgSymbol.state10unav = svgScheme.symbol();
                        tmech.svgSymbol.state10unav.line(8, 0, 8, 16).stroke({width: 1, color: fillColor});
                        tmech.svgSymbol.state10unav.rect(8, 8).fill("#f0f").move(4,4);

                        tmech.svgSymbol.state01unav = svgScheme.symbol();
                        tmech.svgSymbol.state01unav.line(8, 0, 8, 16).stroke({width: 1, color: fillColor});
                        tmech.svgSymbol.state01unav.rect(8, 8).stroke({color: "#f0f"}).move(4,4);
                    break;
                    case "27":
                    case "28":
                    case "29":
                        var fillColor = "#f00";
                        if(tmech.type == "28")
                            fillColor = "#0080c0";
                        else if(tmech.type == "29")
                            fillColor = "#ff0";
                        else if(tmech.type == "30")
                            fillColor = "#000";
                        tmech.svgSymbol.state10 = svgScheme.symbol();

                        tmech.svgSymbol.state10.circle(12).fill("#f00").cx(8).cy(8);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.circle(12).fill(drawingObject.backgroundColor).stroke({color: "#0f0", width: strokeWidth}).cx(8).cy(8);

                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.circle(12).fill(drawingObject.backgroundColor).stroke({color: "#AAA", width: strokeWidth}).cx(8).cy(8);

                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.circle(12).fill("#AAA").cx(8).cy(8);
                    break;
                    case "30":
                    case "107":
                        //auto zal
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.rect(16, 16).fill("#f00");                        
                        tmech.svgSymbol.state10.line(0, 8, 4, 8).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state10.line(12, 8, 16, 8).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state10.line(4, 4, 4, 12).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state10.line(12, 4, 12, 12).stroke({width: strokeWidth/2});
                        //reka wyl
                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.rect(16, 16).fill("#0f0");          
                        tmech.svgSymbol.state01.rect(14, 14).fill("none").stroke({color: "#00f", width: strokeWidth}).move(strokeWidth/2,strokeWidth/2);              
                        tmech.svgSymbol.state01.line(0, 8, 4, 8).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state01.line(12, 8, 16, 8).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state01.line(4, 4, 4, 12).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state01.line(12, 4, 12, 12).stroke({width: strokeWidth/2});
                        //reka zal 
                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.rect(16, 16).fill("#f00");
                        tmech.svgSymbol.state11.rect(14, 14).fill("none").stroke({color: "#00f", width: strokeWidth}).move(strokeWidth/2,strokeWidth/2);
                        tmech.svgSymbol.state11.line(0, 8, 4, 8).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state11.line(12, 8, 16, 8).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state11.line(4, 4, 4, 12).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state11.line(12, 4, 12, 12).stroke({width: strokeWidth/2});
                        //auto wyl
                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.rect(16, 16).fill("#0f0");                                         
                        tmech.svgSymbol.state00.line(0, 8, 4, 8).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state00.line(12, 8, 16, 8).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state00.line(4, 4, 4, 12).stroke({width: strokeWidth/2});
                        tmech.svgSymbol.state00.line(12, 4, 12, 12).stroke({width: strokeWidth/2});

                        if(tmech.sterLname == undefined || tmech.sterLname == "" || tmech.sterLname == tmech.sterL)
                            tmech.sterLname = "Załącz";
                        if(tmech.sterHname == undefined || tmech.sterHname == "" || tmech.sterHname == tmech.sterH)
                            tmech.sterHname = "Wyłącz";                                
                        if(tmech.sterAname == undefined || tmech.sterAname == "" || tmech.sterAname == tmech.sterA)
                            tmech.sterAname = "Auto";
                        if(tmech.sterRname == undefined || tmech.sterRname == "" || tmech.sterRname == tmech.sterR)
                            tmech.sterRname = "Manual";
                        
                        if(tmech.type == "107") {
                            tmech.svgSymbol.state10.each(function(i, children) {
                                this.scale(3,3,0,0)
                            });
                            tmech.svgSymbol.state01.each(function(i, children) {
                                this.scale(3,3,0,0)
                            });
                            tmech.svgSymbol.state11.each(function(i, children) {
                                this.scale(3,3,0,0)
                            });
                            tmech.svgSymbol.state00.each(function(i, children) {
                                this.scale(3,3,0,0)
                            });
                        }

                    break;   
                    case "31":   
                    case "108":
                        //zal            
                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.rect(16, 16).fill("#f00");
                        tmech.svgSymbol.state10.rect(14, 14).fill("none").stroke({color: "#00f", width: strokeWidth}).move(strokeWidth/2,strokeWidth/2);
                        tmech.svgSymbol.state10.path('M0 10 L4 10 A2.5 2.5 0 1 1 7 10 A2.5 2.5 0 1 1 10 10 A2.5 2.5 0 1 1 13 10 L16 10').fill('none').stroke({width: strokeWidth/2});
                        //auto wyl
                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.rect(16, 16).fill("#0f0");                                         
                        tmech.svgSymbol.state01.path('M0 10 L4 10 A2.5 2.5 0 1 1 7 10 A2.5 2.5 0 1 1 10 10 A2.5 2.5 0 1 1 13 10 L16 10').fill('none').stroke({width: strokeWidth/2});
                        //auto zal
                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.rect(16, 16).fill("#f00");                        
                        tmech.svgSymbol.state11.path('M0 10 L4 10 A2.5 2.5 0 1 1 7 10 A2.5 2.5 0 1 1 10 10 A2.5 2.5 0 1 1 13 10 L16 10').fill('none').stroke({width: strokeWidth/2});
                        //wyl                        
                        tmech.svgSymbol.state00 = svgScheme.symbol();
                        tmech.svgSymbol.state00.rect(16, 16).fill("#0f0");           
                        tmech.svgSymbol.state00.rect(14, 14).fill("none").stroke({color: "#00f"}).move(strokeWidth/2,strokeWidth/2);
                        tmech.svgSymbol.state00.path('M0 10 L4 10 A2.5 2.5 0 1 1 7 10 A2.5 2.5 0 1 1 10 10 A2.5 2.5 0 1 1 13 10 L16 10').fill('none').stroke({width: strokeWidth/2});
                        if(tmech.type == "108") {
                            tmech.svgSymbol.state10.each(function(i, children) {
                                this.scale(3,3,0,0)
                            });
                            tmech.svgSymbol.state01.each(function(i, children) {
                                this.scale(3,3,0,0)
                            });
                            tmech.svgSymbol.state11.each(function(i, children) {
                                this.scale(3,3,0,0)
                            });
                            tmech.svgSymbol.state00.each(function(i, children) {
                                this.scale(3,3,0,0)
                            });
                        }
                    break;                    
                    case "101":
                    case "103":
                    case "105":
                        var fillColor = "#0080c0";
                        if(tmech.type == "103")
                        fillColor = "#f00";
                        else if(tmech.type == "105")
                        fillColor = "#ff0";

                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state10.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state10.rect(24, 24).fill("#080").move(12,12);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state01.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state01.rect(24, 24).stroke({color: "#080", width: strokeWidth}).move(12,12);

                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state11.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state11.line(12, 12, 36, 36).stroke({width: strokeWidth, color: "#f00"});
                        tmech.svgSymbol.state11.line(36, 12, 12, 36).stroke({width: strokeWidth, color: "#f00"});        
                    
                        tmech.svgSymbol.state00 = tmech.svgSymbol.state11;

                        tmech.svgSymbol.state10unav = svgScheme.symbol();
                        tmech.svgSymbol.state10unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state10unav.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state10unav.rect(24, 24).fill("#f0f").move(12,12);

                        tmech.svgSymbol.state01unav = svgScheme.symbol();
                        tmech.svgSymbol.state01unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state01unav.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state01unav.rect(24, 24).stroke({color: "#f0f", width: strokeWidth}).move(12,12);

                        tmech.svgSymbol.state11unav = svgScheme.symbol();
                        tmech.svgSymbol.state11unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state11unav.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state11unav.line(12, 12, 36, 36).stroke({width: strokeWidth, color: "#f0f"});
                        tmech.svgSymbol.state11unav.line(36, 12, 12, 36).stroke({width: strokeWidth, color: "#f0f"});

                        tmech.svgSymbol.stateNone = svgScheme.symbol();
                        tmech.svgSymbol.stateNone.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                    break;
                    case "102":
                    case "104":
                    case "106":
                        var fillColor = "#0080c0";
                        if(tmech.type == "104")
                        fillColor = "#f00";
                        else if(tmech.type == "106")
                        fillColor = "#ff0";

                        tmech.svgSymbol.state10 = svgScheme.symbol();
                        tmech.svgSymbol.state10.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state10.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state10.rect(24, 24).fill("#080").move(12,12);

                        tmech.svgSymbol.state01 = svgScheme.symbol();
                        tmech.svgSymbol.state01.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state01.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state01.rect(24, 24).stroke({color: "#080", width: strokeWidth}).move(12,12);

                        tmech.svgSymbol.state11 = svgScheme.symbol();
                        tmech.svgSymbol.state11.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state11.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state11.line(12, 12, 36, 36).stroke({width: strokeWidth, color: "#f00"});
                        tmech.svgSymbol.state11.line(36, 12, 12, 36).stroke({width: strokeWidth, color: "#f00"});

                        tmech.svgSymbol.state00 = tmech.svgSymbol.state11;

                        tmech.svgSymbol.state10unav = svgScheme.symbol();
                        tmech.svgSymbol.state10unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state10unav.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state10unav.rect(24, 24).fill("#f0f").move(12,12);

                        tmech.svgSymbol.state01unav = svgScheme.symbol();
                        tmech.svgSymbol.state10unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state01unav.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state01unav.rect(24, 24).stroke({color: "#f0f", width: strokeWidth}).move(12,12);

                        tmech.svgSymbol.state11unav = svgScheme.symbol();
                        tmech.svgSymbol.state11unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                        tmech.svgSymbol.state11unav.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                        tmech.svgSymbol.state11unav.line(12, 12, 36, 36).stroke({width: strokeWidth, color: "#f0f"});
                        tmech.svgSymbol.state11unav.line(36, 12, 12, 36).stroke({width: strokeWidth, color: "#f0f"});

                        tmech.svgSymbol.stateNone = svgScheme.symbol();
                        tmech.svgSymbol.stateNone.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                    break;
                }
                if(tmech.svgSymbol != undefined) {       
                    tmech.bounding = undefined;             
                    tmech.boundingAnimation = undefined;    
                    

                    var foundL = false, foundH = (tmech.weH == undefined ? true : false)
                    if(currentScheme != undefined && statesForSchemes[currentScheme] != undefined && statesForSchemes[currentScheme].binary != undefined) {
                        for (var binI = 0; binI < statesForSchemes[currentScheme].binary.length; binI++ ) {
                            if(tmech.weL == statesForSchemes[currentScheme].binary[binI].index) {
                                tmech.stateL = parseInt(statesForSchemes[currentScheme].binary[binI].state, 16);
                                foundL = true;
                            }
                            if(tmech.weH == statesForSchemes[currentScheme].binary[binI].index) {
                                tmech.stateH = parseInt(statesForSchemes[currentScheme].binary[binI].state, 16);
                                foundH = true;
                            } 
                        }
                        if(foundL && foundH)
                            fillSchemeTele(tmech);   
                    }
                    if(!foundL || !foundH) {
                        if(tmech.svgSymbol.state01unav != undefined)
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state01unav).move(tmech.x, tmech.y);
                        else if(tmech.svgSymbol.stateNone != undefined)
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.stateNone).move(tmech.x, tmech.y);
                        else
                            tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state00).move(tmech.x, tmech.y);                        
                    }
                    if(tmech.sterL != undefined || tmech.sterH != undefined || tmech.enableSetH != undefined || tmech.enableSetL != undefined)
                        AttachMouseBoundingAnimation(tmech, tmech.svgSymbol.used);                                     
                }
            });
            
            //addZoomButtons();
            
            drawingObject.buttons.forEach(function(button) {
                addButtonToScheme(button);
            });                
            drawingObject.checkBox.forEach(chbox => {fillSchemeCheckBox(chbox)});    //wypełnienie defaultem

            var maxx, maxy;
            svgScheme.children().forEach(element => {
                if(maxx == undefined || element.x() > maxx)
                    maxx = element.x();
                if(maxy == undefined || element.y() > maxy)
                    maxy = element.y();
            });            
            drawingObject.buttons.forEach(button => {
                if(button.path == "ZOOM+") {
                    button.svgSymbol.move(maxx / 2 - 50, maxy + 50);
                }
                else if(button.path == "ZOOM-") {
                    button.svgSymbol.move(maxx / 2 + 50, maxy + 50);
                }
            });
        }
        function addButtonToScheme(button, replace = undefined) {
            if(button != undefined) {
                if(button.svgSymbol != undefined)
                    replace.svgSymbol.remove();
                if(button.svgSymbolToBeUsed != undefined)
                    button.svgSymbolToBeUsed.remove();
            } 
            button.svgSymbolToBeUsed = svgScheme.symbol();
            button.svgSymbolToBeUsed.rect(button.width, button.height).stroke({color: "#666", width: 2}).fill(parseColor(button.color));
            button.svgSymbolToBeUsed.text(function(add) {
                //var defText = drawingObject.defaults.tekst;
                var tSpan = add.tspan(button.nazwa).font({ font: "Verdana", size: button.fontsize + "pt"}).attr('letter-spacing', '1px');
                tSpan.font.anchor = "middle";                                        
                tSpan.dx((button.width - tSpan.bbox().width)/2);
                fillColor(tSpan, button.txtColor);
                tSpan.dy(button.height/2 + 4);
            });
            button.svgSymbol = svgScheme.use(button.svgSymbolToBeUsed).move(button.x, button.y);

            if(button.mouseBoundingAnimationAttached != true && (!Array.isArray(button.users) || button.users.find(usr => {return (usr == '@all' || usr == viewModel.username)}))) 
            {
                AttachMouseBoundingAnimation(button);                
            }
        }
        function addZoomButtons() {
            
            drawingObject.buttons.push({
                width: 70,
                height: 25,
                nazwa: "Zoom in",
                path: "ZOOM+",
                x: 0,
                y: 0,
                fontsize: 10,
                color: "#c0c0c0",
                txtColor: "#0",
                svgSymbol: undefined
            });
            drawingObject.buttons.push({
                width: 70,
                height: 25,
                nazwa: "Zoom out",
                path: "ZOOM-",
                fontsize: 10,
                color: "#808080",
                txtColor: "#0",
                x: 0,
                y: 0,
                svgSymbol: undefined
            });
        }
        //------------------------------------------------------------  
        function invalidateBounding(obj) {
            if(obj.bounding != undefined) {
                if(obj.bounding.visible()) {
                    obj.bounding.hide();
                }                    
                if(obj.boundingAnimation != undefined) {
                    obj.boundingAnimation.finish();                        
                }                
            }
        }
        function invalidateAllBounding() {
            console.log("invalidateAllBounding");
            drawingObject.tele.forEach(function(tmech) {
                invalidateBounding(tmech);
            }); 
            drawingObject.buttons.forEach(function(btn) {
                invalidateBounding(btn);
            }); 
            drawingObject.checkBox.forEach(function(chbox) {
                invalidateBounding(chbox);
            }); 
            drawingObject.pomiary.forEach(function(pom) {
                invalidateBounding(pom);
            }); 
        }
        function AttachMouseBoundingAnimation(cfg, svgSymbol = undefined) {
            if(svgSymbol == undefined && cfg.svgSymbol != undefined)
                svgSymbol = cfg.svgSymbol;            
            //else
                //return;
            svgSymbol.mouseover(function(evt) {         
                if(!drawingObject.updated)
                    return;
                var drawAnim = false;                    
                if(cfg.bounding == undefined) {
                    var bbx = svgSymbol.bbox();
                    invalidateAllBounding();
                    var margin = 4;                        
                    cfg.bounding = svgScheme.rect(svgSymbol.bbox().width+margin, svgSymbol.bbox().height+margin).move(
                        svgSymbol.bbox().x-margin/2, svgSymbol.bbox().y-margin/2).stroke({color: '#333', width: 2}).fill("none");
                    drawAnim = true;
                }
                else if(!cfg.bounding.visible()) {
                    cfg.bounding.show();                        
                    drawAnim = true;                        
                }   
                if(drawAnim) {                        
                    if(cfg.boundingAnimation == undefined)
                        cfg.boundingAnimation = svgScheme.rect(svgSymbol.bbox().width+10, svgSymbol.bbox().height+10).move(
                            svgSymbol.bbox().x-5, svgSymbol.bbox().y-5).stroke({color: '#F20', width: 5}).fill("none").animate(500).opacity(0);
                    else
                        cfg.boundingAnimation.animate(1).opacity(1).animate(500).opacity(0);
                }
                if(!mouseOverCtrl.locked)
                    mouseOverCtrl.reference = cfg;
            });
            svgSymbol.mouseout(function(evt) {                    
                if(!mouseOverCtrl.locked && drawingObject.updated) {
                    invalidateBounding(cfg);
                    mouseOverCtrl.reference = undefined;
                }
            });
            cfg.mouseBoundingAnimationAttached = true;
        }
        //------------------------------------------------------------  
        function drawText(cfg) {
            if(cfg.svgSymbol != undefined) 
                cfg.svgSymbol.remove();

            cfg.svgSymbol = svgScheme.text(function(add) {
                var text = cfg.text;
                if(cfg.stateL != undefined) {
                    if(cfg.stateH == undefined) {
                        if(cfg.stateL & 0x80 && cfg.textOn != undefined)
                            text = cfg.textOn;
                        else if(!(cfg.stateL & 0x80) && cfg.textOff != undefined)
                            text = cfg.textOff;
                    }
                    else {
                        if(cfg.stateL & 0x80 && !(cfg.stateH & 0x80) && cfg.textOff != undefined) {                      
                            text = cfg.textOff;
                        }
                        if(!(cfg.stateL & 0x80) && cfg.stateH & 0x80 && cfg.textOn != undefined) {                      
                            text = cfg.textOn;
                        }
                    }
                }
                var tSpan = add.tspan(text).font({ font: "Verdana", size: cfg.fontsize + "pt", weight: (cfg.bold?"bold":"normal") }).attr('letter-spacing', '1px');                    
                if(cfg.align == "right") {
                    tSpan.font.anchor = "end";
                    var bibox = tSpan.bbox();
                    var w = tSpan.bbox().width;
                    tSpan.dx(cfg.x + cfg.width - tSpan.bbox().width);
                    var w1 = tSpan.dx();
                }
                else if(cfg.align == "center") {
                    tSpan.font.anchor = "middle";                                        
                    tSpan.dx(cfg.x + (cfg.width - tSpan.bbox().width)/2);
                }  
                else {
                    tSpan.font.anchor = "start";
                    tSpan.dx(cfg.x);
                }
                if(cfg.stateL != undefined) {
                    if(cfg.stateH != undefined) {
                        cfg.stateL |= cfg.stateH & 0x7F;                
                        cfg.stateH |= cfg.stateL & 0x7F;
                    }                                
                    if(!(cfg.stateL & 0x01) )
                        fillColor(tSpan, cfg.colorNdef);
                    else if(cfg.stateL & 0x04)
                        fillColor(tSpan, cfg.colorNw);
                    else if(cfg.stateH == undefined)
                        fillColor(tSpan, (cfg.stateL & 0x80) ? cfg.colorOn : cfg.colorOff);
                    else if(cfg.stateL & 0x80)
                        fillColor(tSpan, (cfg.stateH & 0x80) ? cfg.color11 : cfg.colorOff);
                    else
                        fillColor(tSpan, (cfg.stateH & 0x80) ? cfg.colorOn : cfg.color00);
                }
                else 
                    fillColor(tSpan, cfg.color);
                tSpan.dy(cfg.y + cfg.height/2 + 4);
            });
        }
        //------------------------------------------------------------  
        function fillColor(object, colorStr) {
            object.fill(parseColor(colorStr));
        }
        //------------------------------------------------------------  
        function parseColor(colorStr) {
            if(colorStr.length < 7)
                return ("#" + colorStr.slice(1).padStart(6, '0'));
            else
                return colorStr;
        }
        //------------------------------------------------------------  
        function preparePomiar(cfg) {
            if(cfg.lastValue == undefined)
                cfg.lastValue = {val: 0, flag: 1};
            cfg.lastValue.val *= cfg.mul;
            cfg.lastValue.val /= cfg.div;
        }
        function getColorFromPomiar(cfg) {
            if(!(cfg.lastValue.flag & 0x01))
                return cfg.colorNdef;
            else if(cfg.lastValue.flag & 0x04)
                return cfg.colorNw;
            else if(cfg.alarmH != undefined && cfg.lastValue.val >= cfg.alarmH)
                return cfg.colorAlarmH;
            else if(cfg.alarmL != undefined && cfg.lastValue.val <= cfg.alarmL)
                return cfg.colorAlarmL;
            else
                return cfg.colorOk;
        }
        function drawPomiar(cfg) {
            preparePomiar(cfg);
            var tekst = cfg.lastValue.val;//split[0];
            if(cfg.przecinek > 0) {
                tekst = cfg.lastValue.val.toFixed(cfg.przecinek);
            }
            else
                tekst = cfg.lastValue.val.toFixed(0);
            if(cfg.unit.length)
                tekst += " " + cfg.unit;

            if(cfg.svgSymbol != undefined) 
                cfg.svgSymbol.remove();

            cfg.svgSymbol = svgScheme.text(function(add) {
                var tSpan = add.tspan(tekst).font({ font: "Verdana", size: cfg.fontsize + "pt", weight: (cfg.bold?"bold":"normal") }).attr('letter-spacing', '1px');                    
                if(cfg.align == "right") {
                    tSpan.font.anchor = "end";
                    var w = tSpan.bbox().width;
                    tSpan.dx(cfg.x + cfg.width - tSpan.bbox().width);
                    var w1 = tSpan.dx();
                }
                else if(cfg.align == "center") {
                    tSpan.font.anchor = "middle";                                        
                    tSpan.dx(cfg.x + (cfg.width - tSpan.bbox().width)/2);
                }  
                else {
                    tSpan.font.anchor = "start";
                    tSpan.dx(cfg.x);
                }
                tSpan.fill(getColorFromPomiar(cfg));
                tSpan.dy(cfg.y + cfg.height/2 + 4);
            });
            if(cfg.ster != undefined || cfg.allowChange == true) {   
                AttachMouseBoundingAnimation(cfg);
            }
        }
        //------------------------------------------------------------  
        var svgMouseDown, svgTranslated = {x: 0, y: 0};
        function svgMouseDownHandler(e) {
            if(!drawingObject.updated || !isNavTreeHidden)
                return;
            var evt = window.event || e;                                
            svgMouseDown = {x: evt.layerX, y: evt.layerY};                  
            if(e.path[0].name != "analogCtrl" && e.path[0].name != "analogSet")
                e.preventDefault();    
            //onContextMenu(e);
        }
        //------------------------------------------------------------  
        function svgMouseUpHandler(e) {
            if(!drawingObject.updated || !isNavTreeHidden)
                return;
            svgMouseDown = undefined;
            svgTranslated = {x: svgScheme.transform().x, y: svgScheme.transform().y};
            if(e.path[0].name != "analogCtrl" && e.path[0].name != "analogSet")
                e.preventDefault();                    
        }
        //------------------------------------------------------------  
        function svgTouchStartHandler(e) {
            if(!drawingObject.updated)
                return;
            onContextMenu(e);
            svgMouseDownHandler(e);
        }
        //------------------------------------------------------------  
        function svgMouseMoveHandler(e) {
            if(!drawingObject.updated || !isNavTreeHidden)
                return;
            if(svgMouseDown === undefined)
                return;
            
            var evt = window.event || e;
            var pan = {x: svgMouseDown.x - evt.layerX, y: svgMouseDown.y - evt.layerY};     
            var minx, miny;
            var trans =  svgScheme.transform();
            var transX = svgTranslated.x - pan.x;
            var transY = svgTranslated.y - pan.y;
            /*if(transX < 360)
                transX = 360;
            if(transY < 0)
                transY = 0;*/
            if(pan.x != 0 || pan.y != 0)
                svgScheme.translate(transX, transY);
        }
        //------------------------------------------------------------  
        function showMenu(x, y, menu){
            if(menu == undefined || (x == 0 && y == 0))
                return;
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.style.width = 150 + 'px';
            menu.classList.add('show-menu');
        }
        //------------------------------------------------------------      
        function hideMenu(mouseOverObject, menu) {
            if(menu == undefined)
                return;
            menu.classList.remove('show-menu');
            if(mouseOverObject != undefined && !mouseOverObject.locked) {
                //mouseOverObject.locked = false; 
                mouseOverObject.reference = undefined;
            }
        }
        //------------------------------------------------------------  
        function onWindowResized(e) {
            if(e.path.find(function(item) {
                return item.id == "sld";
            })) {
                adjustSvgZoom();
            }
        }
        function onButtonClicked(e) {
            console.log("onButtonClicked");
            document.removeEventListener('click', onClick);
            if(e.srcElement != null) {
              if(e.srcElement.id == 'showNavButtonId') {
                  if(isNavTreeHidden) {
                    ShowNavTree();
                    adjustSvgZoom();
                  }
                  return;
              }
              else if(e.srcElement.id.match(/^backToSchemeButton_\d+$/g)) {
                  $scope.textToSelect = "Schemat";
                  attachHashData = true;
                  return;
              }
              else if(e.srcElement.id == "ackAllButton") {
                  ConfirmAlarms($scope.unconfirmedAlarms);
                  return;
              }
              else if(e.srcElement.localName == 'svg' || e.srcElement.id == 'svgDiv') {
                  if(!isNavTreeHidden) {
                    HideNavTree();
                    adjustSvgZoom();
                  }
              }     
            }   


            if(!drawingObject.updated)
                return;  
            invalidateAllBounding();                 
            if(mouseOverCtrl.reference == undefined) {  
                return;
            }
            mouseOverCtrl.locked = true;

            if(mouseOverCtrl.reference.ster != undefined && mouseOverCtrl.reference.ster >= 0 && !mouseOverCtrl.reference.isPomiar) {
                $scope.control(drawingObject.nazwaSS + "\n" + mouseOverCtrl.reference.nazwa + '\n' + (mouseOverCtrl.reference.sterTag?mouseOverCtrl.reference.sterTag:""), 
                    mouseOverCtrl.reference.ster);
                mouseOverCtrl.reference = undefined;
            }
            else if(mouseOverCtrl.reference.path != undefined) {
                var filename = mouseOverCtrl.reference.path.replace(/^.*[\\\/]/, '');
                if(filename == "ZOOM+" || filename == "ZOOM-") {
                    var scroll = (filename == "ZOOM+" ? 0.2 : -0.2);
                    var w = document.getElementById("sld").offsetWidth, h = document.getElementById("sld").offsetHeight;

                    if(svgScheme.transform().scaleX > scroll && svgScheme.transform().scaleY > scroll)
                        svgScheme.scale(svgScheme.transform().scaleX+scroll, svgScheme.transform().scaleY+scroll, 
                            mouseOverCtrl.reference.x/2 - w/2, mouseOverCtrl.reference.y/2 - h/2);
                    svgTranslated = {x: svgScheme.transform().x, y: svgScheme.transform().y};
                }
                else {
                    filename = filename.replace(/\.scl/, ".xml");
                    if(filename != "") {
                        attachHashData = true;
                        var xmlhttp = new XMLHttpRequest();                                         
                        xmlhttp.onreadystatechange = function() {
                            if (this.readyState == 4 && this.status == 200) {
                                xmlToSvg(this);                                    
                                HideNavTree();
                                adjustSvgZoom();                                
                                drawingObject.updated = true;
                            }
                        };                
                        xmlhttp.open("GET", "schemes\\" + filename, true);
                        //xmlhttp.setRequestHeader("Authorization", dataToken());      
                        xmlhttp.send();
                    }
                }
            }  
            else if(mouseOverCtrl.reference.isCheckBox == true) {
                if(mouseOverCtrl.reference.stateL & 0x80) {
                    if(SetIndex(mouseOverCtrl.reference.weL, 0x01) == 0 && !reqsent.data) {
                        reqsent.data = true;
                        mouseOverCtrl.reference.stateL &= ~(0x80);
                        fillSchemeCheckBox(mouseOverCtrl.reference);
                        reqsent.data = false;
                    }
                }
                else {
                    if(SetIndex(mouseOverCtrl.reference.weL, 0x81) == 0 && !reqsent.data) {
                        reqsent.data = true;
                        mouseOverCtrl.reference.stateL |= 0x80;
                        fillSchemeCheckBox(mouseOverCtrl.reference);
                        reqsent.data = false;
                    }
                }                    
            }      
            else if(mouseOverCtrl.reference.isEventLog == true) {
                mouseOverCtrl.reference = undefined;
                mouseOverCtrl.locked = false;
                $scope.textToSelect =  "Event log";
                attachHashData = true;
                
            }
            else if(mouseOverCtrl.reference.isAlarmList == true) {
                mouseOverCtrl.reference = undefined;
                mouseOverCtrl.locked = false;
                var alarmLogNode = $scope.my_data.find(node => {
                    return node.label.match(/^(NEW! )?Alarms( NEW!)?$/g);
                });
                if(alarmLogNode != undefined) {
                    $scope.textToSelect =  alarmLogNode.label;
                    attachHashData = true;
                }
            }
            else if(mouseOverCtrl.reference.isLogging == true) {
                mouseOverCtrl.reference = undefined;
                mouseOverCtrl.locked = false;
                $scope.textToSelect = "Login";
                attachHashData = true;
            }
            
            //mouseOverCtrl = {locked: false, reference: undefined};
            mouseOverCtrl.locked = false;

            if(mouseOverCtrl.reference != undefined && mouseOverCtrl.reference.list != undefined && mouseOverCtrl.reference.allowChange == true) {   
                //comboBox
                onContextMenu(e);
            }            
        }
        //------------------------------------------------------------  
        function onContextMenu(e) {
            if(e.path.find(function(item) {
                return (item.id == "sld" && !drawingObject.updated);
            })) {
                return;
            }


            if(e.path.find(function(item) {
                return item.id == "sld" || item.id == "expansionPanelId";
            })) {                    
                e.preventDefault();
                //invalidateAllBounding();  
            }
            else {
                invalidateAllBounding();
                return;
            }
            

            if(!mouseOverCtrl.locked) {
                document.getElementById("digitalCtrlOnMenuItem").style.display = "none";
                document.getElementById("digitalCtrlOffMenuItem").style.display = "none";
                document.getElementById("digitalCtrlAMenuItem").style.display = "none";
                document.getElementById("digitalCtrlRMenuItem").style.display = "none";

                document.getElementById("digitalSetOnLMenuItem").style.display = "none";
                document.getElementById("digitalSetOffLMenuItem").style.display = "none";
                document.getElementById("digitalSetOnHMenuItem").style.display = "none";
                document.getElementById("digitalSetOffHMenuItem").style.display = "none";

                document.getElementById("analogCtrlMenuItem").style.display = "none";
                document.getElementById("analogSetMenuItem").style.display = "none";

                document.getElementById("comboBoxMenuItemDiv").style.display = "none";
            }
            if(!mouseOverFormula.locked)
                document.getElementById("alarmConfirmMenuItem").style.display = "none";

            if(mouseOverCtrl.reference != undefined && !mouseOverCtrl.locked) {
                mouseOverCtrl.locked = true;

                var isCombo = mouseOverCtrl.reference.list != undefined && mouseOverCtrl.reference.allowChange == true && Array.isArray(mouseOverCtrl.reference.list.elements);
                if(mouseOverCtrl.reference.enableSetL == undefined && mouseOverCtrl.reference.enableSetH == undefined && mouseOverCtrl.reference.allowChange == undefined &&  
                    mouseOverCtrl.reference.ster == undefined && mouseOverCtrl.reference.sterL == undefined && mouseOverCtrl.reference.sterH == undefined && 
                    !isCombo) 
                {
                    return;
                }

                var menuPos = {x: e.layerX, y: e.layerY};

                if(isCombo) {
                    //comboBox                    
                    var count = 0;
                    viewModel.ComboBoxItems = mouseOverCtrl.reference.list.elements.map(element => {return {nazwa: element.name, id: count++}});
                    document.getElementById("comboBoxMenuItemDiv").style.display = "block";
                }

                viewModel.CtrlOffText = "Open";
                viewModel.CtrlOnText = "Close";

                viewModel.CtrlAText = "";
                viewModel.CtrlRText = "";
                viewModel.SetOnLText = "";
                viewModel.SetOffLText = "";
                viewModel.SetOnHText = "";
                viewModel.SetOffHText = "";
                
                if(mouseOverCtrl.reference.type == "30" || mouseOverCtrl.reference.type == "31" || mouseOverCtrl.reference.type == "107" || mouseOverCtrl.reference.type == "108") 
                {    //człony regulatora
                    viewModel.CtrlOnText = "Switch On";
                    viewModel.CtrlOffText = "Switch Off";                        
                    viewModel.CtrlAText = "Auto";
                    viewModel.CtrlRText = "Manual";

                    if(mouseOverCtrl.reference.stateH != undefined && mouseOverCtrl.reference.stateH & 0x80 && mouseOverCtrl.reference.sterA != undefined) {
                        document.getElementById("digitalCtrlAMenuItem").style.display = "block";
                        if(mouseOverCtrl.reference.stateL != undefined) {
                            if(mouseOverCtrl.reference.stateL & 0x80)
                                document.getElementById("digitalCtrlOffMenuItem").style.display = "block";
                            else
                                document.getElementById("digitalCtrlOnMenuItem").style.display = "block";
                        }
                    }
                    else if(mouseOverCtrl.reference.stateH != undefined && !(mouseOverCtrl.reference.stateH & 0x80) && mouseOverCtrl.reference.sterR != undefined)
                        document.getElementById("digitalCtrlRMenuItem").style.display = "block";
                }
                else {
                    if(mouseOverCtrl.reference.ster != undefined) {   //pomiar                
                        document.getElementById("analogCtrlMenuItem").style.display = "block";                
                        document.getElementById("analogCtrlMenuItemInput").value = mouseOverCtrl.reference.lastValue.val;
                    }
                    if(mouseOverCtrl.reference.type == "13") {
                        viewModel.CtrlOnText = "Set";
                        viewModel.CtrlOffText = "Unset";  
                    }
                    if(mouseOverCtrl.reference.sterL != undefined) {  //dwustan
                        if(!(mouseOverCtrl.reference.type == "13") || !(mouseOverCtrl.reference.stateL & 0x80))
                            document.getElementById("digitalCtrlOnMenuItem").style.display = "block";
                    }
                    if(mouseOverCtrl.reference.sterH != undefined) {  //dwustan
                        if(!(mouseOverCtrl.reference.type == "13") || mouseOverCtrl.reference.stateL & 0x80)
                            document.getElementById("digitalCtrlOffMenuItem").style.display = "block";
                    }

                    if(!isCombo && mouseOverCtrl.reference.allowChange == true && mouseOverCtrl.reference.we != undefined) {  //dwustan
                        document.getElementById("analogSetMenuItem").style.display = "block";
                        document.getElementById("analogSetMenuItemInput").value = mouseOverCtrl.reference.lastValue.val;
                    }
                    if(mouseOverCtrl.reference.enableSetL == "true" && mouseOverCtrl.reference.weL != undefined) {  //dwustan
                        if(viewModel.SetOnLText.length)
                            document.getElementById("digitalSetOnLMenuItem").style.display = "block";
                        if(viewModel.SetOffLText.length)
                            document.getElementById("digitalSetOffLMenuItem").style.display = "block";
                    }
                    if(mouseOverCtrl.reference.enableSetH == "true" && mouseOverCtrl.reference.weH != undefined) {  //dwustan
                        if(viewModel.SetOnHText.length)
                            document.getElementById("digitalSetOnHMenuItem").style.display = "block";
                        if(viewModel.SetOffHText.length)
                            document.getElementById("digitalSetOffHMenuItem").style.display = "block";
                    }     
                }
                //e.preventDefault();
                showMenu(menuPos.x, menuPos.y, sldMenu); 
            }      
            else if(mouseOverFormula.reference != undefined && mouseOverFormula.reference.skwitowana == false && !mouseOverFormula.locked) {
                mouseOverFormula.locked = true;
                document.getElementById("alarmConfirmMenuItem").style.display = "block";
                var obj = this, posx = 0, posy = 0;
                e.path.forEach(function(item) {
                    if(item.id == "expansionPanelId") {
                        posx += item.offsetLeft;
                        posy += item.offsetTop;
                    }
                    if(item.scrollLeft != undefined)
                        posx -= item.scrollLeft;
                    if(item.scrollTop != undefined)
                        posy -= item.scrollTop;
                });
                showMenu(posx + e.layerX, posy +e.layerY, alarmMenu); 
            }            
            else
                return            
            e.stopPropagation();
            document.removeEventListener('click', onButtonClicked, true);
            document.removeEventListener('click', onClick);
            document.addEventListener('click', onClick);
        }
        function ConfirmAlarms(idArray) {
            if(!Array.isArray(idArray))
                return;
            
            idArray.forEach(id => {                    
                reqsent.bazaSet = true;
                var query = "/db?confirm_alarm_bin";
                attachHashData = true;
                var postData = alarms.channelNo + "," + id;
                $http({
                    method: 'POST',
                    url: query,
                    data: postData
                }).then(function (resp){
                    var response = resp.data;
                    checkIsAuthenticated(response);
                    reqsent.bazaSet = false;
                    //currentSessionTime = TimeoutConst;                    
                    if(response.error == undefined) {
                        console.log("Confirmation of: " + postData + " sent. No error in return.");
                    }
                    else {
                        console.log("Confirmation of: " + postData + " sent. Error: " + response.error[0].error + ".");
                    }
                },function (error) {
                    w8 = 0;
                    //currentSessionTime = TimeoutConst; !
                    ngDialog.open({
                        data: {message: ["Error:", error.status + "!"], confirm : false},
                        //preCloseCallback: function(value) { currentSessionTime = TimeoutConst; } !
                    });         
                    console.log("Confirmation of: " + postData + "sent. Error: " + error.status + "."); 
                    reqsent.bazaSet = false;
                    w8 = 0;
                    requestStatusInfoError(error.status, {code: error.statusText + " (" + error.status +")"});
                    if(error.status >= 500)
                        resetAuthSubmit();
                });
                console.log("alarmConfirmed: " + id)                    
            });                
        }
        //------------------------------------------------------------          
        function analogControlClicked(isSet = false) {
            if(mouseOverCtrl == undefined || mouseOverCtrl.reference == undefined)
                return;
            var analogValue = document.getElementById("analogCtrlMenuItemInput").value
            if(isSet)
                analogValue = document.getElementById("analogSetMenuItemInput").value;                    

            if(analogValue != "") {
                var tooLittle = false, tooBig = false;
                if(mouseOverCtrl.reference.minVal != undefined && parseFloat(analogValue) < parseFloat(mouseOverCtrl.reference.minVal))
                    tooLittle = true;
                if(mouseOverCtrl.reference.maxVal != undefined && parseFloat(analogValue) > parseFloat(mouseOverCtrl.reference.maxVal))
                    tooBig = true;
                if(tooLittle) {
                    ngDialog.open({
                        data: {
                            message: ["Value is to low. Please enter a value between " + mouseOverCtrl.reference.minVal + " and " + mouseOverCtrl.reference.maxVal], 
                            confirm : false
                        }
                    });
                    mouseOverCtrl.reference = undefined;
                    mouseOverCtrl.locked = false;
                }
                else if(tooBig) {
                    ngDialog.open({
                        data: {
                            message: ["Value is to high. Please enter a value between " + mouseOverCtrl.reference.minVal.toFixed(mouseOverCtrl.reference.przecinek) + " do " + 
                                mouseOverCtrl.reference.maxVal.toFixed(mouseOverCtrl.reference.przecinek)], 
                            confirm : false
                        }
                    }); 
                    mouseOverCtrl.reference = undefined;
                    mouseOverCtrl.locked = false;                                                       
                }
                else if(isSet) {
                    var flag = 0x01 | (analogValue.indexOf('.') != -1 ? 0x80 : 0x00);
                    SetIndex(mouseOverCtrl.reference.we, flag, analogSetValue);
                }
                else
                    analogControl(mouseOverCtrl.reference.ster, analogValue);
            }
        }
        function onClick(e) {
            console.log("onClick");
            invalidateAllBounding();
            if(e.path[0].name == "analogCtrl" || e.path[0].name == "analogSet")
                return;                                
            //send Control! 
            var digCtrlOn = (e.path.find(function(item) {
                return item.id == "digitalCtrlOnMenuItem";
            }));
            var digCtrlOff = (e.path.find(function(item) {
                return item.id == "digitalCtrlOffMenuItem";
            }));
            var digCtrlA = (e.path.find(function(item) {
                return item.id == "digitalCtrlAMenuItem";
            }));
            var digCtrlR = (e.path.find(function(item) {
                return item.id == "digitalCtrlRMenuItem";
            }));
            var analogCtrl = (e.path.find(function(item) {
                return item.id == "analogCtrlMenuItem";
            }));
            var analogSet = (e.path.find(function(item) {
                return item.id == "analogSetMenuItem";
            }));
            var digSetOnL = (e.path.find(function(item) {
                return item.id == "digitalSetOnLMenuItem";
            }));
            var digSetOffL = (e.path.find(function(item) {
                return item.id == "digitalSetOffLMenuItem";
            }));
            var digSetOnH = (e.path.find(function(item) {
                return item.id == "digitalSetOnHMenuItem";
            }));
            var digSetOffH = (e.path.find(function(item) {
                return item.id == "digitalSetOffHMenuItem";
            }));
            var alarmConfirm = (e.path.find(function(item) {
                return item.id == "alarmConfirmMenuItem";
            }));
            var comboClick = (e.path.find(function(item) {
                return item.id != undefined && item.id.match(/^comboBoxItem_\d+$/g);
            }));
            if(alarmConfirm == undefined && !drawingObject.updated)
                return;
            if(analogCtrl) {
                analogControlClicked();
            }
            else if(digCtrlOn) {
                $scope.control(mouseOverCtrl.reference.sterLname, mouseOverCtrl.reference.sterL);
            }
            else if(digCtrlOff) {
                $scope.control(mouseOverCtrl.reference.sterHname, mouseOverCtrl.reference.sterH);
            }
            else if(digCtrlA) {
                $scope.control(mouseOverCtrl.reference.sterAname, mouseOverCtrl.reference.sterA);
            }
            else if(digCtrlR) {
                $scope.control(mouseOverCtrl.reference.sterRname, mouseOverCtrl.reference.sterR);
            }
            else if(analogSet) {
                analogControlClicked(true);
            }
            else if(digSetOnL) {
                SetIndex(mouseOverCtrl.reference.weL, 0x81);
            }
            else if(digSetOffL) {
                SetIndex(mouseOverCtrl.reference.weL, 0x01);
            }
            else if(digSetOnH) {
                SetIndex(mouseOverCtrl.reference.weH, 0x81);
            }
            else if(digSetOffH) {
                SetIndex(mouseOverCtrl.reference.weH, 0x01);
            }
            else if(alarmConfirm) {
                //wysłać confirm!!!
                ConfirmAlarms([mouseOverFormula.reference.idAlarmu]);
            }
            else if(comboClick) {
                var match = comboClick.id.match(/(\d+)$/g);
                var element = mouseOverCtrl.reference.list.elements[match];                    
                if(SetIndex(mouseOverCtrl.reference.we, 0x01, element.value) == 0  && !reqsent.data) {
                    reqsent.data = true;
                    mouseOverCtrl.reference.name = element.name;
                    fillSchemeCombo(mouseOverCtrl.reference);
                    reqsent.data = false;
                }
            }
            else {
                document.activeElement.blur();
            }            
            mouseOverCtrl.locked = false;
            mouseOverFormula.locked = false;

            hideMenu(mouseOverCtrl, sldMenu);
            hideMenu(mouseOverFormula, alarmMenu);
            
            document.removeEventListener('click', onClick);
            document.removeEventListener('click', onButtonClicked, true);
            document.addEventListener('click', onButtonClicked, true);
        }
        //------------------------------------------------------------  
        function onElementFocused(e) {
            if (e && e.target)
                document.activeElement = (e.target == document ? null : e.target);
        }
        //------------------------------------------------------------  
        function mouseWheelHandler(e) {
            var scrollSensitivity = 0.05
            
            var evt = e;
            var scroll = evt.detail ? evt.detail * scrollSensitivity : (evt.wheelDelta / 120) * scrollSensitivity;
            var sld = document.getElementById("sld");
            var mainSection = document.getElementById("mainSection")
            
            var w = document.getElementById("sld").offsetWidth, h = document.getElementById("sld").offsetHeight;

            if(svgScheme.transform().scaleX > scroll && svgScheme.transform().scaleY > scroll)
                svgScheme.scale(svgScheme.transform().scaleX+scroll, svgScheme.transform().scaleY+scroll,  evt.layerX/2 - w/2, evt.layerY - h/2);
            svgTranslated = {x: svgScheme.transform().x, y: svgScheme.transform().y};
            return false; 
        }
        async function adjustSvgZoom() {
            var scroll = 0.05

            await new Promise(r => setTimeout(r, 100));
            //var xxx = document.getElementById("sld");
            //var www = mainSvg.viewbox();
            var w = document.getElementById("sld").offsetWidth, h = document.getElementById("sld").offsetHeight;
            //var w = viewBoxSize.width, h = viewBoxSize.height;
            var sldRect = document.getElementById("sld").getBoundingClientRect();            

            if(sldRect.left + sldRect.width > window.innerWidth)
                sldRect.width = window.innerWidth - sldRect.left;
            if(sldRect.top + sldRect.height > window.innerHeight)
                sldRect.height = window.innerHeight - sldRect.top;
            if(sldRect.width <= 0)
                sldRect.width = 10;
            if(sldRect.height <= 0)
                sldRect.height = 0;
            var continueZoom = false;
            var maxx, maxy;
            svgScheme.children().forEach(element => {
                if(maxx == undefined || element.rbox().x + element.rbox().width > maxx)
                    maxx = element.rbox().x + element.rbox().width;
                if(maxy == undefined || element.rbox().y + element.rbox().height > maxy)
                    maxy = element.rbox().y + element.rbox().height;
                
            });
            var minx = maxx, miny = maxy;
            svgScheme.children().forEach(element => {
                if(element.rbox().x < minx)
                    minx = element.rbox().x;
                if(element.rbox().y < miny)
                    miny = element.rbox().y;
                
            });

            if(maxx == 0 || maxy == 0)
                return;            

            var zoomIn = false;
            while(maxx < window.innerWidth - 30 && maxy < window.innerHeight - 30) {
                if(svgScheme.transform().scaleX > scroll && svgScheme.transform().scaleY > scroll)
                    svgScheme.scale(svgScheme.transform().scaleX+scroll, svgScheme.transform().scaleY+scroll,  -w/2, -h/2);
                svgTranslated = {x: svgScheme.transform().x, y: svgScheme.transform().y};

                maxx =0; 
                maxy = 0;
                svgScheme.children().forEach(element => {
                    if(maxx == undefined || element.rbox().x + element.rbox().width > maxx)
                        maxx = element.rbox().x + element.rbox().width;
                    if(maxy == undefined || element.rbox().y + element.rbox().height > maxy)
                        maxy = element.rbox().y + element.rbox().height;
                });
                zoomIn = true;
            }
            //if(!zoomIn) {
                while(maxx > window.innerWidth || maxy > window.innerHeight) {
                    if(svgScheme.transform().scaleX > scroll && svgScheme.transform().scaleY > scroll)
                        svgScheme.scale(svgScheme.transform().scaleX-scroll, svgScheme.transform().scaleY-scroll,  -w/2, -h/2);
                    svgTranslated = {x: svgScheme.transform().x, y: svgScheme.transform().y};
    
                    maxx =0; 
                    maxy = 0;
                    svgScheme.children().forEach(element => {
                        if(maxx == undefined || element.rbox().x + element.rbox().width > maxx)
                            maxx = element.rbox().x + element.rbox().width;
                        if(maxy == undefined || element.rbox().y + element.rbox().height > maxy)
                            maxy = element.rbox().y + element.rbox().height;
                    });
                }          
            //}
            
            //svgTranslated = {x: svgScheme.transform().x, y: svgScheme.transform().y};
            svgScheme.translate(svgTranslated.x + (window.innerWidth - maxx)/2, svgTranslated.y + (window.innerHeight - maxy)/2)
            /*if(maxx < sldRect.width - 30)
                svgScheme.translate(svgTranslated.x + (sldRect.width - maxx)/2, svgTranslated.y)
            if(maxy < sldRect.height - 30)
                svgScheme.translate(svgTranslated.x, svgTranslated.y + (sldRect.height - maxy)/2)*/
        }
        function insertSld(options) {
            //var deffered = $q.defer();a
            var scope = $rootScope.$new();
            angular.extend(scope, options.scope);

            $templateRequest(options.templateUrl).then(function(response) {
                var element = angular.element(response);
                //var componentId = options.componentId || element.attr('md-component-id') || '_panelComponentId_' + $mdUtil.nextUid();
                //var panelPromise = $mdExpansionPanel().waitFor(componentId);
                //element.attr('md-component-id', componentId);

                var linkFunc = $compile(element);
                if (options.controller) {
                    //angular.extend(locals, options.locals || {});
                    //locals.$scope = scope;
                    //locals.$panel = panelPromise;
                    var invokeCtrl = $controller(options.controller, locals, true);
                    var ctrl = invokeCtrl();
                    element.data('$ngControllerController', ctrl);
                    element.children().data('$ngControllerController', ctrl);
                    if (options.controllerAs) {
                        scope[options.controllerAs] = ctrl;
                    }
                }

                // link after the element is added so we can find card manager directive
                $element.append(element);
                linkFunc(scope);

                /*panelPromise.then(function (instance) {
                deffered.resolve(instance);
                });*/
            });
        }
        
        
        

        SessionTimeoutInterval = $interval(function() {
            if ( $scope.isAuthenticated ) {
                currentSessionTime -= 1000;
                if ( currentSessionTime <= 0 ) {
                    currentSessionTime = 0;
                    
                    $scope.logout();
                } 
				
				if ( currentSessionTime <= 30000 ) {
 					document.getElementById("sessionTime").style.color = "red" ;
				} else {
 					document.getElementById("sessionTime").style.color = "#428BCA" ;
				}
				
				
                $scope.displayTime = msToTime( currentSessionTime );
                
            }
         }, 1000);                                          
                                     
                                  
//**************************************************************************************
                                        
    }]); // end of controller


    app.factory('authInterceptor', function ($rootScope, $q, $window) {
        // Przechwytywanie eventów żądań oraz zwracanych błedów

        return {
            request: function (config) {
                config.headers = config.headers || {};
                if (dataToken()) {
                    config.headers.Authorization = dataToken();
                }
                return config;
            },
            responseError: function (rejection) {
                if (rejection.status === 401) {
                // handle the case where the user is not authenticated
                }
                return $q.reject(rejection);
            }
        };
    });

    app.config(['$httpProvider','ngDialogProvider', function ($httpProvider, ngDialogProvider) {
        $httpProvider.interceptors.push('authInterceptor');
        ngDialogProvider.setDefaults({
            className: 'ngdialog-theme-default',
            template: 'templates/modalDialog.html'
        });
    }]);         
}).call(this);


const countries = async () =>{
  
    const response = await fetch("./chuj.xml")
    
    const data = await response.text()
    console.log (data)
    return data
  }

  const convert = async () =>{
    const response = await countries()
    const parser = new DOMParser();

    xmlToSvg( parser.parseFromString(response, "text/xml"))
  }


  convert()
