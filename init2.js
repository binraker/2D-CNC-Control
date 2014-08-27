var cadvars = {
    position: {
        x: 0,
        y: 0},
    clickPosition: {
        x: 0,
        y: 0},
    workClickPosition: {
        x: 0,
        y: 0},
    tempPos: {
        x: 0,
        Y: 0
    },
    buttons: {
        left: 0,
        right: 0,
        mid: 0
    },
    zoompad: 50,
    cursorMode: "select",
    workspaceMoving: false,
    workMoving: false,
    selectMoving: false,
    scale: 1,
    delta: 0,
    temp: null,
    scaleFactor: 1.1,
    ppi: 300,
    avalableMachineEnvelopes: [],
    machine: {
        MovementEnvelope: {
            xlo: 0,
            xhi: 1,
            ylo: 0,
            yhi: 1,
        },
        WorkspaceEnvelope: {
            xlo: 0,
            xhi: 1,
            ylo: 0,
            yhi: 1
        },
        UsibleEnvelope: {
            xlo: 0,
            xhi: 1,
            ylo: 0,
            yhi: 1
        }
    },
    avalableMaterials: [],
    layers: ["paths", "materials"],
    objects: {},
    materials: [],
    avalablePaths: [],
    paths: [],
    snapToGrid: false,
    enum: 0,
    lastClick: [],
    selected: [],
    undoStack: [],
    redoStack: [],
    settings: {
        "materialStrokeWidth": 3,
        "materialStroke": "black",
        "materialOpacity": 0.5,
        "pathStrokeWidth": 3,
        "pathStroke": "black",
        "pathOpacity": 0.5


    }
};
$(function() {
//initialisation
    $("#main").height(window.innerHeight); //make the page the height of the window it is displayed in
    $(window).resize(function() {
        $(".mainsize").height(window.innerHeight);
        $(".mainsize").width(window.innerWidth);
        $("#main-graphics").attr({"height": window.innerHeight, "width": window.innerWidth});
        $("div.widowwide").width(window.innerWidth);
        $("#footer").css("top", window.innerHeight - $("#footer").height());
    }); //if the window is resized, resize the page to fit
    $(window).resize(); //sice we have a new window, resize the page
    $(".pallet").hide(); //hide all the pallets
    $("#toolpallet").draggable({containment: "#main", scroll: false}); //make the toolpallet draggable
    //mouse handelers
    $("#graphicscont").mousewheel(function(event, delta) {
        event.preventDefault();
        var scrolposX = event.pageX;
        var scrolposY = event.pageY;
        zoom(scrolposX, scrolposY, delta);
    });
    $("#graphicscont").mousedown(function(event) {
        var pos = {"x": event.pageX, "y": event.pageY}; //get where the mouse was clicked
        if (event.button === 0) {
            LeftMouseDown(pos, event);
        }//left button
        if (event.button === 1) {
            MidMouseDown(pos, event);
        }//middle button
        if (event.button === 2) {
            RightMouseDown(pos, event);
        }//right button
    });
    $("#graphicscont").mouseup(function(event) {
        var pos = {"x": event.pageX, "y": event.pageY}; //get where the mouse was clicked
        if (event.button === 0) {
            LeftMouseUp(pos, event);
        }//left button
        if (event.button === 1) {
            MidMouseUp(pos, event);
        }//middle button
        if (event.button === 2) {
            RightMouseUp(pos, event);
        }//right button
    });
    $("#graphicscont").mousemove(function(event) {
        var eventPos = {"x": event.pageX, "y": event.pageY};
        if (cadvars.workspaceMoving)
        {
            var newPos = {};
            //cadvars.workMoving = true;
            newPos.x = (cadvars.position.x + (eventPos.x - cadvars.clickPosition.x));
            newPos.y = (cadvars.position.y + (eventPos.y - cadvars.clickPosition.y));
            worktransform(newPos.x, newPos.y, cadvars.scale);
        }
        if (cadvars.workMoving)
        {
            if (cadvars.selected[0] !== undefined)
            {
                cadvars.delta = {};
                eventPos = convertPoint(eventPos);
                if (cadvars.snapToGrid)
                {
                    var snapY = $(".grid-small").attr("height");
                    var snapX = $(".grid-small").attr("width");
                    eventPos.x = Math.floor(eventPos.x / snapX) * snapX;
                    eventPos.y = Math.floor(eventPos.y / snapY) * snapY;
                }

                cadvars.delta.x = eventPos.x - cadvars.clickPosition.x;
                cadvars.delta.y = eventPos.y - cadvars.clickPosition.y;
                moveElements();
            }
        }
        if (cadvars.selectMoving)
        {
            var current = convertPoint(eventPos);
            var type;
            if (current.x < cadvars.workClickPosition.x) {
                type = "10 10";
            }
            else {
                type = "1 0";
            }
            $("#select-rect").attr({
                "d": boxPathMake(cadvars.workClickPosition.x, cadvars.workClickPosition.y, current.x, current.y),
                "stroke-dasharray": type
            }
            );
        }
    });
    //get the current machine size
    $.getJSON("machineSize.json", function(data) {
        cadvars.machine.MovementEnvelope = data.movement;
        cadvars.machine.WorkspaceEnvelope = data.workspace;
        cadvars.machine.UsibleEnvelope.xlo = Math.max(cadvars.machine.WorkspaceEnvelope.xlo, cadvars.machine.MovementEnvelope.xlo);
        cadvars.machine.UsibleEnvelope.ylo = Math.max(cadvars.machine.WorkspaceEnvelope.ylo, cadvars.machine.MovementEnvelope.ylo);
        cadvars.machine.UsibleEnvelope.xhi = Math.min(cadvars.machine.WorkspaceEnvelope.xhi, cadvars.machine.MovementEnvelope.xhi);
        cadvars.machine.UsibleEnvelope.yhi = Math.min(cadvars.machine.WorkspaceEnvelope.yhi, cadvars.machine.MovementEnvelope.yhi);
        $("#machine-movment-envelope-outline").attr({
            "height": (cadvars.machine.MovementEnvelope.yhi - cadvars.machine.MovementEnvelope.ylo) * cadvars.ppi,
            "width": (cadvars.machine.MovementEnvelope.xhi - cadvars.machine.MovementEnvelope.xlo) * cadvars.ppi,
            "x": cadvars.machine.MovementEnvelope.xlo * cadvars.ppi,
            "y": cadvars.machine.MovementEnvelope.ylo * cadvars.ppi
        });
        $("#machine-workspace-envelope-outline").attr({
            "height": (cadvars.machine.WorkspaceEnvelope.yhi - cadvars.machine.WorkspaceEnvelope.ylo) * cadvars.ppi,
            "width": (cadvars.machine.WorkspaceEnvelope.xhi - cadvars.machine.WorkspaceEnvelope.xlo) * cadvars.ppi,
            "x": cadvars.machine.WorkspaceEnvelope.xlo * cadvars.ppi,
            "y": cadvars.machine.WorkspaceEnvelope.ylo * cadvars.ppi
        });
        $("#machine-usible-envelope-outline, #gridlayer").attr({
            "height": (cadvars.machine.UsibleEnvelope.yhi - cadvars.machine.UsibleEnvelope.ylo) * cadvars.ppi,
            "width": (cadvars.machine.UsibleEnvelope.xhi - cadvars.machine.UsibleEnvelope.xlo) * cadvars.ppi,
            "x": cadvars.machine.UsibleEnvelope.xlo * cadvars.ppi,
            "y": cadvars.machine.UsibleEnvelope.ylo * cadvars.ppi
        });
        originTransform();
        zoomfit();
    });
    //header button handelers
    $("#zoom-all-button").click(zoomfit);
    $("#zoom-100-button").click(zoom100);
    $("#zoom-in-button").click(function() {
        zoom(window.outerWidth / 2, window.outerHeight / 2, 1);
    });
    $("#zoom-out-button").click(function() {
        zoom(window.outerWidth / 2, window.outerHeight / 2, -1);
    });
    $("#options-button").click(function() {
        palletSelect($("#options"), "OPTIONS");
    });
    $("#tools-button").click(function() {
        palletSelect($("#tools"), "TOOLS");
    });
    $("#grid-settings-button").click(function() {
        palletSelect($("#grid-settings"), "GRID");
    });
    $("#undo-button").click(function() {
        undo();
    });
    $("#redo-button").click(function() {
        redo();
    });
    $("#machine-button").click(function() {
        palletSelect($("#machine-data"), "Machine");
    });
    //pallet button handelers
    //tool pallet 
    $("#select-button").click(function() {
        cadvars.cursorMode = "select";
    });
    $("#add-material-button").click(function() {
        updateMaterials();
        palletSelect($("#add-material"), "ADD-MATERIAL");
    });
    $("#edit-material-button").click(function() {
        console.log("edit material");
    });
    $("#add-path-button").click(function() {
        updateFiles();
        palletSelect($("#add-path"), "ADD-PATH");
    });
    $("#edit-path-button").click(function() {
        console.log("edit path");
    });
    $("#upload-button").click(function() {
        console.log("upload and process a file to the library");
    });
    $("#new-material-button").click(function() {
        console.log("define a new material");
    });
    $("#toggle-grid-button").click(function() {
        $("#grid").toggle();
    });
    //grid pallet
    $("#grid-major").change(function() {
        $(".grid-large").attr({
            "height": $("#grid-major").val() * cadvars.ppi,
            "width": $("#grid-major").val() * cadvars.ppi
        });
        $("#grid-minor").change();
    });
    $("#grid-minor").change(function() {
        $(".grid-small").attr({
            "height": ($("#grid-major").val() / $("#grid-minor").val()) * cadvars.ppi,
            "width": ($("#grid-major").val() / $("#grid-minor").val()) * cadvars.ppi
        });
    });
    $("#snap-to-grid").change(function() {
        cadvars.snapToGrid = !cadvars.snapToGrid;
    });
    //run these
    refreshsvg();
    $("#tools-button").click();
    $("#grid-major").change();
    $("#grid-minor").change();
    //setup keyboard shortcuts
    shortcut.add("Ctrl+Z", function() {
        undo();
    });
    shortcut.add("Ctrl+Y", function() {
        redo();
    });
    shortcut.add("Ctrl+S", function() {
        console.log("save stuff");
    });
    shortcut.add("Ctrl+P", function() {
        console.log("print stuff");
    });
    shortcut.add("Ctrl+G", function() {
        $("#toggle-grid-button").click();
    });
    shortcut.add("Home", function() {
        $("#tools-button").click();
        cadvars.cursorMode = "select";
    });
    shortcut.add("Delete", function() {
        var i;
        for (i = 0; i < cadvars.selected.length; i++)
        {
            if (cadvars.selected[i] !== undefined)
                executeCommand({"command": "delete", "params": cadvars.selected[i]});
        }
        cadvars.selected = [];
        updateSelection();
    });
});
//mouse functions
function LeftMouseDown(pos, event) {
    cadvars.buttons.left = 1;
    cadvars.clickPosition = pos;
    if (event.shiftKey) {
        event.preventDefault();
        cadvars.workspaceMoving = true;
    } //pan
    else {
        cadvars.delta = {"x": 0, "y": 0};
        cadvars.workClickPosition = convertPoint(pos);
        cadvars.lastClick = getElements(cadvars.workClickPosition);
        if (cadvars.lastClick.length === 0) {
            if (!event.ctrlKey)
                cadvars.selected = [];
            updateSelection();
            cadvars.selectMoving = true;
            $("#select-rect").attr({
                "stroke": "black",
                "d": boxPathMake(cadvars.workClickPosition.x, cadvars.workClickPosition.y, cadvars.workClickPosition.x + 1, cadvars.workClickPosition.y + 1)
            });
        }
        else {
            if (!event.ctrlKey)
                cadvars.selected = [];
            cadvars.selected.push(cadvars.lastClick[0]);
            updateSelection();
            cadvars.workMoving = true;
        }
    }//start selectin'
}
function LeftMouseUp(pos, event) {
    cadvars.buttons.left = 0;
    if (cadvars.workspaceMoving === true) {
        cadvars.position.x = cadvars.position.x + (event.pageX - cadvars.clickPosition.x);
        cadvars.position.y = cadvars.position.y + (event.pageY - cadvars.clickPosition.y);
        cadvars.workspaceMoving = false;
        worktransform(cadvars.position.x, cadvars.position.y, cadvars.scale);
    }//workspace panning
    if (cadvars.workMoving === true) {
        cadvars.workMoving = false;
        updateSelection();
        var command = {
            "command": "move",
            "params": {
                "objects": cadvars.selected,
                "offset": cadvars.delta
            }
        };
        executeCommand(command, false, false);
        //send comand to execute command to actually perform the move
        if (!event.ctrlKey)
        {
            cadvars.lastClick = [];
        }
        updateSelection();
    }//work being moved so put it down
    if (cadvars.selectMoving === true) {
        cadvars.selectMoving = false;
        var end = convertPoint(pos);
        var start = cadvars.workClickPosition;
        $("#select-rect").attr("stroke", "none");
        update();
        cadvars.selected = getElementsByBox(start, end, end.x < start.x);
        updateSelection();
    }//select box
}
function RightMouseDown(pos, event) {
    cadvars.buttons.right = 1;
    event.preventDefault();
    cadvars.lastClick.push(cadvars.lastClick.shift());
    if (!event.ctrlKey)
        cadvars.selected = [];
    cadvars.selected.push(cadvars.lastClick[0]);
    updateSelection();
}
function RightMouseUp(pos, event) {
    cadvars.buttons.right = 0;
}
function MidMouseDown(pos, event) {
    cadvars.buttons.mid = 1;
}
function MidMouseUp(pos, event) {
    cadvars.buttons.mid = 0;
}

//zoom functions
function zoomfit() {
    var screenaspect = $("#graphicscont").height() / $("#graphicscont").width();
    var width = (cadvars.machine.MovementEnvelope.xhi - cadvars.machine.MovementEnvelope.xlo);
    var height = (cadvars.machine.MovementEnvelope.yhi - cadvars.machine.MovementEnvelope.ylo);
    var pageaspect = height / width;
    if (pageaspect > screenaspect) {
        cadvars.scale = ($("#graphicscont").height() - (2 * cadvars.zoompad)) / (height * cadvars.ppi);
        cadvars.position.x = (window.innerWidth - ((width * cadvars.ppi) * cadvars.scale)) / 2;
        cadvars.position.y = cadvars.zoompad;
    }
    else {
        cadvars.scale = ($("#graphicscont").width() - (2 * cadvars.zoompad)) / (width * cadvars.ppi);
        cadvars.position.x = cadvars.zoompad;
        cadvars.position.y = (window.innerHeight - ((height * cadvars.ppi) * cadvars.scale)) / 2;
        0;
    }
    worktransform(cadvars.position.x, cadvars.position.y, cadvars.scale);
    refreshsvg();
}
function zoom100() {
    cadvars.scale = 1;
    worktransform(cadvars.position.x, cadvars.position.y, cadvars.scale);
    refreshsvg();
}
function zoom(scrolposX, scrolposY, dir) {
    if (dir > 0) {
        cadvars.scale = cadvars.scale * cadvars.scaleFactor;
        cadvars.position.x = cadvars.position.x - (cadvars.position.x * (1 - cadvars.scaleFactor) + scrolposX * (cadvars.scaleFactor - 1));
        cadvars.position.y = cadvars.position.y - (cadvars.position.y * (1 - cadvars.scaleFactor) + scrolposY * (cadvars.scaleFactor - 1));
    }
    else {
        cadvars.scale = cadvars.scale / cadvars.scaleFactor;
        cadvars.position.x = cadvars.position.x - (cadvars.position.x * (1 - (1 / cadvars.scaleFactor)) + scrolposX * ((1 / cadvars.scaleFactor) - 1));
        cadvars.position.y = cadvars.position.y - (cadvars.position.y * (1 - (1 / cadvars.scaleFactor)) + scrolposY * ((1 / cadvars.scaleFactor) - 1));
    }
    worktransform(cadvars.position.x, cadvars.position.y, cadvars.scale);
}
//update the list of avalble materials
function updateMaterials() {
    $.getJSON("materials.json", function(data) {
        cadvars.avalableMaterials = data;
        var key;
        $("#materials-table").html("");
        for (key in data) {
            var size = data[key].height / data[key].width;
            var rectHeight;
            var rectWidth;
            if (size > 1)
            {
                rectHeight = 50;
                rectWidth = 50 / size;
            }
            else
            {
                rectHeight = 50 * size;
                rectWidth = 50;
            }
            var temp = $("#table-box-prototype").clone();
            temp.attr({
                id: key,
                class: "table-box"
            });
            temp.find(".table-box-image").attr({
                height: rectHeight,
                width: rectWidth,
                fill: data[key].colour
            });
            temp.find(".table-box-width").html(data[key].width);
            temp.find(".table-box-height").html(data[key].height);
            temp.find(".table-box-speed").html(data[key].speed);
            temp.find(".table-box-power").html(data[key].power);
            temp.find(".table-box-name").html(key);
            $("#materials-table").append(temp);
        }
        $(".table-box").click(function() {
            var def = data[$(this).attr("id")];
            var material = {
                "name": $(this).attr("id"),
                "id": cadvars.enum,
                "height": def.height * cadvars.ppi,
                "width": def.width * cadvars.ppi,
                "fill": def.colour,
                "strokewidth": cadvars.settings.materialStrokeWidth,
                "stroke": cadvars.settings.materialStroke,
                "opacity": cadvars.settings.materialOpacity,
                "x": 0,
                "y": 0,
                "layer": "materials"
            };
            var command = {
                "command": "add",
                "params": material
            };
            executeCommand(command, false, false);
            cadvars.enum += 1;
        });
    });
}
//update the list of avalable files
function updateFiles() {
    $.getJSON("files.json", function(data) {
        cadvars.avalablePaths = data;

        var key;
        $("#paths-table").html("");
        for (key in data) {
            var size = data[key].height / data[key].width;
            var rectHeight;
            var rectWidth;
            if (size > 1)
            {
                rectHeight = 50;
                rectWidth = 50 / size;
            }
            else
            {
                rectHeight = 50 * size;
                rectWidth = 50;
            }
            var temp = $("#table-box-prototype").clone();
            temp.attr({
                id: key,
                class: "table-box"
            });
            temp.find(".table-box-image").attr({
                height: rectHeight,
                width: rectWidth,
                fill: data[key].colour
            });
            temp.find(".table-box-width").html(data[key].width);
            temp.find(".table-box-height").html(data[key].height);
            temp.find(".table-box-speed").html("not implimented");
            temp.find(".table-box-power").html("not implimented");
            temp.find(".table-box-name").html(key);
            $("#paths-table").append(temp);
        }
        $(".table-box").click(function() {
            var selected = $(this).attr("id");
            $.getJSON(selected + ".json", function(data) {
                data.id = cadvars.enum;
                data.width *= cadvars.ppi;
                data.height *= cadvars.ppi;
                data.x = 0;
                data.y = 0;
                data.layer = "paths";
                var command = {
                    "command": "add",
                    "params": data
                };
                executeCommand(command, false, false);
                cadvars.enum += 1;
            });
        });
    });
}//paths list updated and addded to currrent workspace from here   
//function to move the workspace around the screen
function worktransform(X, Y, s) {
    var height = (cadvars.machine.MovementEnvelope.yhi - cadvars.machine.MovementEnvelope.ylo);
    $("#machine-movment-envelope").attr("transform", "translate(" + X + "," + Y + ") scale(" + s + "," + -s + ") translate(0," + -height * cadvars.ppi + ")");
    originTransform();
    $(".zoom-dependant").attr("stroke-width", 1 / cadvars.scale);
}
//function to force a refresh of the svg data by the broser DOM
function refreshsvg() {
    $("#graphicscont").html($("#graphicscont").html());
    return true;
}
//move the origin to whereever the machine file tells us it is
function originTransform() {
    $("#machine-movment-envelope-origin").attr("transform", "scale(" + 1 / cadvars.scale + ")");
}
//function to change which pallet is currently open
function palletSelect(pallet, title) {
    $(".pallet").hide();
    pallet.show();
    $("#toolpallet").width(pallet.children().filter("table").outerWidth());
    $("#toolpallet").height(pallet.children().filter("table").outerHeight() + $("#toolpalet-windowbar").outerHeight());
    $("#toolpalet-windowbar").html(title);
}
//Comand Pattern execution functions
function executeCommand(command, undo, redo) {
    var params = command.params;
    var i;
    var oposite;
    switch (command.command) {
//new commands
        case "add":
            oposite = {"command": "delete", "params": {"id": params.id}};
            cadvars.objects[params.id] = params;
            //cadvars.paths.push(command.params);
            break;
        case "delete":
            oposite = {"command": "add", "params": cadvars.objects[params.id]};
            delete cadvars.objects[params.id];
            break;
        case "move":
            if (params.objects[0] === undefined)
                break;
            oposite = {"command": "move", "params": {"objects": cadvars.selected, "offset": {"x": -cadvars.delta.x, "y": -cadvars.delta.y}}};
            for (i in params.objects)
            {
                cadvars.objects[params.objects[i].id].x += params.offset.x;
                cadvars.objects[params.objects[i].id].y += params.offset.y;
            }
            break;
    }
    if (undo) {
        cadvars.redoStack.push(oposite);
    }
    else {
        cadvars.undoStack.push(oposite);
    }
    if (!(undo || redo)) {
        cadvars.redoStack = [];
    }
    update();
    refreshsvg();
}
function undo() {
    if (cadvars.undoStack.length > 0)
        executeCommand(cadvars.undoStack.pop(), true, false);
}
function redo() {
    if (cadvars.redoStack.length > 0)
        executeCommand(cadvars.redoStack.pop(), false, true);
}
//redraw the SVG from the dat held in the various structures
function update() {
    var i;
    var j;
    var k;
    $("#materials").children().remove();
    $("#paths").children().remove();
    for (i in cadvars.objects)
    {
        switch (cadvars.objects[i].layer)
        {
            case "paths":
                $("#paths").append($("<g>").attr({
                    "id": cadvars.objects[i].id,
                    "transform": "translate(" + cadvars.objects[i].x + "," + cadvars.objects[i].y + ")"
                }));
                $("#" + cadvars.objects[i].id).append($("<rect>").attr({
                    "stroke": "black",
                    "stroke-dasharray": "10,5",
                    "fill": "none",
                    "width": cadvars.objects[i].width,
                    "height": cadvars.objects[i].height
                }));
                for (j in cadvars.objects[i].data) {
                    var points = cadvars.objects[i].data[j].points;
                    var data = "";
                    var loc = "";
                    //declare some varibales for arc conversion. some contain x,y,mag for siple calcs
                    var P0 = [0, 0]; //start point
                    var P1 = [0, 0]; //end point
                    var D; // max deviation (+ve for left of line traveling from P0 to P1
                    var Pm = [0, 0]; //id point twixt P0 and P1
                    var Pq = [0, 0];
                    var Pd = [0, 0];
                    var l = [0, 0, 0];
                    var d = [0, 0]; //the point that the max deviation is mesured at
                    var q = [0, 0]; //the point that is diametrically opposite d
                    var Pc = [0, 0, 0]; //the centre of the arc
                    var rad; //radius
                    var flags = [0, 0]; //flags for the SVG arc format
                    data += "M" + points[0][0] * cadvars.ppi + "," + points[0][1] * cadvars.ppi;
                    for (k = 1; k < points.length; k++) {
                        loc += '<circle cx="' + points[k][0] * cadvars.ppi + '" cy="' + points[k][1] * cadvars.ppi + '" r="5" stroke="black" stroke-width="3" fill="red" />';
                        if (points[k][2] === 0)
                            data += "L" + points[k][0] * cadvars.ppi + "," + points[k][1] * cadvars.ppi;
                        else
                        {
//collect data
                            P0[0] = points[k - 1][0];
                            P0[1] = points[k - 1][1];
                            P1[0] = points[k][0];
                            P1[1] = points[k][1];
                            D = points[k][2];
                            //compute Pm
                            Pm[0] = (P0[0] + P1[0]) / 2;
                            Pm[1] = (P0[1] + P1[1]) / 2;
                            //compute vector l    
                            l[0] = Pm[0] - P0[0];
                            l[1] = Pm[1] - P0[1];
                            l[2] = Math.sqrt(Math.pow(l[0], 2) + Math.pow(l[1], 2));
                            // compute vector d
                            d[0] = -(l[1] * (D / l[2]));
                            d[1] = (l[0] * (D / l[2]));
                            //compute point d
                            Pd[0] = Pm[0] + d[0];
                            Pd[1] = Pm[1] + d[1];
                            //compute q vector
                            q[0] = -d[0] * (Math.pow(l[2], 2) / Math.pow(D, 2));
                            q[1] = -d[1] * (Math.pow(l[2], 2) / Math.pow(D, 2));
                            //compute the point Pq
                            Pq[0] = Pm[0] + q[0];
                            Pq[1] = Pm[1] + q[1];
                            //compute the centre coords
                            Pc[0] = (Pq[0] + Pd[0]) / 2;
                            Pc[1] = (Pq[1] + Pd[1]) / 2;
                            //compute the radius
                            rad = Math.sqrt(Math.pow(P0[0] - Pc[0], 2) + Math.pow(P0[1] - Pc[1], 2));
                            //compute the flags for the SVG
                            flags = [0, 0];
                            if (D >= l[2])
                            {
                                flags[0] = 1;
                            }
                            if (D < 0)
                            {
                                flags[1] = 1;
//                                if (flags[0] === 1)
//                                    flags[0] = 0;
//                                else
//                                    flags[0] = 1;
                            }
//                            if (rad > 1)
//                                M(rad);
                            rad *= cadvars.ppi;
                            //SVG arc format is A rx,ry,xa,f1,f2,x,y
                            data += "A" + rad + "," + rad + ",0," + flags[0] + "," + flags[1] + "," + points[k][0] * cadvars.ppi + "," + points[k][1] * cadvars.ppi;
                        }
                    }
                    var line = $("<path>").attr({
                        "d": data,
                        "stroke": "#" + (Math.abs(Math.floor((1 - cadvars.objects[i].data[j].power) * 0xf)).toString(16)) + "000" + (Math.abs(Math.floor(cadvars.objects[i].data[j].power * 0xf)).toString(16)) + "0",
                        "strokewidth": 3,
                        "fill": "none"});
                    $("#" + cadvars.objects[i].id).append(line).append($(loc));
                }
                break;
            case "materials":
                $("#materials").append($("<g>").attr({
                    "id": cadvars.objects[i].id,
                    "transform": "translate(" + cadvars.objects[i].x + "," + cadvars.objects[i].y + ")"
                }));
                $("#" + cadvars.objects[i].id).append($("<rect>").attr({
                    "height": cadvars.objects[i].height,
                    "width": cadvars.objects[i].width,
                    "stroke": cadvars.objects[i].stroke,
                    "stroke-width": cadvars.objects[i].strokewidth,
                    "fill": cadvars.objects[i].fill,
                    "opacity": cadvars.objects[i].opacity
                }));
        }
    }
    refreshsvg();
}//drawing happens in here
//remove duplicates and draw rectangles round everyhting that is selected
function updateSelection() {
    $("#selection").children().remove();
    removeSelectionDuplicates();
    cadvars.selected = cadvars.selected.sort(); //put the selection in order This is not working!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    var i;
    var lastID = undefined;
    for (i in cadvars.selected)
    {
        if (cadvars.selected[i] !== undefined)
            $("#selection").append($("<rect>").attr({
                "x": cadvars.selected[i].x,
                "y": cadvars.selected[i].y,
                "height": cadvars.selected[i].height,
                "width": cadvars.selected[i].width,
                "stroke": "red",
                "stroke-width": 1 / cadvars.scale,
                "fill": "none",
                "class": "zoom-dependant"
            }));
    }
    refreshsvg();
    if (cadvars.selected.length === 1) {
        if (cadvars.selected[0].layer === "paths") {
            palletSelect($("#path-properties"), "PROPERTIES");
            $("#path-name").html(cadvars.selected[0].name);
            $("#path-x").attr("value", cadvars.selected[0].x / cadvars.ppi);
            $("#path-y").attr("value", cadvars.selected[0].y / cadvars.ppi);
//             $("#path-power").attr("value",cadvars.selected[0].y/ cadvars.ppi);
//             $("#path-feed").attr("value",cadvars.selected[0].y/ cadvars.ppi);
// id
// duplicate button, save as
        }
        if (cadvars.selected[0].layer === "materials") {
            palletSelect($("#material-properties"), "PROPERTIES");
            $("#mat-name").html(cadvars.selected[0].name);
            $("#mat-x").attr("value", cadvars.selected[0].x / cadvars.ppi);
            $("#mat-y").attr("value", cadvars.selected[0].y / cadvars.ppi);
        }
    }
    else if (cadvars.selected.length > 1) {
        palletSelect($("#selection-properties"), "PROPERTIES");
        $("#no-of-objects").html(cadvars.selected.length);
        var noofpaths = 0;
        var noofmats = 0;
        var tablestr = "";
        for (i in cadvars.selected) {
            if (cadvars.selected[i].layer === "materials")
                noofmats += 1;
            if (cadvars.selected[i].layer === "paths")
                noofpaths += 1;
            tablestr += "<tr><td>" + cadvars.selected[i].id + ": </td><td>" + cadvars.selected[i].name + "</td></tr>";
        }
        $("#no-of-path-objects").html(noofpaths);
        $("#no-of-mat-objects").html(noofmats);
        $("#object-list").html(tablestr);
    }
    else {
        palletSelect($("#tools"), "TOOLS");
    }
}
//function to remove selection duplicates
function removeSelectionDuplicates() {
    var i;
    var j;
    var dupsRemoved = 0;
    for (i = 0; i < cadvars.selected.length; i++) {
        for (j = i + 1; j < cadvars.selected.length; j++)
        {
            if (cadvars.selected[j] === cadvars.selected[i])
                cadvars.selected.splice(j, 1);
            dupsRemoved += 1;
        }
    }
    return dupsRemoved;
}
//function to convert screen coords into workspace coords
function convertPoint(pos) {
    var height = (cadvars.machine.MovementEnvelope.yhi - cadvars.machine.MovementEnvelope.ylo);
    pos.x = ((pos.x - cadvars.position.x) / cadvars.scale);
    pos.y = (height * cadvars.ppi) - ((pos.y - cadvars.position.y) / cadvars.scale);
    return pos;
}
//get all the elements at a point on the screen (eg a click)
function getElements(pos) {
    var i;
    var result = [];
    for (i in cadvars.objects) {
        var x1, y1, x2, y2;
        x1 = cadvars.objects[i].x;
        y1 = cadvars.objects[i].y;
        x2 = x1 + cadvars.objects[i].width;
        y2 = y1 + cadvars.objects[i].height;
        if (x1 <= pos.x && pos.x <= x2 && y1 <= pos.y && pos.y <= y2)
            result.push(cadvars.objects[i]);
    }
    return result;
}
//get all the elements at a point on the screen (eg a click)
function getElementsByBox(start, end, inclusive) {
    var i;
    var result = [];
    var a = {
        xmin: Math.min(start.x, end.x),
        xmax: Math.max(start.x, end.x),
        ymin: Math.min(start.y, end.y),
        ymax: Math.max(start.y, end.y)
    };

    for (i in cadvars.objects) {
        var x1, y1, x2, y2;
        x1 = cadvars.objects[i].x;
        y1 = cadvars.objects[i].y;
        x2 = x1 + cadvars.objects[i].width;
        y2 = y1 + cadvars.objects[i].height;
        var b = {
            xmin: Math.min(x1, x2),
            xmax: Math.max(x1, x2),
            ymin: Math.min(y1, y2),
            ymax: Math.max(y1, y2)
        };
        if (!inclusive) {
            if ((a.xmin < b.xmin) && (a.xmax > b.xmax) && (a.ymin < b.ymin) && (a.ymax > b.ymax))
            {
                result.push(cadvars.objects[i]);
            }
        }
        else
        {
            if ((a.xmin < b.xmin) || (a.xmax > b.xmax) || (a.ymin < b.ymin) || (a.ymax > b.ymax))
            {
                result.push(cadvars.objects[i]);
            }
        }

    }
    console.log(result);
    return result;
}
//function to move an svg element about on the screen but not alter the datastructure that defines it
function moveElements() {
    var elements = cadvars.selected;
    var offset = cadvars.delta;
    var i;
    for (i in elements)
    {
        $("#" + elements[i].id).attr("transform", "translate(" + (elements[i].x + offset.x) + "," + (elements[i].y + offset.y) + ")");
        refreshsvg();
    }
}
//message wrapper
function M(message) {
    console.log(message);
}
//function to make a path string from corners
function boxPathMake(x0, y0, x1, y1) {
    return path = "M " + x0 + " " + y0 + " L " + x1 + " " + y0 + " " + x1 + " " + y1 + " " + x0 + " " + y1 + " Z";
}